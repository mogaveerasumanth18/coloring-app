import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

import { WorkingColoringCanvas } from './WorkingColoringCanvas';
import { ZebraColoringCanvas } from './ZebraColoringCanvas';
import { NativeZebraCanvas } from './NativeZebraCanvas';

interface FullscreenCanvasProps {
  isVisible: boolean;
  onClose: () => void;
  templateUri?: string;
  selectedColor: string;
  selectedTool: 'brush' | 'bucket' | 'eraser';
  brushSize: number;
  onColoringChange?: () => void;
  onColoringComplete?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function FullscreenCanvas({
  isVisible,
  onClose,
  templateUri,
  selectedColor,
  selectedTool,
  brushSize,
  onColoringChange,
  onColoringComplete,
}: FullscreenCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [colors] = useState([
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', 
    '#eab308', '#22c55e', '#10b981', '#06b6d4', '#3b82f6',
  ]);
  const [currentColor, setCurrentColor] = useState(selectedColor);
  const [currentTool, setCurrentTool] = useState<'brush' | 'bucket' | 'eraser'>(selectedTool);
  const [currentBrushSize, setCurrentBrushSize] = useState(brushSize);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const canvasRef = useRef<any>(null);
  const captureViewRef = useRef<View>(null);

  useEffect(() => {
    if (isVisible && Platform.OS !== 'web') {
      // Lock to landscape when entering fullscreen
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      StatusBar.setHidden(true);
    }

    return () => {
      if (Platform.OS !== 'web') {
        // Restore portrait when leaving fullscreen
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        StatusBar.setHidden(false);
      }
    };
  }, [isVisible]);

  const handleClose = async () => {
    if (Platform.OS !== 'web') {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      StatusBar.setHidden(false);
    }
    onClose();
  };

  const handleSave = async () => {
    if (Platform.OS === 'web') {
      canvasRef.current?.save?.();
      return;
    }

    try {
      if (!captureViewRef.current) {
        Alert.alert('Save', 'Nothing to save yet.');
        return;
      }

      const { status: perm } = await MediaLibrary.requestPermissionsAsync();
      if (perm !== 'granted') {
        Alert.alert('Permission required', 'Allow Photos/Media permission to save your image.');
        return;
      }

      const uri = await captureRef(captureViewRef, { format: 'png', quality: 1 });

      const asset = await MediaLibrary.createAssetAsync(uri);
      let album = await MediaLibrary.getAlbumAsync('Coloring Book');
      if (!album) {
        album = await MediaLibrary.createAlbumAsync('Coloring Book', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
      Alert.alert('Saved to Gallery', 'Your masterpiece was saved to the Photos app!');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    }
  };

  if (!isVisible) return null;

  // Calculate optimal canvas size for fullscreen
  const getOptimalCanvasSize = () => {
    if (Platform.OS === 'web') {
      return { width: screenWidth * 0.9, height: screenHeight * 0.8 };
    } else {
      // For native (landscape mode), use most of the screen with padding
      const landscapeWidth = Math.max(screenWidth, screenHeight);
      const landscapeHeight = Math.min(screenWidth, screenHeight);
      
      // Leave space for floating buttons (top: 120px, bottom: 100px)
      const availableHeight = landscapeHeight - 220;
      const availableWidth = landscapeWidth - 40; // 20px padding on each side
      
      // Maintain aspect ratio while maximizing usage of available space
      const maxSize = Math.min(availableWidth, availableHeight);
      
      return { 
        width: Math.min(maxSize, availableWidth), 
        height: Math.min(maxSize, availableHeight) 
      };
    }
  };

  const canvasSize = getOptimalCanvasSize();

  return (
    <View style={styles.fullscreenContainer}>
      <SafeAreaView style={styles.safeArea}>
        {/* Full Screen Canvas */}
        <View style={styles.canvasSection}>
          <View style={[styles.canvasContainer, canvasSize]}>
            {(Platform.OS as any) === 'web' ? (
              templateUri ? (
                <WorkingColoringCanvas
                  ref={canvasRef}
                  selectedColor={currentColor}
                  selectedTool={currentTool}
                  brushSize={currentBrushSize}
                  templateUri={templateUri}
                />
              ) : (
                <View style={styles.emptyCanvas}>
                  <Text style={styles.emptyCanvasText}>Select a template to start coloring! 🎨</Text>
                </View>
              )
            ) : (
              templateUri ? (
                <View ref={captureViewRef} collapsable={false}>
                  {(Platform.OS as any) === 'web' ? (
                    <ZebraColoringCanvas
                      ref={canvasRef}
                      templateUri={templateUri}
                      selectedColor={currentColor}
                      selectedTool={currentTool}
                      brushSize={currentBrushSize}
                      onColoringChange={onColoringChange}
                    />
                  ) : (
                    <NativeZebraCanvas
                      ref={canvasRef}
                      templateUri={templateUri}
                      selectedColor={currentColor}
                      selectedTool={currentTool}
                      brushWidth={currentBrushSize}
                      onColoringComplete={onColoringComplete}
                      width={canvasSize.width}
                      height={canvasSize.height}
                    />
                  )}
                </View>
              ) : (
                <View style={styles.emptyCanvas}>
                  <Text style={styles.emptyCanvasText}>Select a template to start coloring! 🎨</Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* Floating Action Buttons - Top */}
        <View style={styles.topActionsContainer}>
          <View style={styles.actionRow}>
            {/* First Row - Undo, Redo, Zoom */}
            <TouchableOpacity style={styles.actionButton} onPress={() => canvasRef.current?.undo?.()}>
              <Ionicons name="arrow-undo" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Undo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={() => canvasRef.current?.redo?.()}>
              <Ionicons name="arrow-redo" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Redo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={() => setZoom(prev => Math.min(prev + 0.25, 3))}>
              <Feather name="zoom-in" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Zoom In</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}>
              <Feather name="zoom-out" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Zoom Out</Text>
            </TouchableOpacity>
            
            <View style={styles.zoomIndicator}>
              <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
            </View>
          </View>
          
          <View style={styles.actionRow}>
            {/* Second Row - Tools */}
            <TouchableOpacity 
              style={[styles.actionButton, currentTool === 'brush' && styles.activeActionButton]} 
              onPress={() => setCurrentTool('brush')}
            >
              <MaterialIcons name="brush" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Paint</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, currentTool === 'bucket' && styles.activeActionButton]} 
              onPress={() => setCurrentTool('bucket')}
            >
              <MaterialIcons name="format-color-fill" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Fill</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, currentTool === 'eraser' && styles.activeActionButton]} 
              onPress={() => setCurrentTool('eraser')}
            >
              <MaterialIcons name="auto-fix-off" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Eraser</Text>
            </TouchableOpacity>
            
            {/* Brush Size Control */}
            <View style={styles.sizeControl}>
              <Text style={styles.sizeLabel}>Size:</Text>
              <View style={styles.sizeIndicator}>
                <View style={[styles.sizeDot, { 
                  width: Math.max(8, Math.min(currentBrushSize, 20)),
                  height: Math.max(8, Math.min(currentBrushSize, 20)),
                }]} />
              </View>
              <Text style={styles.sizeText}>{currentBrushSize}px</Text>
            </View>

            {/* Color Picker Button */}
            <TouchableOpacity style={styles.colorPickerButton} onPress={() => setShowColorPicker(true)}>
              <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
              <Text style={styles.actionButtonText}>Color</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActionsContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Feather name="save" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>Save</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.clearButton} onPress={() => canvasRef.current?.clear?.()}>
            <MaterialIcons name="clear" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exitButton} onPress={handleClose}>
            <Feather name="minimize-2" size={18} color="#ffffff" />
            <Text style={styles.actionButtonText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowColorPicker(false)}
        >
          <View style={styles.colorPickerModal}>
            <Text style={styles.colorPickerTitle}>Choose Color</Text>
            <ScrollView contentContainerStyle={styles.colorGrid} showsVerticalScrollIndicator={false}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    currentColor === color && styles.selectedColorOption,
                  ]}
                  onPress={() => {
                    setCurrentColor(color);
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  canvasSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    maxWidth: '100%',
    maxHeight: '100%',
  },
  emptyCanvas: {
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    minWidth: 300,
    minHeight: 200,
  },
  emptyCanvasText: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
  },
  
  // Floating Action Buttons - Top
  topActionsContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  activeActionButton: {
    backgroundColor: '#4f46e5',
    transform: [{ scale: 1.05 }],
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  zoomIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  zoomText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Size Control
  sizeControl: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sizeLabel: {
    color: '#1f2937',
    fontSize: 12,
    fontWeight: '600',
  },
  sizeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeDot: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
  },
  sizeText: {
    color: '#1f2937',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Color Picker Button
  colorPickerButton: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  colorPreview: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  
  // Bottom Actions
  bottomActionsContainer: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    zIndex: 10,
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  clearButton: {
    backgroundColor: '#ef4444',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  exitButton: {
    backgroundColor: '#6b7280',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  // Color Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    maxHeight: 400,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  colorPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: '#1f2937',
    transform: [{ scale: 1.1 }],
  },
});
