import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

import { SAMPLE_TEMPLATES, type Template } from './template-data';

interface TemplatesTabProps {
  onSelectTemplate: (template: Template) => void;
}

export function TemplatesTab({ onSelectTemplate }: TemplatesTabProps) {
  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.templatesHeader}>
        <Text style={styles.templatesTitle}>Choose Your Adventure!</Text>
        <Text style={styles.templatesSubtitle}>
          Pick a fun template to color!
        </Text>
      </View>

      {/* Templates Grid */}
      <View style={styles.templatesGrid}>
        {SAMPLE_TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={() => onSelectTemplate(template)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: Template;
  onSelect: () => void;
}) {
  return (
    <View style={styles.templateCard}>
      <View style={styles.templatePreview}>
        <View style={styles.templateSvgContainer}>
          <SvgXml
            xml={template.svgData}
            width={80}
            height={80}
            style={styles.templateSvg}
          />
        </View>
        <TouchableOpacity style={styles.favoriteButton}>
          <Feather name="star" size={16} color="#22C55E" />
        </TouchableOpacity>
      </View>
      <Text style={styles.templateName}>{template.name}</Text>
      <TouchableOpacity style={styles.startColoringButton} onPress={onSelect}>
        <Text style={styles.startColoringButtonText}>Start Coloring! 😊</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    paddingBottom: 80,
  },
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
  templateSvgContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  templateSvg: {
    opacity: 0.8,
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
    marginBottom: 12,
    textAlign: 'center',
  },
  startColoringButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startColoringButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
