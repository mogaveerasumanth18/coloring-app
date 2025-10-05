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
  Animated,
  Easing,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import {
  PanGestureHandler,
  PinchGestureHandler,
  GestureHandlerRootView,
  State,
} from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  runOnJS,
  withSpring,
  withDecay
} from 'react-native-reanimated';

import { WorkingColoringCanvas } from './WorkingColoringCanvas';
import { ZebraColoringCanvas } from './ZebraColoringCanvas';
import { NativeZebraCanvas } from './NativeZebraCanvas';
import ColorPicker from 'react-native-wheel-color-picker';

interface FullscreenCanvasProps {
  isVisible: boolean;
  onClose: () => void;
  templateUri?: string;
  selectedColor: string;
  selectedTool: 'brush' | 'bucket' | 'eraser' | 'move';
  brushSize: number;
  onColoringChange?: () => void;
  onColoringComplete?: (dataUrl?: string) => void;
  // Optional: initial canvas state to restore from (e.g., from main canvas)
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
  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
  const [colors] = useState([
    // Purples / Pinks
    '#7c3aed', '#8b5cf6', '#a78bfa', '#db2777', '#ec4899', '#f472b6',
    // Reds / Oranges
    '#ef4444', '#f87171', '#fb923c', '#f97316', '#fdba74', '#f59e0b',
    // Yellows / Greens
    '#eab308', '#fde047', '#84cc16', '#22c55e', '#10b981', '#86efac',
    // Cyans / Blues
    '#06b6d4', '#22d3ee', '#0ea5e9', '#3b82f6', '#60a5fa', '#2563eb',
    // Neutrals
    '#111827', '#374151', '#6b7280', '#9ca3af', '#e5e7eb', '#ffffff',
  ]);
  const [currentColor, setCurrentColor] = useState(selectedColor);
  const [currentTool, setCurrentTool] = useState<'brush' | 'bucket' | 'eraser' | 'move'>(selectedTool);
  const [currentBrushSize, setCurrentBrushSize] = useState(brushSize);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const canvasRef = useRef<any>(null);
  const captureViewRef = useRef<View>(null);
  const [templateSize, setTemplateSize] = useState<{ width: number; height: number } | null>(null);
  const [uiVisible, setUiVisible] = useState(true);
  // UI density modes to control how much chrome is shown
  const [uiMode, setUiMode] = useState<'full' | 'compact' | 'minimal'>('compact');
  // Removed the temporary zoom slider overlay to reduce clutter
  const [toolsVisible, setToolsVisible] = useState(false); // bottom tools panel collapsed by default
  // Removed radial FAB menu - actions integrated into tools panel
  // UI visibility animation
  const uiOpacityAnim = useRef(new Animated.Value(1)).current;

  // Pan and zoom gesture handling for move tool
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(zoom);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const savedScale = useSharedValue(zoom);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Update zoom state when scale changes
  const updateZoom = (newZoom: number) => {
    const clampedZoom = clampZoom(newZoom);
    setZoom(clampedZoom);
    scale.value = clampedZoom;
  };

  const panHandler = useAnimatedGestureHandler({
    onStart: () => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    },
    onActive: (event) => {
      // Only allow panning in move mode
      if (currentTool === 'move') {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    },
    onEnd: () => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    },
  }, [currentTool]); // Add dependency to reduce re-creation

  const pinchHandler = useAnimatedGestureHandler({
    onStart: (event: any) => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      focalX.value = event.focalX;
      focalY.value = event.focalY;
    },
    onActive: (event: any) => {
      const newScale = savedScale.value * event.scale;
      const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

      // Reduce frequency of updates to improve performance
      if (Math.abs(clampedScale - scale.value) > 0.01) {
        scale.value = clampedScale;
        runOnJS(updateZoom)(clampedScale);
      }
    },
    onEnd: () => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    },
  }, [MIN_ZOOM, MAX_ZOOM]); // Add dependencies to reduce re-creation

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Removed FAB animation

  // Animate UI visibility changes
  useEffect(() => {
    Animated.timing(uiOpacityAnim, {
      toValue: uiVisible ? 1 : 0,
      duration: 150, // Reduced duration for snappier animation
      easing: Easing.ease, // Simpler easing
      useNativeDriver: true,
    }).start();
  }, [uiVisible, uiOpacityAnim]);

  // Auto-hide UI timer ref to manage single timer
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any existing auto-hide timer
  const clearAutoHideTimer = () => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  };

  // Start auto-hide timer
  const startAutoHideTimer = () => {
    clearAutoHideTimer();
    autoHideTimerRef.current = setTimeout(() => {
      // Only hide UI if tools panel is not open
      if (!toolsVisible) {
        setUiVisible(false);
      }
    }, 3000); // Increased to 3 seconds for better UX
  };

  // Auto-hide UI shortly after entering fullscreen
  useEffect(() => {
    if (!isVisible) {
      clearAutoHideTimer();
      return;
    }
    startAutoHideTimer();

    return () => clearAutoHideTimer();
  }, [isVisible]);

  // Reset auto-hide timer when tools panel is opened/closed
  useEffect(() => {
    if (toolsVisible) {
      // Keep UI visible when tools panel is open
      setUiVisible(true);
      clearAutoHideTimer();
    } else {
      // Start auto-hide timer when tools panel is closed
      startAutoHideTimer();
    }
  }, [toolsVisible]);

  const revealUi = () => {
    setUiVisible(true);
    startAutoHideTimer();
  };

  const cycleUiMode = () => {
    setUiVisible(true);
    setUiMode((m) => (m === 'full' ? 'compact' : m === 'compact' ? 'minimal' : 'full'));
    startAutoHideTimer();
  };

  // Function to keep UI visible when interacting with tools
  const keepUiVisible = () => {
    setUiVisible(true);
    startAutoHideTimer();
  };

  // Sync zoom state with shared values
  useEffect(() => {
    scale.value = zoom;
  }, [zoom, scale]);

  // Reset transform when switching away from move tool
  useEffect(() => {
    if (currentTool !== 'move') {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(zoom);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      savedScale.value = zoom;
    }
  }, [currentTool, translateX, translateY, scale, zoom, savedTranslateX, savedTranslateY, savedScale]);

  // Ensure native canvas updates brush width instantly even if it caches the value internally
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Optional method on NativeZebraCanvas; no-op if not implemented
      canvasRef.current?.setBrushWidth?.(currentBrushSize);
    }
  }, [currentBrushSize]);

  useEffect(() => {
    const lockOrientation = async () => {
      if (isVisible && Platform.OS !== 'web') {
        // Lock to landscape when entering fullscreen
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        StatusBar.setHidden(true);
      }
    };

    lockOrientation();

    return () => {
      const unlockOrientation = async () => {
        if (Platform.OS !== 'web') {
          // Restore portrait when leaving fullscreen
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          StatusBar.setHidden(false);
        }
      };
      unlockOrientation();
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
          {/* Canvas area */}
          <TouchableOpacity
            style={[
              styles.canvasSection,
              // Remove padding to prevent canvas shrinking - tools will be positioned absolutely
            ]}
            onPress={() => {
              if (!uiVisible) {
                setUiVisible(true);
                startAutoHideTimer();
              }
            }}
            activeOpacity={1}
          >
            <View
              style={styles.canvasContainer}
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
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <PinchGestureHandler onGestureEvent={pinchHandler}>
                      <ReanimatedAnimated.View style={{ flex: 1 }}>
                        <PanGestureHandler onGestureEvent={panHandler}>
                          <ReanimatedAnimated.View
                            ref={captureViewRef}
                            collapsable={false}
                            style={[
                              {
                                width: computeFit(canvasSize, templateSize).width,
                                height: computeFit(canvasSize, templateSize).height,
                              },
                              animatedStyle
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
                                interactionEnabled={currentTool !== 'move'}
                              />
                            )}
                          </ReanimatedAnimated.View>
                        </PanGestureHandler>
                      </ReanimatedAnimated.View>
                    </PinchGestureHandler>
                  </GestureHandlerRootView>
                )
              ) : (
                <View style={styles.emptyCanvas}>
                  <Text style={styles.emptyCanvasText}>Select a template to start coloring! 🎨</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Top toolbar */}
          <Animated.View
            style={[
              styles.topActionsContainer,
              {
                opacity: uiOpacityAnim,
                top: Math.max(12, 16 + (insets?.top ?? 0)), // Increased for better visibility
                left: Math.max(12, 16 + (insets?.left ?? 0)), // Increased for better spacing
                right: Math.max(12, 16 + (insets?.right ?? 0)), // Increased for better spacing
              }
            ]}
            pointerEvents={uiVisible ? 'auto' : 'none'}
          >
            <View style={styles.actionRow}>
              {uiMode !== 'minimal' && (
                <>
                  <TouchableOpacity
                    style={uiMode === 'compact' ? styles.smallActionButton : styles.actionButton}
                    onPress={() => canvasRef.current?.undo?.()}
                  >
                    <Ionicons name="arrow-undo" size={18} color="#ffffff" />
                    {uiMode === 'full' && <Text style={styles.actionButtonText}>Undo</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={uiMode === 'compact' ? styles.smallActionButton : styles.actionButton}
                    onPress={() => canvasRef.current?.redo?.()}
                  >
                    <Ionicons name="arrow-redo" size={18} color="#ffffff" />
                    {uiMode === 'full' && <Text style={styles.actionButtonText}>Redo</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={uiMode === 'compact' ? styles.smallActionButton : styles.actionButton}
                    onPress={() => updateZoom(zoom + 0.25)}
                  >
                    <Feather name="zoom-in" size={18} color="#ffffff" />
                    {uiMode === 'full' && <Text style={styles.actionButtonText}>Zoom In</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={uiMode === 'compact' ? styles.smallActionButton : styles.actionButton}
                    onPress={() => updateZoom(zoom - 0.25)}
                  >
                    <Feather name="zoom-out" size={18} color="#ffffff" />
                    {uiMode === 'full' && <Text style={styles.actionButtonText}>Zoom Out</Text>}
                  </TouchableOpacity>
                  <View style={styles.zoomIndicator}>
                    <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
                  </View>
                  <TouchableOpacity
                    style={uiMode === 'compact' ? styles.smallActionButton : styles.actionButton}
                    onPress={() => updateZoom(1)}
                  >
                    <Feather name="refresh-ccw" size={18} color="#ffffff" />
                    {uiMode === 'full' && <Text style={styles.actionButtonText}>Reset</Text>}
                  </TouchableOpacity>
                </>
              )}
              {/* UI toggle and mode cycle buttons */}
              <TouchableOpacity
                style={uiMode === 'compact' ? styles.smallActionButton : styles.actionButton}
                onPress={() => setUiVisible((v) => !v)}
                activeOpacity={0.9}
              >
                <Feather name={uiVisible ? 'eye' : 'eye-off'} size={18} color="#ffffff" />
                {uiMode === 'full' && (
                  <Text style={styles.actionButtonText}>
                    {uiVisible ? 'Hide' : 'Show'}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={uiMode === 'compact' ? styles.smallActionButton : styles.actionButton}
                onPress={cycleUiMode}
                activeOpacity={0.9}
              >
                <Feather name="layout" size={18} color="#ffffff" />
                {uiMode === 'full' && (
                  <Text style={styles.actionButtonText}>
                    {uiMode}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Always visible UI toggle button for minimal mode or when UI is hidden */}
          {!uiVisible && (
            <Animated.View
              style={[
                styles.uiToggle,
                {
                  opacity: uiOpacityAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0], // Inverse of UI visibility
                  }),
                  top: Math.max(12, 16 + (insets?.top ?? 0)), // Increased for better visibility
                  right: Math.max(12, 16 + (insets?.right ?? 0)), // Increased for better spacing
                }
              ]}
            >
              <TouchableOpacity
                onPress={() => setUiVisible(true)}
                activeOpacity={0.9}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Feather name="eye" size={16} color="#111827" />
                <Text style={styles.uiToggleText}>Show UI</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Bottom dock removed; replaced by collapsible Tools panel below */}

          {/* Bottom tools: collapsed handle -> expandable panel */}
          {uiMode !== 'minimal' && (
            <View
              style={[
                styles.toolsHandleContainer,
                {
                  bottom: Math.max(20, 24 + (insets?.bottom ?? 0)), // Increased for better visibility above nav bar
                  left: Math.max(12, 16 + (insets?.left ?? 0)), // Increased left padding
                  right: Math.max(12, 16 + (insets?.right ?? 0)), // No need to avoid FAB anymore
                }
              ]}
              pointerEvents={'auto'}
            >
              {!toolsVisible ? (
                <TouchableOpacity style={styles.toolsHandle} onPress={() => setToolsVisible(true)}>
                  <Feather name="chevron-up" size={16} color="#111827" />
                  <Text style={styles.toolsHandleText}>Tools</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.toolsPanel}>
                  {/* Drawing Tools Row */}
                  <View style={styles.toolsRow}>
                    <TouchableOpacity
                      style={[styles.toolChip, currentTool === 'brush' && styles.toolChipActive]}
                      onPress={() => setCurrentTool('brush')}
                    >
                      <MaterialIcons name="brush" size={18} color="#ffffff" />
                      <Text style={styles.toolChipText}>Paint</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toolChip, currentTool === 'bucket' && styles.toolChipActive]}
                      onPress={() => setCurrentTool('bucket')}
                    >
                      <MaterialIcons name="format-color-fill" size={18} color="#ffffff" />
                      <Text style={styles.toolChipText}>Fill</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toolChip, currentTool === 'eraser' && styles.toolChipActive]}
                      onPress={() => setCurrentTool('eraser')}
                    >
                      <MaterialIcons name="auto-fix-off" size={18} color="#ffffff" />
                      <Text style={styles.toolChipText}>Erase</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toolChip, currentTool === 'move' && styles.toolChipActive]}
                      onPress={() => setCurrentTool('move')}
                    >
                      <Feather name="move" size={18} color="#ffffff" />
                      <Text style={styles.toolChipText}>Move</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolChip} onPress={() => setShowColorPicker(true)}>
                      <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
                      <Text style={styles.toolChipText}>Color</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Action Buttons Row */}
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity style={styles.actionChip} onPress={handleSave}>
                      <Feather name="save" size={18} color="#ffffff" />
                      <Text style={styles.actionChipText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionChip, styles.clearChip]} onPress={handleClear}>
                      <Feather name="trash-2" size={18} color="#ffffff" />
                      <Text style={styles.actionChipText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionChip, styles.exitChip]} onPress={handleClose}>
                      <Feather name="x" size={18} color="#ffffff" />
                      <Text style={styles.actionChipText}>Exit</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.toolsRow}>
                    <Text style={styles.sizeLabel}>Size: {Math.round(currentBrushSize)}</Text>
                    <View style={styles.sliderContainer}>
                      <Slider
                        key={`slider-${currentBrushSize}`}
                        style={styles.sizeSlider}
                        minimumValue={2}
                        maximumValue={50}
                        value={currentBrushSize}
                        step={1}
                        onSlidingStart={keepUiVisible}
                        onValueChange={(v: number) => {
                          keepUiVisible();
                          setCurrentBrushSize(v);
                        }}
                        onSlidingComplete={(v: number) => {
                          keepUiVisible();
                          setCurrentBrushSize(v);
                        }}
                        minimumTrackTintColor="#6366f1"
                        maximumTrackTintColor="#CBD5E1"
                        thumbTintColor="#6366f1"
                        accessibilityLabel="Brush size"
                        pointerEvents="auto"
                      />
                    </View>
                    <TouchableOpacity style={styles.toolsCollapse} onPress={() => setToolsVisible(false)}>
                      <Feather name="chevron-down" size={14} color="#111827" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Radial FAB menu removed - actions integrated into tools panel */}
        </SafeAreaView>

        {/* Color Picker Modal */}
        <Modal
          visible={showColorPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowColorPicker(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowColorPicker(false)}>
            <View style={styles.colorPickerModal}>
              <Text style={styles.colorPickerTitle}>Pick a Color</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Predefined color swatches */}
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
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 16,
                  elevation: 4,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4
                }}>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: 'transparent', // Changed from '#000000' to transparent
  },
  safeArea: {
    flex: 1,
  },
  canvasSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  canvasSectionPaddedFull: {
    // Reserve space so overlays do not cover the drawable area (full UI)
    paddingTop: 56,
    paddingBottom: 100,
  },
  canvasSectionPaddedCompact: {
    // Smaller paddings in compact UI
    paddingTop: 36,
    paddingBottom: 80,
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

  // Top toolbar
  topActionsContainer: {
    position: 'absolute',
    top: 12, // Increased for better visibility
    left: 12, // Increased for better visibility
    right: 12, // Increased for better visibility
    zIndex: 10,
    gap: 6, // Increased gap for better spacing
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Increased gap for better spacing
    flexWrap: 'wrap', // Allow wrapping if needed
    justifyContent: 'flex-start', // Better alignment on mobile
  },
  actionButton: {
    backgroundColor: '#6366f1',
    borderRadius: 18, // Reduced radius
    paddingHorizontal: 12, // Reduced padding
    paddingVertical: 6, // Reduced padding
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Reduced gap
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  smallActionButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12, // Further reduced radius
    paddingHorizontal: 4, // Further reduced padding
    paddingVertical: 3, // Further reduced padding
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1, // Further reduced gap
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 28, // Further reduced minimum touch target
    minHeight: 28, // Further reduced minimum touch target
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
    borderRadius: 8, // Further reduced radius
    paddingHorizontal: 4, // Further reduced padding
    paddingVertical: 2, // Further reduced padding
    minWidth: 36, // Further reduced minimum width
  },
  zoomText: {
    color: '#1f2937',
    fontSize: 12, // Smaller font
    fontWeight: '700',
  },
  // Zoom slider overlay removed

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
    fontSize: 11, // Increased font size for better readability
    fontWeight: '600',
    minWidth: 60, // Increased width for better spacing
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

  // Collapsible Tools panel
  toolsHandleContainer: {
    position: 'absolute',
    bottom: 20, // Increased for better visibility above nav bar
    left: 12, // Increased for better spacing
    right: 12, // No need to avoid FAB anymore
    alignItems: 'center',
    zIndex: 12,
  },
  toolsHandle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  toolsHandleText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  toolsPanel: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 16, // Restored border radius
    padding: 12, // Increased padding for better spacing
    marginHorizontal: 0, // Remove horizontal margin to maximize space
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '100%', // Ensure it doesn't exceed container width
    width: '100%', // Take full available width
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Better distribution
    gap: 6, // Increased gap for better spacing
    marginVertical: 4, // Increased vertical margin
    flexWrap: 'wrap', // Allow wrapping if needed
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Increased gap for better spacing
    backgroundColor: '#9ca3af',
    borderRadius: 12, // Increased radius
    paddingHorizontal: 10, // Increased padding
    paddingVertical: 6, // Increased padding
    minHeight: 36, // Increased minimum touch target
    minWidth: 70, // Ensure minimum width for readability
  },
  toolChipActive: {
    backgroundColor: '#6366f1',
  },
  toolChipText: {
    color: '#ffffff',
    fontSize: 11, // Increased font size for better readability
    fontWeight: '700',
  },
  sliderContainer: {
    flex: 1,
    marginHorizontal: 8, // Increased margin
  },
  sizeSlider: {
    width: '100%',
    height: 32, // Increased height for better touch target
  },
  toolsCollapse: {
    padding: 6, // Reduced padding
    backgroundColor: 'rgba(226,232,240,0.9)',
    borderRadius: 10, // Reduced border radius
    minWidth: 28, // Ensure minimum touch target
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action Buttons Row
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226,232,240,0.5)',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    flex: 1,
    justifyContent: 'center',
  },
  clearChip: {
    backgroundColor: '#ef4444',
  },
  exitChip: {
    backgroundColor: '#6b7280',
  },
  actionChipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Bottom dock - tools row
  bottomDock: {
    position: 'absolute',
    bottom: 64,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 10,
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
  miniFabCluster: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'column',
    gap: 12,
    zIndex: 10,
  },
  miniFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  miniFabPrimary: {
    backgroundColor: '#6366f1',
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
    padding: 16,
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
  colorPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(17,24,39,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedColorOption: {
    borderColor: '#4f46e5',
    transform: [{ scale: 1.12 }],
  },

  // UI toggle chip
  uiToggle: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  uiToggleText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },

  // Radial FAB menu removed - actions integrated into tools panel
});
