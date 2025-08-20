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
  console.log('🦋 OLD ImageUploader component loaded!');
  const [isLoading, setIsLoading] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [svgText, setSvgText] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [showSavedTemplates, setShowSavedTemplates] = useState(false);

  // Predefined templates - combining simple ones with asset templates
  const predefinedTemplates = [
    // Simple geometric templates
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
    // Asset templates from the assets folder
    {
      id: 'cel-cake-wedding',
      name: 'Wedding Cake',
      svgData: `<svg width="300" height="300" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M35.12,11.817 C36.302,10.48 36.301,8.387 35.119,7.05 C34.52,6.372 33.713,5.999 32.848,5.999 C32.165,5.999 31.519,6.23 30.999,6.644 C29.782,5.687 27.949,5.845 26.884,7.05 C25.701,8.387 25.701,10.482 26.881,11.815 L30.25,15.659 C30.44,15.876 30.714,16 31.002,16 C31.29,16 31.564,15.876 31.754,15.659 L35.12,11.817 Z M28.379,10.493 C27.871,9.92 27.872,8.95 28.379,8.376 C28.593,8.134 28.868,8 29.153,8 C29.438,8 29.713,8.134 29.961,8.411 L30.284,8.742 C30.66,9.129 31.339,9.129 31.715,8.742 L32.072,8.376 C32.286,8.133 32.561,8 32.846,8 C33.131,8 33.405,8.133 33.619,8.375 C34.127,8.95 34.127,9.92 33.619,10.493 L31,13.482 L28.379,10.493 Z" fill="none" stroke="#000000" stroke-width="1"/>
        <path d="M56,24 L56,26 L8,26 L8,24 L56,24 Z M54,22 L10,22 L10,20 L54,20 L54,22 Z M52,18 L12,18 L12,16 L52,16 L52,18 Z M50,14 L14,14 L14,12 L50,12 L50,14 Z M48,10 L16,10 L16,8 L48,8 L48,10 Z M46,6 L18,6 L18,4 L46,4 L46,6 Z M44,2 L20,2 L20,0 L44,0 L44,2 Z" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="32" cy="40" r="12" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="32" cy="40" r="8" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="32" cy="40" r="4" fill="none" stroke="#000000" stroke-width="1"/>
        <path d="M20,52 L44,52 L44,60 L20,60 L20,52 Z" fill="none" stroke="#000000" stroke-width="1"/>
        <rect x="22" y="54" width="4" height="4" fill="none" stroke="#000000" stroke-width="1"/>
        <rect x="30" y="54" width="4" height="4" fill="none" stroke="#000000" stroke-width="1"/>
        <rect x="38" y="54" width="4" height="4" fill="none" stroke="#000000" stroke-width="1"/>
      </svg>`,
    },
    {
      id: 'hat-chef',
      name: 'Chef Hat',
      svgData: `<svg width="300" height="300" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M32,8 C36,8 42,10 46,14 C50,18 52,24 50,30 C48,36 44,38 40,40 L40,48 L24,48 L24,40 C20,38 16,36 14,30 C12,24 14,18 18,14 C22,10 28,8 32,8 Z" fill="none" stroke="#000000" stroke-width="2"/>
        <rect x="20" y="48" width="24" height="8" fill="none" stroke="#000000" stroke-width="2"/>
        <line x1="22" y1="50" x2="42" y2="50" stroke="#000000" stroke-width="1"/>
        <line x1="22" y1="52" x2="42" y2="52" stroke="#000000" stroke-width="1"/>
        <line x1="22" y1="54" x2="42" y2="54" stroke="#000000" stroke-width="1"/>
        <circle cx="28" cy="20" r="3" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="36" cy="16" r="2" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="40" cy="24" r="2" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="24" cy="26" r="2" fill="none" stroke="#000000" stroke-width="1"/>
      </svg>`,
    },
    {
      id: 'bola-basket-basketball',
      name: 'Basketball',
      svgData: `<svg width="300" height="300" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="24" fill="none" stroke="#000000" stroke-width="2"/>
        <path d="M8,32 Q32,8 56,32" fill="none" stroke="#000000" stroke-width="1"/>
        <path d="M8,32 Q32,56 56,32" fill="none" stroke="#000000" stroke-width="1"/>
        <line x1="32" y1="8" x2="32" y2="56" stroke="#000000" stroke-width="1"/>
        <line x1="8" y1="32" x2="56" y2="32" stroke="#000000" stroke-width="1"/>
      </svg>`,
    },
    {
      id: 'clo-polo',
      name: 'Polo Shirt',
      svgData: `<svg width="300" height="300" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M20,16 L20,12 L44,12 L44,16 L40,20 L40,56 L24,56 L24,20 L20,16 Z" fill="none" stroke="#000000" stroke-width="2"/>
        <path d="M20,16 L16,20 L16,24 L20,20" fill="none" stroke="#000000" stroke-width="2"/>
        <path d="M44,16 L48,20 L48,24 L44,20" fill="none" stroke="#000000" stroke-width="2"/>
        <rect x="28" y="16" width="8" height="6" fill="none" stroke="#000000" stroke-width="1"/>
        <line x1="30" y1="18" x2="34" y2="18" stroke="#000000" stroke-width="1"/>
        <line x1="30" y1="20" x2="34" y2="20" stroke="#000000" stroke-width="1"/>
        <line x1="26" y1="28" x2="38" y2="28" stroke="#000000" stroke-width="1"/>
        <line x1="26" y1="32" x2="38" y2="32" stroke="#000000" stroke-width="1"/>
      </svg>`,
    },
    {
      id: 'water-container',
      name: 'Water Container',
      svgData: `<svg width="300" height="300" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M24,8 L40,8 L38,56 L26,56 L24,8 Z" fill="none" stroke="#000000" stroke-width="2"/>
        <rect x="22" y="4" width="20" height="8" fill="none" stroke="#000000" stroke-width="2"/>
        <line x1="26" y1="6" x2="38" y2="6" stroke="#000000" stroke-width="1"/>
        <path d="M26,20 Q32,24 38,20" fill="none" stroke="#000000" stroke-width="1"/>
        <path d="M26,28 Q32,32 38,28" fill="none" stroke="#000000" stroke-width="1"/>
        <path d="M26,36 Q32,40 38,36" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="30" cy="16" r="1" fill="#000000"/>
        <circle cx="34" cy="18" r="1" fill="#000000"/>
        <circle cx="32" cy="24" r="1" fill="#000000"/>
      </svg>`,
    },
    {
      id: 'butterfly',
      name: 'Beautiful Butterfly',
      svgData: `<svg width="300" height="300" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="30" cy="30" rx="15" ry="25" fill="none" stroke="#000000" stroke-width="2"/>
        <ellipse cx="70" cy="30" rx="15" ry="25" fill="none" stroke="#000000" stroke-width="2"/>
        <ellipse cx="30" cy="70" rx="12" ry="20" fill="none" stroke="#000000" stroke-width="2"/>
        <ellipse cx="70" cy="70" rx="12" ry="20" fill="none" stroke="#000000" stroke-width="2"/>
        <line x1="50" y1="20" x2="50" y2="80" stroke="#000000" stroke-width="3"/>
        <circle cx="50" cy="25" r="3" fill="none" stroke="#000000" stroke-width="2"/>
        <line x1="48" y1="20" x2="45" y2="15" stroke="#000000" stroke-width="2"/>
        <line x1="52" y1="20" x2="55" y2="15" stroke="#000000" stroke-width="2"/>
        <circle cx="35" cy="35" r="3" fill="none" stroke="#000000" stroke-width="1"/>
        <circle cx="65" cy="35" r="3" fill="none" stroke="#000000" stroke-width="1"/>
        <path d="M35,45 Q40,40 35,50" fill="none" stroke="#000000" stroke-width="1"/>
        <path d="M65,45 Q60,40 65,50" fill="none" stroke="#000000" stroke-width="1"/>
      </svg>`,
    },
  ].filter((template) => template.svgData); // Filter out any templates that failed to load

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
