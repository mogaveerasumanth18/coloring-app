import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ZebraFloodFill } from '../utils/ZebraFloodFill';

interface WorkingColoringCanvasProps {
  selectedColor: string;
  selectedTool: 'brush' | 'bucket' | 'eraser';
  brushSize?: number;
  templateUri?: string;
  onColoringChange?: (imageData: string) => void;
  width?: number;
  height?: number;
  interactionEnabled?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = Math.min(SCREEN_WIDTH - 40, 400);

export const WorkingColoringCanvas = React.forwardRef<any, WorkingColoringCanvasProps>(
  (
    {
      selectedColor = '#FF6B6B',
      selectedTool = 'bucket',
      brushSize = 8,
      templateUri,
      onColoringChange,
  width,
  height,
      interactionEnabled = true,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const originalImageRef = useRef<HTMLCanvasElement | null>(null);
    const [isReady, setIsReady] = useState(false);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    // Keep a small history of canvas states for undo/redo
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef<number>(-1);

    // Initialize canvas
    useEffect(() => {
      initializeCanvas();
    }, [templateUri, width, height]);

    const snapshot = () => {
      if (!canvasRef.current) return;
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const max = 20;
        // Trim future history if we branched
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyRef.current = historyRef.current.slice(
            0,
            historyIndexRef.current + 1
          );
        }
        historyRef.current.push(dataUrl);
        if (historyRef.current.length > max) {
          historyRef.current.shift();
        }
        historyIndexRef.current = historyRef.current.length - 1;
      } catch (e) {
        // ignore
      }
    };

    const restoreFrom = (index: number) => {
      if (!canvasRef.current) return;
      const url = historyRef.current[index];
      if (!url) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = url;
    };

    const initializeCanvas = useCallback(() => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size (use provided dimensions when available)
      const targetW = Math.floor(width ?? CANVAS_SIZE);
      const targetH = Math.floor(height ?? CANVAS_SIZE);
      canvas.width = targetW;
      canvas.height = targetH;

      // Clear with white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (templateUri) {
        // Load template image
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          // Store original template
          const originalCanvas = document.createElement('canvas');
          originalCanvas.width = canvas.width;
          originalCanvas.height = canvas.height;
          const originalCtx = originalCanvas.getContext('2d');
          if (originalCtx) {
            originalCtx.fillStyle = '#FFFFFF';
            originalCtx.fillRect(0, 0, canvas.width, canvas.height);
            originalCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
            originalImageRef.current = originalCanvas;
          }
          
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setIsReady(true);
          snapshot();
          console.log('✅ Template loaded');
        };

        img.onerror = () => {
          console.log('⚠️ Template failed, creating fallback');
          createFallbackTemplate(ctx, canvas.width, canvas.height);
          
          // Store original fallback template  
          const originalCanvas = document.createElement('canvas');
          originalCanvas.width = canvas.width;
          originalCanvas.height = canvas.height;
          const originalCtx = originalCanvas.getContext('2d');
          if (originalCtx) {
            createFallbackTemplate(originalCtx, canvas.width, canvas.height);
            originalImageRef.current = originalCanvas;
          }
          
          setIsReady(true);
          snapshot();
        };

        img.src = templateUri;
      } else {
        // Create default template
        createFallbackTemplate(ctx, canvas.width, canvas.height);
        
        // Store original fallback template
        const originalCanvas = document.createElement('canvas');
        originalCanvas.width = canvas.width;
        originalCanvas.height = canvas.height;
        const originalCtx = originalCanvas.getContext('2d');
        if (originalCtx) {
          createFallbackTemplate(originalCtx, canvas.width, canvas.height);
          originalImageRef.current = originalCanvas;
        }
        
        setIsReady(true);
        snapshot();
      }
    }, [templateUri]);

  const createFallbackTemplate = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // Draw black outlines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;

    const centerX = w / 2;
    const centerY = h / 2;

    // Main balloon circle
    ctx.beginPath();
    ctx.arc(centerX, centerY - 50, 80, 0, Math.PI * 2);
    ctx.stroke();

    // Balloon segments
    ctx.beginPath();
    ctx.moveTo(centerX - 70, centerY - 80);
    ctx.lineTo(centerX + 70, centerY - 80);
    ctx.moveTo(centerX - 70, centerY - 50);
    ctx.lineTo(centerX + 70, centerY - 50);
    ctx.moveTo(centerX - 70, centerY - 20);
    ctx.lineTo(centerX + 70, centerY - 20);
    ctx.stroke();

    // Basket
    ctx.beginPath();
    ctx.rect(centerX - 25, centerY + 50, 50, 40);
    ctx.stroke();

    // Ropes
    ctx.beginPath();
    ctx.moveTo(centerX - 50, centerY + 30);
    ctx.lineTo(centerX - 20, centerY + 50);
    ctx.moveTo(centerX + 50, centerY + 30);
    ctx.lineTo(centerX + 20, centerY + 50);
    ctx.stroke();
  };

  const handleFloodFill = useCallback(
    (x: number, y: number) => {
      if (!canvasRef.current || !isReady) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        console.log(
          `🎨 Smart flood filling at (${x}, ${y}) with ${selectedColor}`
        );

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Convert color to ARGB format
        const fillColor = ZebraFloodFill.hexToArgb(selectedColor);

        // Use smart flood fill with better boundary detection
        const success = ZebraFloodFill.smartFloodFill(
          imageData.data,
          imageData.width,
          imageData.height,
          Math.floor(x),
          Math.floor(y),
          fillColor,
          40 // Increased tolerance for colored templates
        );

        if (success) {
          // Update canvas
          ctx.putImageData(imageData, 0, 0);
          snapshot();

          // Notify parent
          if (onColoringChange) {
            const dataUrl = canvas.toDataURL('image/png');
            onColoringChange(dataUrl);
          }

          console.log('✅ Smart flood fill successful');
        } else {
          console.log(
            '⚠️ Smart flood fill had no effect - might be clicking on boundary or same color'
          );
        }
      } catch (error) {
        console.error('❌ Flood fill error:', error);
      }
    },
    [selectedColor, isReady, onColoringChange]
  );

    const drawTo = (x: number, y: number) => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const last = lastPointRef.current;
      
      if (selectedTool === 'eraser') {
        // For eraser, use the original template data to restore pixels
        if (originalImageRef.current) {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineWidth = brushSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Create a circular clipping path for the eraser
          ctx.beginPath();
          ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
          ctx.clip();
          
          // Draw the original template in the clipped area
          ctx.drawImage(originalImageRef.current, 0, 0);
          ctx.restore();
        }
      } else {
        // Normal brush drawing
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (last) {
          ctx.moveTo(last.x, last.y);
        } else {
          ctx.moveTo(x, y);
        }
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      
      lastPointRef.current = { x, y };
    };

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => isReady && interactionEnabled,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (selectedTool === 'bucket') {
          handleFloodFill(locationX, locationY);
        } else {
          isDrawingRef.current = true;
          lastPointRef.current = { x: locationX, y: locationY };
          drawTo(locationX, locationY);
        }
      },
      onPanResponderMove: (evt) => {
        if (!isDrawingRef.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        drawTo(locationX, locationY);
      },
      onPanResponderRelease: () => {
        if (isDrawingRef.current) {
          isDrawingRef.current = false;
          lastPointRef.current = null;
          snapshot();
          if (onColoringChange && canvasRef.current) {
            onColoringChange(canvasRef.current.toDataURL('image/png'));
          }
        }
      },
      onPanResponderTerminate: () => {
        isDrawingRef.current = false;
        lastPointRef.current = null;
      },
    });

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      undo: () => {
        if (historyIndexRef.current > 0) {
          historyIndexRef.current -= 1;
          restoreFrom(historyIndexRef.current);
        }
      },
      redo: () => {
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current += 1;
          restoreFrom(historyIndexRef.current);
        }
      },
      save: () => {
        if (!canvasRef.current) return;
        const url = canvasRef.current.toDataURL('image/png');
        if (Platform.OS === 'web') {
          const a = document.createElement('a');
          a.href = url;
          a.download = `coloring-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return url;
      },
      getDataUrl: () => canvasRef.current?.toDataURL('image/png'),
    }));

    // Render canvas for web only
    if (Platform.OS !== 'web') {
      return (
        <View
          style={[styles.container, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}
        >
          <Text style={styles.placeholderText}>
            Canvas coloring requires web platform.{"\n"}
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
              cursor: selectedTool === 'bucket' ? 'crosshair' : 'default',
            }}
          />
        </View>

        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            Tool: {selectedTool} • Size: {brushSize} • Color: {selectedColor}
            {!isReady && ' • Loading...'}
          </Text>
        </View>
      </View>
    );
  }
);

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
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});
