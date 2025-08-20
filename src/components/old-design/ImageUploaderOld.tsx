import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ImageUploaderProps {
  onImageUploaded: (svgData: string, fileName: string) => void;
  onTemplateSelected: (templateData: any) => void;
}

interface SavedTemplate {
  id: string;
  name: string;
  svgData: string;
  createdAt: string;
  width?: number;
  height?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUploaded,
  onTemplateSelected,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermission = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images!'
        );
        return false;
      }
    }
    return true;
  }, []);

  const saveTemplate = useCallback(
    async (svgData: string, fileName: string) => {
      try {
        const templateId = `template_${Date.now()}`;
        const savedTemplate: SavedTemplate = {
          id: templateId,
          name: fileName,
          svgData,
          createdAt: new Date().toISOString(),
        };

        // Save template to AsyncStorage for offline use
        await AsyncStorage.setItem(
          `saved_template_${templateId}`,
          JSON.stringify(savedTemplate)
        );

        // Keep a list of all templates
        const existingTemplates = await AsyncStorage.getItem(
          'saved_templates_list'
        );
        const templatesList = existingTemplates
          ? JSON.parse(existingTemplates)
          : [];
        templatesList.push({
          id: templateId,
          name: savedTemplate.name,
          createdAt: savedTemplate.createdAt,
        });
        await AsyncStorage.setItem(
          'saved_templates_list',
          JSON.stringify(templatesList)
        );

        return savedTemplate;
      } catch (error) {
        console.error('Failed to save template:', error);
        throw error;
      }
    },
    []
  );

  const pickImage = useCallback(async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Check if it's an SVG file
        if (
          asset.fileName?.toLowerCase().endsWith('.svg') ||
          asset.mimeType === 'image/svg+xml'
        ) {
          // Read SVG file content
          const svgContent = await FileSystem.readAsStringAsync(asset.uri);

          // Save template for offline use
          const savedTemplate = await saveTemplate(
            svgContent,
            asset.fileName || 'template.svg'
          );

          onImageUploaded(svgContent, asset.fileName || 'template.svg');
          onTemplateSelected(savedTemplate);

          Alert.alert('Success', 'SVG template uploaded successfully!');
        } else {
          Alert.alert(
            'Unsupported Format',
            'Please select an SVG file. For other image formats, you can convert them to SVG using online tools.'
          );
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [requestPermission, saveTemplate, onImageUploaded, onTemplateSelected]);

  const loadSavedTemplates = useCallback(async () => {
    try {
      const templatesList = await AsyncStorage.getItem('saved_templates_list');
      if (templatesList) {
        const templates = JSON.parse(templatesList);
        if (templates.length === 0) {
          Alert.alert('No Templates', 'No saved templates found.');
          return;
        }

        // For now, load the most recent template
        // In a full implementation, you'd show a picker
        const latestTemplate = templates[templates.length - 1];
        const templateData = await AsyncStorage.getItem(
          `saved_template_${latestTemplate.id}`
        );

        if (templateData) {
          const template: SavedTemplate = JSON.parse(templateData);
          onTemplateSelected(template);
          Alert.alert('Template Loaded', `Loaded: ${template.name}`);
        }
      } else {
        Alert.alert('No Templates', 'No saved templates found.');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      Alert.alert('Error', 'Failed to load templates.');
    }
  }, [onTemplateSelected]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Template Manager</Text>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={pickImage}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Uploading...' : '📁 Upload SVG Template'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={loadSavedTemplates}>
        <Text style={styles.buttonText}>📂 Load Saved Template</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        💡 Tip: Upload SVG files for best coloring experience
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
