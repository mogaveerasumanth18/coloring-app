import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export function RewardsTab() {
  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.rewardsHeader}>
        <Text style={styles.rewardsTitle}>Your Amazing Achievements!</Text>
        <Text style={styles.rewardsSubtitle}>
          Keep coloring to unlock more rewards
        </Text>
      </View>

      {/* Achievement Cards */}
      <View style={styles.achievementGrid}>
        <AchievementCard icon="🎨" name="First Masterpiece" unlocked={true} />
        <AchievementCard icon="🌈" name="Color Explorer" unlocked={true} />
        <AchievementCard icon="⚡" name="Speed Artist" unlocked={false} />
        <AchievementCard icon="🎯" name="Perfect Fill" unlocked={false} />
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <StatCard icon="🎨" number="12" label="Completed Artworks" />
        <StatCard icon="⏱️" number="2h 45m" label="Time Spent Creating" />
        <StatCard icon="🌈" number="47" label="Colors Used" />
      </View>
    </ScrollView>
  );
}

function AchievementCard({
  icon,
  name,
  unlocked,
}: {
  icon: string;
  name: string;
  unlocked: boolean;
}) {
  return (
    <View
      style={[styles.achievementCard, !unlocked && styles.lockedAchievement]}
    >
      <Text style={styles.achievementIcon}>{icon}</Text>
      <Text style={styles.achievementName}>{name}</Text>
      <View style={unlocked ? styles.achievementBadge : styles.lockedBadge}>
        <Text
          style={
            unlocked ? styles.achievementBadgeText : styles.lockedBadgeText
          }
        >
          {unlocked ? 'Unlocked' : 'Locked'}
        </Text>
      </View>
    </View>
  );
}

function StatCard({
  icon,
  number,
  label,
}: {
  icon: string;
  number: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    paddingBottom: 80,
  },
  rewardsHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  rewardsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  rewardsSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  achievementGrid: {
    padding: 16,
    gap: 16,
  },
  achievementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lockedAchievement: {
    opacity: 0.6,
  },
  achievementIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  achievementBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  achievementBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  lockedBadge: {
    backgroundColor: '#9CA3AF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lockedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsSection: {
    padding: 16,
    gap: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
