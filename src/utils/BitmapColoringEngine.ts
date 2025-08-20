import * as FileSystem from 'expo-file-system';

/**
 * PNG Bitmap Coloring Engine
 * Based on the Android coloring-book implementation by niccokunzmann
 * Handles flood fill coloring on PNG images with black borders
 */

export interface ColoringBitmap {
  width: number;
  height: number;
  pixels: number[]; // RGBA pixel data
}

export interface TouchPoint {
  x: number;
  y: number;
}

export class BitmapColoringEngine {
  public static readonly BORDER_COLOR = 0xff000000; // Black border
  public static readonly BACKGROUND_COLOR = 0xffffffff; // White background
  private static readonly COLOR_SEARCH_RADIUS = 10;

  /**
   * Load PNG image and convert to coloring bitmap
   */
  static async loadPngAsBitmap(imageUri: string): Promise<ColoringBitmap> {
    try {
      // Load image as base64
      const imageData = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create image element to get pixel data
      const img = new Image();
      img.src = `data:image/png;base64,${imageData}`;

      return new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not create canvas context'));
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;

          // Draw image to canvas
          ctx.drawImage(img, 0, 0);

          // Get pixel data
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const pixels = new Array(imageData.data.length / 4);

          // Convert RGBA to ARGB format (Android style)
          for (let i = 0; i < pixels.length; i++) {
            const pixelIndex = i * 4;
            const r = imageData.data[pixelIndex];
            const g = imageData.data[pixelIndex + 1];
            const b = imageData.data[pixelIndex + 2];
            const a = imageData.data[pixelIndex + 3];

            // Convert to ARGB int
            pixels[i] = (a << 24) | (r << 16) | (g << 8) | b;
          }

          resolve({
            width: img.width,
            height: img.height,
            pixels,
          });
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
      });
    } catch (error) {
      throw new Error(`Failed to load PNG as bitmap: ${error}`);
    }
  }

  /**
   * Convert bitmap back to base64 PNG for display
   */
  static bitmapToBase64Png(bitmap: ColoringBitmap): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const imageData = ctx.createImageData(bitmap.width, bitmap.height);

    // Convert ARGB back to RGBA
    for (let i = 0; i < bitmap.pixels.length; i++) {
      const pixelIndex = i * 4;
      const argb = bitmap.pixels[i];

      imageData.data[pixelIndex] = (argb >> 16) & 0xff; // R
      imageData.data[pixelIndex + 1] = (argb >> 8) & 0xff; // G
      imageData.data[pixelIndex + 2] = argb & 0xff; // B
      imageData.data[pixelIndex + 3] = (argb >> 24) & 0xff; // A
    }

    ctx.putImageData(imageData, 0, 0);

    // Convert to base64 PNG
    return canvas.toDataURL('image/png').split(',')[1];
  }

  /**
   * Perform flood fill at the given coordinates
   * Based on the Android FloodFill implementation
   */
  static floodFill(
    bitmap: ColoringBitmap,
    x: number,
    y: number,
    color: number
  ): ColoringBitmap {
    // Create a copy of the bitmap
    const newBitmap: ColoringBitmap = {
      width: bitmap.width,
      height: bitmap.height,
      pixels: [...bitmap.pixels],
    };

    // Validate coordinates
    if (x < 0 || x >= bitmap.width || y < 0 || y >= bitmap.height) {
      return newBitmap;
    }

    const pixelIndex = x + y * bitmap.width;
    const targetColor = bitmap.pixels[pixelIndex];

    // Don't fill if clicking on border or already the same color
    if (targetColor === this.BORDER_COLOR || targetColor === color) {
      return newBitmap;
    }

    // Use queue-based flood fill (same algorithm as Android version)
    const queue: TouchPoint[] = [];
    const visited = new Set<number>();

    queue.push({ x, y });

    while (queue.length > 0) {
      const point = queue.shift()!;
      const currentIndex = point.x + point.y * bitmap.width;

      // Skip if already visited or out of bounds
      if (
        visited.has(currentIndex) ||
        point.x < 0 ||
        point.x >= bitmap.width ||
        point.y < 0 ||
        point.y >= bitmap.height
      ) {
        continue;
      }

      const currentColor = newBitmap.pixels[currentIndex];

      // Skip if border color or already filled
      if (currentColor === this.BORDER_COLOR || currentColor === color) {
        continue;
      }

      // Skip if not the target color
      if (currentColor !== targetColor) {
        continue;
      }

      // Fill this pixel
      newBitmap.pixels[currentIndex] = color;
      visited.add(currentIndex);

      // Add neighboring pixels to queue
      queue.push({ x: point.x + 1, y: point.y });
      queue.push({ x: point.x - 1, y: point.y });
      queue.push({ x: point.x, y: point.y + 1 });
      queue.push({ x: point.x, y: point.y - 1 });
    }

    return newBitmap;
  }

  /**
   * Smart color search to find paintable area near touch point
   * Based on Android BitmapColorSearch implementation
   */
  static findPaintableArea(
    bitmap: ColoringBitmap,
    x: number,
    y: number,
    targetColor: number
  ): TouchPoint | null {
    const startPixelIndex = x + y * bitmap.width;

    // If not clicking on border, return original point
    if (bitmap.pixels[startPixelIndex] !== this.BORDER_COLOR) {
      return { x, y };
    }

    // Search in expanding radius for a paintable pixel
    for (let radius = 1; radius <= this.COLOR_SEARCH_RADIUS; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const searchX = x + dx;
          const searchY = y + dy;

          // Check bounds
          if (
            searchX < 0 ||
            searchX >= bitmap.width ||
            searchY < 0 ||
            searchY >= bitmap.height
          ) {
            continue;
          }

          const searchIndex = searchX + searchY * bitmap.width;
          const searchPixel = bitmap.pixels[searchIndex];

          // Found a paintable pixel that's not the target color
          if (
            searchPixel !== this.BORDER_COLOR &&
            searchPixel !== targetColor
          ) {
            return { x: searchX, y: searchY };
          }
        }
      }
    }

    // If no better area found, search for any non-border pixel
    for (let radius = 1; radius <= this.COLOR_SEARCH_RADIUS; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const searchX = x + dx;
          const searchY = y + dy;

          if (
            searchX < 0 ||
            searchX >= bitmap.width ||
            searchY < 0 ||
            searchY >= bitmap.height
          ) {
            continue;
          }

          const searchIndex = searchX + searchY * bitmap.width;
          const searchPixel = bitmap.pixels[searchIndex];

          if (searchPixel !== this.BORDER_COLOR) {
            return { x: searchX, y: searchY };
          }
        }
      }
    }

    return null; // No paintable area found
  }

  /**
   * Convert RGB color to ARGB format
   */
  static rgbToArgb(r: number, g: number, b: number, a: number = 255): number {
    return (a << 24) | (r << 16) | (g << 8) | b;
  }

  /**
   * Convert hex color to ARGB format
   */
  static hexToArgb(hex: string): number {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);
    return this.rgbToArgb(r, g, b);
  }

  /**
   * Convert ARGB to RGB components
   */
  static argbToRgb(argb: number): {
    r: number;
    g: number;
    b: number;
    a: number;
  } {
    return {
      a: (argb >> 24) & 0xff,
      r: (argb >> 16) & 0xff,
      g: (argb >> 8) & 0xff,
      b: argb & 0xff,
    };
  }

  /**
   * Create a hash of the bitmap for comparison (similar to Android BitmapHash)
   */
  static hashBitmap(bitmap: ColoringBitmap): number {
    let hash = 0;
    for (let i = 0; i < bitmap.pixels.length; i++) {
      hash += bitmap.pixels[i];
    }
    return hash & 0xffffffff;
  }

  /**
   * Convert any image to black and white coloring template
   * Based on Android BlackAndWhiteImageImport
   */
  static convertToColoringTemplate(
    bitmap: ColoringBitmap,
    threshold: number = 128
  ): ColoringBitmap {
    const newBitmap: ColoringBitmap = {
      width: bitmap.width,
      height: bitmap.height,
      pixels: new Array(bitmap.pixels.length),
    };

    for (let i = 0; i < bitmap.pixels.length; i++) {
      const pixel = bitmap.pixels[i];
      const { r, g, b } = this.argbToRgb(pixel);

      // Calculate brightness (same as Android implementation)
      const brightness = (r + g + b) / 3;

      // Convert to black border or white background
      newBitmap.pixels[i] =
        brightness < threshold ? this.BORDER_COLOR : this.BACKGROUND_COLOR;
    }

    return newBitmap;
  }
}
