export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: (stats: UserStats) => boolean;
  points: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface UserStats {
  totalDrawings: number;
  totalTimeSpent: number; // in minutes
  consecutiveDays: number;
  templatesCompleted: number;
  colorsUsed: Set<string>;
  categoriesCompleted: Set<string>;
  averageDrawingTime: number;
  lastActivityDate?: Date;
  longestStreak: number;
  currentStreak: number;
  favouriteColor?: string;
  totalStrokes: number;
}

export interface UserLevel {
  level: number;
  title: string;
  pointsRequired: number;
  rewards: string[];
  unlockedTemplates: string[];
}

export const USER_LEVELS: UserLevel[] = [
  {
    level: 1,
    title: 'Little Artist',
    pointsRequired: 0,
    rewards: ['Basic color palette', 'Simple templates'],
    unlockedTemplates: ['butterfly-1', 'flower-1'],
  },
  {
    level: 2,
    title: 'Creative Explorer',
    pointsRequired: 100,
    rewards: ['Extended color palette', 'Animal templates'],
    unlockedTemplates: ['car-1', 'butterfly-1', 'flower-1'],
  },
  {
    level: 3,
    title: 'Color Master',
    pointsRequired: 250,
    rewards: ['Gradient colors', 'Nature templates'],
    unlockedTemplates: ['castle-1', 'car-1', 'butterfly-1', 'flower-1'],
  },
  {
    level: 4,
    title: 'Art Genius',
    pointsRequired: 500,
    rewards: ['Special effects', 'All templates'],
    unlockedTemplates: ['*'], // All templates
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_drawing',
    title: 'First Masterpiece',
    description: 'Complete your first drawing',
    icon: 'trophy',
    condition: (stats) => stats.totalDrawings >= 1,
    points: 10,
    unlocked: false,
  },
  {
    id: 'five_drawings',
    title: 'Artistic Journey',
    description: 'Complete 5 drawings',
    icon: 'ribbon',
    condition: (stats) => stats.totalDrawings >= 5,
    points: 25,
    unlocked: false,
  },
  {
    id: 'ten_drawings',
    title: 'Drawing Enthusiast',
    description: 'Complete 10 drawings',
    icon: 'medal',
    condition: (stats) => stats.totalDrawings >= 10,
    points: 50,
    unlocked: false,
  },
  {
    id: 'rainbow_artist',
    title: 'Rainbow Artist',
    description: 'Use 10 different colors',
    icon: 'color-palette',
    condition: (stats) => stats.colorsUsed.size >= 10,
    points: 30,
    unlocked: false,
  },
  {
    id: 'speed_artist',
    title: 'Speed Artist',
    description: 'Complete a drawing in under 5 minutes',
    icon: 'time',
    condition: (stats) => stats.averageDrawingTime <= 5,
    points: 20,
    unlocked: false,
  },
  {
    id: 'daily_artist',
    title: 'Daily Artist',
    description: 'Draw for 3 consecutive days',
    icon: 'calendar',
    condition: (stats) => stats.consecutiveDays >= 3,
    points: 40,
    unlocked: false,
  },
  {
    id: 'week_streak',
    title: 'Week Warrior',
    description: 'Draw for 7 consecutive days',
    icon: 'flame',
    condition: (stats) => stats.consecutiveDays >= 7,
    points: 100,
    unlocked: false,
  },
  {
    id: 'category_explorer',
    title: 'Category Explorer',
    description: 'Complete drawings from 3 different categories',
    icon: 'compass',
    condition: (stats) => stats.categoriesCompleted.size >= 3,
    points: 60,
    unlocked: false,
  },
  {
    id: 'template_master',
    title: 'Template Master',
    description: 'Complete 15 template drawings',
    icon: 'star',
    condition: (stats) => stats.templatesCompleted >= 15,
    points: 75,
    unlocked: false,
  },
  {
    id: 'patient_artist',
    title: 'Patient Artist',
    description: 'Spend more than 30 minutes on a single drawing',
    icon: 'hourglass',
    condition: (stats) => stats.averageDrawingTime >= 30,
    points: 35,
    unlocked: false,
  },
];

export class GamificationSystem {
  private stats: UserStats;
  private achievements: Achievement[];
  private currentLevel: UserLevel;
  private totalPoints: number;

  constructor(initialStats?: Partial<UserStats>) {
    this.stats = {
      totalDrawings: 0,
      totalTimeSpent: 0,
      consecutiveDays: 0,
      templatesCompleted: 0,
      colorsUsed: new Set(),
      categoriesCompleted: new Set(),
      averageDrawingTime: 0,
      longestStreak: 0,
      currentStreak: 0,
      totalStrokes: 0,
      ...initialStats,
    };

    this.achievements = [...ACHIEVEMENTS];
    this.totalPoints = 0;
    this.currentLevel = USER_LEVELS[0];
    this.updateLevel();
  }

  // Update user statistics
  updateStats(newStats: Partial<UserStats>): Achievement[] {
    this.stats = { ...this.stats, ...newStats };

    // Check for new achievements
    const newAchievements = this.checkAchievements();

    // Update level
    this.updateLevel();

    return newAchievements;
  }

  // Add a completed drawing
  addDrawing(
    drawingTime: number,
    colorsUsed: string[],
    category?: string,
    isTemplate: boolean = false
  ): Achievement[] {
    const today = new Date();
    const lastActivity = this.stats.lastActivityDate;

    // Update consecutive days
    if (lastActivity) {
      const daysDiff = Math.floor(
        (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) {
        this.stats.currentStreak += 1;
        this.stats.consecutiveDays = this.stats.currentStreak;
      } else if (daysDiff > 1) {
        this.stats.currentStreak = 1;
        this.stats.consecutiveDays = 1;
      }
    } else {
      this.stats.currentStreak = 1;
      this.stats.consecutiveDays = 1;
    }

    // Update longest streak
    if (this.stats.currentStreak > this.stats.longestStreak) {
      this.stats.longestStreak = this.stats.currentStreak;
    }

    // Update other stats
    this.stats.totalDrawings += 1;
    this.stats.totalTimeSpent += drawingTime;
    this.stats.lastActivityDate = today;

    // Add colors used
    colorsUsed.forEach((color) => this.stats.colorsUsed.add(color));

    // Add category if provided
    if (category) {
      this.stats.categoriesCompleted.add(category);
    }

    // Update template count
    if (isTemplate) {
      this.stats.templatesCompleted += 1;
    }

    // Update average drawing time
    this.stats.averageDrawingTime =
      this.stats.totalTimeSpent / this.stats.totalDrawings;

    return this.updateStats({});
  }

  // Check for new achievements
  private checkAchievements(): Achievement[] {
    const newAchievements: Achievement[] = [];

    this.achievements.forEach((achievement) => {
      if (!achievement.unlocked && achievement.condition(this.stats)) {
        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        this.totalPoints += achievement.points;
        newAchievements.push(achievement);
      }
    });

    return newAchievements;
  }

  // Update user level based on points
  private updateLevel(): void {
    const newLevel = USER_LEVELS.slice()
      .reverse()
      .find((level) => this.totalPoints >= level.pointsRequired);

    if (newLevel && newLevel.level > this.currentLevel.level) {
      this.currentLevel = newLevel;
    }
  }

  // Get current user statistics
  getStats(): UserStats {
    return { ...this.stats };
  }

  // Get unlocked achievements
  getUnlockedAchievements(): Achievement[] {
    return this.achievements.filter((a) => a.unlocked);
  }

  // Get locked achievements
  getLockedAchievements(): Achievement[] {
    return this.achievements.filter((a) => !a.unlocked);
  }

  // Get current level
  getCurrentLevel(): UserLevel {
    return this.currentLevel;
  }

  // Get next level
  getNextLevel(): UserLevel | null {
    const currentIndex = USER_LEVELS.findIndex(
      (l) => l.level === this.currentLevel.level
    );
    return currentIndex < USER_LEVELS.length - 1
      ? USER_LEVELS[currentIndex + 1]
      : null;
  }

  // Get total points
  getTotalPoints(): number {
    return this.totalPoints;
  }

  // Get progress to next level (0-1)
  getProgressToNextLevel(): number {
    const nextLevel = this.getNextLevel();
    if (!nextLevel) return 1; // Max level reached

    const currentLevelPoints = this.currentLevel.pointsRequired;
    const nextLevelPoints = nextLevel.pointsRequired;
    const progressPoints = this.totalPoints - currentLevelPoints;
    const totalPointsNeeded = nextLevelPoints - currentLevelPoints;

    return Math.min(1, progressPoints / totalPointsNeeded);
  }

  // Check if template is unlocked
  isTemplateUnlocked(templateId: string): boolean {
    const unlockedTemplates = this.currentLevel.unlockedTemplates;
    return (
      unlockedTemplates.includes('*') || unlockedTemplates.includes(templateId)
    );
  }

  // Serialize to JSON for storage
  toJSON(): any {
    return {
      stats: {
        ...this.stats,
        colorsUsed: Array.from(this.stats.colorsUsed),
        categoriesCompleted: Array.from(this.stats.categoriesCompleted),
      },
      achievements: this.achievements,
      currentLevel: this.currentLevel,
      totalPoints: this.totalPoints,
    };
  }

  // Deserialize from JSON
  static fromJSON(data: any): GamificationSystem {
    const system = new GamificationSystem();

    if (data.stats) {
      system.stats = {
        ...data.stats,
        colorsUsed: new Set(data.stats.colorsUsed || []),
        categoriesCompleted: new Set(data.stats.categoriesCompleted || []),
        lastActivityDate: data.stats.lastActivityDate
          ? new Date(data.stats.lastActivityDate)
          : undefined,
      };
    }

    if (data.achievements) {
      system.achievements = data.achievements.map((a: any) => ({
        ...a,
        unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : undefined,
      }));
    }

    if (data.currentLevel) {
      system.currentLevel = data.currentLevel;
    }

    if (data.totalPoints) {
      system.totalPoints = data.totalPoints;
    }

    return system;
  }
}
