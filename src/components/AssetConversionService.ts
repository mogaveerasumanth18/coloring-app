import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Asset Conversion Utility
 * Converts SVG assets to bitmap format following niccokunzmann/coloring-book approach
 *
 * This utility helps transition from SVG-based templates to bitmap-based templates
 * for better performance with complex line art.
 */

export interface BitmapTemplate {
  id: string;
  name: string;
  description: string;
  originalSvgPath?: string;
  bitmapUri: string;
  originalSize: { width: number; height: number };
  fileSize: number;
  createdAt: string;
}

export class AssetConversionService {
  private static readonly BITMAP_CACHE_DIR = `${FileSystem.documentDirectory}bitmap_assets/`;

  // Standard size following niccokunzmann/coloring-book (600x480)
  private static readonly STANDARD_SIZE = { width: 600, height: 480 };

  /**
   * Initialize the bitmap cache directory
   */
  static async initializeCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.BITMAP_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.BITMAP_CACHE_DIR, {
          intermediates: true,
        });
        console.log('Bitmap cache directory created:', this.BITMAP_CACHE_DIR);
      }
    } catch (error) {
      console.error('Failed to initialize bitmap cache:', error);
    }
  }

  /**
   * Convert a single SVG file to bitmap
   */
  static async convertSvgToBitmap(
    svgContent: string,
    templateId: string,
    options: {
      size?: { width: number; height: number };
      quality?: number;
      backgroundColor?: string;
    } = {}
  ): Promise<BitmapTemplate | null> {
    try {
      await this.initializeCache();

      const {
        size = this.STANDARD_SIZE,
        quality = 0.9,
        backgroundColor = 'white',
      } = options;

      // Ensure SVG has proper background for line art
      const processedSvg = this.processSvgForLineArt(
        svgContent,
        size,
        backgroundColor
      );

      // Create data URI
      const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(processedSvg)}`;

      // Convert to PNG using expo-image-manipulator
      const result = await ImageManipulator.manipulateAsync(
        svgDataUri,
        [{ resize: size }],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.PNG,
          base64: false,
        }
      );

      // Save to cache directory
      const fileName = `${templateId}_${size.width}x${size.height}.png`;
      const cachedUri = `${this.BITMAP_CACHE_DIR}${fileName}`;

      await FileSystem.copyAsync({
        from: result.uri,
        to: cachedUri,
      });

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(cachedUri);

      const template: BitmapTemplate = {
        id: templateId,
        name: templateId
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        description: `Bitmap template converted from SVG (${size.width}×${size.height}px)`,
        bitmapUri: cachedUri,
        originalSize: size,
        fileSize: fileInfo.size || 0,
        createdAt: new Date().toISOString(),
      };

      console.log(
        `✅ Converted ${templateId} to bitmap: ${Math.round(fileInfo.size! / 1024)}KB`
      );
      return template;
    } catch (error) {
      console.error(`❌ Failed to convert ${templateId}:`, error);
      return null;
    }
  }

  /**
   * Convert all SVG assets in your assets folder to bitmap format
   */
  static async convertAssetsToBitmaps(): Promise<BitmapTemplate[]> {
    const convertedTemplates: BitmapTemplate[] = [];

    // Define your SVG assets (from your assets folder)
    const svgAssets = [
      {
        id: 'bola-basket-basketball',
        path: require('../assets/bola-basket-basketball.svg'),
        name: 'Basketball',
        description: 'Sports basketball with lines for coloring',
      },
      {
        id: 'cel-cake-wedding',
        path: require('../assets/cel-cake-wedding.svg'),
        name: 'Wedding Cake',
        description: 'Beautiful tiered wedding cake',
      },
      {
        id: 'clo-polo',
        path: require('../assets/clo-polo.svg'),
        name: 'Polo Shirt',
        description: 'Classic polo shirt outline',
      },
      {
        id: 'hat-chef',
        path: require('../assets/hat-chef.svg'),
        name: 'Chef Hat',
        description: "Traditional chef's toque hat",
      },
      {
        id: 'water-container',
        path: require('../assets/water-container.svg'),
        name: 'Water Bottle',
        description: 'Water container with wave patterns',
      },
    ];

    console.log(
      `🔄 Converting ${svgAssets.length} SVG assets to bitmap format...`
    );

    for (const asset of svgAssets) {
      try {
        // Read SVG content (this is a simplified approach)
        // In practice, you'd read the actual SVG file content
        const svgContent = await this.loadSvgFromAsset(asset.id);

        if (svgContent) {
          const template = await this.convertSvgToBitmap(svgContent, asset.id, {
            size: this.STANDARD_SIZE,
            quality: 0.9,
            backgroundColor: 'white',
          });

          if (template) {
            template.name = asset.name;
            template.description = asset.description;
            convertedTemplates.push(template);
          }
        }
      } catch (error) {
        console.error(`Failed to process asset ${asset.id}:`, error);
      }
    }

    // Save conversion manifest
    await this.saveConversionManifest(convertedTemplates);

    console.log(
      `✅ Successfully converted ${convertedTemplates.length} templates to bitmap format`
    );
    return convertedTemplates;
  }

  /**
   * Process SVG content for optimal line art bitmap conversion
   */
  private static processSvgForLineArt(
    svgContent: string,
    size: { width: number; height: number },
    backgroundColor: string
  ): string {
    // Ensure SVG has proper dimensions and background
    let processedSvg = svgContent;

    // Add white background if not present (essential for line art)
    if (
      !processedSvg.includes('<rect') &&
      !processedSvg.includes('fill="white"')
    ) {
      const backgroundRect = `<rect width="100%" height="100%" fill="${backgroundColor}"/>`;
      processedSvg = processedSvg.replace(
        /(<svg[^>]*>)/i,
        `$1${backgroundRect}`
      );
    }

    // Ensure proper viewBox and dimensions
    if (!processedSvg.includes('viewBox')) {
      processedSvg = processedSvg.replace(
        /<svg([^>]*)>/i,
        `<svg$1 viewBox="0 0 ${size.width} ${size.height}">`
      );
    }

    // Optimize stroke width for bitmap conversion (prevent thin lines from disappearing)
    processedSvg = processedSvg.replace(
      /stroke-width="([0-9]*\.?[0-9]+)"/gi,
      (match, width) => {
        const numWidth = parseFloat(width);
        const optimizedWidth = Math.max(numWidth, 2); // Ensure minimum 2px stroke
        return `stroke-width="${optimizedWidth}"`;
      }
    );

    // Ensure black strokes for line art
    processedSvg = processedSvg.replace(/stroke="[^"]*"/gi, 'stroke="#000000"');

    return processedSvg;
  }

  /**
   * Load SVG content from asset (placeholder implementation)
   */
  private static async loadSvgFromAsset(
    assetId: string
  ): Promise<string | null> {
    // This is a placeholder - in practice you'd load actual SVG file content
    // For now, return sample SVGs based on your existing assets

    const sampleSvgs: Record<string, string> = {
      'bola-basket-basketball': `<svg width="600" height="480" viewBox="0 0 600 480" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="480" fill="white"/>
        <circle cx="300" cy="240" r="120" fill="none" stroke="#000000" stroke-width="4"/>
        <path d="M180,240 Q300,120 420,240" fill="none" stroke="#000000" stroke-width="3"/>
        <path d="M180,240 Q300,360 420,240" fill="none" stroke="#000000" stroke-width="3"/>
        <line x1="300" y1="120" x2="300" y2="360" stroke="#000000" stroke-width="3"/>
        <line x1="180" y1="240" x2="420" y2="240" stroke="#000000" stroke-width="3"/>
      </svg>`,

      'cel-cake-wedding': `<svg width="600" height="480" viewBox="0 0 600 480" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="480" fill="white"/>
        <!-- Cake tiers -->
        <rect x="150" y="350" width="300" height="100" fill="none" stroke="#000000" stroke-width="3"/>
        <rect x="200" y="280" width="200" height="80" fill="none" stroke="#000000" stroke-width="3"/>
        <rect x="225" y="220" width="150" height="70" fill="none" stroke="#000000" stroke-width="3"/>
        <!-- Decorations -->
        <circle cx="300" cy="200" r="15" fill="none" stroke="#000000" stroke-width="2"/>
        <path d="M285,180 Q300,160 315,180" fill="none" stroke="#000000" stroke-width="2"/>
        <rect x="170" y="370" width="20" height="20" fill="none" stroke="#000000" stroke-width="2"/>
        <rect x="220" y="370" width="20" height="20" fill="none" stroke="#000000" stroke-width="2"/>
        <rect x="360" y="370" width="20" height="20" fill="none" stroke="#000000" stroke-width="2"/>
        <rect x="410" y="370" width="20" height="20" fill="none" stroke="#000000" stroke-width="2"/>
      </svg>`,

      'clo-polo': `<svg width="600" height="480" viewBox="0 0 600 480" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="480" fill="white"/>
        <!-- Shirt outline -->
        <path d="M200,120 L200,80 L400,80 L400,120 L360,160 L360,420 L240,420 L240,160 L200,120 Z" fill="none" stroke="#000000" stroke-width="3"/>
        <!-- Sleeves -->
        <path d="M200,120 L160,140 L160,180 L200,160" fill="none" stroke="#000000" stroke-width="3"/>
        <path d="M400,120 L440,140 L440,180 L400,160" fill="none" stroke="#000000" stroke-width="3"/>
        <!-- Collar -->
        <rect x="280" y="120" width="40" height="30" fill="none" stroke="#000000" stroke-width="2"/>
        <!-- Buttons -->
        <circle cx="300" cy="140" r="3" fill="#000000"/>
        <circle cx="300" cy="160" r="3" fill="#000000"/>
        <!-- Design lines -->
        <line x1="260" y1="200" x2="340" y2="200" stroke="#000000" stroke-width="2"/>
        <line x1="260" y1="240" x2="340" y2="240" stroke="#000000" stroke-width="2"/>
      </svg>`,

      'hat-chef': `<svg width="600" height="480" viewBox="0 0 600 480" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="480" fill="white"/>
        <!-- Chef hat -->
        <path d="M300,80 C340,80 380,90 420,110 C460,130 480,160 470,200 C460,240 440,260 420,280 L380,280 L380,320 L220,320 L220,280 L180,280 C160,260 140,240 130,200 C120,160 140,130 180,110 C220,90 260,80 300,80 Z" fill="none" stroke="#000000" stroke-width="3"/>
        <!-- Hat band -->
        <rect x="200" y="320" width="200" height="40" fill="none" stroke="#000000" stroke-width="3"/>
        <line x1="210" y1="330" x2="390" y2="330" stroke="#000000" stroke-width="2"/>
        <line x1="210" y1="340" x2="390" y2="340" stroke="#000000" stroke-width="2"/>
        <line x1="210" y1="350" x2="390" y2="350" stroke="#000000" stroke-width="2"/>
        <!-- Decorative puffs -->
        <circle cx="280" cy="140" r="15" fill="none" stroke="#000000" stroke-width="2"/>
        <circle cx="320" cy="120" r="10" fill="none" stroke="#000000" stroke-width="2"/>
        <circle cx="360" cy="160" r="10" fill="none" stroke="#000000" stroke-width="2"/>
        <circle cx="240" cy="180" r="10" fill="none" stroke="#000000" stroke-width="2"/>
      </svg>`,

      'water-container': `<svg width="600" height="480" viewBox="0 0 600 480" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="480" fill="white"/>
        <!-- Bottle outline -->
        <path d="M240,80 L360,80 L350,420 L250,420 L240,80 Z" fill="none" stroke="#000000" stroke-width="4"/>
        <!-- Bottle cap -->
        <rect x="220" y="40" width="160" height="50" fill="none" stroke="#000000" stroke-width="3"/>
        <line x1="240" y1="55" x2="360" y2="55" stroke="#000000" stroke-width="2"/>
        <!-- Water waves -->
        <path d="M250,140 Q300,160 350,140" fill="none" stroke="#000000" stroke-width="2"/>
        <path d="M250,180 Q300,200 350,180" fill="none" stroke="#000000" stroke-width="2"/>
        <path d="M250,220 Q300,240 350,220" fill="none" stroke="#000000" stroke-width="2"/>
        <path d="M250,260 Q300,280 350,260" fill="none" stroke="#000000" stroke-width="2"/>
        <!-- Bubbles -->
        <circle cx="280" cy="120" r="4" fill="none" stroke="#000000" stroke-width="2"/>
        <circle cx="320" cy="130" r="3" fill="none" stroke="#000000" stroke-width="2"/>
        <circle cx="290" cy="200" r="5" fill="none" stroke="#000000" stroke-width="2"/>
        <circle cx="330" cy="250" r="3" fill="none" stroke="#000000" stroke-width="2"/>
      </svg>`,
    };

    return sampleSvgs[assetId] || null;
  }

  /**
   * Save conversion manifest for tracking converted templates
   */
  private static async saveConversionManifest(
    templates: BitmapTemplate[]
  ): Promise<void> {
    try {
      const manifest = {
        version: '1.0.0',
        convertedAt: new Date().toISOString(),
        standardSize: this.STANDARD_SIZE,
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          bitmapUri: t.bitmapUri,
          fileSize: t.fileSize,
          createdAt: t.createdAt,
        })),
        totalSize: templates.reduce((sum, t) => sum + t.fileSize, 0),
        count: templates.length,
      };

      const manifestPath = `${this.BITMAP_CACHE_DIR}conversion_manifest.json`;
      await FileSystem.writeAsStringAsync(
        manifestPath,
        JSON.stringify(manifest, null, 2)
      );

      console.log('📄 Conversion manifest saved:', manifestPath);
    } catch (error) {
      console.error('Failed to save conversion manifest:', error);
    }
  }

  /**
   * Load previously converted bitmap templates
   */
  static async loadConvertedTemplates(): Promise<BitmapTemplate[]> {
    try {
      const manifestPath = `${this.BITMAP_CACHE_DIR}conversion_manifest.json`;
      const manifestInfo = await FileSystem.getInfoAsync(manifestPath);

      if (!manifestInfo.exists) {
        console.log(
          'No conversion manifest found, running initial conversion...'
        );
        return await this.convertAssetsToBitmaps();
      }

      const manifestContent = await FileSystem.readAsStringAsync(manifestPath);
      const manifest = JSON.parse(manifestContent);

      // Verify all bitmap files still exist
      const validTemplates: BitmapTemplate[] = [];

      for (const template of manifest.templates) {
        const bitmapInfo = await FileSystem.getInfoAsync(template.bitmapUri);
        if (bitmapInfo.exists) {
          validTemplates.push({
            id: template.id,
            name: template.name,
            description: `Bitmap template (${this.STANDARD_SIZE.width}×${this.STANDARD_SIZE.height}px)`,
            bitmapUri: template.bitmapUri,
            originalSize: this.STANDARD_SIZE,
            fileSize: bitmapInfo.size || 0,
            createdAt: template.createdAt,
          });
        }
      }

      console.log(
        `📁 Loaded ${validTemplates.length} converted bitmap templates`
      );
      return validTemplates;
    } catch (error) {
      console.error('Failed to load converted templates:', error);
      return [];
    }
  }

  /**
   * Clear bitmap cache
   */
  static async clearCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.BITMAP_CACHE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.BITMAP_CACHE_DIR);
        console.log('🗑️ Bitmap cache cleared');
      }
    } catch (error) {
      console.error('Failed to clear bitmap cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    cacheDir: string;
  }> {
    try {
      await this.initializeCache();
      const files = await FileSystem.readDirectoryAsync(this.BITMAP_CACHE_DIR);

      let totalSize = 0;
      for (const file of files) {
        const filePath = `${this.BITMAP_CACHE_DIR}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        totalSize += fileInfo.size || 0;
      }

      return {
        totalFiles: files.length,
        totalSize,
        cacheDir: this.BITMAP_CACHE_DIR,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        cacheDir: this.BITMAP_CACHE_DIR,
      };
    }
  }
}

export default AssetConversionService;
