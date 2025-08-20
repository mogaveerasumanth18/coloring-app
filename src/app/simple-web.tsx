import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BasicColoringApp } from '../components/coloring/BasicColoringApp';

export default function SimpleWebEntry() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Digital Coloring Book</Text>
      <BasicColoringApp />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: '#4CAF50',
    color: 'white',
  },
});
