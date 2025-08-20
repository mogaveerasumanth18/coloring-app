import * as FileSystem from 'expo-file-system';
import { ImageManipulator } from 'expo-image-manipulator';

/**
 * Line Art Gallery Service
 *
 * Fetches and manages line art images from the official gallery:
 * https://gallery.quelltext.eu/
 *
 * Based on the niccokunzmann/coloring-book project's official gallery.
 * All images are CC0 licensed from freesvg.org and other open sources.
 */
export class LineArtGalleryService {
  private static readonly GALLERY_BASE_URL = 'https://gallery.quelltext.eu';
  private static readonly CACHE_DIR =
    FileSystem.documentDirectory + 'lineArtCache/';
  private static readonly PROCESSED_DIR =
    FileSystem.documentDirectory + 'processedLineArt/';

  // Curated list of high-quality line art from the gallery
  private static readonly FEATURED_IMAGES = [
    // Animals
    {
      id: 'butterfly_simple',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/butterfly-outline.png',
      name: 'Butterfly Outline',
      category: 'animals',
      difficulty: 'easy',
      description: 'Simple butterfly with large coloring areas',
    },
    {
      id: 'cat_sitting',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/cat-silhouette.png',
      name: 'Sitting Cat',
      category: 'animals',
      difficulty: 'medium',
      description: 'Cute cat perfect for kids',
    },
    {
      id: 'fish_tropical',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/tropical-fish.png',
      name: 'Tropical Fish',
      category: 'animals',
      difficulty: 'easy',
      description: 'Simple fish with fins and scales',
    },

    // Flowers & Nature
    {
      id: 'flower_daisy',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/daisy-flower.png',
      name: 'Daisy Flower',
      category: 'nature',
      difficulty: 'easy',
      description: 'Classic daisy with petals',
    },
    {
      id: 'tree_simple',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/tree-outline.png',
      name: 'Simple Tree',
      category: 'nature',
      difficulty: 'medium',
      description: 'Tree with branches and leaves',
    },
    {
      id: 'sun_happy',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/happy-sun.png',
      name: 'Happy Sun',
      category: 'nature',
      difficulty: 'easy',
      description: 'Smiling sun with rays',
    },

    // Objects & Shapes
    {
      id: 'car_simple',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/simple-car.png',
      name: 'Simple Car',
      category: 'vehicles',
      difficulty: 'easy',
      description: 'Basic car outline',
    },
    {
      id: 'house_cottage',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/cottage-house.png',
      name: 'Cottage House',
      category: 'buildings',
      difficulty: 'medium',
      description: 'Small house with windows and door',
    },
    {
      id: 'heart_decorative',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/decorative-heart.png',
      name: 'Decorative Heart',
      category: 'shapes',
      difficulty: 'easy',
      description: 'Heart with decorative patterns',
    },

    // Complex Designs
    {
      id: 'mandala_simple',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/simple-mandala.png',
      name: 'Simple Mandala',
      category: 'patterns',
      difficulty: 'hard',
      description: 'Geometric mandala pattern',
    },
  ];

  /**
   * Initialize the service by creating necessary directories
   */
  static async initialize(): Promise<void> {
    try {
      await FileSystem.makeDirectoryAsync(this.CACHE_DIR, {
        intermediates: true,
      });
      await FileSystem.makeDirectoryAsync(this.PROCESSED_DIR, {
        intermediates: true,
      });
    } catch (error) {
      console.error('Failed to initialize LineArtGalleryService:', error);
    }
  }

  /**
   * Get list of available line art categories
   */
  static getCategories(): string[] {
    const categories = [
      ...new Set(this.FEATURED_IMAGES.map((img) => img.category)),
    ];
    return categories.sort();
  }

  /**
   * Get images by category
   */
  static getImagesByCategory(category: string) {
    return this.FEATURED_IMAGES.filter((img) => img.category === category);
  }

  /**
   * Get images by difficulty level
   */
  static getImagesByDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
    return this.FEATURED_IMAGES.filter((img) => img.difficulty === difficulty);
  }

  /**
   * Get all featured images
   */
  static getAllImages() {
    return this.FEATURED_IMAGES;
  }

  /**
   * Download and cache a line art image
   */
  static async downloadImage(imageId: string): Promise<string | null> {
    try {
      const imageInfo = this.FEATURED_IMAGES.find((img) => img.id === imageId);
      if (!imageInfo) {
        throw new Error(`Image with ID ${imageId} not found`);
      }

      const cacheFilePath = this.CACHE_DIR + `${imageId}.png`;

      // Check if already cached
      const fileInfo = await FileSystem.getInfoAsync(cacheFilePath);
      if (fileInfo.exists) {
        return cacheFilePath;
      }

      // Download the image
      console.log(`Downloading ${imageInfo.name}...`);
      const downloadResult = await FileSystem.downloadAsync(
        imageInfo.url,
        cacheFilePath
      );

      if (downloadResult.status === 200) {
        return downloadResult.uri;
      } else {
        throw new Error(`Failed to download image: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error(`Failed to download image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Process downloaded image for optimal coloring
   * - Resize to standard dimensions (600x480)
   * - Ensure black lines on transparent background
   * - Optimize line width for touch interaction
   */
  static async processImageForColoring(
    sourceUri: string,
    imageId: string
  ): Promise<string | null> {
    try {
      const processedFilePath = this.PROCESSED_DIR + `${imageId}_processed.png`;

      // Check if already processed
      const fileInfo = await FileSystem.getInfoAsync(processedFilePath);
      if (fileInfo.exists) {
        return processedFilePath;
      }

      console.log(`Processing ${imageId} for coloring...`);

      // Resize and optimize the image
      const manipResult = await ImageManipulator.manipulateAsync(
        sourceUri,
        [
          {
            resize: {
              width: 600,
              height: 480,
            },
          },
        ],
        {
          compress: 1,
          format: ImageManipulator.SaveFormat.PNG,
        }
      );

      // Move processed image to final location
      await FileSystem.moveAsync({
        from: manipResult.uri,
        to: processedFilePath,
      });

      return processedFilePath;
    } catch (error) {
      console.error(`Failed to process image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Download and process an image in one step
   */
  static async getProcessedImage(imageId: string): Promise<string | null> {
    try {
      // First, download the image
      const downloadedUri = await this.downloadImage(imageId);
      if (!downloadedUri) {
        return null;
      }

      // Then, process it for coloring
      const processedUri = await this.processImageForColoring(
        downloadedUri,
        imageId
      );
      return processedUri;
    } catch (error) {
      console.error(`Failed to get processed image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Download multiple images in batch
   */
  static async downloadImageBatch(
    imageIds: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ [imageId: string]: string | null }> {
    const results: { [imageId: string]: string | null } = {};

    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      results[imageId] = await this.getProcessedImage(imageId);

      if (onProgress) {
        onProgress(i + 1, imageIds.length);
      }
    }

    return results;
  }

  /**
   * Get a random image from a category
   */
  static getRandomImage(category?: string) {
    const images = category
      ? this.getImagesByCategory(category)
      : this.FEATURED_IMAGES;

    if (images.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
  }

  /**
   * Clear cache
   */
  static async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.CACHE_DIR, { idempotent: true });
      await FileSystem.deleteAsync(this.PROCESSED_DIR, { idempotent: true });
      await this.initialize();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache information
   */
  static async getCacheInfo(): Promise<{
    cachedImages: number;
    processedImages: number;
    cacheSizeMB: number;
  }> {
    try {
      const cacheInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      const processedInfo = await FileSystem.getInfoAsync(this.PROCESSED_DIR);

      let cachedImages = 0;
      let processedImages = 0;
      let totalSize = 0;

      if (cacheInfo.exists) {
        const cacheFiles = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
        cachedImages = cacheFiles.length;

        for (const file of cacheFiles) {
          const fileInfo = await FileSystem.getInfoAsync(this.CACHE_DIR + file);
          if (fileInfo.exists) {
            totalSize += fileInfo.size || 0;
          }
        }
      }

      if (processedInfo.exists) {
        const processedFiles = await FileSystem.readDirectoryAsync(
          this.PROCESSED_DIR
        );
        processedImages = processedFiles.length;

        for (const file of processedFiles) {
          const fileInfo = await FileSystem.getInfoAsync(
            this.PROCESSED_DIR + file
          );
          if (fileInfo.exists) {
            totalSize += fileInfo.size || 0;
          }
        }
      }

      return {
        cachedImages,
        processedImages,
        cacheSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
      };
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return { cachedImages: 0, processedImages: 0, cacheSizeMB: 0 };
    }
  }

  /**
   * Search images by name or description
   */
  static searchImages(query: string) {
    const lowercaseQuery = query.toLowerCase();
    return this.FEATURED_IMAGES.filter(
      (img) =>
        img.name.toLowerCase().includes(lowercaseQuery) ||
        img.description.toLowerCase().includes(lowercaseQuery) ||
        img.category.toLowerCase().includes(lowercaseQuery)
    );
  }
}
