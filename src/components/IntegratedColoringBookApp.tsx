import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
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
  PanGestureHandler,
  PinchGestureHandler,
  State,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
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
import { ZebraColoringCanvas } from './ZebraColoringCanvas';
import { NativeZebraCanvas } from './NativeZebraCanvas';
import FullscreenCanvas from './FullscreenCanvas';

const { width: screenWidth } = Dimensions.get('window');

export default function IntegratedColoringBookApp({
  compact = false,
}: {
  compact?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedTool, setSelectedTool] = useState<
    'brush' | 'bucket' | 'eraser'
  >('bucket');
  const [brushSize, setBrushSize] = useState(8);
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'color'>(
    'templates'
  );
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const webSliderTrackRef = useRef<View>(null);
  const [webSliderTrackWidth, setWebSliderTrackWidth] = useState(0);
  const bitmapCanvasRef = useRef<any>(null);
  const captureViewRef = useRef<View>(null);
  
  // Gesture handling for pan and zoom
  const scale = useSharedValue(1);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);
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

  // Pinch gesture handler for zooming
  const pinchHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startScale = scale.value;
    },
    onActive: (event: any, context: any) => {
      scale.value = context.startScale * event.scale;
      // Update zoom state for UI
      runOnJS(setZoom)(Math.max(0.5, Math.min(3, context.startScale * event.scale)));
    },
    onEnd: () => {
      scale.value = withSpring(Math.max(0.5, Math.min(3, scale.value)));
    },
  });

  // Pan gesture handler for dragging when zoomed
  const panHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translationX.value;
      context.startY = translationY.value;
    },
    onActive: (event: any, context: any) => {
      // Only allow panning when zoomed in
      if (scale.value > 1) {
        translationX.value = context.startX + event.translationX;
        translationY.value = context.startY + event.translationY;
      }
    },
    onEnd: () => {
      // Add boundaries to prevent panning too far
      const maxTranslation = ((scale.value - 1) * screenWidth) / 2;
      translationX.value = withSpring(
        Math.max(-maxTranslation, Math.min(maxTranslation, translationX.value))
      );
      translationY.value = withSpring(
        Math.max(-maxTranslation, Math.min(maxTranslation, translationY.value))
      );
    },
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

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setZoom(1);

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
    } catch {}
  };

  const handleExpandFullscreen = async () => {
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
        {/* Floating status label */}
        <View style={styles.floatingStatus}>
          <Text style={styles.statusText}>
            Tool: {selectedTool === 'brush' ? 'Pen' : selectedTool === 'bucket' ? 'Bucket' : 'Brush'} • Color: {selectedColor}
          </Text>
        </View>

        {/* Zoom controls - Right edge floating */}
        <View style={styles.floatingZoomControls}>
          <TouchableOpacity style={styles.modernZoomButton} onPress={() => setZoom(prev => Math.min(prev + 0.25, 3))}>
            <Feather name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.modernZoomButton} onPress={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}>
            <Feather name="minus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.modernZoomText}>{Math.round(zoom * 100)}%</Text>
        </View>

        {/* Canvas */}
        {currentTemplate?.bitmapUri ? (
          Platform.OS === 'web' ? (
            <PinchGestureHandler onGestureEvent={pinchHandler}>
              <Animated.View style={styles.modernCanvasContainer}>
                <PanGestureHandler onGestureEvent={panHandler}>
                  <Animated.View style={[animatedStyle, { flex: 1 }]}>
                    <WorkingColoringCanvas
                      ref={bitmapCanvasRef}
                      selectedColor={selectedColor}
                      selectedTool={selectedTool}
                      brushSize={brushSize}
                      templateUri={currentTemplate.bitmapUri}
                    />
                  </Animated.View>
                </PanGestureHandler>
              </Animated.View>
            </PinchGestureHandler>
          ) : (
            <PinchGestureHandler onGestureEvent={pinchHandler}>
              <Animated.View ref={captureViewRef} collapsable={false} style={styles.modernCanvasContainer}>
                <PanGestureHandler onGestureEvent={panHandler}>
                  <Animated.View style={[animatedStyle, { flex: 1 }]}>
                    <NativeZebraCanvas
                      ref={bitmapCanvasRef}
                      templateUri={currentTemplate.bitmapUri}
                      selectedColor={selectedColor}
                      selectedTool={selectedTool}
                      brushWidth={brushSize}
                      onColoringComplete={() => {}}
                      width={screenWidth - 32}
                      height={(screenWidth - 32) * 0.8}
                    />
                  </Animated.View>
                </PanGestureHandler>
              </Animated.View>
            </PinchGestureHandler>
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
          <TouchableOpacity
            style={[styles.toolButton, selectedTool === 'brush' && styles.activeToolButton]}
            onPress={() => setSelectedTool('brush')}
          >
            <Feather name="edit-3" size={24} color={selectedTool === 'brush' ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.toolLabel, selectedTool === 'brush' && styles.activeToolLabel]}>Pen</Text>
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
            <Text style={[styles.toolLabel, selectedTool === 'bucket' && styles.activeToolLabel]}>Bucket</Text>
          </TouchableOpacity>
        </View>

        {/* Size Slider - Only show for pen/brush tools */}
        {(selectedTool === 'brush' || selectedTool === 'eraser') && (
          <View style={styles.sizeSliderRow}>
            <Text style={styles.sizeLabel}>Size: {brushSize}px</Text>
            <Slider
              style={styles.sizeSlider}
              minimumValue={2}
              maximumValue={20}
              value={brushSize}
              onValueChange={setBrushSize}
              step={1}
              minimumTrackTintColor="#6366f1"
              maximumTrackTintColor="#E2E8F0"
              thumbTintColor="#6366f1"
            />
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
        <View style={styles.footerButtonsRow}>
          <TouchableOpacity style={styles.footerButton}>
            <MaterialIcons name="colorize" size={20} color="#64748B" />
            <Text style={styles.footerButtonText}>Color Picker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerButton} onPress={() => setActiveTab('templates')}>
            <MaterialIcons name="view-module" size={20} color="#64748B" />
            <Text style={styles.footerButtonText}>Templates</Text>
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
        selectedTool={selectedTool}
        brushSize={brushSize}
        onColoringChange={() => {}}
        onColoringComplete={() => {}}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff', // Light blue gradient background
  },
  
  // Modern Mobile-Friendly Layout Styles
  modernContainer: {
    flex: 1,
    backgroundColor: '#f0f4ff',
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
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  bottomToolbar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: '35%',
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  toolButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    minWidth: 80,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
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
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  modernActionButton: {
    width: 48,
    height: 48,
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  footerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
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
  }
});
