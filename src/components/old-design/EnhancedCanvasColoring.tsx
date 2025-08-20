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

import { SVGTemplateRenderer } from './old-design/SVGTemplateRenderer';

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

interface FillRegion {
  id: string;
  color: string;
  svgPath?: string; // For defined regions
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface SavedDrawing {
  id: string;
  name: string;
  strokes: Stroke[];
  fillRegions: FillRegion[];
  templateSvg?: string;
  createdAt: string;
  canvasWidth: number;
  canvasHeight: number;
}

// Advanced bucket fill implementation for SVG-based canvas
const createAdvancedFillRegion = (
  x: number,
  y: number,
  color: string,
  canvasWidth: number,
  canvasHeight: number,
  templateSvg?: string
): FillRegion => {
  // For template-based coloring, create intelligent fill regions
  if (templateSvg) {
    // Simple implementation: create a fill region based on quadrants
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    let regionPath = '';
    let regionId = 'region_';

    // Determine which quadrant was clicked and create appropriate fill region
    if (x < centerX && y < centerY) {
      // Top-left quadrant
      regionId += 'top_left';
      regionPath = `M0,0 L${centerX},0 L${centerX},${centerY} L0,${centerY} Z`;
    } else if (x >= centerX && y < centerY) {
      // Top-right quadrant
      regionId += 'top_right';
      regionPath = `M${centerX},0 L${canvasWidth},0 L${canvasWidth},${centerY} L${centerX},${centerY} Z`;
    } else if (x < centerX && y >= centerY) {
      // Bottom-left quadrant
      regionId += 'bottom_left';
      regionPath = `M0,${centerY} L${centerX},${centerY} L${centerX},${canvasHeight} L0,${canvasHeight} Z`;
    } else {
      // Bottom-right quadrant
      regionId += 'bottom_right';
      regionPath = `M${centerX},${centerY} L${canvasWidth},${centerY} L${canvasWidth},${canvasHeight} L${centerX},${canvasHeight} Z`;
    }

    return {
      id: `${regionId}_${Date.now()}`,
      color,
      svgPath: regionPath,
      boundingBox: { x: 0, y: 0, width: canvasWidth, height: canvasHeight },
    };
  } else {
    // For non-template coloring, create a circular fill
    const radius = 30;
    const fillPath = `M${x},${y} m-${radius},0 a${radius},${radius} 0 1,1 ${radius * 2},0 a${radius},${radius} 0 1,1 -${radius * 2},0`;

    return {
      id: `fill_${Date.now()}_${Math.random()}`,
      color,
      svgPath: fillPath,
      boundingBox: {
        x: x - radius,
        y: y - radius,
        width: radius * 2,
        height: radius * 2,
      },
    };
  }
};

export const EnhancedCanvasColoring = React.forwardRef<
  any,
  CanvasColoringProps
>(
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
    const [strokeHistory, setStrokeHistory] = useState<Stroke[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [fillRegions, setFillRegions] = useState<FillRegion[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const strokeIdRef = useRef(0);

    const clearCanvas = useCallback(() => {
      const newState: Stroke[] = [];
      setStrokes(newState);
      setFillRegions([]);
      setCurrentStroke([]);
      // Save to history
      setStrokeHistory((prev) =>
        prev.slice(0, historyIndex + 1).concat([newState])
      );
      setHistoryIndex((prev) => prev + 1);
    }, [historyIndex]);

    const undoStroke = useCallback(() => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setStrokes(strokeHistory[newIndex] || []);
      }
    }, [historyIndex, strokeHistory]);

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
          fillRegions,
          templateSvg,
          createdAt: new Date().toISOString(),
          canvasWidth,
          canvasHeight,
        };

        await AsyncStorage.setItem(
          `saved_drawing_${drawingId}`,
          JSON.stringify(savedDrawing)
        );

        const existingDrawings = await AsyncStorage.getItem(
          'saved_drawings_list'
        );
        const drawingsList = existingDrawings
          ? JSON.parse(existingDrawings)
          : [];
        const updatedList = [...drawingsList, drawingId];
        await AsyncStorage.setItem(
          'saved_drawings_list',
          JSON.stringify(updatedList)
        );

        onSave?.(savedDrawing);
        Alert.alert('Success', 'Drawing saved successfully!');
      } catch (error) {
        console.error('Failed to save drawing:', error);
        Alert.alert('Error', 'Failed to save drawing');
      }
    }, [strokes, fillRegions, templateSvg, canvasWidth, canvasHeight, onSave]);

    const loadDrawing = useCallback(async (drawingId: string) => {
      try {
        const savedData = await AsyncStorage.getItem(
          `saved_drawing_${drawingId}`
        );
        if (savedData) {
          const drawing: SavedDrawing = JSON.parse(savedData);
          setStrokes(drawing.strokes);
          setFillRegions(drawing.fillRegions || []);
          strokeIdRef.current = drawing.strokes.length;
          // Reset history when loading
          setStrokeHistory([drawing.strokes]);
          setHistoryIndex(0);
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
      getFillRegions: () => fillRegions,
      getDrawingData: () => ({
        strokes,
        fillRegions,
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
        if (selectedTool === 'bucket') {
          // Bucket fill tool - create a fill region
          const newFillRegion = createAdvancedFillRegion(
            x,
            y,
            selectedColor,
            canvasWidth,
            canvasHeight,
            templateSvg
          );
          setFillRegions((prev) => [...prev, newFillRegion]);
          return;
        }

        // Brush and eraser tools
        setIsDrawing(true);
        setCurrentStroke([{ x, y }]);
      },
      [selectedTool, selectedColor, canvasWidth, canvasHeight, templateSvg]
    );

    const handleTouchMove = useCallback(
      (x: number, y: number) => {
        if (!isDrawing) return;

        const newPoint = { x, y };
        setCurrentStroke((prev) => [...prev, newPoint]);
      },
      [isDrawing]
    );

    const handleTouchEnd = useCallback(() => {
      if (isDrawing && currentStroke.length > 0) {
        const pathData = pointsToSmoothPath(currentStroke);

        if (selectedTool === 'brush') {
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
        } else if (selectedTool === 'eraser') {
          // Create an eraser stroke that will be rendered as a mask
          const newEraserStroke: Stroke = {
            id: `eraser_${strokeIdRef.current++}`,
            type: 'eraser',
            points: currentStroke,
            color: '#FFFFFF', // White for erasing
            width: brushWidth * 1.5, // Slightly larger eraser
            pathData,
          };
          setStrokes((prev) => {
            const newStrokes = [...prev, newEraserStroke];
            // Save to history
            setStrokeHistory((history) =>
              history.slice(0, historyIndex + 1).concat([newStrokes])
            );
            setHistoryIndex((index) => index + 1);
            return newStrokes;
          });
        }
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
          Strokes: {strokes.length} | Fills: {fillRegions.length} | Tool:{' '}
          {selectedTool}
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

            {/* Define mask for eraser strokes */}
            <defs>
              <mask id="eraserMask">
                {/* White background - shows everything */}
                <Rect
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  fill="white"
                />
                {/* Black strokes hide content where eraser was used */}
                {strokes
                  .filter((stroke) => stroke.type === 'eraser')
                  .map((stroke) => (
                    <Path
                      key={stroke.id}
                      d={stroke.pathData}
                      stroke="black"
                      strokeWidth={stroke.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ))}
                {/* Current eraser stroke preview */}
                {isDrawing && currentPathData && selectedTool === 'eraser' && (
                  <Path
                    d={currentPathData}
                    stroke="black"
                    strokeWidth={brushWidth * 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
              </mask>
            </defs>

            {/* Content group with mask applied - this hides content where eraser strokes are */}
            <G mask="url(#eraserMask)">
              {/* Fill regions - render first */}
              <G>
                {fillRegions.map((region) => (
                  <Path
                    key={region.id}
                    d={region.svgPath || ''}
                    fill={region.color}
                    fillOpacity={0.7}
                  />
                ))}
              </G>

              {/* Brush strokes only - render behind template */}
              <G>
                {strokes
                  .filter((stroke) => stroke.type === 'brush')
                  .map((stroke) => (
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
            </G>

            {/* Template SVG - render on top WITHOUT mask to ensure line art is always visible */}
            {templateSvg && (
              <G opacity={1.0}>
                <SVGTemplateRenderer
                  svgData={templateSvg}
                  width={canvasWidth}
                  height={canvasHeight}
                />
              </G>
            )}

            {/* Eraser preview indicator - visual feedback */}
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
                      fill="rgba(255, 100, 100, 0.1)"
                      stroke="rgba(255, 100, 100, 0.4)"
                      strokeWidth="1"
                      strokeDasharray="3,3"
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

EnhancedCanvasColoring.displayName = 'EnhancedCanvasColoring';
