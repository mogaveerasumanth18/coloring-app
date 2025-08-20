/**
 * ZebraFloodFill - Direct port of the zebra-paint flood fill algorithm
 * Based on the Android implementation by Peter Dornbach
 *
 * This implements the exact same queue-based flood fill algorithm
 * that works reliably in the reference Android coloring app.
 */

export interface Point {
  x: number;
  y: number;
}

export interface FloodFillOptions {
  maskColor: number; // Color that represents boundaries (usually black)
  fillColor: number; // Color to fill with
  tolerance: number; // Color matching tolerance (0-255)
}

/**
 * ZebraFloodFill class - implements the core flood fill algorithm
 * from the zebra-paint Android app
 */
export class ZebraFloodFill {
  private static readonly DEFAULT_MASK_COLOR = 0xff000000; // Black borders
  private static readonly DEFAULT_TOLERANCE = 10;

  /**
   * Main flood fill function - improved for colored templates
   *
   * @param pixels - RGBA pixel array (width * height * 4)
   * @param width - Image width
   * @param height - Image height
   * @param startX - Starting X coordinate
   * @param startY - Starting Y coordinate
   * @param fillColor - Color to fill with (ARGB format)
   * @param options - Fill options
   */
  static floodFillRGBA(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    fillColor: number,
    options: Partial<FloodFillOptions> = {}
  ): boolean {
    const { tolerance = this.DEFAULT_TOLERANCE } = options;

    // Validate input parameters
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
      return false;
    }

    // Get the target color (the color we want to replace)
    const startIndex = (startY * width + startX) * 4;
    const targetR = pixels[startIndex];
    const targetG = pixels[startIndex + 1];
    const targetB = pixels[startIndex + 2];
    const targetA = pixels[startIndex + 3];

    // Convert fill color from ARGB to RGBA components
    const fillR = (fillColor >> 16) & 0xff;
    const fillG = (fillColor >> 8) & 0xff;
    const fillB = fillColor & 0xff;
    const fillA = (fillColor >> 24) & 0xff;

    // Don't fill if target color is already the fill color
    if (
      Math.abs(targetR - fillR) <= tolerance &&
      Math.abs(targetG - fillG) <= tolerance &&
      Math.abs(targetB - fillB) <= tolerance &&
      Math.abs(targetA - fillA) <= tolerance
    ) {
      return false;
    }

    // Don't fill if clicking on a boundary (dark line)
    if (this.isBoundaryPixel(targetR, targetG, targetB, targetA)) {
      return false;
    }

    // Perform flood fill using queue-based algorithm
    const queue: Point[] = [];
    const visited = new Set<string>();

    queue.push({ x: startX, y: startY });

    while (queue.length > 0) {
      const point = queue.shift()!;
      const key = `${point.x},${point.y}`;

      // Skip if already visited or out of bounds
      if (
        visited.has(key) ||
        point.x < 0 ||
        point.x >= width ||
        point.y < 0 ||
        point.y >= height
      ) {
        continue;
      }

      const pixelIndex = (point.y * width + point.x) * 4;
      const currentR = pixels[pixelIndex];
      const currentG = pixels[pixelIndex + 1];
      const currentB = pixels[pixelIndex + 2];
      const currentA = pixels[pixelIndex + 3];

      // Skip if this pixel is a boundary
      if (this.isBoundaryPixel(currentR, currentG, currentB, currentA)) {
        continue;
      }

      // Skip if this pixel doesn't match the target color
      if (
        Math.abs(currentR - targetR) > tolerance ||
        Math.abs(currentG - targetG) > tolerance ||
        Math.abs(currentB - targetB) > tolerance ||
        Math.abs(currentA - targetA) > tolerance
      ) {
        continue;
      }

      // Fill this pixel
      pixels[pixelIndex] = fillR;
      pixels[pixelIndex + 1] = fillG;
      pixels[pixelIndex + 2] = fillB;
      pixels[pixelIndex + 3] = fillA;

      visited.add(key);

      // Add neighboring pixels to queue
      queue.push({ x: point.x + 1, y: point.y });
      queue.push({ x: point.x - 1, y: point.y });
      queue.push({ x: point.x, y: point.y + 1 });
      queue.push({ x: point.x, y: point.y - 1 });
    }

    return visited.size > 0;
  }

  /**
   * Smart flood fill specifically designed for coloring book templates
   * This version analyzes the image to detect proper boundaries
   */
  static smartFloodFill(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number,
    fillColor: number,
    tolerance: number = 30
  ): boolean {
    // Validate input parameters
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
      console.log('❌ Coordinates out of bounds');
      return false;
    }

    // Get the target color (the color we want to replace)
    const startIndex = (startY * width + startX) * 4;
    const targetR = pixels[startIndex];
    const targetG = pixels[startIndex + 1];
    const targetB = pixels[startIndex + 2];
    const targetA = pixels[startIndex + 3];

    console.log(
      `🎯 Target color at (${startX},${startY}): R=${targetR}, G=${targetG}, B=${targetB}, A=${targetA}`
    );

    // Convert fill color from ARGB to RGBA components
    const fillR = (fillColor >> 16) & 0xff;
    const fillG = (fillColor >> 8) & 0xff;
    const fillB = fillColor & 0xff;
    const fillA = (fillColor >> 24) & 0xff;

    console.log(
      `🎨 Fill color: R=${fillR}, G=${fillG}, B=${fillB}, A=${fillA}`
    );

    // Don't fill if target color is already similar to fill color
    if (
      Math.abs(targetR - fillR) <= 10 &&
      Math.abs(targetG - fillG) <= 10 &&
      Math.abs(targetB - fillB) <= 10
    ) {
      console.log('⚠️ Target color is already similar to fill color');
      return false;
    }

    // Don't fill if clicking on a boundary pixel
    if (this.isBoundaryPixel(targetR, targetG, targetB, targetA)) {
      console.log('⚠️ Clicked on boundary pixel');
      return false;
    }

    // Use a more sophisticated flood fill that respects boundaries
    const queue: Point[] = [];
    const visited = new Set<string>();

    queue.push({ x: startX, y: startY });

    let pixelsFilled = 0;

    while (queue.length > 0) {
      const point = queue.shift()!;
      const key = `${point.x},${point.y}`;

      // Skip if already visited or out of bounds
      if (
        visited.has(key) ||
        point.x < 0 ||
        point.x >= width ||
        point.y < 0 ||
        point.y >= height
      ) {
        continue;
      }

      const pixelIndex = (point.y * width + point.x) * 4;
      const currentR = pixels[pixelIndex];
      const currentG = pixels[pixelIndex + 1];
      const currentB = pixels[pixelIndex + 2];
      const currentA = pixels[pixelIndex + 3];

      // Skip if this pixel is a boundary
      if (this.isBoundaryPixel(currentR, currentG, currentB, currentA)) {
        continue;
      }

      // Calculate color distance using improved color matching
      const colorDistance = Math.sqrt(
        Math.pow(currentR - targetR, 2) +
          Math.pow(currentG - targetG, 2) +
          Math.pow(currentB - targetB, 2)
      );

      // Skip if this pixel doesn't match the target color within tolerance
      if (colorDistance > tolerance) {
        continue;
      }

      // Fill this pixel
      pixels[pixelIndex] = fillR;
      pixels[pixelIndex + 1] = fillG;
      pixels[pixelIndex + 2] = fillB;
      pixels[pixelIndex + 3] = fillA;

      visited.add(key);
      pixelsFilled++;

      // Add neighboring pixels to queue (4-directional connectivity)
      queue.push({ x: point.x + 1, y: point.y });
      queue.push({ x: point.x - 1, y: point.y });
      queue.push({ x: point.x, y: point.y + 1 });
      queue.push({ x: point.x, y: point.y - 1 });
    }

    console.log(`✅ Smart flood fill completed: ${pixelsFilled} pixels filled`);
    return pixelsFilled > 0;
  }

  /**
   * Check if a pixel should be treated as a boundary/outline
   * This function detects outline strokes in colored coloring book templates
   */
  private static isBoundaryPixel(
    r: number,
    g: number,
    b: number,
    a: number
  ): boolean {
    // If pixel is transparent/semi-transparent, it's not a boundary
    if (a < 200) {
      return false;
    }

    // Calculate brightness
    const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    // Check for very dark pixels (traditional black outlines)
    if (brightness <= 50) {
      // Increased threshold for better detection
      console.log(
        `🚫 Dark boundary detected: R=${r}, G=${g}, B=${b}, brightness=${brightness}`
      );
      return true;
    }

    // Check for saturated dark colors that might be outlines
    if (brightness <= 100) {
      // Increased threshold
      const maxChannel = Math.max(r, g, b);
      const minChannel = Math.min(r, g, b);
      const saturation =
        maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;

      // If it's saturated enough and dark enough, treat as boundary
      if (saturation > 0.2) {
        // Reduced saturation threshold
        console.log(
          `🚫 Saturated boundary detected: R=${r}, G=${g}, B=${b}, sat=${saturation.toFixed(2)}`
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Enhanced boundary detection that also checks neighboring pixels
   * to detect outline strokes more reliably
   */
  private static isBoundaryPixelEnhanced(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number
  ): boolean {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return true; // Treat out-of-bounds as boundary
    }

    const index = (y * width + x) * 4;
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const a = pixels[index + 3];

    // First check basic boundary detection
    if (this.isBoundaryPixel(r, g, b, a)) {
      return true;
    }

    // Check if this pixel is significantly different from its neighbors
    // This helps detect outline strokes
    const neighbors = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
    ];

    let significantDifferences = 0;
    const currentBrightness = 0.299 * r + 0.587 * g + 0.114 * b;

    for (const { dx, dy } of neighbors) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIndex = (ny * width + nx) * 4;
        const nr = pixels[nIndex];
        const ng = pixels[nIndex + 1];
        const nb = pixels[nIndex + 2];
        const na = pixels[nIndex + 3];

        if (na >= 200) {
          // Only compare with opaque pixels
          const neighborBrightness = 0.299 * nr + 0.587 * ng + 0.114 * nb;
          const brightnessDiff = Math.abs(
            currentBrightness - neighborBrightness
          );

          // If there's a significant brightness difference, this might be an outline
          if (brightnessDiff > 50) {
            significantDifferences++;
          }
        }
      }
    }

    // If this pixel is significantly different from most neighbors, treat as boundary
    return significantDifferences >= 3;
  }

  /**
   * Convert RGBA to ARGB format
   */
  private static rgbaToArgb(rgba: Uint8ClampedArray, argb: Uint32Array): void {
    for (let i = 0; i < argb.length; i++) {
      const ri = i * 4;
      const r = rgba[ri];
      const g = rgba[ri + 1];
      const b = rgba[ri + 2];
      const a = rgba[ri + 3];

      argb[i] = (a << 24) | (r << 16) | (g << 8) | b;
    }
  }

  /**
   * Convert ARGB to RGBA format
   */
  private static argbToRgba(argb: Uint32Array, rgba: Uint8ClampedArray): void {
    for (let i = 0; i < argb.length; i++) {
      const pixel = argb[i];
      const ri = i * 4;

      rgba[ri] = (pixel >> 16) & 0xff; // R
      rgba[ri + 1] = (pixel >> 8) & 0xff; // G
      rgba[ri + 2] = pixel & 0xff; // B
      rgba[ri + 3] = (pixel >> 24) & 0xff; // A
    }
  }

  /**
   * Convert hex color to ARGB integer
   */
  static hexToArgb(hex: string): number {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);

    return (0xff << 24) | (r << 16) | (g << 8) | b;
  }

  /**
   * Convert ARGB integer to hex color
   */
  static argbToHex(argb: number): string {
    const r = (argb >> 16) & 0xff;
    const g = (argb >> 8) & 0xff;
    const b = argb & 0xff;

    return (
      '#' +
      ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
    );
  }
}
