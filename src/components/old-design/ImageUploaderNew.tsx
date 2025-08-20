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

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUploaded,
  onTemplateSelected,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const saveTemplate = useCallback(
    async (svgData: string, fileName: string) => {
      try {
        const templateId = `template_${Date.now()}`;
        const template = {
          id: templateId,
          name: fileName,
          svgData,
          createdAt: new Date().toISOString(),
        };

        await AsyncStorage.setItem(
          `svg_template_${templateId}`,
          JSON.stringify(template)
        );

        const existingTemplates = await AsyncStorage.getItem('svg_templates_list');
        const templatesList = existingTemplates ? JSON.parse(existingTemplates) : [];
        templatesList.push({
          id: templateId,
          name: fileName,
          createdAt: template.createdAt,
        });
        
        await AsyncStorage.setItem(
          'svg_templates_list',
          JSON.stringify(templatesList)
        );
        
        console.log('Template saved successfully');
      } catch (error) {
        console.error('Failed to save template:', error);
      }
    },
    []
  );

  const pickSvgDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/svg+xml', 'text/xml', 'application/xml'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('Selected file:', asset);

        if (asset.uri) {
          // Read the SVG file content
          const svgContent = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });

          // Extract filename without extension
          const fileName = asset.name || 'Unknown Template';
          
          // Save template for later use
          await saveTemplate(svgContent, fileName);
          
          // Use the template immediately
          onImageUploaded(svgContent, fileName);
          
          Alert.alert('Success', `SVG template "${fileName}" loaded successfully!`);
        } else {
          Alert.alert('Error', 'Could not read the selected file');
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert(
        'Error',
        'Failed to load SVG file. Please make sure the file is a valid SVG.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [onImageUploaded, saveTemplate]);

  const loadExistingTemplate = useCallback(async () => {
    try {
      const templatesList = await AsyncStorage.getItem('svg_templates_list');
      if (templatesList) {
        const templates = JSON.parse(templatesList);
        if (templates.length > 0) {
          const latestTemplate = templates[templates.length - 1];
          const templateData = await AsyncStorage.getItem(
            `svg_template_${latestTemplate.id}`
          );
          if (templateData) {
            const template = JSON.parse(templateData);
            onTemplateSelected(template);
            Alert.alert('Success', `Template "${template.name}" loaded!`);
          }
        } else {
          Alert.alert('Info', 'No saved templates found. Upload an SVG first.');
        }
      } else {
        Alert.alert('Info', 'No saved templates found. Upload an SVG first.');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      Alert.alert('Error', 'Failed to load template');
    }
  }, [onTemplateSelected]);

  return (
    <View style={styles.container}>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.uploadButton]}
          onPress={pickSvgDocument}
          disabled={isLoading}
        >
          <Text style={styles.buttonIcon}>📄</Text>
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Upload SVG'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.loadButton]}
          onPress={loadExistingTemplate}
        >
          <Text style={styles.buttonIcon}>📁</Text>
          <Text style={styles.buttonText}>Load Last</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.hint}>
        Tip: Upload SVG files for coloring templates
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  uploadButton: {
    backgroundColor: '#3B82F6',
  },
  loadButton: {
    backgroundColor: '#6B7280',
  },
  buttonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
