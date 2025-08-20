import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PngTemplate } from '../services/PngTemplateService';
import { PngTemplateService } from '../services/PngTemplateService';

export const PngAssetTest: React.FC = () => {
  const [templates, setTemplates] = useState<PngTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        console.log('Loading PNG templates for testing...');
        const allTemplates = await PngTemplateService.getAllTemplates();
        console.log(`Loaded ${allTemplates.length} templates`);
        setTemplates(allTemplates.slice(0, 3)); // Just test first 3
        setLoading(false);
      } catch (err) {
        console.error('Error loading templates:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    loadTemplates();
  }, []);

  const testDownload = async (templateId: string) => {
    try {
      const uri = await PngTemplateService.downloadTemplate(templateId);
      Alert.alert('Download Success', `URI: ${uri}`);
    } catch (err) {
      Alert.alert(
        'Download Error',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading PNG templates...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        PNG Asset Test ({templates.length} templates)
      </Text>
      {templates.map((template) => (
        <View key={template.id} style={styles.templateContainer}>
          <Text style={styles.templateTitle}>{template.title}</Text>
          <Text style={styles.templateInfo}>
            ID: {template.id} | Size: {template.width}x{template.height}
          </Text>
          <Text style={styles.uriText}>URI: {template.pngUri}</Text>
          <Image
            source={{ uri: template.pngUri }}
            style={styles.image}
            onLoad={() => console.log(`Image loaded: ${template.id}`)}
            onError={(error) => {
              console.error(
                `Image load error for ${template.id}:`,
                error.nativeEvent.error
              );
              Alert.alert(
                'Image Error',
                `Failed to load ${template.id}: ${error.nativeEvent.error}`
              );
            }}
          />
          <Text
            style={styles.testButton}
            onPress={() => testDownload(template.id)}
          >
            Test Download
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: 'red',
  },
  templateContainer: {
    marginBottom: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  templateInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  uriText: {
    fontSize: 10,
    color: '#999',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  image: {
    width: 150,
    height: 120,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  testButton: {
    fontSize: 14,
    color: 'blue',
    textAlign: 'center',
    padding: 8,
    backgroundColor: '#e6f3ff',
    borderRadius: 4,
  },
});
