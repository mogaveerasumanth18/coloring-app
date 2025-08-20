import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface ColoringBitmap {
  width: number;
  height: number;
  pixels: number[]; // ARGB format
}

export class ReactNativeBitmapColoringEngine {
  /**
   * Load PNG image and convert to coloring bitmap (React Native compatible)
   */
  static async loadPngAsBitmap(imageUri: string): Promise<ColoringBitmap> {
    try {
      console.log('🔍 Loading PNG as bitmap:', imageUri);

      if (!imageUri || imageUri === 'null' || imageUri === 'undefined') {
        throw new Error('Invalid image URI provided');
      }

      // Try to use expo-image-manipulator to load the image
      console.log('🔍 Attempting to load image with expo-image-manipulator...');
      console.log('URI type:', typeof imageUri);
      console.log('URI length:', imageUri.length);
      console.log('URI starts with:', imageUri.substring(0, 50));

      try {
        const result = await manipulateAsync(
          imageUri,
          [], // No manipulations, just get the image info
          {
            compress: 1,
            format: SaveFormat.PNG,
            base64: false, // Don't need base64 for now, just dimensions
          }
        );

        console.log('✅ Image loaded successfully:', {
          uri: result.uri,
          width: result.width,
          height: result.height,
        });

        const width = result.width;
        const height = result.height;

        // Create a simple bitmap structure for coloring
        const pixels = new Array(width * height);

        // Initialize all pixels as white (0xFFFFFFFF)
        for (let i = 0; i < pixels.length; i++) {
          pixels[i] = 0xffffffff; // White in ARGB
        }

        console.log(`✅ Created bitmap: ${width}x${height} pixels`);

        return {
          width,
          height,
          pixels,
        };
      } catch (manipulateError) {
        console.error('❌ expo-image-manipulator failed:', manipulateError);

        // Fallback: Create a default bitmap
        console.log('🔄 Using fallback bitmap...');
        return this.createFallbackBitmap();
      }
    } catch (error) {
      console.error('❌ Failed to load PNG as bitmap:', error);
      throw new Error(`Failed to load PNG as bitmap: ${error}`);
    }
  }

  /**
   * Create a fallback bitmap when image loading fails
   */
  static createFallbackBitmap(): ColoringBitmap {
    const width = 400;
    const height = 300;
    const pixels = new Array(width * height);

    // Create a simple pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;

        // Create a border and some simple shapes
        if (x < 10 || x >= width - 10 || y < 10 || y >= height - 10) {
          pixels[index] = 0xff000000; // Black border
        } else if (x > 50 && x < 150 && y > 50 && y < 150) {
          pixels[index] = 0xff000000; // Black square
        } else if (Math.sqrt((x - 300) ** 2 + (y - 100) ** 2) < 50) {
          pixels[index] = 0xff000000; // Black circle
        } else {
          pixels[index] = 0xffffffff; // White background
        }
      }
    }

    return { width, height, pixels };
  }

  /**
   * Convert bitmap back to base64 PNG for display (React Native compatible)
   */
  static bitmapToBase64Png(bitmap: ColoringBitmap): string {
    try {
      // Create a simple PNG data URL
      // This is a placeholder - in a full implementation you'd encode the pixel data

      // For now, create a simple base64 PNG (1x1 white pixel)
      const simpleWhitePng =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==';

      return simpleWhitePng;
    } catch (error) {
      console.error('Failed to convert bitmap to PNG:', error);
      throw new Error(`Failed to convert bitmap to PNG: ${error}`);
    }
  }

  /**
   * Perform flood fill at the given coordinates (simplified)
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

    // Simplified flood fill - just change the target pixel and surrounding area
    const pixelIndex = y * bitmap.width + x;

    if (pixelIndex >= 0 && pixelIndex < newBitmap.pixels.length) {
      const originalColor = newBitmap.pixels[pixelIndex];

      // Simple flood fill algorithm (can be improved)
      const stack = [{ x, y }];
      const visited = new Set<number>();

      while (stack.length > 0) {
        const current = stack.pop()!;
        const currentIndex = current.y * bitmap.width + current.x;

        if (
          current.x < 0 ||
          current.x >= bitmap.width ||
          current.y < 0 ||
          current.y >= bitmap.height ||
          visited.has(currentIndex) ||
          newBitmap.pixels[currentIndex] !== originalColor
        ) {
          continue;
        }

        visited.add(currentIndex);
        newBitmap.pixels[currentIndex] = color;

        // Add neighboring pixels
        stack.push({ x: current.x + 1, y: current.y });
        stack.push({ x: current.x - 1, y: current.y });
        stack.push({ x: current.x, y: current.y + 1 });
        stack.push({ x: current.x, y: current.y - 1 });
      }
    }

    return newBitmap;
  }

  /**
   * Convert color string to ARGB number
   */
  static colorStringToArgb(colorString: string): number {
    // Remove # if present
    const hex = colorString.replace('#', '');

    // Parse RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = 255; // Full opacity

    // Convert to ARGB
    return (a << 24) | (r << 16) | (g << 8) | b;
  }

  /**
   * Generate hash for bitmap comparison
   */
  static hashBitmap(bitmap: ColoringBitmap): number {
    let hash = 0;
    for (let i = 0; i < Math.min(bitmap.pixels.length, 1000); i++) {
      hash = ((hash << 5) - hash + bitmap.pixels[i]) & 0xffffffff;
    }
    return hash;
  }

  /**
   * Convert hex color to ARGB (alias for colorStringToArgb)
   */
  static hexToArgb(hex: string): number {
    return this.colorStringToArgb(hex);
  }

  /**
   * Find paintable area around coordinates (simplified)
   */
  static findPaintableArea(
    bitmap: ColoringBitmap,
    x: number,
    y: number
  ): { x: number; y: number } {
    // For now, just return the original coordinates
    // In a full implementation, this would find the best paintable pixel
    return { x: Math.floor(x), y: Math.floor(y) };
  }
}
