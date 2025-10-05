import { Feather, Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as ScreenOrientation from 'expo-screen-orientation';
import Slider from '@react-native-community/slider';

import { PngTemplateService } from '../services/PngTemplateService';
import { ImageUploaderEnhanced } from './ImageUploaderEnhanced';
import { WorkingColoringCanvas } from './WorkingColoringCanvas';
import { NativeZebraCanvas } from './NativeZebraCanvas';
import FullscreenCanvas from './FullscreenCanvas';
import ColorPicker from 'react-native-wheel-color-picker';

const { width: screenWidth } = Dimensions.get('window');
// UI sizing constants for responsive palette/slider
const MODAL_SIDE_PADDING = 16;
const SWATCH_GAP = 12;
const DEFAULT_SWATCH_SIZE = 44; // will shrink/grow based on width

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

// Small custom slider for Android to avoid gesture conflicts with the native Slider
function SizeSliderNative({
  value,
  onChange,
  min = 5,
  max = 100,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const [trackW, setTrackW] = React.useState(0);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const valToX = (v: number) => {
    if (trackW <= 0) return 0;
    const p = (v - min) / (max - min);
    return clamp(p, 0, 1) * trackW;
  };
  const xToVal = (x: number) => {
    if (trackW <= 0) return min;
    const p = clamp(x / trackW, 0, 1);
    return Math.round(min + p * (max - min));
  };

  const sliderPanGesture = Gesture.Pan()
    .onUpdate((event) => {
      try {
        const x = event.x ?? 0; // absolute inside the track
        onChange(xToVal(x));
      } catch (error) {
        console.warn('SizeSliderNative onUpdate error:', error);
      }
    })
    .onEnd((event) => {
      try {
        if (event.x != null) {
          onChange(xToVal(event.x));
        }
      } catch (error) {
        console.warn('SizeSliderNative onEnd error:', error);
      }
    })
    .shouldCancelWhenOutside(true)
    .minDistance(0);

  const thumbX = valToX(value);
  const THUMB = 28;

  return (
    <GestureDetector gesture={sliderPanGesture}>
      <View style={styles.customSliderWrap}>
        <View style={styles.customSliderTrack} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
          <View style={[styles.customSliderFill, { width: thumbX }]} />
          <View style={[styles.customSliderThumb, { left: Math.max(0, thumbX - THUMB / 2), width: THUMB, height: THUMB }]} />
        </View>
      </View>
    </GestureDetector>
  );
}

export default function IntegratedColoringBookApp({
  compact = false,
}: {
  compact?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedTool, setSelectedTool] = useState<
    'brush' | 'bucket' | 'eraser' | 'move'
  >('bucket');
  const [brushSize, setBrushSize] = useState(8);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'color'>(
    'templates'
  );
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColorTray, setShowColorTray] = useState(false);
  const [showZoomUi, setShowZoomUi] = useState(false);
  const webSliderTrackRef = useRef<View>(null);
  const [webSliderTrackWidth, setWebSliderTrackWidth] = useState(0);
  const bitmapCanvasRef = useRef<any>(null);
  const captureViewRef = useRef<View>(null);
  // Persist canvas across modal toggles/remounts
  const [canvasSnapshot, setCanvasSnapshot] = useState<string | null>(null);
  // Gesture/refs helpers (keeping refs for compatibility)
  const panGestureRef = useRef<any>(null);
  const pinchGestureRef = useRef<any>(null);

  // Native gesture for slider
  const sliderNativeGesture = Gesture.Native();

  // Gesture handling for pan and zoom
  const scale = useSharedValue(1);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
  const canvasW = useSharedValue(screenWidth - 32);
  const canvasH = useSharedValue((screenWidth - 32) * 0.8);
  const mobileSvgTemplate = `\
<svg width="300" height="240" viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg">\
  <path d="M150,40 L170,100 L230,100 L185,135 L200,195 L150,165 L100,195 L115,135 L70,100 L130,100 Z" fill="none" stroke="#333" stroke-width="2"/>\
</svg>`;

  useEffect(() => {
    const loadDefaultTemplate = async () => {
      try {
        await PngTemplateService.testAssetLoading();
        await PngTemplateService.initialize();
        const allTemplates = await PngTemplateService.getAllTemplates();
        if (allTemplates.length > 0) {
          const defaultTemplate = allTemplates[0];
          const pngUri = await PngTemplateService.downloadTemplate(
            defaultTemplate.id
          );
          setCurrentTemplate({
            bitmapUri: pngUri,
            fileName: defaultTemplate.title,
            width: defaultTemplate.width,
            height: defaultTemplate.height,
            type: 'png',
          });
          setActiveTab('color');
        }
      } catch (error) {
        console.error('Failed to load default template:', error);
        setCurrentTemplate({
          bitmapUri: null,
          fileName: 'Sample Template',
          width: 600,
          height: 480,
          type: 'png',
        });
      }
    };
    loadDefaultTemplate();
  }, []);

  // Pinch gesture for zooming (web only to avoid Android lag)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      // Store initial scale at start
    })
    .onUpdate((event) => {
      // Avoid spamming React state during gesture to prevent jank
      scale.value = event.scale;
    })
    .onEnd(() => {
      const clamped = Math.max(0.5, Math.min(3, scale.value));
      scale.value = withSpring(clamped);
      runOnJS(setZoom)(clamped);
    });

  // Pan gesture for dragging when zoomed
  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Store initial translation at start
    })
    .onUpdate((event) => {
      // Only allow panning when zoomed in or in explicit move mode
      const allow = scale.value > 1 || selectedTool === 'move';
      if (allow) {
        translationX.value = event.translationX;
        translationY.value = event.translationY;
      }
    })
    .onEnd(() => {
      // Add boundaries to prevent panning too far. Constrain to container size.
      const scaledW = canvasW.value * scale.value;
      const scaledH = canvasH.value * scale.value;
      const containerW = canvasW.value;
      const containerH = canvasH.value;
      const maxX = Math.max(0, (scaledW - containerW) / 2);
      const maxY = Math.max(0, (scaledH - containerH) / 2);
      translationX.value = withSpring(
        Math.max(-maxX, Math.min(maxX, translationX.value))
      );
      translationY.value = withSpring(
        Math.max(-maxY, Math.min(maxY, translationY.value))
      );
    });

  // Combined gestures for web
  const webCombinedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // Pan gesture for native with dynamic pointer requirements
  const nativePanGesture = Gesture.Pan()
    .minPointers(selectedTool === 'move' ? 1 : 2)
    .onUpdate((event) => {
      // Only allow panning when zoomed in or in explicit move mode
      const allow = scale.value > 1 || selectedTool === 'move';
      if (allow) {
        translationX.value = event.translationX;
        translationY.value = event.translationY;
      }
    })
    .onEnd(() => {
      // Add boundaries to prevent panning too far. Constrain to container size.
      const scaledW = canvasW.value * scale.value;
      const scaledH = canvasH.value * scale.value;
      const containerW = canvasW.value;
      const containerH = canvasH.value;
      const maxX = Math.max(0, (scaledW - containerW) / 2);
      const maxY = Math.max(0, (scaledH - containerH) / 2);
      translationX.value = withSpring(
        Math.max(-maxX, Math.min(maxX, translationX.value))
      );
      translationY.value = withSpring(
        Math.max(-maxY, Math.min(maxY, translationY.value))
      );
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translationX.value },
        { translateY: translationY.value },
        { scale: scale.value },
      ],
    };
  });

  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
    '#F8C471',
    '#82E0AA',
    '#F1C40F',
    '#E74C3C',
    '#9B59B6',
    '#3498DB',
    '#1ABC9C',
    '#F39C12',
    '#2ECC71',
    '#34495E',
    '#E67E22',
    '#95A5A6',
    '#D35400',
    '#8E44AD',
  ];

  const applyZoom = (z: number) => {
    const clamped = Math.max(0.5, Math.min(3, z));
    setZoom(clamped);
    scale.value = withSpring(clamped);
  };
  const handleZoomIn = () => applyZoom(zoom + 0.25);
  const handleZoomOut = () => applyZoom(zoom - 0.25);
  const handleZoomReset = () => applyZoom(1);

  const handleSaveNative = async () => {
    if (Platform.OS === 'web') return;
    try {
      if (!captureViewRef.current) {
        Alert.alert('Save', 'Nothing to save yet.');
        return;
      }
      // Request permissions to save to the device media library
      const { status: perm } = await MediaLibrary.requestPermissionsAsync();
      if (perm !== 'granted') {
        Alert.alert('Permission required', 'Allow Photos/Media permission to save your image.');
        return;
      }

      const uri = await captureRef(captureViewRef, { format: 'png', quality: 1 });

      // Save to media library (Pictures/Coloring Book)
      const asset = await MediaLibrary.createAssetAsync(uri);
      let album = await MediaLibrary.getAlbumAsync('Coloring Book');
      if (!album) {
        album = await MediaLibrary.createAlbumAsync('Coloring Book', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
      Alert.alert('Saved to Gallery', 'Your image was saved to the Photos app in the "Coloring Book" album.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? 'Unknown error');
    }
  };

  const toggleFullscreenWeb = () => {
    if (Platform.OS !== 'web') return;
    try {
      const d = document as any;
      if (!d.fullscreenElement && !d.webkitFullscreenElement) {
        const el = d.documentElement;
        (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
        setIsFullscreen(true);
      } else {
        (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
        setIsFullscreen(false);
      }
    } catch { }
  };

  const handleExpandFullscreen = async () => {
    // First, try to capture current canvas state if available
    let currentCanvasData: string | null = null;

    // Check if we have a canvas and try to get its current data
    if (bitmapCanvasRef.current && typeof bitmapCanvasRef.current.getCurrentDataUrl === 'function') {
      try {
        currentCanvasData = bitmapCanvasRef.current.getCurrentDataUrl();
        console.log('Captured current canvas state for fullscreen');
      } catch (error) {
        console.warn('Could not capture canvas state:', error);
      }
    }

    // Use current canvas data if available, otherwise fall back to stored snapshot
    const dataToUse = currentCanvasData || canvasSnapshot;

    // If we have existing progress, check if it's different from original template
    const hasProgress = dataToUse && dataToUse !== currentTemplate?.bitmapUri && dataToUse.length > 100; // Basic check for actual data

    if (hasProgress) {
      Alert.alert(
        'Switch to Fullscreen',
        'Your current progress will be preserved when switching to fullscreen mode. Continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Continue',
            onPress: () => proceedToFullscreen(dataToUse),
          },
        ]
      );
      return;
    }

    // If no significant progress, proceed directly
    proceedToFullscreen(dataToUse);
  };

  const proceedToFullscreen = async (canvasData: string | null) => {
    // Update the canvas data to pass to fullscreen
    setCanvasSnapshot(canvasData);

    if (Platform.OS === 'web') {
      toggleFullscreenWeb();
    } else {
      // For React Native (mobile devices)
      try {
        if (!isFullscreen) {
          // Enter fullscreen mode - switch to landscape
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          setIsFullscreen(true);
        } else {
          // Exit fullscreen mode - switch back to portrait
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          setIsFullscreen(false);
        }
      } catch (error) {
        console.error('Failed to toggle orientation:', error);
        Alert.alert('Orientation Error', 'Failed to change screen orientation');
      }
    }
  };

  const handleBitmapTemplateSelected = (
    bitmapUri: string,
    fileName: string
  ) => {
    if (!bitmapUri || bitmapUri === 'null' || bitmapUri === 'undefined') {
      Alert.alert(
        'Error',
        'Invalid template selected. Please try another template.'
      );
      return;
    }
    setCurrentTemplate({
      svgData: null,
      fileName,
      bitmapUri,
      width: 600,
      height: 480,
      type: 'png',
    });
    // New template => clear previous snapshot
    setCanvasSnapshot(null);
    setActiveTab('color');
  };

  const renderColorTab = () => (
    <View style={styles.modernContainer}>
      {/* Header - Fixed at top (10% of screen) */}
      <LinearGradient
        colors={['#A78BFA', '#7C3AED', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.modernHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.modernAppTitle}>ColorSplash Kids</Text>
            <Text style={styles.modernAppSubtitle}>Let's create colorful magic!</Text>
          </View>
          <TouchableOpacity
            style={styles.headerSaveButton}
            onPress={Platform.OS === 'web' ? () => bitmapCanvasRef.current?.save?.() : handleSaveNative}
          >
            <Feather name="save" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Canvas Area - Maximized (70-80% of screen) */}
      <View style={styles.canvasArea}>
        {/* Removed status label per UX request */}

        {/* Zoom controls - moved above canvas as a horizontal bar */}
        <View style={styles.topZoomBar}>
          <TouchableOpacity style={styles.topZoomBtn} onPress={handleZoomOut}>
            <Feather name="minus" size={18} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.topZoomReset} onPress={handleZoomReset}>
            <Text style={styles.topZoomLabel}>{Math.round(zoom * 100)}%</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topZoomBtn} onPress={handleZoomIn}>
            <Feather name="plus" size={18} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* Canvas */}
        {currentTemplate?.bitmapUri ? (
          Platform.OS === 'web' ? (
            <GestureDetector gesture={webCombinedGesture}>
              <Animated.View style={styles.modernCanvasContainer}>
                <Animated.View style={[animatedStyle, { flex: 1 }]}>
                  <WorkingColoringCanvas
                    ref={bitmapCanvasRef}
                    selectedColor={selectedColor}
                    selectedTool={selectedTool === 'move' ? 'brush' : selectedTool}
                    brushSize={brushSize}
                    templateUri={currentTemplate.bitmapUri}
                    interactionEnabled={!showColorTray}
                  />
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          ) : (
            // On native, pan with two fingers to avoid conflicts with drawing; zoom via top bar
            <View ref={captureViewRef as any} style={styles.modernCanvasContainer}>
              {/* One-finger pan when in Move mode; otherwise require two fingers so drawing remains single-finger */}
              <GestureDetector gesture={nativePanGesture}>
                <Animated.View style={[animatedStyle, { flex: 1 }]}>
                  <NativeZebraCanvas
                    ref={bitmapCanvasRef}
                    templateUri={currentTemplate.bitmapUri}
                    selectedColor={selectedColor}
                    selectedTool={selectedTool === 'move' ? 'brush' : selectedTool}
                    brushWidth={brushSize}
                    onColoringComplete={(uri: string) => setCanvasSnapshot(uri)}
                    width={screenWidth - 32}
                    height={(screenWidth - 32) * 0.8}
                    interactionEnabled={selectedTool !== 'move' && !showColorTray}
                    initialDataUrl={canvasSnapshot ?? undefined}
                  />
                </Animated.View>
              </GestureDetector>
            </View>
          )
        ) : (
          <View style={styles.modernEmptyCanvas}>
            <Text style={styles.emptyCanvasText}>
              Select a template to start coloring! 🎨
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Toolbar - Fixed at bottom (20% of screen) */}
      <View style={[styles.bottomToolbar, { paddingBottom: insets.bottom + 16 }]}>
        {/* Tools Section - Top row */}
        <View style={styles.toolsRow}>
          {/* Eraser replaces Pen */}
          <TouchableOpacity
            style={[styles.toolButton, selectedTool === 'eraser' && styles.activeToolButton]}
            onPress={() => setSelectedTool('eraser')}
          >
            <MaterialCommunityIcons name="eraser" size={24} color={selectedTool === 'eraser' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.toolLabel, selectedTool === 'eraser' && styles.activeToolLabel]}>Eraser</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolButton, selectedTool === 'brush' && styles.activeToolButton]}
            onPress={() => setSelectedTool('brush')}
          >
            <MaterialIcons name="brush" size={24} color={selectedTool === 'brush' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.toolLabel, selectedTool === 'brush' && styles.activeToolLabel]}>Brush</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolButton, selectedTool === 'bucket' && styles.activeToolButton]}
            onPress={() => setSelectedTool('bucket')}
          >
            <MaterialIcons name="format-color-fill" size={24} color={selectedTool === 'bucket' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.toolLabel, selectedTool === 'bucket' && styles.activeToolLabel]}>Fill</Text>
          </TouchableOpacity>

          {/* Move tool button to enable one-finger panning of zoomed canvas */}
          <TouchableOpacity
            style={[styles.toolButton, selectedTool === 'move' && styles.activeToolButton]}
            onPress={() => setSelectedTool('move')}
          >
            <Feather name="move" size={24} color={selectedTool === 'move' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.toolLabel, selectedTool === 'move' && styles.activeToolLabel]}>Move</Text>
          </TouchableOpacity>
        </View>

        {/* Size Slider - Only show for pen/brush tools */}
        {(selectedTool === 'brush' || selectedTool === 'eraser') && (
          <View style={styles.sizeSliderRow}>
            <Text style={styles.sizeLabel}>Size: {brushSize}px</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Decrease size button */}
              <TouchableOpacity
                accessibilityLabel="Decrease size"
                onPress={() => setBrushSize((s) => Math.max(5, s - 1))}
                style={styles.modernSizeBtn}
              >
                <Feather name="minus" size={16} color="#4F46E5" />
              </TouchableOpacity>

              {/* Draggable slider */}
              {Platform.OS === 'android' ? (
                <SizeSliderNative
                  value={brushSize}
                  onChange={(v) => setBrushSize(v)}
                  min={5}
                  max={100}
                />
              ) : (
                <View style={{ flex: 1 }}>
                  <Slider
                    style={styles.sizeSlider}
                    minimumValue={5}
                    maximumValue={100}
                    value={brushSize}
                    step={1}
                    onValueChange={(v: number) => setBrushSize(Math.round(v))}
                    onSlidingComplete={(v: number) => setBrushSize(Math.round(v))}
                    minimumTrackTintColor="#6366f1"
                    maximumTrackTintColor="#E2E8F0"
                    thumbTintColor="#6366f1"
                  />
                </View>
              )}

              {/* Increase size button */}
              <TouchableOpacity
                accessibilityLabel="Increase size"
                onPress={() => setBrushSize((s) => Math.min(100, s + 1))}
                style={styles.modernSizeBtn}
              >
                <Feather name="plus" size={16} color="#4F46E5" />
              </TouchableOpacity>

              {/* Live preview dot */}
              <View style={{ width: 36, alignItems: 'center' }}>
                <View
                  style={{
                    width: Math.min(brushSize, 28),
                    height: Math.min(brushSize, 28),
                    borderRadius: 999,
                    backgroundColor: selectedTool === 'eraser' ? '#FFFFFF' : selectedColor,
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                  }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Actions Section - Middle row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.modernActionButton} onPress={() => bitmapCanvasRef.current?.undo?.()}>
            <Ionicons name="arrow-undo" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modernActionButton} onPress={() => bitmapCanvasRef.current?.redo?.()}>
            <Ionicons name="arrow-redo" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          {/* Move toggle button */}
          <TouchableOpacity
            style={[styles.modernActionButton, selectedTool === 'move' && { backgroundColor: '#10b981' }]}
            onPress={() => setSelectedTool(selectedTool === 'move' ? 'brush' : 'move')}
            accessibilityLabel="Move"
          >
            <Feather name="move" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modernActionButton} onPress={handleExpandFullscreen}>
            <Feather name={isFullscreen ? "minimize-2" : "maximize-2"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Colors Section - Scrollable row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.colorsScrollView}
          contentContainerStyle={styles.colorsContainer}
        >
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.modernColorButton,
                { backgroundColor: color },
                selectedColor === color && styles.selectedModernColor,
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </ScrollView>

        {/* Footer Buttons - Bottom row */}
        {/* Bottom navigation like tabs */}
        <View style={styles.bottomNavTabs}>
          <TouchableOpacity style={[styles.navItem, showColorTray && styles.navItemActive]} onPress={() => setShowColorTray(true)}>
            <MaterialIcons name="colorize" size={22} color={showColorTray ? '#ffffff' : '#64748B'} />
            <Text style={[styles.navItemText, showColorTray && styles.navItemTextActive]}>Color Picker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navItem, activeTab === 'templates' && styles.navItemActive]} onPress={() => setActiveTab('templates')}>
            <MaterialIcons name="view-module" size={22} color={activeTab === 'templates' ? '#ffffff' : '#64748B'} />
            <Text style={[styles.navItemText, activeTab === 'templates' && styles.navItemTextActive]}>Templates</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderTemplatesTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}
    >
      <View style={styles.templatesHeader}>
        <Text style={styles.templatesTitle}>Choose your canvas</Text>
        <Text style={styles.templatesSubtitle}>
          Pick a fun template to color!
        </Text>
      </View>
      <View style={styles.templateModeInfo}>
        <Text style={styles.templateModeText}>
          Pick a fun picture to color! 🎨
        </Text>
      </View>
      <View style={styles.section}>
        <ImageUploaderEnhanced
          onBitmapTemplateSelected={handleBitmapTemplateSelected}
          onImageUploaded={(bitmapUri, fileName) =>
            handleBitmapTemplateSelected(bitmapUri, fileName)
          }
          onTemplateSelected={(templateData) => {
            if (templateData.bitmapUri)
              handleBitmapTemplateSelected(
                templateData.bitmapUri,
                templateData.fileName
              );
          }}
        />
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {activeTab === 'color' && renderColorTab()}
      {activeTab === 'templates' && renderTemplatesTab()}

      {/* Fullscreen Canvas Overlay */}
      <FullscreenCanvas
        isVisible={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        templateUri={currentTemplate?.bitmapUri}
        selectedColor={selectedColor}
        selectedTool={selectedTool as 'brush' | 'bucket' | 'eraser' | 'move'}
        brushSize={brushSize}
        onColoringChange={() => { }}
        onColoringComplete={(dataUrl?: string) => {
          // Update our canvas snapshot when fullscreen canvas changes
          if (dataUrl) {
            setCanvasSnapshot(dataUrl);
          }
        }}
        initialCanvasData={canvasSnapshot || undefined}
      />

      {/* Color tray modal */}
      {showColorTray && (
        <View style={[styles.colorTrayOverlay, styles.centerOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <TouchableOpacity style={styles.colorTrayBackdrop} activeOpacity={1} onPress={() => setShowColorTray(false)} />
          <View style={styles.centerModal}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <Text style={styles.colorTrayTitle}>Pick a color</Text>
              {/* Responsive palette grid: compute columns/swatches to fit modal width */}
              {(() => {
                const modalWidth = Math.min(screenWidth - 40, 360);
                const usable = modalWidth - MODAL_SIDE_PADDING * 2; // match centerModal padding
                const columns = Math.max(3, Math.floor((usable + SWATCH_GAP) / (DEFAULT_SWATCH_SIZE + SWATCH_GAP)));
                const swatchSize = Math.max(
                  36,
                  Math.min(52, Math.floor((usable - SWATCH_GAP * (columns - 1)) / columns))
                );
                const rows: React.ReactNode[] = [];
                for (let i = 0; i < colors.length; i += columns) {
                  const row = colors.slice(i, i + columns);
                  rows.push(
                    <View key={`row-${i}`} style={[styles.rowPalette, { gap: SWATCH_GAP }]}>
                      {row.map((c) => (
                        <TouchableOpacity
                          key={`${i}-${c}`}
                          onPress={() => {
                            setSelectedColor(c);
                            setShowColorTray(false);
                          }}
                          style={[
                            styles.rowSwatch,
                            {
                              width: swatchSize,
                              height: swatchSize,
                              borderRadius: swatchSize / 2,
                              backgroundColor: c,
                            },
                            selectedColor === c && styles.centerModalSwatchActive,
                          ]}
                        />
                      ))}
                    </View>
                  );
                }
                return rows;
              })()}
              {/* Custom color picker - reliable and crash-free */}
              <View style={styles.wheelContainer}>
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  padding: 16,
                  elevation: 4,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4
                }}>
                  <CustomColorPicker
                    selectedColor={selectedColor}
                    onColorChange={setSelectedColor}
                  />
                </View>
              </View>
              <TouchableOpacity style={styles.centerModalClose} onPress={() => setShowColorTray(false)}>
                <Text style={styles.centerModalCloseText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2FF',
  },
  modernContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  modernHeader: {
    height: '10%',
    minHeight: 80,
    paddingHorizontal: 20,
    paddingTop: 10,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  modernAppTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  modernAppSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerSaveButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'relative',
  },
  floatingStatus: {
    display: 'none',
  },
  statusText: {
    display: 'none',
  },
  floatingZoomControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  modernZoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  modernZoomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  modernCanvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  modernEmptyCanvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    margin: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  // New top zoom bar (above canvas)
  topZoomBar: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  topZoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topZoomReset: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topZoomLabel: {
    color: '#1F2937',
    fontWeight: '700',
  },
  bottomToolbar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12, // Reduced from 16 to 12
    paddingTop: 16,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    // Extra bottom space to avoid Android system bars overlap
    paddingBottom: 20,
    maxHeight: '38%',
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Changed back to space-between for even distribution
    gap: 2, // Reduced gap from 4 to 2
    marginBottom: 16,
    flexWrap: 'wrap', // Allow wrapping on very small screens
    paddingHorizontal: 12, // Increased padding to 12 for better container spacing
  },
  toolButton: {
    alignItems: 'center',
    paddingVertical: 8, // Further reduced from 10 to 8
    paddingHorizontal: 6, // Further reduced from 8 to 6
    borderRadius: 10, // Reduced from 12 to 10
    backgroundColor: '#F1F5F9',
    minWidth: 56, // Further reduced from 64 to 56
    flex: 1, // Allow buttons to grow equally
    maxWidth: 68, // Further reduced from 76 to 68
    marginHorizontal: 0, // Removed margins, rely on gap instead
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeToolButton: {
    backgroundColor: '#6366f1',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  toolLabel: {
    fontSize: 10, // Further reduced from 11 to 10
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1, // Further reduced from 2 to 1
  },
  activeToolLabel: {
    color: '#FFFFFF',
  },
  sizeSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  sizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginRight: 16,
    minWidth: 80,
  },
  sizeSlider: {
    flex: 1,
    height: 40,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  modernActionButton: {
    width: 44,
    height: 44,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  colorsScrollView: {
    marginBottom: 16,
  },
  colorsContainer: {
    paddingHorizontal: 4,
    gap: 12,
  },
  wheelContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  modernColorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedModernColor: {
    borderColor: '#1E293B',
    transform: [{ scale: 1.1 }],
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  footerButtonsRow: {
    display: 'none',
  },
  footerButton: {
    display: 'none',
  },
  footerButtonText: {
    display: 'none',
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple-blue gradient
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#667eea', // Modern purple-blue
  },
  mainContent: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },

  templateModeInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 20,
    marginBottom: 20,
    borderColor: '#4f46e5',
    borderWidth: 2,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  templateModeText: {
    fontSize: 14,
    color: '#1e1b4b',
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(103, 126, 234, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e1b4b',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6366f1',
    textAlign: 'center',
  },

  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 25,
    marginBottom: 20,
    marginHorizontal: 16,
    // 3D effect with multiple shadows
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    // Inner shadow effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  gradientHeader: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  compactHeader: {
    paddingVertical: 12,
  },
  appBranding: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    // 3D button effect
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8
  },
  colorfulPaletteIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  paletteContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  appIconText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff'
  },
  appInfo: {
    flex: 1
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  progressInfo: {
    flexDirection: 'row',
    gap: 8
  },
  canvasCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  canvasTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B'
  },
  canvasActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  completionIndicator: {
    alignItems: 'center'
  },
  completionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center'
  },
  completionPercentage: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  completionText: {
    fontSize: 10,
    marginTop: 2
  },
  canvasWrapper: {
    padding: 16,
    position: 'relative',
    alignItems: 'center'
  },
  canvasContainer: {
    alignSelf: 'center',
    marginVertical: 20,
    maxWidth: screenWidth - 40,
    width: '100%',
  },
  zoomControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    zIndex: 10
  },
  zoomButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    margin: 2
  },
  zoomReset: {
    paddingHorizontal: 12,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center'
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  },
  drawingTools: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  toolsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  toolsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center'
  },
  modernToolButton: {
    minWidth: 80,
    maxWidth: 120,
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    // 3D button effect - similar to your reference
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)'
  },
  activeModernTool: {
    backgroundColor: '#6366f1', // Active state similar to your green reference
    // Active shadow effect - inset appearance
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    transform: [{ translateY: 3 }], // Pressed down effect
    borderColor: '#4338ca'
  },
  modernToolLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4
  },
  activeModernToolLabel: {
    color: '#FFFFFF'
  },
  actionTools: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.2)'
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 5
  },
  saveLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4
  },
  colorSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent'
  },
  selectedColor: {
    borderColor: '#1E293B',
    transform: [{ scale: 1.1 }]
  },
  templatesHeader: {
    alignItems: 'center',
    marginBottom: 20
  },
  templatesTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8
  },
  templatesSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center'
  },
  section: {
    marginBottom: 24
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8
  },
  activeNavTab: {},
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  activeNavIcon: {
    backgroundColor: '#3B82F6'
  },
  navIconText: {
    fontSize: 18
  },
  activeNavIconText: {},
  navLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  activeNavLabel: {
    color: '#3B82F6'
  },
  emptyCanvas: {
    minHeight: 220,
    width: '100%',
    maxWidth: screenWidth - 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    alignSelf: 'center'
  },
  emptyCanvasText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center'
  },
  // Web-specific styles
  webToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F6B45',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  webToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
  },
  webToolText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  webPercent: {
    marginHorizontal: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
  },
  webPercentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  webBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0F6B45',
    backgroundColor: '#E8FFF5',
  },

  // New bottom nav tabs
  bottomNavTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
    paddingTop: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  navItemActive: {
    backgroundColor: '#6366f1',
  },
  navItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
  navItemTextActive: {
    color: '#FFFFFF',
  },

  // Color tray modal
  colorTrayOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 50,
    justifyContent: 'flex-end',
  },
  centerOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorTrayBackdrop: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  colorTray: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  // Centered modal styles (Android issue fix)
  centerModal: {
    alignSelf: 'center',
    width: Math.min(screenWidth - 40, 360),
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    margin: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  centerModalRow: {
    paddingVertical: 8,
    gap: 12,
  },
  centerModalSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  centerModalSwatchActive: {
    borderColor: '#1E293B',
  },
  centerModalClose: {
    alignSelf: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  centerModalCloseText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  gridPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  gridSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  // Explicit 3-row palette layout
  rowPalette: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  rowSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorWheelBtn: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 8,
    marginBottom: 8,
  },
  colorWheelText: {
    color: '#fff',
    fontWeight: '700',
  },
  colorTrayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  colorTrayRow: {
    paddingVertical: 8,
    gap: 12,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: '#1E293B',
  },
  webBottomBtnActive: {
    backgroundColor: '#0F6B45',
    borderColor: '#0F6B45',
  },
  webBottomBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0F6B45',
  },
  webBottomBtnLargeActive: {
    backgroundColor: '#0C5436',
  },
  webBottomText: {
    color: '#0F6B45',
    fontWeight: '700',
  },
  webBottomTextActive: {
    color: '#fff',
  },
  webBottomTextLarge: {
    color: '#fff',
    fontWeight: '800',
  },
  webSliderTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    width: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  webSliderFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#0F6B45',
  },
  webSliderThumb: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0F6B45'
  },
  modernSizeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)'
  },

  // Action Tools Section (Undo, Redo, Save) - Based on your UI reference
  actionToolsSection: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 16
  },
  actionToolButton: {
    flex: 1,
    backgroundColor: '#8b5cf6', // Purple for Undo and Redo
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    // 3D effect
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 5
  },
  saveToolButton: {
    flex: 1,
    backgroundColor: '#10b981', // Green for Save
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    // 3D effect
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 5
  },
  actionToolLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff'
  },

  // Brush Size Controls - All Platforms
  brushSizeSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)'
  },
  brushSizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
    textAlign: 'center'
  },
  brushSizeControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16
  },
  brushSizeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },

  // Reference Action Buttons Styles (matching the Kids Draw image)
  referenceActionSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    padding: 12,
    marginTop: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 8
  },
  referenceActionButton: {
    width: screenWidth < 350 ? 36 : 44,
    height: screenWidth < 350 ? 36 : 44,
    borderRadius: screenWidth < 350 ? 18 : 22,
    backgroundColor: '#6366f1', // Purple color matching the reference
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  zoomPercentage: {
    fontSize: screenWidth < 350 ? 12 : 14,
    fontWeight: '600',
    color: '#6366f1',
    marginHorizontal: screenWidth < 350 ? 4 : 8,
    textAlign: 'center',
    minWidth: 40
  },

  // Compact Brush Size Controls
  compactBrushSizeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    marginHorizontal: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  compactBrushSizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginRight: 12,
    minWidth: 70
  },
  compactSliderContainer: {
    flex: 1,
    maxWidth: 200
  },
  compactSlider: {
    width: '100%',
    height: 30
  },

  // Custom Android slider
  customSliderWrap: {
    flex: 1,
    paddingHorizontal: 4,
  },
  customSliderTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
  },
  customSliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  customSliderThumb: {
    position: 'absolute',
    top: -10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#4f46e5',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  }
});
