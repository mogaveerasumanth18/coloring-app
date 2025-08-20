import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import {
  type ColoringTemplate,
  SAMPLE_TEMPLATES,
  searchTemplates,
} from './TemplateData';

const { width: screenWidth } = Dimensions.get('window');
const itemWidth = (screenWidth - 60) / 2;

interface TemplateLibraryProps {
  onTemplateSelect: (template: ColoringTemplate) => void;
  onClose: () => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  onTemplateSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const categories = [
    { key: 'all', label: 'All', icon: 'grid' },
    { key: 'animals', label: 'Animals', icon: 'paw' },
    { key: 'nature', label: 'Nature', icon: 'leaf' },
    { key: 'vehicles', label: 'Vehicles', icon: 'car' },
    { key: 'characters', label: 'Characters', icon: 'person' },
    { key: 'shapes', label: 'Shapes', icon: 'shapes' },
    { key: 'patterns', label: 'Patterns', icon: 'options' },
  ];

  const difficulties = [
    { key: 'all', label: 'All Levels' },
    { key: 'easy', label: 'Easy' },
    { key: 'medium', label: 'Medium' },
    { key: 'hard', label: 'Hard' },
  ];

  const getFilteredTemplates = () => {
    let templates = SAMPLE_TEMPLATES;

    // Apply search filter
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    // Apply difficulty filter
    if (selectedDifficulty !== 'all') {
      templates = templates.filter((t) => t.difficulty === selectedDifficulty);
    }

    return templates;
  };

  const filteredTemplates = getFilteredTemplates();

  const renderTemplate = (template: ColoringTemplate) => (
    <TouchableOpacity
      key={template.id}
      style={styles.templateItem}
      onPress={() => onTemplateSelect(template)}
    >
      <View style={styles.templatePreview}>
        <SvgXml xml={template.svgData} width={itemWidth - 20} height={120} />
      </View>
      <View style={styles.templateInfo}>
        <Text style={styles.templateTitle}>{template.title}</Text>
        <View style={styles.templateMeta}>
          <View
            style={[
              styles.difficultyBadge,
              template.difficulty === 'easy' && styles.difficultyEasy,
              template.difficulty === 'medium' && styles.difficultyMedium,
              template.difficulty === 'hard' && styles.difficultyHard,
            ]}
          >
            <Text style={styles.difficultyText}>{template.difficulty}</Text>
          </View>
          <Text style={styles.ageGroup}>{template.ageGroup}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Template Library</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search templates..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryButton,
              selectedCategory === category.key && styles.selectedCategory,
            ]}
            onPress={() => setSelectedCategory(category.key)}
          >
            <Ionicons
              name={category.icon as any}
              size={18}
              color={selectedCategory === category.key ? '#fff' : '#666'}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.key &&
                  styles.selectedCategoryText,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Difficulty Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.difficultyContainer}
        contentContainerStyle={styles.difficultyContent}
      >
        {difficulties.map((difficulty) => (
          <TouchableOpacity
            key={difficulty.key}
            style={[
              styles.difficultyButton,
              selectedDifficulty === difficulty.key &&
                styles.selectedDifficulty,
            ]}
            onPress={() => setSelectedDifficulty(difficulty.key)}
          >
            <Text
              style={[
                styles.difficultyButtonText,
                selectedDifficulty === difficulty.key &&
                  styles.selectedDifficultyText,
              ]}
            >
              {difficulty.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Templates Grid */}
      <ScrollView
        style={styles.templatesContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.templatesGrid}>
          {filteredTemplates.map(renderTemplate)}
        </View>
        {filteredTemplates.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No templates found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your search or filter criteria
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 15,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  categoryContainer: {
    marginTop: 15,
    maxHeight: 50,
  },
  categoryContent: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedCategory: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  selectedCategoryText: {
    color: '#fff',
  },
  difficultyContainer: {
    marginTop: 10,
    maxHeight: 40,
  },
  difficultyContent: {
    paddingHorizontal: 20,
  },
  difficultyButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    marginRight: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedDifficulty: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  difficultyButtonText: {
    fontSize: 12,
    color: '#666',
  },
  selectedDifficultyText: {
    color: '#fff',
  },
  templatesContainer: {
    flex: 1,
    marginTop: 15,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  templateItem: {
    width: itemWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  templatePreview: {
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  },
  templateInfo: {
    padding: 12,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  templateMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  difficultyEasy: {
    backgroundColor: '#4CAF50',
  },
  difficultyMedium: {
    backgroundColor: '#FF9800',
  },
  difficultyHard: {
    backgroundColor: '#F44336',
  },
  difficultyText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  ageGroup: {
    fontSize: 10,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
});
