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
  Modal,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState, AppDispatch } from "../../store";
import { formatXP, formatMonthlyXP, getDaysUntilMonthEnd } from "../../utils";
import { getAvatarById } from "../../utils/avatarUtils";
import InviteFriendsModal from "../../components/modals/InviteFriendsModal";
import CustomButton from "../../components/CustomButton";
import { loadStreakData } from "../../store/slices/streakSlice";
import { livesService } from "../../services/lives";
import { levelProgressService } from "../../services/levelProgress";
import { updateUser, logout } from "../../store/slices/authSlice";
import { subscriptionService } from "../../services/subscriptionService";
import { Subscription } from "../../types/subscription";
import AuthService from "../../services/auth";
import CoachMark from "../../components/tutorial/CoachMark";
import { PROFILE_COACH_STEPS } from "../../config/coachMarkSteps";
import { markProfileGuideSeen, markTutorialActionCompleted } from "../../store/slices/tutorialSlice";
import { useRevenueCat } from "../../hooks/useRevenueCat";
import { canAdvanceTutorialStep } from "../../utils/tutorialBehavior";
import { fetchBadgeCatalogue } from "../../store/slices/gamificationSlice";
import { BadgeCategory } from "../../types/gamification";
import { groupBadgesByCategory } from "../../utils/badgeCategories";
import BadgeHexagon from "../../components/gamification/BadgeHexagon";

const { width: screenWidth } = Dimensions.get("window");

interface Props {
  navigation: any;
}

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch();
  const { width: windowWidth } = useWindowDimensions();
  // On web the app renders inside AppFrame's centered phone frame (max 480px
  // wide) — use the frame width so buttons/cards don't balloon on desktop.
  const layoutWidth = Platform.OS === 'web' ? Math.min(windowWidth, 480) : windowWidth;
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentStreak, totalStreak, daysThisMonth } = useSelector(
    (state: RootState) => state.streak
  );
  const { hasSeenProfileGuide, completedActions } = useSelector((state: RootState) => state.tutorial);
  const [isInviteModalVisible, setInviteModalVisible] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isTogglingAutoRenew, setIsTogglingAutoRenew] = useState(false);
  const { isPremium, presentCustomerCenter } = useRevenueCat();

  // Delete/Disable account
  const [isAccountModalVisible, setAccountModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // Coach marks
  const [coachStep, setCoachStep] = useState(0);
  const [isCoachPaused, setIsCoachPaused] = useState(false);
  const showCoachMarks = !hasSeenProfileGuide && !isCoachPaused;

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

    // Log Appwrite data
  }, [user?.$id, dispatch]);

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

  const handleOpenTutorialHub = () => {
    dispatch(markTutorialActionCompleted('profile_tutorial_hub_opened'));
    setIsCoachPaused(false);
    navigation.navigate('TutorialHub');
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

  const isStoreManagedSubscription =
    subscription?.paymentProvider === 'apple_iap' ||
    subscription?.paymentProvider === 'google_play';

  const handleManageStoreSubscription = async () => {
    if (subscription?.paymentProvider === 'apple_iap') {
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
      return;
    }
    if (subscription?.paymentProvider === 'google_play') {
      await Linking.openURL('https://play.google.com/store/account/subscriptions');
      return;
    }

    Alert.alert('Unavailable', 'Manage this subscription in the store where it was purchased.');
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

  const handleDisableAccount = () => {
    Alert.alert(
      "Disable Account",
      "Your account will be disabled. You can contact support to reactivate it later. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            if (!user?.$id) return;
            setIsDisabling(true);
            setAccountModalVisible(false);
            try {
              await AuthService.disableAccount(user.$id);

              await AsyncStorage.removeItem('userId');

              dispatch(logout());

              Alert.alert(
                "Account Disabled",
                "Your account has been disabled. Contact support to reactivate it."
              );
            } catch (error: any) {
              console.error('Disable account error:', error);
              Alert.alert(
                "Error",
                error.message || "Failed to disable account. Please try again."
              );
            } finally {
              setIsDisabling(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Final Confirmation",
      "This will permanently delete your account and all your data, progress, and XP. This action cannot be undone. Are you absolutely sure?",
      [
        { text: "No, keep my account", style: "cancel" },
        {
          text: "Yes, delete permanently",
          style: "destructive",
          onPress: async () => {
            if (!user?.$id) return;
            setIsDeleting(true);
            setAccountModalVisible(false);
            try {
              await AuthService.deleteAccount(user.$id);

              await AsyncStorage.removeItem('userId');
              await AsyncStorage.removeItem(`subscription_cache_${user.$id}`);

              dispatch(logout());

              Alert.alert(
                "Account Deleted",
                "Your account and all associated data have been permanently deleted."
              );
            } catch (error: any) {
              console.error('Delete account error:', error);
              Alert.alert(
                "Error",
                error.message || "Failed to delete account. Please try again or contact support."
              );
            } finally {
              setIsDeleting(false);
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

  const getSubscriptionPlanLabel = () => {
    if (!subscription) return "No subscription";
    return subscription.planType === "annual" ? "Annual" : "Monthly";
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
                  <Text style={styles.statValue}>{currentStreak}</Text>
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
                      Completing a level also gives +1.
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
                <Text style={styles.subscriptionValue}>{getSubscriptionPlanLabel()}</Text>
              </View>

              {/* Cancel Button */}
              {subscription.status === "active" &&
                !isStoreManagedSubscription && (
                <TouchableOpacity
                  style={styles.cancelSubscriptionButton}
                  onPress={handleCancelSubscription}
                >
                  <Text style={styles.cancelSubscriptionText}>Cancel Subscription</Text>
                </TouchableOpacity>
              )}

              {subscription.status === "active" && isStoreManagedSubscription && (
                <TouchableOpacity
                  style={styles.renewButton}
                  onPress={presentCustomerCenter}
                >
                  <Ionicons name="settings-outline" size={16} color="#FF5722" style={{ marginRight: 6 }} />
                  <Text style={styles.renewButtonText}>Manage Subscription</Text>
                </TouchableOpacity>
              )}

              {/* RevenueCat Customer Center for premium users without an Appwrite record */}
              {!subscription && isPremium && (
                <TouchableOpacity
                  style={styles.renewButton}
                  onPress={presentCustomerCenter}
                >
                  <Ionicons name="settings-outline" size={16} color="#FF5722" style={{ marginRight: 6 }} />
                  <Text style={styles.renewButtonText}>Manage Subscription</Text>
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
            width: layoutWidth - 40,
          }}
        />

        {/* How to Play Button */}
        <TouchableOpacity
          style={styles.howToPlayButton}
          activeOpacity={0.7}
          onPress={handleOpenTutorialHub}
        >
          <Ionicons name="help-circle-outline" size={22} color="#FF5722" />
          <Text style={styles.howToPlayText}>How to Play</Text>
          <Ionicons name="chevron-forward" size={18} color="#CCC" />
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          activeOpacity={0.7}
          onPress={() => setAccountModalVisible(true)}
        >
          <Ionicons name="trash-outline" size={22} color="#F44336" />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
          <Ionicons name="chevron-forward" size={18} color="#CCC" />
        </TouchableOpacity>

        {/* Badges & Achievement */}
        <BadgesAchievementsSection navigation={navigation} />
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
        onNext={() => {
          const step = PROFILE_COACH_STEPS[coachStep];
          const canAdvance = canAdvanceTutorialStep({
            requiredActionKey: step?.requiredActionKey,
            completedActions,
          });

          if (!canAdvance) {
            setIsCoachPaused(true);
            Alert.alert('Try this first', step?.blockedMessage || 'Complete the highlighted action first.');
            return;
          }

          setCoachStep((prev) => prev + 1);
        }}
        onSkip={() => {
          dispatch(markProfileGuideSeen());
          setIsCoachPaused(false);
          setCoachStep(0);
        }}
        onComplete={() => {
          dispatch(markProfileGuideSeen());
          setIsCoachPaused(false);
          setCoachStep(0);
        }}
      />

      {/* Account Action Modal */}
      <Modal
        visible={isAccountModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.accountModalOverlay}
          activeOpacity={1}
          onPress={() => setAccountModalVisible(false)}
        >
          <View style={styles.accountModalContent}>
            <View style={styles.accountModalHandle} />
            <Text style={styles.accountModalTitle}>Account Settings</Text>
            <Text style={styles.accountModalSubtitle}>
              What would you like to do with your account?
            </Text>

            {/* Disable Option */}
            <TouchableOpacity
              style={styles.accountOptionCard}
              onPress={handleDisableAccount}
            >
              <View style={[styles.accountOptionIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="pause-circle-outline" size={24} color="#FF9800" />
              </View>
              <View style={styles.accountOptionInfo}>
                <Text style={styles.accountOptionTitle}>Disable Account</Text>
                <Text style={styles.accountOptionDesc}>
                  Temporarily disable your account. Your data will be preserved and you can reactivate by contacting support.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Delete Option */}
            <TouchableOpacity
              style={[styles.accountOptionCard, { borderColor: '#FFEBEE' }]}
              onPress={handleDeleteAccount}
            >
              <View style={[styles.accountOptionIcon, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="trash-outline" size={24} color="#F44336" />
              </View>
              <View style={styles.accountOptionInfo}>
                <Text style={[styles.accountOptionTitle, { color: '#F44336' }]}>
                  Delete Account Permanently
                </Text>
                <Text style={styles.accountOptionDesc}>
                  Permanently delete your account and all data including progress, XP, and streaks. This cannot be undone.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.accountModalCancel}
              onPress={() => setAccountModalVisible(false)}
            >
              <Text style={styles.accountModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Processing Overlay Modal */}
      <Modal
        visible={isDeleting || isDisabling}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color="#FF4500" />
            <Text style={styles.processingTitle}>
              {isDeleting ? 'Deleting Account' : 'Disabling Account'}
            </Text>
            <Text style={styles.processingSubtitle}>
              {isDeleting
                ? 'Please wait while we remove your data...'
                : 'Please wait while we disable your account...'}
            </Text>
          </View>
        </View>
      </Modal>
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
    gap: 12,
  },
  achievementCard: {
    minHeight: 108,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  achievementHexagonWrap: {
    marginRight: 12,
  },
  achievementHexagonLocked: {
    backgroundColor: "#E0E0E0",
    borderColor: "#BDBDBD",
  },
  achievementEmoji: {
    fontSize: 32,
  },
  achievementAsset: {
    width: "100%",
    height: "100%",
  },
  lockedFill: {
    width: "80%",
    height: "80%",
    backgroundColor: "#9E9E9E",
    borderRadius: 8,
    opacity: 0.3,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#333",
  },
  achievementNameLocked: {
    color: "#999",
  },
  achievementCategoryCopy: {
    flex: 1,
    paddingRight: 8,
  },
  achievementCategoryDescription: {
    color: "#687085",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  achievementCategoryCount: {
    color: "#3B5998",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  achievementPreviewRow: {
    flexDirection: "row",
    gap: 3,
    marginRight: 2,
  },
  achievementPreview: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  achievementPreviewImage: {
    width: "100%",
    height: "100%",
  },
  achievementPreviewLocked: {
    opacity: 0.4,
  },
  emptyBadgesContainer: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 220,
  },
  emptyBadgesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  goToLessonsButton: {
    backgroundColor: "#FF5722",
    width: "72%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  goToLessonsText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
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
  deleteAccountButton: {
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
  deleteAccountText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 12,
  },
  accountModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  accountModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
  },
  accountModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginBottom: 20,
  },
  accountModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  accountModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  accountOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  accountOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  accountOptionInfo: {
    flex: 1,
  },
  accountOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  accountOptionDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  accountModalCancel: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
  },
  accountModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  processingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

// ── Badges & Achievements Section ──────────────
const BADGE_CATEGORY_DETAILS: Record<BadgeCategory, {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  foreground: string;
  background: string;
}> = {
  JOURNEY: {
    title: "Journey",
    description: "Track your learning and growth",
    icon: "map-outline",
    foreground: "#527A2B",
    background: "#F3F8ED",
  },
  SECTION: {
    title: "Sections",
    description: "Master every money topic",
    icon: "book-outline",
    foreground: "#3478B9",
    background: "#EEF5FC",
  },
  CONSISTENCY: {
    title: "Consistency",
    description: "Build strong learning habits",
    icon: "flame-outline",
    foreground: "#D78612",
    background: "#FFF7EA",
  },
  ACHIEVEMENT: {
    title: "Achievements",
    description: "Milestones that show your progress",
    icon: "trophy-outline",
    foreground: "#245AA6",
    background: "#EDF3FA",
  },
  QUEST: {
    title: "Quests",
    description: "Complete tasks and earn rewards",
    icon: "ribbon-outline",
    foreground: "#8C4DB1",
    background: "#F7F0FC",
  },
};

const PROFILE_BADGE_CATEGORY_ORDER: BadgeCategory[] = [
  "ACHIEVEMENT",
  "JOURNEY",
  "QUEST",
  "SECTION",
  "CONSISTENCY",
];

const BadgesAchievementsSection: React.FC<{
  navigation: any;
}> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const badgeCatalogue = useSelector(
    (state: RootState) => state.gamification.badgeCatalogue
  );
  useFocusEffect(
    React.useCallback(() => {
      if (user?.$id) {
        dispatch(fetchBadgeCatalogue(user.$id));
      }
    }, [dispatch, user?.$id])
  );

  const groupedBadges = groupBadgesByCategory(badgeCatalogue);
  const categoryGroups = PROFILE_BADGE_CATEGORY_ORDER.map(
    (category) => groupedBadges.find((group) => group.category === category)!
  );

  return (
    <View style={styles.achievementsSection}>
      <Text style={styles.sectionTitle}>Badges & Achievements</Text>

      {badgeCatalogue.length === 0 ? (
        <View style={styles.emptyBadgesContainer}>
          <Text style={styles.emptyBadgesText}>No Badge/Achievement Yet</Text>
          <TouchableOpacity
            style={styles.goToLessonsButton}
            onPress={() => navigation.navigate("MainApp", { screen: "Home" })}
          >
            <Text style={styles.goToLessonsText}>Go To Lessons</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.achievementsGrid}>
          {categoryGroups.map((group) => {
            const details = BADGE_CATEGORY_DETAILS[group.category];
            return (
            <TouchableOpacity
              key={group.category}
              style={[styles.achievementCard, { backgroundColor: details.background }]}
              onPress={() => navigation.navigate("BadgeCatalogue", { category: group.category })}
              activeOpacity={0.7}
            >
              <View style={styles.achievementHexagonWrap}>
                <BadgeHexagon size={74} fill={details.foreground} borderColor={details.foreground}>
                  <Ionicons name={details.icon} size={28} color="#FFFFFF" />
                </BadgeHexagon>
              </View>
              <View style={styles.achievementCategoryCopy}>
                <Text style={styles.achievementName}>{details.title}</Text>
                <Text style={styles.achievementCategoryDescription}>{details.description}</Text>
                <Text style={[styles.achievementCategoryCount, { color: details.foreground }]}> 
                  {group.earnedCount}/{group.totalCount}
                </Text>
              </View>
              <View style={styles.achievementPreviewRow}>
                {[0, 1, 2].map((index) => {
                  const badge = group.items[index];
                  return (
                  <View key={badge?.badge_definition_id || `${group.category}-${index}`} style={styles.achievementPreview}>
                    <BadgeHexagon size={34} fill={badge?.is_earned ? details.foreground : "#687078"} borderColor="#9AA3AE">
                      {badge?.asset_reference ? (
                        <Image source={{ uri: badge.asset_reference }} style={styles.achievementPreviewImage} resizeMode="contain" />
                      ) : null}
                    </BadgeHexagon>
                  </View>
                  );
                })}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8A91A1" />
            </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

export default ProfileScreen;
