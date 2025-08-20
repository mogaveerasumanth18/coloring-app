import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import {
  PanGestureHandler,
  type PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

interface Stroke {
  path: string;
  color: string;
  width: number;
  tool: 'brush' | 'eraser';
}

interface Point {
  x: number;
  y: number;
}

interface DrawingCanvasProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  onStrokeComplete?: (stroke: Stroke) => void;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
}

export const DrawingCanvas = React.forwardRef<
  { clear: () => void; undo: () => void; getStrokes: () => Stroke[] },
  DrawingCanvasProps
>(
  (
    {
      selectedColor = '#FF0000',
      selectedTool = 'brush',
      brushWidth = 5,
      onStrokeComplete,
      canvasWidth = Math.min(screenWidth - 40, 350),
      canvasHeight = 300,
      backgroundColor = '#FFFFFF',
    },
    ref
  ) => {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [isDrawing, setIsDrawing] = useState(false);
    const pathRef = useRef('');

    const createPath = useCallback(
      (x: number, y: number, isStart: boolean = false): string => {
        if (isStart) {
          return `M${x.toFixed(2)},${y.toFixed(2)}`;
        }
        return ` L${x.toFixed(2)},${y.toFixed(2)}`;
      },
      []
    );

    const handleGestureEvent = useCallback(
      (event: PanGestureHandlerGestureEvent) => {
        const { translationX, translationY, absoluteX, absoluteY, state } =
          event.nativeEvent;

        // Calculate relative coordinates within the SVG canvas
        const x = Math.max(
          0,
          Math.min(canvasWidth, translationX + canvasWidth / 2)
        );
        const y = Math.max(
          0,
          Math.min(canvasHeight, translationY + canvasHeight / 2)
        );

        if (state === State.BEGAN) {
          setIsDrawing(true);
          pathRef.current = createPath(x, y, true);
          setCurrentPath(pathRef.current);
        } else if (state === State.ACTIVE && isDrawing) {
          pathRef.current += createPath(x, y);
          setCurrentPath(pathRef.current);
        } else if (state === State.END || state === State.CANCELLED) {
          if (isDrawing && pathRef.current) {
            const newStroke: Stroke = {
              path: pathRef.current,
              color:
                selectedTool === 'eraser' ? backgroundColor : selectedColor,
              width: selectedTool === 'eraser' ? brushWidth * 2 : brushWidth,
              tool: selectedTool as 'brush' | 'eraser',
            };

            setStrokes((prev) => [...prev, newStroke]);
            onStrokeComplete?.(newStroke);
          }

          setIsDrawing(false);
          setCurrentPath('');
          pathRef.current = '';
        }
      },
      [
        selectedColor,
        selectedTool,
        brushWidth,
        isDrawing,
        canvasWidth,
        canvasHeight,
        backgroundColor,
        onStrokeComplete,
        createPath,
      ]
    );

    // Web-specific mouse handlers
    const handleMouseDown = useCallback(
      (event: any) => {
        if (Platform.OS !== 'web') return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        setIsDrawing(true);
        pathRef.current = createPath(x, y, true);
        setCurrentPath(pathRef.current);
      },
      [createPath]
    );

    const handleMouseMove = useCallback(
      (event: any) => {
        if (Platform.OS !== 'web' || !isDrawing) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        pathRef.current += createPath(x, y);
        setCurrentPath(pathRef.current);
      },
      [isDrawing, createPath]
    );

    const handleMouseUp = useCallback(() => {
      if (Platform.OS !== 'web' || !isDrawing) return;

      if (pathRef.current) {
        const newStroke: Stroke = {
          path: pathRef.current,
          color: selectedTool === 'eraser' ? backgroundColor : selectedColor,
          width: selectedTool === 'eraser' ? brushWidth * 2 : brushWidth,
          tool: selectedTool as 'brush' | 'eraser',
        };

        setStrokes((prev) => [...prev, newStroke]);
        onStrokeComplete?.(newStroke);
      }

      setIsDrawing(false);
      setCurrentPath('');
      pathRef.current = '';
    }, [
      isDrawing,
      selectedColor,
      selectedTool,
      brushWidth,
      backgroundColor,
      onStrokeComplete,
    ]);

    const clearCanvas = useCallback(() => {
      setStrokes([]);
      setCurrentPath('');
      pathRef.current = '';
    }, []);

    const undoStroke = useCallback(() => {
      setStrokes((prev) => prev.slice(0, -1));
    }, []);

    // Expose methods to parent component
    React.useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      undo: undoStroke,
      getStrokes: () => strokes,
    }));

    const svgContent = (
      <Svg
        width={canvasWidth}
        height={canvasHeight}
        style={styles.svg}
        {...(Platform.OS === 'web' && {
          onMouseDown: handleMouseDown,
          onMouseMove: handleMouseMove,
          onMouseUp: handleMouseUp,
          onMouseLeave: handleMouseUp,
        })}
      >
        <Defs>
          <Pattern
            id="eraser-pattern"
            patternUnits="userSpaceOnUse"
            width="10"
            height="10"
          >
            <Rect width="10" height="10" fill={backgroundColor} />
          </Pattern>
        </Defs>

        {/* Background */}
        <Rect
          width={canvasWidth}
          height={canvasHeight}
          fill={backgroundColor}
        />

        {/* Completed strokes */}
        {strokes.map((stroke, index) => (
          <Path
            key={index}
            d={stroke.path}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeOpacity={stroke.tool === 'eraser' ? 1 : 0.9}
          />
        ))}

        {/* Current stroke being drawn */}
        {currentPath && (
          <Path
            d={currentPath}
            stroke={selectedTool === 'eraser' ? backgroundColor : selectedColor}
            strokeWidth={
              selectedTool === 'eraser' ? brushWidth * 2 : brushWidth
            }
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeOpacity={0.9}
          />
        )}
      </Svg>
    );

    if (Platform.OS === 'web') {
      return (
        <View
          style={[
            styles.container,
            { width: canvasWidth, height: canvasHeight },
          ]}
        >
          {svgContent}
        </View>
      );
    }

    return (
      <View
        style={[styles.container, { width: canvasWidth, height: canvasHeight }]}
      >
        <PanGestureHandler onGestureEvent={handleGestureEvent}>
          <View style={styles.gestureContainer}>{svgContent}</View>
        </PanGestureHandler>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gestureContainer: {
    flex: 1,
  },
  svg: {
    backgroundColor: 'transparent',
  },
});

export default DrawingCanvas;
