import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { PngTemplateService } from '../services/PngTemplateService';

export const TemplateTestScreen: React.FC = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testTemplates = async () => {
      try {
        console.log('🧪 Starting template test...');

        // Initialize service
        await PngTemplateService.initialize();
        console.log('✅ Service initialized');

        // Get all templates
        const allTemplates = await PngTemplateService.getAllTemplates();
        console.log(`📋 Found ${allTemplates.length} templates`);

        // Test each template
        for (const template of allTemplates.slice(0, 3)) {
          // Test first 3 only
          console.log(`🔍 Testing template: ${template.id}`);
          try {
            const uri = await PngTemplateService.downloadTemplate(template.id);
            console.log(`✅ Template ${template.id} URI: ${uri}`);
            template.testStatus = 'success';
            template.testUri = uri;
          } catch (err) {
            console.error(`❌ Template ${template.id} failed:`, err);
            template.testStatus = 'failed';
            template.testError =
              err instanceof Error ? err.message : 'Unknown error';
          }
        }

        setTemplates(allTemplates.slice(0, 3));
        setLoading(false);
      } catch (err) {
        console.error('❌ Template test failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    testTemplates();
  }, []);

  const testImageLoad = (template: any) => {
    if (!template.testUri) return;

    Alert.alert(
      `Test ${template.title}`,
      `URI: ${template.testUri}\nType: ${typeof template.testUri}\nStatus: ${template.testStatus}`,
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>🧪 Testing PNG templates...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>❌ Test failed: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🧪 PNG Template Test Results</Text>

      {templates.map((template) => (
        <TouchableOpacity
          key={template.id}
          style={[
            styles.templateCard,
            {
              backgroundColor:
                template.testStatus === 'success' ? '#e8f5e8' : '#ffe8e8',
            },
          ]}
          onPress={() => testImageLoad(template)}
        >
          <Text style={styles.templateTitle}>{template.title}</Text>
          <Text style={styles.templateId}>ID: {template.id}</Text>
          <Text style={styles.templateStatus}>
            Status: {template.testStatus || 'unknown'}
          </Text>

          {template.testUri && (
            <>
              <Text style={styles.templateUri} numberOfLines={2}>
                URI: {template.testUri}
              </Text>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: template.testUri }}
                  style={styles.testImage}
                  onLoad={() => console.log(`✅ Image loaded: ${template.id}`)}
                  onError={(e) =>
                    console.error(
                      `❌ Image failed: ${template.id}`,
                      e.nativeEvent.error
                    )
                  }
                />
              </View>
            </>
          )}

          {template.testError && (
            <Text style={styles.templateError}>
              Error: {template.testError}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  templateCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  templateId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  templateStatus: {
    fontSize: 14,
    marginBottom: 8,
  },
  templateUri: {
    fontSize: 11,
    color: '#444',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  templateError: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 8,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  testImage: {
    width: 100,
    height: 80,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  error: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
});
