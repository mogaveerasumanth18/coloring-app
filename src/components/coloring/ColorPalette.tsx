import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  brushSize: number;
}

const COLORS = [
  '#000000',
  '#FFFFFF',
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#FFA500',
  '#800080',
  '#FFC0CB',
  '#A52A2A',
  '#808080',
  '#800000',
  '#008000',
  '#000080',
  '#808000',
  '#800080',
  '#008080',
  '#C0C0C0',
  '#FF4500',
  '#DA70D6',
  '#32CD32',
  '#6495ED',
  '#FF1493',
  '#00CED1',
  '#FF6347',
  '#40E0D0',
  '#EE82EE',
  '#90EE90',
  '#FFB6C1',
  '#DDA0DD',
  '#98FB98',
  '#F0E68C',
  '#87CEEB',
  '#DEB887',
];

const BRUSH_SIZES = [2, 5, 10, 15, 20, 25];

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorSelect,
  onBrushSizeChange,
  brushSize,
}) => {
  const [showBrushSizes, setShowBrushSizes] = useState(false);

  return (
    <View style={styles.container}>
      {/* Color Palette */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.colorRow}
        contentContainerStyle={styles.colorContainer}
      >
        {COLORS.map((color, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.colorButton,
              { backgroundColor: color },
              selectedColor === color && styles.selectedColor,
              color === '#FFFFFF' && styles.whiteColorBorder,
            ]}
            onPress={() => onColorSelect(color)}
          />
        ))}
      </ScrollView>

      {/* Brush Size Controls */}
      <View style={styles.brushControls}>
        <TouchableOpacity
          style={styles.brushSizeButton}
          onPress={() => setShowBrushSizes(!showBrushSizes)}
        >
          <Ionicons name="brush" size={24} color="#333" />
          <Text style={styles.brushSizeText}>{brushSize}px</Text>
        </TouchableOpacity>

        {showBrushSizes && (
          <View style={styles.brushSizeOptions}>
            {BRUSH_SIZES.map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.brushSizeOption,
                  brushSize === size && styles.selectedBrushSize,
                ]}
                onPress={() => {
                  onBrushSizeChange(size);
                  setShowBrushSizes(false);
                }}
              >
                <View
                  style={[
                    styles.brushPreview,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      backgroundColor: selectedColor,
                    },
                  ]}
                />
                <Text style={styles.brushSizeLabel}>{size}px</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  colorRow: {
    maxHeight: 60,
  },
  colorContainer: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
    borderWidth: 3,
  },
  whiteColorBorder: {
    borderColor: '#ccc',
    borderWidth: 1,
  },
  brushControls: {
    paddingHorizontal: 15,
    paddingTop: 10,
    position: 'relative',
  },
  brushSizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    alignSelf: 'flex-start',
  },
  brushSizeText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  brushSizeOptions: {
    position: 'absolute',
    bottom: 60,
    left: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  brushSizeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginVertical: 2,
  },
  selectedBrushSize: {
    backgroundColor: '#e3f2fd',
  },
  brushPreview: {
    marginRight: 10,
  },
  brushSizeLabel: {
    fontSize: 14,
    color: '#333',
  },
});
