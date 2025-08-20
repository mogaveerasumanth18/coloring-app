import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type Achievement,
  type GamificationSystem,
} from './GamificationSystem';

const { width: screenWidth } = Dimensions.get('window');

interface ProgressScreenProps {
  gamificationSystem: GamificationSystem;
  onClose: () => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  gamificationSystem,
  onClose,
}) => {
  const stats = gamificationSystem.getStats();
  const currentLevel = gamificationSystem.getCurrentLevel();
  const nextLevel = gamificationSystem.getNextLevel();
  const progressToNext = gamificationSystem.getProgressToNextLevel();
  const totalPoints = gamificationSystem.getTotalPoints();
  const unlockedAchievements = gamificationSystem.getUnlockedAchievements();
  const lockedAchievements = gamificationSystem.getLockedAchievements();

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: string,
    color: string
  ) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIcon}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const renderAchievement = (achievement: Achievement, isUnlocked: boolean) => (
    <View
      key={achievement.id}
      style={[styles.achievementCard, !isUnlocked && styles.lockedAchievement]}
    >
      <View style={[styles.achievementIcon, !isUnlocked && styles.lockedIcon]}>
        <Ionicons
          name={achievement.icon as any}
          size={24}
          color={isUnlocked ? '#FFD700' : '#ccc'}
        />
      </View>
      <View style={styles.achievementContent}>
        <Text
          style={[styles.achievementTitle, !isUnlocked && styles.lockedText]}
        >
          {achievement.title}
        </Text>
        <Text
          style={[
            styles.achievementDescription,
            !isUnlocked && styles.lockedText,
          ]}
        >
          {achievement.description}
        </Text>
        <View style={styles.achievementPoints}>
          <Text style={[styles.pointsText, !isUnlocked && styles.lockedText]}>
            {achievement.points} pts
          </Text>
          {isUnlocked && achievement.unlockedAt && (
            <Text style={styles.unlockedDate}>
              Unlocked {achievement.unlockedAt.toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Progress</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Level Progress */}
        <View style={styles.levelSection}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{currentLevel.level}</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>{currentLevel.title}</Text>
              <Text style={styles.totalPoints}>{totalPoints} points</Text>
            </View>
          </View>

          {nextLevel && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>
                  Progress to {nextLevel.title}
                </Text>
                <Text style={styles.progressPercentage}>
                  {Math.round(progressToNext * 100)}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressToNext * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.pointsNeeded}>
                {nextLevel.pointsRequired - totalPoints} more points needed
              </Text>
            </View>
          )}

          {nextLevel?.rewards && (
            <View style={styles.rewardsSection}>
              <Text style={styles.rewardsTitle}>Next Level Rewards:</Text>
              {nextLevel.rewards.map((reward, index) => (
                <Text key={index} style={styles.rewardItem}>
                  • {reward}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Drawings',
              stats.totalDrawings,
              'brush',
              '#FF6B6B'
            )}
            {renderStatCard(
              'Time Spent',
              `${Math.round(stats.totalTimeSpent)}m`,
              'time',
              '#4ECDC4'
            )}
            {renderStatCard(
              'Current Streak',
              `${stats.currentStreak} days`,
              'flame',
              '#FF9F43'
            )}
            {renderStatCard(
              'Colors Used',
              stats.colorsUsed.size,
              'color-palette',
              '#6C5CE7'
            )}
            {renderStatCard(
              'Templates Done',
              stats.templatesCompleted,
              'star',
              '#26DE81'
            )}
            {renderStatCard(
              'Categories',
              stats.categoriesCompleted.size,
              'grid',
              '#2D3436'
            )}
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>
            Achievements ({unlockedAchievements.length}/
            {unlockedAchievements.length + lockedAchievements.length})
          </Text>

          {/* Unlocked Achievements */}
          {unlockedAchievements.length > 0 && (
            <View style={styles.achievementGroup}>
              <Text style={styles.achievementGroupTitle}>Unlocked</Text>
              {unlockedAchievements.map((achievement) =>
                renderAchievement(achievement, true)
              )}
            </View>
          )}

          {/* Locked Achievements */}
          {lockedAchievements.length > 0 && (
            <View style={styles.achievementGroup}>
              <Text style={styles.achievementGroupTitle}>Coming Next</Text>
              {lockedAchievements
                .slice(0, 5)
                .map((achievement) => renderAchievement(achievement, false))}
            </View>
          )}
        </View>
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
  content: {
    flex: 1,
  },
  levelSection: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  levelNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalPoints: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    color: '#666',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  pointsNeeded: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  rewardsSection: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  rewardItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (screenWidth - 60) / 2,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  achievementsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  achievementGroup: {
    marginBottom: 20,
  },
  achievementGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  achievementCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  lockedAchievement: {
    opacity: 0.6,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff3cd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  lockedIcon: {
    backgroundColor: '#f8f9fa',
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  achievementPoints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  unlockedDate: {
    fontSize: 10,
    color: '#999',
  },
  lockedText: {
    color: '#999',
  },
});
