/* eslint-disable unicorn/filename-case, max-params, max-lines-per-function, prettier/prettier */
import { decode as b64decode } from 'base-64';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as UPNG from 'upng-js';

/**
 * PixelFloodFill - True pixel-based flood fill for React Native
 *
 * This implements the same logic as the reference Android app:
 * 1. Simulates pixel grid based on template analysis
 * 2. Black pixels act as borders (stop flood fill)
 * 3. Queue-based flood fill algorithm
 * 4. Respects actual template boundaries
 */

export interface FloodFillRegion {
  id: string;
  pixels: Set<string>; // Set of "x,y" pixel coordinates
  color: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface DetectionOptions {
  useLuma?: boolean; // also use luma threshold in addition to red-channel
  lumaThreshold?: number; // 0..255, lower means darker
  alphaThreshold?: number; // 0..255, minimum alpha to consider pixel present
  dilate?: boolean; // expand borders to prevent leaks
  dilateIterations?: number; // number of dilation passes
  sampleRadius?: number; // 1 => 3x3, 2 => 5x5 neighborhood
  autoCalibrate?: boolean; // derive luma threshold from image
  useOtsu?: boolean; // use Otsu threshold on luma for auto-calibration
  closing?: boolean; // perform morphological closing (dilate then erode)
  closingIterations?: number; // erosion passes after dilation
  edgeDetect?: boolean; // treat strong local luma gradients as borders
  edgeThreshold?: number; // gradient magnitude threshold for edge detection
  minRGBThreshold?: number; // treat as border if any channel is below this (captures gray/black lines)
}

export class PixelFloodFill {
  private pixels: Map<string, string> = new Map(); // "x,y" -> color
  private filledRegions: Map<string, FloodFillRegion> = new Map();
  private canvasWidth: number;
  private canvasHeight: number;
  private regionIdCounter = 0;
  private gridW = 0;
  private gridH = 0;
  private viewportRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  private detectionOptions: Required<DetectionOptions> = {
  useLuma: true,
  lumaThreshold: 110,
  alphaThreshold: 200,
  dilate: true,
  dilateIterations: 2,
  sampleRadius: 2,
  autoCalibrate: true,
  useOtsu: true,
  closing: true,
  closingIterations: 1,
  edgeDetect: true,
  edgeThreshold: 40,
  minRGBThreshold: 80,
  };

  // Colors (mimicking Android app constants)
  private static readonly BORDER_COLOR = '#000000'; // Black borders
  private static readonly BACKGROUND_COLOR = '#FFFFFF'; // White fillable areas
  private static readonly PIXEL_SIZE = 4; // How many screen pixels = 1 logic pixel
  private static readonly BRIGHTNESS_THRESHOLD = 31; // match zebra-paint: brightness <= 31 => border

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    // Don't initialize pixel grid yet - wait for actual image data
  }

  /**
   * Initialize from actual image data instead of simulated template
   * This analyzes the real PNG to detect boundaries
   */
  async initializeFromImage(imageUri: string): Promise<void> {
    // Decode PNG to RGBA pixels
    let imgW: number;
    let imgH: number;
    let data: Uint8Array;
    try {
      const decoded = await this.decodePngToRgba(imageUri);
      imgW = decoded.width;
      imgH = decoded.height;
      data = decoded.data;
    } catch (e) {
      // Fallback to simple synthetic grid to avoid crashing
      console.warn(
        'PixelFloodFill.initializeFromImage: decode failed, using fallback grid. URI:',
        imageUri,
        'Error:',
        e
      );
      this.initializePixelGrid();
      return;
    }

    // Logical grid size based on displayed image viewport when available
    let gridW = Math.max(
      1,
      Math.floor(this.canvasWidth / PixelFloodFill.PIXEL_SIZE)
    );
    let gridH = Math.max(
      1,
      Math.floor(this.canvasHeight / PixelFloodFill.PIXEL_SIZE)
    );
    if (this.viewportRect) {
      // Use 1:1 screen pixel grid inside the viewport for precise border detection
      gridW = Math.max(1, Math.floor(this.viewportRect.width));
      gridH = Math.max(1, Math.floor(this.viewportRect.height));
    }
    this.gridW = gridW;
    this.gridH = gridH;

    // Clear any previous state
    this.pixels.clear();
    this.filledRegions.clear();

    // For border detection, map each grid cell center into canvas space consistently
    const hasViewport = Boolean(this.viewportRect);
    const pxW = hasViewport
      ? Math.max(1, this.viewportRect!.width / Math.max(1, gridW))
      : PixelFloodFill.PIXEL_SIZE;
    const pxH = hasViewport
      ? Math.max(1, this.viewportRect!.height / Math.max(1, gridH))
      : PixelFloodFill.PIXEL_SIZE;
    const initialBorderKeys: string[] = [];
    // Optional auto-calibration of luma threshold using a coarse sample of opaque pixels
    let effectiveLumaThreshold = this.detectionOptions.lumaThreshold;
    let effectiveAlphaThreshold = this.detectionOptions.alphaThreshold;
    if (this.detectionOptions.autoCalibrate) {
      const lumas: number[] = [];
      const alphas: number[] = [];
      const stepX = Math.max(1, Math.floor(imgW / 64));
      const stepY = Math.max(1, Math.floor(imgH / 64));
      for (let y = 0; y < imgH; y += stepY) {
        for (let x = 0; x < imgW; x += stepX) {
          const o = (y * imgW + x) * 4;
          const a = data[o + 3];
          if (a >= this.detectionOptions.alphaThreshold) {
            const r = data[o];
            const g = data[o + 1];
            const b = data[o + 2];
            const l = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
            lumas.push(l);
          }
          alphas.push(a);
        }
      }
      if (lumas.length > 0) {
        if (this.detectionOptions.useOtsu) {
          effectiveLumaThreshold = this.computeOtsuThreshold(lumas);
        } else {
          lumas.sort((a, b) => a - b);
          const idx = Math.floor(0.3 * (lumas.length - 1)); // 30th percentile as a conservative ‘dark’ cutoff
          effectiveLumaThreshold = Math.max(50, Math.min(160, lumas[idx]));
        }
      }
      if (alphas.length > 0) {
        alphas.sort((a, b) => a - b);
        const medianAlpha = alphas[Math.floor(alphas.length / 2)];
        // Aim just below median to include semi-transparent line art but exclude background noise
        effectiveAlphaThreshold = Math.max(
          80,
          Math.min(200, Math.round(medianAlpha - 30))
        );
      }
    }
    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        let ix: number;
        let iy: number;
        let outsideViewport = false;
        if (this.viewportRect) {
          const cx = this.viewportRect.x + (gx + 0.5) * pxW; // canvas-space center consistent with viewport scaling
          const cy = this.viewportRect.y + (gy + 0.5) * pxH;
          const { x, y, width, height } = this.viewportRect;
          if (cx < x || cy < y || cx >= x + width || cy >= y + height) {
            outsideViewport = true;
            ix = 0;
            iy = 0;
          } else {
            const tx = (cx - x) / Math.max(1, width);
            const ty = (cy - y) / Math.max(1, height);
            ix = Math.min(imgW - 1, Math.max(0, Math.round(tx * imgW)));
            iy = Math.min(imgH - 1, Math.max(0, Math.round(ty * imgH)));
          }
        } else {
          // Full-canvas mapping
          const cx = (gx + 0.5) * pxW;
          const cy = (gy + 0.5) * pxH;
          const tx = cx / Math.max(1, this.canvasWidth);
          const ty = cy / Math.max(1, this.canvasHeight);
          ix = Math.min(imgW - 1, Math.max(0, Math.round(tx * imgW)));
          iy = Math.min(imgH - 1, Math.max(0, Math.round(ty * imgH)));
        }

        const samples: { r: number; g: number; b: number; a: number }[] = [];
        // Sample a neighborhood (5x5 when radius=2) to better catch thin lines after downscale
        const rad = Math.max(1, this.detectionOptions.sampleRadius);
        for (let dy = -rad; dy <= rad; dy++) {
          for (let dx = -rad; dx <= rad; dx++) {
            const sx = Math.min(imgW - 1, ix + dx);
            const sy = Math.min(imgH - 1, iy + dy);
            const o = (sy * imgW + sx) * 4;
            samples.push({
              r: data[o],
              g: data[o + 1],
              b: data[o + 2],
              a: data[o + 3],
            });
          }
        }

        // Determine if any sample is a border pixel (dark enough) or a strong edge
        // Robust boundary detection
        const isBorder =
          outsideViewport ||
          samples.some(({ r, g, b, a }) => {
            const darkByRed = r <= PixelFloodFill.BRIGHTNESS_THRESHOLD;
            const luma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
            const darkByLuma = this.detectionOptions.useLuma
              ? luma <= effectiveLumaThreshold
              : false;
            const darkByMinRGB =
              Math.min(r, g, b) <= this.detectionOptions.minRGBThreshold;
            const opaqueEnough = a >= effectiveAlphaThreshold;
            return opaqueEnough && (darkByRed || darkByLuma || darkByMinRGB);
          });

        let finalIsBorder = isBorder;
        if (!finalIsBorder && this.detectionOptions.edgeDetect) {
          // Simple local gradient edge detection: compare min/max luma in neighborhood
          let minL = 255;
          let maxL = 0;
          let hasOpaque = false;
          for (const s of samples) {
            if (s.a >= effectiveAlphaThreshold) {
              const L = Math.round(0.2126 * s.r + 0.7152 * s.g + 0.0722 * s.b);
              minL = Math.min(minL, L);
              maxL = Math.max(maxL, L);
              hasOpaque = true;
            }
          }
          if (hasOpaque && maxL - minL >= this.detectionOptions.edgeThreshold) {
            finalIsBorder = true;
          }
        }

        const key = `${gx},${gy}`;
        this.pixels.set(
          key,
          finalIsBorder
            ? PixelFloodFill.BORDER_COLOR
            : PixelFloodFill.BACKGROUND_COLOR
        );
        if (finalIsBorder) initialBorderKeys.push(key);
      }
    }

    // Optional dilation pass to close tiny gaps from anti-aliasing/downscale
    if (this.detectionOptions.dilate && initialBorderKeys.length > 0) {
      const passes = Math.max(1, this.detectionOptions.dilateIterations);
      let frontier = initialBorderKeys.slice();
      for (let pass = 0; pass < passes; pass++) {
        const next: string[] = [];
        for (const key of frontier) {
          const [xStr, yStr] = key.split(',');
          const x = parseInt(xStr, 10);
          const y = parseInt(yStr, 10);
          const neighbors = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
            [x + 1, y + 1],
            [x - 1, y - 1],
            [x + 1, y - 1],
            [x - 1, y + 1],
          ];
          for (const [nx, ny] of neighbors) {
            if (nx < 0 || ny < 0 || nx >= this.gridW || ny >= this.gridH) {
              continue;
            }
            const nKey = `${nx},${ny}`;
            const c = this.pixels.get(nKey);
            if (c && c !== PixelFloodFill.BORDER_COLOR) {
              this.pixels.set(nKey, PixelFloodFill.BORDER_COLOR);
              next.push(nKey);
            }
          }
        }
        if (next.length === 0) break;
        frontier = next;
      }
      // Optional erosion to thin back lines while keeping gaps closed (closing)
      if (this.detectionOptions.closing) {
        const erosionPasses = Math.max(
          1,
          this.detectionOptions.closingIterations
        );
        for (let ep = 0; ep < erosionPasses; ep++) {
          const toBackground: string[] = [];
          for (let y = 0; y < this.gridH; y++) {
            for (let x = 0; x < this.gridW; x++) {
              const key = `${x},${y}`;
              if (this.pixels.get(key) !== PixelFloodFill.BORDER_COLOR) {
                continue;
              }
              let borderNeighbors = 0;
              const neighbors = [
                [x + 1, y],
                [x - 1, y],
                [x, y + 1],
                [x, y - 1],
                [x + 1, y + 1],
                [x - 1, y - 1],
                [x + 1, y - 1],
                [x - 1, y + 1],
              ];
              for (const [nx, ny] of neighbors) {
                if (nx < 0 || ny < 0 || nx >= this.gridW || ny >= this.gridH) {
                  continue;
                }
                // prettier-ignore
                if (this.pixels.get(`${nx},${ny}`) === PixelFloodFill.BORDER_COLOR) {
                  borderNeighbors++;
                }
              }
              // If too few border neighbors, this is likely overgrowth from dilation; revert
              if (borderNeighbors <= 2) {
                toBackground.push(key);
              }
            }
          }
          for (const key of toBackground) {
            this.pixels.set(key, PixelFloodFill.BACKGROUND_COLOR);
          }
        }
      }
    }
  }

  // Compute Otsu threshold for a set of luma samples
  private computeOtsuThreshold(lumas: number[]): number {
    // Build histogram 0..255
    const hist = new Array<number>(256).fill(0);
    for (const L of lumas) hist[Math.max(0, Math.min(255, L))]++;
    const total = lumas.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVar = -1;
    let threshold = this.detectionOptions.lumaThreshold;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const betweenVar = wB * wF * (mB - mF) * (mB - mF);
      if (betweenVar > maxVar) {
        maxVar = betweenVar;
        threshold = t;
      }
    }
    // Clamp to a reasonable range for dark lines
    return Math.max(50, Math.min(180, Math.floor(threshold)));
  }

  // Decode a PNG from a local/file/http uri into RGBA8 pixel buffer
  private async decodePngToRgba(
    uri: string
  ): Promise<{ width: number; height: number; data: Uint8Array }> {
    let arrayBuffer: ArrayBuffer;
    try {
      if (uri.startsWith('data:')) {
        const base64 = uri.split(',')[1] ?? '';
        const binary = this.base64ToUint8Array(base64);
        arrayBuffer = binary.buffer as ArrayBuffer;
      } else if (uri.startsWith('file://') || uri.startsWith('content://')) {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const binary = this.base64ToUint8Array(base64);
        arrayBuffer = binary.buffer as ArrayBuffer;
      } else if (uri.startsWith('asset://') || uri.startsWith('asset:/')) {
        // Ensure we have a local file for asset URIs
        const normalized = uri.replace('asset:/', 'asset://');
        const asset = Asset.fromURI(normalized);
        if (!asset.downloaded) {
          await asset.downloadAsync();
        }
        const fileUri = asset.localUri || asset.uri;
        if (!fileUri || !fileUri.startsWith('file://'))
          throw new Error(`Asset not resolved to file:// for ${uri}`);
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const binary = this.base64ToUint8Array(base64);
        arrayBuffer = binary.buffer as ArrayBuffer;
      } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
        const res = await fetch(uri);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        arrayBuffer = await res.arrayBuffer();
      } else {
        // Try reading generic path via FileSystem
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const binary = this.base64ToUint8Array(base64);
        arrayBuffer = binary.buffer as ArrayBuffer;
      }
    } catch (e) {
      throw new Error(`decodePngToRgba: failed to read ${uri}: ${String(e)}`);
    }

    const png = UPNG.decode(arrayBuffer);
    const rgbaFrames = UPNG.toRGBA8(png); // Uint8Array[]
    const data: Uint8Array = rgbaFrames[0];
    const width: number = png.width;
    const height: number = png.height;
    return { width, height, data };
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    // atob polyfill for React Native
    const binaryString = b64decode(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Initialize pixel grid simulating a typical coloring book template
   * This creates a logical pixel representation where:
   * - Black pixels = borders/lines
   * - White pixels = fillable areas
   */
  private initializePixelGrid(): void {
    // Prefer viewport resolution if available for alignment
    const pixelWidth = this.viewportRect
      ? Math.max(1, Math.floor(this.viewportRect.width))
      : Math.floor(this.canvasWidth / PixelFloodFill.PIXEL_SIZE);
    const pixelHeight = this.viewportRect
      ? Math.max(1, Math.floor(this.viewportRect.height))
      : Math.floor(this.canvasHeight / PixelFloodFill.PIXEL_SIZE);
    this.gridW = pixelWidth;
    this.gridH = pixelHeight;

    // Initialize all as white (fillable)
    for (let y = 0; y < pixelHeight; y++) {
      for (let x = 0; x < pixelWidth; x++) {
        this.pixels.set(`${x},${y}`, PixelFloodFill.BACKGROUND_COLOR);
      }
    }

    // Create border patterns that mimic a hot air balloon template
    this.createHotAirBalloonTemplate(pixelWidth, pixelHeight);
  }

  /**
   * Public fallback initializer to ensure the canvas is usable
   * when image decoding is unavailable in some environments.
   */
  public initializeFallback(): void {
    this.initializePixelGrid();
  }

  /**
   * Create a hot air balloon template with proper borders
   */
  private createHotAirBalloonTemplate(width: number, height: number): void {
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    // Main balloon (large circle)
    this.drawCircleBorder(centerX, centerY - 20, 35);

    // Balloon stripes (horizontal lines inside balloon)
    for (let i = -25; i <= 15; i += 10) {
      this.drawHorizontalLine(centerX - 30, centerX + 30, centerY - 20 + i);
    }

    // Basket (rectangle below balloon)
    this.drawRectangleBorder(centerX - 8, centerY + 20, 16, 12);

    // Ropes connecting balloon to basket
    this.drawVerticalLine(centerX - 5, centerY + 15, centerY + 20);
    this.drawVerticalLine(centerX + 5, centerY + 15, centerY + 20);

    // Small balloons (left and right)
    this.drawCircleBorder(centerX - 50, centerY - 10, 15);
    this.drawCircleBorder(centerX + 50, centerY - 10, 15);

    // Small balloon baskets
    this.drawRectangleBorder(centerX - 55, centerY + 8, 10, 6);
    this.drawRectangleBorder(centerX + 45, centerY + 8, 10, 6);

    // Clouds
    this.drawCloud(centerX - 70, centerY + 30, 12);
    this.drawCloud(centerX + 70, centerY + 30, 12);

    // Ground/hills
    this.drawHorizontalLine(0, width - 1, height - 15);
    this.drawTriangle(centerX - 40, height - 15, 20, 10);
    this.drawTriangle(centerX + 40, height - 15, 20, 10);
  }

  /**
   * Drawing helper methods for creating template borders
   */
  private drawCircleBorder(
    centerX: number,
    centerY: number,
    radius: number
  ): void {
    for (let angle = 0; angle < 360; angle += 2) {
      const x = Math.round(
        centerX + radius * Math.cos((angle * Math.PI) / 180)
      );
      const y = Math.round(
        centerY + radius * Math.sin((angle * Math.PI) / 180)
      );
      this.setPixel(x, y, PixelFloodFill.BORDER_COLOR);
    }
  }

  private drawRectangleBorder(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Top and bottom edges
    for (let i = 0; i <= width; i++) {
      this.setPixel(x + i, y, PixelFloodFill.BORDER_COLOR);
      this.setPixel(x + i, y + height, PixelFloodFill.BORDER_COLOR);
    }
    // Left and right edges
    for (let i = 0; i <= height; i++) {
      this.setPixel(x, y + i, PixelFloodFill.BORDER_COLOR);
      this.setPixel(x + width, y + i, PixelFloodFill.BORDER_COLOR);
    }
  }

  private drawHorizontalLine(startX: number, endX: number, y: number): void {
    for (let x = startX; x <= endX; x++) {
      this.setPixel(x, y, PixelFloodFill.BORDER_COLOR);
    }
  }

  private drawVerticalLine(x: number, startY: number, endY: number): void {
    for (let y = startY; y <= endY; y++) {
      this.setPixel(x, y, PixelFloodFill.BORDER_COLOR);
    }
  }

  private drawTriangle(
    baseX: number,
    baseY: number,
    width: number,
    height: number
  ): void {
    for (let i = 0; i <= width; i++) {
      const y = baseY - Math.floor((height * i) / width);
      this.setPixel(baseX - width / 2 + i, y, PixelFloodFill.BORDER_COLOR);
      this.setPixel(baseX + width / 2 - i, y, PixelFloodFill.BORDER_COLOR);
    }
  }

  private drawCloud(centerX: number, centerY: number, size: number): void {
    // Simple cloud as multiple overlapping circles
    this.drawCircleBorder(centerX - size / 2, centerY, size / 3);
    this.drawCircleBorder(centerX, centerY - size / 4, size / 3);
    this.drawCircleBorder(centerX + size / 2, centerY, size / 3);
  }

  private setPixel(x: number, y: number, color: string): void {
    // Use current grid bounds to remain consistent with viewport-aware grid sizing
    const pixelWidth = this.gridW;
    const pixelHeight = this.gridH;

    if (x >= 0 && x < pixelWidth && y >= 0 && y < pixelHeight) {
      this.pixels.set(`${x},${y}`, color);
    }
  }

  /**
   * Flood fill algorithm - exactly like the reference Android implementation
   */
  fillAt(
    screenX: number,
    screenY: number,
    fillColor: string
  ): FloodFillRegion | null {
    // Map screen to grid coordinates, respecting viewport letterboxing if provided
    let pixelX: number;
    let pixelY: number;
    if (this.viewportRect) {
      const { x, y, width, height } = this.viewportRect;
      const gx = (screenX - x) / Math.max(1, width);
      const gy = (screenY - y) / Math.max(1, height);
      if (gx < 0 || gy < 0 || gx > 1 || gy > 1) return null; // outside displayed image
      pixelX = Math.floor(gx * this.gridW);
      pixelY = Math.floor(gy * this.gridH);
    } else {
      pixelX = Math.floor(screenX / PixelFloodFill.PIXEL_SIZE);
      pixelY = Math.floor(screenY / PixelFloodFill.PIXEL_SIZE);
    }

    const startPixel = `${pixelX},${pixelY}`;
    const startColor = this.pixels.get(startPixel);

    // Only allow filling from background (white) into background cells
    if (!startColor || startColor !== PixelFloodFill.BACKGROUND_COLOR) {
      return null;
    }

    // Perform flood fill using queue (same as Android implementation)
    const queue: { x: number; y: number }[] = [];
    const filledPixels = new Set<string>();
    const visited = new Set<string>();

    queue.push({ x: pixelX, y: pixelY });
    visited.add(startPixel);

    let minX = pixelX,
      maxX = pixelX,
      minY = pixelY,
      maxY = pixelY;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentKey = `${current.x},${current.y}`;

      // Fill current pixel
      this.pixels.set(currentKey, fillColor);
      filledPixels.add(currentKey);

      // Update bounds
      minX = Math.min(minX, current.x);
      maxX = Math.max(maxX, current.x);
      minY = Math.min(minY, current.y);
      maxY = Math.max(maxY, current.y);

      // Add neighbors to queue (4-directional flood fill)
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        const neighborColor = this.pixels.get(neighborKey);

        if (
          !visited.has(neighborKey) &&
          neighborColor &&
          neighborColor === PixelFloodFill.BACKGROUND_COLOR
        ) {
          queue.push(neighbor);
          visited.add(neighborKey);
        }
      }
    }

    // Create and store the filled region
    const regionId = `region_${this.regionIdCounter++}`;
    const region: FloodFillRegion = {
      id: regionId,
      pixels: filledPixels,
      color: fillColor,
      bounds: { minX, maxX, minY, maxY },
    };

    this.filledRegions.set(regionId, region);
    return region;
  }

  /**
   * Find region near point (for smart touch detection like Android app)
   */
  findRegionNearPoint(
    screenX: number,
    screenY: number,
    searchRadius: number = 8,
    fillColor: string = '#FF0000'
  ): FloodFillRegion | null {
    let pixelX: number;
    let pixelY: number;
    if (this.viewportRect) {
      const { x, y, width, height } = this.viewportRect;
      const gx = (screenX - x) / Math.max(1, width);
      const gy = (screenY - y) / Math.max(1, height);
      if (gx < 0 || gy < 0 || gx > 1 || gy > 1) return null;
      pixelX = Math.floor(gx * this.gridW);
      pixelY = Math.floor(gy * this.gridH);
    } else {
      pixelX = Math.floor(screenX / PixelFloodFill.PIXEL_SIZE);
      pixelY = Math.floor(screenY / PixelFloodFill.PIXEL_SIZE);
    }

    // Search in expanding square around touch point
    for (let radius = 0; radius <= searchRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            // Only check perimeter
            const checkX = pixelX + dx;
            const checkY = pixelY + dy;
            const pixelColor = this.pixels.get(`${checkX},${checkY}`);

            if (pixelColor && pixelColor === PixelFloodFill.BACKGROUND_COLOR) {
              // Found a fillable pixel, attempt flood fill here with proper screen mapping
              if (this.viewportRect) {
                const pxW = Math.max(
                  1,
                  this.viewportRect.width / Math.max(1, this.gridW)
                );
                const pxH = Math.max(
                  1,
                  this.viewportRect.height / Math.max(1, this.gridH)
                );
                const sx = this.viewportRect.x + checkX * pxW;
                const sy = this.viewportRect.y + checkY * pxH;
                return this.fillAt(sx, sy, fillColor);
              }
              return this.fillAt(
                checkX * PixelFloodFill.PIXEL_SIZE,
                checkY * PixelFloodFill.PIXEL_SIZE,
                fillColor
              );
            }
          }
        }
      }
    }
    return null;
  }

  /**
   * Get all filled regions as SVG paths for rendering
   */
  getFilledRegionsAsSVGPaths(): { id: string; path: string; color: string }[] {
    const svgPaths: { id: string; path: string; color: string }[] = [];
    const hasViewport = Boolean(this.viewportRect);
    const pxW = hasViewport
      ? Math.max(1, this.viewportRect!.width / Math.max(1, this.gridW))
      : PixelFloodFill.PIXEL_SIZE;
    const pxH = hasViewport
      ? Math.max(1, this.viewportRect!.height / Math.max(1, this.gridH))
      : PixelFloodFill.PIXEL_SIZE;
    const offsetX = hasViewport ? this.viewportRect!.x : 0;
    const offsetY = hasViewport ? this.viewportRect!.y : 0;

    for (const region of Array.from(this.filledRegions.values())) {
      // Convert pixel coordinates back to screen coordinates and create path
      let path = '';
      const processedRows = new Set<number>();

      for (const pixelKey of Array.from(region.pixels)) {
        const [, y] = pixelKey.split(',').map(Number);

        if (!processedRows.has(y)) {
          processedRows.add(y);

          // Find continuous horizontal spans for this row
          const rowPixels = Array.from(region.pixels)
            .filter((pk: string) => pk.split(',')[1] === y.toString())
            .map((pk: string) => parseInt(pk.split(',')[0], 10))
            .sort((a, b) => a - b);

          let spanStart = rowPixels[0];
          let spanEnd = rowPixels[0];

          for (let i = 1; i < rowPixels.length; i++) {
            if (rowPixels[i] === spanEnd + 1) {
              spanEnd = rowPixels[i];
            } else {
              // End of span, add rectangle
              const screenX = offsetX + spanStart * pxW;
              const screenY = offsetY + y * pxH;
              const screenW = (spanEnd - spanStart + 1) * pxW;
              const screenH = pxH;

              if (path) path += ' ';
              path += `M${screenX},${screenY} L${screenX + screenW},${screenY} L${screenX + screenW},${screenY + screenH} L${screenX},${screenY + screenH} Z`;

              spanStart = spanEnd = rowPixels[i];
            }
          }

          // Add final span
          const screenX = offsetX + spanStart * pxW;
          const screenY = offsetY + y * pxH;
          const screenW = (spanEnd - spanStart + 1) * pxW;
          const screenH = pxH;

          if (path) path += ' ';
          path += `M${screenX},${screenY} L${screenX + screenW},${screenY} L${screenX + screenW},${screenY + screenH} L${screenX},${screenY + screenH} Z`;
        }
      }

      svgPaths.push({
        id: region.id,
        path,
        color: region.color,
      });
    }

    return svgPaths;
  }

  /**
   * Clear all filled regions
   */
  clearAll(): void {
    // Restore original pixels
    for (const region of Array.from(this.filledRegions.values())) {
      for (const pixelKey of Array.from(region.pixels)) {
        this.pixels.set(pixelKey, PixelFloodFill.BACKGROUND_COLOR);
      }
    }
    this.filledRegions.clear();
  }

  /**
   * Get filled regions
   */
  getFilledRegions(): FloodFillRegion[] {
    return Array.from(this.filledRegions.values());
  }

  /**
   * Set the displayed image viewport within the canvas (for 'contain' letterboxing).
   */
  setViewport(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): void {
    this.viewportRect = rect;
  }

  /**
   * Configure detection options for boundary extraction.
   */
  setDetectionOptions(opts: DetectionOptions): void {
    this.detectionOptions = { ...this.detectionOptions, ...opts };
  }
}
