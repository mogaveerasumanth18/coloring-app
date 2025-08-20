import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { boundedFloodFill } from './coloring/utils/FloodFill';
import type { Template } from './template-data';

const { width: screenWidth } = Dimensions.get('window');

interface BitmapColoringCanvasProps {
  template: Template;
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  canvasWidth: number;
  canvasHeight: number;
  onSave?: (data: any) => void;
}

interface StrokeData {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface BitmapColoringCanvasRef {
  undo: () => void;
  clear: () => void;
  save: () => void;
  redo?: () => void;
}

export const BitmapColoringCanvas = forwardRef<
  BitmapColoringCanvasRef,
  BitmapColoringCanvasProps
>(
  (
    {
      template,
      selectedColor,
      selectedTool,
      brushWidth = 5,
      canvasWidth,
      canvasHeight,
      onSave,
    },
    ref
  ) => {
    const [strokes, setStrokes] = useState<StrokeData[]>([]);
    const [currentStroke, setCurrentStroke] = useState<StrokeData | null>(null);
    const [filledAreas, setFilledAreas] = useState<
      { x: number; y: number; color: string }[]
    >([]);
    const containerRef = useRef<View>(null);
    const canvasRef = useRef<View>(null);

    // Extract viewBox for proper scaling
    const getViewBox = useCallback(() => {
      const match = template.svgData.match(/viewBox="([^"]+)"/i);
      if (match) return match[1];
      return `0 0 ${canvasWidth} ${canvasHeight}`;
    }, [template.svgData, canvasWidth, canvasHeight]);

    // Convert SVG paths to individual path elements for rendering
    const parseSvgPaths = useCallback(() => {
      const pathMatches = template.svgData.match(/<path[^>]*d="([^"]*)"[^>]*>/gi);
      if (!pathMatches) return [];

      return pathMatches.map((pathElement, index) => {
        const dMatch = pathElement.match(/d="([^"]*)"/);
        const d = dMatch ? dMatch[1] : '';
        
        // Extract other attributes like stroke, fill, etc.
        const strokeMatch = pathElement.match(/stroke="([^"]*)"/);
        const strokeWidthMatch = pathElement.match(/stroke-width="([^"]*)"/);
        
        return {
          key: `path-${index}`,
          d,
          stroke: strokeMatch ? strokeMatch[1] : '#000000',
          strokeWidth: strokeWidthMatch ? parseFloat(strokeWidthMatch[1]) : 2,
          fill: 'none',
        };
      });
    }, [template.svgData]);

    const handleTouch = useCallback(
      async (event: any) => {
        const { locationX: x, locationY: y } = event.nativeEvent;

        if (selectedTool === 'bucket') {
          // Flood fill implementation
          try {
            // Capture current canvas as image
            if (canvasRef.current) {
              const uri = await captureRef(canvasRef.current, {
                format: 'png',
                quality: 1.0,
              });

              // Create ImageData-like structure for flood fill
              // This is a simplified approach - in production, you'd want to use
              // a proper image processing library
              setFilledAreas((prev) => [
                ...prev,
                { x: Math.round(x), y: Math.round(y), color: selectedColor },
              ]);
            }
          } catch (error) {
            console.warn('Flood fill failed:', error);
          }
        } else if (selectedTool === 'brush') {
          // Start new stroke
          const newStroke: StrokeData = {
            points: [{ x, y }],
            color: selectedColor,
            width: brushWidth,
          };
          setCurrentStroke(newStroke);
        }
      },
      [selectedTool, selectedColor, brushWidth]
    );

    const handleTouchMove = useCallback(
      (event: any) => {
        if (selectedTool === 'brush' && currentStroke) {
          const { locationX: x, locationY: y } = event.nativeEvent;
          setCurrentStroke((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              points: [...prev.points, { x, y }],
            };
          });
        }
      },
      [selectedTool, currentStroke]
    );

    const handleTouchEnd = useCallback(() => {
      if (currentStroke && currentStroke.points.length > 0) {
        setStrokes((prev) => [...prev, currentStroke]);
        setCurrentStroke(null);
      }
    }, [currentStroke]);

    const undo = useCallback(() => {
      if (filledAreas.length > 0) {
        setFilledAreas((prev) => prev.slice(0, -1));
      } else if (strokes.length > 0) {
        setStrokes((prev) => prev.slice(0, -1));
      }
    }, [filledAreas.length, strokes.length]);

    const clear = useCallback(() => {
      setStrokes([]);
      setCurrentStroke(null);
      setFilledAreas([]);
    }, []);

    const save = useCallback(async () => {
      if (onSave && containerRef.current) {
        try {
          const uri = await captureRef(containerRef.current, {
            format: 'png',
            quality: 1.0,
          });
          onSave({
            uri,
            strokes,
            filledAreas,
            template: template.id,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.warn('Save failed:', error);
        }
      }
    }, [onSave, strokes, filledAreas, template.id]);

    useImperativeHandle(
      ref,
      () => ({
        undo,
        clear,
        save,
        redo: undo, // For compatibility
      }),
      [undo, clear, save]
    );

    // Convert stroke points to SVG path
    const strokeToPath = useCallback((stroke: StrokeData) => {
      if (stroke.points.length === 0) return '';
      
      let path = `M${stroke.points[0].x},${stroke.points[0].y}`;
      for (let i = 1; i < stroke.points.length; i++) {
        path += ` L${stroke.points[i].x},${stroke.points[i].y}`;
      }
      return path;
    }, []);

    const svgPaths = parseSvgPaths();

    return (
      <View
        ref={containerRef}
        style={[styles.container, { width: canvasWidth, height: canvasHeight }]}
      >
        <TouchableWithoutFeedback
          onPressIn={handleTouch}
          onPressOut={handleTouchEnd}
        >
          <View
            ref={canvasRef}
            style={[
              styles.canvas,
              { width: canvasWidth, height: canvasHeight },
            ]}
            onTouchMove={handleTouchMove}
          >
            {/* Background fill areas */}
            {filledAreas.map((area, index) => (
              <View
                key={`fill-${index}`}
                style={[
                  styles.fillArea,
                  {
                    left: area.x - 10,
                    top: area.y - 10,
                    backgroundColor: area.color,
                  },
                ]}
              />
            ))}

            {/* Template line art using SVG */}
            <Svg
              width={canvasWidth}
              height={canvasHeight}
              viewBox={getViewBox()}
              style={styles.svgOverlay}
            >
              {/* Render template paths */}
              {svgPaths.map((pathData) => (
                <SvgPath
                  key={pathData.key}
                  d={pathData.d}
                  stroke={pathData.stroke}
                  strokeWidth={pathData.strokeWidth}
                  fill={pathData.fill}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Render user strokes */}
              {strokes.map((stroke, index) => (
                <SvgPath
                  key={`stroke-${index}`}
                  d={strokeToPath(stroke)}
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Render current stroke */}
              {currentStroke && (
                <SvgPath
                  d={strokeToPath(currentStroke)}
                  stroke={currentStroke.color}
                  strokeWidth={currentStroke.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.8}
                />
              )}
            </Svg>
          </View>
        </TouchableWithoutFeedback>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  canvas: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  fillArea: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    zIndex: 5,
  },
});

BitmapColoringCanvas.displayName = 'BitmapColoringCanvas';
