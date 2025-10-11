import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

import { WorkingColoringCanvas } from './WorkingColoringCanvas';
import { ZebraColoringCanvas } from './ZebraColoringCanvas';
import { NativeZebraCanvas } from './NativeZebraCanvas';
import ColorPicker from 'react-native-wheel-color-picker';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedGestureHandler, runOnJS, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface FullscreenCanvasProps {
  isVisible: boolean;
  onClose: () => void;
  templateUri?: string;
  selectedColor: string;
  selectedTool: 'brush' | 'bucket' | 'eraser' | 'move';
  brushSize: number;
  onColoringChange?: () => void;
  onColoringComplete?: (dataUrl?: string) => void;
  initialCanvasData?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// --- Helpers to extract intrinsic image size from data URLs ---
function decodeBase64Prefix(b64: string, maxBytes: number): Uint8Array {
  const table: Record<string, number> = {};
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < chars.length; i++) table[chars[i]] = i;
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < b64.length && out.length < maxBytes; i++) {
    const c = b64[i];
    if (c === '=') break;
    const val = table[c];
    if (val === undefined) continue; // skip non-base64
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

function readU32BE(bytes: Uint8Array, off: number): number {
  return ((bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3]) >>> 0;
}

function tryParsePNG(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (bytes[i] !== sig[i]) return null;
  // IHDR width/height at byte 16..23
  const w = readU32BE(bytes, 16);
  const h = readU32BE(bytes, 20);
  if (w > 0 && h > 0) return { width: w, height: h };
  return null;
}

function tryParseJPEG(bytes: Uint8Array): { width: number; height: number } | null {
  // Minimal SOF scanner; need more than 2KB sometimes; we decode prefix generously in caller
  if (bytes.length < 4) return null;
  if (!(bytes[0] === 0xff && bytes[1] === 0xd8)) return null; // SOI
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    let marker = bytes[i + 1];
    i += 2;
    // Skip fill bytes 0xFF
    while (marker === 0xff && i < bytes.length) { marker = bytes[i]; i++; }
    if (i + 1 >= bytes.length) break;
    const len = (bytes[i] << 8) | bytes[i + 1];
    if (len < 2 || i + len >= bytes.length) break;
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      if (i + 7 < bytes.length) {
        const h = (bytes[i + 3] << 8) | bytes[i + 4];
        const w = (bytes[i + 5] << 8) | bytes[i + 6];
        if (w > 0 && h > 0) return { width: w, height: h };
      }
      break;
    }
    i += len;
  }
  return null;
}

function tryGetDataUrlSize(uri: string): { width: number; height: number } | null {
  if (!uri.startsWith('data:image/')) return null;
  const comma = uri.indexOf(',');
  if (comma < 0) return null;
  const meta = uri.slice(5, comma); // image/png;base64
  const b64 = uri.slice(comma + 1);
  // Decode up to 16KB which should be plenty to reach IHDR or SOF
  const prefix = decodeBase64Prefix(b64, 16 * 1024);
  if (meta.includes('png')) {
    const s = tryParsePNG(prefix);
    if (s) return s;
  }
  // Try JPEG
  const s2 = tryParseJPEG(prefix);
  return s2;
}

// Custom Color Picker Component using react-native-wheel-color-picker
const CustomColorPicker = ({
  selectedColor,
  onColorChange
}: {
  selectedColor: string;
  onColorChange: (color: string) => void;
}) => {
  return (
    <View style={{ padding: 16 }}>
      {/* Color Preview */}
      <View style={{
        width: '100%',
        height: 50,
        backgroundColor: selectedColor,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }} />

      {/* Clean Color Wheel - Only the wheel, no slider or extra elements */}
      <View style={{
        width: '100%',
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <ColorPicker
          color={selectedColor}
          onColorChange={(color: string) => {
            onColorChange(color);
          }}
          thumbSize={30}
          sliderSize={0}
          noSnap={true}
          row={false}
          swatches={false}
          swatchesOnly={false}
          discrete={false}
          useNativeDriver={true}
          useNativeLayout={false}
        />
      </View>
    </View>
  );
};

export default function FullscreenCanvas({
  isVisible,
  onClose,
  templateUri,
  selectedColor,
  selectedTool,
  brushSize,
  onColoringChange,
  onColoringComplete,
  initialCanvasData,
}: FullscreenCanvasProps) {
  const insets = useSafeAreaInsets();
  const [internalVisible, setInternalVisible] = useState(isVisible);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [colors] = useState([
    '#06b6d4', '#22d3ee', '#0ea5e9', '#3b82f6', '#60a5fa', '#2563eb',
    '#7c3aed', '#8b5cf6', '#a78bfa', '#db2777', '#ec4899', '#f472b6',
    '#ef4444', '#f87171', '#fb923c', '#f97316', '#fdba74', '#f59e0b',
    '#eab308', '#fde047', '#84cc16', '#22c55e', '#10b981', '#86efac',
    '#111827', '#374151', '#6b7280', '#9ca3af', '#e5e7eb', '#ffffff',
  ]);
  const [currentColor, setCurrentColor] = useState(selectedColor);
  const [currentTool, setCurrentTool] = useState<'brush' | 'bucket' | 'eraser' | 'move'>(selectedTool);
  const [currentBrushSize, setCurrentBrushSize] = useState(brushSize);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const canvasRef = useRef<any>(null);
  const captureViewRef = useRef<View>(null);
  const [templateSize, setTemplateSize] = useState<{ width: number; height: number } | null>(null);
  const uiOpacityAnim = useRef(new Animated.Value(1)).current;


  // Handle visibility state changes with transition management
  useEffect(() => {
    if (isTransitioning) return;

    if (isVisible && !internalVisible) {
      // Entering fullscreen
      setIsTransitioning(true);
      setInternalVisible(true);
      setTimeout(() => setIsTransitioning(false), 100);
    } else if (!isVisible && internalVisible) {
      // Exiting fullscreen
      setIsTransitioning(true);
      setInternalVisible(false);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [isVisible, internalVisible, isTransitioning]);

  // Function to handle tool interactions (no auto-hide functionality)
  const handleToolInteraction = () => {
    // UI is always visible, no need to manage visibility
  };

  // Ensure native canvas updates brush width instantly even if it caches the value internally
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Optional method on NativeZebraCanvas; no-op if not implemented
      canvasRef.current?.setBrushWidth?.(currentBrushSize);
    }
  }, [currentBrushSize]);

  useEffect(() => {
    // Remove orientation locking from child component - parent handles this
    if (isVisible && Platform.OS !== 'web') {
      StatusBar.setHidden(true);
    }

    return () => {
      if (Platform.OS !== 'web') {
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
    // If it's a data URL, try to parse dimensions directly to avoid layout flicker
    const parsed = tryGetDataUrlSize(templateUri);
    if (parsed) {
      setTemplateSize(parsed);
      return;
    }
    // Fallback to Image.getSize for file/http URIs
    Image.getSize(
      templateUri,
      (w, h) => setTemplateSize({ width: w, height: h }),
      () => setTemplateSize(null)
    );
  }, [templateUri]);

  const handleClose = async () => {
    // Remove orientation locking - parent component handles this
    if (Platform.OS !== 'web') {
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

  const handleClear = () => {
    // Native canvas exposes clear(); web may no-op if ref is not present
    canvasRef.current?.clear?.();
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
      visible={internalVisible}
      transparent={false}
      animationType="fade"
      presentationStyle="fullScreen"
      supportedOrientations={["landscape", "landscape-left", "landscape-right"]}
      statusBarTranslucent
    >
      <View style={styles.fullscreenContainer}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

          {/* Left Sidebar - Tool Palette */}
          <View style={styles.leftSidebar}>
            {/* Paint Tool */}
            <TouchableOpacity
              style={[
                styles.toolButtonLeft,
                currentTool === 'brush' && styles.toolButtonLeftActive
              ]}
              onPress={() => setCurrentTool('brush')}
            >
              <Feather name="edit-3" size={20} color="#ffffff" />
              <Text style={styles.toolButtonText}>Paint</Text>
            </TouchableOpacity>

            {/* Fill Tool */}
            <TouchableOpacity
              style={[
                styles.toolButtonLeft,
                currentTool === 'bucket' && styles.toolButtonLeftActive
              ]}
              onPress={() => setCurrentTool('bucket')}
            >
              <Feather name="droplet" size={20} color="#ffffff" />
              <Text style={styles.toolButtonText}>Fill</Text>
            </TouchableOpacity>

            {/* Eraser Tool */}
            <TouchableOpacity
              style={[
                styles.toolButtonLeft,
                currentTool === 'eraser' && styles.toolButtonLeftActive
              ]}
              onPress={() => setCurrentTool('eraser')}
            >
              <Feather name="square" size={20} color="#ffffff" />
              <Text style={styles.toolButtonText}>Eraser</Text>
            </TouchableOpacity>

            {/* Move Tool */}
            <TouchableOpacity
              style={[
                styles.toolButtonLeft,
                currentTool === 'move' && styles.toolButtonLeftActive
              ]}
              onPress={() => setCurrentTool('move')}
            >
              <Feather name="move" size={20} color="#ffffff" />
              <Text style={styles.toolButtonText}>Move</Text>
            </TouchableOpacity>

            {/* Color Tool - Opens color picker */}
            <TouchableOpacity
              style={styles.toolButtonLeft}
              onPress={() => setShowColorPicker(true)}
            >
              <Feather name="aperture" size={20} color="#ffffff" />
              <Text style={styles.toolButtonText}>Color</Text>
            </TouchableOpacity>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Color Preview */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Color:</Text>
              <TouchableOpacity
                style={[styles.colorPreview, { backgroundColor: currentColor }]}
                onPress={() => setShowColorPicker(true)}
              />
            </View>

            {/* Size Preview */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Size:</Text>
              <TouchableOpacity
                style={styles.sizePreview}
                onPress={() => setShowSizePicker(true)}
              >
                <View
                  style={[
                    styles.sizeCircle,
                    {
                      width: Math.max(8, Math.min(28, currentBrushSize * 0.6)),
                      height: Math.max(8, Math.min(28, currentBrushSize * 0.6)),
                    }
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content Area */}
          <View style={styles.mainContent}>
            {/* Top Action Bar */}
            <View style={styles.topActionBar}>
              {/* Undo */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => canvasRef.current?.undo?.()}
              >
                <Ionicons name="arrow-undo" size={24} color="#ffffff" />
              </TouchableOpacity>

              {/* Redo */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => canvasRef.current?.redo?.()}
              >
                <Ionicons name="arrow-redo" size={24} color="#ffffff" />
              </TouchableOpacity>

              {/* Fullscreen Exit */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleClose}
              >
                <MaterialIcons name="fullscreen-exit" size={24} color="#ffffff" />
              </TouchableOpacity>

              {/* Export (placeholder) */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSave}
              >
                <Feather name="share" size={24} color="#ffffff" />
              </TouchableOpacity>

              {/* Save */}
              <TouchableOpacity
                style={[styles.actionButton, styles.saveActionButton]}
                onPress={handleSave}
              >
                <Feather name="save" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Canvas Area */}
            <View
              style={styles.canvasArea}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width && height) setCanvasSize({ width, height });
              }}
            >
              {templateUri ? (
                !templateSize ? (
                  <View style={styles.emptyCanvas}>
                    <Text style={styles.emptyCanvasText}>Loading image…</Text>
                  </View>
                ) : (
                  <View
                    ref={captureViewRef}
                    collapsable={false}
                    style={[
                      {
                        width: computeFit(canvasSize, templateSize).width,
                        height: computeFit(canvasSize, templateSize).height,
                      }
                    ]}
                  >
                    {Platform.OS === 'web' ? (
                      <WorkingColoringCanvas
                        selectedColor={currentColor}
                        selectedTool={currentTool === 'move' ? 'brush' : currentTool}
                        brushSize={currentBrushSize}
                        templateUri={templateUri}
                        width={computeFit(canvasSize, templateSize).width}
                        height={computeFit(canvasSize, templateSize).height}
                      />
                    ) : (
                      <NativeZebraCanvas
                        ref={canvasRef}
                        templateUri={templateUri}
                        selectedColor={currentColor}
                        selectedTool={currentTool === 'move' ? 'brush' : currentTool}
                        brushWidth={currentBrushSize}
                        onColoringComplete={onColoringComplete}
                        width={computeFit(canvasSize, templateSize).width}
                        height={computeFit(canvasSize, templateSize).height}
                        initialDataUrl={initialCanvasData}
                      />
                    )}
                  </View>
                )
              ) : (
                <View style={styles.emptyCanvas}>
                  <Text style={styles.emptyCanvasText}>Select a template to start coloring! 🎨</Text>
                </View>
              )}
            </View>
          </View>

          {/* Right Side Elements */}
          <View style={styles.rightSide}>
            {/* Play Button (placeholder) */}
            <TouchableOpacity style={styles.playButton}>
              <Feather name="play" size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Quick Color Swatches */}
            <View style={styles.quickSwatches}>
              <TouchableOpacity
                style={[styles.quickSwatch, { backgroundColor: '#000000' }]}
                onPress={() => setCurrentColor('#000000')}
              />
              <TouchableOpacity
                style={[styles.quickSwatch, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb' }]}
                onPress={() => setCurrentColor('#ffffff')}
              />
            </View>
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
              <Text style={styles.modalTitle}>Pick a Color</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.colorGrid}>
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
                </View>

                {/* Custom color picker with spectrum */}
                <View style={styles.customColorPickerContainer}>
                  <CustomColorPicker
                    selectedColor={currentColor}
                    onColorChange={(color) => {
                      setCurrentColor(color);
                      setShowColorPicker(false);
                    }}
                  />
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Size Picker Modal */}
        <Modal
          visible={showSizePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSizePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSizePicker(false)}
          >
            <View style={styles.sizePickerModal}>
              <Text style={styles.modalTitle}>Brush Size</Text>
              <View style={styles.sizePreviewLarge}>
                <View
                  style={[
                    styles.sizeCircleLarge,
                    {
                      width: Math.max(10, Math.min(100, currentBrushSize * 2)),
                      height: Math.max(10, Math.min(100, currentBrushSize * 2)),
                      backgroundColor: currentColor,
                    }
                  ]}
                />
              </View>
              <Text style={styles.sizeValueText}>{Math.round(currentBrushSize)}px</Text>
              <Slider
                style={styles.sizeSlider}
                value={currentBrushSize}
                onValueChange={setCurrentBrushSize}
                minimumValue={2}
                maximumValue={50}
                step={1}
                minimumTrackTintColor="#6366f1"
                maximumTrackTintColor="#e5e7eb"
              />
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSizePicker(false)}
              >
                <Text style={styles.modalCloseButtonText}>Done</Text>
              </TouchableOpacity>
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
    backgroundColor: '#e5e5e5',
  },
  safeArea: {
    flex: 1,
    flexDirection: 'row',
  },

  // Left Sidebar
  leftSidebar: {
    width: 150,
    backgroundColor: 'transparent',
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  toolButtonLeft: {
    backgroundColor: '#6366f1',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolButtonLeftActive: {
    backgroundColor: '#4f46e5',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  toolButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  previewContainer: {
    marginTop: 16,
  },
  previewLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  colorPreview: {
    width: 120,
    height: 36,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  sizePreview: {
    width: 120,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeCircle: {
    backgroundColor: '#6366f1',
    borderRadius: 100,
  },

  // Main Content
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  topActionBar: {
    height: 60,
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveActionButton: {
    backgroundColor: '#10b981',
  },
  canvasArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
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
    padding: 20,
  },
  emptyCanvasText: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
  },

  // Right Side
  rightSide: {
    width: 80,
    paddingTop: 80,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  quickSwatches: {
    gap: 12,
  },
  quickSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },

  // Modals
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
    maxHeight: '85%',
    minWidth: 320,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(17,24,39,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedColorOption: {
    borderColor: '#6366f1',
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },
  customColorPickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Size Picker Modal
  sizePickerModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    minWidth: 320,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  sizePreviewLarge: {
    width: '100%',
    height: 120,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  sizeCircleLarge: {
    borderRadius: 100,
  },
  sizeValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  sizeSlider: {
    width: '100%',
    height: 40,
  },
  modalCloseButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
