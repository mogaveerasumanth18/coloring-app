import React, { useRef, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ImageUploader } from './ImageUploader';
import { SavedDrawingsManager } from './SavedDrawingsManager';
import { SimpleCanvasColoring } from './SimpleCanvasColoring';

const { width: screenWidth } = Dimensions.get('window');

interface Tab {
  id: string;
  label: string;
  icon: string;
  color: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  completed: boolean;
  emoji: string;
}

interface Achievement {
  id: number;
  name: string;
  icon: string;
  unlocked: boolean;
}

const tabs: Tab[] = [
  { id: 'coloring', label: 'Color', icon: '🎨', color: '#8B5CF6' },
  { id: 'templates', label: 'Templates', icon: '📚', color: '#3B82F6' },
  { id: 'camera', label: 'Photo', icon: '📸', color: '#10B981' },
  { id: 'achievements', label: 'Rewards', icon: '🏆', color: '#F59E0B' },
];

export default function ColoringBookApp() {
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedTool, setSelectedTool] = useState('brush');
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('coloring');
  const [zoom, setZoom] = useState(1);
  const drawingCanvasRef = useRef<any>(null);

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
    '#F8C471',
    '#82E0AA',
    '#F1C40F',
    '#E74C3C',
    '#9B59B6',
    '#3498DB',
    '#1ABC9C',
    '#F39C12',
    '#2ECC71',
    '#34495E',
    '#E67E22',
    '#95A5A6',
    '#D35400',
    '#8E44AD',
  ];

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  const renderColoringTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.coloringContent}
    >
      {/* Canvas Section */}
      <View style={styles.canvasSection}>
        <View style={styles.canvasHeader}>
          <Text style={styles.canvasTitle}>
            {currentTemplate?.fileName || 'Free Drawing'}
          </Text>
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
              <Text style={styles.zoomButtonText}>−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomReset}
              onPress={handleZoomReset}
            >
              <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
              <Text style={styles.zoomButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[styles.canvasContainer, { transform: [{ scale: zoom }] }]}
        >
          <SimpleCanvasColoring
            ref={drawingCanvasRef}
            selectedColor={selectedColor}
            selectedTool={selectedTool}
            brushWidth={5}
            canvasWidth={Math.min(screenWidth - 40, 350)}
            canvasHeight={Math.min(screenWidth - 40, 350) * 0.8}
            templateSvg={currentTemplate?.svgData}
            onSave={(drawingData) => {
              console.log('Drawing saved:', drawingData);
            }}
          />
        </View>

        {/* Canvas Actions */}
        <View style={styles.canvasActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => drawingCanvasRef.current?.clear()}
          >
            <Text style={styles.actionButtonText}>🗑️ Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => drawingCanvasRef.current?.undo()}
          >
            <Text style={styles.actionButtonText}>↶ Undo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={() => drawingCanvasRef.current?.save()}
          >
            <Text style={[styles.actionButtonText, styles.saveButtonText]}>
              💾 Save
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Color Palette */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Colors</Text>
        <View style={styles.colorGrid}>
          {colors.map((color, index) => (
            <TouchableOpacity
              key={index}
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
    </ScrollView>
  );

  const renderTemplatesTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SVG Templates</Text>
        <ImageUploader
          onImageUploaded={(svgData, fileName) => {
            setCurrentTemplate({ svgData, fileName });
            setActiveTab('coloring');
          }}
          onTemplateSelected={(template) => {
            setCurrentTemplate(template);
            setActiveTab('coloring');
          }}
        />
      </View>
    </ScrollView>
  );

  const renderCameraTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo to Template</Text>
        <View style={styles.placeholderContent}>
          <Text style={styles.placeholderText}>📸</Text>
          <Text style={styles.placeholderTitle}>Convert Photos</Text>
          <Text style={styles.placeholderDescription}>
            Turn your photos into coloring templates
          </Text>
          <TouchableOpacity style={styles.placeholderButton}>
            <Text style={styles.placeholderButtonText}>Coming Soon</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderAchievementsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Drawings</Text>
        <SavedDrawingsManager
          onDrawingLoad={(drawingId) => {
            drawingCanvasRef.current?.load(drawingId);
            setActiveTab('coloring');
          }}
          onSaveRequest={() => {
            drawingCanvasRef.current?.save();
          }}
        />
      </View>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'coloring':
        return renderColoringTab();
      case 'templates':
        return renderTemplatesTab();
      case 'camera':
        return renderCameraTab();
      case 'achievements':
        return renderAchievementsTab();
      default:
        return renderColoringTab();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Digital Coloring Book</Text>
      </View>

      {/* Tab Content */}
      <View style={styles.mainContent}>{renderTabContent()}</View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.navButton,
              activeTab === tab.id && styles.navButtonActive,
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <View
              style={[
                styles.navIconContainer,
                activeTab === tab.id && styles.navIconActive,
              ]}
            >
              <Text style={styles.navIcon}>{tab.icon}</Text>
            </View>
            <Text
              style={[
                styles.navLabel,
                activeTab === tab.id && { color: tab.color },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3E8FF', // Light purple background for kids
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#E879F9',
    elevation: 8,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7C3AED',
    textShadowColor: '#E879F9',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  headerButtonText: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  canvasSection: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  canvasTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  zoomReset: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  zoomButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  zoomText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 40,
    textAlign: 'center',
  },
  canvasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  canvasActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 80,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 15,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorButton: {
    width: (screenWidth - 120) / 6,
    height: (screenWidth - 120) / 6,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#1F2937',
    borderWidth: 3,
  },
  // Navigation styles
  mainContent: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  coloringContent: {
    paddingBottom: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navButtonActive: {
    // Active state styling handled by individual elements
  },
  navIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: '#F3F4F6',
  },
  navIconActive: {
    backgroundColor: '#EEF2FF',
  },
  navIcon: {
    fontSize: 18,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  // Placeholder styles for future tabs
  placeholderContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    fontSize: 48,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  placeholderDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  placeholderButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  placeholderButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
});
