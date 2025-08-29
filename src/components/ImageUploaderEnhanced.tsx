import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { OpenCVProcessor, type OpenCVProcessorHandle } from './OpenCVProcessor';

import {
  type PngTemplate,
  PngTemplateService,
} from '../services/PngTemplateService';

const { width: screenWidth } = Dimensions.get('window');

interface ImageUploaderEnhancedProps {
  onBitmapTemplateSelected: (imageUri: string, fileName: string) => void;
  onImageUploaded: (imageUri: string, fileName: string) => void;
  onTemplateSelected: (templateData: any) => void;
}

export const ImageUploaderEnhanced: React.FC<ImageUploaderEnhancedProps> = ({
  onBitmapTemplateSelected,
  onImageUploaded,
  onTemplateSelected,
}) => {
  const [templates, setTemplates] = useState<PngTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const cvRef = useRef<OpenCVProcessorHandle>(null);
  const [busy, setBusy] = useState(false);

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
    console.log('🚀 ImageUploaderEnhanced: PNG mode enabled!');
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

      // Call all the callback props for backwards compatibility
      onBitmapTemplateSelected(pngUri, template.title);
      onTemplateSelected({
        id: template.id,
        title: template.title,
        uri: pngUri,
        width: template.width,
        height: template.height,
        type: 'png',
      });

      console.log(`✅ PNG template selected: ${template.title}`);
    } catch (error) {
      console.error('Failed to select PNG template:', error);
      Alert.alert('Error', 'Failed to load PNG template');
    }
  };

  const handleUploadImage = async () => {
    try {
      if (busy) return;
      setBusy(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Allow Photos/Media to pick an image.');
        setBusy(false);
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 1, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      // SDK 49+: result has canceled; older: cancelled
      // @ts-ignore
      if (picked.canceled || picked.cancelled) { setBusy(false); return; }
      const asset = (picked as any).assets ? (picked as any).assets[0] : picked;
      const base64 = asset.base64 as string | undefined;
      const uri = asset.uri as string;
      if (!base64) {
        // fallback: read as base64 from uri
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        await processAndReturn(`data:image/jpeg;base64,${b64}`, uri);
      } else {
        const mime = asset.mimeType || 'image/jpeg';
        await processAndReturn(`data:${mime};base64,${base64}`, uri);
      }
    } catch (e: any) {
      console.warn('Upload failed', e);
      Alert.alert('Upload failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  async function processAndReturn(dataUrl: string, originalUri: string) {
    try {
      // wait for OpenCV ready (simple poll)
      let tries = 0;
      while (!(cvRef.current?.isReady?.()) && tries < 25) {
        await new Promise(r => setTimeout(r, 120));
        tries++;
      }
      if (!cvRef.current?.isReady?.()) {
        Alert.alert('Converter not ready', 'OpenCV failed to initialize. Ensure opencv.js exists.');
        return;
      }
      const resultB64 = await cvRef.current.process(dataUrl, { method: 'canny', threshold1: 50, threshold2: 150, blur: 5, invert: true, maxSize: 1400 });
      // persist result to a file, return file:// URI for stability
      const filename = `colored_template_${Date.now()}.png`;
      const path = FileSystem.cacheDirectory! + filename;
      const b64 = resultB64.replace(/^data:image\/png;base64,/, '');
      await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });

      // notify callbacks
      const title = 'My Upload';
      onImageUploaded(path, title);
      onBitmapTemplateSelected(path, title);
      onTemplateSelected({ bitmapUri: path, fileName: title, width: 0, height: 0, type: 'png' });
    } catch (e: any) {
      console.warn('Processing failed', e);
      Alert.alert('Processing failed', e?.message ?? 'Unknown error');
    }
  }

  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((template) => template.category === selectedCategory);

  // Responsive card width
  // Web keeps wider grids; Native prioritizes larger cards (1–2 columns on phones)
  const columns = Platform.OS === 'web'
    ? (screenWidth >= 1200 ? 4 : screenWidth >= 900 ? 3 : 2)
    : (screenWidth >= 600 ? 3 : screenWidth >= 440 ? 2 : 1);
  // Reduce horizontal padding and margins so cards get more width
  const horizontalPadding = 8; // keep in sync with styles.templatesGrid paddingHorizontal
  const cardMargin = 8; // templateCard marginHorizontal
  const available = screenWidth - horizontalPadding * 2;
  const cardWidth = Math.floor((available - cardMargin * 2 * columns) / columns);

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
  {/* Hidden OpenCV WebView processor (offline, native only) */}
  {Platform.OS !== 'web' ? <OpenCVProcessor ref={cvRef} /> : null}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎨 Choose Your PNG Template!</Text>
        <Text style={styles.headerSubtitle}>
          Select a beautiful line art template to color
        </Text>
      </View>

      <TouchableOpacity style={styles.uploadButton} onPress={handleUploadImage} disabled={busy}>
        <Text style={styles.uploadButtonText}>{busy ? 'Processing…' : '📁 Upload Your Own Image'}</Text>
      </TouchableOpacity>

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

      <ScrollView
        style={styles.templatesScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.templatesGrid}>
          {filteredTemplates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={[styles.templateCard, { width: cardWidth, marginHorizontal: cardMargin }]}
              onPress={() => handleTemplateSelect(template)}
            >
              <View style={[styles.templateImageContainer, { height: Math.round(cardWidth * 0.66) }]}>
                <Image
                  source={{ uri: template.thumbnailUri }}
                  style={styles.templateImage}
                  resizeMode="cover"
                />

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
    maxHeight: 96,
  },
  categoryContainer: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  categoryButton: {
    marginHorizontal: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    minWidth: 96,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
  paddingHorizontal: 8,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  templateCard: {
  width: (screenWidth - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
  marginHorizontal: 8,
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
