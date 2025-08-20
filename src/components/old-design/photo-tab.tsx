import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export function PhotoTab() {
  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.photoHeader}>
        <View style={styles.photoIconContainer}>
          <MaterialIcons name="photo-camera" size={48} color="#3B82F6" />
        </View>
        <Text style={styles.photoTitle}>Turn Photos into Art!</Text>
        <Text style={styles.photoSubtitle}>
          Upload a photo or take a new one to create your own coloring page
        </Text>
      </View>

      <View style={styles.photoActions}>
        <TouchableOpacity style={styles.takePhotoButton}>
          <MaterialIcons name="camera-alt" size={24} color="#FFFFFF" />
          <Text style={styles.takePhotoButtonText}>Take Photo</Text>
          <Text style={styles.takePhotoSubtext}>Use your camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.uploadButton}>
          <MaterialIcons name="upload" size={24} color="#64748B" />
          <Text style={styles.uploadButtonText}>Upload Image</Text>
          <Text style={styles.uploadSubtext}>From your device</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    paddingBottom: 80,
  },
  photoHeader: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  photoIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#EFF6FF',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  photoSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  photoActions: {
    padding: 16,
    gap: 16,
  },
  takePhotoButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  takePhotoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  takePhotoSubtext: {
    fontSize: 12,
    color: '#BFDBFE',
    marginTop: 4,
  },
  uploadButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
