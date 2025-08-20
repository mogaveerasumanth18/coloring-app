import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  type PngTemplate,
  PngTemplateService,
} from '../services/PngTemplateService';

const { width: screenWidth } = Dimensions.get('window');

interface PngImageUploaderProps {
  onPngTemplateSelected: (pngUri: string, fileName: string) => void;
  onImageUploaded?: (imageUri: string, fileName: string) => void;
}

export const PngImageUploader: React.FC<PngImageUploaderProps> = ({
  onPngTemplateSelected,
  onImageUploaded,
}) => {
  const [templates, setTemplates] = useState<PngTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Templates', emoji: '🎨' },
    { id: 'objects', name: 'Objects', emoji: '🎈' },
    { id: 'vehicles', name: 'Vehicles', emoji: '🚀' },
    { id: 'animals', name: 'Animals', emoji: '🐎' },
    { id: 'buildings', name: 'Buildings', emoji: '🏰' },
  ];

  const difficultyColors = {
    easy: '#4CAF50',
    medium: '#FF9800',
    hard: '#F44336',
  };

  useEffect(() => {
    console.log('🚀 PngImageUploader component loaded!');
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      await PngTemplateService.initialize();
      const allTemplates = await PngTemplateService.getAllTemplates();
      setTemplates(allTemplates);
      console.log(`✅ Loaded ${allTemplates.length} PNG templates`);
    } catch (error) {
      console.error('Failed to load PNG templates:', error);
      Alert.alert('Error', 'Failed to load PNG templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (template: PngTemplate) => {
    try {
      console.log(`🎯 Selecting PNG template: ${template.title}`);
      const pngUri = await PngTemplateService.downloadTemplate(template.id);
      onPngTemplateSelected(pngUri, template.title);
    } catch (error) {
      console.error('Failed to select PNG template:', error);
      Alert.alert('Error', 'Failed to load PNG template');
    }
  };

  const handleUploadImage = async () => {
    Alert.alert(
      'PNG Upload',
      'Custom PNG upload is not available yet. Please use the built-in templates.'
    );
  };

  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((template) => template.category === selectedCategory);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>
          Loading PNG coloring templates...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎨 Choose Your PNG Template!</Text>
        <Text style={styles.headerSubtitle}>
          Select a beautiful line art template to color
        </Text>
      </View>

      {/* Upload Button */}
      <TouchableOpacity style={styles.uploadButton} onPress={handleUploadImage}>
        <Text style={styles.uploadButtonText}>📁 Upload Your Own PNG</Text>
      </TouchableOpacity>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.selectedCategory,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={styles.categoryEmoji}>{category.emoji}</Text>
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.selectedCategoryText,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Templates Grid */}
      <ScrollView
        style={styles.templatesScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.templatesGrid}>
          {filteredTemplates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => handleTemplateSelect(template)}
            >
              {/* Template Image */}
              <View style={styles.templateImageContainer}>
                <Image
                  source={{ uri: template.thumbnailUri }}
                  style={styles.templateImage}
                  resizeMode="cover"
                />

                {/* Difficulty Badge */}
                <View
                  style={[
                    styles.difficultyBadge,
                    { backgroundColor: difficultyColors[template.difficulty] },
                  ]}
                >
                  <Text style={styles.difficultyText}>
                    {template.difficulty.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Template Info */}
              <View style={styles.templateInfo}>
                <Text style={styles.templateTitle} numberOfLines={2}>
                  {template.title}
                </Text>
                <Text style={styles.templateDimensions}>
                  {template.width} × {template.height}px
                </Text>
                {template.description && (
                  <Text style={styles.templateDescription} numberOfLines={2}>
                    {template.description}
                  </Text>
                )}
              </View>

              {/* Tags */}
              {template.tags && template.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {filteredTemplates.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No templates found in this category
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          📌 Tap any template to start coloring with PNG flood fill
        </Text>
        <Text style={styles.footerStats}>
          {filteredTemplates.length} templates available
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  uploadButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#4ECDC4',
    borderRadius: 10,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  categoryScroll: {
    maxHeight: 80,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  categoryButton: {
    marginRight: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    minWidth: 80,
  },
  selectedCategory: {
    borderColor: '#4ECDC4',
    backgroundColor: '#E8F8F5',
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 5,
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
  templatesScroll: {
    flex: 1,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  templateCard: {
    width: (screenWidth - 30) / 2 - 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    overflow: 'hidden',
  },
  templateImageContainer: {
    position: 'relative',
    height: 140,
    backgroundColor: '#F5F5F5',
  },
  templateImage: {
    width: '100%',
    height: '100%',
  },
  difficultyBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  templateInfo: {
    padding: 12,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  templateDimensions: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerStats: {
    fontSize: 12,
    color: '#999',
  },
});
