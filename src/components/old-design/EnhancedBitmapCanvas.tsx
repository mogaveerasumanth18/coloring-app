import {
  Canvas,
  Group,
  Image as SkiaImage,
  Path,
  Skia,
  useCanvasRef,
  useImage,
} from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Color palette optimized for kids' coloring apps
const COLOR_PALETTE = [
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#FFA500',
  '#800080',
  '#008000',
  '#000080',
  '#800000',
  '#808000',
  '#FFC0CB',
  '#A52A2A',
  '#808080',
  '#000000',
  '#FFFFFF',
  '#F0F0F0',
  '#FFB6C1',
  '#98FB98',
  '#87CEEB',
  '#F0E68C',
  '#DDA0DD',
  '#20B2AA',
];

interface EnhancedBitmapCanvasProps {
  onSave?: (imageUri: string, metadata: any) => void;
  onClose?: () => void;
  initialTemplate?: any;
}

export const EnhancedBitmapCanvas: React.FC<EnhancedBitmapCanvasProps> = ({
  onSave,
  onClose,
  initialTemplate,
}) => {
  const canvasRef = useCanvasRef();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(
    initialTemplate || null
  );
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(5);
  const [selectedTool, setSelectedTool] = useState<'brush' | 'bucket'>('brush');
  const [showTemplateModal, setShowTemplateModal] = useState(!initialTemplate);
  const [paths, setPaths] = useState<any[]>([]);
  const [undoHistory, setUndoHistory] = useState<any[]>([]);

  // Canvas dimensions optimized for mobile
  const canvasWidth = Math.min(screenWidth - 40, 600);
  const canvasHeight = Math.min(screenHeight - 200, 480);

  // Load line art image using Skia
  const lineArtImage = useImage(
    selectedTemplate?.imageUri || selectedTemplate?.bitmapUri
  );

  // Simple flood fill implementation - placeholder for native module
  const performFloodFill = useCallback(
    async (x: number, y: number) => {
      Alert.alert(
        'Flood Fill',
        `Would perform flood fill at (${Math.round(x)}, ${Math.round(y)}) with color ${selectedColor}`,
        [
          {
            text: 'Simulate Fill',
            onPress: () => {
              // Create a circular filled area as simulation
              const fillPath = Skia.Path.Make();
              fillPath.addCircle(x, y, brushSize * 4);

              const fillPathData = {
                path: fillPath,
                color: selectedColor,
                strokeWidth: 0,
                fill: true,
                id: Date.now(),
                tool: 'bucket',
              };

              setUndoHistory((prev) => [...prev, [...paths]]);
              setPaths((prev) => [...prev, fillPathData]);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    },
    [selectedColor, brushSize, paths]
  );

  // Save artwork with metadata
  const saveArtwork = useCallback(async () => {
    try {
      const snapshot = canvasRef.current?.makeImageSnapshot();
      if (!snapshot) {
        Alert.alert('Error', 'Failed to capture canvas');
        return;
      }

      const pngData = snapshot.encodeToBase64();
      const timestamp = new Date().toISOString();
      const fileName = `colored_artwork_${selectedTemplate?.id}_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, pngData, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const metadata = {
        templateId: selectedTemplate?.id,
        templateName: selectedTemplate?.name,
        timestamp,
        pathCount: paths.length,
        colorsUsed: [...new Set(paths.map((p) => p.color))],
        canvasSize: { width: canvasWidth, height: canvasHeight },
      };

      Alert.alert('Success', `Artwork saved as ${fileName}`);

      if (onSave) {
        onSave(fileUri, metadata);
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save artwork');
    }
  }, [canvasRef, onSave, selectedTemplate, paths, canvasWidth, canvasHeight]);

  // Undo functionality
  const undo = useCallback(() => {
    if (undoHistory.length > 0) {
      const previousState = undoHistory[undoHistory.length - 1];
      setPaths(previousState);
      setUndoHistory((prev) => prev.slice(0, -1));
    }
  }, [undoHistory]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    setUndoHistory((prev) => [...prev, [...paths]]);
    setPaths([]);
  }, [paths]);

  return (
    <View style={styles.container}>
      {/* Template Selection Modal */}
      <Modal
        visible={showTemplateModal}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enhanced Bitmap Canvas</Text>
            <Text style={styles.modalSubtitle}>
              Select a template to start coloring
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeModalButton}
            onPress={() => {
              setShowTemplateModal(false);
              if (onClose) onClose();
            }}
          >
            <Text style={styles.closeModalText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {selectedTemplate && (
        <>
          {/* Canvas with bitmap line art */}
          <View style={styles.canvasContainer}>
            <Text style={styles.canvasTitle}>
              {selectedTemplate.name || 'Bitmap Canvas'}
            </Text>
            <Canvas
              ref={canvasRef}
              style={[
                styles.canvas,
                { width: canvasWidth, height: canvasHeight },
              ]}
            >
              {/* Background bitmap line art */}
              {lineArtImage && (
                <SkiaImage
                  image={lineArtImage}
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  fit="contain"
                />
              )}

              {/* User drawings layered on top */}
              <Group>
                {paths.map((pathData) => (
                  <Path
                    key={pathData.id}
                    path={pathData.path}
                    color={pathData.color}
                    style={pathData.fill ? 'fill' : 'stroke'}
                    strokeWidth={pathData.strokeWidth}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                ))}
              </Group>
            </Canvas>
          </View>

          {/* Tool Selection */}
          <View style={styles.toolSelection}>
            <TouchableOpacity
              style={[
                styles.toolButton,
                selectedTool === 'brush' && styles.selectedTool,
              ]}
              onPress={() => setSelectedTool('brush')}
            >
              <Text style={styles.toolButtonText}>🖌 Brush</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toolButton,
                selectedTool === 'bucket' && styles.selectedTool,
              ]}
              onPress={() => setSelectedTool('bucket')}
            >
              <Text style={styles.toolButtonText}>🪣 Fill</Text>
            </TouchableOpacity>
          </View>

          {/* Color Palette */}
          <ScrollView
            horizontal
            style={styles.colorPalette}
            showsHorizontalScrollIndicator={false}
          >
            {COLOR_PALETTE.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColor,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </ScrollView>

          {/* Brush Size Control */}
          {selectedTool === 'brush' && (
            <View style={styles.brushSizeContainer}>
              <Text style={styles.brushSizeLabel}>
                Brush Size: {brushSize}px
              </Text>
              <View style={styles.brushSizeButtons}>
                {[2, 5, 8, 12, 16].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.brushSizeButton,
                      brushSize === size && styles.selectedBrushSize,
                    ]}
                    onPress={() => setBrushSize(size)}
                  >
                    <Text style={styles.brushSizeText}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                undoHistory.length === 0 && styles.disabledButton,
              ]}
              onPress={undo}
              disabled={undoHistory.length === 0}
            >
              <Text style={styles.actionButtonText}>
                ↶ Undo ({undoHistory.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={clearCanvas}>
              <Text style={styles.actionButtonText}>🗑 Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowTemplateModal(true)}
            >
              <Text style={styles.actionButtonText}>🎨 Templates</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={saveArtwork}>
              <Text style={styles.saveButtonText}>💾 Save PNG</Text>
            </TouchableOpacity>
          </View>

          {/* Info Footer */}
          <View style={styles.infoFooter}>
            <Text style={styles.infoText}>
              Bitmap Canvas • {paths.length} strokes • {selectedColor}
            </Text>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  canvasContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  canvasTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  canvas: {
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toolSelection: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  toolButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#e9ecef',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedTool: {
    backgroundColor: '#007AFF',
    borderColor: '#0056b3',
  },
  toolButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  colorPalette: {
    marginBottom: 16,
    maxHeight: 60,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    marginHorizontal: 4,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  selectedColor: {
    borderColor: '#333',
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },
  brushSizeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  brushSizeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  brushSizeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  brushSizeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    minWidth: 36,
    alignItems: 'center',
  },
  selectedBrushSize: {
    backgroundColor: '#007AFF',
  },
  brushSizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#6c757d',
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#adb5bd',
    opacity: 0.6,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#28a745',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  infoFooter: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  closeModalButton: {
    paddingVertical: 16,
    backgroundColor: '#dc3545',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});

EnhancedBitmapCanvas.displayName = 'EnhancedBitmapCanvas';
