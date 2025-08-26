import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ZebraPaintEngine,
  type ZebraPaintState,
} from '../utils/ZebraPaintEngine';

interface ZebraColoringCanvasProps {
  selectedColor: string;
  selectedTool: 'brush' | 'bucket' | 'eraser';
  brushSize?: number;
  templateUri?: string;
  onColoringChange?: (imageData: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = Math.min(SCREEN_WIDTH - 40, 400);

const createFallbackTemplate = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) => {
  // Fill white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  // Draw black outlines for the hot air balloon template
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const centerX = w / 2;
  const centerY = h / 2;

  // Main balloon circle
  ctx.beginPath();
  ctx.arc(centerX, centerY - 50, 80, 0, Math.PI * 2);
  ctx.stroke();

  // Balloon segments (horizontal lines)
  for (let i = -70; i <= 10; i += 25) {
    ctx.beginPath();
    ctx.moveTo(centerX - 75, centerY - 50 + i);
    ctx.lineTo(centerX + 75, centerY - 50 + i);
    ctx.stroke();
  }

  // Basket
  ctx.beginPath();
  ctx.rect(centerX - 25, centerY + 60, 50, 35);
  ctx.stroke();

  // Basket lines
  ctx.beginPath();
  ctx.moveTo(centerX - 20, centerY + 70);
  ctx.lineTo(centerX + 20, centerY + 70);
  ctx.moveTo(centerX - 20, centerY + 80);
  ctx.lineTo(centerX + 20, centerY + 80);
  ctx.stroke();

  // Ropes
  ctx.beginPath();
  ctx.moveTo(centerX - 60, centerY + 30);
  ctx.lineTo(centerX - 20, centerY + 60);
  ctx.moveTo(centerX + 60, centerY + 30);
  ctx.lineTo(centerX + 20, centerY + 60);
  ctx.moveTo(centerX - 20, centerY + 30);
  ctx.lineTo(centerX - 10, centerY + 60);
  ctx.moveTo(centerX + 20, centerY + 30);
  ctx.lineTo(centerX + 10, centerY + 60);
  ctx.stroke();

  // Some clouds
  const drawCloud = (x: number, y: number, size: number) => {
    ctx.beginPath();
    ctx.arc(x - size, y, size * 0.6, 0, Math.PI * 2);
    ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y - size * 0.3, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x + size, y, size * 0.6, 0, Math.PI * 2);
    ctx.arc(x, y + size * 0.2, size * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  };

  drawCloud(80, 80, 20);
  drawCloud(w - 80, 100, 25);
  drawCloud(60, h - 80, 18);
};

export const ZebraColoringCanvas = React.forwardRef<any, ZebraColoringCanvasProps>(({
  selectedColor = '#FF6B6B',
  selectedTool = 'bucket',
  brushSize = 5,
  templateUri,
  onColoringChange,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zebraState, setZebraState] = useState<ZebraPaintState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Expose undo/redo methods via ref
  useImperativeHandle(ref, () => ({
    undo: () => {
      if (historyIndex > 0 && canvasRef.current) {
        const prevIndex = historyIndex - 1;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx && history[prevIndex]) {
          ctx.putImageData(history[prevIndex], 0, 0);
          setHistoryIndex(prevIndex);
        }
      }
    },
    redo: () => {
      if (historyIndex < history.length - 1 && canvasRef.current) {
        const nextIndex = historyIndex + 1;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx && history[nextIndex]) {
          ctx.putImageData(history[nextIndex], 0, 0);
          setHistoryIndex(nextIndex);
        }
      }
    },
    save: () => {
      if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `zebra-coloring-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    }
  }));

  const saveToHistory = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(imageData);
          return newHistory;
        });
        setHistoryIndex(prev => prev + 1);
      }
    }
  }, [historyIndex]);

  const initializeZebraSystem = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      setIsReady(false);
      console.log('🎨 Initializing zebra-paint system...');

      // Create template canvas for processing
      const templateCanvas = document.createElement('canvas');
      const templateCtx = templateCanvas.getContext('2d')!;

      if (templateUri) {
        // Load template image (web only)
        if (Platform.OS === 'web') {
          const img = new (window as any).Image();
          img.crossOrigin = 'anonymous';

          await new Promise<void>((resolve) => {
            img.onload = () => {
              templateCanvas.width = img.width;
              templateCanvas.height = img.height;
              templateCtx.drawImage(img, 0, 0);
              resolve();
            };

            img.onerror = () => {
              console.log('⚠️ Template failed, creating fallback');
              templateCanvas.width = CANVAS_SIZE;
              templateCanvas.height = CANVAS_SIZE;
              createFallbackTemplate(templateCtx, CANVAS_SIZE, CANVAS_SIZE);
              resolve();
            };

            img.src = templateUri;
          });
        } else {
          // Mobile fallback
          templateCanvas.width = CANVAS_SIZE;
          templateCanvas.height = CANVAS_SIZE;
          createFallbackTemplate(templateCtx, CANVAS_SIZE, CANVAS_SIZE);
        }
      } else {
        // Create fallback template
        templateCanvas.width = CANVAS_SIZE;
        templateCanvas.height = CANVAS_SIZE;
        createFallbackTemplate(templateCtx, CANVAS_SIZE, CANVAS_SIZE);
      }

      // Initialize zebra-paint state from template
      const state = await ZebraPaintEngine.initializeFromTemplate(
        templateCanvas,
        CANVAS_SIZE,
        CANVAS_SIZE
      );

      setZebraState(state);

      // Render initial state
      ZebraPaintEngine.render(canvasRef.current, state);
      
      // Save initial state to history
      setTimeout(() => saveToHistory(), 100);

      setIsReady(true);
      console.log('✅ Zebra-paint system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize zebra-paint system:', error);
      setIsReady(false);
    }
  }, [templateUri]);

  const handleCanvasInteraction = useCallback(
    (x: number, y: number, isMove: boolean = false) => {
      if (!zebraState || !canvasRef.current || !isReady) return;

      try {
        if (selectedTool === 'bucket' && !isMove) {
          // Only flood fill on tap/click, not on move
          console.log(
            `🪣 Zebra flood filling at (${x}, ${y}) with ${selectedColor}`
          );

          // Convert color to ARGB format
          const fillColor = ZebraPaintEngine.hexToArgb(selectedColor);

          // Perform flood fill
          const success = ZebraPaintEngine.floodFill(
            zebraState,
            Math.floor(x),
            Math.floor(y),
            fillColor
          );

          if (success) {
            // Re-render the canvas
            ZebraPaintEngine.render(canvasRef.current, zebraState);
            
            // Save to history
            saveToHistory();

            // Notify parent
            if (onColoringChange) {
              const dataUrl = canvasRef.current.toDataURL('image/png');
              onColoringChange(dataUrl);
            }

            console.log('✅ Zebra flood fill successful');
          } else {
            console.log(
              '⚠️ Zebra flood fill had no effect - clicked on boundary or out of bounds'
            );
          }
        } else if (selectedTool === 'brush' || selectedTool === 'eraser') {
          // Handle brush painting and eraser
          const toolColor = selectedTool === 'eraser' ? '#FFFFFF' : selectedColor;
          console.log(
            `🖌️ Zebra ${selectedTool} at (${x}, ${y}) with ${toolColor}, size: ${brushSize}`
          );

          const brushColor = ZebraPaintEngine.hexToArgb(toolColor);

          if (isMove && lastPoint) {
            // Draw line from last point to current point for smooth strokes
            ZebraPaintEngine.paintLine(
              zebraState,
              lastPoint.x,
              lastPoint.y,
              Math.floor(x),
              Math.floor(y),
              brushColor,
              brushSize
            );
          } else {
            // Single brush stroke
            ZebraPaintEngine.paintBrush(
              zebraState,
              Math.floor(x),
              Math.floor(y),
              brushColor,
              brushSize
            );
          }

          setLastPoint({ x: Math.floor(x), y: Math.floor(y) });

          // Re-render the canvas
          ZebraPaintEngine.render(canvasRef.current, zebraState);
          
          // Save to history
          saveToHistory();

          // Notify parent
          if (onColoringChange) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            onColoringChange(dataUrl);
          }

          console.log('✅ Zebra brush paint successful');
        }
      } catch (error) {
        console.error('❌ Zebra canvas interaction error:', error);
      }
    },
    [
      zebraState,
      selectedColor,
      selectedTool,
      brushSize,
      isReady,
      onColoringChange,
      lastPoint,
    ]
  );

  // Get cursor style based on selected tool
  const getCursorStyle = () => {
    if (selectedTool === 'bucket') {
      return 'crosshair';
    } else if (selectedTool === 'brush' || selectedTool === 'eraser') {
      // Custom brush/eraser cursor using SVG data URL
      const svgCursor = `url("data:image/svg+xml,%3csvg width='16' height='16' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='8' cy='8' r='6' fill='none' stroke='%23000' stroke-width='2'/%3e%3ccircle cx='8' cy='8' r='2' fill='%23000'/%3e%3c/svg%3e") 8 8, crosshair`;
      return svgCursor;
    }
    return 'default';
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isReady,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;

      if (selectedTool === 'brush' || selectedTool === 'eraser') {
        setIsDrawing(true);
        setLastPoint(null); // Reset last point for new stroke
      }

      handleCanvasInteraction(locationX, locationY, false);
    },
    onPanResponderMove: (evt) => {
      if ((selectedTool === 'brush' || selectedTool === 'eraser') && isDrawing) {
        const { locationX, locationY } = evt.nativeEvent;
        handleCanvasInteraction(locationX, locationY, true);
      }
    },
    onPanResponderRelease: () => {
      if (selectedTool === 'brush' || selectedTool === 'eraser') {
        setIsDrawing(false);
        setLastPoint(null); // Clear last point when done drawing
      }
    },
    onPanResponderTerminate: () => {
      if (selectedTool === 'brush' || selectedTool === 'eraser') {
        setIsDrawing(false);
        setLastPoint(null); // Clear last point when interrupted
      }
    },
  });

  // Initialize the zebra-paint system
  useEffect(() => {
    initializeZebraSystem();
  }, [initializeZebraSystem]);

  // Render canvas for web only
  if (Platform.OS !== 'web') {
    return (
      <View
        style={[styles.container, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}
      >
        <Text style={styles.placeholderText}>
          Zebra coloring requires web platform.{'\n'}
          Use SVG-based coloring for mobile.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.canvasWrapper} {...panResponder.panHandlers}>
        <canvas
          ref={canvasRef}
          style={{
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            cursor: getCursorStyle(),
          }}
        />
      </View>

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          🦓 Zebra-Paint Engine • Tool: {selectedTool} • Color: {selectedColor}
          {!isReady && ' • Loading...'}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasWrapper: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusBar: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E8F4F8',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#2563EB',
    textAlign: 'center',
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});
