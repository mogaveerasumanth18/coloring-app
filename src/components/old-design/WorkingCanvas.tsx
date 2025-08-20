import React, { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

interface Stroke {
  path: string;
  color: string;
  width: number;
  type?: 'stroke' | 'fill';
}

interface WorkingCanvasProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

// Helper functions for boundary detection
const isInTriangleArea = (
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  // Triangle vertices (centered in canvas)
  const topX = canvasWidth / 2;
  const topY = 30;
  const leftX = 40;
  const leftY = canvasHeight - 30;
  const rightX = canvasWidth - 40;
  const rightY = canvasHeight - 30;

  // Simple point-in-triangle test using cross products
  const sign = (
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number,
    p3x: number,
    p3y: number
  ): number => {
    return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
  };

  const d1 = sign(x, y, topX, topY, leftX, leftY);
  const d2 = sign(x, y, leftX, leftY, rightX, rightY);
  const d3 = sign(x, y, rightX, rightY, topX, topY);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  // Point is inside triangle if all signs are the same
  const isInsideTriangle = !(hasNeg && hasPos);

  return isInsideTriangle;
};

// Check if point is near line art boundary (within stroke width)
const isNearBoundary = (
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  threshold: number = 6
): boolean => {
  // Triangle vertices
  const topX = canvasWidth / 2;
  const topY = 30;
  const leftX = 40;
  const leftY = canvasHeight - 30;
  const rightX = canvasWidth - 40;
  const rightY = canvasHeight - 30;

  // Distance to each edge of the triangle
  const distanceToLine = (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const dist1 = distanceToLine(x, y, topX, topY, leftX, leftY);
  const dist2 = distanceToLine(x, y, leftX, leftY, rightX, rightY);
  const dist3 = distanceToLine(x, y, rightX, rightY, topX, topY);

  return Math.min(dist1, dist2, dist3) < threshold;
};

// Enhanced boundary-aware coloring function
const canColorAtPoint = (
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): boolean => {
  // Must be inside the triangle
  if (!isInTriangleArea(x, y, canvasWidth, canvasHeight)) {
    return false;
  }

  // Must not be too close to the boundary lines
  if (isNearBoundary(x, y, canvasWidth, canvasHeight, 3)) {
    return false;
  }

  return true;
};

export const WorkingCanvas = React.forwardRef<any, WorkingCanvasProps>(
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
    const [currentPath, setCurrentPath] = useState('');
    const [isDrawing, setIsDrawing] = useState(false);
    const [fillAreas, setFillAreas] = useState<{ [key: string]: string }>({});
    const svgRef = useRef<any>(null);

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

    const handlePointerDown = (event: any) => {
      console.log('Pointer down detected');

      // Prevent default to stop scrolling
      if (Platform.OS === 'web' && event.preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }

      let x, y;

      if (Platform.OS === 'web') {
        const rect = event.currentTarget.getBoundingClientRect();
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
      } else {
        const touch = event.nativeEvent.touches[0];
        x = touch.locationX;
        y = touch.locationY;
      }

      // Handle fill tool
      if (selectedTool === 'bucket') {
        // Check if clicked inside the triangle area
        if (isInTriangleArea(x, y, canvasWidth, canvasHeight)) {
          setFillAreas((prev) => ({ ...prev, triangle: selectedColor }));
        }
        return;
      }

      // Handle brush tool
      if (selectedTool === 'brush') {
        // Only start drawing if within bounds
        if (isPointInBounds(x, y)) {
          setIsDrawing(true);
          const newPath = `M${x.toFixed(1)},${y.toFixed(1)}`;
          setCurrentPath(newPath);
          console.log('Started path:', newPath);
        }
      }
    };

    const isPointInBounds = (x: number, y: number): boolean => {
      return isInTriangleArea(x, y, canvasWidth, canvasHeight);
    };

    const handlePointerMove = (event: any) => {
      if (!isDrawing || selectedTool !== 'brush') return;

      // Prevent default to stop scrolling
      if (Platform.OS === 'web' && event.preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }

      let x, y;

      if (Platform.OS === 'web') {
        const rect = event.currentTarget.getBoundingClientRect();
        x = event.clientX - rect.left;
        y = event.clientY - rect.top;
      } else {
        const touch = event.nativeEvent.touches[0];
        x = touch.locationX;
        y = touch.locationY;
      }

      // Only add to path if the point is within bounds
      if (isPointInBounds(x, y)) {
        setCurrentPath((prev) => `${prev} L${x.toFixed(1)},${y.toFixed(1)}`);
      } else {
        // If we go out of bounds, end the current stroke and start a new one when back in bounds
        if (currentPath) {
          const newStroke: Stroke = {
            path: currentPath,
            color: selectedColor,
            width: brushWidth,
          };
          setStrokes((prev) => [...prev, newStroke]);
          setCurrentPath('');
        }
      }
    };

    const handlePointerUp = () => {
      if (!isDrawing || !currentPath || selectedTool !== 'brush') return;

      console.log('Ending path:', currentPath);
      const newStroke: Stroke = {
        path: currentPath,
        color: selectedColor,
        width: brushWidth,
      };

      setStrokes((prev) => [...prev, newStroke]);
      setIsDrawing(false);
      setCurrentPath('');
      console.log('Added stroke, total strokes:', strokes.length + 1);
    };

    return (
      <View style={styles.container}>
        <Text style={styles.debug}>
          Strokes: {strokes.length} | Drawing: {isDrawing ? 'Yes' : 'No'} |
          Tool: {selectedTool}
        </Text>
        <View
          style={[
            styles.canvasContainer,
            { width: canvasWidth, height: canvasHeight },
          ]}
        >
          <Svg
            ref={svgRef}
            width={canvasWidth}
            height={canvasHeight}
            style={styles.svg}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handlePointerDown}
            onResponderMove={handlePointerMove}
            onResponderRelease={handlePointerUp}
            onResponderTerminate={handlePointerUp}
            {...(Platform.OS === 'web' && {
              onMouseDown: handlePointerDown,
              onMouseMove: handlePointerMove,
              onMouseUp: handlePointerUp,
              onMouseLeave: handlePointerUp,
              onTouchStart: handlePointerDown,
              onTouchMove: handlePointerMove,
              onTouchEnd: handlePointerUp,
              style: {
                ...styles.svg,
                touchAction: 'none', // Prevent scrolling on touch
                userSelect: 'none', // Prevent text selection
              },
            })}
          >
            {/* Background */}
            <Rect width={canvasWidth} height={canvasHeight} fill="#FFFFFF" />

            {/* Fill area for triangle */}
            {fillAreas.triangle && (
              <Path
                d={`M${canvasWidth / 2} 30 L${canvasWidth - 40} ${canvasHeight - 30} L40 ${canvasHeight - 30} Z`}
                fill={fillAreas.triangle}
                opacity={0.7}
              />
            )}

            {/* Simple triangle line art */}
            <Path
              d={`M${canvasWidth / 2} 30 L${canvasWidth - 40} ${canvasHeight - 30} L40 ${canvasHeight - 30} Z`}
              stroke="#333"
              strokeWidth="4"
              fill="none"
            />

            {/* User strokes */}
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

            {/* Current drawing */}
            {currentPath && (
              <Path
                d={currentPath}
                stroke={selectedColor}
                strokeWidth={brushWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.7}
              />
            )}
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
    ...(Platform.OS === 'web' && {
      touchAction: 'none',
      userSelect: 'none',
    }),
  },
  svg: {
    backgroundColor: 'white',
  },
});
