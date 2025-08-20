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
  '#F1948A',
  '#A78BFA',
  '#D7BDE2',
];

const templates: Template[] = [
  {
    id: 'butterfly',
    name: 'Butterfly',
    category: 'Animals',
    difficulty: 'Easy',
    completed: true,
    emoji: '🦋',
  },
  {
    id: 'car',
    name: 'Race Car',
    category: 'Vehicles',
    difficulty: 'Medium',
    completed: false,
    emoji: '🏎️',
  },
  {
    id: 'flower',
    name: 'Sunflower',
    category: 'Nature',
    difficulty: 'Easy',
    completed: true,
    emoji: '🌻',
  },
  {
    id: 'castle',
    name: 'Castle',
    category: 'Buildings',
    difficulty: 'Hard',
    completed: false,
    emoji: '🏰',
  },
  {
    id: 'cat',
    name: 'Cute Cat',
    category: 'Animals',
    difficulty: 'Easy',
    completed: false,
    emoji: '🐱',
  },
  {
    id: 'rocket',
    name: 'Space Rocket',
    category: 'Vehicles',
    difficulty: 'Medium',
    completed: false,
    emoji: '🚀',
  },
];

const achievements: Achievement[] = [
  { id: 1, name: 'First Masterpiece', icon: '🎨', unlocked: true },
  { id: 2, name: 'Color Explorer', icon: '🌈', unlocked: true },
  { id: 3, name: 'Speed Artist', icon: '⚡', unlocked: false },
  { id: 4, name: 'Perfect Fill', icon: '🎯', unlocked: false },
];

export default function ColoringBookApp() {
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedTool, setSelectedTool] = useState('brush');
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [showSavedDrawings, setShowSavedDrawings] = useState(false);
  const [zoom, setZoom] = useState(1);
  const drawingCanvasRef = useRef<any>(null);

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
    '#F1C40F', '#E74C3C', '#9B59B6', '#3498DB', '#1ABC9C', '#F39C12',
    '#2ECC71', '#34495E', '#E67E22', '#95A5A6', '#D35400', '#8E44AD',
  ];

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Digital Coloring Book</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, showSavedDrawings && styles.headerButtonActive]}
            onPress={() => setShowSavedDrawings(!showSavedDrawings)}
          >
            <Text style={styles.headerButtonText}>
              {showSavedDrawings ? '🎨' : '📁'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showSavedDrawings ? (
        // Saved Drawings Manager
        <ScrollView style={styles.content}>
          <SavedDrawingsManager
            onDrawingLoad={(drawingId) => {
              drawingCanvasRef.current?.load(drawingId);
              setShowSavedDrawings(false);
            }}
            onSaveRequest={() => {
              drawingCanvasRef.current?.save();
            }}
          />
        </ScrollView>
      ) : (
        // Main Coloring Interface
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          contentContainerStyle={styles.scrollContent}
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
                <TouchableOpacity style={styles.zoomReset} onPress={handleZoomReset}>
                  <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
                  <Text style={styles.zoomButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.canvasContainer, { transform: [{ scale: zoom }] }]}>
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
                <Text style={[styles.actionButtonText, styles.saveButtonText]}>💾 Save</Text>
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

          {/* File Upload Section - Compact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Template</Text>
            <ImageUploader
              onImageUploaded={(svgData, fileName) => {
                setCurrentTemplate({ svgData, fileName });
              }}
              onTemplateSelected={setCurrentTemplate}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Text style={styles.logoIcon}>🎨</Text>
          </View>
          <View>
            <Text style={styles.appName}>ColorFun Kids</Text>
            <Text style={styles.appSubtitle}>Let's create magic!</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.statsBadge}>
            <Text style={styles.starIcon}>⭐</Text>
            <Text style={styles.statsText}>1,250</Text>
          </View>
          <View style={[styles.statsBadge, styles.levelBadge]}>
            <Text style={styles.trophyIcon}>🏆</Text>
            <Text style={styles.levelText}>Lv.5</Text>
          </View>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Daily Progress</Text>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>3/5</Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '60%' }]} />
        </View>
      </View>
    </View>
  );

  const renderColoringTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Canvas Card */}
      <View style={styles.card}>
        <View style={styles.canvasHeader}>
          <Text style={styles.canvasTitle}>Beautiful Butterfly</Text>
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton}>
              <Text style={styles.zoomButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.zoomText}>100%</Text>
            <TouchableOpacity style={styles.zoomButton}>
              <Text style={styles.zoomButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.canvasContainer}>
          {/* Image Upload Section */}
          <ImageUploader
            onImageUploaded={(svgData, fileName) => {
              setCurrentTemplate({ svgData, fileName });
            }}
            onTemplateSelected={setCurrentTemplate}
          />

          {/* Canvas */}
          <SimpleCanvasColoring
            ref={drawingCanvasRef}
            selectedColor={selectedColor}
            selectedTool={selectedTool}
            brushWidth={brushWidth}
            canvasWidth={400}
            canvasHeight={300}
            templateSvg={currentTemplate?.svgData}
            onSave={(drawingData) => {
              console.log('Drawing saved:', drawingData);
            }}
          />

          <View style={styles.hint}>
            <Text style={styles.hintText}>
              Upload an SVG template and start coloring! 🎨
            </Text>
          </View>
        </View>{' '}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.undoButton]}
            onPress={() => drawingCanvasRef.current?.undo()}
          >
            <Text style={styles.actionButtonIcon}>↶</Text>
            <Text style={styles.actionButtonText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.redoButton]}
            onPress={() => {
              // Redo functionality can be implemented later
              console.log('Redo pressed');
            }}
          >
            <Text style={styles.actionButtonIcon}>↷</Text>
            <Text style={styles.actionButtonText}>Redo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={() => {
              const strokes = drawingCanvasRef.current?.getStrokes();
              console.log('Saving artwork:', strokes);
            }}
          >
            <Text style={styles.actionButtonIcon}>💾</Text>
            <Text style={styles.actionButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Drawing Tools */}
      <View style={[styles.card, styles.toolsCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderIcon}>🖌️</Text>
          <Text style={styles.cardTitle}>Drawing Tools</Text>
        </View>
        <View style={styles.toolsGrid}>
          {[
            { id: 'brush', icon: '🖌️', label: 'Brush', color: '#3B82F6' },
            { id: 'bucket', icon: '🪣', label: 'Fill', color: '#10B981' },
            { id: 'eraser', icon: '🧽', label: 'Eraser', color: '#EF4444' },
            { id: 'palette', icon: '🎨', label: 'Blend', color: '#8B5CF6' },
          ].map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={[
                styles.toolButton,
                selectedTool === tool.id && { backgroundColor: tool.color },
              ]}
              onPress={() => setSelectedTool(tool.id)}
            >
              <Text style={styles.toolIcon}>{tool.icon}</Text>
              <Text
                style={[
                  styles.toolLabel,
                  selectedTool === tool.id && styles.toolLabelSelected,
                ]}
              >
                {tool.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Color Palette */}
      <View style={[styles.card, styles.colorsCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderIcon}>🎨</Text>
          <Text style={styles.cardTitle}>Colors</Text>
        </View>
        <View style={styles.colorsGrid}>
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorButton,
                { backgroundColor: color },
                selectedColor === color && styles.colorButtonSelected,
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.customColorButton}>
          <Text style={styles.customColorIcon}>🎨</Text>
          <Text style={styles.customColorText}>Custom Color</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderTemplatesTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <SavedDrawingsManager
        onDrawingLoad={(drawingId) => {
          drawingCanvasRef.current?.load(drawingId);
        }}
        onSaveRequest={() => {
          drawingCanvasRef.current?.save();
        }}
      />
    </ScrollView>
  );

  const renderCameraTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cameraContent}>
          <View style={styles.cameraIcon}>
            <Text style={styles.cameraIconText}>📸</Text>
          </View>
          <Text style={styles.cameraTitle}>Turn Photos into Art!</Text>
          <Text style={styles.cameraSubtitle}>
            Upload a photo or take a new one to create your own coloring page
          </Text>

          <TouchableOpacity style={styles.cameraButton}>
            <Text style={styles.cameraButtonIcon}>📸</Text>
            <View style={styles.cameraButtonContent}>
              <Text style={styles.cameraButtonTitle}>Take Photo</Text>
              <Text style={styles.cameraButtonSubtitle}>Use your camera</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadButton}>
            <Text style={styles.uploadButtonIcon}>📁</Text>
            <View style={styles.uploadButtonContent}>
              <Text style={styles.uploadButtonTitle}>Upload Image</Text>
              <Text style={styles.uploadButtonSubtitle}>From your device</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.tipContainer}>
            <Text style={styles.tipTitle}>💡 Pro Tips:</Text>
            <Text style={styles.tipText}>• Use photos with clear outlines</Text>
            <Text style={styles.tipText}>• Simple objects work best</Text>
            <Text style={styles.tipText}>
              • Good lighting makes better coloring pages
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderAchievementsTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.achievementsHeader}>
        <Text style={styles.achievementsTitle}>Your Amazing Achievements!</Text>
        <Text style={styles.achievementsSubtitle}>
          Keep coloring to unlock more rewards
        </Text>
      </View>

      <View style={styles.achievementsGrid}>
        {achievements.map((achievement) => (
          <View
            key={achievement.id}
            style={[
              styles.achievementCard,
              achievement.unlocked
                ? styles.achievementUnlocked
                : styles.achievementLocked,
            ]}
          >
            <Text
              style={[
                styles.achievementIcon,
                !achievement.unlocked && styles.achievementIconLocked,
              ]}
            >
              {achievement.icon}
            </Text>
            <Text
              style={[
                styles.achievementName,
                achievement.unlocked
                  ? styles.achievementNameUnlocked
                  : styles.achievementNameLocked,
              ]}
            >
              {achievement.name}
            </Text>
            <View
              style={[
                styles.achievementBadge,
                achievement.unlocked
                  ? styles.achievementBadgeUnlocked
                  : styles.achievementBadgeLocked,
              ]}
            >
              <Text
                style={[
                  styles.achievementBadgeText,
                  achievement.unlocked
                    ? styles.achievementBadgeTextUnlocked
                    : styles.achievementBadgeTextLocked,
                ]}
              >
                {achievement.unlocked ? 'Unlocked!' : 'Locked'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🎨</Text>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Completed Artworks</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>⏱️</Text>
          <Text style={styles.statNumber}>2h 45m</Text>
          <Text style={styles.statLabel}>Time Spent Creating</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statEmoji}>🌈</Text>
          <Text style={styles.statNumber}>47</Text>
          <Text style={styles.statLabel}>Colors Used</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderBottomNav = () => (
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
          <Text
            style={[
              styles.navIcon,
              activeTab === tab.id && styles.navIconActive,
            ]}
          >
            {tab.icon}
          </Text>
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
  );

  const renderContent = () => {
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
      {renderHeader()}
      {renderContent()}
      {renderBottomNav()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3E8FF', // purple-50 equivalent
  },

  // Header Styles
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9D5FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoIcon: {
    fontSize: 20,
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  appSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadge: {
    backgroundColor: '#E0E7FF',
  },
  starIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  trophyIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  statsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B45309',
  },
  levelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4338CA',
  },
  progressSection: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  progressBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  progressBadgeText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },

  // Content Styles
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  toolsCard: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  colorsCard: {
    borderWidth: 1,
    borderColor: '#FBCFE8',
  },

  // Canvas Styles
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  canvasTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  zoomText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  canvasContainer: {
    position: 'relative',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
    borderRadius: 12,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  hint: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B45309',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  undoButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  redoButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },

  // Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },

  // Tools Grid
  toolsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  toolButton: {
    flex: 1,
    height: 64,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  toolIcon: {
    fontSize: 20,
  },
  toolLabel: {
    fontSize: 12,
    color: '#374151',
  },
  toolLabelSelected: {
    color: 'white',
    fontWeight: 'bold',
  },

  // Colors Grid
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  colorButton: {
    width: (screenWidth - 80) / 5,
    height: (screenWidth - 80) / 5,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  colorButtonSelected: {
    borderColor: '#374151',
    transform: [{ scale: 1.1 }],
  },
  customColorButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  customColorIcon: {
    fontSize: 16,
  },
  customColorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },

  // Templates
  templatesHeader: {
    marginBottom: 16,
  },
  templatesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  categoryButtonTextActive: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  templateCard: {
    width: (screenWidth - 48) / 2,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  templateImageContainer: {
    position: 'relative',
    backgroundColor: '#F3E8FF',
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateEmoji: {
    fontSize: 32,
  },
  completedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 4,
  },
  completedStar: {
    fontSize: 12,
    color: 'white',
  },
  templateName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  templateMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  difficultyEasy: {
    borderColor: '#86EFAC',
  },
  difficultyMedium: {
    borderColor: '#FDE047',
  },
  difficultyHard: {
    borderColor: '#FCA5A5',
  },
  difficultyText: {
    fontSize: 12,
  },
  difficultyTextEasy: {
    color: '#16A34A',
  },
  difficultyTextMedium: {
    color: '#CA8A04',
  },
  difficultyTextHard: {
    color: '#DC2626',
  },
  startButton: {
    backgroundColor: '#EC4899',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Camera Tab
  cameraContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cameraIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#3B82F6',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cameraIconText: {
    fontSize: 40,
  },
  cameraTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 8,
  },
  cameraSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  cameraButton: {
    width: '100%',
    height: 64,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cameraButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cameraButtonContent: {
    flex: 1,
  },
  cameraButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  cameraButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  uploadButton: {
    width: '100%',
    height: 64,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  uploadButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  uploadButtonContent: {
    flex: 1,
  },
  uploadButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  uploadButtonSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  tipContainer: {
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B45309',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#B45309',
    marginBottom: 4,
  },

  // Achievements
  achievementsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  achievementsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  achievementsSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: (screenWidth - 48) / 2,
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  achievementUnlocked: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  achievementLocked: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  achievementIconLocked: {
    opacity: 0.5,
  },
  achievementName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementNameUnlocked: {
    color: '#B45309',
  },
  achievementNameLocked: {
    color: '#6B7280',
  },
  achievementBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  achievementBadgeUnlocked: {
    backgroundColor: '#EAB308',
  },
  achievementBadgeLocked: {
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  achievementBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  achievementBadgeTextUnlocked: {
    color: 'white',
  },
  achievementBadgeTextLocked: {
    color: '#6B7280',
  },
  statsContainer: {
    gap: 16,
  },
  statCard: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  statEmoji: {
    fontSize: 24,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 2,
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E9D5FF',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 5,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  navButtonActive: {
    backgroundColor: '#F3E8FF',
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navIconActive: {
    // Active icon styling handled by individual tab colors
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
});
