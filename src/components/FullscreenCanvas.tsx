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
  Pressable,
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
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler, GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedGestureHandler, runOnJS, useAnimatedStyle, withSpring, useAnimatedReaction } from 'react-native-reanimated';
import Reanimated from 'react-native-reanimated';

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
    <View style={{ padding: 16 }} pointerEvents="box-none">
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
      }} pointerEvents="box-none" />

      {/* Clean Color Wheel - Only the wheel, no slider or extra elements */}
      <View style={{
        width: '100%',
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }} pointerEvents="box-none">
        <ColorPicker
          color={selectedColor}
          onColorChange={(color: string) => {
            console.log('Color picker value changed:', color);
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
          gapSize={0}
          autoResetSlider={false}
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
  const [currentScale, setCurrentScale] = useState(1);
  const canvasRef = useRef<any>(null);
  const captureViewRef = useRef<View>(null);
  const [templateSize, setTemplateSize] = useState<{ width: number; height: number } | null>(null);
  const uiOpacityAnim = useRef(new Animated.Value(1)).current;

  // Zoom and pan state for Move tool
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const canvasWidthSV = useSharedValue(0);
  const canvasHeightSV = useSharedValue(0);

  // Zoom functions
  const handleZoomIn = () => {
    const newScale = Math.min(scale.value + 0.5, 4);
    scale.value = withSpring(newScale, { damping: 15, stiffness: 150 });
    savedScale.value = newScale;
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale.value - 0.5, 1);
    scale.value = withSpring(newScale, { damping: 15, stiffness: 150 });
    savedScale.value = newScale;
    if (newScale === 1) {
      translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  };

  const handleResetZoom = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    translateX.value = withSpring(0, { damping: 15, stiffness: 150 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  // Don't reset zoom when switching tools - let user control zoom independently

  // Pinch-to-zoom gesture
  const pinchGesture = Gesture.Pinch()
    .enabled(currentTool === 'move')
    .onUpdate((event) => {
      'worklet';
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      'worklet';
      if (scale.value < 1) {
        scale.value = withSpring(1);
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
      }
      savedScale.value = scale.value;

      if (scale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  // Revamped pan gesture for proper move functionality
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .shouldCancelWhenOutside(false)
    .enabled(currentTool === 'move')
    .onStart(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      'worklet';
      if (currentTool === 'move') {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      'worklet';
      // Calculate proper boundaries based on actual canvas size and zoom
      const canvasWidth = canvasWidthSV.value - 32; // Account for padding
      const canvasHeight = canvasHeightSV.value - 100; // Account for UI elements

      const scaledWidth = canvasWidth * scale.value;
      const scaledHeight = canvasHeight * scale.value;

      // Only constrain if zoomed in (scale > 1)
      if (scale.value > 1) {
        const maxTranslateX = (scaledWidth - canvasWidth) / 2;
        const maxTranslateY = (scaledHeight - canvasHeight) / 2;

        translateX.value = withSpring(
          Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value)),
          { damping: 20, stiffness: 200 }
        );
        translateY.value = withSpring(
          Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value)),
          { damping: 20, stiffness: 200 }
        );
      } else {
        // Reset to center when not zoomed
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Additional pan gesture for two-finger panning when zoomed (regardless of tool)
  const twoFingerPanGesture = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .enabled(currentTool === 'move' && scale.value > 1)
    .onStart(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      'worklet';
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      'worklet';
      const canvasWidth = canvasWidthSV.value - 32;
      const canvasHeight = canvasHeightSV.value - 100;

      const scaledWidth = canvasWidth * scale.value;
      const scaledHeight = canvasHeight * scale.value;

      const maxTranslateX = (scaledWidth - canvasWidth) / 2;
      const maxTranslateY = (scaledHeight - canvasHeight) / 2;

      translateX.value = withSpring(
        Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX.value)),
        { damping: 20, stiffness: 200 }
      );
      translateY.value = withSpring(
        Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY.value)),
        { damping: 20, stiffness: 200 }
      );

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Combine gestures: pinch, one-finger pan (move tool), and two-finger pan (zoom)
  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(panGesture, twoFingerPanGesture)
  );

  // Animated style for canvas transform
  const animatedCanvasStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Track scale changes for UI updates
  useAnimatedReaction(
    () => scale.value,
    (currentValue) => {
      runOnJS(setCurrentScale)(currentValue);
    }
  );

  // Sync external props with internal state when they change
  useEffect(() => {
    setCurrentColor(selectedColor);
  }, [selectedColor]);

  useEffect(() => {
    setCurrentTool(selectedTool);
  }, [selectedTool]);

  useEffect(() => {
    setCurrentBrushSize(brushSize);
  }, [brushSize]);

  // Log current state for debugging
  useEffect(() => {
    console.log('Fullscreen Canvas State:', {
      currentTool,
      currentColor,
      currentBrushSize,
      templateUri: templateUri ? 'present' : 'none'
    });
  }, [currentTool, currentColor, currentBrushSize, templateUri]);


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
    // Reset orientation to portrait when exiting fullscreen
    if (Platform.OS !== 'web') {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } catch (error) {
        console.error('Failed to lock portrait orientation:', error);
      }
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
    Alert.alert(
      'Clear Canvas',
      'Are you sure you want to erase everything? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // Native canvas exposes clear(); web may no-op if ref is not present
            canvasRef.current?.clear?.();
          },
        },
      ]
    );
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
      <GestureHandlerRootView style={{ flex: 1 }}>
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
              onPress={() => {
                console.log('Paint tool selected');
                setCurrentTool('brush');
              }}
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
              onPress={() => {
                console.log('Fill tool selected');
                setCurrentTool('bucket');
              }}
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
              onPress={() => {
                console.log('Eraser tool selected');
                setCurrentTool('eraser');
              }}
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
              onPress={() => {
                console.log('Move tool selected');
                setCurrentTool('move');
              }}
            >
              <Feather name="move" size={20} color="#ffffff" />
              <View style={styles.toolButtonTextContainer}>
                <Text style={styles.toolButtonText}>Move</Text>
                {currentTool === 'move' && (
                  <Text style={styles.toolButtonSubtext}>
                    {currentScale > 1 ? `Navigate ${currentScale.toFixed(1)}x` : 'Pan & Move'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Color Tool - Opens color picker */}
            <TouchableOpacity
              style={styles.toolButtonLeft}
              onPress={() => {
                console.log('Opening color picker');
                setShowColorPicker(true);
              }}
            >
              <Feather name="aperture" size={20} color="#ffffff" />
              <Text style={styles.toolButtonText}>Color</Text>
            </TouchableOpacity>

            {/* Spacer - minimal to fit previews */}
            <View style={{ flex: 0.05 }} />

            {/* Compact Preview Section */}
            <View style={styles.compactPreviewSection}>
              {/* Color Preview */}
              <View style={styles.compactPreviewContainer}>
                <Text style={styles.compactPreviewLabel}>Color:</Text>
                <TouchableOpacity
                  style={[styles.compactColorPreview, { backgroundColor: currentColor }]}
                  onPress={() => {
                    console.log('Color preview tapped, opening picker');
                    setShowColorPicker(true);
                  }}
                />
              </View>

              {/* Size Preview */}
              <View style={styles.compactPreviewContainer}>
                <Text style={styles.compactPreviewLabel}>Size:</Text>
                <TouchableOpacity
                  style={styles.compactSizePreview}
                  onPress={() => {
                    console.log('Size preview tapped, opening picker');
                    setShowSizePicker(true);
                  }}
                >
                  <View
                    style={[
                      styles.compactSizeCircle,
                      {
                        width: Math.max(4, Math.min(16, currentBrushSize * 0.3)),
                        height: Math.max(4, Math.min(16, currentBrushSize * 0.3)),
                      }
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Main Content Area */}
          <View style={styles.mainContent}>
            {/* Top Action Bar */}
            <View style={styles.topActionBar}>
              {/* Spacer to push buttons to the right */}
              <View style={{ flex: 1 }} />

              {/* Zoom Out */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleZoomOut}
              >
                <Ionicons name="remove" size={24} color="#ffffff" />
              </TouchableOpacity>

              {/* Reset Zoom */}
              <TouchableOpacity
                style={[styles.actionButton, currentScale > 1 && styles.actionButtonActive]}
                onPress={handleResetZoom}
              >
                <MaterialIcons name="center-focus-strong" size={24} color="#ffffff" />
              </TouchableOpacity>

              {/* Zoom In */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleZoomIn}
              >
                <Ionicons name="add" size={24} color="#ffffff" />
              </TouchableOpacity>

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

              {/* Clear Canvas */}
              <TouchableOpacity style={styles.actionButton} onPress={handleClear}>
                <Ionicons name="trash-outline" size={24} color="#ffffff" />
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
              style={[
                styles.canvasArea,
                currentTool === 'move' && styles.canvasAreaMoveMode
              ]}
              onLayout={(e) => {
                const { width, height } = e.nativeEvent.layout;
                if (width && height) {
                  setCanvasSize({ width, height });
                  canvasWidthSV.value = width;
                  canvasHeightSV.value = height;
                }
              }}
            >

              {templateUri ? (
                !templateSize ? (
                  <View style={styles.emptyCanvas}>
                    <Text style={styles.emptyCanvasText}>Loading image…</Text>
                  </View>
                ) : (
                  <GestureDetector gesture={composedGesture}>
                    <Reanimated.View
                      style={[
                        {
                          width: computeFit(canvasSize, templateSize).width,
                          height: computeFit(canvasSize, templateSize).height,
                        },
                        animatedCanvasStyle,
                      ]}
                      pointerEvents="auto"
                    >
                      {Platform.OS === 'web' ? (
                        <View
                          ref={captureViewRef}
                          collapsable={false}
                          style={{
                            width: computeFit(canvasSize, templateSize).width,
                            height: computeFit(canvasSize, templateSize).height,
                          }}
                        >
                          <WorkingColoringCanvas
                            selectedColor={currentColor}
                            selectedTool={currentTool === 'move' ? 'brush' : currentTool}
                            brushSize={currentBrushSize}
                            templateUri={templateUri}
                            width={computeFit(canvasSize, templateSize).width}
                            height={computeFit(canvasSize, templateSize).height}
                            style={{
                              pointerEvents: currentTool === 'move' ? 'none' : 'auto',
                              width: '100%',
                              height: '100%'
                            }}
                          />
                        </View>
                      ) : (
                        <View
                          ref={captureViewRef}
                          collapsable={false}
                          style={{
                            width: computeFit(canvasSize, templateSize).width,
                            height: computeFit(canvasSize, templateSize).height,
                          }}
                        >
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
                            interactionEnabled={currentTool !== 'move'}
                            style={{
                              pointerEvents: currentTool === 'move' ? 'none' : 'auto',
                              width: '100%',
                              height: '100%'
                            }}
                          />
                        </View>
                      )}
                    </Reanimated.View>
                  </GestureDetector>
                )
              ) : (
                <View style={styles.emptyCanvas}>
                  <Text style={styles.emptyCanvasText}>Select a template to start coloring! 🎨</Text>
                </View>
              )}
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
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowColorPicker(false)}
            />
            <View style={styles.colorPickerModal}>
              <Text style={styles.modalTitle}>Pick a Color</Text>
              <ScrollView showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
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
                        console.log('Color selected:', color);
                        setCurrentColor(color);
                        // Don't close modal on preset color selection - let user pick more if they want
                      }}
                    />
                  ))}
                </View>

                {/* Custom color picker with spectrum */}
                <View style={styles.customColorPickerContainer}>
                  <CustomColorPicker
                    selectedColor={currentColor}
                    onColorChange={(color) => {
                      console.log('Custom color selected:', color);
                      setCurrentColor(color);
                      // Don't close modal on wheel interaction - let user fine-tune
                    }}
                  />
                </View>
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowColorPicker(false)}
              >
                <Text style={styles.modalCloseButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Size Picker Modal */}
        <Modal
          visible={showSizePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSizePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowSizePicker(false)}
            />
            <View onStartShouldSetResponder={() => true}>
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
            </View>
          </View>
        </Modal>
        </View>
      </GestureHandlerRootView>
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
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  toolButtonLeft: {
    backgroundColor: '#6366f1',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toolButtonLeftActive: {
    backgroundColor: '#4338ca',
    borderColor: '#818cf8',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },
  toolButtonTextContainer: {
    flex: 1,
  },
  toolButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  toolButtonSubtext: {
    color: '#e0e7ff',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
  previewContainer: {
    marginTop: 12,
  },
  previewLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  colorPreview: {
    width: 100,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  sizePreview: {
    width: 100,
    height: 28,
    borderRadius: 8,
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
  // Compact preview styles for better fit
  compactPreviewSection: {
    gap: 6,
  },
  compactPreviewContainer: {
    marginTop: 6,
  },
  compactPreviewLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 3,
  },
  compactColorPreview: {
    width: 90,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  compactSizePreview: {
    width: 90,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactSizeCircle: {
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
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingRight: 48,
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#4338ca',
    borderWidth: 2,
    borderColor: '#818cf8',
  },
  saveActionButton: {
    backgroundColor: '#10b981',
  },
  canvasArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    overflow: 'hidden',
  },
  canvasAreaMoveMode: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderStyle: 'dashed',
  },
  canvasWrapper: {
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
    padding: 20,
  },
  emptyCanvasText: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
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
    maxHeight: '75%',
    minWidth: 320,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
    marginTop: 60, // Move it higher up
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
