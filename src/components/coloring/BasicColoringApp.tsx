import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Stroke {
  path: string;
  color: string;
  width: number;
  opacity: number;
}

interface Point {
  x: number;
  y: number;
}

const COLORS = [
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#000000',
  '#FFFFFF',
  '#FFA500',
  '#800080',
  '#FFC0CB',
  '#A52A2A',
];

export const BasicColoringApp: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  const handleMouseDown = useCallback((event: any) => {
    setIsDrawing(true);
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
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
          color: selectedColor,
          width: brushSize,
          opacity: 1,
        },
      ]);
      setCurrentPath('');
    }
    setIsDrawing(false);
  }, [isDrawing, currentPath, selectedColor, brushSize]);

  const clearCanvas = useCallback(() => {
    setStrokes([]);
    setCurrentPath('');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Digital Coloring Book</Text>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.clearButton} onPress={clearCanvas}>
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
        <Text style={styles.brushInfo}>Brush: {brushSize}px</Text>
      </View>

      {/* Drawing Area */}
      <View
        style={styles.canvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg width="100%" height="100%" style={{ backgroundColor: 'white' }}>
          {/* Render completed strokes */}
          {strokes.map((stroke, index) => (
            <path
              key={index}
              d={stroke.path}
              fill="none"
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Render current stroke */}
          {currentPath && (
            <path
              d={currentPath}
              fill="none"
              stroke={selectedColor}
              strokeWidth={brushSize}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </View>

      {/* Color Palette */}
      <View style={styles.colorPalette}>
        {COLORS.map((color, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.colorButton,
              { backgroundColor: color },
              selectedColor === color && styles.selectedColor,
              color === '#FFFFFF' && styles.whiteColor,
            ]}
            onPress={() => setSelectedColor(color)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  clearButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  brushInfo: {
    fontSize: 16,
    color: '#333',
  },
  canvas: {
    flex: 1,
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    cursor: 'crosshair',
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
    borderWidth: 3,
  },
  whiteColor: {
    borderColor: '#ccc',
    borderWidth: 1,
  },
});
