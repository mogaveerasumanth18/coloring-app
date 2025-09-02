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
import { opacity } from 'react-native-reanimated/lib/typescript/Colors';

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
  const [uiVisible, setUiVisible] = useState(true);
  // UI density modes to control how much chrome is shown
  const [uiMode, setUiMode] = useState<'full' | 'compact' | 'minimal'>('compact');
  const [showZoom, setShowZoom] = useState(false); // compact: open a temporary zoom slider

  // Auto-hide UI shortly after entering fullscreen; can be revealed with the toggle
  useEffect(() => {
    if (!isVisible) return;
    const t = setTimeout(() => setUiVisible(false), 2500);
    return () => clearTimeout(t);
  }, [isVisible]);

  const revealUi = () => setUiVisible(true);
  const cycleUiMode = () => {
    setUiVisible(true);
    setShowZoom(false);
    setUiMode((m) => (m === 'full' ? 'compact' : m === 'compact' ? 'minimal' : 'full'));
  };

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
        <View
          style={[
            styles.canvasSection,
            uiVisible && (uiMode === 'full'
              ? styles.canvasSectionPaddedFull
              : uiMode === 'compact'
              ? styles.canvasSectionPaddedCompact
              : null),
          ]}
        >
          <View
            style={[styles.canvasContainer, roundedCorners && { borderRadius: 12 }]}
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
                  style={{
                    width: computeFit(canvasSize, templateSize).width,
                    height: computeFit(canvasSize, templateSize).height,
                    transform: [{ scale: zoom }],
                  }}
                >
                  {Platform.OS === 'web' ? (
                    <WorkingColoringCanvas
                      selectedColor={currentColor}
                      selectedTool={currentTool}
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
                      selectedTool={currentTool}
                      brushWidth={currentBrushSize}
                      onColoringComplete={onColoringComplete}
                      width={computeFit(canvasSize, templateSize).width}
                      height={computeFit(canvasSize, templateSize).height}
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

        {/* Top toolbar */}
        {uiMode !== 'minimal' && (
          <View
            style={[styles.topActionsContainer, { opacity: uiVisible ? 1 : 0 }]}
            pointerEvents={uiVisible ? 'auto' : 'none'}
          >
            <View style={styles.actionRow}>
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
                onPress={() => setZoom((prev) => clampZoom(prev + 0.25))}
              >
                <Feather name="zoom-in" size={18} color="#ffffff" />
                {uiMode === 'full' && <Text style={styles.actionButtonText}>Zoom In</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={uiMode === 'compact' ? styles.smallActionButton : styles.actionButton}
                onPress={() => setZoom((prev) => clampZoom(prev - 0.25))}
              >
                <Feather name="zoom-out" size={18} color="#ffffff" />
                {uiMode === 'full' && <Text style={styles.actionButtonText}>Zoom Out</Text>}
              </TouchableOpacity>
              <View style={styles.zoomIndicator}>
                <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
              </View>
              <TouchableOpacity
                style={uiMode === 'compact' ? styles.smallActionButton : styles.actionButton}
                onPress={() => setZoom(1)}
              >
                <Feather name="refresh-ccw" size={18} color="#ffffff" />
                {uiMode === 'full' && <Text style={styles.actionButtonText}>Reset</Text>}
              </TouchableOpacity>
              {uiMode === 'compact' && (
                <TouchableOpacity style={styles.smallActionButton} onPress={() => setShowZoom((v) => !v)}>
                  <Feather name="sliders" size={18} color="#ffffff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[uiMode === 'compact' ? styles.smallActionButton : styles.actionButton, roundedCorners && styles.activeActionButton]}
                onPress={() => setRoundedCorners((v) => !v)}
              >
                <Feather name="corner-right-down" size={18} color="#ffffff" />
                {uiMode === 'full' && <Text style={styles.actionButtonText}>Corners</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom dock */}
        {uiMode !== 'minimal' && (
          <View
            style={[styles.bottomDock, { opacity: uiVisible ? 1 : 0 }]}
            pointerEvents={uiVisible ? 'auto' : 'none'}
          >
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[uiMode === 'compact' ? styles.smallActionButton : styles.actionButton, currentTool === 'brush' && styles.activeActionButton]}
                onPress={() => setCurrentTool('brush')}
              >
                <MaterialIcons name="brush" size={18} color="#ffffff" />
                {uiMode === 'full' && <Text style={styles.actionButtonText}>Paint</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[uiMode === 'compact' ? styles.smallActionButton : styles.actionButton, currentTool === 'bucket' && styles.activeActionButton]}
                onPress={() => setCurrentTool('bucket')}
              >
                <MaterialIcons name="format-color-fill" size={18} color="#ffffff" />
                {uiMode === 'full' && <Text style={styles.actionButtonText}>Fill</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[uiMode === 'compact' ? styles.smallActionButton : styles.actionButton, currentTool === 'eraser' && styles.activeActionButton]}
                onPress={() => setCurrentTool('eraser')}
              >
                <MaterialIcons name="auto-fix-off" size={18} color="#ffffff" />
                {uiMode === 'full' && <Text style={styles.actionButtonText}>Eraser</Text>}
              </TouchableOpacity>
              {uiMode === 'full' && (
                <View style={styles.sizeControl}>
                  <Text style={styles.sizeLabel}>Size:</Text>
                </View>
              )}
              <TouchableOpacity
                style={uiMode === 'compact' ? styles.smallActionButton : styles.colorPickerButton}
                onPress={() => setShowColorPicker(true)}
              >
                <View style={[styles.colorPreview, { backgroundColor: currentColor }]} />
                {uiMode === 'full' && <Text style={styles.actionButtonText}>Color</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Zoom slider overlay */}
        {(uiMode === 'full' || (uiMode === 'compact' && showZoom)) && (
          <View
            style={[styles.sliderOverlay, { opacity: uiVisible ? 1 : 0 }]}
            pointerEvents={uiVisible ? 'auto' : 'none'}
          >
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
        )}

        {/* Bottom actions or minimal FABs */}
        {uiMode !== 'minimal' ? (
          <View
            style={[styles.bottomActionsContainer, { opacity: uiVisible ? 1 : 0 }]}
            pointerEvents={uiVisible ? 'auto' : 'none'}
          >
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Feather name="save" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Save</Text>
            </TouchableOpacity>
            {uiMode === 'full' && (
              <TouchableOpacity style={styles.clearButton} onPress={() => canvasRef.current?.clear?.()}>
                <MaterialIcons name="clear" size={18} color="#ffffff" />
                <Text style={styles.actionButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.exitButton} onPress={handleClose}>
              <Feather name="minimize-2" size={18} color="#ffffff" />
              <Text style={styles.actionButtonText}>Exit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.miniFabCluster} pointerEvents={'auto'}>
            <TouchableOpacity style={styles.miniFab} onPress={handleSave}>
              <Feather name="save" size={18} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.miniFab} onPress={handleClose}>
              <Feather name="x" size={18} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.miniFab, styles.miniFabPrimary]}
              onPress={() => {
                setUiMode('compact');
                setUiVisible(true);
              }}
            >
              <Feather name="tool" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* UI mode toggle chip */}
        <TouchableOpacity style={styles.uiToggle} onPress={cycleUiMode} activeOpacity={0.9}>
          <Feather name={uiMode === 'minimal' ? 'eye' : 'eye-off'} size={14} color="#111827" />
          <Text style={styles.uiToggleText}>
            {uiMode === 'full' ? 'Full' : uiMode === 'compact' ? 'Compact' : 'Minimal'}
          </Text>
        </TouchableOpacity>
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
            <Text style={styles.colorPickerTitle}>Choose Color</Text>
            <ScrollView contentContainerStyle={styles.colorGrid} showsVerticalScrollIndicator={false}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }, currentColor === color && styles.selectedColorOption]}
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
  canvasSectionPaddedFull: {
    // Reserve space so overlays do not cover the drawable area (full UI)
    paddingTop: 72,
    paddingBottom: 140,
  },
  canvasSectionPaddedCompact: {
    // Smaller paddings in compact UI
    paddingTop: 48,
    paddingBottom: 96,
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
  smallActionButton: {
    backgroundColor: '#6366f1',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
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
  // Zoom slider overlay (bottom center)
  sliderOverlay: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    alignSelf: 'center',
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

  // UI toggle chip
  uiToggle: {
    position: 'absolute',
    top: 20,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 20,
  },
  uiToggleText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
});
