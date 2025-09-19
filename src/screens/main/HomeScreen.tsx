import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZES, SPACING, LEVEL_THEMES } from '../../constants';

interface Props {
  navigation: any;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const currentLevel = 1;
  const currentSection = 1;

  const renderLevelCard = (levelNumber: number) => {
    const level = LEVEL_THEMES[levelNumber as keyof typeof LEVEL_THEMES];
    const isUnlocked = levelNumber <= currentLevel;
    
    return (
      <TouchableOpacity
        key={levelNumber}
        style={[styles.levelCard, !isUnlocked && styles.lockedCard]}
        disabled={!isUnlocked}
        onPress={() => {
          // Navigate to level
          console.log(`Navigate to level ${levelNumber}`);
        }}
      >
        <View style={styles.levelHeader}>
          <Text style={styles.levelNumber}>Level {levelNumber}</Text>
          {!isUnlocked && <Text style={styles.lockIcon}>🔒</Text>}
        </View>
        <Text style={styles.levelTitle}>{level.title}</Text>
        <Text style={styles.levelDescription}>{level.description}</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: levelNumber === currentLevel ? '25%' : (isUnlocked ? '100%' : '0%') }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {levelNumber === currentLevel ? '1/4 sections' : (isUnlocked ? 'Complete' : 'Locked')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.userName}>Ready to learn?</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Level 1</Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Your Learning Path</Text>
        
        {Object.keys(LEVEL_THEMES).map(levelKey => 
          renderLevelCard(parseInt(levelKey))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  greeting: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.background,
    marginBottom: SPACING.xs,
  },
  userName: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.background,
    marginBottom: SPACING.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: SPACING.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginVertical: SPACING.xl,
  },
  levelCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  lockedCard: {
    opacity: 0.6,
    backgroundColor: COLORS.surface,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  levelNumber: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  lockIcon: {
    fontSize: FONT_SIZES.md,
  },
  levelTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  levelDescription: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  progressContainer: {
    gap: SPACING.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});

export default HomeScreen;