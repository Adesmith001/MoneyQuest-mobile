import React, { useState, useEffect, useCallback } from "react";
import ErrorNotice from '../../components/ErrorNotice';
import { showErrorAlert } from '../../services/errorAlerts';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { PurchasesPackage } from "react-native-purchases";
import { AppDispatch, RootState } from "../../store";
import { signOut } from "../../store/slices/authSlice";
import { subscriptionService } from "../../services/subscriptionService";
import paymentService from "../../services/paymentService";
import revenueCatService, {
  RevenueCatPackageState,
} from "../../services/revenueCatService";
import {
  PaymentProvider,
  PlanType,
  SUBSCRIPTION_PLANS,
} from "../../types/subscription";
import { useRevenueCat } from "../../hooks/useRevenueCat";
import analyticsService from "../../services/analytics";
import { captureIncident, recordBreadcrumb } from "../../services/errorMonitor";

type RootStackParamList = {
  Premium: undefined;
  SchoolCodeEntry: undefined;
  MainTabs: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const PremiumScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoggingOut } = useSelector((state: RootState) => state.auth);

  const { refreshCustomerInfo } = useRevenueCat();

  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [isRCLoading, setIsRCLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("monthly");
  const [isKorapayLoading, setIsKorapayLoading] = useState(false);
  const [korapayError, setKorapayError] = useState<string | null>(null);
  // RevenueCat offerings — used to show localised store prices
  const [rcPackages, setRcPackages] = useState<Record<PlanType, PurchasesPackage | null>>({
    monthly: null,
    annual: null,
  });
  const [hasLoadedStorePackages, setHasLoadedStorePackages] = useState(false);
  const [storeErrorMessage, setStoreErrorMessage] = useState<string | null>(null);
  const selectedPlanConfig = SUBSCRIPTION_PLANS[selectedPlan];

  const loadStorePackages = useCallback(async (): Promise<RevenueCatPackageState> => {
    const packageState = await revenueCatService.getPackageState();
    if (packageState.errorMessage) {
      console.warn("RevenueCat store packages unavailable:", packageState.errorMessage);
    }
    setRcPackages({
      monthly: packageState.monthly,
      annual: packageState.annual,
    });
    setStoreErrorMessage(packageState.errorMessage);
    setHasLoadedStorePackages(true);
    return packageState;
  }, []);

  useEffect(() => {
    // Load RevenueCat offerings on both iOS and Android for store prices.
    if (!revenueCatService.isConfigured()) {
      setHasLoadedStorePackages(true);
      return;
    }
    void loadStorePackages();
  }, [loadStorePackages]);

  useEffect(() => {
    analyticsService.identifyUser(user?.$id || null);
    analyticsService
      .trackEvent('paywall_viewed', {
        selected_plan: selectedPlan,
      }, {
        screenName: 'Premium',
        featureName: 'paywall',
        valueText: selectedPlan,
      })
      .catch(() => {});
  }, [user?.$id]);

  const handleStartTrial = async () => {
    recordBreadcrumb('checkout_started');
    if (!user) {
      showErrorAlert("Trial unavailable", "User not found. Please log in again.");
      return;
    }

    setIsStartingTrial(true);
    try {
      await analyticsService.trackEvent('checkout_started', {
        checkout_type: 'trial',
        selected_plan: selectedPlan,
      }, {
        screenName: 'Premium',
        featureName: 'trial',
        valueText: selectedPlan,
      });
      const existing = await subscriptionService.getUserSubscription(user.$id);
      if (!existing) {
        await subscriptionService.createTrialSubscription(user.$id);
      }
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } catch (err: any) {
      void captureIncident(err, { flow: 'purchase', stage: 'trial_start',
        action: 'checkout_failed', severity: 'error', screen: 'Premium' });
      showErrorAlert("Couldn’t start trial", err.message || "Could not start free trial. Please try again.");
    } finally {
      setIsStartingTrial(false);
    }
  };

  /**
   * Purchase the currently selected package using the native App Store / Google
   * Play flow while keeping this custom screen as the checkout UI.
   */
  const handleStoreSubscription = async () => {
    recordBreadcrumb('checkout_started');
    if (!user) {
      showErrorAlert("Purchase unavailable", "User not found. Please log in again.");
      return;
    }

    if (!revenueCatService.isConfigured()) {
      showErrorAlert("Purchase Unavailable", "Store purchases are not available right now.");
      return;
    }

    setIsRCLoading(true);
    try {
      await analyticsService.trackEvent('checkout_started', {
        checkout_type: 'store_purchase',
        selected_plan: selectedPlan,
        platform: Platform.OS,
      }, {
        screenName: 'Premium',
        featureName: 'store_checkout',
        valueText: selectedPlan,
      });
      let selectedPackage = rcPackages[selectedPlan];
      let packageState: RevenueCatPackageState | null = null;

      if (!selectedPackage) {
        packageState = await loadStorePackages();
        selectedPackage = packageState[selectedPlan];
      }

      if (!selectedPackage) {
        showErrorAlert(
          "Store Subscription Unavailable",
          packageState?.errorMessage ||
            storeErrorMessage ||
            "The selected store plan is not available right now."
        );
        return;
      }

      const customerInfo = await revenueCatService.purchasePackage(selectedPackage);
      await refreshCustomerInfo();

      if (!revenueCatService.hasActiveEntitlement(customerInfo)) {
        showErrorAlert("Purchase Pending", "Your subscription is still being confirmed. Please try again shortly.");
        return;
      }

      // Sync the verified purchase with Appwrite
      try {
        const productId = revenueCatService.getOriginalTransactionId(customerInfo);
        const expirationDate = revenueCatService.getExpirationDate(customerInfo);
        const provider: PaymentProvider =
          Platform.OS === "ios" ? "apple_iap" : "google_play";

        await subscriptionService.activateProviderSubscription(user.$id, {
          planType: selectedPlan,
          provider,
          transactionReference: productId,
          autoRenew: true,
          subscriptionEndDate: expirationDate ?? undefined,
        });
      } catch (syncErr) {
        // Non-blocking — RevenueCat is the source of truth for store purchases
        console.warn("Store purchase → Appwrite sync failed:", syncErr);
        void captureIncident(syncErr, { flow: 'purchase', stage: 'entitlement_sync',
          action: 'entitlement_sync_failed', severity: 'warning', screen: 'Premium' });
      }

      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } catch (err: any) {
      if (err?.userCancelled) {
        return;
      }
      void captureIncident(err, { flow: 'purchase', stage: 'store_checkout',
        action: 'checkout_failed', severity: 'error', screen: 'Premium' });
      showErrorAlert("Purchase Error", err.message || "Unable to complete purchase.");
    } finally {
      setIsRCLoading(false);
    }
  };

  const handleRestoreStorePurchases = async () => {
    recordBreadcrumb('purchase_restore_started');
    setIsRestoring(true);
    try {
      const customerInfo = await revenueCatService.restorePurchases();
      if (revenueCatService.hasActiveEntitlement(customerInfo)) {
        await refreshCustomerInfo();
        try {
          const productId = revenueCatService.getOriginalTransactionId(customerInfo);
          const idLower = productId.toLowerCase();
          const planType: PlanType =
            idLower.includes("annual") || idLower.includes("yearly") ? "annual" : "monthly";
          const provider: PaymentProvider =
            Platform.OS === "ios" ? "apple_iap" : "google_play";

          const expirationDate = revenueCatService.getExpirationDate(customerInfo);
          await subscriptionService.activateProviderSubscription(user!.$id, {
            planType,
            provider,
            transactionReference: productId,
            autoRenew: true,
            subscriptionEndDate: expirationDate ?? undefined,
          });
        } catch (syncErr) {
          console.warn("Store restore → Appwrite sync failed:", syncErr);
          void captureIncident(syncErr, { flow: 'purchase', stage: 'restore_entitlement_sync',
            action: 'entitlement_sync_failed', severity: 'warning', screen: 'Premium' });
        }
        await analyticsService.trackEvent('subscription_restore_succeeded', {
          payment_provider: Platform.OS === 'ios' ? 'apple_iap' : 'google_play',
        }, {
          screenName: 'Premium',
          featureName: 'restore_purchases',
        });
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
        return;
      }
      showErrorAlert("Restore Purchases", "No active purchases found.");
    } catch (err: any) {
      void captureIncident(err, { flow: 'purchase', stage: 'store_restore',
        action: 'purchase_restore_failed', severity: 'error', screen: 'Premium' });
      showErrorAlert("Restore Purchases", err.message || "Failed to restore purchases.");
    } finally {
      setIsRestoring(false);
    }
  };

  const isSelectedPlanStoreReady = Boolean(rcPackages[selectedPlan]);
  const isStoreButtonDisabled =
    isRCLoading || (hasLoadedStorePackages && !isSelectedPlanStoreReady);

  /**
   * Web-only KoraPay card checkout. The modal reports success synchronously;
   * the deployed webhook also activates the subscription server-side as a
   * backup. Mobile keeps store-only billing (external checkout is blocked).
   */
  const handleKorapayPayment = async () => {
    recordBreadcrumb('checkout_started');
    if (!user) {
      setKorapayError("User not found. Please log in again.");
      return;
    }

    setIsKorapayLoading(true);
    setKorapayError(null);
    try {
      await analyticsService.trackEvent('checkout_started', {
        checkout_type: 'korapay_web',
        selected_plan: selectedPlan,
        platform: 'web',
      }, {
        screenName: 'Premium',
        featureName: 'korapay_checkout',
        valueText: selectedPlan,
      });

      const result = await paymentService.startCheckout({
        userId: user.$id,
        planType: selectedPlan,
        provider: 'korapay',
        userEmail: user.email,
        userName: user.name,
      });

      if (result.status === 'completed' && result.reference) {
        await subscriptionService.activateProviderSubscription(user.$id, {
          provider: 'korapay',
          planType: selectedPlan,
          transactionReference: result.reference,
          autoRenew: false,
        });
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      } else {
        setKorapayError(result.message || "Payment was not completed.");
      }
    } catch (err: any) {
      void captureIncident(err, { flow: 'purchase', stage: 'web_checkout',
        action: 'checkout_failed', severity: 'error', screen: 'Premium' });
      setKorapayError(err?.message || "Payment failed. Please try again.");
    } finally {
      setIsKorapayLoading(false);
    }
  };

  const handleSchoolCodePress = () => {
    analyticsService.trackFeatureUsage('school_code_entry_opened', {
      source: 'premium_screen',
    }).catch(() => {});
    navigation.navigate("SchoolCodeEntry");
  };

  const confirmSignOut = async () => {
    try {
      await dispatch(signOut()).unwrap();
    } catch (error: any) {
      showErrorAlert("Sign Out Failed", error?.message || "Please try again.");
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Switch account?",
      "Sign out so you can use a different MoneyQuest account.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: confirmSignOut },
      ],
    );
  };

  const selectedPlanPriceLabel = rcPackages[selectedPlan]?.product.priceString
    || `NGN ${selectedPlanConfig.price.toLocaleString()}`;
  const trialDisclosure = `14-day free trial, then ${selectedPlanPriceLabel}/${selectedPlanConfig.billingCycle} unless canceled before renewal.`;
  const unavailablePlanMessage = hasLoadedStorePackages && !isSelectedPlanStoreReady
    ? storeErrorMessage || `This ${Platform.OS === "ios" ? "App Store" : "Google Play"} plan is not available right now.`
    : null;

  const handleClose = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("MainTabs");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === "web" && styles.webScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close premium screen"
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Get Premium</Text>
            <Text style={styles.subtitle}>
              Start your subscription in-app and get full access to MoneyQuest's premium learning experience.
            </Text>
          </View>

          {/* Mascot Image */}
          <Image
            source={require(`../../../assets/fox.png`)}
            style={styles.foxImage}
          />

          {/* Features List */}
          <View style={styles.featuresContainer}>
            {[
              { icon: "book-outline" as const, text: "Unlimited access to all lessons" },
              { icon: "bar-chart-outline" as const, text: "Progress tracking & analytics" },
              { icon: "game-controller-outline" as const, text: "Gamified learning experience" },
              { icon: "star-outline" as const, text: "Exclusive content & early access" },
            ].map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons name={feature.icon} size={20} color="#4ECDC4" />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.planSection}>
            <Text style={styles.planSectionTitle}>Choose your plan</Text>
            <View style={styles.planGrid}>
              {(Object.entries(SUBSCRIPTION_PLANS) as [PlanType, (typeof SUBSCRIPTION_PLANS)[PlanType]][]).map(
                ([planKey, plan]) => {
                  const isSelected = selectedPlan === planKey;
                  return (
                    <TouchableOpacity
                      key={planKey}
                      style={[
                        styles.planCard,
                        isSelected && styles.planCardSelected,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => setSelectedPlan(planKey)}
                    >
                      <View style={styles.planHeaderRow}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        {plan.bestValue ? (
                          <View style={styles.bestValueBadge}>
                            <Text style={styles.bestValueText}>Best value</Text>
                          </View>
                        ) : null}
                      </View>
                      {/* Show store price if RevenueCat loaded it, else NGN */}
                      {rcPackages[planKey] ? (
                        <Text style={styles.planPrice}>
                          {rcPackages[planKey]!.product.priceString}
                        </Text>
                      ) : (
                        <Text style={styles.planPrice}>NGN {plan.price.toLocaleString()}</Text>
                      )}
                      <Text style={styles.planDuration}>per {plan.duration.toLowerCase()}</Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </View>

          <View style={styles.paymentOptionsSection}>
            <Text style={styles.paymentOptionsTitle}>Complete your subscription</Text>

            {/* ── Direct store purchase (App Store / Google Play) ──────────── */}
            {revenueCatService.isConfigured() ? (
              <TouchableOpacity
                style={[
                  styles.subscribeButton,
                  isStoreButtonDisabled && styles.paymentButtonDisabled,
                ]}
                onPress={handleStoreSubscription}
                activeOpacity={0.85}
                disabled={isStoreButtonDisabled}
              >
                {isRCLoading ? (
                  <ActivityIndicator color="#7A3D00" size="small" />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={20} color="#7A3D00" />
                    <Text style={styles.subscribeButtonText}>Subscribe & Pay</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            {/* ── KoraPay card checkout (web only) ────────────────────────── */}
            {Platform.OS === 'web' ? (
              <TouchableOpacity
                style={styles.korapayButton}
                onPress={handleKorapayPayment}
                activeOpacity={0.85}
                disabled={isKorapayLoading}
              >
                {isKorapayLoading ? (
                  <ActivityIndicator color="#1A1A1A" size="small" />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={20} color="#1A1A1A" />
                    <Text style={styles.korapayButtonText}>Pay with Card</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            <ErrorNotice
              title="Card payment problem"
              message={korapayError}
              onDismiss={() => setKorapayError(null)}
            />

            {/* ── Restore Purchases ────────────────────────────────────────── */}
            {revenueCatService.isConfigured() ? (
              <>
                <ErrorNotice
                  key={selectedPlan}
                  title="Store plan unavailable"
                  message={unavailablePlanMessage}
                />
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestoreStorePurchases}
                activeOpacity={0.8}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                )}
              </TouchableOpacity>
              </>
            ) : null}

            <Text style={styles.storeComplianceNote}>
              Subscriptions are processed through the in-app store on this device.
            </Text>
            <Text style={styles.trialDisclosureText}>{trialDisclosure}</Text>
          </View>

          {/* Free Trial CTA */}
          <TouchableOpacity
            style={styles.freeTrialButton}
            onPress={handleStartTrial}
            disabled={isStartingTrial}
            activeOpacity={0.8}
          >
            {isStartingTrial ? (
              <ActivityIndicator color="#FF6B35" size="small" />
            ) : (
              <>
                <Ionicons name="gift-outline" size={20} color="#FF6B35" />
                <Text style={styles.freeTrialButtonText}>Start 14-Day Free Trial</Text>
              </>
            )}
          </TouchableOpacity>

          {/* School Code Option */}
          <TouchableOpacity
            style={styles.schoolCodeButton}
            onPress={handleSchoolCodePress}
            activeOpacity={0.7}
          >
            <Ionicons name="school-outline" size={20} color="#FFF" />
            <Text style={styles.schoolCodeText}>Join with school code</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFF" />
          </TouchableOpacity>

          {/* Privacy Policy & Terms */}
          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>
              By continuing, you agree to our{" "}
              <Text
                style={styles.legalLink}
                onPress={() =>
                  Linking.openURL(
                    "https://www.nurtureehaven.com/termsandcondition"
                  )
                }
              >
                Terms of Use
              </Text>{" "}
              and{" "}
              <Text
                style={styles.legalLink}
                onPress={() =>
                  Linking.openURL(
                    "https://www.nurtureehaven.com/privacy-policy"
                  )
                }
              >
                Privacy Policy
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Sign out to use another account"
            style={styles.signOutButton}
            onPress={handleSignOut}
            disabled={isLoggingOut}
            activeOpacity={0.75}
          >
            {isLoggingOut ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color="#FFF" />
                <Text style={styles.signOutButtonText}>Sign out to use another account</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF6B35",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  webScrollContent: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  closeButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    marginBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#FFF",
    textAlign: "center",
    opacity: 0.9,
    lineHeight: 22,
  },
  foxImage: {
    width: 220,
    height: 220,
    alignSelf: "center",
    resizeMode: "contain",
    marginBottom: 8,
  },
  featuresContainer: {
    backgroundColor: "rgba(68, 68, 68, 0.9)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: "#FFF",
    flex: 1,
  },
  paymentButtonDisabled: {
    opacity: 0.55,
  },
  planSection: {
    marginBottom: 20,
  },
  planSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 12,
  },
  planGrid: {
    gap: 12,
  },
  planCard: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  planCardSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderColor: "#FFD93D",
  },
  planHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  planPrice: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF",
  },
  planDuration: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  bestValueBadge: {
    backgroundColor: "#FFD93D",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7A3D00",
  },
  paymentOptionsSection: {
    marginBottom: 20,
    gap: 12,
  },
  paymentOptionsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  subscribeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD93D",
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(122, 61, 0, 0.2)",
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#7A3D00",
  },
  restoreButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  restoreButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
  storeComplianceNote: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: 18,
  },
  trialDisclosureText: {
    fontSize: 12,
    color: "#FFF4D6",
    lineHeight: 18,
  },
  korapayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
  },
  korapayButtonText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  schoolCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    gap: 8,
  },
  schoolCodeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
  freeTrialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  freeTrialButtonText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  legalContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  legalText: {
    fontSize: 12,
    color: "#FFF",
    textAlign: "center",
    lineHeight: 18,
    opacity: 0.8,
  },
  legalLink: {
    color: "#FFD93D",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.65)",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  signOutButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default PremiumScreen;
