import React, { useCallback, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Polygon, Rect } from 'react-native-svg';

interface CanvasColoringProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  type: 'brush' | 'fill';
  points: Point[];
  color: string;
  width: number;
  pathData: string;
}

export const CanvasColoring = React.forwardRef<any, CanvasColoringProps>(
  (
    {
      selectedColor = '#FF0000',
      selectedTool = 'brush',
      brushWidth = 5,
      canvasWidth = 300,
      canvasHeight = 220,
    },
    ref
  ) => {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [fillAreas, setFillAreas] = useState<{ [key: string]: string }>({});
    const strokeIdRef = useRef(0);

    // Triangle path coordinates
    const trianglePath = React.useMemo(
      () => [
        { x: canvasWidth / 2, y: 30 },
        { x: canvasWidth - 40, y: canvasHeight - 30 },
        { x: 40, y: canvasHeight - 30 },
      ],
      [canvasWidth, canvasHeight]
    );

    const trianglePoints = trianglePath.map((p) => `${p.x},${p.y}`).join(' ');

    const clearCanvas = useCallback(() => {
      setStrokes([]);
      setCurrentStroke([]);
      setFillAreas({});
    }, []);

    const undoStroke = useCallback(() => {
      setStrokes((prev) => prev.slice(0, -1));
    }, []);

    React.useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      undo: undoStroke,
      getStrokes: () => strokes,
    }));

    // Check if point is inside triangle using barycentric coordinates
    const isInsideTriangle = useCallback(
      (x: number, y: number): boolean => {
        const [p1, p2, p3] = trianglePath;

        const denominator =
          (p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y);
        const a =
          ((p2.y - p3.y) * (x - p3.x) + (p3.x - p2.x) * (y - p3.y)) /
          denominator;
        const b =
          ((p3.y - p1.y) * (x - p3.x) + (p1.x - p3.x) * (y - p3.y)) /
          denominator;
        const c = 1 - a - b;

        return a >= 0 && b >= 0 && c >= 0;
      },
      [trianglePath]
    );

    // Convert points to SVG path data
    const pointsToPath = useCallback((points: Point[]): string => {
      if (points.length === 0) return '';

      let path = `M${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L${points[i].x},${points[i].y}`;
      }
      return path;
    }, []);

    // Smooth path using quadratic curves
    const pointsToSmoothPath = useCallback((points: Point[]): string => {
      if (points.length === 0) return '';
      if (points.length === 1) return `M${points[0].x},${points[0].y}`;
      if (points.length === 2)
        return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

      let path = `M${points[0].x},${points[0].y}`;

      for (let i = 1; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        const controlX = (current.x + next.x) / 2;
        const controlY = (current.y + next.y) / 2;
        path += ` Q${current.x},${current.y} ${controlX},${controlY}`;
      }

      const lastPoint = points[points.length - 1];
      path += ` L${lastPoint.x},${lastPoint.y}`;

      return path;
    }, []);

    const handleTouchStart = useCallback(
      (x: number, y: number) => {
        if (selectedTool === 'bucket') {
          // Bucket fill - fill the triangle if clicked inside
          if (isInsideTriangle(x, y)) {
            setFillAreas((prev) => ({ ...prev, triangle: selectedColor }));
          }
          return;
        }

        if (selectedTool === 'brush') {
          setIsDrawing(true);
          setCurrentStroke([{ x, y }]);
        }
      },
      [selectedTool, selectedColor, isInsideTriangle]
    );

    const handleTouchMove = useCallback(
      (x: number, y: number) => {
        if (!isDrawing || selectedTool !== 'brush') return;

        // Always add the point to the current stroke, regardless of boundary
        setCurrentStroke((prev) => [...prev, { x, y }]);
      },
      [isDrawing, selectedTool]
    );

    const handleTouchEnd = useCallback(() => {
      if (isDrawing && currentStroke.length > 0) {
        const pathData = pointsToSmoothPath(currentStroke);
        const newStroke: Stroke = {
          id: `stroke_${strokeIdRef.current++}`,
          type: 'brush',
          points: currentStroke,
          color: selectedColor,
          width: brushWidth,
          pathData,
        };
        setStrokes((prev) => [...prev, newStroke]);
      }
      setIsDrawing(false);
      setCurrentStroke([]);
    }, [
      isDrawing,
      currentStroke,
      selectedColor,
      brushWidth,
      pointsToSmoothPath,
    ]);

    // Pan responder for touch handling
    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        handleTouchStart(locationX, locationY);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        handleTouchMove(locationX, locationY);
      },
      onPanResponderRelease: () => {
        handleTouchEnd();
      },
      onPanResponderTerminate: () => {
        handleTouchEnd();
      },
    });

    // Current stroke path data for real-time preview
    const currentPathData =
      currentStroke.length > 0 ? pointsToSmoothPath(currentStroke) : '';

    return (
      <View style={styles.container}>
        <Text style={styles.debug}>
          Strokes: {strokes.length} | Tool: {selectedTool} | Color:{' '}
          {selectedColor}
        </Text>
        <View
          style={[
            styles.canvasContainer,
            { width: canvasWidth, height: canvasHeight },
          ]}
          {...panResponder.panHandlers}
        >
          <Svg width={canvasWidth} height={canvasHeight} style={styles.svg}>
            <Defs>
              <ClipPath id="triangleClip">
                <Polygon points={trianglePoints} />
              </ClipPath>
            </Defs>

            {/* Background */}
            <Rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill="#FFFFFF"
            />

            {/* Triangle fill area */}
            {fillAreas.triangle && (
              <Polygon
                points={trianglePoints}
                fill={fillAreas.triangle}
                fillOpacity={0.7}
              />
            )}

            {/* Completed strokes with clipping */}
            <G clipPath="url(#triangleClip)">
              {strokes.map((stroke) => (
                <Path
                  key={stroke.id}
                  d={stroke.pathData}
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}

              {/* Current drawing stroke (real-time preview) with clipping */}
              {isDrawing && currentPathData && (
                <Path
                  d={currentPathData}
                  stroke={selectedColor}
                  strokeWidth={brushWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={0.7}
                  fill="none"
                />
              )}
            </G>

            {/* Triangle outline - always on top */}
            <Polygon
              points={trianglePoints}
              fill="none"
              stroke="#333333"
              strokeWidth={4}
            />
          </Svg>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  debug: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  canvasContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  svg: {
    backgroundColor: 'transparent',
  },
});

CanvasColoring.displayName = 'CanvasColoring';
