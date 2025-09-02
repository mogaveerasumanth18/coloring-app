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
  Image,
} from 'react-native';
import Slider from '@react-native-community/slider';
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
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
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
  const [templateSize, setTemplateSize] = useState<{ width: number; height: number } | null>(null);
  const [roundedCorners, setRoundedCorners] = useState(false);

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

  // Fetch template intrinsic size (for aspect-fit) when URI changes
  useEffect(() => {
    if (!templateUri) {
      setTemplateSize(null);
      return;
    }
    Image.getSize(
      templateUri,
      (w, h) => setTemplateSize({ width: w, height: h }),
      () => setTemplateSize(null)
    );
  }, [templateUri]);

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

  // Use a full-screen Modal so the overlay truly covers the entire screen

  // Full bleed canvas: let container flex and fill; child receives width/height via onLayout
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: screenWidth,
    height: screenHeight,
  });

  const computeFit = (
    container: { width: number; height: number },
    content: { width: number; height: number } | null
  ): { width: number; height: number } => {
    if (!content || content.width === 0 || content.height === 0) {
      return container;
    }
    const cw = container.width;
    const ch = container.height;
    const arContent = content.width / content.height;
    const arContainer = cw / ch;
    if (arContent > arContainer) {
      // content wider than container
      const width = cw;
      const height = Math.round(cw / arContent);
      return { width, height };
    } else {
      const height = ch;
      const width = Math.round(ch * arContent);
      return { width, height };
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={false}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      // iOS hint; Android will follow lockAsync
      supportedOrientations={["landscape", "landscape-left", "landscape-right"]}
      statusBarTranslucent
    >
    <View style={styles.fullscreenContainer}>
      <SafeAreaView style={styles.safeArea}>
        {/* Full Screen Canvas */}
        <View style={styles.canvasSection}>
          <View
            style={[
              styles.canvasContainer,
              roundedCorners && { borderRadius: 12 },
            ]}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (width && height) setCanvasSize({ width, height });
            }}
          >
            {(Platform.OS as any) === 'web' ? (
              templateUri ? (
                <View
                  ref={captureViewRef}
                  collapsable={false}
                  style={{
                    width: computeFit(canvasSize, templateSize).width,
                    height: computeFit(canvasSize, templateSize).height,
                    transform: [{ scale: zoom }],
                  }}
                >
                  <WorkingColoringCanvas
                    ref={canvasRef}
                    selectedColor={currentColor}
                    selectedTool={currentTool}
                    brushSize={currentBrushSize}
                    templateUri={templateUri}
                    width={computeFit(canvasSize, templateSize).width}
                    height={computeFit(canvasSize, templateSize).height}
                  />
                </View>
              ) : (
                <View style={styles.emptyCanvas}>
                  <Text style={styles.emptyCanvasText}>Select a template to start coloring! 🎨</Text>
                </View>
              )
            ) : (
              templateUri ? (
                <View
                  ref={captureViewRef}
                  collapsable={false}
                  style={{
                    width: computeFit(canvasSize, templateSize).width,
                    height: computeFit(canvasSize, templateSize).height,
                    transform: [{ scale: zoom }],
                  }}
                >
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
                      width={computeFit(canvasSize, templateSize).width}
                      height={computeFit(canvasSize, templateSize).height}
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
            
              <TouchableOpacity style={styles.actionButton} onPress={() => setZoom(prev => clampZoom(prev + 0.25))}>
              <Feather name="zoom-in" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Zoom In</Text>
            </TouchableOpacity>
            
              <TouchableOpacity style={styles.actionButton} onPress={() => setZoom(prev => clampZoom(prev - 0.25))}>
              <Feather name="zoom-out" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Zoom Out</Text>
            </TouchableOpacity>
            
            <View style={styles.zoomIndicator}>
              <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
            </View>
              <TouchableOpacity style={styles.actionButton} onPress={() => setZoom(1)}>
                <Feather name="refresh-ccw" size={18} color="#ffffff" />
                <Text style={styles.actionButtonText}>Reset</Text>
              </TouchableOpacity>
            {/* Rounded corners toggle */}
            <TouchableOpacity
              style={[styles.actionButton, roundedCorners && styles.activeActionButton]}
              onPress={() => setRoundedCorners((v) => !v)}
            >
              <Feather name="corner-right-down" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>{roundedCorners ? 'Rounded' : 'Square'}</Text>
            </TouchableOpacity>
          </View>

            {/* Zoom slider */}
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>Zoom</Text>
              <Slider
                style={styles.zoomSlider}
                minimumValue={MIN_ZOOM}
                maximumValue={MAX_ZOOM}
                value={zoom}
                step={0.01}
                onValueChange={(v: number) => setZoom(clampZoom(v))}
                minimumTrackTintColor="#6366f1"
                maximumTrackTintColor="#CBD5E1"
                thumbTintColor="#6366f1"
              />
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
  flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  canvasSection: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 10,
  paddingVertical: 10,
  },
  canvasContainer: {
  backgroundColor: '#ffffff',
  borderRadius: 0,
  overflow: 'hidden',
  width: '100%',
  height: '100%',
  maxWidth: '100%',
  maxHeight: '100%',
  alignItems: 'center',
  justifyContent: 'center',
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
  top: 24,
  left: 16,
  right: 16,
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
  // Zoom slider row
  sliderRow: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderLabel: {
    color: '#1f2937',
    fontSize: 12,
    fontWeight: '600',
  },
  zoomSlider: {
    flex: 1,
    height: 32,
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
  bottom: 24,
  right: 16,
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
