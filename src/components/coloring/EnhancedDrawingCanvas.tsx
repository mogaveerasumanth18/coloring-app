import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import {
  Canvas,
  type CanvasRenderingContext2D,
  useCanvasRef,
} from 'react-native-canvas';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';

import { boundedFloodFill } from './utils/FloodFill';

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface Stroke {
  path: string;
  color: string;
  width: number;
  opacity: number;
}

export type DrawingMode = 'brush' | 'bucket';

interface EnhancedDrawingCanvasProps {
  selectedColor?: string;
  brushSize?: number;
  drawingMode?: DrawingMode;
  onStrokeComplete?: (stroke: Stroke) => void;
  backgroundTemplate?: string; // SVG template data
  strokes?: Stroke[];
  enablePressure?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const EnhancedDrawingCanvas: React.FC<EnhancedDrawingCanvasProps> = ({
  selectedColor = '#000000',
  brushSize = 5,
  drawingMode = 'brush',
  onStrokeComplete,
  backgroundTemplate,
  strokes = [],
  enablePressure = true,
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [canvasImageData, setCanvasImageData] = useState<ImageData | null>(
    null
  );

  const pathRef = useRef<string>('');
  const isDrawingRef = useRef<boolean>(false);
  const canvasRef = useCanvasRef();
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Initialize canvas context
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        contextRef.current = ctx;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Set canvas size
        canvasRef.current.width = screenWidth;
        canvasRef.current.height = screenHeight * 0.8;

        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, screenWidth, screenHeight * 0.8);

        // Draw template if provided
        if (backgroundTemplate) {
          drawTemplate(ctx);
        }
      }
    }
  }, [canvasRef, backgroundTemplate]);

  const drawTemplate = useCallback(async (ctx: CanvasRenderingContext2D) => {
    // This would convert SVG template to canvas drawing
    // For now, we'll draw a simple placeholder
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;

    // Draw template outline (placeholder implementation)
    // In a real app, you'd convert SVG to canvas commands

    ctx.globalAlpha = 1;
  }, []);

  const createPath = useCallback((points: Point[]): string => {
    if (points.length < 2) return '';

    let path = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const previousPoint = points[i - 1];
      const cpx = (previousPoint.x + point.x) / 2;
      const cpy = (previousPoint.y + point.y) / 2;
      path += ` Q${previousPoint.x},${previousPoint.y} ${cpx},${cpy}`;
    }
    return path;
  }, []);

  const handleBucketFill = useCallback(
    async (x: number, y: number) => {
      if (!contextRef.current || !canvasRef.current) return;

      try {
        const ctx = contextRef.current;
        const canvas = canvasRef.current;

        // Get current image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Perform flood fill
        const filledImageData = boundedFloodFill(
          imageData,
          { x: Math.floor(x), y: Math.floor(y) },
          {
            tolerance: 10,
            fillColor: selectedColor,
          },
          ['#000000'] // Black lines as boundaries
        );

        // Put the filled image data back to canvas
        ctx.putImageData(filledImageData, 0, 0);

        // Update stored image data
        setCanvasImageData(filledImageData);
      } catch (error) {
        console.error('Bucket fill error:', error);
        Alert.alert('Error', 'Failed to fill area. Please try again.');
      }
    },
    [selectedColor]
  );

  const drawOnCanvas = useCallback(
    (x: number, y: number, isStart: boolean = false) => {
      if (!contextRef.current) return;

      const ctx = contextRef.current;

      if (isStart) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
      ctx.stroke();
    },
    [selectedColor, brushSize]
  );

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;

      if (drawingMode === 'bucket') {
        handleBucketFill(locationX, locationY);
        return;
      }

      // Brush mode
      isDrawingRef.current = true;
      pathRef.current = `M${locationX},${locationY}`;
      setCurrentPath(pathRef.current);
      setCurrentStroke({
        path: pathRef.current,
        color: selectedColor,
        width: brushSize,
        opacity: 1,
      });

      // Draw on canvas
      drawOnCanvas(locationX, locationY, true);
    },

    onPanResponderMove: (evt) => {
      if (!isDrawingRef.current || drawingMode === 'bucket') return;

      const { locationX, locationY } = evt.nativeEvent;

      // Calculate pressure if supported
      let pressure = 1;
      if (enablePressure && evt.nativeEvent.force !== undefined) {
        pressure = Math.max(0.1, Math.min(1, evt.nativeEvent.force));
      }

      const adjustedWidth = brushSize * pressure;

      pathRef.current += ` L${locationX},${locationY}`;
      setCurrentPath(pathRef.current);
      setCurrentStroke((prev) =>
        prev
          ? {
              ...prev,
              path: pathRef.current,
              width: adjustedWidth,
            }
          : null
      );

      // Draw on canvas
      drawOnCanvas(locationX, locationY);
    },

    onPanResponderRelease: () => {
      if (isDrawingRef.current && currentStroke && drawingMode === 'brush') {
        isDrawingRef.current = false;
        onStrokeComplete?.(currentStroke);
        setCurrentPath('');
        setCurrentStroke(null);
        pathRef.current = '';
      }
    },
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.canvas} {...panResponder.panHandlers}>
        {/* Background Canvas for bucket fill */}
        <Canvas ref={canvasRef} style={styles.canvasElement} />

        {/* SVG overlay for brush strokes */}
        <Svg
          width={screenWidth}
          height={screenHeight * 0.8}
          style={styles.svgOverlay}
          pointerEvents="none"
        >
          <Defs>
            {backgroundTemplate && (
              <Pattern
                id="backgroundTemplate"
                patternUnits="userSpaceOnUse"
                width={screenWidth}
                height={screenHeight * 0.8}
              >
                {/* Background template would be rendered here */}
              </Pattern>
            )}
          </Defs>

          <G>
            {/* Background template */}
            {backgroundTemplate && (
              <Rect
                width={screenWidth}
                height={screenHeight * 0.8}
                fill="url(#backgroundTemplate)"
                opacity={0.3}
              />
            )}

            {/* Render completed strokes */}
            {strokes.map((stroke, index) => (
              <Path
                key={index}
                d={stroke.path}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={stroke.opacity}
              />
            ))}

            {/* Render current stroke being drawn */}
            {currentPath && drawingMode === 'brush' && (
              <Path
                d={currentPath}
                fill="none"
                stroke={selectedColor}
                strokeWidth={brushSize}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={1}
              />
            )}
          </G>
        </Svg>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  canvasElement: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'transparent',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'transparent',
  },
});
