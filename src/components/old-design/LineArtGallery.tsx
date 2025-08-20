import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { LineArtGalleryService } from '../services/LineArtGalleryService';

const { width: screenWidth } = Dimensions.get('window');

interface LineArtGalleryProps {
  onImageSelected: (
    imageUri: string,
    imageName: string,
    imageInfo: any
  ) => void;
  onClose: () => void;
}

interface ImageInfo {
  id: string;
  name: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
}

export const LineArtGallery: React.FC<LineArtGalleryProps> = ({
  onImageSelected,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [filteredImages, setFilteredImages] = useState<ImageInfo[]>([]);
  const [downloadingImages, setDownloadingImages] = useState<Set<string>>(
    new Set()
  );
  const [downloadProgress, setDownloadProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{
    cachedImages: number;
    processedImages: number;
    cacheSizeMB: number;
  } | null>(null);

  const categories = ['all', 'objects', 'vehicles', 'animals', 'buildings'];
  const difficulties = ['all', 'easy', 'medium', 'hard'];

  useEffect(() => {
    initializeGallery();
  }, []);

  useEffect(() => {
    filterImages();
  }, [selectedCategory, selectedDifficulty, images]);

  const initializeGallery = async () => {
    try {
      await LineArtGalleryService.initialize();
      const allImages = LineArtGalleryService.getAllImages();

      // Convert to the expected format
      const convertedImages = allImages.map((img) => ({
        id: img.id,
        name: img.title,
        category: img.category,
        difficulty: img.difficulty,
        description: `${img.tags.join(', ')} - ${img.license || 'CC0'}`,
      }));

      setImages(convertedImages);

      // Load cache info
      const info = await LineArtGalleryService.getCacheInfo();
      setCacheInfo({
        cachedImages: info.downloadedImages,
        processedImages: info.downloadedImages,
        cacheSizeMB: parseFloat(info.cacheSize) || 0,
      });
    } catch (error) {
      console.error('Failed to initialize gallery:', error);
      Alert.alert('Error', 'Failed to load gallery. Please try again.');
    }
  };

  const filterImages = () => {
    let filtered = [...images];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((img) => img.category === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(
        (img) => img.difficulty === selectedDifficulty
      );
    }

    setFilteredImages(filtered);
  };

  const handleImagePress = async (imageInfo: ImageInfo) => {
    if (downloadingImages.has(imageInfo.id)) {
      return; // Already downloading
    }

    try {
      setDownloadingImages((prev) => new Set([...prev, imageInfo.id]));

      // First download the image, then process it
      const downloadedUri = await LineArtGalleryService.downloadImage(
        imageInfo.id
      );
      if (!downloadedUri) {
        throw new Error('Failed to download image');
      }

      const processedUri = await LineArtGalleryService.processImageForColoring(
        imageInfo.id
      );
      if (processedUri) {
        onImageSelected(processedUri, imageInfo.name, imageInfo);

        // Update cache info
        const info = await LineArtGalleryService.getCacheInfo();
        setCacheInfo({
          cachedImages: info.downloadedImages,
          processedImages: info.downloadedImages,
          cacheSizeMB: parseFloat(info.cacheSize) || 0,
        });
      } else {
        Alert.alert(
          'Processing Failed',
          'Failed to process the selected image. Please try again.'
        );
      }
    } catch (error) {
      console.error('Failed to download image:', error);
      Alert.alert('Error', 'An error occurred while downloading the image.');
    } finally {
      setDownloadingImages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(imageInfo.id);
        return newSet;
      });
    }
  };

  const downloadAllInCategory = async () => {
    const imageIds = filteredImages.map((img) => img.id);
    if (imageIds.length === 0) {
      Alert.alert('No Images', 'No images in current filter to download.');
      return;
    }

    Alert.alert(
      'Download All',
      `Download all ${imageIds.length} images in current filter? This may take a while.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            try {
              setDownloadProgress({ completed: 0, total: imageIds.length });

              await LineArtGalleryService.batchDownloadImages(
                imageIds,
                (completed: number, total: number) => {
                  setDownloadProgress({ completed, total });
                }
              );

              // Update cache info
              const info = await LineArtGalleryService.getCacheInfo();
              setCacheInfo({
                cachedImages: info.downloadedImages,
                processedImages: info.downloadedImages,
                cacheSizeMB: parseFloat(info.cacheSize) || 0,
              });
              Alert.alert('Success', 'All images downloaded successfully!');
            } catch (error) {
              console.error('Batch download failed:', error);
              Alert.alert('Error', 'Some images failed to download.');
            } finally {
              setDownloadProgress(null);
            }
          },
        },
      ]
    );
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will delete all downloaded images. You can download them again later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await LineArtGalleryService.clearCache();
              const info = await LineArtGalleryService.getCacheInfo();
              setCacheInfo({
                cachedImages: info.downloadedImages,
                processedImages: info.downloadedImages,
                cacheSizeMB: parseFloat(info.cacheSize) || 0,
              });
              Alert.alert('Success', 'Cache cleared successfully!');
            } catch (error) {
              console.error('Failed to clear cache:', error);
              Alert.alert('Error', 'Failed to clear cache.');
            }
          },
        },
      ]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '#10B981';
      case 'medium':
        return '#F59E0B';
      case 'hard':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '🌟';
      case 'medium':
        return '⭐';
      case 'hard':
        return '💎';
      default:
        return '⚡';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'animals':
        return '🦋';
      case 'nature':
        return '🌸';
      case 'vehicles':
        return '🚗';
      case 'buildings':
        return '🏠';
      case 'shapes':
        return '💖';
      case 'patterns':
        return '🎨';
      default:
        return '📋';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>🎨 Line Art Gallery</Text>
          <Text style={styles.headerSubtitle}>
            Official templates from gallery.quelltext.eu
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Cache Info */}
      {cacheInfo && (
        <View style={styles.cacheInfo}>
          <Text style={styles.cacheText}>
            📦 {cacheInfo.processedImages} images ready •{' '}
            {cacheInfo.cacheSizeMB} MB cached
          </Text>
          <TouchableOpacity onPress={clearCache}>
            <Text style={styles.clearCacheButton}>Clear Cache</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Download Progress */}
      {downloadProgress && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Downloading... {downloadProgress.completed}/{downloadProgress.total}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(downloadProgress.completed / downloadProgress.total) * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Category Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Category:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterButton,
                  selectedCategory === category && styles.activeFilterButton,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={styles.filterEmoji}>
                  {category === 'all' ? '📋' : getCategoryIcon(category)}
                </Text>
                <Text
                  style={[
                    styles.filterText,
                    selectedCategory === category && styles.activeFilterText,
                  ]}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Difficulty Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Difficulty:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {difficulties.map((difficulty) => (
              <TouchableOpacity
                key={difficulty}
                style={[
                  styles.filterButton,
                  selectedDifficulty === difficulty &&
                    styles.activeFilterButton,
                ]}
                onPress={() => setSelectedDifficulty(difficulty)}
              >
                <Text style={styles.filterEmoji}>
                  {difficulty === 'all' ? '⚡' : getDifficultyIcon(difficulty)}
                </Text>
                <Text
                  style={[
                    styles.filterText,
                    selectedDifficulty === difficulty &&
                      styles.activeFilterText,
                  ]}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Batch Actions */}
        <View style={styles.batchActions}>
          <TouchableOpacity
            style={styles.batchButton}
            onPress={downloadAllInCategory}
          >
            <MaterialIcons name="download" size={16} color="#FFFFFF" />
            <Text style={styles.batchButtonText}>
              Download All ({filteredImages.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Images Grid */}
      <ScrollView
        style={styles.imagesContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imagesGrid}>
          {filteredImages.map((imageInfo) => {
            const isDownloading = downloadingImages.has(imageInfo.id);

            return (
              <TouchableOpacity
                key={imageInfo.id}
                style={[
                  styles.imageCard,
                  isDownloading && styles.downloadingCard,
                ]}
                onPress={() => handleImagePress(imageInfo)}
                disabled={isDownloading}
              >
                <View style={styles.imageHeader}>
                  <View style={styles.imageCategory}>
                    <Text style={styles.categoryEmoji}>
                      {getCategoryIcon(imageInfo.category)}
                    </Text>
                    <Text style={styles.categoryText}>
                      {imageInfo.category}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.difficultyBadge,
                      {
                        backgroundColor: getDifficultyColor(
                          imageInfo.difficulty
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.difficultyText}>
                      {getDifficultyIcon(imageInfo.difficulty)}
                    </Text>
                  </View>
                </View>

                <View style={styles.imagePlaceholder}>
                  {isDownloading ? (
                    <ActivityIndicator size="large" color="#3B82F6" />
                  ) : (
                    <Text style={styles.placeholderText}>📄</Text>
                  )}
                </View>

                <View style={styles.imageInfo}>
                  <Text style={styles.imageName} numberOfLines={1}>
                    {imageInfo.name}
                  </Text>
                  <Text style={styles.imageDescription} numberOfLines={2}>
                    {imageInfo.description}
                  </Text>
                </View>

                {isDownloading && (
                  <View style={styles.downloadingOverlay}>
                    <Text style={styles.downloadingText}>Downloading...</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {filteredImages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>🎨</Text>
            <Text style={styles.emptyStateText}>
              No images match your filters
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your category or difficulty selection
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cacheInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  cacheText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
  },
  clearCacheButton: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FEF3C7',
  },
  progressText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#FDE68A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeFilterButton: {
    backgroundColor: '#EBF8FF',
    borderColor: '#3B82F6',
  },
  filterEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeFilterText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  batchActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  batchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#10B981',
    borderRadius: 20,
  },
  batchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  imagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  imageCard: {
    width: (screenWidth - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  downloadingCard: {
    opacity: 0.7,
  },
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  imageCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  difficultyBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  difficultyText: {
    fontSize: 12,
  },
  imagePlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  placeholderText: {
    fontSize: 48,
    opacity: 0.5,
  },
  imageInfo: {
    padding: 12,
  },
  imageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  imageDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  downloadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 250,
  },
});
