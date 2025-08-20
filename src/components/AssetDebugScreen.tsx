import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { PngTemplateService } from '../services/PngTemplateService';

export const AssetDebugScreen: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    console.log(message);
    setResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testAssetLoading = async () => {
    setLoading(true);
    setResults([]);

    try {
      addResult('🔍 Starting PNG asset test...');

      // Test service initialization
      await PngTemplateService.initialize();
      addResult('✅ Service initialized');

      // Test getting all templates
      const templates = await PngTemplateService.getAllTemplates();
      addResult(`✅ Got ${templates.length} templates`);

      if (templates.length > 0) {
        // Test first template loading
        const firstTemplate = templates[0];
        addResult(
          `📋 Testing template: ${firstTemplate.id} - ${firstTemplate.title}`
        );

        try {
          const uri = await PngTemplateService.downloadTemplate(
            firstTemplate.id
          );
          addResult(`✅ Template URI: ${uri}`);

          // Test if URI is accessible
          if (uri.startsWith('data:')) {
            addResult('📄 URI is base64 data (fallback used)');
          } else if (uri.startsWith('file:')) {
            addResult('📁 URI is local file path');
          } else if (uri.startsWith('http')) {
            addResult('🌐 URI is remote URL');
          } else {
            addResult(`❓ URI type unknown: ${uri.substring(0, 50)}...`);
          }
        } catch (downloadError) {
          addResult(`❌ Template download failed: ${downloadError}`);
        }
      }

      addResult('🎉 Asset test completed');
    } catch (error) {
      addResult(`💥 Test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testSingleAsset = async () => {
    try {
      addResult('🧪 Testing single asset...');
      await PngTemplateService.testAssetLoading();
      addResult('✅ Single asset test completed');
    } catch (error) {
      addResult(`❌ Single asset test failed: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PNG Asset Debug</Text>
        <Text style={styles.subtitle}>Test PNG template loading</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={testAssetLoading}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '🔄 Testing...' : '🧪 Test All Assets'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testSingleAsset}>
          <Text style={styles.buttonText}>🔍 Test Single Asset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => setResults([])}
        >
          <Text style={styles.buttonText}>🗑️ Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultsTitle}>Results ({results.length}):</Text>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultItem}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    margin: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    margin: 4,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  results: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  resultItem: {
    fontSize: 12,
    marginBottom: 8,
    color: '#333',
    fontFamily: 'monospace',
  },
});
