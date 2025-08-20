import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { EnhancedCanvasColoring } from './old-design/EnhancedCanvasColoring';

const { width: screenWidth } = Dimensions.get('window');

interface AppState {
  selectedColor: string;
  selectedTool: string;
  currentTemplate: any;
  zoom: number;
  drawingCanvasRef: React.RefObject<any>;
  setSelectedColor: (color: string) => void;
  setSelectedTool: (tool: string) => void;
  setZoom: (zoom: number) => void;
}

export function ColorTab({
  selectedColor,
  selectedTool,
  currentTemplate,
  zoom,
  drawingCanvasRef,
  setSelectedColor,
  setSelectedTool,
  setZoom,
}: AppState) {
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

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.25, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.25, 0.5));
  const handleZoomReset = () => setZoom(1);

  return (
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
          {/* Zoom Controls */}
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

          <DrawingToolsSection
            selectedTool={selectedTool}
            onToolSelect={setSelectedTool}
          />

          <ActionToolsSection drawingCanvasRef={drawingCanvasRef} />
        </View>
      </View>

      {/* Color Palette */}
      <ColorPalette
        colors={colors}
        selectedColor={selectedColor}
        onColorSelect={setSelectedColor}
      />
    </ScrollView>
  );
}

// Drawing Tools Section Component
function DrawingToolsSection({
  selectedTool,
  onToolSelect,
}: {
  selectedTool: string;
  onToolSelect: (tool: string) => void;
}) {
  return (
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
          onPress={() => onToolSelect('brush')}
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
          onPress={() => onToolSelect('bucket')}
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
          onPress={() => onToolSelect('eraser')}
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
          onPress={() => onToolSelect('blend')}
        >
          <MaterialIcons name="blur-on" size={20} color="#64748B" />
          <Text style={styles.modernToolLabel}>Blend</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Action Tools Section Component
function ActionToolsSection({
  drawingCanvasRef,
}: {
  drawingCanvasRef: React.RefObject<any>;
}) {
  return (
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
  );
}

// Color Palette Component
function ColorPalette({
  colors,
  selectedColor,
  onColorSelect,
}: {
  colors: string[];
  selectedColor: string;
  onColorSelect: (color: string) => void;
}) {
  return (
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
            onPress={() => onColorSelect(color)}
          />
        ))}
      </View>
    </View>
  );
}

// Bottom Navigation Component
export function BottomNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = [
    { id: 'Color', icon: 'edit', label: 'Color' },
    { id: 'Templates', icon: 'dashboard', label: 'Templates' },
    { id: 'Photo', icon: 'photo-camera', label: 'Photo' },
    { id: 'Rewards', icon: 'emoji-events', label: 'Rewards' },
  ];

  return (
    <View style={styles.bottomNavigation}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[styles.navTab, activeTab === tab.id && styles.activeNavTab]}
          onPress={() => onTabChange(tab.id)}
        >
          <View
            style={[
              styles.navIcon,
              activeTab === tab.id && styles.activeNavIcon,
            ]}
          >
            {tab.id === 'Color' ? (
              <Feather
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.id ? '#3B82F6' : '#9CA3AF'}
              />
            ) : (
              <MaterialIcons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.id ? '#3B82F6' : '#9CA3AF'}
              />
            )}
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === tab.id && styles.activeNavLabel,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    paddingBottom: 80,
  },
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
