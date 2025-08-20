import React, { useCallback, useState } from 'react';
import { Alert, Dimensions, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ColorPalette } from './ColorPalette';
import { SimpleDrawingCanvas } from './SimpleDrawingCanvas';

interface Stroke {
  path: string;
  color: string;
  width: number;
  opacity: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const SimpleColoringScreen: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(5);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  const handleStrokeComplete = useCallback((stroke: Stroke) => {
    setStrokes((currentStrokes) => [...currentStrokes, stroke]);
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
  }, []);

  const handleSave = useCallback(() => {
    // For web, we'll just show an alert. In a full implementation,
    // you could save to localStorage or offer a download
    Alert.alert('Success', 'Your artwork has been saved!');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.toolbar}>
        {/* Simple toolbar - we'll keep it minimal for web demo */}
      </View>

      <SimpleDrawingCanvas
        selectedColor={selectedColor}
        brushSize={brushSize}
        onStrokeComplete={handleStrokeComplete}
        strokes={strokes}
      />

      <ColorPalette
        selectedColor={selectedColor}
        onColorSelect={setSelectedColor}
        onBrushSizeChange={setBrushSize}
        brushSize={brushSize}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  toolbar: {
    height: 60,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
});
