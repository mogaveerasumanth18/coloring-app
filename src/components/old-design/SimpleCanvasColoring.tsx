import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { SVGTemplateRenderer } from './SVGTemplateRenderer';

interface CanvasColoringProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  templateSvg?: string; // SVG template data
  onSave?: (drawingData: any) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  type: 'brush' | 'eraser';
  points: Point[];
  color: string;
  width: number;
  pathData: string;
}

interface SavedDrawing {
  id: string;
  name: string;
  strokes: Stroke[];
  templateSvg?: string;
  createdAt: string;
  canvasWidth: number;
  canvasHeight: number;
}

// Helper function to calculate distance from point to line segment
const distanceToLineSegment = (
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    // Line start and end are the same point
    return Math.sqrt(A * A + B * B);
  }

  let param = dot / lenSq;
  let xx: number;
  let yy: number;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

export const SimpleCanvasColoring = React.forwardRef<any, CanvasColoringProps>(
  (
    {
      selectedColor = '#FF0000',
      selectedTool = 'brush',
      brushWidth = 5,
      canvasWidth = 300,
      canvasHeight = 220,
      templateSvg,
      onSave,
    },
    ref
  ) => {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [strokeHistory, setStrokeHistory] = useState<Stroke[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const strokeIdRef = useRef(0);

    const clearCanvas = useCallback(() => {
      setStrokes([]);
      setCurrentStroke([]);
      // Save to history
      setStrokeHistory((prev) => prev.slice(0, historyIndex + 1).concat([[]]));
      setHistoryIndex((prev) => prev + 1);
    }, [historyIndex]);

    const undoStroke = useCallback(() => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setStrokes(strokeHistory[newIndex] || []);
      } else if (strokes.length > 0) {
        setStrokes((prev) => prev.slice(0, -1));
      }
    }, [historyIndex, strokeHistory, strokes.length]);

    const redoStroke = useCallback(() => {
      if (historyIndex < strokeHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setStrokes(strokeHistory[newIndex] || []);
      }
    }, [historyIndex, strokeHistory]);

    const saveDrawing = useCallback(async () => {
      try {
        const drawingId = `drawing_${Date.now()}`;
        const savedDrawing: SavedDrawing = {
          id: drawingId,
          name: `Drawing ${new Date().toLocaleDateString()}`,
          strokes,
          templateSvg,
          createdAt: new Date().toISOString(),
          canvasWidth,
          canvasHeight,
        };

        // Save to AsyncStorage for offline compatibility
        await AsyncStorage.setItem(
          `saved_drawing_${drawingId}`,
          JSON.stringify(savedDrawing)
        );

        // Also keep a list of all saved drawings
        const existingDrawings = await AsyncStorage.getItem(
          'saved_drawings_list'
        );
        const drawingsList = existingDrawings
          ? JSON.parse(existingDrawings)
          : [];
        drawingsList.push({
          id: drawingId,
          name: savedDrawing.name,
          createdAt: savedDrawing.createdAt,
        });
        await AsyncStorage.setItem(
          'saved_drawings_list',
          JSON.stringify(drawingsList)
        );

        Alert.alert('Success', 'Drawing saved successfully!');
        onSave?.(savedDrawing);
      } catch (error) {
        Alert.alert('Error', 'Failed to save drawing');
        console.error('Failed to save drawing:', error);
      }
    }, [strokes, templateSvg, canvasWidth, canvasHeight, onSave]);

    const loadDrawing = useCallback(async (drawingId: string) => {
      try {
        const savedData = await AsyncStorage.getItem(
          `saved_drawing_${drawingId}`
        );
        if (savedData) {
          const drawing: SavedDrawing = JSON.parse(savedData);
          setStrokes(drawing.strokes);
          strokeIdRef.current = drawing.strokes.length;
        }
      } catch (error) {
        console.error('Failed to load drawing:', error);
      }
    }, []);

    React.useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      undo: undoStroke,
      redo: redoStroke,
      save: saveDrawing,
      load: loadDrawing,
      getStrokes: () => strokes,
      getDrawingData: () => ({
        strokes,
        templateSvg,
        canvasWidth,
        canvasHeight,
      }),
    }));

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
        setIsDrawing(true);
        setCurrentStroke([{ x, y }]);
      },
      [selectedTool]
    );

    const handleTouchMove = useCallback(
      (x: number, y: number) => {
        if (!isDrawing) return;

        const newPoint = { x, y };
        setCurrentStroke((prev) => [...prev, newPoint]);

        // For eraser tool, remove intersecting strokes more precisely
        if (selectedTool === 'eraser') {
          setStrokes((prevStrokes) => {
            const filteredStrokes = prevStrokes.filter((stroke) => {
              // More precise intersection check - check if eraser overlaps with stroke path
              const eraserRadius = brushWidth * 1.5;
              const intersects = stroke.points.some((point, index) => {
                if (index === 0) return false;

                // Check line segment from previous point to current point
                const prevPoint = stroke.points[index - 1];
                const distance = distanceToLineSegment(
                  { x, y },
                  prevPoint,
                  point
                );
                return distance < eraserRadius;
              });
              return !intersects;
            });

            // Only save to history if strokes were actually removed
            if (filteredStrokes.length !== prevStrokes.length) {
              setStrokeHistory((history) =>
                history.slice(0, historyIndex + 1).concat([filteredStrokes])
              );
              setHistoryIndex((index) => index + 1);
            }

            return filteredStrokes;
          });
        }
      },
      [isDrawing, selectedTool, brushWidth, historyIndex]
    );

    const handleTouchEnd = useCallback(() => {
      if (isDrawing && currentStroke.length > 0 && selectedTool === 'brush') {
        const pathData = pointsToSmoothPath(currentStroke);
        const newStroke: Stroke = {
          id: `stroke_${strokeIdRef.current++}`,
          type: 'brush',
          points: currentStroke,
          color: selectedColor,
          width: brushWidth,
          pathData,
        };
        setStrokes((prev) => {
          const newStrokes = [...prev, newStroke];
          // Save to history
          setStrokeHistory((history) =>
            history.slice(0, historyIndex + 1).concat([newStrokes])
          );
          setHistoryIndex((index) => index + 1);
          return newStrokes;
        });
      }
      setIsDrawing(false);
      setCurrentStroke([]);
    }, [
      isDrawing,
      currentStroke,
      selectedColor,
      selectedTool,
      brushWidth,
      pointsToSmoothPath,
      historyIndex,
    ]);

    // Pan responder for touch handling
    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
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
          <Svg
            width={canvasWidth}
            height={canvasHeight}
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            style={styles.svg}
          >
            {/* Background */}
            <Rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill="#FFFFFF"
            />

            {/* Completed strokes - render behind template */}
            <G>
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
            </G>

            {/* Current drawing stroke (real-time preview) */}
            {isDrawing && currentPathData && selectedTool === 'brush' && (
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

            {/* Template SVG - render on top to ensure line art is visible */}
            {templateSvg && (
              <G opacity={1.0}>
                <SVGTemplateRenderer
                  svgData={templateSvg}
                  width={canvasWidth}
                  height={canvasHeight}
                />
              </G>
            )}

            {/* Eraser preview */}
            {isDrawing &&
              currentStroke.length > 0 &&
              selectedTool === 'eraser' && (
                <G>
                  {currentStroke.slice(-1).map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={brushWidth * 1.5}
                      fill="rgba(255, 100, 100, 0.2)"
                      stroke="rgba(255, 100, 100, 0.6)"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  ))}
                </G>
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
  },
  svg: {
    backgroundColor: 'transparent',
  },
});

SimpleCanvasColoring.displayName = 'SimpleCanvasColoring';
