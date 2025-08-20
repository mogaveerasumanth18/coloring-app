import { Asset } from 'expo-asset';
import { Image } from 'react-native';

export interface PngTemplate {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'objects' | 'vehicles' | 'animals' | 'buildings';
  width: number;
  height: number;
  pngUri: string;
  thumbnailUri: string;
  description?: string;
  tags?: string[];
}

export class PngTemplateService {
  private static templates: PngTemplate[] = [];
  private static initialized = false;

  // PNG template definitions based on coloring-book repo structure
  private static readonly TEMPLATE_DEFINITIONS = [
    {
      id: 'outline001_balloons',
      title: 'Colorful Balloons',
      difficulty: 'easy' as const,
      category: 'objects' as const,
      description: 'Fun balloons floating in the sky',
      tags: ['party', 'celebration', 'simple'],
    },
    {
      id: 'outline002_spaceship',
      title: 'Space Adventure',
      difficulty: 'medium' as const,
      category: 'vehicles' as const,
      description: 'Rocket ship exploring the cosmos',
      tags: ['space', 'adventure', 'science'],
    },
    {
      id: 'outline003_horses',
      title: 'Galloping Horses',
      difficulty: 'hard' as const,
      category: 'animals' as const,
      description: 'Beautiful horses running free',
      tags: ['animals', 'nature', 'detailed'],
    },
    {
      id: 'outline004_castle',
      title: 'Medieval Castle',
      difficulty: 'hard' as const,
      category: 'buildings' as const,
      description: 'Majestic castle with towers',
      tags: ['medieval', 'architecture', 'fantasy'],
    },
    // Additional templates from the reference repo
    {
      id: 'outline005_house',
      title: 'Cozy House',
      difficulty: 'easy' as const,
      category: 'buildings' as const,
      description: 'A simple family home',
      tags: ['home', 'simple', 'family'],
    },
    {
      id: 'outline006_dino',
      title: 'Friendly Dinosaur',
      difficulty: 'medium' as const,
      category: 'animals' as const,
      description: 'Cute dinosaur for kids',
      tags: ['dinosaur', 'prehistoric', 'kids'],
    },
    {
      id: 'outline007_flowers',
      title: 'Garden Flowers',
      difficulty: 'easy' as const,
      category: 'objects' as const,
      description: 'Beautiful flower arrangement',
      tags: ['flowers', 'nature', 'garden'],
    },
    {
      id: 'outline008_sealife',
      title: 'Ocean Life',
      difficulty: 'medium' as const,
      category: 'animals' as const,
      description: 'Fish and sea creatures',
      tags: ['ocean', 'fish', 'underwater'],
    },
    {
      id: 'outline009_zoo',
      title: 'Zoo Animals',
      difficulty: 'medium' as const,
      category: 'animals' as const,
      description: 'Various zoo animals',
      tags: ['zoo', 'animals', 'variety'],
    },
    {
      id: 'outline010_roadrunner',
      title: 'Speedy Bird',
      difficulty: 'medium' as const,
      category: 'animals' as const,
      description: 'Fast running bird',
      tags: ['bird', 'speed', 'desert'],
    },
    {
      id: 'outline011_plane',
      title: 'Airplane',
      difficulty: 'easy' as const,
      category: 'vehicles' as const,
      description: 'Flying airplane',
      tags: ['airplane', 'flight', 'travel'],
    },
    {
      id: 'outline012_birthday',
      title: 'Birthday Party',
      difficulty: 'medium' as const,
      category: 'objects' as const,
      description: 'Birthday celebration scene',
      tags: ['birthday', 'party', 'celebration'],
    },
    {
      id: 'outline013_18wheeler',
      title: 'Big Truck',
      difficulty: 'hard' as const,
      category: 'vehicles' as const,
      description: 'Large semi truck',
      tags: ['truck', 'transport', 'detailed'],
    },
    {
      id: 'outline014_motorbike',
      title: 'Motorcycle',
      difficulty: 'medium' as const,
      category: 'vehicles' as const,
      description: 'Cool motorcycle',
      tags: ['motorcycle', 'ride', 'adventure'],
    },
    {
      id: 'outline015_f15eagle',
      title: 'Fighter Jet',
      difficulty: 'hard' as const,
      category: 'vehicles' as const,
      description: 'Military fighter aircraft',
      tags: ['jet', 'military', 'aircraft'],
    },
    {
      id: 'outline016_beagle',
      title: 'Cute Dog',
      difficulty: 'easy' as const,
      category: 'animals' as const,
      description: 'Adorable pet dog',
      tags: ['dog', 'pet', 'cute'],
    },
    {
      id: 'outline017_butterfly',
      title: 'Beautiful Butterfly',
      difficulty: 'medium' as const,
      category: 'animals' as const,
      description: 'Elegant butterfly with wings',
      tags: ['butterfly', 'insect', 'nature'],
    },
    {
      id: 'outline018_snail',
      title: 'Garden Snail',
      difficulty: 'easy' as const,
      category: 'animals' as const,
      description: 'Slow and steady snail',
      tags: ['snail', 'garden', 'slow'],
    },
    {
      id: 'outline019_helicopter',
      title: 'Helicopter',
      difficulty: 'medium' as const,
      category: 'vehicles' as const,
      description: 'Flying helicopter',
      tags: ['helicopter', 'aviation', 'rescue'],
    },
    {
      id: 'outline020_bee',
      title: 'Busy Bee',
      difficulty: 'easy' as const,
      category: 'animals' as const,
      description: 'Hardworking honey bee',
      tags: ['bee', 'honey', 'worker'],
    },
    {
      id: 'outline021_spider',
      title: 'Spider Web',
      difficulty: 'medium' as const,
      category: 'animals' as const,
      description: 'Spider in its web',
      tags: ['spider', 'web', 'creepy'],
    },
    {
      id: 'outline022_medeival_city',
      title: 'Medieval City',
      difficulty: 'hard' as const,
      category: 'buildings' as const,
      description: 'Ancient city with towers',
      tags: ['medieval', 'city', 'historical'],
    },
    {
      id: 'outline023_outer_space',
      title: 'Outer Space',
      difficulty: 'hard' as const,
      category: 'objects' as const,
      description: 'Planets and stars in space',
      tags: ['space', 'planets', 'astronomy'],
    },
    {
      id: 'outline024_world_map',
      title: 'World Map',
      difficulty: 'hard' as const,
      category: 'objects' as const,
      description: 'Map of the world continents',
      tags: ['geography', 'world', 'continents'],
    },
  ];

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('🎨 Initializing PNG Template Service...');

      // Load all templates
      const loadPromises = this.TEMPLATE_DEFINITIONS.map(async (def) => {
        try {
          // Try to load from assets/zebra-paint first, then fallback to mock
          const pngUri = await this.loadTemplateAsset(def.id);
          const thumbnailUri = await this.createThumbnail(pngUri);

          // Get image dimensions
          const { width, height } = await this.getImageDimensions(pngUri);

          const template: PngTemplate = {
            ...def,
            width,
            height,
            pngUri,
            thumbnailUri,
          };

          return template;
        } catch (error) {
          console.warn(`⚠️ Failed to load template ${def.id}:`, error);
          // Return a mock template to keep the app working
          return this.createMockTemplate(def);
        }
      });

      this.templates = await Promise.all(loadPromises);
      this.initialized = true;

      console.log(`✅ Loaded ${this.templates.length} PNG templates`);
    } catch (error) {
      console.error('❌ Failed to initialize PNG Template Service:', error);
      throw error;
    }
  }

  // Static asset mapping for PNG templates
  private static templateAssets: { [key: string]: any } = {
    // Real PNG templates from coloring-book repository
    outline001_balloons: require('../assets/templates/outline001_balloons.png'),
    outline002_spaceship: require('../assets/templates/outline002_spaceship.png'),
    outline003_horses: require('../assets/templates/outline003_horses.png'),
    outline004_castle: require('../assets/templates/outline004_castle.png'),
    outline005_house: require('../assets/templates/outline005_house.png'),
    outline006_dino: require('../assets/templates/outline006_dino.png'),
    outline007_flowers: require('../assets/templates/outline007_flowers.png'),
    outline008_sealife: require('../assets/templates/outline008_sealife.png'),
    outline009_zoo: require('../assets/templates/outline009_zoo.png'),
    outline010_roadrunner: require('../assets/templates/outline010_roadrunner.png'),
    outline011_plane: require('../assets/templates/outline011_plane.png'),
    outline012_birthday: require('../assets/templates/outline012_birthday.png'),
    outline013_18wheeler: require('../assets/templates/outline013_18wheeler.png'),
    outline014_motorbike: require('../assets/templates/outline014_motorbike.png'),
    outline015_f15eagle: require('../assets/templates/outline015_f15eagle.png'),
    outline016_beagle: require('../assets/templates/outline016_beagle.png'),
    outline017_butterfly: require('../assets/templates/outline017_butterfly.png'),
    outline018_snail: require('../assets/templates/outline018_snail.png'),
    outline019_helicopter: require('../assets/templates/outline019_helicopter.png'),
    outline020_bee: require('../assets/templates/outline020_bee.png'),
    outline021_spider: require('../assets/templates/outline021_spider.png'),
    outline022_medeival_city: require('../assets/templates/outline022_medeival_city.png'),
    outline023_outer_space: require('../assets/templates/outline023_outer_space.png'),
    outline024_world_map: require('../assets/templates/outline024_world_map.png'),
  };

  private static async loadTemplateAsset(templateId: string): Promise<string> {
    try {
      // Use static asset mapping
      const assetModule = this.templateAssets[templateId];
      if (assetModule) {
        console.log(`Loading template asset: ${templateId}`);
        const uri = await this.resolveAssetUri(templateId, assetModule);
        console.log(`✅ Asset loaded successfully: ${uri}`);
        return uri;
      } else {
        throw new Error(`No asset module found for ${templateId}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load template ${templateId}:`, error);

      // Final fallback: create a mock template
      console.warn(`Using mock template for ${templateId}`);
      return await this.generateMockPngTemplate(templateId);
    }
  }

  private static async resolveAssetUri(
    templateId: string,
    assetModule: any
  ): Promise<string> {
    try {
      const asset = Asset.fromModule(assetModule);
      console.log(`Asset.fromModule result:`, {
        uri: asset.uri,
        localUri: asset.localUri,
        downloaded: asset.downloaded,
        name: asset.name,
      });

      if (!asset.downloaded) {
        console.log(`Downloading asset ${templateId}...`);
        await asset.downloadAsync();
        console.log(`Downloaded asset ${templateId}:`, {
          uri: asset.uri,
          localUri: asset.localUri,
          downloaded: asset.downloaded,
        });
      }

      let uri = asset.localUri || asset.uri;
      if (uri && uri.startsWith('asset:/')) {
        uri = uri.replace('asset:/', 'asset://');
      }

      if (!uri) {
        try {
          const resolved = Image.resolveAssetSource(assetModule);
          if (resolved?.uri) {
            const ruri = resolved.uri;
            if (ruri.startsWith('file://') || ruri.startsWith('http')) {
              uri = ruri;
            }
          }
        } catch {}
      }

      if (!uri) throw new Error(`No URI available for asset ${templateId}`);
      return uri;
    } catch (e) {
      console.error(`resolveAssetUri failed for ${templateId}:`, e);
      throw e;
    }
  }

  private static async createThumbnail(
    pngUri: string,
    _size: number = 150
  ): Promise<string> {
    try {
      // For now, use the original image as thumbnail
      // In a production app, you'd want to create actual thumbnails
      return pngUri;
    } catch (error) {
      console.warn('Failed to create thumbnail:', error);
      return pngUri;
    }
  }

  private static async getImageDimensions(
    uri: string
  ): Promise<{ width: number; height: number }> {
    // In React Native, we need to use Image.getSize instead of web APIs
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => {
          resolve({ width, height });
        },
        (error) => {
          reject(new Error(`Failed to get image dimensions: ${error}`));
        }
      );
    });
  }

  private static async generateMockPngTemplate(
    templateId: string
  ): Promise<string> {
    // In React Native, we can't use Canvas APIs, so return a data URI for a simple image
    // This is a fallback that should rarely be used if assets are properly bundled
    console.warn(`Using fallback mock template for ${templateId}`);

    // Return a simple 1x1 transparent PNG as base64
    // This is just a fallback - the real templates should be loaded from assets
    const transparentPng =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
    return `data:image/png;base64,${transparentPng}`;
  }

  private static createMockTemplate(def: any): PngTemplate {
    const mockPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    return {
      ...def,
      width: 400,
      height: 320,
      pngUri: mockPng,
      thumbnailUri: mockPng,
    };
  }

  static async getAllTemplates(): Promise<PngTemplate[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return [...this.templates];
  }

  static async getTemplateById(id: string): Promise<PngTemplate | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.templates.find((t) => t.id === id) || null;
  }

  static async getTemplatesByCategory(
    category: string
  ): Promise<PngTemplate[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.templates.filter((t) => t.category === category);
  }

  static async getTemplatesByDifficulty(
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<PngTemplate[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.templates.filter((t) => t.difficulty === difficulty);
  }

  static async downloadTemplate(id: string): Promise<string> {
    console.log(`🔄 Downloading template: ${id}`);

    try {
      const template = await this.getTemplateById(id);
      if (!template) {
        console.error(`❌ Template ${id} not found in loaded templates`);
        throw new Error(`Template ${id} not found`);
      }

      console.log(`✅ Template found:`, {
        id: template.id,
        title: template.title,
        pngUri: template.pngUri,
        pngUriType: typeof template.pngUri,
        pngUriLength: template.pngUri?.length || 0,
      });

      // Validate the URI
      if (
        !template.pngUri ||
        template.pngUri === 'null' ||
        template.pngUri === 'undefined'
      ) {
        console.error(
          `❌ Invalid PNG URI for template ${id}:`,
          template.pngUri
        );
        throw new Error(
          `Template ${id} has invalid PNG URI: ${template.pngUri}`
        );
      }

      // Test URI format
      if (template.pngUri.startsWith('asset://')) {
        console.log(`📱 Using Android asset URI: ${template.pngUri}`);
      } else if (template.pngUri.startsWith('file://')) {
        console.log(`📁 Using file system URI: ${template.pngUri}`);
      } else if (template.pngUri.startsWith('http')) {
        console.log(`🌐 Using HTTP URI: ${template.pngUri}`);
      } else {
        console.log(`❓ Unknown URI format: ${template.pngUri}`);
      }

      console.log(
        `✅ Template ${id} ready for download with URI: ${template.pngUri}`
      );
      return template.pngUri;
    } catch (error) {
      console.error(`❌ Failed to download template ${id}:`, error);
      throw error;
    }
  }

  static getCategories(): string[] {
    return ['objects', 'vehicles', 'animals', 'buildings'];
  }

  static getDifficulties(): ('easy' | 'medium' | 'hard')[] {
    return ['easy', 'medium', 'hard'];
  }

  // Debug method to test asset loading
  static async testAssetLoading(): Promise<void> {
    try {
      console.log('=== PNG Asset Loading Test ===');

      // Test direct require
      const testAsset = this.templateAssets['outline001_balloons'];
      console.log('Direct require result:', testAsset);

      // Test Image.resolveAssetSource
      const resolved = Image.resolveAssetSource(testAsset);
      console.log('Resolved asset:', resolved);

      // Test Asset.fromModule
      const asset = Asset.fromModule(testAsset);
      console.log('Asset.fromModule result:', asset);

      if (!asset.downloaded) {
        await asset.downloadAsync();
      }

      console.log('Asset after download:', {
        downloaded: asset.downloaded,
        localUri: asset.localUri,
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });

      console.log('=== Test Complete ===');
    } catch (error) {
      console.error('Asset loading test failed:', error);
    }
  }
}
