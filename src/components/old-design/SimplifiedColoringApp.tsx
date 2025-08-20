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
import { SvgXml } from 'react-native-svg';

import { LayeredColoringCanvas } from './LayeredColoringCanvas';
import { BitmapColoringCanvas } from './BitmapColoringCanvas';
import { SAMPLE_TEMPLATES, type Template } from './template-data';
import { PREMIUM_TEMPLATES, type ColoringTemplate, ALL_TEMPLATES } from './premium-templates';

const { width: screenWidth } = Dimensions.get('window');

export default function SimplifiedColoringApp() {
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedTool, setSelectedTool] = useState('brush');
  const [currentTemplate, setCurrentTemplate] = useState<Template>(
    SAMPLE_TEMPLATES[0]
  ); // Use first template by default
  const [zoom, setZoom] = useState(1);
  const [useBitmapCanvas, setUseBitmapCanvas] = useState(true); // Toggle between canvas types
  const canvasRef = useRef<any>(null);

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Simplified Header - No Points/Stars */}
        <View style={styles.simpleHeader}>
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
            <Text style={styles.canvasTitle}>
              {currentTemplate ? currentTemplate.fileName : 'Choose Template'}
            </Text>
            <TouchableOpacity 
              style={styles.canvasToggle}
              onPress={() => setUseBitmapCanvas(!useBitmapCanvas)}
            >
              <Text style={styles.canvasToggleText}>
                {useBitmapCanvas ? 'Bitmap' : 'Vector'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.canvasWrapper}>
            <View
              style={[styles.canvasContainer, { transform: [{ scale: zoom }] }]}
            >
              {useBitmapCanvas ? (
                <BitmapColoringCanvas
                  template={currentTemplate}
                  selectedColor={selectedColor}
                  selectedTool={selectedTool === 'bucket' ? 'bucket' : 'brush'}
                  brushWidth={5}
                  canvasWidth={Math.min(screenWidth - 60, 300)}
                  canvasHeight={Math.min(screenWidth - 60, 300)}
                  onSave={(uri: string) => {
                    console.log('Bitmap drawing saved:', uri);
                  }}
                />
              ) : (
                <LayeredColoringCanvas
                  ref={canvasRef}
                  template={currentTemplate}
                  selectedColor={selectedColor}
                  selectedTool={selectedTool}
                  brushWidth={5}
                  canvasWidth={Math.min(screenWidth - 60, 300)}
                  canvasHeight={Math.min(screenWidth - 60, 300)}
                  onSave={(drawingData: any) => {
                    console.log('Vector drawing saved:', drawingData);
                  }}
                />
              )}
            </View>
          </View>
        </View>

        {/* Template Selection */}
        <View style={styles.templateSection}>
          <Text style={styles.sectionTitle}>🎨 Choose Template</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.templateGrid}>
              {/* Basic Templates */}
              <Text style={styles.categoryTitle}>Basic</Text>
              {SAMPLE_TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.templateButton,
                    currentTemplate.id === template.id &&
                      styles.selectedTemplate,
                  ]}
                  onPress={() => setCurrentTemplate(template)}
                >
                  <View style={styles.templatePreview}>
                    <SvgXml xml={template.svgData} width={40} height={40} />
                  </View>
                  <Text style={styles.templateName}>{template.name}</Text>
                </TouchableOpacity>
              ))}
              
              {/* Premium Templates */}
              <Text style={styles.categoryTitle}>Premium</Text>
              {PREMIUM_TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.templateButton,
                    currentTemplate.id === template.id &&
                      styles.selectedTemplate,
                    styles.premiumTemplate,
                  ]}
                  onPress={() => setCurrentTemplate({
                    id: template.id,
                    name: template.name,
                    fileName: template.fileName,
                    svgData: template.svgData,
                  })}
                >
                  <View style={styles.templatePreview}>
                    <SvgXml xml={template.svgData} width={40} height={40} />
                  </View>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.difficultyBadge}>{template.difficulty}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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

      {/* Zoom Controls - Outside Canvas */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
          <Feather name="minus" size={16} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomReset} onPress={handleZoomReset}>
          <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
          <Feather name="plus" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Drawing Tools - Outside Canvas */}
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

      {/* Action Tools - Outside Canvas */}
      <View style={styles.actionTools}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => canvasRef.current?.undo()}
        >
          <Ionicons name="arrow-undo" size={18} color="#64748B" />
          <Text style={styles.actionLabel}>Undo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => canvasRef.current?.redo()}
        >
          <Ionicons name="arrow-redo" size={18} color="#64748B" />
          <Text style={styles.actionLabel}>Redo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => canvasRef.current?.save()}
        >
          <Feather name="download" size={18} color="#FFFFFF" />
          <Text style={styles.saveLabel}>Save</Text>
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
  content: {
    flex: 1,
    paddingBottom: 20,
  },

  // Simplified Header Styles
  simpleHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
  },
  appBranding: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 60,
    height: 60,
    backgroundColor: '#3B82F6',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    elevation: 5,
    shadowColor: '#3B82F6',
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
    color: '#1F2937',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },

  // Canvas Styles
  canvasCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  canvasTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  canvasWrapper: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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

  // Zoom Controls - Outside Canvas
  zoomControls: {
    position: 'absolute',
    top: 100,
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
  zoomText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    minWidth: 40,
    textAlign: 'center',
  },

  // Drawing Tools - Outside Canvas
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

  // Action Tools - Outside Canvas
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

  // Template Selection Styles
  templateSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  templateGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  templateButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
  },
  selectedTemplate: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  templatePreview: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  templateName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginRight: 12,
    marginLeft: 4,
    alignSelf: 'center',
  },
  premiumTemplate: {
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  difficultyBadge: {
    fontSize: 9,
    fontWeight: '600',
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  canvasToggle: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  canvasToggleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
