import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  selectedTool: 'brush' | 'bucket';
  templateUri?: string;
  onColoringChange?: (imageData: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_SIZE = Math.min(SCREEN_WIDTH - 40, 400);

export const WorkingColoringCanvas: React.FC<WorkingColoringCanvasProps> = ({
  selectedColor = '#FF6B6B',
  selectedTool = 'bucket',
  templateUri,
  onColoringChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize canvas
  useEffect(() => {
    initializeCanvas();
  }, [templateUri]);

  const initializeCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // Clear with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (templateUri) {
      // Load template image
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setIsReady(true);
        console.log('✅ Template loaded');
      };

      img.onerror = () => {
        console.log('⚠️ Template failed, creating fallback');
        createFallbackTemplate(ctx, canvas.width, canvas.height);
        setIsReady(true);
      };

      img.src = templateUri;
    } else {
      // Create default template
      createFallbackTemplate(ctx, canvas.width, canvas.height);
      setIsReady(true);
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

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isReady,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;

      if (selectedTool === 'bucket') {
        handleFloodFill(locationX, locationY);
      }
    },
  });

  // Render canvas for web only
  if (Platform.OS !== 'web') {
    return (
      <View
        style={[styles.container, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}
      >
        <Text style={styles.placeholderText}>
          Canvas coloring requires web platform.{'\n'}
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
          Tool: {selectedTool} • Color: {selectedColor}
          {!isReady && ' • Loading...'}
        </Text>
      </View>
    </View>
  );
};

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
