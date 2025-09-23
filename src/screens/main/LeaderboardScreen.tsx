import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { fetchLeaderboard } from '../../store/slices/leaderboardSlice';
import { LeaderboardEntry } from '../../types';
import { getAvatarById } from '../../utils/avatarUtils';
import { Ionicons } from '@expo/vector-icons';

const LeaderboardScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { entries, isLoading, error } = useSelector((state: RootState) => state.leaderboard);
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchLeaderboard() as any);
  }, [dispatch]);

  const topThree = entries.slice(0, 3);
  const restOfLeaderboard = entries.slice(3);

  const renderPodiumItem = (player: LeaderboardEntry | undefined, rank: number) => {
    if (!player) return <View style={styles.podiumItem} />;

    const isFirst = rank === 1;
    return (
      <View style={[styles.podiumItem, isFirst ? styles.firstPlace : styles.otherPodium]}>
        <Text style={[styles.podiumRank, isFirst && { color: '#FFC107' }]}>{rank}</Text>
        {isFirst && <Image source={require('../../../assets/crown.png')} style={styles.crownIcon} />}
        <Image source={getAvatarById(player.profilePicture)} style={[styles.podiumAvatar, isFirst && styles.firstAvatar]} />
        <Text style={styles.podiumName} numberOfLines={1}>{player.userName}</Text>
        <Text style={styles.podiumXP}>{player.monthlyXP} XP</Text>
      </View>
    );
  };

  const renderListItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <View style={[styles.listItem, item.userId === currentUser?.$id && styles.currentUserItem]}>
      <Text style={styles.listRank}>{index + 4}</Text>
      <Image source={getAvatarById(item.profilePicture)} style={styles.listAvatar} />
      <Text style={styles.listName}>{item.userName}</Text>
      <Text style={styles.listXP}>{item.monthlyXP} XP</Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!isLoading && entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={80} color="#D3D3D3" />
          <Text style={styles.emptyTitle}>The Leaderboard is Empty!</Text>
          <Text style={styles.emptySubtitle}>Be the first to claim your rightful place at the top.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Leaderboard</Text>
      <View style={styles.podiumContainer}>
        {renderPodiumItem(topThree.find(p => p.rank === 2), 2)}
        {renderPodiumItem(topThree.find(p => p.rank === 1), 1)}
        {renderPodiumItem(topThree.find(p => p.rank === 3), 3)}
      </View>
      <FlatList
        data={restOfLeaderboard}
        renderItem={renderListItem}
        keyExtractor={(item) => item.$id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 30,
    height: 220,
  },
  podiumItem: {
    alignItems: 'center',
    width: '33%',
  },
  firstPlace: {
    position: 'relative',
    bottom: 20,
  },
  otherPodium: {
    position: 'relative',
    top: 10,
  },
  podiumRank: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  crownIcon: {
    width: 40,
    height: 40,
    position: 'absolute',
    top: 25,
    right: 10,
    transform: [{ rotate: '15deg' }],
  },
  podiumAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FF6B35',
    marginVertical: 8,
  },
  firstAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  podiumName: {
    fontSize: 16,
    fontWeight: '600',
  },
  podiumXP: {
    fontSize: 14,
    color: '#6C757D',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  currentUserItem: {
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
    borderRadius: 10,
  },
  listRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6C757D',
    width: 40,
    textAlign: 'center',
  },
  listAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginHorizontal: 15,
  },
  listName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  listXP: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
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
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default LeaderboardScreen;