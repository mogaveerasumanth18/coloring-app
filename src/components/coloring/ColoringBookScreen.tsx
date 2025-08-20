import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ColorPalette } from './ColorPalette';
import {
  type DrawingMode,
  EnhancedDrawingCanvas,
} from './EnhancedDrawingCanvas';
import { GamificationSystem } from './gamification/GamificationSystem';
import { ProgressScreen } from './gamification/ProgressScreen';
import { type ColoringTemplate } from './templates/TemplateData';
import { TemplateLibrary } from './templates/TemplateLibrary';
import { Toolbar } from './Toolbar';

interface Stroke {
  path: string;
  color: string;
  width: number;
  opacity: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ColoringBookScreen: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [brushSize, setBrushSize] = useState(5);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('brush');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [backgroundTemplate, setBackgroundTemplate] = useState<
    string | undefined
  >();
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [currentTemplate, setCurrentTemplate] =
    useState<ColoringTemplate | null>(null);

  // Gamification
  const gamificationRef = useRef<GamificationSystem>(new GamificationSystem());
  const drawingStartTimeRef = useRef<Date | null>(null);
  const usedColorsRef = useRef<Set<string>>(new Set());

  // Load gamification data on mount
  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = async () => {
    try {
      const data = await FileSystem.readAsStringAsync(
        `${FileSystem.documentDirectory}gamification.json`
      );
      const parsedData = JSON.parse(data);
      gamificationRef.current = GamificationSystem.fromJSON(parsedData);
    } catch (error) {
      // First time user, use default gamification system
      console.log('No previous gamification data found, starting fresh');
    }
  };

  const saveGamificationData = async () => {
    try {
      const data = gamificationRef.current.toJSON();
      await FileSystem.writeAsStringAsync(
        `${FileSystem.documentDirectory}gamification.json`,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Error saving gamification data:', error);
    }
  };

  const handleStrokeComplete = useCallback((stroke: Stroke) => {
    if (!drawingStartTimeRef.current) {
      drawingStartTimeRef.current = new Date();
    }

    // Track color usage
    usedColorsRef.current.add(stroke.color);

    setStrokes((currentStrokes) => {
      const newStrokes = [...currentStrokes, stroke];
      // Save current state to undo stack
      setUndoStack((currentUndo) => [...currentUndo, currentStrokes]);
      // Clear redo stack when new action is performed
      setRedoStack([]);
      return newStrokes;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    // Save current state to redo stack
    setRedoStack((currentRedo) => [...currentRedo, strokes]);
    setUndoStack(newUndoStack);
    setStrokes(previousState);
  }, [strokes, undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    // Save current state to undo stack
    setUndoStack((currentUndo) => [...currentUndo, strokes]);
    setRedoStack(newRedoStack);
    setStrokes(nextState);
  }, [strokes, redoStack]);

  const handleClear = useCallback(() => {
    setUndoStack((currentUndo) => [...currentUndo, strokes]);
    setRedoStack([]);
    setStrokes([]);
    usedColorsRef.current.clear();
    drawingStartTimeRef.current = null;
  }, [strokes]);

  const handleSave = useCallback(async () => {
    try {
      // Calculate drawing time
      const drawingTime = drawingStartTimeRef.current
        ? Math.round(
            (new Date().getTime() - drawingStartTimeRef.current.getTime()) /
              (1000 * 60)
          )
        : 0;

      // Create a unique filename
      const filename = `coloring_${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Save the drawing data as JSON
      const drawingData = {
        strokes,
        backgroundTemplate,
        currentTemplate: currentTemplate
          ? {
              id: currentTemplate.id,
              title: currentTemplate.title,
              category: currentTemplate.category,
            }
          : null,
        timestamp: new Date().toISOString(),
        screenDimensions: { width: screenWidth, height: screenHeight },
        drawingTime,
        colorsUsed: Array.from(usedColorsRef.current),
      };

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(drawingData));

      // Update gamification system
      const achievements = gamificationRef.current.addDrawing(
        drawingTime,
        Array.from(usedColorsRef.current),
        currentTemplate?.category,
        !!currentTemplate
      );

      // Save gamification data
      await saveGamificationData();

      // Show achievements if any
      if (achievements.length > 0) {
        const achievementTitles = achievements.map((a) => a.title).join(', ');
        Alert.alert(
          '🏆 New Achievement!',
          `Congratulations! You unlocked: ${achievementTitles}`,
          [
            { text: 'View Progress', onPress: () => setShowProgress(true) },
            { text: 'Continue Drawing', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Success', 'Your artwork has been saved!');
      }

      // Reset drawing session
      drawingStartTimeRef.current = null;
      usedColorsRef.current.clear();
    } catch (error) {
      console.error('Error saving file:', error);
      Alert.alert('Error', 'Failed to save your artwork. Please try again.');
    }
  }, [strokes, backgroundTemplate, currentTemplate]);

  const handleImageSelect = useCallback((imageUri: string) => {
    setBackgroundTemplate(imageUri);
    // Clear current drawing when new image is selected
    setStrokes([]);
    setUndoStack([]);
    setRedoStack([]);
    setCurrentTemplate(null);
    usedColorsRef.current.clear();
    drawingStartTimeRef.current = null;
  }, []);

  const handleTemplateSelect = useCallback((template: ColoringTemplate) => {
    // Check if template is unlocked
    if (!gamificationRef.current.isTemplateUnlocked(template.id)) {
      Alert.alert(
        'Template Locked',
        `This template is unlocked at level ${template.difficulty === 'easy' ? '1' : template.difficulty === 'medium' ? '2' : '3'}. Keep drawing to level up!`,
        [
          { text: 'View Progress', onPress: () => setShowProgress(true) },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    setCurrentTemplate(template);
    setBackgroundTemplate(template.svgData);
    setShowTemplateLibrary(false);

    // Clear current drawing
    setStrokes([]);
    setUndoStack([]);
    setRedoStack([]);
    usedColorsRef.current.clear();
    drawingStartTimeRef.current = null;
  }, []);

  const toggleDrawingMode = useCallback(() => {
    setDrawingMode((current) => (current === 'brush' ? 'bucket' : 'brush'));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Toolbar */}
      <View style={styles.topToolbar}>
        <Toolbar
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          onSave={handleSave}
          onImageSelect={handleImageSelect}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
        />

        {/* Additional Controls */}
        <View style={styles.additionalControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowTemplateLibrary(true)}
          >
            <Ionicons name="library" size={20} color="#333" />
            <Text style={styles.controlButtonText}>Templates</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              drawingMode === 'bucket' && styles.activeControlButton,
            ]}
            onPress={toggleDrawingMode}
          >
            <Ionicons
              name={drawingMode === 'brush' ? 'color-fill' : 'brush'}
              size={20}
              color={drawingMode === 'bucket' ? '#fff' : '#333'}
            />
            <Text
              style={[
                styles.controlButtonText,
                drawingMode === 'bucket' && styles.activeControlButtonText,
              ]}
            >
              {drawingMode === 'brush' ? 'Fill' : 'Brush'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowProgress(true)}
          >
            <Ionicons name="trophy" size={20} color="#333" />
            <Text style={styles.controlButtonText}>Progress</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Current Template Info */}
      {currentTemplate && (
        <View style={styles.templateInfo}>
          <Text style={styles.templateTitle}>{currentTemplate.title}</Text>
          <Text style={styles.templateCategory}>
            {currentTemplate.category} • {currentTemplate.difficulty}
          </Text>
        </View>
      )}

      {/* Drawing Canvas */}
      <EnhancedDrawingCanvas
        selectedColor={selectedColor}
        brushSize={brushSize}
        drawingMode={drawingMode}
        onStrokeComplete={handleStrokeComplete}
        backgroundTemplate={backgroundTemplate}
        strokes={strokes}
        enablePressure={true}
      />

      {/* Color Palette */}
      <ColorPalette
        selectedColor={selectedColor}
        onColorSelect={(color) => {
          setSelectedColor(color);
          usedColorsRef.current.add(color);
        }}
        onBrushSizeChange={setBrushSize}
        brushSize={brushSize}
      />

      {/* Template Library Modal */}
      <Modal
        visible={showTemplateLibrary}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <TemplateLibrary
          onTemplateSelect={handleTemplateSelect}
          onClose={() => setShowTemplateLibrary(false)}
        />
      </Modal>

      {/* Progress Modal */}
      <Modal
        visible={showProgress}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ProgressScreen
          gamificationSystem={gamificationRef.current}
          onClose={() => setShowProgress(false)}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topToolbar: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  additionalControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeControlButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  controlButtonText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  activeControlButtonText: {
    color: '#fff',
  },
  templateInfo: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#bbdefb',
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565c0',
  },
  templateCategory: {
    fontSize: 12,
    color: '#1976d2',
    textTransform: 'capitalize',
  },
});
