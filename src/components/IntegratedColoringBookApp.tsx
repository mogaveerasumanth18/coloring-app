import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { PngTemplateService } from '../services/PngTemplateService';
import { ImageUploaderEnhanced } from './ImageUploaderEnhanced';
import { WorkingColoringCanvas } from './WorkingColoringCanvas';

const { width: screenWidth } = Dimensions.get('window');

export default function IntegratedColoringBookApp({
  compact = false,
}: {
  compact?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedTool, setSelectedTool] = useState<
    'brush' | 'bucket' | 'eraser'
  >('bucket');
  const [currentTemplate, setCurrentTemplate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'color'>(
    'templates'
  );
  const [zoom, setZoom] = useState(1);
  const bitmapCanvasRef = useRef<any>(null);

  useEffect(() => {
    const loadDefaultTemplate = async () => {
      try {
        await PngTemplateService.testAssetLoading();
        await PngTemplateService.initialize();
        const allTemplates = await PngTemplateService.getAllTemplates();
        if (allTemplates.length > 0) {
          const defaultTemplate = allTemplates[0];
          const pngUri = await PngTemplateService.downloadTemplate(
            defaultTemplate.id
          );
          setCurrentTemplate({
            bitmapUri: pngUri,
            fileName: defaultTemplate.title,
            width: defaultTemplate.width,
            height: defaultTemplate.height,
            type: 'png',
          });
          setActiveTab('color');
        }
      } catch (error) {
        console.error('Failed to load default template:', error);
        setCurrentTemplate({
          bitmapUri: null,
          fileName: 'Sample Template',
          width: 600,
          height: 480,
          type: 'png',
        });
      }
    };
    loadDefaultTemplate();
  }, []);

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

  const handleBitmapTemplateSelected = (
    bitmapUri: string,
    fileName: string
  ) => {
    if (!bitmapUri || bitmapUri === 'null' || bitmapUri === 'undefined') {
      Alert.alert(
        'Error',
        'Invalid template selected. Please try another template.'
      );
      return;
    }
    setCurrentTemplate({
      svgData: null,
      fileName,
      bitmapUri,
      width: 600,
      height: 480,
      type: 'png',
    });
    setActiveTab('color');
  };

  const renderColorTab = () => (
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}
    >
      {/* Header */}
      {compact ? (
        <View style={[styles.appHeader, { paddingVertical: 12 }]}>
          <View style={styles.appBranding}>
            <View style={styles.appIcon}>
              <Text style={styles.appIconText}>🎨</Text>
            </View>
            <View style={styles.appInfo}>
              <Text style={styles.appTitle}>ColorFun</Text>
              <Text style={styles.appSubtitle}>Tap to fill or draw</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.appHeader}>
          <View style={styles.appBranding}>
            <View style={styles.appIcon}>
              <Text style={styles.appIconText}>🎨</Text>
            </View>
            <View style={styles.appInfo}>
              <Text style={styles.appTitle}>ColorFun Kids</Text>
              <Text style={styles.appSubtitle}>Let's create magic</Text>
            </View>
          </View>
        </View>
      )}

      {/* Canvas Section */}
      <View style={styles.canvasCard}>
        <View style={styles.canvasHeader}>
          <Text style={styles.canvasTitle}>
            {currentTemplate ? currentTemplate.fileName : 'Template'}
          </Text>
          <View style={styles.canvasActions}>
            <View style={styles.completionIndicator}>
              <View style={styles.completionCircle}>
                <Text style={styles.completionPercentage}>🚀</Text>
              </View>
            </View>
          </View>
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

          {/* Drawing Tools */}
          {compact ? (
            <View
              style={[styles.drawingTools, { padding: 10, marginBottom: 10 }]}
            >
              <View style={[styles.toolsGrid, { gap: 6 }]}>
                <TouchableOpacity
                  style={[
                    styles.modernToolButton,
                    selectedTool === 'brush' && styles.activeModernTool,
                  ]}
                  onPress={() => setSelectedTool('brush')}
                >
                  <Feather
                    name="edit-2"
                    size={18}
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
                    size={18}
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
                    size={18}
                    color={selectedTool === 'eraser' ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.modernToolLabel,
                      selectedTool === 'eraser' && styles.activeModernToolLabel,
                    ]}
                  >
                    Erase
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.drawingTools}>
              <View style={styles.toolsHeader}>
                <Feather name="edit-3" size={16} color="#64748B" />
                <Text style={styles.toolsTitle}>Drawing Tools</Text>
              </View>
              <View style={styles.toolsGrid} />
            </View>
          )}

          {/* Action Tools */}
          <View style={styles.actionTools}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => bitmapCanvasRef.current?.undo?.()}
            >
              <Ionicons name="arrow-undo" size={18} color="#64748B" />
              <Text style={styles.actionLabel}>Undo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => bitmapCanvasRef.current?.redo?.()}
            >
              <Ionicons name="arrow-redo" size={18} color="#64748B" />
              <Text style={styles.actionLabel}>Redo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => bitmapCanvasRef.current?.save?.()}
            >
              <Feather name="download" size={18} color="#FFFFFF" />
              <Text style={styles.saveLabel}>Save</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[styles.canvasContainer, { transform: [{ scale: zoom }] }]}
          >
            {currentTemplate?.bitmapUri ? (
              <WorkingColoringCanvas
                templateUri={currentTemplate.bitmapUri}
                selectedColor={selectedColor}
                selectedTool={selectedTool}
                onColoringChange={(imageData) => {
                  console.log(
                    '🎨 Coloring changed, image data length:',
                    imageData.length
                  );
                }}
              />
            ) : (
              <View style={styles.emptyCanvas}>
                <Text style={styles.emptyCanvasText}>
                  Select a template to start coloring! 🎨
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Color Palette */}
      <View
        style={[
          styles.colorSection,
          compact && { paddingVertical: 12, paddingHorizontal: 16 },
        ]}
      >
        <Text style={styles.sectionTitle}>Colors</Text>
        <View style={styles.colorGrid}>
          {colors.map((color) => (
            <TouchableOpacity
              key={color}
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
    <ScrollView
      style={styles.tabContent}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}
    >
      <View style={styles.templatesHeader}>
        <Text style={styles.templatesTitle}>Choose your canvas</Text>
        <Text style={styles.templatesSubtitle}>
          Pick a fun template to color!
        </Text>
      </View>
      <View style={styles.templateModeInfo}>
        <Text style={styles.templateModeText}>
          Professional coloring templates ready to color!
        </Text>
      </View>
      <View style={styles.section}>
        <ImageUploaderEnhanced
          onBitmapTemplateSelected={handleBitmapTemplateSelected}
          onImageUploaded={(bitmapUri, fileName) =>
            handleBitmapTemplateSelected(bitmapUri, fileName)
          }
          onTemplateSelected={(templateData) => {
            if (templateData.bitmapUri)
              handleBitmapTemplateSelected(
                templateData.bitmapUri,
                templateData.fileName
              );
          }}
        />
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Content */}
      <View style={styles.mainContent}>
        {activeTab === 'color' && renderColorTab()}
        {activeTab === 'templates' && renderTemplatesTab()}
      </View>

      {/* Bottom Navigation (notch/punch-hole safe) */}
      <View
        style={[
          styles.bottomNavigation,
          { paddingBottom: Math.max(12, 12 + insets.bottom) },
        ]}
      >
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
    paddingHorizontal: 20,
  },

  templateModeInfo: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderColor: '#0EA5E9',
    borderWidth: 1,
  },
  templateModeText: {
    fontSize: 14,
    color: '#0F172A',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },

  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  appBranding: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIconText: {
    fontSize: 20,
  },
  appInfo: {
    flex: 1,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  progressInfo: {
    flexDirection: 'row',
    gap: 8,
  },
  canvasCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  canvasTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  canvasActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completionIndicator: {
    alignItems: 'center',
  },
  completionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionPercentage: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completionText: {
    fontSize: 10,
    marginTop: 2,
  },
  canvasWrapper: {
    padding: 20,
    position: 'relative',
  },
  canvasContainer: {
    alignSelf: 'center',
    marginVertical: 20,
  },
  zoomControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 20,
    zIndex: 10,
  },
  zoomButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    margin: 2,
  },
  zoomReset: {
    paddingHorizontal: 12,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  drawingTools: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  toolsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
  toolsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  modernToolButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  activeModernTool: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  modernToolLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  activeModernToolLabel: {
    color: '#FFFFFF',
  },
  actionTools: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  saveLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 4,
  },
  colorSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#1E293B',
    transform: [{ scale: 1.1 }],
  },
  templatesHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  templatesTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  templatesSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavTab: {},
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeNavIcon: {
    backgroundColor: '#3B82F6',
  },
  navIconText: {
    fontSize: 18,
  },
  activeNavIconText: {},
  navLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeNavLabel: {
    color: '#3B82F6',
  },
  emptyCanvas: {
    minHeight: 220,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  emptyCanvasText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
  },
});
