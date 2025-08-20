import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
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
  const [showTextInput, setShowTextInput] = useState(false);
  const [svgText, setSvgText] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [showSavedTemplates, setShowSavedTemplates] = useState(false);

  // Predefined simple SVG templates
  const predefinedTemplates = [
    {
      id: 'circle',
      name: 'Simple Circle',
      svgData: `<svg width="300" height="240" viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg">
        <circle cx="150" cy="120" r="80" fill="none" stroke="#333" stroke-width="2"/>
      </svg>`,
    },
    {
      id: 'star',
      name: 'Star Shape',
      svgData: `<svg width="300" height="240" viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg">
        <path d="M150,40 L170,100 L230,100 L185,135 L200,195 L150,165 L100,195 L115,135 L70,100 L130,100 Z" 
              fill="none" stroke="#333" stroke-width="2"/>
      </svg>`,
    },
    {
      id: 'house',
      name: 'Simple House',
      svgData: `<svg width="300" height="240" viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,180 L50,120 L150,60 L250,120 L250,180 Z" fill="none" stroke="#333" stroke-width="2"/>
        <rect x="80" y="140" width="30" height="40" fill="none" stroke="#333" stroke-width="2"/>
        <rect x="190" y="120" width="40" height="30" fill="none" stroke="#333" stroke-width="2"/>
      </svg>`,
    },
    {
      id: 'flower',
      name: 'Simple Flower',
      svgData: `<svg width="300" height="240" viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg">
        <circle cx="150" cy="120" r="15" fill="none" stroke="#333" stroke-width="2"/>
        <circle cx="150" cy="90" r="20" fill="none" stroke="#333" stroke-width="2"/>
        <circle cx="150" cy="150" r="20" fill="none" stroke="#333" stroke-width="2"/>
        <circle cx="120" cy="120" r="20" fill="none" stroke="#333" stroke-width="2"/>
        <circle cx="180" cy="120" r="20" fill="none" stroke="#333" stroke-width="2"/>
        <line x1="150" y1="150" x2="150" y2="200" stroke="#333" stroke-width="2"/>
      </svg>`,
    },
  ];

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

        const existingTemplates =
          await AsyncStorage.getItem('svg_templates_list');
        const templatesList = existingTemplates
          ? JSON.parse(existingTemplates)
          : [];
        templatesList.push({
          id: templateId,
          name: fileName,
          createdAt: template.createdAt,
        });

        await AsyncStorage.setItem(
          'svg_templates_list',
          JSON.stringify(templatesList)
        );
      } catch (error) {
        console.error('Failed to save template:', error);
      }
    },
    []
  );

  const loadSavedTemplates = useCallback(async () => {
    try {
      const templatesList = await AsyncStorage.getItem('svg_templates_list');
      if (templatesList) {
        setSavedTemplates(JSON.parse(templatesList));
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, []);

  const handlePasteSvg = useCallback(async () => {
    if (!svgText.trim()) {
      Alert.alert('Error', 'Please paste some SVG content first');
      return;
    }

    try {
      setIsLoading(true);

      // Basic SVG validation
      if (!svgText.includes('<svg') || !svgText.includes('</svg>')) {
        Alert.alert(
          'Error',
          'Invalid SVG format. Please make sure the content contains <svg> tags.'
        );
        return;
      }

      const fileName = `Custom SVG ${Date.now()}`;
      await saveTemplate(svgText, fileName);
      onImageUploaded(svgText, fileName);

      setSvgText('');
      setShowTextInput(false);
      Alert.alert('Success', 'SVG template loaded successfully!');
    } catch (error) {
      console.error('Error processing SVG:', error);
      Alert.alert('Error', 'Failed to process SVG content');
    } finally {
      setIsLoading(false);
    }
  }, [svgText, onImageUploaded, saveTemplate]);

  const selectPredefinedTemplate = useCallback(
    (template: any) => {
      onTemplateSelected({
        svgData: template.svgData,
        fileName: template.name,
      });
    },
    [onTemplateSelected]
  );

  const selectSavedTemplate = useCallback(
    async (template: any) => {
      try {
        const savedTemplate = await AsyncStorage.getItem(
          `svg_template_${template.id}`
        );
        if (savedTemplate) {
          const templateData = JSON.parse(savedTemplate);
          onTemplateSelected({
            svgData: templateData.svgData,
            fileName: templateData.name,
          });
        }
      } catch (error) {
        console.error('Failed to load saved template:', error);
        Alert.alert('Error', 'Failed to load saved template');
      }
    },
    [onTemplateSelected]
  );

  const openFileInput = useCallback(() => {
    Alert.alert('Upload SVG File', 'Choose how you want to add your SVG:', [
      { text: 'Paste SVG Code', onPress: () => setShowTextInput(true) },
      {
        text: 'Browse Web (External)',
        onPress: () =>
          Alert.alert(
            'Info',
            'Please copy SVG code from your preferred source and use "Paste SVG Code" option.'
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  return (
    <View style={styles.container}>
      {/* Main Upload Button */}
      <TouchableOpacity
        style={[styles.uploadButton, isLoading && styles.uploadButtonDisabled]}
        onPress={openFileInput}
        disabled={isLoading}
      >
        <Text style={styles.uploadButtonText}>
          {isLoading ? '⏳ Processing...' : '📁 Upload SVG'}
        </Text>
      </TouchableOpacity>

      {/* Text Input for SVG Code */}
      {showTextInput && (
        <View style={styles.textInputContainer}>
          <Text style={styles.inputLabel}>Paste your SVG code here:</Text>
          <TextInput
            style={styles.textInput}
            value={svgText}
            onChangeText={setSvgText}
            placeholder="<svg>...</svg>"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <View style={styles.inputActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                setShowTextInput(false);
                setSvgText('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.submitButton]}
              onPress={handlePasteSvg}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>Load SVG</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Predefined Templates */}
      <View style={styles.templatesSection}>
        <Text style={styles.sectionTitle}>Quick Templates</Text>
        <View style={styles.templatesGrid}>
          {predefinedTemplates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateButton}
              onPress={() => selectPredefinedTemplate(template)}
            >
              <Text style={styles.templateButtonText}>{template.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Saved Templates */}
      <View style={styles.savedTemplatesSection}>
        <TouchableOpacity
          style={styles.savedTemplatesHeader}
          onPress={() => {
            if (!showSavedTemplates) {
              loadSavedTemplates();
            }
            setShowSavedTemplates(!showSavedTemplates);
          }}
        >
          <Text style={styles.sectionTitle}>
            My Saved Templates {showSavedTemplates ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {showSavedTemplates && (
          <FlatList
            data={savedTemplates}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.savedTemplateItem}
                onPress={() => selectSavedTemplate(item)}
              >
                <Text style={styles.savedTemplateName}>{item.name}</Text>
                <Text style={styles.savedTemplateDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No saved templates yet</Text>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 15,
  },
  uploadButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  textInputContainer: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    backgroundColor: '#FFFFFF',
    minHeight: 120,
    fontSize: 14,
    color: '#1F2937',
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#10B981',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  templatesSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateButton: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    minWidth: 80,
  },
  templateButtonText: {
    color: '#4338CA',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  savedTemplatesSection: {
    gap: 8,
  },
  savedTemplatesHeader: {
    padding: 4,
  },
  savedTemplateItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 6,
  },
  savedTemplateName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  savedTemplateDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
});
