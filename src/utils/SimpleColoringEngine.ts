import { ImageManipulator } from 'expo-image-manipulator';

export interface TouchPoint {
  x: number;
  y: number;
}

export interface BrushStroke {
  points: TouchPoint[];
  color: string;
  thickness: number;
}

export interface ColoringBitmap {
  width: number;
  height: number;
  pixels: Uint32Array;
}

export class SimpleColoringEngine {
  private static readonly BORDER_COLOR = 0xff000000; // Black
  private static readonly WHITE_COLOR = 0xffffffff; // White
  private static readonly COLOR_SEARCH_RADIUS = 8;

  // Convert hex color to ARGB format (Android format)
  static hexToArgb(hex: string): number {
    const color = hex.replace('#', '');
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);
    return (0xff << 24) | (r << 16) | (g << 8) | b;
  }

  // Convert ARGB back to hex
  static argbToHex(argb: number): string {
    const r = (argb >> 16) & 0xff;
    const g = (argb >> 8) & 0xff;
    const b = argb & 0xff;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // Create a bitmap from image URI (simplified approach)
  static async createBitmapFromUri(imageUri: string): Promise<ColoringBitmap> {
    try {
      console.log('🖼️ Creating bitmap from URI:', imageUri);

      // Get image info
      const imageInfo = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 400, height: 400 } }], // Resize for performance
        { format: ImageManipulator.SaveFormat.PNG }
      );

      // Create a mock bitmap with coloring template structure
      const width = 400;
      const height = 400;
      const pixels = new Uint32Array(width * height);

      // Fill with white background
      pixels.fill(this.WHITE_COLOR);

      // Create some mock black borders for coloring areas
      // In a real implementation, you'd decode the actual PNG pixels
      this.createMockColoringTemplate(pixels, width, height);

      console.log('✅ Bitmap created successfully');
      return { width, height, pixels };
    } catch (error) {
      console.error('❌ Failed to create bitmap:', error);
      throw error;
    }
  }

  // Create mock coloring template with borders
  private static createMockColoringTemplate(
    pixels: Uint32Array,
    width: number,
    height: number
  ): void {
    // Add border around the image
    for (let x = 0; x < width; x++) {
      pixels[0 * width + x] = this.BORDER_COLOR; // Top
      pixels[(height - 1) * width + x] = this.BORDER_COLOR; // Bottom
    }
    for (let y = 0; y < height; y++) {
      pixels[y * width + 0] = this.BORDER_COLOR; // Left
      pixels[y * width + (width - 1)] = this.BORDER_COLOR; // Right
    }

    // Add some internal shapes to color
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw a circle
    this.drawCircleOutline(pixels, width, height, centerX, centerY, 60);

    // Draw some rectangles
    this.drawRectangleOutline(
      pixels,
      width,
      height,
      centerX - 80,
      centerY - 80,
      50,
      50
    );
    this.drawRectangleOutline(
      pixels,
      width,
      height,
      centerX + 30,
      centerY - 80,
      50,
      50
    );

    // Draw a cross pattern
    this.drawLine(pixels, width, height, centerX, 50, centerX, height - 50);
    this.drawLine(pixels, width, height, 50, centerY, width - 50, centerY);
  }

  private static drawCircleOutline(
    pixels: Uint32Array,
    width: number,
    height: number,
    cx: number,
    cy: number,
    radius: number
  ): void {
    for (let angle = 0; angle < 360; angle += 2) {
      const x = Math.round(cx + radius * Math.cos((angle * Math.PI) / 180));
      const y = Math.round(cy + radius * Math.sin((angle * Math.PI) / 180));
      if (x >= 0 && x < width && y >= 0 && y < height) {
        pixels[y * width + x] = this.BORDER_COLOR;
      }
    }
  }

  private static drawRectangleOutline(
    pixels: Uint32Array,
    width: number,
    height: number,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    // Draw rectangle outline
    for (let i = 0; i < w; i++) {
      if (x + i < width && y < height && y >= 0)
        pixels[y * width + (x + i)] = this.BORDER_COLOR; // Top
      if (x + i < width && y + h < height && y + h >= 0)
        pixels[(y + h) * width + (x + i)] = this.BORDER_COLOR; // Bottom
    }
    for (let i = 0; i < h; i++) {
      if (x < width && x >= 0 && y + i < height)
        pixels[(y + i) * width + x] = this.BORDER_COLOR; // Left
      if (x + w < width && x + w >= 0 && y + i < height)
        pixels[(y + i) * width + (x + w)] = this.BORDER_COLOR; // Right
    }
  }

  private static drawLine(
    pixels: Uint32Array,
    width: number,
    height: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = Math.round(x1);
    let y = Math.round(y1);

    while (true) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        pixels[y * width + x] = this.BORDER_COLOR;
      }

      if (x === Math.round(x2) && y === Math.round(y2)) break;

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
  }

  // Flood fill algorithm - exactly like the original Java implementation
  static floodFill(
    bitmap: ColoringBitmap,
    startX: number,
    startY: number,
    fillColor: number
  ): ColoringBitmap {
    console.log('🎨 Starting flood fill:', {
      startX,
      startY,
      fillColor: this.argbToHex(fillColor),
    });

    const { width, height, pixels } = bitmap;
    const newPixels = new Uint32Array(pixels); // Copy pixels
    const queue: TouchPoint[] = [];

    // Start flood fill
    this.fillPixel(newPixels, width, height, startX, startY, fillColor, queue);

    // Process queue
    while (queue.length > 0) {
      const point = queue.shift()!;
      this.fillPixel(
        newPixels,
        width,
        height,
        point.x + 1,
        point.y,
        fillColor,
        queue
      );
      this.fillPixel(
        newPixels,
        width,
        height,
        point.x - 1,
        point.y,
        fillColor,
        queue
      );
      this.fillPixel(
        newPixels,
        width,
        height,
        point.x,
        point.y + 1,
        fillColor,
        queue
      );
      this.fillPixel(
        newPixels,
        width,
        height,
        point.x,
        point.y - 1,
        fillColor,
        queue
      );
    }

    console.log('✅ Flood fill completed');
    return { width, height, pixels: newPixels };
  }

  private static fillPixel(
    pixels: Uint32Array,
    width: number,
    height: number,
    x: number,
    y: number,
    fillColor: number,
    queue: TouchPoint[]
  ): void {
    // Check bounds
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }

    const index = y * width + x;
    const currentColor = pixels[index];

    // Don't fill if it's already the target color or it's a border
    if (currentColor === fillColor || currentColor === this.BORDER_COLOR) {
      return;
    }

    // Fill the pixel and add to queue
    pixels[index] = fillColor;
    queue.push({ x, y });
  }

  // Find better paintable area near touch point
  static findPaintableArea(
    bitmap: ColoringBitmap,
    touchX: number,
    touchY: number
  ): TouchPoint | null {
    const { width, height, pixels } = bitmap;

    // If the touched pixel is not a border, use it directly
    const touchIndex = touchY * width + touchX;
    if (
      touchIndex >= 0 &&
      touchIndex < pixels.length &&
      pixels[touchIndex] !== this.BORDER_COLOR
    ) {
      return { x: touchX, y: touchY };
    }

    // Search around the touch point for a paintable area
    for (let radius = 1; radius <= this.COLOR_SEARCH_RADIUS; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const newX = touchX + dx;
          const newY = touchY + dy;

          if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
            const index = newY * width + newX;
            if (pixels[index] !== this.BORDER_COLOR) {
              console.log('🎯 Found paintable area at:', { x: newX, y: newY });
              return { x: newX, y: newY };
            }
          }
        }
      }
    }

    return null; // No paintable area found
  }

  // Apply brush stroke
  static applyBrushStroke(
    bitmap: ColoringBitmap,
    stroke: BrushStroke
  ): ColoringBitmap {
    console.log('🖌️ Applying brush stroke:', {
      pointCount: stroke.points.length,
      color: stroke.color,
      thickness: stroke.thickness,
    });

    const { width, height, pixels } = bitmap;
    const newPixels = new Uint32Array(pixels);
    const fillColor = this.hexToArgb(stroke.color);
    const radius = Math.max(1, Math.floor(stroke.thickness / 2));

    for (const point of stroke.points) {
      // Draw filled circle at each point
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= radius) {
            const x = Math.floor(point.x) + dx;
            const y = Math.floor(point.y) + dy;

            if (x >= 0 && x < width && y >= 0 && y < height) {
              const index = y * width + x;
              // Don't paint over borders
              if (pixels[index] !== this.BORDER_COLOR) {
                newPixels[index] = fillColor;
              }
            }
          }
        }
      }
    }

    console.log('✅ Brush stroke applied');
    return { width, height, pixels: newPixels };
  }

  // Convert bitmap to base64 PNG for display
  static async bitmapToBase64(bitmap: ColoringBitmap): Promise<string> {
    try {
      // In a real implementation, you would convert the pixel array to actual PNG data
      // For now, we'll create a simple colored canvas using ImageManipulator

      // This is a simplified approach - create a small colored rectangle as placeholder
      const result = await ImageManipulator.manipulateAsync(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        [
          {
            resize: {
              width: bitmap.width,
              height: bitmap.height,
            },
          },
        ],
        {
          base64: true,
          format: ImageManipulator.SaveFormat.PNG,
        }
      );

      return result.base64 || '';
    } catch (error) {
      console.error('❌ Failed to convert bitmap to base64:', error);
      throw error;
    }
  }

  // Check if two bitmaps are different
  static areBitmapsDifferent(
    bitmap1: ColoringBitmap,
    bitmap2: ColoringBitmap
  ): boolean {
    if (bitmap1.width !== bitmap2.width || bitmap1.height !== bitmap2.height) {
      return true;
    }

    for (let i = 0; i < bitmap1.pixels.length; i++) {
      if (bitmap1.pixels[i] !== bitmap2.pixels[i]) {
        return true;
      }
    }

    return false;
  }

  // Generate simple hash for bitmap comparison
  static hashBitmap(bitmap: ColoringBitmap): number {
    let hash = 0;
    const step = Math.max(1, Math.floor(bitmap.pixels.length / 1000)); // Sample for performance

    for (let i = 0; i < bitmap.pixels.length; i += step) {
      hash = (hash * 31 + bitmap.pixels[i]) >>> 0;
    }

    return hash;
  }
}
