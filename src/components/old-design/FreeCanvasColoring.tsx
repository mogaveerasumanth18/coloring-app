import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas } from 'react-native-canvas';

interface FreeCanvasColoringProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export const FreeCanvasColoring = React.forwardRef<
  any,
  FreeCanvasColoringProps
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
    const canvasRef = useRef<Canvas>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState<any[]>([]);
    const [currentStroke, setCurrentStroke] = useState<any[]>([]);

    // Triangle path coordinates
    const trianglePath = React.useMemo(
      () => [
        { x: canvasWidth / 2, y: 30 },
        { x: canvasWidth - 40, y: canvasHeight - 30 },
        { x: 40, y: canvasHeight - 30 },
      ],
      [canvasWidth, canvasHeight]
    );

    const clearCanvas = useCallback(() => {
      setStrokes([]);
      setCurrentStroke([]);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          redrawCanvas(ctx);
        }
      }
    }, []);

    const undoStroke = useCallback(() => {
      setStrokes((prev) => {
        const newStrokes = prev.slice(0, -1);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            redrawCanvas(ctx, newStrokes);
          }
        }
        return newStrokes;
      });
    }, []);

    React.useImperativeHandle(ref, () => ({
      clear: clearCanvas,
      undo: undoStroke,
      getStrokes: () => strokes,
    }));

    // Check if point is inside triangle
    const isInsideTriangle = useCallback(
      (x: number, y: number): boolean => {
        const [p1, p2, p3] = trianglePath;
        const area =
          0.5 *
          Math.abs(
            (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y)
          );
        const area1 =
          0.5 * Math.abs((p1.x - x) * (p2.y - y) - (p2.x - x) * (p1.y - y));
        const area2 =
          0.5 * Math.abs((p2.x - x) * (p3.y - y) - (p3.x - x) * (p2.y - y));
        const area3 =
          0.5 * Math.abs((p3.x - x) * (p1.y - y) - (p1.x - x) * (p3.y - y));
        return Math.abs(area - (area1 + area2 + area3)) < 1;
      },
      [trianglePath]
    );

    const drawTriangle = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        ctx.beginPath();
        ctx.moveTo(trianglePath[0].x, trianglePath[0].y);
        trianglePath.forEach((point, index) => {
          if (index > 0) {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.closePath();
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 4;
        ctx.stroke();
      },
      [trianglePath]
    );

    const redrawCanvas = useCallback(
      (ctx: CanvasRenderingContext2D, strokesToRender = strokes) => {
        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw user strokes
        strokesToRender.forEach((stroke: any) => {
          if (stroke.type === 'brush' && stroke.points.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            stroke.points.forEach((point: any) => {
              ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
          } else if (stroke.type === 'fill') {
            // Simple triangle fill
            ctx.beginPath();
            ctx.moveTo(trianglePath[0].x, trianglePath[0].y);
            trianglePath.forEach((point, index) => {
              if (index > 0) {
                ctx.lineTo(point.x, point.y);
              }
            });
            ctx.closePath();
            ctx.fillStyle = stroke.color;
            ctx.globalAlpha = 0.7;
            ctx.fill();
            ctx.globalAlpha = 1.0;
          }
        });

        // Draw triangle outline last
        drawTriangle(ctx);
      },
      [strokes, canvasWidth, canvasHeight, trianglePath, drawTriangle]
    );

    const handleCanvasReady = useCallback(
      (canvas: Canvas) => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          redrawCanvas(ctx);
        }
      },
      [redrawCanvas]
    );

    const handleTouchStart = useCallback(
      (event: any) => {
        const { locationX, locationY } = event.nativeEvent;

        if (selectedTool === 'bucket') {
          // Simple bucket fill
          if (isInsideTriangle(locationX, locationY)) {
            const fillStroke = {
              type: 'fill',
              color: selectedColor,
              x: locationX,
              y: locationY,
            };
            setStrokes((prev) => [...prev, fillStroke]);

            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                redrawCanvas(ctx, [...strokes, fillStroke]);
              }
            }
          }
          return;
        }

        if (
          selectedTool === 'brush' &&
          isInsideTriangle(locationX, locationY)
        ) {
          setIsDrawing(true);
          const newPoint = { x: locationX, y: locationY };
          setCurrentStroke([newPoint]);
        }
      },
      [selectedTool, selectedColor, isInsideTriangle, strokes, redrawCanvas]
    );

    const handleTouchMove = useCallback(
      (event: any) => {
        if (!isDrawing || selectedTool !== 'brush') return;

        const { locationX, locationY } = event.nativeEvent;

        if (isInsideTriangle(locationX, locationY)) {
          const newPoint = { x: locationX, y: locationY };
          setCurrentStroke((prev) => {
            const updatedStroke = [...prev, newPoint];

            // Draw current stroke in real-time
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                redrawCanvas(ctx);

                // Draw current stroke
                if (updatedStroke.length > 0) {
                  ctx.beginPath();
                  ctx.strokeStyle = selectedColor;
                  ctx.lineWidth = brushWidth;
                  ctx.lineCap = 'round';
                  ctx.lineJoin = 'round';
                  ctx.globalAlpha = 0.7;

                  ctx.moveTo(updatedStroke[0].x, updatedStroke[0].y);
                  updatedStroke.forEach((point) => {
                    ctx.lineTo(point.x, point.y);
                  });
                  ctx.stroke();
                  ctx.globalAlpha = 1.0;
                }
              }
            }

            return updatedStroke;
          });
        } else {
          // Stop drawing when going outside triangle
          setIsDrawing(false);
          if (currentStroke.length > 0) {
            const strokeData = {
              type: 'brush',
              points: currentStroke,
              color: selectedColor,
              width: brushWidth,
            };
            setStrokes((prev) => [...prev, strokeData]);
          }
          setCurrentStroke([]);
        }
      },
      [
        isDrawing,
        selectedTool,
        isInsideTriangle,
        currentStroke,
        selectedColor,
        brushWidth,
        redrawCanvas,
      ]
    );

    const handleTouchEnd = useCallback(() => {
      if (isDrawing && currentStroke.length > 0) {
        const strokeData = {
          type: 'brush',
          points: currentStroke,
          color: selectedColor,
          width: brushWidth,
        };
        setStrokes((prev) => [...prev, strokeData]);
      }
      setIsDrawing(false);
      setCurrentStroke([]);
    }, [isDrawing, currentStroke, selectedColor, brushWidth]);

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
            onCanvasCreate={handleCanvasReady}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
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
});

FreeCanvasColoring.displayName = 'FreeCanvasColoring';
