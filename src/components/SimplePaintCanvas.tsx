/* eslint-disable unicorn/filename-case, max-lines-per-function, import/no-unresolved */
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { PixelFloodFill } from '../utils/PixelFloodFill';
// Removed unused style import that caused TS JSX config complaints

interface SimplePaintCanvasProps {
  pngUri: string;
  selectedColor: string;
  onColoringChange?: (changes: any) => void;
  onProgress?: (progress: string) => void;
}

interface DrawingStroke {
  id: string;
  path: string;
  color: string;
  width: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const SimplePaintCanvas: React.FC<SimplePaintCanvasProps> = ({
  pngUri,
  selectedColor,
  onColoringChange,
  onProgress,
}) => {
  const [loading, setLoading] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 });
  // Intrinsic image size (optional informational; not used elsewhere)
  const [, /* _imageSize */ setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [paintMode, setPaintMode] = useState<'paint' | 'fill'>('fill');
  const [brushSize] = useState(8);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // State for pixel-based flood fill and drawing
  const [pixelFloodFill, setPixelFloodFill] = useState<PixelFloodFill | null>(
    null
  );
  const [svgPaths, setSvgPaths] = useState<
    { id: string; path: string; color: string }[]
  >([]);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isDrawing, setIsDrawing] = useState(false);

  const strokeIdRef = useRef(0);
  const viewRef = useRef<View>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const baseTranslateRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize canvas and pixel-based flood fill
  useEffect(() => {
    const initCanvas = async () => {
      setLoading(true);
      onProgress?.('Creating pixel-based template...');

      const maxWidth = Math.min(SCREEN_WIDTH - 40, 400);
      const maxHeight = Math.min(SCREEN_HEIGHT * 0.6, 400);
      const canvas = { width: maxWidth, height: maxHeight };
      setCanvasSize(canvas);

      // Measure intrinsic image size to derive the displayed viewport (contain)
      const { width: imgW, height: imgH } = await new Promise<{
        width: number;
        height: number;
      }>((resolve, reject) => {
        Image.getSize(
          pngUri,
          (w, h) => resolve({ width: w, height: h }),
          (err) => reject(err)
        );
      });
      setImageSize({ width: imgW, height: imgH });

      // Compute 'contain' viewport
      const scale = Math.min(canvas.width / imgW, canvas.height / imgH);
      const dispW = Math.round(imgW * scale);
      const dispH = Math.round(imgH * scale);
      const offsetX = Math.round((canvas.width - dispW) / 2);
      const offsetY = Math.round((canvas.height - dispH) / 2);
      const viewport = { x: offsetX, y: offsetY, width: dispW, height: dispH };

      // Create pixel-based flood fill system (like Android app)
      const floodFill = new PixelFloodFill(canvas.width, canvas.height);
      floodFill.setViewport(viewport);
      // Make boundary detection robust against anti-aliasing and faint lines
      floodFill.setDetectionOptions({
        useLuma: true,
        lumaThreshold: 110,
        alphaThreshold: 120, // consider faint anti-aliased edges
        dilate: true,
        dilateIterations: 2,
        sampleRadius: 3, // larger neighborhood to catch thin lines
        autoCalibrate: true,
        useOtsu: true,
        closing: true,
        closingIterations: 2,
        edgeDetect: true,
        edgeThreshold: 24,
        minRGBThreshold: 90,
      });
      try {
        await floodFill.initializeFromImage(pngUri);
        onProgress?.('✅ Template ready for boundary-based coloring!');
      } catch (error) {
        console.warn(
          '⚠️ Falling back to synthetic grid due to init error:',
          error
        );
        // Ensure we always have a usable grid
        floodFill.initializeFallback();
        onProgress?.('⚠️ Using fallback template (image decode unavailable).');
      }

      setPixelFloodFill(floodFill);
      setSvgPaths([]);
      setLoading(false);
    };

    if (pngUri) {
      initCanvas();
    }
  }, [pngUri, onProgress]);

  // Transform screen coordinates to content coordinates under pan/zoom
  const toContentCoords = useCallback(
    (x: number, y: number) => ({
      x: (x - translate.x) / Math.max(0.001, scale),
      y: (y - translate.y) / Math.max(0.001, scale),
    }),
    [scale, translate]
  );

  // Handle area filling with pixel-based flood fill (like Android app)
  const handleAreaFill = useCallback(
    (x: number, y: number) => {
      if (!pixelFloodFill) {
        onProgress?.('⚠️ Flood fill system not ready');
        return;
      }
      const { x: cx, y: cy } = toContentCoords(x, y);
      // Perform true flood fill at touched location
      const filledRegion = pixelFloodFill.fillAt(cx, cy, selectedColor);

      if (filledRegion) {
        // Update filled regions and regenerate SVG paths
        setSvgPaths(pixelFloodFill.getFilledRegionsAsSVGPaths());

        onColoringChange?.({
          type: 'flood_fill',
          regionId: filledRegion.id,
          color: selectedColor,
          pixelCount: filledRegion.pixels.size,
        });
        onProgress?.(`🎨 Filled area with ${filledRegion.pixels.size} pixels!`);
      } else {
        // Try intelligent search nearby (like Android BitmapColorSearch)
        const nearbyRegion = pixelFloodFill.findRegionNearPoint(
          cx,
          cy,
          10,
          selectedColor
        );
        if (nearbyRegion) {
          setSvgPaths(pixelFloodFill.getFilledRegionsAsSVGPaths());
          onProgress?.(`🎯 Found and filled nearby area!`);
        } else {
          onProgress?.(
            '⚠️ No fillable area found - try touching inside a white region'
          );
        }
      }
    },
    [
      pixelFloodFill,
      selectedColor,
      onColoringChange,
      onProgress,
      toContentCoords,
    ]
  );

  // Pan responder for touch handling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => isPanning || paintMode === 'paint',

    onPanResponderGrant: (evt, gestureState) => {
      const { locationX, locationY } = evt.nativeEvent;
      if (isPanning) {
        panStartRef.current = { x: gestureState.x0, y: gestureState.y0 };
        baseTranslateRef.current = { ...translate };
        return;
      }
      if (paintMode === 'fill') {
        handleAreaFill(locationX, locationY);
      } else {
        setIsDrawing(true);
        const { x: cx, y: cy } = toContentCoords(locationX, locationY);
        setCurrentPath(`M ${cx} ${cy}`);
      }
    },

    onPanResponderMove: (evt, gestureState) => {
      if (isPanning && panStartRef.current) {
        const dx = gestureState.moveX - panStartRef.current.x;
        const dy = gestureState.moveY - panStartRef.current.y;
        setTranslate({
          x: baseTranslateRef.current.x + dx,
          y: baseTranslateRef.current.y + dy,
        });
        return;
      }
      if (paintMode === 'paint' && isDrawing) {
        const { locationX, locationY } = evt.nativeEvent;
        const { x: cx, y: cy } = toContentCoords(locationX, locationY);
        setCurrentPath((prev) => `${prev} L ${cx} ${cy}`);
      }
    },

    onPanResponderRelease: () => {
      panStartRef.current = null;
      if (paintMode === 'paint' && isDrawing && currentPath) {
        const newStroke: DrawingStroke = {
          id: `stroke_${strokeIdRef.current++}`,
          path: currentPath,
          color: selectedColor,
          width: brushSize,
        };
        setStrokes((prev) => [...prev, newStroke]);
        onColoringChange?.(newStroke);
        onProgress?.('🖌️ Brush stroke applied!');
        setCurrentPath('');
        setIsDrawing(false);
      }
    },
  });

  // Clear all drawings and colors
  const clearCanvas = useCallback(() => {
    setStrokes([]);
    if (pixelFloodFill) {
      pixelFloodFill.clearAll();
      setSvgPaths([]);
    }
    setCurrentPath('');
    setIsDrawing(false);
    onProgress?.('🧹 Canvas cleared!');
  }, [pixelFloodFill, onProgress]);

  // Zoom helpers
  const setZoomAt = useCallback(
    (nextScale: number, anchorX?: number, anchorY?: number) => {
      const clamped = Math.max(0.5, Math.min(4, nextScale));
      const containerW = isFullscreen
        ? Dimensions.get('window').width
        : canvasSize.width;
      const containerH = isFullscreen
        ? Dimensions.get('window').height
        : canvasSize.height;
      const ax = anchorX ?? containerW / 2;
      const ay = anchorY ?? containerH / 2;
      const { x: cx, y: cy } = toContentCoords(ax, ay);
      setScale(clamped);
      setTranslate({ x: ax - cx * clamped, y: ay - cy * clamped });
    },
    [canvasSize.height, canvasSize.width, isFullscreen, toContentCoords]
  );

  const zoomIn = useCallback(() => {
    setZoomAt(scale * 1.25);
  }, [scale, setZoomAt]);
  const zoomOut = useCallback(() => {
    setZoomAt(scale / 1.25);
  }, [scale, setZoomAt]);
  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      // Lock orientation to landscape if the module is available
      // Optional dependency: expo-screen-orientation
      const mod = await import('expo-screen-orientation').catch(
        () => null as any
      );
      if (mod?.lockAsync && mod?.OrientationLock) {
        await mod.lockAsync(mod.OrientationLock.LANDSCAPE);
      }
    } catch {}
    setIsFullscreen(true);
    // Auto-fit canvas to screen
    setTimeout(() => {
      const win = Dimensions.get('window');
      const s = Math.min(
        win.width / canvasSize.width,
        win.height / canvasSize.height
      );
      setZoomAt(Math.max(1, s));
    }, 0);
  }, [canvasSize.height, canvasSize.width, setZoomAt]);

  const _exitFullscreen = useCallback(async () => {
    setIsFullscreen(false);
    try {
      const mod = await import('expo-screen-orientation').catch(
        () => null as any
      );
      if (mod?.lockAsync && mod?.OrientationLock) {
        await mod.lockAsync(mod.OrientationLock.PORTRAIT);
      }
    } catch {}
    // Reset view back to defaults for normal mode
    resetView();
  }, [resetView]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading coloring template...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Control Panel */}
      <View style={styles.controlPanel}>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              paintMode === 'paint' && styles.modeButtonActive,
            ]}
            onPress={() => setPaintMode('paint')}
          >
            <Ionicons
              name="brush"
              size={18}
              color={paintMode === 'paint' ? '#fff' : '#4ECDC4'}
            />
            <Text
              style={[
                styles.modeText,
                paintMode === 'paint' && styles.modeTextActive,
              ]}
            >
              Paint
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              paintMode === 'fill' && styles.modeButtonActive,
            ]}
            onPress={() => setPaintMode('fill')}
          >
            <Ionicons
              name="color-palette"
              size={18}
              color={paintMode === 'fill' ? '#fff' : '#FF6B6B'}
            />
            <Text
              style={[
                styles.modeText,
                paintMode === 'fill' && styles.modeTextActive,
              ]}
            >
              Fill
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, isPanning && styles.modeButtonActive]}
            onPress={() => setIsPanning((p) => !p)}
          >
            <Ionicons
              name="move"
              size={18}
              color={isPanning ? '#fff' : '#4ECDC4'}
            />
            <Text style={[styles.modeText, isPanning && styles.modeTextActive]}>
              Pan
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={clearCanvas}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>

        <View style={[styles.modeToggle, { marginLeft: 8 }]}>
          <TouchableOpacity style={styles.modeButton} onPress={zoomOut}>
            <Ionicons name="remove" size={18} color="#4ECDC4" />
            <Text style={styles.modeText}>Zoom -</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modeButton} onPress={zoomIn}>
            <Ionicons name="add" size={18} color="#4ECDC4" />
            <Text style={styles.modeText}>Zoom +</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modeButton} onPress={resetView}>
            <Ionicons name="refresh" size={18} color="#4ECDC4" />
            <Text style={styles.modeText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, { backgroundColor: '#1f2937' }]}
            onPress={isFullscreen ? _exitFullscreen : enterFullscreen}
          >
            <Ionicons name="expand" size={18} color="#fff" />
            <Text style={[styles.modeText, { color: '#fff' }]}>Full</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Canvas */}
      <View style={styles.canvasWrapper}>
        <View
          ref={viewRef}
          style={[
            styles.canvas,
            {
              width: canvasSize.width,
              height: canvasSize.height,
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Background PNG Template */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: canvasSize.width,
              height: canvasSize.height,
              transform: [
                { translateX: translate.x },
                { translateY: translate.y },
                { scale },
              ],
            }}
          >
            <Image
              source={{ uri: pngUri }}
              style={[
                styles.templateImage,
                {
                  width: canvasSize.width,
                  height: canvasSize.height,
                },
              ]}
              resizeMode="contain"
            />

            {/* SVG Overlay for drawings */}
            <Svg
              style={StyleSheet.absoluteFill}
              width={canvasSize.width}
              height={canvasSize.height}
            >
              {svgPaths.map((svgPath, index) => (
                <Path
                  key={index}
                  d={svgPath.path}
                  fill={svgPath.color}
                  fillOpacity={0.85}
                  stroke="none"
                />
              ))}

              {strokes.map((stroke) => (
                <Path
                  key={stroke.id}
                  d={stroke.path}
                  stroke={stroke.color}
                  strokeWidth={Math.max(1, stroke.width)}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {currentPath && (
                <Path
                  d={currentPath}
                  stroke={selectedColor}
                  strokeWidth={brushSize}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.8}
                />
              )}
            </Svg>
          </View>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {paintMode === 'paint'
            ? '🖌️ Draw with your finger to paint'
            : '🎨 Tap enclosed areas to fill with color'}
        </Text>
        <Text style={styles.colorInfo}>
          Current color: <Text style={{ color: selectedColor }}>●</Text>{' '}
          {selectedColor}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  controlPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  modeButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  modeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeTextActive: {
    color: '#fff',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  canvasWrapper: {
    alignItems: 'center',
  },
  canvas: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  templateImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 6,
  },
  colorInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

// Fullscreen modal rendering for big canvas
// We render the same component area within a modal to maximize space,
// using the same pan/zoom state and transform above.
