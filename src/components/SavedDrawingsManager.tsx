import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface SavedDrawing {
  id: string;
  name: string;
  createdAt: string;
}

interface SavedDrawingsManagerProps {
  onDrawingLoad: (drawingId: string) => void;
  onSaveRequest: () => void;
}

export const SavedDrawingsManager: React.FC<SavedDrawingsManagerProps> = ({
  onDrawingLoad,
  onSaveRequest,
}) => {
  const [savedDrawings, setSavedDrawings] = useState<SavedDrawing[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadSavedDrawings = useCallback(async () => {
    try {
      setIsLoading(true);
      const drawingsList = await AsyncStorage.getItem('saved_drawings_list');
      if (drawingsList) {
        const drawings = JSON.parse(drawingsList);
        setSavedDrawings(drawings.reverse()); // Show newest first
      }
    } catch (error) {
      console.error('Failed to load saved drawings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDrawing = useCallback(async (drawingId: string) => {
    try {
      // Remove from storage
      await AsyncStorage.removeItem(`saved_drawing_${drawingId}`);

      // Update the list
      const drawingsList = await AsyncStorage.getItem('saved_drawings_list');
      if (drawingsList) {
        const drawings = JSON.parse(drawingsList);
        const updatedDrawings = drawings.filter(
          (d: SavedDrawing) => d.id !== drawingId
        );
        await AsyncStorage.setItem(
          'saved_drawings_list',
          JSON.stringify(updatedDrawings)
        );
        setSavedDrawings(updatedDrawings.reverse());
      }

      Alert.alert('Success', 'Drawing deleted successfully!');
    } catch (error) {
      console.error('Failed to delete drawing:', error);
      Alert.alert('Error', 'Failed to delete drawing');
    }
  }, []);

  const handleDeletePress = useCallback(
    (drawing: SavedDrawing) => {
      Alert.alert(
        'Delete Drawing',
        `Are you sure you want to delete "${drawing.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteDrawing(drawing.id),
          },
        ]
      );
    },
    [deleteDrawing]
  );

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }, []);

  const renderDrawingItem = useCallback(
    ({ item }: { item: SavedDrawing }) => (
      <View style={styles.drawingItem}>
        <View style={styles.drawingInfo}>
          <Text style={styles.drawingName}>{item.name}</Text>
          <Text style={styles.drawingDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.drawingActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.loadButton]}
            onPress={() => onDrawingLoad(item.id)}
          >
            <Text style={styles.actionButtonText}>Load</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeletePress(item)}
          >
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [onDrawingLoad, handleDeletePress, formatDate]
  );

  useEffect(() => {
    loadSavedDrawings();
  }, [loadSavedDrawings]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Drawings</Text>
        <TouchableOpacity style={styles.saveButton} onPress={onSaveRequest}>
          <Text style={styles.saveButtonText}>💾 Save Current</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : savedDrawings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No saved drawings yet</Text>
          <Text style={styles.emptyHint}>Create some artwork and save it!</Text>
        </View>
      ) : (
        <FlatList
          data={savedDrawings}
          renderItem={renderDrawingItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={loadSavedDrawings}
      >
        <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    maxHeight: 300,
  },
  drawingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  drawingInfo: {
    flex: 1,
  },
  drawingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  drawingDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  drawingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  loadButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  refreshButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
