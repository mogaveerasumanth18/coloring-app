import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SHAPE_TEMPLATES } from '../data/shapeTemplates';
import type { ShapeTemplate } from '../types/shapes';

interface TemplateSelectorProps {
  selectedTemplate: ShapeTemplate;
  onTemplateSelect: (template: ShapeTemplate) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateSelect,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a Shape to Color</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {SHAPE_TEMPLATES.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={[
              styles.templateCard,
              selectedTemplate.id === template.id && styles.selectedCard,
            ]}
            onPress={() => onTemplateSelect(template)}
          >
            <View style={styles.templatePreview}>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateInfo}>
                {template.regions.length} region
                {template.regions.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  scrollView: {
    paddingHorizontal: 10,
  },
  templateCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginHorizontal: 5,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 100,
  },
  selectedCard: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  templatePreview: {
    alignItems: 'center',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  templateInfo: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
