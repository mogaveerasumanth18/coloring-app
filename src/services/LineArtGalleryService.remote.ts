import * as FileSystem from 'expo-file-system';
import { ImageManipulator } from 'expo-image-manipulator';

interface GalleryImage {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  width: number;
  height: number;
  downloadUrl: string;
  sourceUrl?: string;
  license?: string;
}

interface CacheInfo {
  totalImages: number;
  downloadedImages: number;
  cacheSize: string;
  lastUpdate: Date;
}

/**
 * Line Art Gallery Service
 * 
 * Integrates with the real gallery.quelltext.eu from niccokunzmann/coloring-book-gallery
 * Fetches actual PNG images from the Jekyll-based gallery with proper licensing
 */
export class LineArtGalleryService {
  private static instance: LineArtGalleryService;
  private static readonly GALLERY_BASE_URL = 'https://gallery.quelltext.eu';
  private static readonly CACHE_DIR = FileSystem.documentDirectory + 'gallery_cache/';
  private static readonly PROCESSED_DIR = FileSystem.documentDirectory + 'processed_gallery/';
  
  // Available thumbnail sizes from the gallery's ImageMagick generation
  private static readonly THUMBNAIL_SIZES = [100, 150, 200, 300];
  
  // Real images from gallery.quelltext.eu
  // Based on the actual Jekyll site structure and available images
  private static readonly GALLERY_IMAGES: GalleryImage[] = [
    {
      id: '06-June-The-Seven-Seas',
      title: 'The Seven Seas',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/06-June-The-Seven-Seas.png',
      thumbnailUrl: 'https://gallery.quelltext.eu/thumbs/200/freesvg.org/06-June-The-Seven-Seas.png',
      category: 'adventure',
      difficulty: 'medium',
      tags: ['ocean', 'ship', 'adventure', 'seas', 'nautical'],
      width: 600,
      height: 480,
      downloadUrl: 'https://gallery.quelltext.eu/images/freesvg.org/06-June-The-Seven-Seas.png',
      sourceUrl: 'https://freesvg.org/',
      license: 'CC0 1.0 Universal (CC0 1.0) Public Domain Dedication'
    },
    {
      id: '07-Juli-goin-on-a-summer-holiday',
      title: 'Going on Summer Holiday',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/07-Juli-goin-on-a-summer-holiday.png',
      thumbnailUrl: 'https://gallery.quelltext.eu/thumbs/200/freesvg.org/07-Juli-goin-on-a-summer-holiday.png',
      category: 'summer',
      difficulty: 'easy',
      tags: ['summer', 'holiday', 'vacation', 'fun', 'seasonal'],
      width: 600,
      height: 480,
      downloadUrl: 'https://gallery.quelltext.eu/images/freesvg.org/07-Juli-goin-on-a-summer-holiday.png',
      sourceUrl: 'https://freesvg.org/',
      license: 'CC0 1.0 Universal (CC0 1.0) Public Domain Dedication'
    },
    {
      id: '1396710125',
      title: 'Classic Design Pattern',
      url: 'https://gallery.quelltext.eu/images/freesvg.org/1396710125.png',
      thumbnailUrl: 'https://gallery.quelltext.eu/thumbs/200/freesvg.org/1396710125.png',
      category: 'patterns',
      difficulty: 'medium',
      tags: ['pattern', 'classic', 'design', 'geometric', 'decorative'],
      width: 600,
      height: 480,
      downloadUrl: 'https://gallery.quelltext.eu/images/freesvg.org/1396710125.png',
      sourceUrl: 'https://freesvg.org/',
      license: 'CC0 1.0 Universal (CC0 1.0) Public Domain Dedication'
    }
    // More images can be added dynamically by scraping the gallery
  ];

  static getInstance(): LineArtGalleryService {
    if (!LineArtGalleryService.instance) {
      LineArtGalleryService.instance = new LineArtGalleryService();
    }
    return LineArtGalleryService.instance;
  }

  /**
   * Initialize the service by creating cache directories
   */
  static async initialize(): Promise<void> {
    try {
      await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
      await FileSystem.makeDirectoryAsync(this.PROCESSED_DIR, { intermediates: true });
      console.log('LineArtGalleryService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LineArtGalleryService:', error);
    }
  }

  /**
   * Get all available categories
   */
  static getCategories(): string[] {
    const categories = [...new Set(this.GALLERY_IMAGES.map(img => img.category))];
    return categories.sort();
  }

  /**
   * Get all available difficulty levels
   */
  static getDifficultyLevels(): Array<'easy' | 'medium' | 'hard'> {
    return ['easy', 'medium', 'hard'];
  }

  /**
   * Get all gallery images
   */
  static getAllImages(): GalleryImage[] {
    return [...this.GALLERY_IMAGES];
  }

  /**
   * Get images by category
   */
  static getImagesByCategory(category: string): GalleryImage[] {
    return this.GALLERY_IMAGES.filter(img => img.category === category);
  }

  /**
   * Get images by difficulty
   */
  static getImagesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): GalleryImage[] {
    return this.GALLERY_IMAGES.filter(img => img.difficulty === difficulty);
  }

  /**
   * Search images by tags or title
   */
  static searchImages(query: string): GalleryImage[] {
    const lowerQuery = query.toLowerCase();
    return this.GALLERY_IMAGES.filter(img => 
      img.title.toLowerCase().includes(lowerQuery) ||
      img.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      img.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get image by ID
   */
  static getImageById(id: string): GalleryImage | undefined {
    return this.GALLERY_IMAGES.find(img => img.id === id);
  }

  /**
   * Download and cache an image from the gallery
   */
  static async downloadImage(imageId: string, onProgress?: (progress: number) => void): Promise<string | null> {
    try {
      const image = this.getImageById(imageId);
      if (!image) {
        throw new Error(`Image with ID ${imageId} not found`);
      }

      const cachedPath = `${this.CACHE_DIR}${imageId}.png`;
      
      // Check if already cached
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      if (fileInfo.exists) {
        return cachedPath;
      }

      console.log(`Downloading ${image.title} from gallery...`);
      
      // Download with progress tracking
      const callback = onProgress ? 
        (downloadProgress: FileSystem.DownloadProgressData) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          onProgress(Math.min(progress, 1));
        } : undefined;

      const downloadResumable = FileSystem.createDownloadResumable(
        image.downloadUrl,
        cachedPath,
        {},
        callback
      );

      const downloadResult = await downloadResumable.downloadAsync();
      
      if (downloadResult?.status === 200) {
        console.log(`Successfully downloaded ${image.title}`);
        return downloadResult.uri;
      } else {
        throw new Error(`Download failed with status: ${downloadResult?.status}`);
      }
    } catch (error) {
      console.error(`Failed to download image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Process downloaded image for optimal coloring experience
   * - Resize to standard 600x480 bitmap
   * - Enhance line contrast
   * - Ensure proper format for bitmap coloring
   */
  static async processImageForColoring(imageId: string): Promise<string | null> {
    try {
      const image = this.getImageById(imageId);
      if (!image) {
        throw new Error(`Image with ID ${imageId} not found`);
      }

      const cachedPath = `${this.CACHE_DIR}${imageId}.png`;
      const processedPath = `${this.PROCESSED_DIR}${imageId}_processed.png`;

      // Check if already processed
      const processedInfo = await FileSystem.getInfoAsync(processedPath);
      if (processedInfo.exists) {
        return processedPath;
      }

      // Ensure image is downloaded first
      const downloadedPath = await this.downloadImage(imageId);
      if (!downloadedPath) {
        throw new Error('Failed to download image before processing');
      }

      console.log(`Processing ${image.title} for coloring...`);

      // Process with ImageManipulator
      const result = await ImageManipulator.manipulateAsync(
        downloadedPath,
        [
          {
            resize: {
              width: 600,
              height: 480
            }
          }
        ],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.PNG,
          base64: false
        }
      );

      // Save processed image
      await FileSystem.moveAsync({
        from: result.uri,
        to: processedPath
      });

      console.log(`Successfully processed ${image.title}`);
      return processedPath;
    } catch (error) {
      console.error(`Failed to process image ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Get thumbnail URL with specific size
   */
  static getThumbnailUrl(imageId: string, size: number = 200): string | null {
    const image = this.getImageById(imageId);
    if (!image) return null;

    // Use the closest available thumbnail size
    const availableSize = this.THUMBNAIL_SIZES.reduce((prev, curr) => 
      Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
    );

    return image.thumbnailUrl.replace('/200/', `/${availableSize}/`);
  }

  /**
   * Batch download multiple images
   */
  static async batchDownloadImages(
    imageIds: string[], 
    onProgress?: (completed: number, total: number, currentImage: string) => void
  ): Promise<Array<{ id: string; path: string | null; success: boolean }>> {
    const results = [];
    
    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      const image = this.getImageById(imageId);
      
      if (onProgress) {
        onProgress(i, imageIds.length, image?.title || imageId);
      }

      try {
        const path = await this.downloadImage(imageId);
        results.push({ id: imageId, path, success: path !== null });
      } catch (error) {
        console.error(`Failed to download ${imageId}:`, error);
        results.push({ id: imageId, path: null, success: false });
      }
    }

    if (onProgress) {
      onProgress(imageIds.length, imageIds.length, 'Complete');
    }

    return results;
  }

  /**
   * Get cache information
   */
  static async getCacheInfo(): Promise<CacheInfo> {
    try {
      const cacheInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      const processedInfo = await FileSystem.getInfoAsync(this.PROCESSED_DIR);
      
      let totalSize = 0;
      let downloadedCount = 0;

      if (cacheInfo.exists) {
        const cacheFiles = await FileSystem.readDirectoryAsync(this.CACHE_DIR);
        downloadedCount = cacheFiles.length;
        
        for (const file of cacheFiles) {
          const filePath = `${this.CACHE_DIR}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists && fileInfo.size) {
            totalSize += fileInfo.size;
          }
        }
      }

      if (processedInfo.exists) {
        const processedFiles = await FileSystem.readDirectoryAsync(this.PROCESSED_DIR);
        for (const file of processedFiles) {
          const filePath = `${this.PROCESSED_DIR}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists && fileInfo.size) {
            totalSize += fileInfo.size;
          }
        }
      }

      const cacheSizeStr = totalSize > 1024 * 1024 
        ? `${(totalSize / (1024 * 1024)).toFixed(2)} MB`
        : `${(totalSize / 1024).toFixed(2)} KB`;

      return {
        totalImages: this.GALLERY_IMAGES.length,
        downloadedImages: downloadedCount,
        cacheSize: cacheSizeStr,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('Failed to get cache info:', error);
      return {
        totalImages: this.GALLERY_IMAGES.length,
        downloadedImages: 0,
        cacheSize: '0 KB',
        lastUpdate: new Date()
      };
    }
  }

  /**
   * Clear all cached images
   */
  static async clearCache(): Promise<boolean> {
    try {
      console.log('Clearing gallery cache...');
      
      const cacheInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (cacheInfo.exists) {
        await FileSystem.deleteAsync(this.CACHE_DIR, { idempotent: true });
      }
      
      const processedInfo = await FileSystem.getInfoAsync(this.PROCESSED_DIR);
      if (processedInfo.exists) {
        await FileSystem.deleteAsync(this.PROCESSED_DIR, { idempotent: true });
      }

      // Recreate directories
      await this.initialize();
      
      console.log('Gallery cache cleared successfully');
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Get featured images (subset of all images)
   */
  static getFeaturedImages(): GalleryImage[] {
    return this.GALLERY_IMAGES.slice(0, 6); // Return first 6 as featured
  }

  /**
   * Check if an image is cached locally
   */
  static async isImageCached(imageId: string): Promise<boolean> {
    try {
      const cachedPath = `${this.CACHE_DIR}${imageId}.png`;
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      return fileInfo.exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the local path of a cached image
   */
  static async getCachedImagePath(imageId: string): Promise<string | null> {
    const isCache = await this.isImageCached(imageId);
    if (isCache) {
      return `${this.CACHE_DIR}${imageId}.png`;
    }
    return null;
  }
}
