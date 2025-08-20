import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ZebraFloodFill } from '../utils/ZebraFloodFill';

interface ZebraCanvasProps {
  templateUri?: string;
  selectedColor: string;
  selectedTool: 'brush' | 'bucket' | 'eraser';
  brushWidth?: number;
  width?: number;
  height?: number;
  onColoringComplete?: (imageData: string) => void;
}

interface Point {
  x: number;
  y: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_CANVAS_SIZE = Math.min(SCREEN_WIDTH - 40, 400);

/**
 * ZebraCanvas - A coloring canvas that mimics the zebra-paint behavior
 *
 * Uses HTML5 Canvas for web compatibility and proper pixel manipulation
 */
export const ZebraCanvas: React.FC<ZebraCanvasProps> = ({
  templateUri,
  selectedColor = '#FF6B6B',
  selectedTool = 'bucket',
  brushWidth = 5,
  width = DEFAULT_CANVAS_SIZE,
  height = DEFAULT_CANVAS_SIZE,
  onColoringComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize canvas with template
  useEffect(() => {
    if (templateUri && canvasRef.current) {
      loadTemplate();
    }
  }, [templateUri]);

  const loadTemplate = useCallback(async () => {
    if (!canvasRef.current || !templateUri) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Clear canvas with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw template image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        setIsInitialized(true);
        console.log('✅ Template loaded successfully');
      };

      img.onerror = (error) => {
        console.error('❌ Failed to load template:', error);

        // Create a fallback template with simple shapes
        createFallbackTemplate(ctx, canvas.width, canvas.height);
        setIsInitialized(true);
      };

      img.src = templateUri;
    } catch (error) {
      console.error('❌ Error loading template:', error);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        createFallbackTemplate(ctx, canvas.width, canvas.height);
        setIsInitialized(true);
      }
    }
  }, [templateUri]);

  const createFallbackTemplate = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // Draw black borders for coloring regions
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;

    // Draw a simple hot air balloon template
    const centerX = w / 2;
    const centerY = h / 2;

    // Balloon body (large circle)
    ctx.beginPath();
    ctx.arc(centerX, centerY - 40, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Balloon stripes
    for (let i = -50; i <= 30; i += 20) {
      ctx.beginPath();
      ctx.moveTo(centerX - 50, centerY - 40 + i);
      ctx.lineTo(centerX + 50, centerY - 40 + i);
      ctx.stroke();
    }

    // Basket
    ctx.beginPath();
    ctx.rect(centerX - 20, centerY + 40, 40, 30);
    ctx.stroke();

    // Ropes
    ctx.beginPath();
    ctx.moveTo(centerX - 40, centerY + 20);
    ctx.lineTo(centerX - 15, centerY + 40);
    ctx.moveTo(centerX + 40, centerY + 20);
    ctx.lineTo(centerX + 15, centerY + 40);
    ctx.stroke();

    console.log('✅ Created fallback template');
  };

  const performFloodFill = useCallback(
    (x: number, y: number) => {
      if (!canvasRef.current || !isInitialized) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        // Get current image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Perform flood fill
        const fillColor = ZebraFloodFill.hexToArgb(selectedColor);
        const success = ZebraFloodFill.floodFillRGBA(
          imageData.data,
          imageData.width,
          imageData.height,
          Math.floor(x),
          Math.floor(y),
          fillColor
        );

        if (success) {
          // Update canvas with filled data
          ctx.putImageData(imageData, 0, 0);

          // Trigger completion callback
          if (onColoringComplete) {
            const base64 = canvas.toDataURL('image/png');
            onColoringComplete(base64);
          }

          console.log(
            `✅ Flood fill completed at (${Math.floor(x)}, ${Math.floor(y)})`
          );
        } else {
          console.log(
            `⚠️ Flood fill failed at (${Math.floor(x)}, ${Math.floor(y)})`
          );
        }
      } catch (error) {
        console.error('❌ Error during flood fill:', error);
      }
    },
    [isInitialized, selectedColor, onColoringComplete]
  );

  const drawBrushStroke = useCallback(
    (points: Point[]) => {
      if (!canvasRef.current || points.length < 2) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.stroke();
    },
    [selectedColor, brushWidth]
  );

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isInitialized,
    onMoveShouldSetPanResponder: () => isInitialized && isDrawing,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;

      if (selectedTool === 'bucket') {
        performFloodFill(locationX, locationY);
      } else if (selectedTool === 'brush') {
        setIsDrawing(true);
        setCurrentPath([{ x: locationX, y: locationY }]);
      }
    },

    onPanResponderMove: (evt) => {
      if (!isDrawing || selectedTool !== 'brush') return;

      const { locationX, locationY } = evt.nativeEvent;
      const newPoint = { x: locationX, y: locationY };

      setCurrentPath((prev) => {
        const updated = [...prev, newPoint];

        // Draw in real-time during brush stroke
        if (updated.length >= 2) {
          const lastTwo = updated.slice(-2);
          drawBrushStroke(lastTwo);
        }

        return updated;
      });
    },

    onPanResponderRelease: () => {
      if (isDrawing && currentPath.length > 0) {
        drawBrushStroke(currentPath);

        if (onColoringComplete && canvasRef.current) {
          const base64 = canvasRef.current.toDataURL('image/png');
          onColoringComplete(base64);
        }
      }

      setIsDrawing(false);
      setCurrentPath([]);
    },
  });

  const clearCanvas = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        loadTemplate();
      }
    }
  }, [loadTemplate]);

  // Render HTML canvas for web, fallback for native
  const renderCanvas = () => {
    if (Platform.OS === 'web') {
      return (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            width,
            height,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
          }}
        />
      );
    } else {
      // For React Native, you would need to use a library like react-native-canvas
      return (
        <View style={[styles.canvasPlaceholder, { width, height }]}>
          <Text style={styles.placeholderText}>
            Canvas coloring is optimized for web. Use SVG-based coloring for
            mobile.
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[styles.canvasContainer, { width, height }]}
        {...panResponder.panHandlers}
      >
        {renderCanvas()}
      </View>

      <View style={styles.info}>
        <Text style={styles.infoText}>
          Tool: {selectedTool} | Color: {selectedColor}
          {!isInitialized && ' | Loading...'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  canvasPlaceholder: {
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  info: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
