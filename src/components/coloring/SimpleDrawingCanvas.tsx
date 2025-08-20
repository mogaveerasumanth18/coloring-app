import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { G, Path } from 'react-native-svg';

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

interface SimpleDrawingCanvasProps {
  selectedColor?: string;
  brushSize?: number;
  onStrokeComplete?: (stroke: Stroke) => void;
  strokes?: Stroke[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const SimpleDrawingCanvas: React.FC<SimpleDrawingCanvasProps> = ({
  selectedColor = '#000000',
  brushSize = 5,
  onStrokeComplete,
  strokes = [],
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const pathRef = useRef<string>('');
  const isDrawingRef = useRef<boolean>(false);

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

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      isDrawingRef.current = true;
      pathRef.current = `M${locationX},${locationY}`;
      setCurrentPath(pathRef.current);
      setCurrentStroke({
        path: pathRef.current,
        color: selectedColor,
        width: brushSize,
        opacity: 1,
      });
    },

    onPanResponderMove: (evt) => {
      if (!isDrawingRef.current) return;

      const { locationX, locationY } = evt.nativeEvent;
      pathRef.current += ` L${locationX},${locationY}`;
      setCurrentPath(pathRef.current);
      setCurrentStroke((prev) =>
        prev
          ? {
              ...prev,
              path: pathRef.current,
            }
          : null
      );
    },

    onPanResponderRelease: () => {
      if (isDrawingRef.current && currentStroke) {
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
        <Svg width={screenWidth} height={screenHeight * 0.8} style={styles.svg}>
          <G>
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
            {currentPath && (
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
  svg: {
    backgroundColor: 'transparent',
  },
});
