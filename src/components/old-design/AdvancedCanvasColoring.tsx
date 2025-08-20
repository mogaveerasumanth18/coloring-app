import React, { useCallback, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Polygon,
  Rect,
} from 'react-native-svg';

import type {
  ColorableRegion,
  Point,
  ShapeTemplate,
  Stroke,
} from '../types/shapes';
import { isPointInSVGPath } from '../utils/svgUtils';

interface CanvasColoringProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  shapeTemplate?: ShapeTemplate;
}

export const AdvancedCanvasColoring = React.forwardRef<
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
      shapeTemplate,
    },
    ref
  ) => {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [fillAreas, setFillAreas] = useState<{ [key: string]: string }>({});
    const strokeIdRef = useRef(0);

    // Default triangle template if no template provided
    const defaultTemplate: ShapeTemplate = {
      id: 'triangle',
      name: 'Triangle',
      width: canvasWidth,
      height: canvasHeight,
      viewBox: `0 0 ${canvasWidth} ${canvasHeight}`,
      regions: [
        {
          id: 'triangle-main',
          name: 'Triangle',
          svgPath: `M${canvasWidth / 2},30 L${canvasWidth - 40},${canvasHeight - 30} L40,${canvasHeight - 30} Z`,
        },
      ],
      outlineElements: [
        {
          id: 'triangle-outline',
          type: 'path',
          svgPath: `M${canvasWidth / 2},30 L${canvasWidth - 40},${canvasHeight - 30} L40,${canvasHeight - 30} Z`,
          strokeColor: '#333333',
          strokeWidth: 4,
          fill: 'none',
        },
      ],
    };

    const currentTemplate = shapeTemplate || defaultTemplate;

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

    // Find which region contains a point
    const findRegionAtPoint = useCallback(
      (x: number, y: number): ColorableRegion | null => {
        for (const region of currentTemplate.regions) {
          if (isPointInSVGPath(x, y, region.svgPath)) {
            return region;
          }
        }
        return null;
      },
      [currentTemplate.regions]
    );

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
          const region = findRegionAtPoint(x, y);
          if (region) {
            setFillAreas((prev) => ({ ...prev, [region.id]: selectedColor }));
          }
          return;
        }

        if (selectedTool === 'brush') {
          setIsDrawing(true);
          setCurrentStroke([{ x, y }]);
        }
      },
      [selectedTool, selectedColor, findRegionAtPoint]
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

    // Render outline elements
    const renderOutlineElement = (element: any) => {
      switch (element.type) {
        case 'path':
          return (
            <Path
              key={element.id}
              d={element.svgPath}
              stroke={element.strokeColor || '#333'}
              strokeWidth={element.strokeWidth || 3}
              fill={element.fill || 'none'}
            />
          );
        case 'circle':
          return (
            <Circle
              key={element.id}
              cx={element.cx}
              cy={element.cy}
              r={element.r}
              stroke={element.strokeColor || '#333'}
              strokeWidth={element.strokeWidth || 3}
              fill={element.fill || 'none'}
            />
          );
        case 'rect':
          return (
            <Rect
              key={element.id}
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              stroke={element.strokeColor || '#333'}
              strokeWidth={element.strokeWidth || 3}
              fill={element.fill || 'none'}
            />
          );
        case 'polygon':
          return (
            <Polygon
              key={element.id}
              points={element.points}
              stroke={element.strokeColor || '#333'}
              strokeWidth={element.strokeWidth || 3}
              fill={element.fill || 'none'}
            />
          );
        default:
          return null;
      }
    };

    return (
      <View style={styles.container}>
        <Text style={styles.debug}>
          Template: {currentTemplate.name} | Strokes: {strokes.length} | Tool:{' '}
          {selectedTool} | Color: {selectedColor}
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
            viewBox={currentTemplate.viewBox}
            style={styles.svg}
          >
            <Defs>
              {currentTemplate.regions.map((region) => (
                <ClipPath key={`clip-${region.id}`} id={`clip-${region.id}`}>
                  <Path d={region.svgPath} />
                </ClipPath>
              ))}
            </Defs>

            {/* Background */}
            <Rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              fill="#FFFFFF"
            />

            {/* Fill areas */}
            {currentTemplate.regions.map((region) => {
              const fillColor = fillAreas[region.id];
              if (!fillColor) return null;

              return (
                <Path
                  key={`fill-${region.id}`}
                  d={region.svgPath}
                  fill={fillColor}
                  fillOpacity={0.7}
                />
              );
            })}

            {/* Completed strokes with clipping */}
            {currentTemplate.regions.map((region) => (
              <G
                key={`strokes-${region.id}`}
                clipPath={`url(#clip-${region.id})`}
              >
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
            ))}

            {/* Current drawing stroke with clipping */}
            {isDrawing &&
              currentPathData &&
              currentTemplate.regions.map((region) => (
                <G
                  key={`current-${region.id}`}
                  clipPath={`url(#clip-${region.id})`}
                >
                  <Path
                    d={currentPathData}
                    stroke={selectedColor}
                    strokeWidth={brushWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={0.7}
                    fill="none"
                  />
                </G>
              ))}

            {/* Outline elements */}
            {currentTemplate.outlineElements?.map(renderOutlineElement)}
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

AdvancedCanvasColoring.displayName = 'AdvancedCanvasColoring';
