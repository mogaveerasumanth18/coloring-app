import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  type BrushStroke,
  type ColoringBitmap,
  SimpleColoringEngine,
  type TouchPoint,
} from '../utils/SimpleColoringEngine';

interface PngColoringCanvasProps {
  pngUri: string;
  selectedColor: string;
  onColoringChange?: (bitmap: ColoringBitmap) => void;
  onProgress?: (progress: string) => void;
}

type PaintMode = 'flood' | 'brush';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const PngColoringCanvas: React.FC<PngColoringCanvasProps> = ({
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
  const [brushSize] = useState(8);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<TouchPoint[]>([]);

  // Refs for touch handling
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const viewRef = useRef<View>(null);
  const drawingRef = useRef<boolean>(false);

  // Load PNG image and initialize bitmap
  const initializeBitmap = useCallback(async () => {
    try {
      setLoading(true);
      onProgress?.('Loading PNG image...');

      console.log('🖼️ Loading PNG template:', pngUri);

      // Validate the PNG URI first
      if (!pngUri) {
        throw new Error('No PNG URI provided');
      }

      // Test different URI formats for Android APK compatibility
      let workingUri = pngUri;

      console.log('🔍 Testing PNG URI accessibility...', typeof pngUri, pngUri);

      // Handle different URI formats
      if (typeof pngUri === 'number' || !isNaN(Number(pngUri))) {
        // Convert numeric asset ID to URI
        console.log('🔄 Converting numeric asset ID to URI:', pngUri);
        const resolved = Image.resolveAssetSource(Number(pngUri));
        if (resolved && resolved.uri) {
          workingUri = resolved.uri;
          console.log('✅ Converted to URI:', workingUri);
        } else {
          throw new Error('Failed to resolve numeric asset');
        }
      } else {
        // Use URI as-is for asset://, file://, or http:// URIs
        workingUri = pngUri;
        console.log('✅ Using URI directly:', workingUri);
      }

      setDisplayUri(workingUri);

      // Create bitmap from the PNG template
      console.log('🎨 Creating coloring bitmap from template...');
      const coloringBitmap =
        await SimpleColoringEngine.createBitmapFromUri(workingUri);
      setBitmap(coloringBitmap);

      // Set canvas size
      const maxWidth = SCREEN_WIDTH - 40;
      const maxHeight = SCREEN_HEIGHT * 0.6;
      const aspectRatio = coloringBitmap.width / coloringBitmap.height;

      let canvasWidth, canvasHeight;
      if (aspectRatio > maxWidth / maxHeight) {
        canvasWidth = maxWidth;
        canvasHeight = maxWidth / aspectRatio;
      } else {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * aspectRatio;
      }

      setCanvasSize({ width: canvasWidth, height: canvasHeight });
      setLastSavedHash(SimpleColoringEngine.hashBitmap(coloringBitmap));

      console.log('✅ PNG template loaded successfully with URI:', workingUri);
      onProgress?.('✅ Template ready to color!');
    } catch (error) {
      console.error('❌ Failed to initialize PNG template:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);

      // More detailed error alert
      Alert.alert(
        'Template Loading Error',
        `Failed to load the coloring template.\n\nError: ${errorMessage}\n\nTroubleshooting:\n• Try selecting a different template\n• Check if assets are bundled in APK\n• Ensure stable internet connection\n\nURI attempted: ${pngUri}`,
        [{ text: 'OK' }]
      );

      onProgress?.('❌ Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [pngUri, onProgress]);

  // Initialize bitmap when component mounts or pngUri changes
  useEffect(() => {
    if (pngUri) {
      initializeBitmap();
    }
  }, [pngUri, initializeBitmap]);

  // Handle coloring action - FLOOD FILL
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

        onProgress?.(`🎨 Filling area with ${selectedColor}...`);

        // Convert screen coordinates to bitmap coordinates
        const bitmapX = Math.floor((touchX / canvasSize.width) * bitmap.width);
        const bitmapY = Math.floor(
          (touchY / canvasSize.height) * bitmap.height
        );

        console.log('📍 Bitmap coordinates:', { bitmapX, bitmapY });

        // Find optimal paint point (avoid borders)
        const paintPoint = SimpleColoringEngine.findPaintableArea(
          bitmap,
          bitmapX,
          bitmapY
        );

        if (!paintPoint) {
          onProgress?.('❌ Cannot fill this area');
          console.log('❌ No paintable area found');
          return;
        }

        // Convert hex color to ARGB
        const fillColor = SimpleColoringEngine.hexToArgb(selectedColor);

        // Perform flood fill
        const newBitmap = SimpleColoringEngine.floodFill(
          bitmap,
          paintPoint.x,
          paintPoint.y,
          fillColor
        );

        // Check if anything changed
        const newHash = SimpleColoringEngine.hashBitmap(newBitmap);
        if (newHash === lastSavedHash) {
          onProgress?.('⚠️ Area already filled with this color');
          return;
        }

        // Update bitmap and display
        setBitmap(newBitmap);
        setLastSavedHash(newHash);

        // Update display with colored bitmap (simplified approach)
        // In a real implementation, you'd convert the bitmap back to an image
        console.log('🖼️ Updating display with colored bitmap');

        // For now, keep the original display but show success message
        onProgress?.('✅ Area filled successfully!');
        onColoringChange?.(newBitmap);

        console.log('✅ Flood fill completed successfully');
      } catch (error) {
        console.error('❌ Flood fill failed:', error);
        onProgress?.('❌ Failed to fill area');
        Alert.alert('Error', 'Failed to fill area. Please try again.');
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

  // Handle brush painting - BRUSH STROKE
  const performBrushStroke = useCallback(
    async (strokePoints: TouchPoint[]) => {
      if (!bitmap || strokePoints.length === 0) {
        console.log('❌ No bitmap or empty stroke');
        return;
      }

      try {
        console.log('🖌️ Applying brush stroke:', {
          pointCount: strokePoints.length,
          selectedColor,
          brushSize,
        });

        onProgress?.(`🖌️ Painting with brush...`);

        // Convert screen coordinates to bitmap coordinates
        const bitmapStroke: TouchPoint[] = strokePoints.map((point) => ({
          x: (point.x / canvasSize.width) * bitmap.width,
          y: (point.y / canvasSize.height) * bitmap.height,
        }));

        const brushStroke: BrushStroke = {
          points: bitmapStroke,
          color: selectedColor,
          thickness: brushSize,
        };

        // Apply brush stroke
        const newBitmap = SimpleColoringEngine.applyBrushStroke(
          bitmap,
          brushStroke
        );

        // Update bitmap
        setBitmap(newBitmap);
        setLastSavedHash(SimpleColoringEngine.hashBitmap(newBitmap));

        // Notify parent and show success
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

  // Legacy coloring function for backwards compatibility
  const performColoring = useCallback(
    async (touchX: number, touchY: number) => {
      // Default to flood fill mode
      await performFloodFill(touchX, touchY);
    },
    [performFloodFill]
  );

  // Create pan responder for touch handling with both modes
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => paintMode === 'brush', // Allow moves for brush mode

    onPanResponderGrant: (evt) => {
      if (!bitmap || loading) return;

      const { locationX, locationY } = evt.nativeEvent;

      if (paintMode === 'flood') {
        // Flood fill mode - single tap
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
        }

        touchTimeoutRef.current = setTimeout(() => {
          performFloodFill(locationX, locationY);
        }, 150);
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
      if (paintMode === 'flood') {
        // Clear timeout for flood fill if released quickly
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
          touchTimeoutRef.current = null;
        }
      } else if (
        paintMode === 'brush' &&
        drawingRef.current &&
        currentStroke.length > 0
      ) {
        // Apply the brush stroke
        performBrushStroke(currentStroke);
        setCurrentStroke([]);
        setIsDrawing(false);
        drawingRef.current = false;
      }
    },
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

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
      {/* Paint Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            paintMode === 'flood' && styles.modeButtonActive,
          ]}
          onPress={() => setPaintMode('flood')}
        >
          <Ionicons
            name="color-fill"
            size={20}
            color={paintMode === 'flood' ? '#fff' : '#4ECDC4'}
          />
          <Text
            style={[
              styles.modeText,
              paintMode === 'flood' && styles.modeTextActive,
            ]}
          >
            Fill
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            paintMode === 'brush' && styles.modeButtonActive,
          ]}
          onPress={() => setPaintMode('brush')}
        >
          <Ionicons
            name="brush"
            size={20}
            color={paintMode === 'brush' ? '#fff' : '#FF6B6B'}
          />
          <Text
            style={[
              styles.modeText,
              paintMode === 'brush' && styles.modeTextActive,
            ]}
          >
            Paint
          </Text>
        </TouchableOpacity>
      </View>

      <View
        ref={viewRef}
        style={[
          styles.canvasContainer,
          {
            width: canvasSize.width,
            height: canvasSize.height,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Image
          source={{ uri: displayUri }}
          style={[
            styles.coloringImage,
            {
              width: canvasSize.width,
              height: canvasSize.height,
            },
          ]}
          resizeMode="contain"
        />

        {/* Invisible overlay for touch handling */}
        <View style={StyleSheet.absoluteFill} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>📎 Tap areas to fill with color</Text>
        <Text style={styles.sizeText}>
          Size: {bitmap.width}x{bitmap.height}px
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
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  progressText: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
  canvasContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  coloringImage: {
    backgroundColor: '#FFFFFF',
  },
  infoContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  sizeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});
