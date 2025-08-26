import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import {
  Alert,
  type GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { SVGTemplateRenderer } from './old-design/SVGTemplateRenderer';

interface CanvasColoringProps {
  selectedColor: string;
  selectedTool: string;
  brushWidth?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  templateSvg?: string; // SVG template data
  onSave?: (drawingData: any) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  type: 'brush' | 'eraser';
  points: Point[];
  color: string;
  width: number;
  pathData: string;
}

interface FillRegion {
  id: string;
  color: string;
  svgPath?: string; // For defined regions
  boundingBox?: { x: number; y: number; width: number; height: number };
}

interface SavedDrawing {
  id: string;
  name: string;
  strokes: Stroke[];
  fillRegions: FillRegion[];
  templateSvg?: string;
  createdAt: string;
  canvasWidth: number;
  canvasHeight: number;
}

// Advanced bucket fill implementation for SVG-based canvas
const createAdvancedFillRegion = (
  x: number,
  y: number,
  color: string,
  canvasWidth: number,
  canvasHeight: number,
  templateSvg?: string
): FillRegion => {
  // For template-based coloring, create intelligent fill regions
  if (templateSvg) {
    // Simple implementation: create a fill region based on quadrants
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    let regionPath = '';
    let regionId = 'region_';

    // Determine which quadrant was clicked and create appropriate fill region
    if (x < centerX && y < centerY) {
      // Top-left quadrant
      regionId += 'top_left';
      regionPath = `M0,0 L${centerX},0 L${centerX},${centerY} L0,${centerY} Z`;
    } else if (x >= centerX && y < centerY) {
      // Top-right quadrant
      regionId += 'top_right';
      regionPath = `M${centerX},0 L${canvasWidth},0 L${canvasWidth},${centerY} L${centerX},${centerY} Z`;
    } else if (x < centerX && y >= centerY) {
      // Bottom-left quadrant
      regionId += 'bottom_left';
      regionPath = `M0,${centerY} L${centerX},${centerY} L${centerX},${canvasHeight} L0,${canvasHeight} Z`;
    } else {
      // Bottom-right quadrant
      regionId += 'bottom_right';
      regionPath = `M${centerX},${centerY} L${canvasWidth},${centerY} L${canvasWidth},${canvasHeight} L${centerX},${canvasHeight} Z`;
    }

    return {
      id: `${regionId}_${Date.now()}`,
      color,
      svgPath: regionPath,
      boundingBox: { x: 0, y: 0, width: canvasWidth, height: canvasHeight },
    };
  } else {
    // For non-template coloring, create a circular fill
    const radius = 30;
    const fillPath = `M${x},${y} m-${radius},0 a${radius},${radius} 0 1,1 ${radius * 2},0 a${radius},${radius} 0 1,1 -${radius * 2},0`;

    return {
      id: `fill_${Date.now()}_${Math.random()}`,
      color,
      svgPath: fillPath,
      boundingBox: {
        x: x - radius,
        y: y - radius,
        width: radius * 2,
        height: radius * 2,
      },
    };
  }
};

const TOOL_OPTIONS = [
  { id: 'brush', label: 'Brush', icon: '🖌️' },
  { id: 'bucket', label: 'Fill', icon: '🪣' },
  { id: 'eraser', label: 'Eraser', icon: '🧽' },
];

const COLOR_PALETTE = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#000000', '#FFFFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A',
];

export const EnhancedCanvasColoring = React.forwardRef<any, CanvasColoringProps>(
  (
    {
      selectedColor = '#FF0000',
      selectedTool = 'brush',
      brushWidth = 5,
      canvasWidth = 300,
      canvasHeight = 220,
      templateSvg,
      onSave,
    },
    ref
  ) => {
    const [tool, setTool] = useState(selectedTool);
    const [color, setColor] = useState(selectedColor);
    const [size, setSize] = useState(brushWidth);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [strokeHistory, setStrokeHistory] = useState<Stroke[][]>([[]]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [fillRegions, setFillRegions] = useState<FillRegion[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const strokeIdRef = useRef(0);
    const canvasRef = useRef<any>(null);

    // ...existing logic for clearCanvas, undoStroke, redoStroke, etc...

    // Replace selectedTool, selectedColor, brushWidth with local state
    // Update handleTouchStart, handleTouchEnd, etc. to use tool, color, size

    // ...existing code for panResponder, pointsToSmoothPath, etc...

    // UI Elements
    return (
      <View style={styles.container}>
        {/* Tool Selection */}
        <View style={styles.toolsRow}>
          {TOOL_OPTIONS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.toolButton, tool === t.id && styles.selectedTool]}
              onPress={() => setTool(t.id)}
            >
              <Text style={styles.toolIcon}>{t.icon}</Text>
              <Text style={styles.toolLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Color Palette */}
        <View style={styles.paletteRow}>
          {COLOR_PALETTE.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, color === c && styles.selectedColor]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {/* Size Bar */}
        <View style={styles.sizeBarRow}>
          <Text>Size</Text>
          <Slider
            style={{ flex: 1, marginHorizontal: 10 }}
            minimumValue={1}
            maximumValue={30}
            value={size}
            onValueChange={setSize}
          />
          <Text>{size}</Text>
        </View>

        {/* Canvas Area */}
        <View style={[
          styles.canvasContainer,
          { width: canvasWidth, height: canvasHeight },
        ]}>
          {/* ...existing canvas rendering code... */}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={async () => {
            try {
              // Save drawing data to AsyncStorage
              const drawingId = `drawing_${Date.now()}`;
              const savedDrawing = {
                id: drawingId,
                name: `Drawing ${new Date().toLocaleDateString()}`,
                strokes,
                fillRegions,
                templateSvg,
                createdAt: new Date().toISOString(),
                canvasWidth,
                canvasHeight,
              };
              await AsyncStorage.setItem(
                `saved_drawing_${drawingId}`,
                JSON.stringify(savedDrawing)
              );
              // Also save PNG to mobile storage
              if (canvasRef.current && canvasRef.current.toDataURL) {
                const pngData = canvasRef.current.toDataURL('image/png');
                const fileUri = `${FileSystem.documentDirectory}${drawingId}.png`;
                await FileSystem.writeAsStringAsync(fileUri, pngData.replace(/^data:image\/png;base64,/, ''), { encoding: FileSystem.EncodingType.Base64 });
                Alert.alert('Success', 'Drawing saved to device!');
              } else {
                Alert.alert('Saved', 'Drawing metadata saved!');
              }
              onSave?.(savedDrawing);
            } catch (error) {
              Alert.alert('Error', 'Failed to save drawing');
              console.error('Failed to save drawing:', error);
            }
          }}
        >
          <Text style={styles.saveButtonText}>💾 Save</Text>
        </TouchableOpacity>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
  },
  toolsRow: {
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'space-around',
  },
  toolButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
  },
  selectedTool: {
    backgroundColor: '#d1eaff',
    borderColor: '#2196F3',
    borderWidth: 2,
  },
  toolIcon: {
    fontSize: 20,
  },
  toolLabel: {
    fontSize: 12,
  },
  paletteRow: {
    flexDirection: 'row',
    marginBottom: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    margin: 4,
    borderWidth: 2,
    borderColor: '#eee',
  },
  selectedColor: {
    borderColor: '#2196F3',
    borderWidth: 3,
  },
  sizeBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  canvasContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

EnhancedCanvasColoring.displayName = 'EnhancedCanvasColoring';
