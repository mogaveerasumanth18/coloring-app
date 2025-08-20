import {
  Canvas,
  Group,
  PaintStyle,
  Path,
  Skia,
  StrokeCap,
  StrokeJoin,
} from '@shopify/react-native-skia';
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import type { Template } from './template-data';

interface LayeredColoringCanvasProps {
  template: Template;
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  canvasWidth: number;
  canvasHeight: number;
  onSave?: (data: any) => void;
}

interface PathData {
  path: string;
  color: string;
  strokeWidth: number;
  tool: string;
}

export interface LayeredColoringCanvasRef {
  undo: () => void;
  clear: () => void;
  save: () => void;
  redo?: () => void; // For compatibility
}

export const LayeredColoringCanvas = forwardRef<
  LayeredColoringCanvasRef,
  LayeredColoringCanvasProps
>(
  // eslint-disable-next-line max-lines-per-function
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
    const [paths, setPaths] = useState<PathData[]>([]);
    const [currentPath, setCurrentPath] = useState<string | null>(null);
    // Extract viewBox to maintain aspect ratio for the SVG template.
    const getViewBox = useCallback(() => {
      const match = template.svgData.match(/viewBox="([^"]+)"/i);
      if (match) return match[1];
      // Provide default viewBox if missing so SvgXml scales correctly.
      return `0 0 ${canvasWidth} ${canvasHeight}`;
    }, [template.svgData, canvasWidth, canvasHeight]);

    // Basic touch handling fallback (since useTouchHandler type not exported in current version)
    const handleTouchStart = useCallback((evt: any) => {
      const { locationX: x, locationY: y } = evt.nativeEvent;
      const newPath = Skia.Path.Make();
      newPath.moveTo(x, y);
      setCurrentPath(newPath.toSVGString());
    }, []);

    const handleTouchMove = useCallback(
      (evt: any) => {
        if (!currentPath) return;
        const { locationX: x, locationY: y } = evt.nativeEvent;
        const path = Skia.Path.MakeFromSVGString(currentPath);
        if (path) {
          path.lineTo(x, y);
          setCurrentPath(path.toSVGString());
        }
      },
      [currentPath]
    );

    const commitPath = useCallback(() => {
      if (!currentPath) return;
      const newPathData: PathData = {
        path: currentPath,
        color: selectedColor,
        strokeWidth: brushWidth,
        tool: selectedTool,
      };
      setPaths((prev) => [...prev, newPathData]);
      setCurrentPath(null);
    }, [currentPath, selectedColor, brushWidth, selectedTool]);

    const handleTouchEnd = useCallback(() => {
      commitPath();
    }, [commitPath]);

    const undo = useCallback(() => {
      setPaths((prev) => prev.slice(0, -1));
    }, []);

    const clear = useCallback(() => {
      setPaths([]);
      setCurrentPath(null);
    }, []);

    const save = useCallback(() => {
      if (onSave) {
        onSave({
          paths,
          template: template.id,
          timestamp: new Date().toISOString(),
        });
      }
    }, [paths, template.id, onSave]);

    useImperativeHandle(
      ref,
      () => ({
        undo,
        clear,
        save,
        redo: undo,
      }),
      [undo, clear, save]
    );

    const paint = Skia.Paint();
    paint.setColor(Skia.Color(selectedColor));
    paint.setStrokeWidth(brushWidth);
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeCap(StrokeCap.Round);
    paint.setStrokeJoin(StrokeJoin.Round);

    const renderTemplate = () => (
      <SvgXml
        xml={template.svgData}
        width={canvasWidth}
        height={canvasHeight}
        // Ensure a viewBox exists for scaling; if original omitted width/height this fixes blank render
        viewBox={getViewBox()}
        // Keep template lines above user strokes so they remain crisp
        style={StyleSheet.flatten([
          styles.svgTemplate,
          { width: canvasWidth, height: canvasHeight },
        ])}
        pointerEvents="none"
      />
    );

    return (
      <View
        style={[styles.container, { width: canvasWidth, height: canvasHeight }]}
      >
        <View style={styles.absoluteFill}>
          {renderTemplate()}
          <Canvas
            style={styles.drawingLayer}
            // Responder system for drawing
            // @ts-ignore
            onStartShouldSetResponder={() => true}
            // @ts-ignore
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleTouchStart}
            onResponderMove={handleTouchMove}
            onResponderRelease={handleTouchEnd}
            onResponderTerminate={handleTouchEnd}
          >
            <Group>
              {paths.map((pathData, index) => {
                const pathObject = Skia.Path.MakeFromSVGString(pathData.path);
                if (!pathObject) return null;
                const pathPaint = Skia.Paint();
                pathPaint.setColor(Skia.Color(pathData.color));
                pathPaint.setStrokeWidth(pathData.strokeWidth);
                pathPaint.setStyle(PaintStyle.Stroke);
                pathPaint.setStrokeCap(StrokeCap.Round);
                pathPaint.setStrokeJoin(StrokeJoin.Round);
                return <Path key={index} path={pathObject} paint={pathPaint} />;
              })}
              {currentPath && (
                <Path
                  path={Skia.Path.MakeFromSVGString(currentPath)!}
                  paint={paint}
                />
              )}
            </Group>
          </Canvas>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  absoluteFill: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  svgTemplate: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
  },
  drawingLayer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});
