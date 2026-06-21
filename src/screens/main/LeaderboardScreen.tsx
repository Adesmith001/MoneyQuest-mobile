import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../../store';
import { fetchLeaderboard } from '../../store/slices/leaderboardSlice';
import { LeaderboardEntry } from '../../types';
import { getAvatarById } from '../../utils/avatarUtils';
import { Ionicons } from '@expo/vector-icons';

const POLL_INTERVAL_MS = 30_000;

const crownImage = require('../../../assets/crown.png');
const streakImage = require('../../../assets/streakIcon.png');

const LeaderboardScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { entries, hasLoaded, isLoading } = useSelector(
    (state: RootState) => state.leaderboard,
  );
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  // Keep stable refs so the interval always calls the latest dispatch
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useFocusEffect(
    useCallback(() => {

      // Initial fetch (shows spinner on first ever load)
      dispatchRef.current(fetchLeaderboard({ silent: false }) as any);

      // Background polling – silent refresh every 30 s
      const intervalId = setInterval(() => {
        dispatchRef.current(fetchLeaderboard({ silent: true }) as any);
      }, POLL_INTERVAL_MS);

      return () => clearInterval(intervalId);
    }, []) // empty deps – only wires up on focus, tears down on blur
  );

  // Merge live auth data for current user, then re-sort so rank moves immediately
  const resolvedEntries: LeaderboardEntry[] = entries
    .map((entry) => {
      if (currentUser && entry.userId === currentUser.$id) {
        return {
          ...entry,
          userName: currentUser.username || currentUser.name || entry.userName,
          avatar: currentUser.avatar || entry.avatar,
          profilePicture: currentUser.profilePicture || entry.profilePicture,
          monthlyXP: currentUser.monthlyXP ?? entry.monthlyXP,
          streak: entry.streak ?? 0,
        };
      }
      return entry;
    })
    .sort((a, b) => b.monthlyXP - a.monthlyXP)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const topThree = resolvedEntries.slice(0, 3);
  const restOfLeaderboard = resolvedEntries.slice(3);

  // ── Podium helpers ──────────────────────────────────────────────────────

  const renderPodiumItem = (
    player: LeaderboardEntry | undefined,
    rank: number,
  ) => {
    if (!player) return <View style={styles.podiumSlot} />;

    const isFirst = rank === 1;

    return (
      <View
        style={[
          styles.podiumSlot,
          isFirst ? styles.firstPlaceSlot : styles.runnerUpSlot,
        ]}
      >
        {/* Rank number */}
        <Text style={[styles.podiumRank, isFirst && styles.firstRankText]}>
          {rank}
        </Text>

        {/* Avatar wrapper – crown sits on top for #1 */}
        <View style={styles.avatarWrapper}>
          {isFirst && (
            <Image source={crownImage} style={styles.crownOnAvatar} />
          )}
          <View
            style={[
              styles.avatarRing,
              isFirst ? styles.firstAvatarRing : styles.runnerUpAvatarRing,
            ]}
          >
            <Image
              source={getAvatarById(player.avatar || player.profilePicture)}
              style={[
                styles.podiumAvatar,
                isFirst && styles.firstPodiumAvatar,
              ]}
            />
          </View>
        </View>

        {/* Name + XP */}
        <Text style={styles.podiumName} numberOfLines={1}>
          {player.userName}
        </Text>
        <View style={styles.metricsRow}>
          <Text style={styles.podiumXP}>{player.monthlyXP} XP</Text>
          <View style={styles.streakInline}>
            <Image source={streakImage} style={styles.streakIcon} resizeMode="contain" />
            <Text style={styles.streakValue}>{player.streak ?? 0}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ── List item (rank 4+) ────────────────────────────────────────────────

  const renderListItem = ({
    item,
    index,
  }: {
    item: LeaderboardEntry;
    index: number;
  }) => {
    const rank = index + 4;
    const isCurrentUser = item.userId === currentUser?.$id;

    return (
      <View
        style={[styles.listItem, isCurrentUser && styles.currentUserItem]}
      >
        <Text style={styles.listRank}>{rank}</Text>
        <View style={styles.listAvatarContainer}>
          <Image
            source={getAvatarById(item.avatar || item.profilePicture)}
            style={styles.listAvatar}
          />
        </View>
        <Text style={styles.listName} numberOfLines={1}>
          {item.userName}
        </Text>
        <View style={styles.metricsRow}>
          <Text style={styles.listXP}>{item.monthlyXP} XP</Text>
          <View style={styles.streakInline}>
            <Image source={streakImage} style={styles.streakIcon} resizeMode="contain" />
            <Text style={styles.streakValue}>{item.streak ?? 0}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ── Loading state (first load only – background refreshes are silent) ──

  if (isLoading && !hasLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────

  if (hasLoaded && resolvedEntries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={80} color="#D3D3D3" />
          <Text style={styles.emptyTitle}>The Leaderboard is Empty!</Text>
          <Text style={styles.emptySubtitle}>
            Be the first to claim your rightful place at the top.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>

      {/* Podium: 2-1-3 layout */}
      <View style={styles.podiumContainer}>
        {renderPodiumItem(
          topThree.find((p) => p.rank === 2),
          2,
        )}
        {renderPodiumItem(
          topThree.find((p) => p.rank === 1),
          1,
        )}
        {renderPodiumItem(
          topThree.find((p) => p.rank === 3),
          3,
        )}
      </View>

      {/* Rest of leaderboard */}
      <FlatList
        data={restOfLeaderboard}
        renderItem={renderListItem}
        keyExtractor={(item) => item.$id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────

const FIRST_AVATAR_SIZE = 120;
const RUNNER_AVATAR_SIZE = 85;

const styles = StyleSheet.create({
  /* layout */
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1B2633',
    marginTop: 20,
    marginBottom: 8,
  },

  /* ── podium ───────────────────────── */
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 260,
  },
  podiumSlot: {
    alignItems: 'center',
    flex: 1,
  },
  firstPlaceSlot: {
    marginBottom: 0,
  },
  runnerUpSlot: {
    marginTop: 40,
  },

  /* rank text */
  podiumRank: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FF6B35',
    marginBottom: 2,
  },
  firstRankText: {
    fontSize: 48,
    color: '#FF6B35',
  },

  /* avatar ring + crown */
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  crownOnAvatar: {
    width: 52,
    height: 42,
    resizeMode: 'contain',
    position: 'absolute',
    top: -28,
    zIndex: 10,
  },
  avatarRing: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0E6DA',
  },
  firstAvatarRing: {
    width: FIRST_AVATAR_SIZE + 10,
    height: FIRST_AVATAR_SIZE + 10,
    borderWidth: 3,
    borderColor: '#FF6B35',
  },
  runnerUpAvatarRing: {
    width: RUNNER_AVATAR_SIZE + 10,
    height: RUNNER_AVATAR_SIZE + 10,
    borderWidth: 0,
  },
  podiumAvatar: {
    width: RUNNER_AVATAR_SIZE,
    height: RUNNER_AVATAR_SIZE,
    borderRadius: RUNNER_AVATAR_SIZE / 2,
  },
  firstPodiumAvatar: {
    width: FIRST_AVATAR_SIZE,
    height: FIRST_AVATAR_SIZE,
    borderRadius: FIRST_AVATAR_SIZE / 2,
  },


  /* name + xp below podium */
  podiumName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B2633',
    marginTop: 6,
    maxWidth: 110,
    textAlign: 'center',
  },
  podiumXP: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C757D',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  streakInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  streakIcon: {
    width: 16,
    height: 16,
  },
  streakValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },

  /* ── list (rank 4+) ──────────────── */
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  currentUserItem: {
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  listRank: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B35',
    width: 40,
    textAlign: 'center',
  },
  listAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0E6DA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  listAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },

  listName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1B2633',
  },
  listXP: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B2633',
  },

  /* ── empty state ─────────────────── */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
    color: '#1B2633',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default LeaderboardScreen;
