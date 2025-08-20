import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  type BrushStroke,
  type ColoringBitmap,
  ProperColoringEngine,
  type TouchPoint,
} from '../utils/ProperColoringEngine';

interface EnhancedColoringCanvasProps {
  pngUri: string;
  selectedColor: string;
  onColoringChange?: (bitmap: ColoringBitmap) => void;
  onProgress?: (progress: string) => void;
}

type PaintMode = 'flood' | 'brush';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const EnhancedColoringCanvas: React.FC<EnhancedColoringCanvasProps> = ({
  pngUri,
  selectedColor,
  onColoringChange,
  onProgress,
}) => {
  const [bitmap, setBitmap] = useState<ColoringBitmap | null>(null);
  const [displayUri, setDisplayUri] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 });
  const [lastSavedHash, setLastSavedHash] = useState<number>(0);
  const [paintMode, setPaintMode] = useState<PaintMode>('flood');
  const [brushSize, setBrushSize] = useState(10);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<TouchPoint[]>([]);

  // Refs for drawing
  const viewRef = useRef<View>(null);
  const drawingRef = useRef<boolean>(false);

  // Load PNG and initialize bitmap
  const initializeBitmap = useCallback(async () => {
    try {
      setLoading(true);
      onProgress?.('Loading PNG template...');

      console.log('🚀 Initializing proper coloring canvas with:', pngUri);

      // Load the PNG as bitmap data
      const loadedBitmap = await ProperColoringEngine.loadPngAsBitmap();
      setBitmap(loadedBitmap);

      // Set display URI to original PNG for now
      setDisplayUri(pngUri);

      // Calculate optimal canvas size maintaining aspect ratio
      const maxWidth = Math.min(SCREEN_WIDTH * 0.9, 400);
      const maxHeight = Math.min(SCREEN_HEIGHT * 0.6, 400);

      let newWidth = maxWidth;
      let newHeight = (maxWidth / loadedBitmap.width) * loadedBitmap.height;

      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = (maxHeight / loadedBitmap.height) * loadedBitmap.width;
      }

      setCanvasSize({ width: newWidth, height: newHeight });
      setLastSavedHash(ProperColoringEngine.hashBitmap(loadedBitmap));

      onProgress?.('PNG template loaded successfully!');
      console.log('✅ Canvas initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize canvas:', error);
      onProgress?.('❌ Failed to load PNG template');
      Alert.alert(
        'Error',
        'Failed to load coloring template. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [pngUri, onProgress]);

  useEffect(() => {
    initializeBitmap();
  }, [initializeBitmap]);

  // Handle flood fill coloring
  const performFloodFill = useCallback(
    async (touchX: number, touchY: number) => {
      if (!bitmap) {
        console.log('❌ No bitmap available for flood fill');
        return;
      }

      try {
        console.log('🎨 Starting flood fill:', {
          touchX: Math.round(touchX),
          touchY: Math.round(touchY),
          selectedColor,
        });

        onProgress?.(`🎨 Filling with ${selectedColor}...`);

        // Convert screen coordinates to bitmap coordinates
        const bitmapX = Math.floor((touchX / canvasSize.width) * bitmap.width);
        const bitmapY = Math.floor(
          (touchY / canvasSize.height) * bitmap.height
        );

        console.log('📍 Bitmap coordinates:', { bitmapX, bitmapY });

        // Find optimal paint point (avoid borders)
        const paintPoint = ProperColoringEngine.findPaintableArea(
          bitmap,
          bitmapX,
          bitmapY
        );

        if (!paintPoint) {
          onProgress?.('❌ Cannot paint at this location');
          return;
        }

        // Convert hex color to ARGB
        const colorArgb = ProperColoringEngine.hexToArgb(selectedColor);

        // Perform flood fill
        const newBitmap = ProperColoringEngine.floodFill(
          bitmap,
          paintPoint.x,
          paintPoint.y,
          colorArgb
        );

        // Check if anything changed
        const newHash = ProperColoringEngine.hashBitmap(newBitmap);
        if (newHash === lastSavedHash) {
          onProgress?.('⚠️ Area already painted with this color');
          return;
        }

        // Update bitmap
        setBitmap(newBitmap);
        setLastSavedHash(newHash);

        // Update display (in real app, convert bitmap to image)
        const base64Png = await ProperColoringEngine.bitmapToBase64Png();
        setDisplayUri(`data:image/png;base64,${base64Png}`);

        // Notify parent
        onColoringChange?.(newBitmap);
        onProgress?.('✅ Area filled successfully!');

        console.log('✅ Flood fill completed successfully');
      } catch (error) {
        console.error('❌ Flood fill failed:', error);
        onProgress?.('❌ Failed to apply color');
        Alert.alert('Error', 'Failed to apply color. Please try again.');
      }
    },
    [
      bitmap,
      selectedColor,
      canvasSize,
      lastSavedHash,
      onColoringChange,
      onProgress,
    ]
  );

  // Handle brush stroke
  const applyBrushStroke = useCallback(
    async (stroke: TouchPoint[]) => {
      if (!bitmap || stroke.length === 0) {
        console.log('❌ No bitmap or empty stroke');
        return;
      }

      try {
        console.log('🖌️ Applying brush stroke:', {
          pointCount: stroke.length,
          selectedColor,
          brushSize,
        });

        onProgress?.(`🖌️ Painting with brush...`);

        // Convert screen coordinates to bitmap coordinates
        const bitmapStroke: TouchPoint[] = stroke.map((point) => ({
          x: (point.x / canvasSize.width) * bitmap.width,
          y: (point.y / canvasSize.height) * bitmap.height,
        }));

        const brushStroke: BrushStroke = {
          points: bitmapStroke,
          color: selectedColor,
          thickness: brushSize,
        };

        // Apply brush stroke
        const newBitmap = ProperColoringEngine.applyBrushStroke(
          bitmap,
          brushStroke
        );

        // Update bitmap
        setBitmap(newBitmap);
        setLastSavedHash(ProperColoringEngine.hashBitmap(newBitmap));

        // Update display
        const base64Png = await ProperColoringEngine.bitmapToBase64Png();
        setDisplayUri(`data:image/png;base64,${base64Png}`);

        // Notify parent
        onColoringChange?.(newBitmap);
        onProgress?.('✅ Brush stroke applied!');

        console.log('✅ Brush stroke completed successfully');
      } catch (error) {
        console.error('❌ Brush stroke failed:', error);
        onProgress?.('❌ Failed to paint with brush');
      }
    },
    [bitmap, selectedColor, brushSize, canvasSize, onColoringChange, onProgress]
  );

  // Pan responder for touch handling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => paintMode === 'brush',

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;

      if (paintMode === 'flood') {
        // Flood fill mode - single tap
        performFloodFill(locationX, locationY);
      } else {
        // Brush mode - start drawing
        setIsDrawing(true);
        drawingRef.current = true;
        const newStroke = [{ x: locationX, y: locationY }];
        setCurrentStroke(newStroke);
      }
    },

    onPanResponderMove: (evt) => {
      if (paintMode === 'brush' && drawingRef.current) {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentStroke((prev) => [...prev, { x: locationX, y: locationY }]);
      }
    },

    onPanResponderRelease: () => {
      if (
        paintMode === 'brush' &&
        drawingRef.current &&
        currentStroke.length > 0
      ) {
        // Apply the brush stroke
        applyBrushStroke(currentStroke);
        setCurrentStroke([]);
      }

      setIsDrawing(false);
      drawingRef.current = false;
    },
  });

  // Toggle paint mode
  const togglePaintMode = useCallback(() => {
    setPaintMode((prev) => (prev === 'flood' ? 'brush' : 'flood'));
    setCurrentStroke([]);
    setIsDrawing(false);
    drawingRef.current = false;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading coloring template...</Text>
        <Text style={styles.progressText}>
          Preparing advanced coloring features...
        </Text>
      </View>
    );
  }

  if (!bitmap || !displayUri) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load template</Text>
        <TouchableOpacity onPress={initializeBitmap} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Paint Mode Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.modeContainer}>
          <Ionicons
            name={paintMode === 'flood' ? 'color-fill' : 'brush'}
            size={24}
            color={paintMode === 'flood' ? '#4ECDC4' : '#FF6B6B'}
          />
          <Text style={styles.modeLabel}>
            {paintMode === 'flood' ? 'Fill Areas' : 'Paint Brush'}
          </Text>
          <Switch
            value={paintMode === 'brush'}
            onValueChange={togglePaintMode}
            trackColor={{ false: '#4ECDC4', true: '#FF6B6B' }}
            thumbColor={paintMode === 'brush' ? '#fff' : '#fff'}
          />
        </View>

        {paintMode === 'brush' && (
          <View style={styles.brushControls}>
            <Text style={styles.brushLabel}>Brush Size: {brushSize}</Text>
            <Slider
              style={styles.slider}
              minimumValue={2}
              maximumValue={20}
              value={brushSize}
              onValueChange={setBrushSize}
              step={1}
              minimumTrackTintColor="#FF6B6B"
              maximumTrackTintColor="#ddd"
            />
          </View>
        )}
      </View>

      {/* Canvas */}
      <View style={styles.canvasContainer}>
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
          <Image
            source={{ uri: displayUri }}
            style={styles.canvasImage}
            resizeMode="contain"
          />

          {/* Drawing preview for brush mode */}
          {paintMode === 'brush' && isDrawing && currentStroke.length > 0 && (
            <View style={styles.strokePreview}>
              {/* In a real app, you'd render the stroke preview here */}
              <View
                style={[
                  styles.brushPreview,
                  {
                    width: brushSize,
                    height: brushSize,
                    backgroundColor: selectedColor,
                    left:
                      currentStroke[currentStroke.length - 1]?.x -
                      brushSize / 2,
                    top:
                      currentStroke[currentStroke.length - 1]?.y -
                      brushSize / 2,
                  },
                ]}
              />
            </View>
          )}
        </View>
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <View
          style={[styles.colorIndicator, { backgroundColor: selectedColor }]}
        />
        <Text style={styles.statusText}>
          {paintMode === 'flood'
            ? 'Tap to fill areas'
            : `Painting with ${brushSize}px brush`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  brushControls: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  brushLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
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
  canvasImage: {
    width: '100%',
    height: '100%',
  },
  strokePreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  brushPreview: {
    position: 'absolute',
    borderRadius: 50,
    opacity: 0.7,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
});
