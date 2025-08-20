/**
 * ZebraPaintEngine - Exact implementation of the zebra-paint coloring system
 *
 * This separates the coloring template into two layers:
 * 1. Outline layer (extracted from template, never changes)
 * 2. Paint layer (white canvas where colors are filled)
 *
 * Based on the Android zebra-paint implementation by Peter Dornbach
 */

export interface ZebraPaintState {
  width: number;
  height: number;
  outlineImageData: ImageData; // Black outlines with alpha
  paintImageData: ImageData; // White canvas for painting
  paintMask: Uint8Array; // 1 = fillable, 0 = boundary
  workingMask: Uint8Array; // Working copy for flood fill
  pixels: Uint32Array; // ARGB pixel array for fast access
}

export class ZebraPaintEngine {
  private static readonly ALPHA_THRESHOLD = 224;

  /**
   * Initialize the zebra-paint system from a template image
   * This extracts outlines and creates the paint canvas
   */
  static async initializeFromTemplate(
    templateCanvas: HTMLCanvasElement,
    width: number,
    height: number
  ): Promise<ZebraPaintState> {
    const ctx = templateCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Get the original template image data
    const templateImageData = ctx.getImageData(
      0,
      0,
      templateCanvas.width,
      templateCanvas.height
    );

    // Create resized version for processing
    const processingCanvas = document.createElement('canvas');
    const processingCtx = processingCanvas.getContext('2d')!;
    processingCanvas.width = width;
    processingCanvas.height = height;

    // Draw template at the desired size
    processingCtx.drawImage(templateCanvas, 0, 0, width, height);
    const resizedImageData = processingCtx.getImageData(0, 0, width, height);

    // Create the outline bitmap and paint mask
    const outlineData = new Uint8ClampedArray(width * height * 4);
    const paintMask = new Uint8Array(width * height);
    const n = width * height;

    // Process each pixel to extract outlines and create mask
    for (let i = 0; i < n; i++) {
      const pixelIndex = i * 4;
      const r = resizedImageData.data[pixelIndex];
      const g = resizedImageData.data[pixelIndex + 1];
      const b = resizedImageData.data[pixelIndex + 2];
      const a = resizedImageData.data[pixelIndex + 3];

      // Calculate brightness (zebra-paint uses green channel as approximation)
      const brightness = r; // zebra-paint uses red channel for speed

      // Create alpha channel based on brightness (darker = more opaque outline)
      const alpha = 255 - brightness;

      // Determine if this pixel can be painted (based on alpha threshold)
      if (alpha < this.ALPHA_THRESHOLD) {
        paintMask[i] = 1; // Can be painted
      } else {
        paintMask[i] = 0; // Cannot be painted (outline)
      }

      // Create pure black outline with calculated alpha
      outlineData[pixelIndex] = 0; // R
      outlineData[pixelIndex + 1] = 0; // G
      outlineData[pixelIndex + 2] = 0; // B
      outlineData[pixelIndex + 3] = alpha; // A
    }

    // Create outline ImageData
    const outlineImageData = new ImageData(outlineData, width, height);

    // Create white paint canvas
    const paintData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < n; i++) {
      const pixelIndex = i * 4;
      paintData[pixelIndex] = 255; // R
      paintData[pixelIndex + 1] = 255; // G
      paintData[pixelIndex + 2] = 255; // B
      paintData[pixelIndex + 3] = 255; // A
    }
    const paintImageData = new ImageData(paintData, width, height);

    // Create ARGB pixel array for fast flood fill operations
    const pixels = new Uint32Array(n);
    for (let i = 0; i < n; i++) {
      pixels[i] = 0xffffffff; // White in ARGB format
    }

    // Create working mask copy
    const workingMask = new Uint8Array(paintMask);

    return {
      width,
      height,
      outlineImageData,
      paintImageData,
      paintMask,
      workingMask,
      pixels,
    };
  }

  /**
   * Perform flood fill on the paint canvas
   * This is the exact algorithm from zebra-paint FloodFill.fillRaw
   */
  static floodFill(
    state: ZebraPaintState,
    x: number,
    y: number,
    color: number // ARGB format
  ): boolean {
    // Validate coordinates
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) {
      return false;
    }

    const startIndex = y * state.width + x;

    // Check if the starting position can be painted
    if (state.paintMask[startIndex] === 0) {
      return false;
    }

    // Copy paint mask to working mask
    state.workingMask.set(state.paintMask);

    // Perform the flood fill using zebra-paint algorithm
    this.fillRaw(
      x,
      y,
      state.width,
      state.height,
      state.workingMask,
      state.pixels,
      color
    );

    // Update the paint ImageData
    this.updatePaintImageData(state);

    return true;
  }

  /**
   * Paint with brush at specified coordinates
   * This allows freehand painting while respecting boundaries
   */
  static paintBrush(
    state: ZebraPaintState,
    x: number,
    y: number,
    color: number, // ARGB format
    brushSize: number = 8
  ): boolean {
    // Validate coordinates
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) {
      return false;
    }

    let pixelsPainted = 0;
    const radius = Math.floor(brushSize / 2);

    // Paint in a circular area
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const px = x + dx;
        const py = y + dy;

        // Check if pixel is within canvas bounds
        if (px >= 0 && px < state.width && py >= 0 && py < state.height) {
          // Check if pixel is within circular brush
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const pixelIndex = py * state.width + px;

            // Only paint if the pixel is not a boundary
            if (state.paintMask[pixelIndex] === 1) {
              state.pixels[pixelIndex] = color;
              pixelsPainted++;
            }
          }
        }
      }
    }

    if (pixelsPainted > 0) {
      // Update the paint ImageData
      this.updatePaintImageData(state);
      return true;
    }

    return false;
  }

  /**
   * Paint a line between two points (for smooth brush strokes)
   */
  static paintLine(
    state: ZebraPaintState,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: number,
    brushSize: number = 8
  ): boolean {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let x = x0;
    let y = y0;
    let painted = false;

    while (true) {
      // Paint at current position
      if (this.paintBrush(state, x, y, color, brushSize)) {
        painted = true;
      }

      // Check if we've reached the end point
      if (x === x1 && y === y1) break;

      // Move to next point using Bresenham's algorithm
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }

    return painted;
  }

  /**
   * Raw flood fill implementation - direct port from zebra-paint
   */
  private static fillRaw(
    x: number,
    y: number,
    width: number,
    height: number,
    mask: Uint8Array,
    pixels: Uint32Array,
    color: number
  ): void {
    interface Point {
      x: number;
      y: number;
    }

    const queue: Point[] = [];
    queue.push({ x, y });

    while (queue.length > 0) {
      const p = queue.shift()!;
      let px1 = p.x;
      let px2 = p.x;
      const py = p.y;
      const pp = py * width;

      if (mask[pp + px1] !== 0) {
        // Find the left edge
        while (px1 >= 0 && mask[pp + px1] !== 0) {
          px1--;
        }
        px1++;

        // Find the right edge
        while (px2 < width && mask[pp + px2] !== 0) {
          px2++;
        }

        // Fill the line
        for (let i = px1; i < px2; i++) {
          pixels[pp + i] = color;
          mask[pp + i] = 0; // Mark as filled
        }

        let prevMatchUp = false;
        let prevMatchDn = false;
        const ppUp = pp - width;
        const ppDn = pp + width;

        // Check neighbors above and below
        for (let px = px1; px < px2; px++) {
          if (py > 0) {
            const matchUp = mask[ppUp + px] !== 0;
            if (matchUp && !prevMatchUp) {
              queue.push({ x: px, y: py - 1 });
            }
            prevMatchUp = matchUp;
          }

          if (py + 1 < height) {
            const matchDn = mask[ppDn + px] !== 0;
            if (matchDn && !prevMatchDn) {
              queue.push({ x: px, y: py + 1 });
            }
            prevMatchDn = matchDn;
          }
        }
      }
    }
  }

  /**
   * Update the paint ImageData from the ARGB pixel array
   */
  private static updatePaintImageData(state: ZebraPaintState): void {
    const data = state.paintImageData.data;

    for (let i = 0; i < state.pixels.length; i++) {
      const argb = state.pixels[i];
      const pixelIndex = i * 4;

      // Convert ARGB to RGBA
      data[pixelIndex] = (argb >> 16) & 0xff; // R
      data[pixelIndex + 1] = (argb >> 8) & 0xff; // G
      data[pixelIndex + 2] = argb & 0xff; // B
      data[pixelIndex + 3] = (argb >> 24) & 0xff; // A
    }
  }

  /**
   * Render the complete coloring book page
   * This draws the paint canvas first, then the outline on top
   */
  static render(canvas: HTMLCanvasElement, state: ZebraPaintState): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = state.width;
    canvas.height = state.height;

    // First draw the painted canvas
    ctx.putImageData(state.paintImageData, 0, 0);

    // Then draw the outline on top
    ctx.putImageData(state.outlineImageData, 0, 0);
  }

  /**
   * Convert hex color to ARGB format
   */
  static hexToArgb(hex: string): number {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);

    return (0xff << 24) | (r << 16) | (g << 8) | b;
  }
}
