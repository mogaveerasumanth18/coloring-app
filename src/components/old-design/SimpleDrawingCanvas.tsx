import React, { useCallback, useState } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

interface Stroke {
  path: string;
  color: string;
  width: number;
}

interface SimpleDrawingCanvasProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  onStrokeComplete?: (stroke: Stroke) => void;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
}

export const SimpleDrawingCanvas = React.forwardRef<
  { clear: () => void; undo: () => void; getStrokes: () => Stroke[] },
  SimpleDrawingCanvasProps
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

    const clearCanvas = useCallback(() => {
      setStrokes([]);
      setCurrentPath('');
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

    // Web mouse event handlers
    const handleMouseDown = useCallback((event: any) => {
      if (Platform.OS !== 'web') return;

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setIsDrawing(true);
      setCurrentPath(`M${x.toFixed(2)},${y.toFixed(2)}`);
    }, []);

    const handleMouseMove = useCallback(
      (event: any) => {
        if (Platform.OS !== 'web' || !isDrawing) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        setCurrentPath((prev) => `${prev} L${x.toFixed(2)},${y.toFixed(2)}`);
      },
      [isDrawing]
    );

    const handleMouseUp = useCallback(() => {
      if (Platform.OS !== 'web' || !isDrawing) return;

      if (currentPath) {
        const newStroke: Stroke = {
          path: currentPath,
          color: selectedTool === 'eraser' ? backgroundColor : selectedColor,
          width: selectedTool === 'eraser' ? brushWidth * 2 : brushWidth,
        };

        setStrokes((prev) => [...prev, newStroke]);
        onStrokeComplete?.(newStroke);
      }

      setIsDrawing(false);
      setCurrentPath('');
    }, [
      isDrawing,
      currentPath,
      selectedColor,
      selectedTool,
      brushWidth,
      backgroundColor,
      onStrokeComplete,
    ]);

    // Touch event handlers for mobile
    const handleTouchStart = useCallback((event: any) => {
      if (Platform.OS === 'web') return;

      const touch = event.nativeEvent.touches[0];
      const { locationX, locationY } = touch;

      setIsDrawing(true);
      setCurrentPath(`M${locationX.toFixed(2)},${locationY.toFixed(2)}`);
    }, []);

    const handleTouchMove = useCallback(
      (event: any) => {
        if (Platform.OS === 'web' || !isDrawing) return;

        const touch = event.nativeEvent.touches[0];
        const { locationX, locationY } = touch;

        setCurrentPath(
          (prev) => `${prev} L${locationX.toFixed(2)},${locationY.toFixed(2)}`
        );
      },
      [isDrawing]
    );

    const handleTouchEnd = useCallback(() => {
      if (Platform.OS === 'web' || !isDrawing) return;

      if (currentPath) {
        const newStroke: Stroke = {
          path: currentPath,
          color: selectedTool === 'eraser' ? backgroundColor : selectedColor,
          width: selectedTool === 'eraser' ? brushWidth * 2 : brushWidth,
        };

        setStrokes((prev) => [...prev, newStroke]);
        onStrokeComplete?.(newStroke);
      }

      setIsDrawing(false);
      setCurrentPath('');
    }, [
      isDrawing,
      currentPath,
      selectedColor,
      selectedTool,
      brushWidth,
      backgroundColor,
      onStrokeComplete,
    ]);

    return (
      <View
        style={[styles.container, { width: canvasWidth, height: canvasHeight }]}
      >
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
          {...(Platform.OS !== 'web' && {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
          })}
        >
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
            />
          ))}

          {/* Current stroke being drawn */}
          {currentPath && (
            <Path
              d={currentPath}
              stroke={
                selectedTool === 'eraser' ? backgroundColor : selectedColor
              }
              strokeWidth={
                selectedTool === 'eraser' ? brushWidth * 2 : brushWidth
              }
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </Svg>
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
  svg: {
    backgroundColor: 'transparent',
  },
});
