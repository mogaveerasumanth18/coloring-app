import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { encode as btoa, decode as atob } from 'base-64';
import * as UPNG from 'upng-js';

import { ZebraFloodFill } from '../utils/ZebraFloodFill';

interface Point {
  x: number;
  y: number;
}

interface NativeZebraCanvasProps {
  templateUri?: string;
  selectedColor: string;
  selectedTool: 'brush' | 'bucket' | 'eraser';
  brushWidth?: number;
  width?: number;
  height?: number;
  onColoringComplete?: (imageData: string) => void;
}

interface ColoringBitmap {
  width: number;
  height: number;
  data: Uint8Array; // RGBA pixel data
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_CANVAS_SIZE = Math.min(SCREEN_WIDTH - 40, 400);

export const NativeZebraCanvas = React.forwardRef<any, NativeZebraCanvasProps>(({
  templateUri,
  selectedColor = '#FF6B6B',
  selectedTool = 'bucket',
  brushWidth = 5,
  width = DEFAULT_CANVAS_SIZE,
  height = DEFAULT_CANVAS_SIZE,
  onColoringComplete,
}, ref) => {
  const [bitmap, setBitmap] = useState<ColoringBitmap | null>(null);
  const [originalTemplate, setOriginalTemplate] = useState<ColoringBitmap | null>(null);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: DEFAULT_CANVAS_SIZE, height: DEFAULT_CANVAS_SIZE });
  const [history, setHistory] = useState<ColoringBitmap[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  // Track last touch point to draw continuous brush lines
  const lastPointRef = useRef<Point | null>(null);
  // Throttle expensive PNG encodes during brush moves
  const lastEncodeTimeRef = useRef<number>(0);

  const cloneBitmap = useCallback((bmp: ColoringBitmap): ColoringBitmap => {
    return {
      width: bmp.width,
      height: bmp.height,
      data: new Uint8Array(bmp.data),
    };
  }, []);

  const saveToHistory = useCallback((newBitmap: ColoringBitmap) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(cloneBitmap(newBitmap));
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex, cloneBitmap]);

  const hexToRgba = useCallback((hex: string): [number, number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, 255];
  }, []);

  const updateDataUrl = useCallback(async (currentBitmap: ColoringBitmap) => {
    try {
      // Convert RGBA pixel buffer to a PNG using upng-js on both web and native
      const pngArrayBuffer = (UPNG as any).encode(
        [currentBitmap.data.buffer],
        currentBitmap.width,
        currentBitmap.height,
        0
      );

      // Convert ArrayBuffer -> Base64
      const bytes = new Uint8Array(pngArrayBuffer);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        binary += String.fromCharCode.apply(null as any, Array.prototype.slice.call(bytes, i, i + chunk));
      }
      const base64Png = btoa(binary);
      const uri = `data:image/png;base64,${base64Png}`;
      setDataUrl(uri);

      if (onColoringComplete) onColoringComplete(uri);
    } catch (error) {
      console.error('Failed to update data URL:', error);
      // Fallback: simple 1x1 white PNG
      const transparentPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      setDataUrl(`data:image/png;base64,${transparentPng}`);
    }
  }, [onColoringComplete]);

  // Expose undo/redo/clear methods via ref
  useImperativeHandle(ref, () => ({
    undo: async () => {
      if (historyIndex > 0) {
        const prevBitmap = history[historyIndex - 1];
        setBitmap({ ...prevBitmap, data: new Uint8Array(prevBitmap.data) });
        setHistoryIndex(historyIndex - 1);
        await updateDataUrl({ ...prevBitmap, data: new Uint8Array(prevBitmap.data) });
      }
    },
    redo: async () => {
      if (historyIndex < history.length - 1) {
        const nextBitmap = history[historyIndex + 1];
        setBitmap({ ...nextBitmap, data: new Uint8Array(nextBitmap.data) });
        setHistoryIndex(historyIndex + 1);
        await updateDataUrl({ ...nextBitmap, data: new Uint8Array(nextBitmap.data) });
      }
    },
    clear: async () => {
      if (bitmap) {
        const clearBitmap = cloneBitmap(bitmap);
        // Fill with white
        for (let i = 0; i < clearBitmap.data.length; i += 4) {
          clearBitmap.data[i] = 255;     // R
          clearBitmap.data[i + 1] = 255; // G
          clearBitmap.data[i + 2] = 255; // B
          clearBitmap.data[i + 3] = 255; // A
        }
        setBitmap(clearBitmap);
        await updateDataUrl(clearBitmap);
        saveToHistory(clearBitmap);
      }
    },
    save: () => {
      console.log('Save functionality handled by parent component');
    }
  }), [historyIndex, history, bitmap, cloneBitmap, updateDataUrl, saveToHistory]);

  const loadTemplate = useCallback(async () => {
    if (!templateUri) return;

    try {
      let imageData: Uint8Array;
      let imgWidth: number;
      let imgHeight: number;

      if (templateUri.startsWith('data:')) {
        // Handle data URL
        const base64Data = templateUri.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const decoded = UPNG.decode(bytes.buffer);
        imageData = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
        imgWidth = decoded.width;
        imgHeight = decoded.height;
      } else {
        // Handle file URI
        const base64Data = await FileSystem.readAsStringAsync(templateUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const decoded = UPNG.decode(bytes.buffer);
        imageData = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
        imgWidth = decoded.width;
        imgHeight = decoded.height;
      }

      // Scale the template to fit the provided canvas dimensions
      let scaledImageData = imageData;
      let finalWidth = imgWidth;
      let finalHeight = imgHeight;

      if (width && height && (width !== imgWidth || height !== imgHeight)) {
        // Scale the image data to match the requested canvas size
        console.log(`🔧 Scaling template from ${imgWidth}x${imgHeight} to ${width}x${height}`);
        
        finalWidth = width;
        finalHeight = height;
        scaledImageData = new Uint8Array(width * height * 4);
        
        // Simple nearest-neighbor scaling
        const scaleX = imgWidth / width;
        const scaleY = imgHeight / height;
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcX = Math.floor(x * scaleX);
            const srcY = Math.floor(y * scaleY);
            const srcIndex = (srcY * imgWidth + srcX) * 4;
            const destIndex = (y * width + x) * 4;
            
            scaledImageData[destIndex] = imageData[srcIndex];
            scaledImageData[destIndex + 1] = imageData[srcIndex + 1];
            scaledImageData[destIndex + 2] = imageData[srcIndex + 2];
            scaledImageData[destIndex + 3] = imageData[srcIndex + 3];
          }
        }
      }

      const newBitmap: ColoringBitmap = {
        width: finalWidth,
        height: finalHeight,
        data: scaledImageData,
      };

      setBitmap(newBitmap);
      setOriginalTemplate(cloneBitmap(newBitmap)); // Store original template for eraser
      setCanvasSize({ width: finalWidth, height: finalHeight });
      await updateDataUrl(newBitmap);
      
      // Save initial state to history
      setHistory([cloneBitmap(newBitmap)]);
      setHistoryIndex(0);
      
      setIsInitialized(true);
      console.log('✅ Template loaded and scaled successfully');
    } catch (error) {
      console.error('❌ Failed to load template:', error);
      await createFallbackTemplate();
    }
  }, [templateUri, width, height, updateDataUrl, cloneBitmap]);

  const createFallbackTemplate = useCallback(async () => {
    const templateWidth = width || DEFAULT_CANVAS_SIZE;
    const templateHeight = height || DEFAULT_CANVAS_SIZE;
    const pixelCount = templateWidth * templateHeight;
    const fallbackData = new Uint8Array(pixelCount * 4);

    // Fill with white background and black outlines
    for (let i = 0; i < pixelCount; i++) {
      const index = i * 4;
      fallbackData[index] = 255;     // R
      fallbackData[index + 1] = 255; // G  
      fallbackData[index + 2] = 255; // B
      fallbackData[index + 3] = 255; // A
    }

    // Add some simple black outlines (simple shapes)
    const centerX = Math.floor(templateWidth / 2);
    const centerY = Math.floor(templateHeight / 2);
    const radius = Math.min(templateWidth, templateHeight) / 4;

    // Draw a simple circle outline
    for (let y = 0; y < templateHeight; y++) {
      for (let x = 0; x < templateWidth; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (Math.abs(distance - radius) < 2) {
          const index = (y * templateWidth + x) * 4;
          fallbackData[index] = 0;     // R - black
          fallbackData[index + 1] = 0; // G - black  
          fallbackData[index + 2] = 0; // B - black
          fallbackData[index + 3] = 255; // A
        }
      }
    }

    const fallbackBitmap: ColoringBitmap = {
      width: templateWidth,
      height: templateHeight,
      data: fallbackData,
    };

    setBitmap(fallbackBitmap);
    setOriginalTemplate(cloneBitmap(fallbackBitmap)); // Store original template for eraser
    // Use provided dimensions for fullscreen mode
    setCanvasSize({ width: templateWidth, height: templateHeight });
    await updateDataUrl(fallbackBitmap);
    
    // Save initial state to history
    setHistory([cloneBitmap(fallbackBitmap)]);
    setHistoryIndex(0);
    
    setIsInitialized(true);
    console.log('✅ Created fallback template');
  }, [width, height, updateDataUrl, cloneBitmap]);

  const performFloodFill = useCallback(async (touchX: number, touchY: number) => {
    if (!bitmap || !isInitialized) return;

    try {
      // Convert touch coordinates to bitmap coordinates
      const scaleX = bitmap.width / canvasSize.width;
      const scaleY = bitmap.height / canvasSize.height;
      const bitmapX = Math.floor(touchX * scaleX);
      const bitmapY = Math.floor(touchY * scaleY);

      console.log(`🪣 Flood filling at bitmap coords (${bitmapX}, ${bitmapY}) with color ${selectedColor}`);

      // Create a copy of the bitmap data
      const newData = new Uint8ClampedArray(bitmap.data);
      
      // Perform flood fill using ZebraFloodFill
      const fillColor = ZebraFloodFill.hexToArgb(selectedColor);
      const success = ZebraFloodFill.floodFillRGBA(
        newData,
        bitmap.width,
        bitmap.height,
        bitmapX,
        bitmapY,
        fillColor
      );

      if (success) {
        const newBitmap: ColoringBitmap = {
          width: bitmap.width,
          height: bitmap.height,
          data: new Uint8Array(newData),
        };

        setBitmap(newBitmap);
        await updateDataUrl(newBitmap);
        saveToHistory(newBitmap);
        console.log('✅ Flood fill successful');
      } else {
        console.log('⚠️ Flood fill had no effect');
      }
    } catch (error) {
      console.error('❌ Error during flood fill:', error);
    }
  }, [bitmap, isInitialized, canvasSize, selectedColor, updateDataUrl, saveToHistory]);

  const performBrushStroke = useCallback(async (touchX: number, touchY: number) => {
    if (!bitmap || !isInitialized) return;

    try {
      // Convert touch coordinates to bitmap coordinates
      const scaleX = bitmap.width / canvasSize.width;
      const scaleY = bitmap.height / canvasSize.height;
      const bitmapX = Math.floor(touchX * scaleX);
      const bitmapY = Math.floor(touchY * scaleY);

      const newData = new Uint8Array(bitmap.data);
      const brushRadius = Math.max(1, Math.floor(brushWidth * Math.min(scaleX, scaleY)));

      // Helper to stamp a circular brush at integer coords
      const stampAt = (cx: number, cy: number) => {
        for (let dy = -brushRadius; dy <= brushRadius; dy++) {
          for (let dx = -brushRadius; dx <= brushRadius; dx++) {
            const distance = dx * dx + dy * dy;
            if (distance <= brushRadius * brushRadius) {
              const x = cx + dx;
              const y = cy + dy;
              if (x >= 0 && x < bitmap.width && y >= 0 && y < bitmap.height) {
                const index = (y * bitmap.width + x) * 4;
                if (selectedTool === 'eraser') {
                  if (originalTemplate) {
                    newData[index] = originalTemplate.data[index];
                    newData[index + 1] = originalTemplate.data[index + 1];
                    newData[index + 2] = originalTemplate.data[index + 2];
                    newData[index + 3] = originalTemplate.data[index + 3];
                  }
                } else {
                  const [r, g, b, a] = hexToRgba(selectedColor);
                  newData[index] = r;
                  newData[index + 1] = g;
                  newData[index + 2] = b;
                  newData[index + 3] = a;
                }
              }
            }
          }
        }
      };

      // Draw a continuous line from last point to the new point
      const prev = lastPointRef.current;
      if (!prev) {
        stampAt(bitmapX, bitmapY);
      } else {
        const dx = bitmapX - prev.x;
        const dy = bitmapY - prev.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        for (let i = 0; i <= steps; i++) {
          const x = Math.round(prev.x + (dx * i) / (steps || 1));
          const y = Math.round(prev.y + (dy * i) / (steps || 1));
          stampAt(x, y);
        }
      }
      lastPointRef.current = { x: bitmapX, y: bitmapY };

      const newBitmap: ColoringBitmap = {
        width: bitmap.width,
        height: bitmap.height,
        data: newData,
      };

      setBitmap(newBitmap);
      // Throttle PNG encoding while moving to keep UI smooth
      const now = Date.now();
      if (now - lastEncodeTimeRef.current > 80) {
        lastEncodeTimeRef.current = now;
        await updateDataUrl(newBitmap);
      }
    } catch (error) {
      console.error('❌ Error during brush stroke:', error);
    }
  }, [bitmap, originalTemplate, isInitialized, canvasSize, selectedColor, selectedTool, brushWidth, hexToRgba, updateDataUrl]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isInitialized,
    onMoveShouldSetPanResponder: () => isInitialized && (selectedTool === 'brush' || selectedTool === 'eraser'),

    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;

      if (selectedTool === 'bucket') {
        performFloodFill(locationX, locationY);
      } else if (selectedTool === 'brush' || selectedTool === 'eraser') {
        // Start a new stroke
        const scaleX = (bitmap?.width || 1) / canvasSize.width;
        const scaleY = (bitmap?.height || 1) / canvasSize.height;
        lastPointRef.current = {
          x: Math.floor(locationX * scaleX),
          y: Math.floor(locationY * scaleY),
        };
        performBrushStroke(locationX, locationY);
      }
    },

    onPanResponderMove: (evt) => {
      if (selectedTool === 'brush' || selectedTool === 'eraser') {
        const { locationX, locationY } = evt.nativeEvent;
        performBrushStroke(locationX, locationY);
      }
    },

    onPanResponderRelease: async () => {
      if (bitmap && (selectedTool === 'brush' || selectedTool === 'eraser')) {
        saveToHistory(bitmap);
        lastPointRef.current = null;
        // Ensure final high-quality encode when stroke ends
        await updateDataUrl(bitmap);
      }
    },
  });

  useEffect(() => {
    const initializeCanvas = async () => {
      if (templateUri) {
        await loadTemplate();
      } else {
        await createFallbackTemplate();
      }
    };
    
    initializeCanvas();
  }, [templateUri, loadTemplate, createFallbackTemplate]);

  return (
    <View style={styles.container}>
      <View
        style={[styles.canvasContainer, { width: canvasSize.width, height: canvasSize.height }]}
        {...panResponder.panHandlers}
      >
        {dataUrl ? (
          <Image
            source={{ uri: dataUrl }}
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              borderRadius: 12,
            }}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.placeholder, { width: canvasSize.width, height: canvasSize.height }]}>
            <Text style={styles.placeholderText}>Loading template...</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  info: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
