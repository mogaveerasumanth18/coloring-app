import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import { encode as btoa, decode as atob } from 'base-64';
import * as UPNG from 'upng-js';

// We previously used ZebraFloodFill, but Android was leaking through anti-aliased lines.
// We'll compute a boundary mask once and run a mask-aware flood fill locally.
// import { ZebraFloodFill } from '../utils/ZebraFloodFill';

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
  // When false, disable all drawing interactions (used for Move mode)
  interactionEnabled?: boolean;
  // Optional: when provided on first mount, restore canvas from this PNG data URL instead of template
  initialDataUrl?: string;
}

interface ColoringBitmap {
  width: number;
  height: number;
  data: Uint8Array; // RGBA pixel data
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_CANVAS_SIZE = Math.min(SCREEN_WIDTH - 40, 400);

// Fit an image of size (iw, ih) into a box (bw, bh) preserving aspect ratio
function fitIntoBox(iw: number, ih: number, bw: number, bh: number) {
  if (!bw || !bh) return { width: iw, height: ih };
  const arImg = iw / ih;
  const arBox = bw / bh;
  if (arImg > arBox) {
    const width = bw;
    const height = Math.round(bw / arImg);
    return { width, height };
  }
  const height = bh;
  const width = Math.round(bh * arImg);
  return { width, height };
}

export const NativeZebraCanvas = React.forwardRef<any, NativeZebraCanvasProps>(({
  templateUri,
  selectedColor = '#FF6B6B',
  selectedTool = 'bucket',
  brushWidth = 5,
  width = DEFAULT_CANVAS_SIZE,
  height = DEFAULT_CANVAS_SIZE,
  onColoringComplete,
  interactionEnabled = true,
  initialDataUrl,
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
  // Precomputed boundary mask (1 = boundary/outline, 0 = fillable)
  const boundaryMaskRef = useRef<Uint8Array | null>(null);
  // Strong boundary mask (stricter, no dilation) to protect true dark lines in edge coat
  const strongBoundaryMaskRef = useRef<Uint8Array | null>(null);
  // Keep a stable ref for onColoringComplete to avoid effect churn
  const onCompleteRef = useRef<NativeZebraCanvasProps['onColoringComplete']>(onColoringComplete);
  useEffect(() => {
    onCompleteRef.current = onColoringComplete;
  }, [onColoringComplete]);

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

  if (onCompleteRef.current) onCompleteRef.current(uri);
    } catch (error) {
      console.error('Failed to update data URL:', error);
      // Fallback: simple 1x1 white PNG
      const transparentPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      setDataUrl(`data:image/png;base64,${transparentPng}`);
    }
  }, []);

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
    const sourceUri = initialDataUrl || templateUri;
    if (!sourceUri) return;

    try {
      let imageData: Uint8Array;
      let imgWidth: number;
      let imgHeight: number;

      if (sourceUri.startsWith('data:')) {
        // Handle data URL
        const base64Data = sourceUri.split(',')[1];
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
        const base64Data = await FileSystem.readAsStringAsync(sourceUri, {
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

      // Keep original bitmap to avoid distortion; only the view size fits inside requested box
      const viewBoxW = width || DEFAULT_CANVAS_SIZE;
      const viewBoxH = height || DEFAULT_CANVAS_SIZE;
      const fitted = fitIntoBox(imgWidth, imgHeight, viewBoxW, viewBoxH);

      const newBitmap: ColoringBitmap = {
        width: imgWidth,
        height: imgHeight,
        data: imageData,
      };

      setBitmap(newBitmap);
      setOriginalTemplate(cloneBitmap(newBitmap)); // Store original template for eraser
  setCanvasSize({ width: fitted.width, height: fitted.height });
  // Build robust masks from the loaded template
  boundaryMaskRef.current = computeBoundaryMask(newBitmap);
  strongBoundaryMaskRef.current = computeStrongBoundaryMask(newBitmap);
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
  }, [templateUri, initialDataUrl, width, height, updateDataUrl, cloneBitmap]);

  const createFallbackTemplate = useCallback(async () => {
  const viewBoxW = width || DEFAULT_CANVAS_SIZE;
  const viewBoxH = height || DEFAULT_CANVAS_SIZE;
  // Generate a square fallback bitmap but fit its display into the requested box
  const templateWidth = Math.min(viewBoxW, viewBoxH);
  const templateHeight = Math.min(viewBoxW, viewBoxH);
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
  const fitted = fitIntoBox(templateWidth, templateHeight, viewBoxW, viewBoxH);
  setCanvasSize({ width: fitted.width, height: fitted.height });
  // Build boundary masks for fallback as well
  boundaryMaskRef.current = computeBoundaryMask(fallbackBitmap);
  strongBoundaryMaskRef.current = computeStrongBoundaryMask(fallbackBitmap);
    await updateDataUrl(fallbackBitmap);
    
    // Save initial state to history
    setHistory([cloneBitmap(fallbackBitmap)]);
    setHistoryIndex(0);
    
    setIsInitialized(true);
    console.log('✅ Created fallback template');
  }, [width, height, updateDataUrl, cloneBitmap]);

  const performFloodFill = useCallback(
    async (touchX: number, touchY: number) => {
      if (!bitmap || !isInitialized) return;

      try {
        // Convert touch coordinates to bitmap coordinates
        const scaleX = bitmap.width / canvasSize.width;
        const scaleY = bitmap.height / canvasSize.height;
        let sx = Math.floor(touchX * scaleX);
        let sy = Math.floor(touchY * scaleY);

        // Ensure masks are available
        if (!boundaryMaskRef.current) {
          console.warn('performFloodFill: missing boundary mask, building now.');
          boundaryMaskRef.current = computeBoundaryMask(bitmap);
        }
        if (!strongBoundaryMaskRef.current) {
          console.warn('performFloodFill: missing strong boundary mask, building now.');
          strongBoundaryMaskRef.current = computeStrongBoundaryMask(bitmap);
        }

        // If tapped on a boundary, nudge to nearest fillable pixel within small radius
        const isBoundaryAt = (x: number, y: number) => {
          if (!boundaryMaskRef.current) return false;
          if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) return true;
          return boundaryMaskRef.current[y * bitmap.width + x] === 1;
        };

        if (isBoundaryAt(sx, sy)) {
          let found = false;
          // Slightly larger search radius to find a fillable pixel adjacent to outlines
          search: for (let r = 1; r <= 5; r++) {
            for (let dy = -r; dy <= r; dy++) {
              for (let dx = -r; dx <= r; dx++) {
                const nx = sx + dx;
                const ny = sy + dy;
                if (
                  nx >= 0 && ny >= 0 && nx < bitmap.width && ny < bitmap.height &&
                  !isBoundaryAt(nx, ny)
                ) {
                  sx = nx;
                  sy = ny;
                  found = true;
                  break search;
                }
              }
            }
          }
          if (!found) return; // nowhere to fill
        }

        console.log(`🪣 Flood filling at bitmap coords (${sx}, ${sy}) with color ${selectedColor}`);

        // Prepare new buffer and read target (seed) color
        const newData = new Uint8Array(bitmap.data);
        const idx = (sy * bitmap.width + sx) * 4;
        const targetR = newData[idx];
        const targetG = newData[idx + 1];
        const targetB = newData[idx + 2];
        const targetA = newData[idx + 3];

        // Selected color RGBA
        const [fillR, fillG, fillB, fillA] = hexToRgba(selectedColor);

        // If already similar to fill color, no-op
        const colorClose = (r: number, g: number, b: number, a: number) => {
          const tol = 10;
          return (
            Math.abs(r - fillR) <= tol &&
            Math.abs(g - fillG) <= tol &&
            Math.abs(b - fillB) <= tol &&
            Math.abs(a - fillA) <= tol
          );
        };
        if (colorClose(targetR, targetG, targetB, targetA)) {
          console.log('⚠️ Target already similar to fill color');
          return;
        }

        // Local BFS flood fill that respects boundary mask and color tolerance
  const q: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];
  const visited = new Uint8Array(bitmap.width * bitmap.height);
  const filledMask = new Uint8Array(bitmap.width * bitmap.height);
        const withinTol = (x: number, y: number) => {
          const i = (y * bitmap.width + x) * 4;
          const r = newData[i];
          const g = newData[i + 1];
          const b = newData[i + 2];
          const a = newData[i + 3];
          const tol = 20; // a bit more forgiving than default to avoid speckles
          return (
            Math.abs(r - targetR) <= tol &&
            Math.abs(g - targetG) <= tol &&
            Math.abs(b - targetB) <= tol &&
            Math.abs(a - targetA) <= tol
          );
        };

        let filled = 0;
        while (q.length) {
          const { x, y } = q.shift()!;
          if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) continue;
          const mIndex = y * bitmap.width + x;
          if (visited[mIndex]) continue;
          visited[mIndex] = 1;
          // Respect boundary mask
          if (boundaryMaskRef.current && boundaryMaskRef.current[mIndex] === 1) continue;
          // Keep to similar color region
          if (!withinTol(x, y)) continue;

          // Paint pixel
          const pi = mIndex * 4;
          newData[pi] = fillR;
          newData[pi + 1] = fillG;
          newData[pi + 2] = fillB;
          newData[pi + 3] = fillA;
          filledMask[mIndex] = 1;
          filled++;

          // 4-way neighbors
          q.push({ x: x + 1, y });
          q.push({ x: x - 1, y });
          q.push({ x, y: y + 1 });
          q.push({ x, y: y - 1 });
        }

        if (filled > 0) {
          // Edge coat fix: dilate the filled region by 2 passes (radius≈2) but never onto strong boundaries
          // and avoid obviously dark pixels (likely outline AA) using a brightness check.
          const strong = strongBoundaryMaskRef.current!; // strict boundary mask
          const widthW = bitmap.width;
          const heightH = bitmap.height;
          const isBright = (idxPix: number) => {
            const ri = idxPix * 4;
            const r = newData[ri];
            const g = newData[ri + 1];
            const b = newData[ri + 2];
            // Luma threshold tuned to keep away from dark outline greys
            const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            return luma > 115; // allow painting on light rim
          };

          // Two dilation iterations
          for (let pass = 0; pass < 2; pass++) {
            const toPaint: number[] = [];
            for (let y = 0; y < heightH; y++) {
              for (let x = 0; x < widthW; x++) {
                const idx1 = y * widthW + x;
                if (filledMask[idx1] === 1) continue; // already painted
                if (strong[idx1] === 1) continue; // never cross strong boundaries
                // check 8-neighbors for filled
                let neighborFilled = false;
                for (let dy = -1; dy <= 1 && !neighborFilled; dy++) {
                  for (let dx = -1; dx <= 1 && !neighborFilled; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= widthW || ny >= heightH) continue;
                    const nIdx = ny * widthW + nx;
                    if (filledMask[nIdx] === 1) neighborFilled = true;
                  }
                }
                if (!neighborFilled) continue;
                if (!isBright(idx1)) continue; // skip darker pixels near outline
                toPaint.push(idx1);
              }
            }
            for (const nIdx of toPaint) {
              const pi2 = nIdx * 4;
              newData[pi2] = fillR;
              newData[pi2 + 1] = fillG;
              newData[pi2 + 2] = fillB;
              newData[pi2 + 3] = fillA;
              filledMask[nIdx] = 1;
            }
          }

          const newBitmap: ColoringBitmap = {
            width: bitmap.width,
            height: bitmap.height,
            data: newData,
          };
          setBitmap(newBitmap);
          await updateDataUrl(newBitmap);
          saveToHistory(newBitmap);
          console.log(`✅ Flood fill successful, pixels filled: ${filled}`);
        } else {
          console.log('⚠️ Flood fill had no effect');
        }
      } catch (error) {
        console.error('❌ Error during flood fill:', error);
      }
    },
    [bitmap, isInitialized, canvasSize, selectedColor, hexToRgba, updateDataUrl, saveToHistory]
  );

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
      // Light live update while drawing: throttle PNG encodes to avoid flicker
      const now = Date.now();
      if (now - lastEncodeTimeRef.current > 120) {
        lastEncodeTimeRef.current = now;
        // Fire and forget; errors are caught inside updateDataUrl
        updateDataUrl(newBitmap);
      }
  // Keep final high-quality encode to stroke end
    } catch (error) {
      console.error('❌ Error during brush stroke:', error);
    }
  }, [bitmap, originalTemplate, isInitialized, canvasSize, selectedColor, selectedTool, brushWidth, hexToRgba, updateDataUrl]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isInitialized && interactionEnabled,
    onMoveShouldSetPanResponder: () => isInitialized && interactionEnabled && (selectedTool === 'brush' || selectedTool === 'eraser'),

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
  // Reinitialize only when templateUri changes
  }, [templateUri]);

  return (
    <View style={styles.container} pointerEvents={interactionEnabled ? 'auto' : 'none'}>
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

// Build a robust boundary/outline mask for a given bitmap.
// 1 indicates boundary; 0 indicates fillable.
function computeBoundaryMask(bmp: ColoringBitmap): Uint8Array {
  const { width, height, data } = bmp;
  const mask = new Uint8Array(width * height);

  // First pass: threshold by luma/minRGB and alpha
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const luma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      const minRGB = Math.min(r, g, b);
      const isDarkLine = (a >= 180) && (minRGB <= 80 || luma <= 120);
      if (isDarkLine) {
        mask[y * width + x] = 1;
      }
    }
  }

  // Simple dilation to close tiny anti-aliased gaps
  const dilate = (src: Uint8Array): Uint8Array => {
    const out: Uint8Array = new Uint8Array(src.length);
    out.set(src);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (src[y * width + x] !== 1) continue;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
              out[ny * width + nx] = 1;
            }
          }
        }
      }
    }
    return out;
  };

  let out: Uint8Array = mask;
  out = dilate(out);
  out = dilate(out);
  return out;
}

// Stronger boundary detector: no dilation and stricter darkness thresholds.
// Use this to prevent the edge coat from painting onto true outline pixels.
function computeStrongBoundaryMask(bmp: ColoringBitmap): Uint8Array {
  const { width, height, data } = bmp;
  const mask = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const luma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      const minRGB = Math.min(r, g, b);
      // Stricter: darker and more opaque
      const isDarkLine = (a >= 200) && (minRGB <= 60 || luma <= 100);
      if (isDarkLine) {
        mask[y * width + x] = 1;
      }
    }
  }
  return mask;
}

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
