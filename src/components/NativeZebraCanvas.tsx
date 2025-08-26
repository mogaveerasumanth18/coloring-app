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
import { decode as decodeBase64 } from 'base-64';
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
      // For React Native, we need to create a proper PNG data URL
      // We'll use expo-image-manipulator to create the image
      
      if (typeof window !== 'undefined' && document?.createElement) {
        // Web environment - use canvas
        const canvas = document.createElement('canvas');
        canvas.width = currentBitmap.width;
        canvas.height = currentBitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.createImageData(currentBitmap.width, currentBitmap.height);
          imageData.data.set(currentBitmap.data);
          ctx.putImageData(imageData, 0, 0);
          const newDataUrl = canvas.toDataURL('image/png');
          setDataUrl(newDataUrl);
        }
      } else {
        // Native environment - use expo-image-manipulator to create a proper PNG
        const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
        
        // Create a simple colored SVG first, then convert to PNG
        const svgWidth = currentBitmap.width;
        const svgHeight = currentBitmap.height;
        
        // For now, let's create a simple white rectangle with the template outline
        // This is a temporary solution until we can properly convert the RGBA data
        const svgData = `
          <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${svgWidth}" height="${svgHeight}" fill="white"/>
            <!-- Add simple template outlines -->
            <circle cx="${svgWidth/2}" cy="${svgHeight/2}" r="${Math.min(svgWidth, svgHeight)/4}" 
                    fill="none" stroke="black" stroke-width="2"/>
            <rect x="${svgWidth/4}" y="${svgHeight/4}" width="${svgWidth/2}" height="${svgHeight/2}" 
                  fill="none" stroke="black" stroke-width="2"/>
          </svg>
        `;
        
        const dataUri = `data:image/svg+xml;base64,${btoa(svgData)}`;
        
        try {
          const result = await manipulateAsync(dataUri, [], {
            format: SaveFormat.PNG,
            compress: 0.8,
          });
          setDataUrl(result.uri);
        } catch (manipulatorError) {
          console.warn('expo-image-manipulator failed, using fallback:', manipulatorError);
          // Fallback to a simple colored rectangle
          setDataUrl('data:image/svg+xml;base64,' + btoa(svgData));
        }
      }
      
      if (onColoringComplete && dataUrl) {
        onColoringComplete(dataUrl);
      }
    } catch (error) {
      console.error('Failed to update data URL:', error);
      // Create a fallback white rectangle
      const fallbackSvg = `
        <svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="300" fill="white"/>
          <text x="150" y="150" text-anchor="middle" fill="gray">Template Loading...</text>
        </svg>
      `;
      setDataUrl('data:image/svg+xml;base64,' + btoa(fallbackSvg));
    }
  }, [onColoringComplete, dataUrl]);

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

      // Simple circular brush
      for (let dy = -brushRadius; dy <= brushRadius; dy++) {
        for (let dx = -brushRadius; dx <= brushRadius; dx++) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= brushRadius) {
            const x = bitmapX + dx;
            const y = bitmapY + dy;
            
            if (x >= 0 && x < bitmap.width && y >= 0 && y < bitmap.height) {
              const index = (y * bitmap.width + x) * 4;
              
              if (selectedTool === 'eraser') {
                // Eraser: restore to original template pixels
                if (originalTemplate) {
                  newData[index] = originalTemplate.data[index];
                  newData[index + 1] = originalTemplate.data[index + 1];
                  newData[index + 2] = originalTemplate.data[index + 2];
                  newData[index + 3] = originalTemplate.data[index + 3];
                }
              } else {
                // Brush: paint with selected color
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

      const newBitmap: ColoringBitmap = {
        width: bitmap.width,
        height: bitmap.height,
        data: newData,
      };

      setBitmap(newBitmap);
      await updateDataUrl(newBitmap);
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
        performBrushStroke(locationX, locationY);
      }
    },

    onPanResponderMove: (evt) => {
      if (selectedTool === 'brush' || selectedTool === 'eraser') {
        const { locationX, locationY } = evt.nativeEvent;
        performBrushStroke(locationX, locationY);
      }
    },

    onPanResponderRelease: () => {
      if (bitmap && (selectedTool === 'brush' || selectedTool === 'eraser')) {
        saveToHistory(bitmap);
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

      <View style={styles.info}>
        <Text style={styles.infoText}>
          Tool: {selectedTool} | Color: {selectedColor}
          {!isInitialized && ' | Loading...'}
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
