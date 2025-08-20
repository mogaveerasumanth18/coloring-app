import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { WorkingColoringCanvas } from '../components/WorkingColoringCanvas';

const TestColoring = () => {
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedTool, setSelectedTool] = useState<'brush' | 'bucket'>(
    'bucket'
  );

  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Coloring Test</Text>

      {/* Tool Selection */}
      <View style={styles.toolContainer}>
        <TouchableOpacity
          style={[
            styles.toolButton,
            selectedTool === 'bucket' && styles.activeButton,
          ]}
          onPress={() => setSelectedTool('bucket')}
        >
          <Text
            style={[
              styles.buttonText,
              selectedTool === 'bucket' && styles.activeText,
            ]}
          >
            🪣 Fill
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toolButton,
            selectedTool === 'brush' && styles.activeButton,
          ]}
          onPress={() => setSelectedTool('brush')}
        >
          <Text
            style={[
              styles.buttonText,
              selectedTool === 'brush' && styles.activeText,
            ]}
          >
            🖌️ Brush
          </Text>
        </TouchableOpacity>
      </View>

      {/* Canvas */}
      <View style={styles.canvasWrapper}>
        <WorkingColoringCanvas
          selectedColor={selectedColor}
          selectedTool={selectedTool}
          onColoringChange={(imageData) => {
            console.log('✅ Coloring changed!');
          }}
        />
      </View>

      {/* Color Palette */}
      <View style={styles.colorSection}>
        <Text style={styles.sectionTitle}>Colors</Text>
        <View style={styles.colorGrid}>
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                selectedColor === color && styles.selectedColor,
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>
      </View>

      <Text style={styles.instructions}>
        🎯 Click inside shapes to fill them with color!{'\n'}
        🖼️ This uses a fallback template since no URI provided.
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  toolContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  toolButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    color: '#666',
  },
  activeText: {
    color: '#FFFFFF',
  },
  canvasWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  colorSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#333',
  },
  instructions: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default TestColoring;
