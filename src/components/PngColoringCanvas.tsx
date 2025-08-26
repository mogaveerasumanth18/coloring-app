import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Alert, PanResponder } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import UPNG from 'upng-js';
import { encode as btoa } from 'base-64';
import {
  type BrushStroke,
  type ColoringBitmap,
  SimpleColoringEngine,
  type TouchPoint,
} from '../utils/SimpleColoringEngine';

interface PngColoringCanvasProps {
  pngUri: string;
  selectedColor: string;
  controlledPaintMode?: 'flood' | 'brush';
  brushSize?: number;
  onColoringChange?: (bitmap: ColoringBitmap) => void;
  onProgress?: (progress: string) => void;
}

type PaintMode = 'flood' | 'brush';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PngColoringCanvas = React.forwardRef<any, PngColoringCanvasProps>((props, ref) => {
  const { pngUri, selectedColor, controlledPaintMode, brushSize: brushSizeProp, onColoringChange, onProgress } = props;

  const [loading, setLoading] = useState(false);
  const [bitmap, setBitmap] = useState<ColoringBitmap | null>(null);
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [lastSavedHash, setLastSavedHash] = useState<number>(0);
  const [paintMode, setPaintMode] = useState<PaintMode>(controlledPaintMode ?? 'flood');
  const [isEraser, setIsEraser] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<TouchPoint[]>([]);

  const brushSize = brushSizeProp ?? 8;
  const viewRef = useRef<View>(null);
  const touchTimeoutRef = useRef<any>(null);
  const drawingRef = useRef<boolean>(false);

  // Convert ARGB Uint32Array to PNG data URL for Image source
  const bitmapToDataUrl = useCallback((bm: ColoringBitmap): string => {
    const { width, height, pixels } = bm;
    const rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < pixels.length; i++) {
      const argb = pixels[i] >>> 0;
      const a = (argb >> 24) & 0xff;
      const r = (argb >> 16) & 0xff;
      const g = (argb >> 8) & 0xff;
      const b = argb & 0xff;
      const idx = i * 4;
      rgba[idx] = r; rgba[idx + 1] = g; rgba[idx + 2] = b; rgba[idx + 3] = a;
    }
    const png = (UPNG as any).encode([rgba.buffer], width, height, 0);
    let binary = '';
    const bytes = new Uint8Array(png);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      binary += String.fromCharCode.apply(null as any, Array.prototype.slice.call(bytes, i, i + chunk));
    }
    const b64 = btoa(binary);
    return `data:image/png;base64,${b64}`;
  }, []);

  // keep in sync with parent if provided
  useEffect(() => { if (controlledPaintMode) setPaintMode(controlledPaintMode); }, [controlledPaintMode]);

  // History (undo/redo)
  const historyRef = useRef<ColoringBitmap[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const cloneBitmap = (bm: ColoringBitmap): ColoringBitmap => ({ width: bm.width, height: bm.height, pixels: new Uint32Array(bm.pixels) });
  const pushHistory = (bm: ColoringBitmap) => {
    if (historyIndexRef.current < historyRef.current.length - 1) historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(cloneBitmap(bm));
    if (historyRef.current.length > 30) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  };

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
        const bm = cloneBitmap(historyRef.current[historyIndexRef.current]);
        setBitmap(bm);
        setDisplayUri(bitmapToDataUrl(bm));
        setLastSavedHash(SimpleColoringEngine.hashBitmap(bm));
        onColoringChange?.(bm);
      }
    },
    redo: () => {
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyIndexRef.current += 1;
        const bm = cloneBitmap(historyRef.current[historyIndexRef.current]);
        setBitmap(bm);
        setDisplayUri(bitmapToDataUrl(bm));
        setLastSavedHash(SimpleColoringEngine.hashBitmap(bm));
        onColoringChange?.(bm);
      }
    },
  }));

  // Load and init bitmap
  const initializeBitmap = useCallback(async () => {
    try {
      setLoading(true);
      onProgress?.('Loading PNG image...');
      if (!pngUri) throw new Error('No PNG URI provided');

      let workingUri = pngUri as any;
      if (typeof pngUri === 'number' || !isNaN(Number(pngUri as any))) {
        const resolved = Image.resolveAssetSource(Number(pngUri));
        if (resolved?.uri) workingUri = resolved.uri; else throw new Error('Failed to resolve numeric asset');
      }

      const bm = await SimpleColoringEngine.createBitmapFromUri(workingUri);
      setBitmap(bm);
      setDisplayUri(bitmapToDataUrl(bm));
      pushHistory(bm);

      const maxWidth = SCREEN_WIDTH - 40;
      const maxHeight = SCREEN_HEIGHT * 0.6;
      const aspectRatio = bm.width / bm.height;
      let canvasWidth: number; let canvasHeight: number;
      if (aspectRatio > maxWidth / maxHeight) { canvasWidth = maxWidth; canvasHeight = maxWidth / aspectRatio; }
      else { canvasHeight = maxHeight; canvasWidth = maxHeight * aspectRatio; }
      setCanvasSize({ width: canvasWidth, height: canvasHeight });
      setLastSavedHash(SimpleColoringEngine.hashBitmap(bm));
      onProgress?.('✅ Template ready to color!');
    } catch (e: any) {
      Alert.alert('Template Loading Error', e?.message ?? 'Unknown error');
      onProgress?.('❌ Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [pngUri, bitmapToDataUrl, onProgress]);

  useEffect(() => { if (pngUri) initializeBitmap(); }, [pngUri, initializeBitmap]);

  // Actions
  const performFloodFill = useCallback(async (touchX: number, touchY: number) => {
    if (!bitmap) return;
    try {
      onProgress?.(`🎨 Filling area with ${selectedColor}...`);
      const bitmapX = Math.floor((touchX / canvasSize.width) * bitmap.width);
      const bitmapY = Math.floor((touchY / canvasSize.height) * bitmap.height);
      const paintPoint = SimpleColoringEngine.findPaintableArea(bitmap, bitmapX, bitmapY);
      if (!paintPoint) { onProgress?.('❌ Cannot fill this area'); return; }
      const fillColor = SimpleColoringEngine.hexToArgb(selectedColor);
      const newBitmap = SimpleColoringEngine.floodFill(bitmap, paintPoint.x, paintPoint.y, fillColor);
      const newHash = SimpleColoringEngine.hashBitmap(newBitmap);
      if (newHash === lastSavedHash) { onProgress?.('⚠️ Area already filled with this color'); return; }
      setBitmap(newBitmap);
      setDisplayUri(bitmapToDataUrl(newBitmap));
      pushHistory(newBitmap);
      setLastSavedHash(newHash);
      onColoringChange?.(newBitmap);
      onProgress?.('✅ Area filled successfully!');
    } catch {
      onProgress?.('❌ Failed to fill area');
    }
  }, [bitmap, selectedColor, canvasSize, lastSavedHash, onColoringChange, onProgress, bitmapToDataUrl]);

  const performBrushStroke = useCallback(async (strokePoints: TouchPoint[]) => {
    if (!bitmap || strokePoints.length === 0) return;
    try {
      const bitmapStroke: TouchPoint[] = strokePoints.map((p) => ({
        x: (p.x / canvasSize.width) * bitmap.width,
        y: (p.y / canvasSize.height) * bitmap.height,
      }));
      const brushStroke: BrushStroke = { points: bitmapStroke, color: isEraser ? '#FFFFFF' : selectedColor, thickness: brushSize };
      const newBitmap = SimpleColoringEngine.applyBrushStroke(bitmap, brushStroke);
      setBitmap(newBitmap);
      setDisplayUri(bitmapToDataUrl(newBitmap));
      pushHistory(newBitmap);
      setLastSavedHash(SimpleColoringEngine.hashBitmap(newBitmap));
      onColoringChange?.(newBitmap);
      onProgress?.('✅ Brush stroke applied!');
    } catch {
      onProgress?.('❌ Failed to paint with brush');
    }
  }, [bitmap, selectedColor, brushSize, canvasSize, onColoringChange, onProgress, isEraser, bitmapToDataUrl]);

  // Touch handling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => paintMode === 'brush',
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => paintMode === 'brush',
    onPanResponderGrant: (evt) => {
      if (!bitmap || loading) return;
      const { locationX, locationY } = evt.nativeEvent;
      if (paintMode === 'flood') {
        if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
        touchTimeoutRef.current = setTimeout(() => { performFloodFill(locationX, locationY); }, 120);
      } else {
        drawingRef.current = true;
        setCurrentStroke([{ x: locationX, y: locationY }]);
      }
    },
    onPanResponderMove: (evt) => {
      if (paintMode === 'brush' && drawingRef.current) {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke((prev) => [...prev, { x: locationX, y: locationY }]);
      }
    },
    onPanResponderRelease: () => {
      if (paintMode === 'flood') {
        if (touchTimeoutRef.current) { clearTimeout(touchTimeoutRef.current); touchTimeoutRef.current = null; }
      } else if (paintMode === 'brush' && drawingRef.current && currentStroke.length > 0) {
        performBrushStroke(currentStroke);
        setCurrentStroke([]);
        drawingRef.current = false;
      }
    },
  });

  useEffect(() => () => { if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current); }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading PNG coloring template...</Text>
        {onProgress && <Text style={styles.progressText}>Please wait...</Text>}
      </View>
    );
  }

  if (!bitmap || !displayUri) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load PNG image</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mode toggle (hidden when parent controls the mode) */}
      {!controlledPaintMode && (
        <View style={styles.modeToggle}>
          <TouchableOpacity style={[styles.modeButton, paintMode === 'flood' && styles.modeButtonActive]} onPress={() => { setPaintMode('flood'); setIsEraser(false); }}>
            <MaterialIcons name="format-color-fill" size={20} color={paintMode === 'flood' ? '#fff' : '#4ECDC4'} />
            <Text style={[styles.modeText, paintMode === 'flood' && styles.modeTextActive]}>Fill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeButton, paintMode === 'brush' && !isEraser && styles.modeButtonActive]} onPress={() => { setPaintMode('brush'); setIsEraser(false); }}>
            <Ionicons name="brush" size={20} color={paintMode === 'brush' && !isEraser ? '#fff' : '#FF6B6B'} />
            <Text style={[styles.modeText, paintMode === 'brush' && !isEraser && styles.modeTextActive]}>Paint</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeButton, paintMode === 'brush' && isEraser && styles.modeButtonActive]} onPress={() => { setPaintMode('brush'); setIsEraser(true); }}>
            <MaterialIcons name="format-color-reset" size={20} color={paintMode === 'brush' && isEraser ? '#fff' : '#64748B'} />
            <Text style={[styles.modeText, paintMode === 'brush' && isEraser && styles.modeTextActive]}>Erase</Text>
          </TouchableOpacity>
        </View>
      )}

      <View ref={viewRef} style={[styles.canvasContainer, { width: canvasSize.width, height: canvasSize.height }]} {...panResponder.panHandlers}>
        <Image source={{ uri: displayUri }} style={[styles.coloringImage, { width: canvasSize.width, height: canvasSize.height }]} resizeMode="contain" />
        {/* Invisible overlay for touch handling */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none" />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>📎 Tap areas to fill with color</Text>
        <Text style={styles.sizeText}>Size: {bitmap.width}x{bitmap.height}px</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 10 },
  modeToggle: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 4, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  modeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginHorizontal: 2 },
  modeButtonActive: { backgroundColor: '#4ECDC4' },
  modeText: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: '#666' },
  modeTextActive: { color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#333', textAlign: 'center' },
  progressText: { marginTop: 5, fontSize: 14, color: '#666', textAlign: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 50 },
  errorText: { fontSize: 16, color: '#F44336', textAlign: 'center' },
  canvasContainer: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 2, borderColor: '#E0E0E0', overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  coloringImage: { backgroundColor: '#FFFFFF' },
  infoContainer: { marginTop: 10, alignItems: 'center' },
  infoText: { fontSize: 14, color: '#666', textAlign: 'center' },
  sizeText: { fontSize: 12, color: '#999', marginTop: 2 },
});
