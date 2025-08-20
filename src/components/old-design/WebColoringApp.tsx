import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Stroke {
  path: string;
  color: string;
  width: number;
}

const colors = [
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#000000',
  '#FFA500',
];
const { width: screenWidth } = Dimensions.get('window');
const canvasWidth = Math.min(screenWidth - 40, 400);
const canvasHeight = 300;

export default function WebColoringApp() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  const handleColorSelect = useCallback((color: string) => {
    setCurrentColor(color);
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
  }, []);

  const handleUndo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  // Mouse event handlers for web
  const handleMouseDown = useCallback((event: any) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setIsDrawing(true);
    setCurrentPath(`M${x},${y}`);
  }, []);

  const handleMouseMove = useCallback(
    (event: any) => {
      if (!isDrawing) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setCurrentPath((prev) => `${prev} L${x},${y}`);
    },
    [isDrawing]
  );

  const handleMouseUp = useCallback(() => {
    if (isDrawing && currentPath) {
      setStrokes((prev) => [
        ...prev,
        {
          path: currentPath,
          color: currentColor,
          width: 3,
        },
      ]);
      setCurrentPath('');
    }
    setIsDrawing(false);
  }, [isDrawing, currentPath, currentColor]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎨 Digital Coloring Book</Text>
      <Text style={styles.subtitle}>Web Version - Draw with your mouse!</Text>

      {/* Color Palette */}
      <View style={styles.paletteContainer}>
        <Text style={styles.sectionTitle}>Choose a color:</Text>
        <View style={styles.colorRow}>
          {colors.map((color, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                currentColor === color && styles.selectedColor,
              ]}
              onPress={() => handleColorSelect(color)}
            />
          ))}
        </View>
      </View>

      {/* Drawing Canvas */}
      <View style={styles.canvasContainer}>
        <div
          style={{
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: 'white',
            borderRadius: 15,
            borderWidth: 2,
            borderColor: '#bdc3c7',
            borderStyle: 'solid',
            cursor: 'crosshair',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Svg width={canvasWidth} height={canvasHeight}>
            {/* Render completed strokes */}
            {strokes.map((stroke, index) => (
              <Path
                key={index}
                d={stroke.path}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {/* Render current stroke being drawn */}
            {isDrawing && currentPath && (
              <Path
                d={currentPath}
                stroke={currentColor}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>
        </div>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolButton, styles.undoButton]}
          onPress={handleUndo}
        >
          <Text style={styles.toolButtonText}>↶ Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, styles.clearButton]}
          onPress={handleClear}
        >
          <Text style={styles.toolButtonText}>🗑️ Clear All</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instructions}>
        Click and drag to draw • Choose colors from the palette above
      </Text>

      <Text style={styles.stats}>
        Strokes: {strokes.length} | Current Color: {currentColor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 25,
    textAlign: 'center',
  },
  paletteContainer: {
    marginBottom: 25,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#34495e',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  colorButton: {
    width: 45,
    height: 45,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#ecf0f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedColor: {
    borderColor: '#2c3e50',
    borderWidth: 4,
    transform: [{ scale: 1.1 }],
  },
  canvasContainer: {
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  canvas: {
    backgroundColor: 'white',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#bdc3c7',
  },
  toolbar: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  toolButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  undoButton: {
    backgroundColor: '#3498db',
  },
  clearButton: {
    backgroundColor: '#e74c3c',
  },
  toolButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  instructions: {
    textAlign: 'center',
    color: '#7f8c8d',
    fontSize: 14,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  stats: {
    textAlign: 'center',
    color: '#95a5a6',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});
