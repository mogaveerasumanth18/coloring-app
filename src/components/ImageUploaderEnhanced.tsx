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
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { SettingsService } from '../services/SettingsService';
import { GeminiService } from '../services/GeminiService';
import { UserTemplatesService, type UserTemplate } from '../services/UserTemplatesService';

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
  const [busy, setBusy] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(SettingsService.getGeminiApiKey());
  const [showGuide, setShowGuide] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [saveTitle, setSaveTitle] = useState('My Line Art');
  const [saveCategory, setSaveCategory] = useState('custom');
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);

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
  setUserTemplates(UserTemplatesService.list());
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
      // If first time or missing API key, show guide
      const guideSeen = SettingsService.getGuideSeen();
      const key = SettingsService.getGeminiApiKey();
      if (!guideSeen || !key) {
        setShowGuide(true);
        return;
      }
      setBusy(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Allow Photos/Media to pick an image.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 1, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      // SDK 49+: result has canceled; older: cancelled
      // @ts-ignore
      if (picked.canceled || picked.cancelled) { return; }
      const asset = (picked as any).assets ? (picked as any).assets[0] : picked;
      const base64 = asset.base64 as string | undefined;
      const uri = asset.uri as string;
      const imgB64 = base64 ?? await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      // Call Gemini to generate line art
      const outDataUrl = await GeminiService.generateLineArt(imgB64, key!);
      setGenResult(outDataUrl);
      setSaveTitle('My Line Art');
      setSaveCategory('custom');
      setShowSave(true);
    } catch (e: any) {
      console.warn('Upload failed', e);
      Alert.alert('Upload failed', e?.message ?? 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  // Save dialog actions
  const handleSaveTemplate = async () => {
    try {
      if (!genResult) return;
      const tpl = await UserTemplatesService.addFromBase64(saveTitle.trim() || 'My Line Art', saveCategory.trim() || 'custom', genResult);
      setUserTemplates(UserTemplatesService.list());
      setShowSave(false);
      setGenResult(null);
      // notify callbacks and open for coloring
      onImageUploaded(tpl.pngUri, tpl.title);
      onBitmapTemplateSelected(tpl.pngUri, tpl.title);
      onTemplateSelected({ bitmapUri: tpl.pngUri, fileName: tpl.title, width: 0, height: 0, type: 'png' });
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    }
  };

  const handleDeleteUserTemplate = (id: string) => {
    UserTemplatesService.remove(id);
    setUserTemplates(UserTemplatesService.list());
  };

  const filteredTemplates =
    selectedCategory === 'all'
      ? templates
      : templates.filter((template) => template.category === selectedCategory);

  const useUserTemplate = (tpl: UserTemplate) => {
    onBitmapTemplateSelected(tpl.pngUri, tpl.title);
    onTemplateSelected({ bitmapUri: tpl.pngUri, fileName: tpl.title, width: 0, height: 0, type: 'png' });
  };

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
  {/* Gemini-powered upload flow. */}
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
          {/* User templates */}
          {userTemplates.map((tpl) => (
            <View key={tpl.id} style={[styles.templateCard, { width: cardWidth, marginHorizontal: cardMargin }] }>
              <View style={[styles.templateImageContainer, { height: Math.round(cardWidth * 0.66) }]}>
                <Image source={{ uri: tpl.pngUri }} style={styles.templateImage} resizeMode="cover" />
              </View>
              <View style={styles.templateInfo}>
                <Text style={styles.templateTitle} numberOfLines={2}>{tpl.title}</Text>
                <Text style={styles.templateDimensions}>{tpl.category} • Saved</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 12 }}>
                <TouchableOpacity onPress={() => useUserTemplate(tpl)}>
                  <Text style={{ color: '#4ECDC4', fontWeight: 'bold' }}>Use</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteUserTemplate(tpl.id)}>
                  <Text style={{ color: '#F44336', fontWeight: 'bold' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

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

      {/* Guide modal for API key and quick video */}
      {showGuide && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Use Gemini to generate line art</Text>
            <Text style={styles.modalText}>Sign in to Google AI Studio and create an API key. Paste it below. It stays on your device.</Text>
            <View style={{ height: 200, borderRadius: 8, overflow: 'hidden', marginVertical: 8 }}>
              <WebView source={{ uri: 'https://youtube.com/shorts/T1BTyo1A4Ww?si=gE5halpXKayi4lPJ' }} allowsFullscreenVideo style={{ flex: 1 }} />
            </View>
            <Text style={[styles.modalText, { marginTop: 8 }]}>Gemini API Key</Text>
            <TextInput
              value={apiKey ?? ''}
              onChangeText={(t) => setApiKey(t)}
              placeholder="AI Studio API key"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.keyInput}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setShowGuide(false)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: '#64748B', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { const k = (apiKey || '').trim(); if (!k) { Alert.alert('API Key required', 'Please enter your Gemini API key.'); return; } SettingsService.setGeminiApiKey(k); SettingsService.setGuideSeen(true); setShowGuide(false); setTimeout(() => { handleUploadImage(); }, 50); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: '#4ECDC4', fontWeight: '800' }}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Save result modal */}
      {showSave && genResult && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save as Template</Text>
            <View style={{ height: 180, borderRadius: 8, overflow: 'hidden', marginVertical: 8, backgroundColor: '#EEE' }}>
              <Image source={{ uri: genResult }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>
            <Text style={[styles.modalText, { marginTop: 8 }]}>Name</Text>
            <TextInput value={saveTitle} onChangeText={setSaveTitle} style={styles.keyInput} />
            <Text style={[styles.modalText, { marginTop: 8 }]}>Category</Text>
            <TextInput value={saveCategory} onChangeText={setSaveCategory} style={styles.keyInput} />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={() => { setShowSave(false); setGenResult(null); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: '#64748B', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveTemplate} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: '#4ECDC4', fontWeight: '800' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  // Modals
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '92%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
  },
  keyInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    marginTop: 6,
  },
});
