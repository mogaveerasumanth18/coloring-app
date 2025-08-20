import {
  Canvas,
  Group,
  Path,
  Rect,
  Skia,
  useCanvasRef,
  useTouchHandler,
} from '@shopify/react-native-skia';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Stroke {
  path: string;
  color: string;
  width: number;
}

interface AdvancedSkiaCanvasProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export const AdvancedSkiaCanvas = React.forwardRef<
  any,
  AdvancedSkiaCanvasProps
>(
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
    const [currentPath, setCurrentPath] = useState<any>(null);
    const [fillAreas, setFillAreas] = useState<{ [key: string]: string }>({});
    const canvasRef = useCanvasRef();

    // Create triangle path for line art
    const trianglePath = React.useMemo(() => {
      try {
        const path = Skia.Path.Make();
        path.moveTo(canvasWidth / 2, 30);
        path.lineTo(canvasWidth - 40, canvasHeight - 30);
        path.lineTo(40, canvasHeight - 30);
        path.close();
        return path;
      } catch (error) {
        console.warn('Failed to create triangle path:', error);
        return null;
      }
    }, [canvasWidth, canvasHeight]);

    // Create paint objects
    const paints = React.useMemo(() => {
      try {
        const linePaint = Skia.Paint();
        linePaint.setStyle(1); // Stroke
        linePaint.setStrokeWidth(4);
        linePaint.setColor(Skia.Color('#333333'));

        const backgroundPaint = Skia.Paint();
        backgroundPaint.setColor(Skia.Color('#FFFFFF'));

        return { linePaint, backgroundPaint };
      } catch (error) {
        console.warn('Failed to create paints:', error);
        return null;
      }
    }, []);

    const clearCanvas = useCallback(() => {
      setStrokes([]);
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

    // Check if point is inside triangle
    const isInsideTriangle = useCallback(
      (x: number, y: number): boolean => {
        if (!trianglePath) return false;
        try {
          return trianglePath.contains(x, y);
        } catch (error) {
          console.warn('Path contains check failed:', error);
          return false;
        }
      },
      [trianglePath]
    );

    // Simple flood fill for bucket tool
    const floodFill = useCallback(
      (startX: number, startY: number, fillColor: string) => {
        if (!trianglePath) return;

        // For now, simple area fill if clicked inside triangle
        if (isInsideTriangle(startX, startY)) {
          setFillAreas((prev) => ({ ...prev, triangle: fillColor }));
        }
      },
      [isInsideTriangle, trianglePath]
    );

    // Touch handler for drawing and filling
    const touchHandler = useTouchHandler({
      onStart: (touchInfo) => {
        const { x, y } = touchInfo;

        if (selectedTool === 'bucket') {
          floodFill(x, y, selectedColor);
          return;
        }

        if (selectedTool === 'brush' && isInsideTriangle(x, y)) {
          try {
            const path = Skia.Path.Make();
            path.moveTo(x, y);
            setCurrentPath(path);
          } catch (error) {
            console.warn('Failed to create path:', error);
          }
        }
      },
      onActive: (touchInfo) => {
        if (selectedTool !== 'brush' || !currentPath) return;

        const { x, y } = touchInfo;

        try {
          // Only continue drawing if inside triangle
          if (isInsideTriangle(x, y)) {
            currentPath.lineTo(x, y);
            setCurrentPath(currentPath.copy());
          } else {
            // Stop current path when going outside
            finishCurrentStroke();
          }
        } catch (error) {
          console.warn('Failed to update path:', error);
        }
      },
      onEnd: () => {
        finishCurrentStroke();
      },
    });

    const finishCurrentStroke = useCallback(() => {
      if (currentPath) {
        try {
          const pathString = currentPath.toSVGString();
          setStrokes((prev) => [
            ...prev,
            {
              path: pathString,
              color: selectedColor,
              width: brushWidth,
            },
          ]);
          setCurrentPath(null);
        } catch (error) {
          console.warn('Failed to finish stroke:', error);
          setCurrentPath(null);
        }
      }
    }, [currentPath, selectedColor, brushWidth]);

    // Fallback to simple view if Skia is not available
    if (!Skia || !trianglePath || !paints) {
      return (
        <View
          style={[
            styles.container,
            { width: canvasWidth, height: canvasHeight },
          ]}
        >
          <Text style={styles.errorText}>Canvas not available</Text>
        </View>
      );
    }

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
        >
          <Canvas
            ref={canvasRef}
            style={{ width: canvasWidth, height: canvasHeight }}
            onTouch={touchHandler}
          >
            {/* Background */}
            <Rect
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              paint={paints.backgroundPaint}
            />

            {/* Fill area for triangle */}
            {fillAreas.triangle && (
              <Path
                path={trianglePath}
                paint={(() => {
                  const paint = Skia.Paint();
                  paint.setColor(Skia.Color(fillAreas.triangle));
                  paint.setAlphaf(0.7);
                  return paint;
                })()}
              />
            )}

            {/* User strokes */}
            <Group>
              {strokes.map((stroke, index) => {
                try {
                  const path = Skia.Path.MakeFromSVGString(stroke.path);
                  if (!path) return null;

                  return (
                    <Path
                      key={index}
                      path={path}
                      paint={(() => {
                        const paint = Skia.Paint();
                        paint.setStyle(1); // Stroke
                        paint.setStrokeWidth(stroke.width);
                        paint.setColor(Skia.Color(stroke.color));
                        paint.setStrokeCap(1); // Round cap
                        paint.setStrokeJoin(1); // Round join
                        return paint;
                      })()}
                    />
                  );
                } catch (error) {
                  console.warn(`Failed to render stroke ${index}:`, error);
                  return null;
                }
              })}
            </Group>

            {/* Current drawing path */}
            {currentPath && (
              <Path
                path={currentPath}
                paint={(() => {
                  const paint = Skia.Paint();
                  paint.setStyle(1); // Stroke
                  paint.setStrokeWidth(brushWidth);
                  paint.setColor(Skia.Color(selectedColor));
                  paint.setStrokeCap(1); // Round cap
                  paint.setStrokeJoin(1); // Round join
                  paint.setAlphaf(0.7);
                  return paint;
                })()}
              />
            )}

            {/* Triangle line art - drawn last to stay on top */}
            <Path path={trianglePath} paint={paints.linePaint} />
          </Canvas>
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
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
});

AdvancedSkiaCanvas.displayName = 'AdvancedSkiaCanvas';
