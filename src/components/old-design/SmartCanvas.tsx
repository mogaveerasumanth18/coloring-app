import React from 'react';
import { Platform } from 'react-native';

import { WorkingCanvas } from './WorkingCanvas';

// Dynamic import for Skia to handle build issues gracefully
let AdvancedSkiaCanvas: any = null;
try {
  AdvancedSkiaCanvas = require('./AdvancedSkiaCanvas').AdvancedSkiaCanvas;
} catch (error) {
  console.warn('Skia canvas not available, using SVG fallback');
}

interface SmartCanvasProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

export const SmartCanvas = React.forwardRef<any, SmartCanvasProps>(
  (props, ref) => {
    // Use Skia on native platforms if available, SVG on web or as fallback
    const useSkia = Platform.OS !== 'web' && AdvancedSkiaCanvas !== null;

    if (useSkia) {
      return <AdvancedSkiaCanvas ref={ref} {...props} />;
    }

    return <WorkingCanvas ref={ref} {...props} />;
  }
);

SmartCanvas.displayName = 'SmartCanvas';
