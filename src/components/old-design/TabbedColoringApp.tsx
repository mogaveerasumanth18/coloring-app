import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
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

import { EnhancedCanvasColoring } from './EnhancedCanvasColoring';

const { width: screenWidth } = Dimensions.get('window');

// Template data for the templates tab
const SAMPLE_TEMPLATES = [
  {
    id: 'butterfly',
    name: 'Butterfly',
    category: 'Animals',
    difficulty: 'Easy',
    svgData: `<svg width="300" height="240" viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg">
        <path d="M150,120 Q130,100 110,90 Q90,80 80,100 Q85,120 110,130 Q130,140 150,120 Z" fill="none" stroke="#333" stroke-width="2"/>
        <path d="M150,120 Q170,100 190,90 Q210,80 220,100 Q215,120 190,130 Q170,140 150,120 Z" fill="none" stroke="#333" stroke-width="2"/>
        <path d="M150,120 Q130,140 110,150 Q90,160 80,140 Q85,120 110,110 Q130,100 150,120 Z" fill="none" stroke="#333" stroke-width="2"/>
        <path d="M150,120 Q170,140 190,150 Q210,160 220,140 Q215,120 190,110 Q170,100 150,120 Z" fill="none" stroke="#333" stroke-width="2"/>
        <path d="M150,80 L150,160" stroke="#333" stroke-width="2"/>
      </svg>`,
  },
  {
    id: 'car',
    name: 'Race Car',
    category: 'Vehicles',
    difficulty: 'Medium',
    svgData: `<svg width="300" height="240" viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg">
        <rect x="80" y="120" width="140" height="40" rx="5" fill="none" stroke="#333" stroke-width="2"/>
        <circle cx="100" cy="180" r="15" fill="none" stroke="#333" stroke-width="2"/>
        <circle cx="200" cy="180" r="15" fill="none" stroke="#333" stroke-width="2"/>
        <path d="M100,120 L120,100 L180,100 L200,120" fill="none" stroke="#333" stroke-width="2"/>
      </svg>`,
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    category: 'Nature',
    difficulty: 'Easy',
    svgData: `<svg width="300" height="240" viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg">
        <circle cx="150" cy="120" r="20" fill="none" stroke="#333" stroke-width="2"/>
        <path d="M150,100 Q140,80 150,60 Q160,80 150,100" fill="none" stroke="#333" stroke-width="2"/>
        <path d="M170,120 Q190,110 210,120 Q190,130 170,120" fill="none" stroke="#333" stroke-width="2"/>
        <path d="M150,140 Q160,160 150,180 Q140,160 150,140" fill="none" stroke="#333" stroke-width="2"/>
        <path d="M130,120 Q110,130 90,120 Q110,110 130,120" fill="none" stroke="#333" stroke-width="2"/>
        <path d="M150,180 L150,220" stroke="#333" stroke-width="2"/>
      </svg>`,
  },
  {
    id: 'castle',
    name: 'Castle',
    category: 'Nature',
    difficulty: 'Medium',
    svgData: `<svg width="300" height="240" viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg">
        <rect x="100" y="140" width="100" height="60" fill="none" stroke="#333" stroke-width="2"/>
        <rect x="90" y="120" width="20" height="80" fill="none" stroke="#333" stroke-width="2"/>
        <rect x="190" y="120" width="20" height="80" fill="none" stroke="#333" stroke-width="2"/>
        <rect x="140" y="100" width="20" height="100" fill="none" stroke="#333" stroke-width="2"/>
        <polygon points="100,120 110,100 120,120" fill="none" stroke="#333" stroke-width="2"/>
        <polygon points="180,120 190,100 200,120" fill="none" stroke="#333" stroke-width="2"/>
        <polygon points="140,100 150,80 160,100" fill="none" stroke="#333" stroke-width="2"/>
      </svg>`,
  },
];

export default function ColoringBookApp() {
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedTool, setSelectedTool] = useState('brush');
  const [currentTemplate, setCurrentTemplate] = useState(SAMPLE_TEMPLATES[0]);
  const [activeTab, setActiveTab] = useState('Color');
  const [templateFilter, setTemplateFilter] = useState('All');
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

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setZoom(1);

  const filteredTemplates = SAMPLE_TEMPLATES.filter((template) =>
    templateFilter === 'All' ? true : template.category === templateFilter
  );

  const renderColorTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* App Header */}
      <View style={styles.appHeader}>
        <View style={styles.appBranding}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>🎨</Text>
          </View>
          <View style={styles.appInfo}>
            <Text style={styles.appTitle}>ColorFun Kids</Text>
            <Text style={styles.appSubtitle}>Let&apos;s create magic!</Text>
          </View>
        </View>
      </View>

      {/* Canvas Section */}
      <View style={styles.canvasCard}>
        <View style={styles.canvasHeader}>
          <Text style={styles.canvasTitle}>{currentTemplate.name}</Text>
        </View>

        <View style={styles.canvasWrapper}>
          {/* Zoom Controls - Embedded in page */}
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
              <Feather name="minus" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.zoomReset}
              onPress={handleZoomReset}
            >
              <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
              <Feather name="plus" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View
            style={[styles.canvasContainer, { transform: [{ scale: zoom }] }]}
          >
            <EnhancedCanvasColoring
              ref={drawingCanvasRef}
              selectedColor={selectedColor}
              selectedTool={selectedTool}
              brushWidth={5}
              canvasWidth={Math.min(screenWidth - 60, 300)}
              canvasHeight={Math.min(screenWidth - 60, 300)}
              templateSvg={currentTemplate.svgData}
              onSave={(drawingData: any) => {
                console.log('Drawing saved:', drawingData);
              }}
            />
          </View>

          {/* Drawing Tools - Embedded in page below canvas */}
          <View style={styles.drawingToolsSection}>
            <View style={styles.toolsHeader}>
              <Feather name="edit-3" size={16} color="#64748B" />
              <Text style={styles.toolsTitle}>Drawing Tools</Text>
            </View>

            <View style={styles.toolsGrid}>
              <TouchableOpacity
                style={[
                  styles.modernToolButton,
                  selectedTool === 'brush' && styles.activeModernTool,
                ]}
                onPress={() => setSelectedTool('brush')}
              >
                <Feather
                  name="edit-2"
                  size={20}
                  color={selectedTool === 'brush' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.modernToolLabel,
                    selectedTool === 'brush' && styles.activeModernToolLabel,
                  ]}
                >
                  Brush
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modernToolButton,
                  selectedTool === 'bucket' && styles.activeModernTool,
                ]}
                onPress={() => setSelectedTool('bucket')}
              >
                <MaterialIcons
                  name="format-color-fill"
                  size={20}
                  color={selectedTool === 'bucket' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.modernToolLabel,
                    selectedTool === 'bucket' && styles.activeModernToolLabel,
                  ]}
                >
                  Fill
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modernToolButton,
                  selectedTool === 'eraser' && styles.activeModernTool,
                ]}
                onPress={() => setSelectedTool('eraser')}
              >
                <MaterialIcons
                  name="auto-fix-off"
                  size={20}
                  color={selectedTool === 'eraser' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.modernToolLabel,
                    selectedTool === 'eraser' && styles.activeModernToolLabel,
                  ]}
                >
                  Eraser
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modernToolButton}
                onPress={() => setSelectedTool('blend')}
              >
                <MaterialIcons name="blur-on" size={20} color="#64748B" />
                <Text style={styles.modernToolLabel}>Blend</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Tools - Embedded in page */}
          <View style={styles.actionToolsSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => drawingCanvasRef.current?.undo()}
            >
              <Ionicons name="arrow-undo" size={18} color="#64748B" />
              <Text style={styles.actionLabel}>Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => drawingCanvasRef.current?.redo()}
            >
              <Ionicons name="arrow-redo" size={18} color="#64748B" />
              <Text style={styles.actionLabel}>Redo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => drawingCanvasRef.current?.save()}
            >
              <Feather name="download" size={18} color="#FFFFFF" />
              <Text style={styles.saveLabel}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Color Palette */}
      <View style={styles.colorSection}>
        <Text style={styles.sectionTitle}>🎨 Colors</Text>
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
      <View style={styles.templatesHeader}>
        <Text style={styles.templatesTitle}>Choose Your Adventure!</Text>
        <Text style={styles.templatesSubtitle}>
          Pick a fun template to color!
        </Text>
      </View>

      {/* Category Filter */}
      <View style={styles.categorySection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryFilter}>
            {['All', 'Animals', 'Vehicles', 'Nature'].map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  templateFilter === category && styles.activeCategoryButton,
                ]}
                onPress={() => setTemplateFilter(category)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    templateFilter === category &&
                      styles.activeCategoryButtonText,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Templates Grid */}
      <View style={styles.templatesGrid}>
        {filteredTemplates.map((template) => (
          <View key={template.id} style={styles.templateCard}>
            <View style={styles.templatePreview}>
              <View style={styles.templateIcon}>
                <Text style={styles.templateEmoji}>
                  {template.category === 'Animals'
                    ? '🦋'
                    : template.category === 'Vehicles'
                      ? '🏎️'
                      : '🌻'}
                </Text>
              </View>
              <TouchableOpacity style={styles.favoriteButton}>
                <Feather name="star" size={16} color="#22C55E" />
              </TouchableOpacity>
            </View>
            <Text style={styles.templateName}>{template.name}</Text>
            <View style={styles.templateMeta}>
              <View style={styles.templateCategory}>
                <Text style={styles.templateCategoryText}>
                  {template.category}
                </Text>
              </View>
              <View
                style={[
                  styles.templateDifficulty,
                  {
                    backgroundColor:
                      template.difficulty === 'Easy' ? '#22C55E' : '#F59E0B',
                  },
                ]}
              >
                <Text style={styles.templateDifficultyText}>
                  {template.difficulty}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.startColoringButton}
              onPress={() => {
                setCurrentTemplate(template);
                setActiveTab('Color');
              }}
            >
              <Text style={styles.startColoringButtonText}>
                Start Coloring! 😊
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderPhotoTab = () => (
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

  const renderRewardsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.rewardsHeader}>
        <Text style={styles.rewardsTitle}>Your Amazing Achievements!</Text>
        <Text style={styles.rewardsSubtitle}>
          Keep coloring to unlock more rewards
        </Text>
      </View>

      {/* Achievement Cards */}
      <View style={styles.achievementGrid}>
        <View style={styles.achievementCard}>
          <Text style={styles.achievementIcon}>🎨</Text>
          <Text style={styles.achievementName}>First Masterpiece</Text>
          <View style={styles.achievementBadge}>
            <Text style={styles.achievementBadgeText}>Unlocked</Text>
          </View>
        </View>

        <View style={styles.achievementCard}>
          <Text style={styles.achievementIcon}>🌈</Text>
          <Text style={styles.achievementName}>Color Explorer</Text>
          <View style={styles.achievementBadge}>
            <Text style={styles.achievementBadgeText}>Unlocked</Text>
          </View>
        </View>

        <View style={[styles.achievementCard, styles.lockedAchievement]}>
          <Text style={styles.achievementIcon}>⚡</Text>
          <Text style={styles.achievementName}>Speed Artist</Text>
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedBadgeText}>Locked</Text>
          </View>
        </View>

        <View style={[styles.achievementCard, styles.lockedAchievement]}>
          <Text style={styles.achievementIcon}>🎯</Text>
          <Text style={styles.achievementName}>Perfect Fill</Text>
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedBadgeText}>Locked</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🎨</Text>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Completed Artworks</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏱️</Text>
          <Text style={styles.statNumber}>2h 45m</Text>
          <Text style={styles.statLabel}>Time Spent Creating</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🌈</Text>
          <Text style={styles.statNumber}>47</Text>
          <Text style={styles.statLabel}>Colors Used</Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Content */}
      <View style={styles.mainContent}>
        {activeTab === 'Color' && renderColorTab()}
        {activeTab === 'Templates' && renderTemplatesTab()}
        {activeTab === 'Photo' && renderPhotoTab()}
        {activeTab === 'Rewards' && renderRewardsTab()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'Color' && styles.activeNavTab]}
          onPress={() => setActiveTab('Color')}
        >
          <View
            style={[
              styles.navIcon,
              activeTab === 'Color' && styles.activeNavIcon,
            ]}
          >
            <Feather
              name="edit"
              size={20}
              color={activeTab === 'Color' ? '#3B82F6' : '#9CA3AF'}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'Color' && styles.activeNavLabel,
            ]}
          >
            Color
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navTab,
            activeTab === 'Templates' && styles.activeNavTab,
          ]}
          onPress={() => setActiveTab('Templates')}
        >
          <View
            style={[
              styles.navIcon,
              activeTab === 'Templates' && styles.activeNavIcon,
            ]}
          >
            <MaterialIcons
              name="dashboard"
              size={20}
              color={activeTab === 'Templates' ? '#3B82F6' : '#9CA3AF'}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'Templates' && styles.activeNavLabel,
            ]}
          >
            Templates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTab, activeTab === 'Photo' && styles.activeNavTab]}
          onPress={() => setActiveTab('Photo')}
        >
          <View
            style={[
              styles.navIcon,
              activeTab === 'Photo' && styles.activeNavIcon,
            ]}
          >
            <MaterialIcons
              name="photo-camera"
              size={20}
              color={activeTab === 'Photo' ? '#3B82F6' : '#9CA3AF'}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'Photo' && styles.activeNavLabel,
            ]}
          >
            Photo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navTab,
            activeTab === 'Rewards' && styles.activeNavTab,
          ]}
          onPress={() => setActiveTab('Rewards')}
        >
          <View
            style={[
              styles.navIcon,
              activeTab === 'Rewards' && styles.activeNavIcon,
            ]}
          >
            <MaterialIcons
              name="emoji-events"
              size={20}
              color={activeTab === 'Rewards' ? '#3B82F6' : '#9CA3AF'}
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'Rewards' && styles.activeNavLabel,
            ]}
          >
            Rewards
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainContent: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingBottom: 80, // Space for bottom navigation
  },

  // App Header
  appHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  appBranding: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appIconText: {
    fontSize: 24,
  },
  appInfo: {
    flex: 1,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },

  // Canvas Section
  canvasCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  canvasHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  canvasTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  canvasWrapper: {
    alignItems: 'center',
  },

  // Zoom Controls - Embedded
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  zoomButton: {
    backgroundColor: '#3B82F6',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomReset: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  canvasContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Drawing Tools - Embedded
  drawingToolsSection: {
    marginTop: 20,
    width: '100%',
  },
  toolsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  toolsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modernToolButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeModernTool: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  modernToolLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 4,
  },
  activeModernToolLabel: {
    color: '#FFFFFF',
  },

  // Action Tools - Embedded
  actionToolsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginLeft: 6,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  saveLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 6,
  },

  // Color Section
  colorSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedColor: {
    borderColor: '#1E293B',
    borderWidth: 3,
    transform: [{ scale: 1.1 }],
  },

  // Templates Tab
  templatesHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  templatesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  templatesSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },

  categorySection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryFilter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeCategoryButton: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeCategoryButtonText: {
    color: '#FFFFFF',
  },

  templatesGrid: {
    padding: 16,
    gap: 16,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  templatePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#F1F5F9',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateEmoji: {
    fontSize: 28,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  templateMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  templateCategory: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  templateCategoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
  },
  templateDifficulty: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  templateDifficultyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  startColoringButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startColoringButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Photo Tab
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

  // Rewards Tab
  rewardsHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  rewardsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  rewardsSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },

  achievementGrid: {
    padding: 16,
    gap: 16,
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lockedAchievement: {
    opacity: 0.6,
  },
  achievementIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  achievementBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  achievementBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  lockedBadge: {
    backgroundColor: '#9CA3AF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lockedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  statsSection: {
    padding: 16,
    gap: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },

  // Bottom Navigation
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavTab: {
    backgroundColor: 'transparent',
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeNavIcon: {
    backgroundColor: '#EFF6FF',
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  activeNavLabel: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});
