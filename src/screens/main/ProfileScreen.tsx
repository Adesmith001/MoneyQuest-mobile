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
  Linking,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { RootState } from "../../store";
import { formatXP, formatMonthlyXP, formatLifeRegenTime, getDaysUntilMonthEnd } from "../../utils";
import { getAvatarById } from "../../utils/avatarUtils";
import InviteFriendsModal from "../../components/modals/InviteFriendsModal";
import CustomButton from "../../components/CustomButton";
import { loadStreakData } from "../../store/slices/streakSlice";
import { livesService } from "../../services/lives";
import { levelProgressService } from "../../services/levelProgress";
import { updateUser } from "../../store/slices/authSlice";
import { subscriptionService } from "../../services/subscriptionService";
import { Subscription } from "../../types/subscription";
import CoachMark from "../../components/tutorial/CoachMark";
import { PROFILE_COACH_STEPS } from "../../config/coachMarkSteps";
import { markProfileGuideSeen } from "../../store/slices/tutorialSlice";

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
  const { hasSeenProfileGuide } = useSelector((state: RootState) => state.tutorial);
  const [isInviteModalVisible, setInviteModalVisible] = useState(false);
  const [lifeRegenTime, setLifeRegenTime] = useState('');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isTogglingAutoRenew, setIsTogglingAutoRenew] = useState(false);

  // Coach marks
  const [coachStep, setCoachStep] = useState(0);
  const showCoachMarks = !hasSeenProfileGuide;

  // Refresh lives when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const refreshUserLives = async () => {
        if (!user?.$id) return;

        try {
          const { lives, lastLifeRegenTime } = await livesService.refreshLives(
            user.$id,
            user.lives !== undefined && user.lives !== null ? user.lives : 5,
            user.lastLifeRegenTime || new Date().toISOString()
          );

          // Update Redux store with new lives if changed
          if (lives !== user.lives || lastLifeRegenTime !== user.lastLifeRegenTime) {
            dispatch(updateUser({ lives, lastLifeRegenTime }));
          }
        } catch (error) {
          console.error('Failed to refresh lives:', error);
        }
      };

      const fetchSubscription = async () => {
        if (!user?.$id) return;
        try {
          const sub = await subscriptionService.getUserSubscription(user.$id);
          setSubscription(sub);
        } catch (error) {
          console.error('Failed to fetch subscription:', error);
        }
      };

      refreshUserLives();
      fetchSubscription();
    }, [user?.$id, user?.lives, user?.lastLifeRegenTime, dispatch])
  );

  useEffect(() => {
    // Load streak data when component mounts
    if (user?.$id) {
      dispatch(loadStreakData(user.$id) as any);
    }

    // Check if monthly XP should be reset
    if (user && levelProgressService.shouldResetMonthlyXP(user)) {
      levelProgressService.resetMonthlyXP(user.$id);
    }

    // Log Appwrite data
  }, [user?.$id, user?.monthlyXP, user?.lives, user?.totalXP, user?.xp, currentStreak, weeklyStreak, dispatch]);

  // Update lives and regeneration timer
  useEffect(() => {
    if (!user) return;

    const updateLivesTimer = () => {
      try {
        // Use lives directly from user object (Appwrite)
        const currentLivesValue = user.lives !== undefined && user.lives !== null ? user.lives : 5;
        const regenTime = user.lastLifeRegenTime || new Date().toISOString();

        const timeRemaining = livesService.getTimeUntilNextLife(
          currentLivesValue,
          regenTime
        );
        setLifeRegenTime(formatLifeRegenTime(timeRemaining));
      } catch (error) {
        console.error('Error updating lives timer:', error);
        // Set default values on error
        setLifeRegenTime('Full');
      }
    };

    updateLivesTimer();
    const interval = setInterval(updateLivesTimer, 1000); // Update every second

    return () => clearInterval(interval);
  }, [user, user?.lives, user?.lastLifeRegenTime]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const handleEditProfile = () => {
    navigation.navigate("EditProfile");
  };

  const handleToggleAutoRenew = async (value: boolean) => {
    if (!user?.$id) return;
    setIsTogglingAutoRenew(true);
    try {
      const updated = await subscriptionService.toggleAutoRenew(user.$id, value);
      setSubscription(updated);
      Alert.alert(
        value ? "Auto-Renew Enabled" : "Auto-Renew Disabled",
        value
          ? "Your subscription will automatically renew when it expires."
          : "Your subscription will not auto-renew. You'll need to manually renew when it expires."
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update auto-renew preference.");
    } finally {
      setIsTogglingAutoRenew(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel? You'll still have access until your current period ends.",
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const updated = await subscriptionService.cancelSubscription(user.$id);
              setSubscription(updated);
              Alert.alert("Subscription Cancelled", "Your subscription has been cancelled. You'll still have access until the current period ends.");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to cancel subscription.");
            }
          },
        },
      ]
    );
  };

  const getSubscriptionStatusLabel = () => {
    if (!subscription) return "No subscription";
    switch (subscription.status) {
      case "trial":
        const daysLeft = subscriptionService.getRemainingTrialDays(subscription);
        return `Free Trial • ${daysLeft} days left`;
      case "active":
        return "Active";
      case "expired":
        return "Expired";
      case "cancelled":
        return "Cancelled";
      default:
        return subscription.status;
    }
  };

  const getStatusColor = () => {
    if (!subscription) return "#999";
    switch (subscription.status) {
      case "trial":
        return "#4ECDC4";
      case "active":
        return "#4CAF50";
      case "expired":
      case "cancelled":
        return "#F44336";
      default:
        return "#999";
    }
  };

  const inviteLink = `https://www.nurtureehaven.com/`;

  // Get lives directly from Appwrite user object
  const currentLivesValue = user.lives !== undefined && user.lives !== null ? user.lives : 5;
  const maxLives = livesService.getMaxLives();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={getAvatarById(user.avatar)}
              style={styles.avatarImage}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userHandle}>@{user.username}</Text>
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
                  <Image
                    source={require("../../../assets/xp-icon.png")}
                    style={styles.statIconImage}
                  />
                </View>
                <View style={styles.statBottomRow}>
                  <Text style={styles.statValue}>
                    {formatXP(user.monthlyXP || 0)}
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
                    {currentLivesValue}/{maxLives}
                  </Text>
                  <Text style={styles.statLabel}>Lives</Text>
                  {currentLivesValue < maxLives && (
                    <Text style={styles.statSubLabel}>
                      Next in {lifeRegenTime}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Subscription Management */}
        {subscription && (
          <View style={styles.subscriptionSection}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <View style={styles.subscriptionCard}>
              {/* Status Row */}
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>  
                  <Text style={styles.statusBadgeText}>
                    {getSubscriptionStatusLabel()}
                  </Text>
                </View>
              </View>

              {/* Plan Row */}
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>Plan</Text>
                <Text style={styles.subscriptionValue}>
                  {subscription.planType === "annual" ? "Annual" : "Monthly"}
                </Text>
              </View>

              {/* Auto-Renew Toggle */}
              {(subscription.status === "trial" || subscription.status === "active") && (
                <View style={styles.subscriptionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subscriptionLabel}>Auto-renew</Text>
                    <Text style={styles.autoRenewHint}>
                      {subscription.autoRenew
                        ? "Payment will be charged automatically"
                        : "You'll need to renew manually"}
                    </Text>
                  </View>
                  {isTogglingAutoRenew ? (
                    <ActivityIndicator size="small" color="#FF5722" />
                  ) : (
                    <Switch
                      value={subscription.autoRenew}
                      onValueChange={handleToggleAutoRenew}
                      trackColor={{ false: "#E0E0E0", true: "#4ECDC4" }}
                      thumbColor={subscription.autoRenew ? "#FFF" : "#f4f3f4"}
                    />
                  )}
                </View>
              )}

              {/* Cancel Button */}
              {subscription.status === "active" && (
                <TouchableOpacity
                  style={styles.cancelSubscriptionButton}
                  onPress={handleCancelSubscription}
                >
                  <Text style={styles.cancelSubscriptionText}>Cancel Subscription</Text>
                </TouchableOpacity>
              )}

              {/* Renew Button (for expired/cancelled) */}
              {(subscription.status === "expired" || subscription.status === "cancelled") && (
                <TouchableOpacity
                  style={styles.renewButton}
                  onPress={() => navigation.navigate("Premium" as any)}
                >
                  <Text style={styles.renewButtonText}>Renew Subscription</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Invite Friends Button */}
        <CustomButton
          title={"Invite Friends"}
          onPress={() => setInviteModalVisible(true)}
          size="large"
          style={{
            marginHorizontal: 10,
            marginBottom: 12,
            width: screenWidth - 40,
          }}
        />

        {/* How to Play Button */}
        <TouchableOpacity
          style={styles.howToPlayButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('TutorialHub')}
        >
          <Ionicons name="help-circle-outline" size={22} color="#FF5722" />
          <Text style={styles.howToPlayText}>How to Play</Text>
          <Ionicons name="chevron-forward" size={18} color="#CCC" />
        </TouchableOpacity>

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

      {/* Coach marks for first-time profile visitors */}
      <CoachMark
        visible={showCoachMarks}
        steps={PROFILE_COACH_STEPS}
        currentStep={coachStep}
        onNext={() => setCoachStep((prev) => prev + 1)}
        onSkip={() => {
          dispatch(markProfileGuideSeen());
          setCoachStep(0);
        }}
        onComplete={() => {
          dispatch(markProfileGuideSeen());
          setCoachStep(0);
        }}
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
    flexGrow: 1,
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
  statIconImage: {
    width: 24,
    height: 24,
    marginRight: 8,
    resizeMode: "contain",
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
  howToPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  howToPlayText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  subscriptionSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: Platform.OS === 'ios' ? 4 : 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  subscriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  subscriptionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  autoRenewHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  cancelSubscriptionButton: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  cancelSubscriptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
  renewButton: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#FF5722',
  },
  renewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default ProfileScreen;
