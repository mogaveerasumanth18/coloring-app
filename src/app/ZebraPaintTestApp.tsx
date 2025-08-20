import React, { useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ZebraColoringCanvas } from '../components/ZebraColoringCanvas';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_MOBILE = SCREEN_WIDTH < 768;

// Color palette for testing
const COLORS = [
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
  '#F8C471',
  '#82E0AA',
  '#F1948A',
  '#85C1E9',
  '#D5DBDB',
  '#34495E',
  '#E67E22',
  '#8E44AD',
];

export const ZebraPaintTestApp: React.FC = () => {
  const insets = useSafeAreaInsets();
  const canvasRef = useRef<any>(null);
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedTool, setSelectedTool] = useState<'brush' | 'bucket'>(
    'bucket'
  );
  const [brushSize, setBrushSize] = useState(5);
  const [coloredImage, setColoredImage] = useState<string | null>(null);

  const handleColoringChange = (imageData: string) => {
    setColoredImage(imageData);
    console.log('🎨 Colored image updated');
  };

  const resetCanvas = () => {
    setColoredImage(null);
  };

  const saveImage = async () => {
    if (!coloredImage) {
      Alert.alert('No Image', 'Please color something first!');
      return;
    }

    try {
      if (Platform.OS === 'web') {
        // For web - trigger download
        const link = document.createElement('a');
        link.download = `coloring-${Date.now()}.png`;
        link.href = coloredImage;
        link.click();
        Alert.alert('Success', 'Image downloaded successfully!');
      } else {
        // For mobile - would need expo-file-system or similar
        Alert.alert('Save Feature', 'Mobile save functionality coming soon!');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save image');
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={[styles.messageContainer, { paddingTop: insets.top + 20 }]}
        >
          <Text style={styles.title}>🦓 Zebra-Paint Engine</Text>
          <Text style={styles.message}>
            This demo requires web platform.{'\n'}
            Please run on web to test the zebra-paint flood fill.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>ColorFun</Text>

        {/* Top Toolbar */}
        <View style={styles.topToolbar}>
          {/* Actions */}
          <View style={styles.toolbarSection}>
            <TouchableOpacity style={styles.iconButton} onPress={resetCanvas}>
              <Text style={styles.iconText}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={saveImage}>
              <Text style={styles.iconText}>💾</Text>
            </TouchableOpacity>
          </View>

          {/* Size Indicator */}
          <View style={styles.sizeIndicator}>
            <Text style={styles.sizeText}>Size: {brushSize}px</Text>
            <View style={styles.sizeSlider}>
              <TouchableOpacity
                style={[
                  styles.sizeToggle,
                  brushSize <= 3 && styles.sizeToggleActive,
                ]}
                onPress={() => setBrushSize(3)}
              >
                <View style={[styles.sizeDot, { width: 6, height: 6 }]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sizeToggle,
                  brushSize === 5 && styles.sizeToggleActive,
                ]}
                onPress={() => setBrushSize(5)}
              >
                <View style={[styles.sizeDot, { width: 10, height: 10 }]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sizeToggle,
                  brushSize >= 8 && styles.sizeToggleActive,
                ]}
                onPress={() => setBrushSize(8)}
              >
                <View style={[styles.sizeDot, { width: 14, height: 14 }]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Main Toolbar */}
        <View style={styles.mainToolbar}>
          <TouchableOpacity
            style={[
              styles.toolButton,
              selectedTool === 'brush' && styles.toolButtonActive,
            ]}
            onPress={() => setSelectedTool('brush')}
          >
            <Text
              style={[
                styles.toolIcon,
                selectedTool === 'brush' && styles.toolIconActive,
              ]}
            >
              🖌️
            </Text>
            <Text
              style={[
                styles.toolLabel,
                selectedTool === 'brush' && styles.toolLabelActive,
              ]}
            >
              Paint
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toolButton,
              selectedTool === 'bucket' && styles.toolButtonActive,
            ]}
            onPress={() => setSelectedTool('bucket')}
          >
            <Text
              style={[
                styles.toolIcon,
                selectedTool === 'bucket' && styles.toolIconActive,
              ]}
            >
              🪣
            </Text>
            <Text
              style={[
                styles.toolLabel,
                selectedTool === 'bucket' && styles.toolLabelActive,
              ]}
            >
              Fill
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton}>
            <Text style={styles.toolIcon}>🧽</Text>
            <Text style={styles.toolLabel}>Eraser</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Canvas Section */}
        <View style={styles.canvasSection}>
          <ZebraColoringCanvas
            key={coloredImage ? 'colored' : 'reset'}
            selectedColor={selectedColor}
            selectedTool={selectedTool}
            brushSize={brushSize}
            onColoringChange={handleColoringChange}
          />
        </View>

        {/* Compact Color Palette */}
        <View style={styles.colorPalette}>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                selectedColor === color && styles.colorButtonSelected,
              ]}
              onPress={() => setSelectedColor(color)}
              activeOpacity={0.8}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  topToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  toolbarSection: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  iconText: {
    fontSize: 16,
  },
  sizeIndicator: {
    alignItems: 'center',
  },
  sizeText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  sizeSlider: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  sizeToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeToggleActive: {
    backgroundColor: '#28A745',
    borderColor: '#28A745',
  },
  sizeDot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  mainToolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  toolButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: '#E1E8ED',
    maxWidth: 80,
  },
  toolButtonActive: {
    backgroundColor: '#28A745',
    borderColor: '#28A745',
  },
  toolIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  toolIconActive: {
    color: '#FFFFFF',
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
  },
  toolLabelActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  message: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
  },
  canvasSection: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  colorButton: {
    width: IS_MOBILE ? 36 : 40,
    height: IS_MOBILE ? 36 : 40,
    borderRadius: IS_MOBILE ? 18 : 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  colorButtonSelected: {
    borderColor: '#2C3E50',
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
    elevation: 4,
    shadowOpacity: 0.25,
  },
});
