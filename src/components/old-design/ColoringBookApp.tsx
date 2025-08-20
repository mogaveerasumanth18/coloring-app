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
import { ImageUploader } from './ImageUploader';
import { SavedDrawingsManager } from './SavedDrawingsManager';

const { width: screenWidth } = Dimensions.get('window');

export default function ColoringBookApp() {
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedTool, setSelectedTool] = useState('brush');
  const [currentTemplate, setCurrentTemplate] = useState<any>({
    svgData: `<svg width="300" height="240" viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg">
        <path d="M150,40 L170,100 L230,100 L185,135 L200,195 L150,165 L100,195 L115,135 L70,100 L130,100 Z" 
              fill="none" stroke="#333" stroke-width="2"/>
      </svg>`,
    fileName: 'Star Shape',
  });
  const [activeTab, setActiveTab] = useState('color'); // 'color', 'templates', 'rewards'
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
            <Text style={styles.appSubtitle}>Let's create magic!</Text>
          </View>
        </View>
        <View style={styles.progressInfo}>
          <View style={styles.starBadge}>
            <Text style={styles.starText}>⭐ 1,250</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>🏆 Lv.5</Text>
          </View>
        </View>
      </View>

      {/* Canvas Section */}
      <View style={styles.canvasCard}>
        <View style={styles.canvasHeader}>
          <Text style={styles.canvasTitle}>
            {currentTemplate ? currentTemplate.fileName : 'Star Shape'}
          </Text>
          <View style={styles.canvasActions}>
            <View style={styles.completionIndicator}>
              <View style={styles.completionCircle}>
                <Text style={styles.completionPercentage}>100%</Text>
              </View>
              <Text style={styles.completionText}>🎯</Text>
            </View>
          </View>
        </View>

        <View style={styles.canvasWrapper}>
          {/* Zoom Controls - Positioned absolutely over canvas */}
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

          {/* Drawing Tools */}
          <View style={styles.drawingTools}>
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

          {/* Action Tools */}
          <View style={styles.actionTools}>
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
              templateSvg={currentTemplate?.svgData}
              onSave={(drawingData: any) => {
                console.log('Drawing saved:', drawingData);
              }}
            />
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
        <Text style={styles.templatesTitle}>🌟 Choose Your Canvas</Text>
        <Text style={styles.templatesSubtitle}>
          Pick a fun template to color!
        </Text>
      </View>

      <View style={styles.section}>
        <ImageUploader
          onImageUploaded={(svgData, fileName) => {
            setCurrentTemplate({ svgData, fileName });
            setActiveTab('color'); // Switch back to coloring tab
          }}
          onTemplateSelected={(templateData) => {
            setCurrentTemplate(templateData);
            setActiveTab('color'); // Switch back to coloring tab
          }}
        />
      </View>
    </ScrollView>
  );

  const renderRewardsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.rewardsHeader}>
        <Text style={styles.rewardsTitle}>🏆 Your Achievements</Text>
        <Text style={styles.rewardsSubtitle}>
          Keep coloring to unlock more!
        </Text>
      </View>

      <View style={styles.rewardsGrid}>
        <View style={styles.rewardCard}>
          <Text style={styles.rewardEmoji}>🌟</Text>
          <Text style={styles.rewardTitle}>First Drawing</Text>
          <Text style={styles.rewardStatus}>Unlocked!</Text>
        </View>

        <View style={styles.rewardCard}>
          <Text style={styles.rewardEmoji}>🎨</Text>
          <Text style={styles.rewardTitle}>Color Master</Text>
          <Text style={styles.rewardStatus}>Unlocked!</Text>
        </View>

        <View style={[styles.rewardCard, styles.lockedReward]}>
          <Text style={styles.rewardEmoji}>🦋</Text>
          <Text style={styles.rewardTitle}>Butterfly Expert</Text>
          <Text style={styles.rewardStatus}>2/5 drawings</Text>
        </View>

        <View style={[styles.rewardCard, styles.lockedReward]}>
          <Text style={styles.rewardEmoji}>🏅</Text>
          <Text style={styles.rewardTitle}>Daily Streak</Text>
          <Text style={styles.rewardStatus}>3/7 days</Text>
        </View>
      </View>

      <SavedDrawingsManager
        onDrawingLoad={(drawingId) => {
          drawingCanvasRef.current?.load(drawingId);
          setActiveTab('color');
        }}
        onSaveRequest={() => {
          drawingCanvasRef.current?.save();
        }}
      />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Content */}
      <View style={styles.mainContent}>
        {activeTab === 'color' && renderColorTab()}
        {activeTab === 'templates' && renderTemplatesTab()}
        {activeTab === 'rewards' && renderRewardsTab()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navTab, activeTab === 'color' && styles.activeNavTab]}
          onPress={() => setActiveTab('color')}
        >
          <View
            style={[
              styles.navIcon,
              activeTab === 'color' && styles.activeNavIcon,
            ]}
          >
            <Text
              style={[
                styles.navIconText,
                activeTab === 'color' && styles.activeNavIconText,
              ]}
            >
              ✏️
            </Text>
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'color' && styles.activeNavLabel,
            ]}
          >
            Color
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navTab,
            activeTab === 'templates' && styles.activeNavTab,
          ]}
          onPress={() => setActiveTab('templates')}
        >
          <View
            style={[
              styles.navIcon,
              activeTab === 'templates' && styles.activeNavIcon,
            ]}
          >
            <Text
              style={[
                styles.navIconText,
                activeTab === 'templates' && styles.activeNavIconText,
              ]}
            >
              📋
            </Text>
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'templates' && styles.activeNavLabel,
            ]}
          >
            Templates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navTab,
            activeTab === 'rewards' && styles.activeNavTab,
          ]}
          onPress={() => setActiveTab('rewards')}
        >
          <View
            style={[
              styles.navIcon,
              activeTab === 'rewards' && styles.activeNavIcon,
            ]}
          >
            <Text
              style={[
                styles.navIconText,
                activeTab === 'rewards' && styles.activeNavIconText,
              ]}
            >
              🏆
            </Text>
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'rewards' && styles.activeNavLabel,
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
    backgroundColor: '#F3E8FF', // Light purple background
  },
  mainContent: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingBottom: 20,
  },

  // App Header Styles
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F3E8FF',
  },
  appBranding: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#8B5CF6',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: 5,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  appIconText: {
    fontSize: 28,
  },
  appInfo: {
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textShadowColor: '#DDD6FE',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
    elevation: 3,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  starText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400E',
  },
  levelBadge: {
    backgroundColor: '#E0E7FF',
    borderColor: '#6366F1',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    elevation: 3,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  levelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3730A3',
  },

  // Canvas Styles
  canvasCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 4,
    borderColor: '#E879F9',
  },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 2,
    borderBottomColor: '#E879F9',
  },
  canvasTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textShadowColor: '#DDD6FE',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  canvasActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E879F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#E879F9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  completionPercentage: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  completionText: {
    fontSize: 20,
  },
  canvasAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E879F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  canvasActionText: {
    fontSize: 16,
  },
  zoomPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginHorizontal: 8,
  },

  // Canvas Wrapper and Controls
  canvasWrapper: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 10,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  zoomReset: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  zoomButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  zoomText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    minWidth: 40,
    textAlign: 'center',
  },

  // Drawing Tools
  drawingTools: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    zIndex: 10,
  },
  toolsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modernToolButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 60,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  activeModernTool: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  modernToolLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  activeModernToolLabel: {
    color: '#FFFFFF',
  },

  // Action Tools
  actionTools: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'column',
    gap: 8,
    zIndex: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minWidth: 90,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginLeft: 6,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    minWidth: 90,
  },
  saveLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  canvasContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  // Color Section
  colorSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#E879F9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#E879F9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
    textShadowColor: '#F3F4F6',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorButton: {
    width: (screenWidth - 120) / 6,
    height: (screenWidth - 120) / 6,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'transparent',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedColor: {
    borderColor: '#1F2937',
    borderWidth: 4,
    elevation: 6,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },

  // Templates Tab
  templatesHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
  },
  templatesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 8,
    textShadowColor: '#DDD6FE',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  templatesSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Rewards Tab
  rewardsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
  },
  rewardsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 8,
    textShadowColor: '#DDD6FE',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  rewardsSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  rewardCard: {
    width: (screenWidth - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#10B981',
  },
  lockedReward: {
    borderColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
    opacity: 0.7,
  },
  rewardEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 5,
  },
  rewardStatus: {
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
    fontWeight: '600',
  },

  // General Section
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#E879F9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#E879F9',
  },

  // Bottom Navigation
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 3,
    borderTopColor: '#E879F9',
    elevation: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavTab: {
    transform: [{ scale: 1.1 }],
  },
  navIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeNavIcon: {
    backgroundColor: '#8B5CF6',
    borderColor: '#E879F9',
    elevation: 6,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  navIconText: {
    fontSize: 20,
  },
  activeNavIconText: {
    fontSize: 22,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeNavLabel: {
    color: '#8B5CF6',
    fontWeight: 'bold',
    textShadowColor: '#DDD6FE',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
