import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SimpleTestApp() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Digital Coloring Book - Web Test</Text>
      <Text style={styles.subtitle}>Web version is working! 🎨</Text>
      <View style={styles.colorBox} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  colorBox: {
    width: 100,
    height: 100,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    marginTop: 20,
  },
});
