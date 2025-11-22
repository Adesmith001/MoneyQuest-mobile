import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import { RootState } from "../../store";
import { formatXP, formatMonthlyXP, formatLifeRegenTime, getDaysUntilMonthEnd } from "../../utils";
import { getAvatarById } from "../../utils/avatarUtils";
import InviteFriendsModal from "../../components/modals/InviteFriendsModal";
import CustomButton from "../../components/CustomButton";
import { loadStreakData } from "../../store/slices/streakSlice";
import { livesService } from "../../services/lives";
import { levelProgressService } from "../../services/levelProgress";

const { width: screenWidth } = Dimensions.get("window");

interface Props {
  navigation: any;
}

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentStreak, totalStreak, daysThisMonth, weeklyStreak } = useSelector(
    (state: RootState) => state.streak
  );
  const [isInviteModalVisible, setInviteModalVisible] = useState(false);
  const [currentLives, setCurrentLives] = useState(user?.lives || 5);
  const [lifeRegenTime, setLifeRegenTime] = useState('');

  useEffect(() => {
    // Load streak data when component mounts
    if (user?.$id) {
      dispatch(loadStreakData(user.$id) as any);
    }

    // Check if monthly XP should be reset
    if (user && levelProgressService.shouldResetMonthlyXP(user)) {
      levelProgressService.resetMonthlyXP(user.$id);
    }
  }, [user?.$id, dispatch]);

  // Update lives and regeneration timer
  useEffect(() => {
    if (!user) return;

    const updateLivesTimer = () => {
      try {
        // Ensure lives and lastLifeRegenTime have valid values
        const currentLivesValue = typeof user.lives === 'number' ? user.lives : 5;
        const regenTime = user.lastLifeRegenTime || new Date().toISOString();

        const { lives } = livesService.calculateCurrentLives(
          currentLivesValue,
          regenTime
        );
        setCurrentLives(lives);

        const timeRemaining = livesService.getTimeUntilNextLife(
          lives,
          regenTime
        );
        setLifeRegenTime(formatLifeRegenTime(timeRemaining));
      } catch (error) {
        console.error('Error updating lives timer:', error);
        // Set default values on error
        setCurrentLives(5);
        setLifeRegenTime('Full');
      }
    };

    updateLivesTimer();
    const interval = setInterval(updateLivesTimer, 1000); // Update every second

    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const userData = {
    name: user?.name,
    username: user?.username,
    avatar: user?.avatar,
    level: user?.level,
    xp: user?.xp,
    monthlyXP: user?.monthlyXP || 0,
    currentStreak: currentStreak,
    totalStreak: totalStreak,
    daysThisMonth: daysThisMonth,
    lives: currentLives,
    maxLives: livesService.getMaxLives(),
  };

  const handleEditProfile = () => {
    navigation.navigate("EditProfile");
  };

  const inviteLink = `https://invite.moneyquest.com/${user?.$id}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={getAvatarById(userData.avatar)}
              style={styles.avatarImage}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userData.name}</Text>
            <Text style={styles.userHandle}>@{userData.username}</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <Ionicons name="create-outline" size={25} color="white" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statIcon}>🔥</Text>
                </View>
                <View style={styles.statBottomRow}>
                  <Text style={styles.statValue}>{weeklyStreak}</Text>
                  <Text style={styles.statLabel}>Current streak</Text>
                </View>
              </View>
            </View>
            {/* <View style={styles.statsRow}> */}
              <View style={styles.statCard}>
                <View style={styles.statRow}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statIcon}>💎</Text>
                  </View>
                  <View style={styles.statBottomRow}>
                    <Text style={styles.statValue}>
                      {formatXP(userData.monthlyXP)}
                    </Text>
                    <Text style={styles.statLabel}>Monthly XP</Text>
                    <Text style={styles.statSubLabel}>
                      {getDaysUntilMonthEnd()} days left
                    </Text>
                  </View>
                </View>
              {/* </View> */}
            </View>
          </View>
           

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statIcon}>❤️</Text>
                </View>
                <View style={styles.statBottomRow}>
                  <Text style={styles.statValue}>
                    {userData.lives}/{userData.maxLives}
                  </Text>
                  <Text style={styles.statLabel}>Lives</Text>
                  {userData.lives < userData.maxLives && (
                    <Text style={styles.statSubLabel}>
                      Next in {lifeRegenTime}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Invite Friends Button */}
        <CustomButton
          title={"Invite Friends"}
          onPress={() => setInviteModalVisible(true)}
          size="large"
          style={{
            marginHorizontal: 10,
            marginBottom: 20,
            width: screenWidth - 40,
          }}
        />

        {/* Badges & Achievement */}
        <View style={styles.achievementsSection}>
          <Text style={styles.sectionTitle}>Badges & Achievement</Text>
          <View style={styles.achievementsGrid}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={index} style={styles.achievementCard} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Invite Modal */}
      <InviteFriendsModal
        visible={isInviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        inviteLink={inviteLink}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F04D23",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 30,
    height: "20%",
    justifyContent: "space-between",
    gap: 10,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
  },
  userHandle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
  },
  editButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  editIcon: {
    fontSize: 24,
    color: "white",
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    borderColor: "#E5E5E5",
    borderWidth: 2,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statBottomRow: {
    alignItems: "flex-start",
  },
  statIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4B4B4B",
  },
  statLabel: {
    fontSize: 12,
    color: "#AFAFAF",
    fontWeight: "800",
  },
  statSubLabel: {
    fontSize: 10,
    color: "#CCCCCC",
    fontWeight: "600",
    marginTop: 2,
  },
  inviteButton: {
    marginHorizontal: 20,
    backgroundColor: "#FF6B35",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 30,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  achievementsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  achievementCard: {
    width: (screenWidth - 40 - 24) / 3, // (Screen width - padding - gaps) / 3
    aspectRatio: 1,
    backgroundColor: "#E9ECEF",
    borderRadius: 16,
    marginBottom: 12,
  },
});

export default ProfileScreen;
