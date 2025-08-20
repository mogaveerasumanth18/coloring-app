import React, { useState } from 'react';
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
];
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function MinimalColoringApp() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentColor, setCurrentColor] = useState('#FF0000');
  const [currentStroke, setCurrentStroke] = useState<string>('');

  const handleColorSelect = (color: string) => {
    setCurrentColor(color);
  };

  const handleClear = () => {
    setStrokes([]);
  };

  const handleUndo = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  // Simple mouse/touch drawing implementation
  const handlePointerDown = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setCurrentStroke(`M${locationX},${locationY}`);
  };

  const handlePointerMove = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setCurrentStroke((prev) => prev + ` L${locationX},${locationY}`);
  };

  const handlePointerUp = () => {
    if (currentStroke) {
      setStrokes((prev) => [
        ...prev,
        {
          path: currentStroke,
          color: currentColor,
          width: 3,
        },
      ]);
      setCurrentStroke('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Digital Coloring Book</Text>

      {/* Color Palette */}
      <View style={styles.colorContainer}>
        <Text style={styles.sectionTitle}>Colors:</Text>
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
        <View
          style={styles.canvas}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={handlePointerDown}
          onResponderMove={handlePointerMove}
          onResponderRelease={handlePointerUp}
        >
          <Svg width="100%" height="100%">
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
            {currentStroke && (
              <Path
                d={currentStroke}
                stroke={currentColor}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>
        </View>
      </View>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolButton} onPress={handleUndo}>
          <Text style={styles.toolButtonText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolButton} onPress={handleClear}>
          <Text style={styles.toolButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instructions}>
        Click and drag to draw with the selected color
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  colorContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  selectedColor: {
    borderColor: '#000',
    borderWidth: 3,
  },
  canvasContainer: {
    flex: 1,
    marginBottom: 20,
  },
  canvas: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 8,
    minHeight: 300,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  toolButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  toolButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  instructions: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});
