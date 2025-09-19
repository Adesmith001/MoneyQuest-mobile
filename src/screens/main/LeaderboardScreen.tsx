import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList } from 'react-native';
import { COLORS, FONT_SIZES, SPACING } from '../../constants';
import { formatXP } from '../../utils';

interface LeaderboardItem {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  xp: number;
  isCurrentUser?: boolean;
}

const mockData: LeaderboardItem[] = [
  { id: '1', rank: 1, name: 'Alex Johnson', avatar: '👨‍💼', xp: 2450 },
  { id: '2', rank: 2, name: 'Sarah Chen', avatar: '👩‍🎓', xp: 2380 },
  { id: '3', rank: 3, name: 'Mike Williams', avatar: '👨‍🏫', xp: 2120 },
  { id: '4', rank: 4, name: 'You', avatar: '👤', xp: 0, isCurrentUser: true },
  { id: '5', rank: 5, name: 'Emma Davis', avatar: '👩‍💼', xp: 1890 },
];

interface Props {
  navigation: any;
}

const LeaderboardScreen: React.FC<Props> = ({ navigation }) => {
  const renderRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const renderLeaderboardItem = ({ item }: { item: LeaderboardItem }) => (
    <View style={[
      styles.leaderboardItem,
      item.isCurrentUser && styles.currentUserItem
    ]}>
      <View style={styles.rankContainer}>
        <Text style={[
          styles.rankText,
          item.rank <= 3 && styles.topRankText
        ]}>
          {renderRankBadge(item.rank)}
        </Text>
      </View>

      <View style={styles.avatarContainer}>
        <Text style={styles.avatar}>{item.avatar}</Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={[
          styles.userName,
          item.isCurrentUser && styles.currentUserName
        ]}>
          {item.name}
        </Text>
        <Text style={styles.userXP}>{formatXP(item.xp)} XP</Text>
      </View>

      {item.isCurrentUser && (
        <View style={styles.currentUserBadge}>
          <Text style={styles.currentUserBadgeText}>You</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>This Month's Top Learners</Text>
        
        <View style={styles.resetInfo}>
          <Text style={styles.resetText}>🔄 Resets monthly</Text>
        </View>
      </View>

      <View style={styles.content}>
        <FlatList
          data={mockData}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      </View>
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
  title: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: 'bold',
    color: COLORS.background,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: SPACING.lg,
  },
  resetInfo: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  resetText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  list: {
    flex: 1,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currentUserItem: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 87, 34, 0.05)',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  topRankText: {
    fontSize: FONT_SIZES.xl,
  },
  avatarContainer: {
    marginLeft: SPACING.md,
    marginRight: SPACING.lg,
  },
  avatar: {
    fontSize: 32,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  currentUserName: {
    color: COLORS.primary,
  },
  userXP: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  currentUserBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  currentUserBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.background,
  },
});

export default LeaderboardScreen;