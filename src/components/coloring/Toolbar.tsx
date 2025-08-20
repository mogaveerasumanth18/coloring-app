import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onImageSelect: (imageUri: string) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onUndo,
  onRedo,
  onClear,
  onSave,
  onImageSelect,
  canUndo,
  canRedo,
}) => {
  const pickImage = async () => {
    try {
      // Request permissions
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to select images.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Process image to create coloring book style
        const processedImage = await processImageForColoring(imageUri);
        onImageSelect(processedImage.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const processImageForColoring = async (imageUri: string) => {
    try {
      // Convert to grayscale and enhance edges for coloring book effect
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 800 } }, // Resize for performance
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.PNG,
        }
      );

      // Note: For more advanced edge detection, you might want to use a server-side API
      // or implement custom image processing algorithms
      return result;
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  };

  const confirmClear = () => {
    Alert.alert(
      'Clear Canvas',
      'Are you sure you want to clear all your work? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: onClear },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toolButton, !canUndo && styles.disabledButton]}
        onPress={onUndo}
        disabled={!canUndo}
      >
        <Ionicons
          name="arrow-undo"
          size={24}
          color={canUndo ? '#333' : '#ccc'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toolButton, !canRedo && styles.disabledButton]}
        onPress={onRedo}
        disabled={!canRedo}
      >
        <Ionicons
          name="arrow-redo"
          size={24}
          color={canRedo ? '#333' : '#ccc'}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.toolButton} onPress={pickImage}>
        <Ionicons name="image" size={24} color="#333" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.toolButton} onPress={confirmClear}>
        <Ionicons name="trash" size={24} color="#d32f2f" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveButton} onPress={onSave}>
        <Ionicons name="save" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  toolButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 50,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#f9f9f9',
  },
  saveButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    minWidth: 50,
    alignItems: 'center',
  },
});
