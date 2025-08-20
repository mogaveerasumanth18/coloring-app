import React, { useRef, useState } from 'react';
import { SafeAreaView, View } from 'react-native';

import { BottomNavigation, ColorTab } from './color-tab-components';
import { PhotoTab } from './photo-tab';
import { RewardsTab } from './rewards-tab';
import { SAMPLE_TEMPLATES, type Template } from './template-data';
import { TemplatesTab } from './templates-tab';

export default function TabbedColoringApp() {
  const [selectedColor, setSelectedColor] = useState('#FF6B6B');
  const [selectedTool, setSelectedTool] = useState('brush');
  const [currentTemplate, setCurrentTemplate] = useState(SAMPLE_TEMPLATES[0]);
  const [activeTab, setActiveTab] = useState('Color');
  const [zoom, setZoom] = useState(1);
  const drawingCanvasRef = useRef<any>(null);

  const appState = {
    selectedColor,
    selectedTool,
    currentTemplate,
    zoom,
    drawingCanvasRef,
    setSelectedColor,
    setSelectedTool,
    setZoom,
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Color':
        return <ColorTab {...appState} />;
      case 'Templates':
        return (
          <TemplatesTab
            onSelectTemplate={(template: Template) => {
              setCurrentTemplate(template);
              setActiveTab('Color');
            }}
          />
        );
      case 'Photo':
        return <PhotoTab />;
      case 'Rewards':
        return <RewardsTab />;
      default:
        return <ColorTab {...appState} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>{renderContent()}</View>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainContent: {
    flex: 1,
  },
};
