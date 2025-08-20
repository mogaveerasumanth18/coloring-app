import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { EnhancedBitmapCanvas } from './EnhancedBitmapCanvas';
import { ImageUploaderEnhanced } from './ImageUploaderEnhanced';
import { BitmapTemplate } from './AssetConversionService';
import style from '@/app/(app)/style';
import { template } from '@babel/core';
import { styles } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetScrollable/BottomSheetFlashList';

/**
 * Main Coloring App Integration
 * 
 * This component demonstrates how to integrate the bitmap-based coloring system
 * following the insights from niccokunzmann/coloring-book for optimal performance
 * with complex line art.
 */

interface ColoringAppState {
  selectedTemplate: BitmapTemplate | null;
  showTemplateSelector: boolean;
  savedArtworks: Array<{
    uri: string;
    metadata: any;
    timestamp: string;
  }>;
}

export const BitmapColoringApp: React.FC = () => {
  const [appState, setAppState] = useState<ColoringAppState>({
    selectedTemplate: null,
    showTemplateSelector: true,
    savedArtworks: [],
  });

  // Handle bitmap template selection
  const handleBitmapTemplateSelected = useCallback((template: BitmapTemplate) => {
    setAppState(prev => ({
      ...prev,
      selectedTemplate: template,
      showTemplateSelector: false,
    }));
    
    console.log('📱 Selected bitmap template:', {
      id: template.id,
      name: template.name,
      size: `${template.originalSize.width}×${template.originalSize.height}px`,
      fileSize: `${Math.round(template.fileSize / 1024)}KB`,
    });
  }, []);

  // Handle legacy SVG template selection (fallback)
  const handleSvgTemplateSelected = useCallback((templateData: any) => {
    // Convert SVG to bitmap template format for compatibility
    const legacyTemplate: BitmapTemplate = {
      id: `svg_${Date.now()}`,
      name: templateData.fileName,
      description: 'Legacy SVG template (consider converting to bitmap)',
      bitmapUri: '', // Will be empty for SVG mode
      originalSize: { width: 600, height: 480 },
      fileSize: 0,
      createdAt: new Date().toISOString(),
    };

    Alert.alert(
      'Legacy SVG Template',
      'This is an SVG template. For better performance with complex line art, consider using bitmap templates instead.',
      [
        {
          text: 'Use SVG',
          onPress: () => {
            setAppState(prev => ({
              ...prev,
              selectedTemplate: legacyTemplate,
              showTemplateSelector: false,
            }));
          }
        },
        { text: 'Choose Bitmap Instead', style: 'cancel' }
      ]
    );
  }, []);

  // Handle artwork saving
  const handleArtworkSaved = useCallback((imageUri: string, metadata: any) => {
    const savedArtwork = {
      uri: imageUri,
      metadata,
      timestamp: new Date().toISOString(),
    };

    setAppState(prev => ({
      ...prev,
      savedArtworks: [...prev.savedArtworks, savedArtwork],
    }));

    console.log('🎨 Artwork saved:', {
      path: imageUri,
      templateUsed: metadata.templateName,
      colorsUsed: metadata.colorsUsed?.length || 0,
      pathCount: metadata.pathCount,
      size: `${metadata.canvasSize?.width}×${metadata.canvasSize?.height}px`,
    });

    Alert.alert(
      'Artwork Saved! 🎉',
      `Your coloring of "${metadata.templateName}" has been saved successfully!\n\nStats:\n• Colors used: ${metadata.colorsUsed?.length || 0}\n• Brush strokes: ${metadata.pathCount}\n• Canvas size: ${metadata.canvasSize?.width}×${metadata.canvasSize?.height}px`,
      [
        {
          text: 'Color Another',
          onPress: () => {
            setAppState(prev => ({
              ...prev,
              selectedTemplate: null,
              showTemplateSelector: true,
            }));
          }
        },
        { text: 'Continue Coloring', style: 'cancel' }
      ]
    );
  }, []);

  // Handle canvas close
  const handleCanvasClose = useCallback(() => {
    Alert.alert(
      'Close Canvas',
      'Are you sure you want to close the canvas? Any unsaved work will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: () => {
            setAppState(prev => ({
              ...prev,
              selectedTemplate: null,
              showTemplateSelector: true,
            }));
          }
        }
      ]
    );
  }, []);

  // Show app statistics
  const showAppStats = useCallback(() => {
    const totalSaved = appState.savedArtworks.length;
    const uniqueTemplates = new Set(appState.savedArtworks.map(a => a.metadata.templateId)).size;
    const totalColors = appState.savedArtworks.reduce((sum, a) => sum + (a.metadata.colorsUsed?.length || 0), 0);

    Alert.alert(
      '📊 App Statistics',
      `Artworks created: ${totalSaved}\nTemplates used: ${uniqueTemplates}\nTotal colors applied: ${totalColors}\n\nBitmap Performance Benefits:\n• Faster rendering for complex line art\n• Efficient flood fill operations\n• Consistent performance across devices\n• Optimized memory usage (600×480px standard)`
    );
  }, [appState.savedArtworks]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🎨 Bitmap Coloring Book</Text>
        <Text style={styles.headerSubtitle}>
          Powered by bitmap rendering for optimal performance
        </Text>
        {appState.savedArtworks.length > 0 && (
          <TouchableOpacity style={styles.statsButton} onPress={showAppStats}>
            <Text style={styles.statsButtonText}>📊 Stats ({appState.savedArtworks.length})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {appState.selectedTemplate ? (
        /* Canvas View */\n        <View style={styles.canvasContainer}>\n          <EnhancedBitmapCanvas\n            initialTemplate={appState.selectedTemplate}\n            onSave={handleArtworkSaved}\n            onClose={handleCanvasClose}\n          />\n        </View>\n      ) : (\n        /* Template Selection View */\n        <View style={styles.templateSelectorContainer}>\n          <ImageUploaderEnhanced\n            onBitmapTemplateSelected={handleBitmapTemplateSelected}\n            onTemplateSelected={handleSvgTemplateSelected}\n            onImageUploaded={(svgData, fileName) => {\n              console.log('SVG template uploaded:', fileName);\n            }}\n          />\n        </View>\n      )}\n\n      {/* Template Selector Modal (for re-selection) */}\n      <Modal\n        visible={appState.showTemplateSelector && !appState.selectedTemplate}\n        animationType=\"slide\"\n        presentationStyle=\"pageSheet\"\n      >\n        <SafeAreaView style={styles.modalContainer}>\n          <View style={styles.modalHeader}>\n            <Text style={styles.modalTitle}>Choose Your Template</Text>\n            <Text style={styles.modalSubtitle}>\n              Select a bitmap template for the best coloring experience\n            </Text>\n          </View>\n          \n          <ImageUploaderEnhanced\n            onBitmapTemplateSelected={(template) => {\n              handleBitmapTemplateSelected(template);\n              setAppState(prev => ({ ...prev, showTemplateSelector: false }));\n            }}\n            onTemplateSelected={(templateData) => {\n              handleSvgTemplateSelected(templateData);\n              setAppState(prev => ({ ...prev, showTemplateSelector: false }));\n            }}\n            onImageUploaded={(svgData, fileName) => {\n              console.log('Custom SVG uploaded:', fileName);\n              setAppState(prev => ({ ...prev, showTemplateSelector: false }));\n            }}\n          />\n        </SafeAreaView>\n      </Modal>\n\n      {/* Footer Info */}\n      <View style={styles.footer}>\n        <Text style={styles.footerText}>\n          💡 This app uses bitmap-based rendering following the approach of successful coloring book apps\n        </Text>\n        <Text style={styles.footerSubtext}>\n          Standard template size: 600×480px • Optimized for mobile performance\n        </Text>\n      </View>\n    </SafeAreaView>\n  );\n};\n\nconst styles = StyleSheet.create({\n  container: {\n    flex: 1,\n    backgroundColor: '#f8f9fa',\n  },\n  header: {\n    backgroundColor: 'white',\n    paddingVertical: 16,\n    paddingHorizontal: 20,\n    borderBottomWidth: 1,\n    borderBottomColor: '#e9ecef',\n    alignItems: 'center',\n  },\n  headerTitle: {\n    fontSize: 22,\n    fontWeight: '800',\n    color: '#333',\n    marginBottom: 4,\n  },\n  headerSubtitle: {\n    fontSize: 12,\n    color: '#666',\n    textAlign: 'center',\n  },\n  statsButton: {\n    marginTop: 8,\n    backgroundColor: '#007AFF',\n    paddingHorizontal: 12,\n    paddingVertical: 6,\n    borderRadius: 12,\n  },\n  statsButtonText: {\n    color: 'white',\n    fontSize: 12,\n    fontWeight: '600',\n  },\n  canvasContainer: {\n    flex: 1,\n  },\n  templateSelectorContainer: {\n    flex: 1,\n    padding: 16,\n  },\n  modalContainer: {\n    flex: 1,\n    backgroundColor: '#f8f9fa',\n  },\n  modalHeader: {\n    backgroundColor: 'white',\n    paddingVertical: 20,\n    paddingHorizontal: 20,\n    borderBottomWidth: 1,\n    borderBottomColor: '#e9ecef',\n    alignItems: 'center',\n  },\n  modalTitle: {\n    fontSize: 20,\n    fontWeight: '700',\n    color: '#333',\n    marginBottom: 4,\n  },\n  modalSubtitle: {\n    fontSize: 14,\n    color: '#666',\n    textAlign: 'center',\n  },\n  footer: {\n    backgroundColor: 'white',\n    paddingVertical: 12,\n    paddingHorizontal: 20,\n    borderTopWidth: 1,\n    borderTopColor: '#e9ecef',\n    alignItems: 'center',\n  },\n  footerText: {\n    fontSize: 12,\n    color: '#28a745',\n    textAlign: 'center',\n    marginBottom: 4,\n  },\n  footerSubtext: {\n    fontSize: 10,\n    color: '#6c757d',\n    textAlign: 'center',\n  },\n});\n\nexport default BitmapColoringApp;\n\n/**\n * Usage Example:\n * \n * ```tsx\n * import { BitmapColoringApp } from './src/components/BitmapColoringApp';\n * \n * export default function App() {\n *   return <BitmapColoringApp />;\n * }\n * ```\n * \n * This integration provides:\n * \n * 1. **Bitmap-First Approach**: Templates are converted to PNG format for better performance\n * 2. **Intelligent Template Selection**: Prioritizes bitmap templates over SVG for complex line art\n * 3. **Performance Monitoring**: Tracks rendering performance and memory usage\n * 4. **Asset Management**: Automatic conversion and caching of bitmap templates\n * 5. **Cross-Platform Optimization**: Works efficiently on both iOS and Android\n * \n * Performance Benefits:\n * - Faster rendering of complex line art\n * - More efficient flood fill operations\n * - Predictable memory usage\n * - Consistent performance across devices\n * - Better touch responsiveness\n * \n * Following niccokunzmann/coloring-book approach:\n * - Standard 600×480px bitmap size\n * - PNG format with optimized compression\n * - Black lines on white background\n * - Cached assets for quick loading\n * - Native-ready for advanced operations\n */";
