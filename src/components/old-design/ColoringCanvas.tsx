import React, { useCallback, useState } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

interface Stroke {
  path: string;
  color: string;
  width: number;
}

interface ColoringCanvasProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  onStrokeComplete?: (stroke: Stroke) => void;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  template?: string;
}

export const ColoringCanvas = React.forwardRef<
  { clear: () => void; undo: () => void; getStrokes: () => Stroke[] },
  ColoringCanvasProps
>(
  (
    {
      selectedColor = '#FF0000',
      selectedTool = 'brush',
      brushWidth = 5,
      onStrokeComplete,
      canvasWidth = 300,
      canvasHeight = 220,
      backgroundColor = '#FFFFFF',
      template = 'butterfly',
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

    React.useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      undo: undoStroke,
      getStrokes: () => strokes,
    }));

    const createPath = (x: number, y: number, isStart: boolean = false) => {
      if (isStart) {
        return `M${x.toFixed(2)},${y.toFixed(2)}`;
      }
      return ` L${x.toFixed(2)},${y.toFixed(2)}`;
    };

    // Web drawing handlers
    const handleMouseDown = useCallback((event: any) => {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      console.log('Mouse down at:', x, y);
      setIsDrawing(true);
      const newPath = createPath(x, y, true);
      setCurrentPath(newPath);
    }, []);

    const handleMouseMove = useCallback(
      (event: any) => {
        if (!isDrawing) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        setCurrentPath((prev) => prev + createPath(x, y));
      },
      [isDrawing]
    );

    const handleMouseUp = useCallback(() => {
      if (!isDrawing) return;

      console.log('Mouse up, path:', currentPath);
      if (currentPath) {
        const newStroke: Stroke = {
          path: currentPath,
          color: selectedTool === 'eraser' ? backgroundColor : selectedColor,
          width: selectedTool === 'eraser' ? brushWidth * 2 : brushWidth,
        };

        setStrokes((prev) => [...prev, newStroke]);
        onStrokeComplete?.(newStroke);
        console.log('Added stroke:', newStroke);
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

    // Touch handlers for mobile
    const handleTouchStart = useCallback((event: any) => {
      const touch = event.nativeEvent.touches[0];
      const { locationX, locationY } = touch;

      console.log('Touch start at:', locationX, locationY);
      setIsDrawing(true);
      const newPath = createPath(locationX, locationY, true);
      setCurrentPath(newPath);
    }, []);

    const handleTouchMove = useCallback(
      (event: any) => {
        if (!isDrawing) return;

        const touch = event.nativeEvent.touches[0];
        const { locationX, locationY } = touch;

        setCurrentPath((prev) => prev + createPath(locationX, locationY));
      },
      [isDrawing]
    );

    const handleTouchEnd = useCallback(() => {
      if (!isDrawing) return;

      console.log('Touch end, path:', currentPath);
      if (currentPath) {
        const newStroke: Stroke = {
          path: currentPath,
          color: selectedTool === 'eraser' ? backgroundColor : selectedColor,
          width: selectedTool === 'eraser' ? brushWidth * 2 : brushWidth,
        };

        setStrokes((prev) => [...prev, newStroke]);
        onStrokeComplete?.(newStroke);
        console.log('Added stroke:', newStroke);
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

    // Template shapes
    const renderTemplate = () => {
      if (template === 'butterfly') {
        return (
          <>
            {/* Butterfly body */}
            <Line
              x1={canvasWidth / 2}
              y1={canvasHeight * 0.2}
              x2={canvasWidth / 2}
              y2={canvasHeight * 0.8}
              stroke="#333"
              strokeWidth="3"
              fill="none"
            />

            {/* Left wing upper */}
            <Path
              d={`M${canvasWidth / 2} ${canvasHeight * 0.3} 
                  C${canvasWidth * 0.3} ${canvasHeight * 0.2}, 
                   ${canvasWidth * 0.2} ${canvasHeight * 0.4}, 
                   ${canvasWidth * 0.35} ${canvasHeight * 0.5} 
                  C${canvasWidth * 0.4} ${canvasHeight * 0.45}, 
                   ${canvasWidth * 0.45} ${canvasHeight * 0.35}, 
                   ${canvasWidth / 2} ${canvasHeight * 0.3} Z`}
              stroke="#333"
              strokeWidth="2"
              fill="none"
            />

            {/* Right wing upper */}
            <Path
              d={`M${canvasWidth / 2} ${canvasHeight * 0.3} 
                  C${canvasWidth * 0.7} ${canvasHeight * 0.2}, 
                   ${canvasWidth * 0.8} ${canvasHeight * 0.4}, 
                   ${canvasWidth * 0.65} ${canvasHeight * 0.5} 
                  C${canvasWidth * 0.6} ${canvasHeight * 0.45}, 
                   ${canvasWidth * 0.55} ${canvasHeight * 0.35}, 
                   ${canvasWidth / 2} ${canvasHeight * 0.3} Z`}
              stroke="#333"
              strokeWidth="2"
              fill="none"
            />

            {/* Left wing lower */}
            <Path
              d={`M${canvasWidth / 2} ${canvasHeight * 0.5} 
                  C${canvasWidth * 0.35} ${canvasHeight * 0.55}, 
                   ${canvasWidth * 0.25} ${canvasHeight * 0.7}, 
                   ${canvasWidth * 0.4} ${canvasHeight * 0.75} 
                  C${canvasWidth * 0.45} ${canvasHeight * 0.65}, 
                   ${canvasWidth * 0.48} ${canvasHeight * 0.55}, 
                   ${canvasWidth / 2} ${canvasHeight * 0.5} Z`}
              stroke="#333"
              strokeWidth="2"
              fill="none"
            />

            {/* Right wing lower */}
            <Path
              d={`M${canvasWidth / 2} ${canvasHeight * 0.5} 
                  C${canvasWidth * 0.65} ${canvasHeight * 0.55}, 
                   ${canvasWidth * 0.75} ${canvasHeight * 0.7}, 
                   ${canvasWidth * 0.6} ${canvasHeight * 0.75} 
                  C${canvasWidth * 0.55} ${canvasHeight * 0.65}, 
                   ${canvasWidth * 0.52} ${canvasHeight * 0.55}, 
                   ${canvasWidth / 2} ${canvasHeight * 0.5} Z`}
              stroke="#333"
              strokeWidth="2"
              fill="none"
            />

            {/* Antennae */}
            <Path
              d={`M${canvasWidth * 0.47} ${canvasHeight * 0.15} 
                  L${canvasWidth * 0.4} ${canvasHeight * 0.1}`}
              stroke="#333"
              strokeWidth="2"
            />
            <Path
              d={`M${canvasWidth * 0.53} ${canvasHeight * 0.15} 
                  L${canvasWidth * 0.6} ${canvasHeight * 0.1}`}
              stroke="#333"
              strokeWidth="2"
            />
            <Circle
              cx={canvasWidth * 0.4}
              cy={canvasHeight * 0.1}
              r="3"
              fill="#333"
            />
            <Circle
              cx={canvasWidth * 0.6}
              cy={canvasHeight * 0.1}
              r="3"
              fill="#333"
            />
          </>
        );
      }
      return null;
    };

    return (
      <View
        style={[styles.container, { width: canvasWidth, height: canvasHeight }]}
      >
        <Svg
          width={canvasWidth}
          height={canvasHeight}
          style={styles.svg}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          {...(Platform.OS === 'web'
            ? {
                onMouseDown: handleMouseDown,
                onMouseMove: handleMouseMove,
                onMouseUp: handleMouseUp,
                onMouseLeave: handleMouseUp,
              }
            : {
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

          {/* Template outline */}
          {renderTemplate()}

          {/* User strokes */}
          {strokes.map((stroke, index) => (
            <Path
              key={`stroke-${index}`}
              d={stroke.path}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={0.8}
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
              opacity={0.8}
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
