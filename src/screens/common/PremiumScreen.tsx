import React, { useState, useEffect } from "react";
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
import { useSelector } from "react-redux";
import { PACKAGE_TYPE, PurchasesPackage } from "react-native-purchases";
import { RootState } from "../../store";
import { subscriptionService } from "../../services/subscriptionService";
import revenueCatService from "../../services/revenueCatService";
import {
  PaymentProvider,
  PlanType,
  SUBSCRIPTION_PLANS,
} from "../../types/subscription";
import { useRevenueCat } from "../../hooks/useRevenueCat";

type RootStackParamList = {
  Premium: undefined;
  SchoolCodeEntry: undefined;
  PremiumCodeEntry: undefined;
  MainTabs: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const PremiumScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);

  const { presentPaywall: rcPresentPaywall, refreshCustomerInfo } = useRevenueCat();

  const [isStartingTrial, setIsStartingTrial] = useState(false);
  const [isRCLoading, setIsRCLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("monthly");
  // RevenueCat offerings — used to show localised store prices
  const [rcPackages, setRcPackages] = useState<Record<PlanType, PurchasesPackage | null>>({
    monthly: null,
    annual: null,
  });

  useEffect(() => {
    // Load RevenueCat offerings on both iOS and Android for store prices
    if (revenueCatService.isConfigured()) {
      revenueCatService
        .getOfferings()
        .then((offerings) => {
          const pkgs = offerings.current?.availablePackages ?? [];
          setRcPackages({
            monthly:
              pkgs.find(
                (p) =>
                  p.packageType === PACKAGE_TYPE.MONTHLY ||
                  p.product.identifier.includes("month")
              ) ?? null,
            annual:
              pkgs.find(
                (p) =>
                  p.packageType === PACKAGE_TYPE.ANNUAL ||
                  p.product.identifier.includes("annual")
              ) ?? null,
          });
        })
        .catch(() => {}); // Fallback to NGN prices on error
    }
  }, []);

  const handleStartTrial = async () => {
    if (!user) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    setIsStartingTrial(true);
    try {
      const existing = await subscriptionService.getUserSubscription(user.$id);
      if (!existing) {
        await subscriptionService.createTrialSubscription(user.$id);
      }
      navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not start free trial. Please try again.");
    } finally {
      setIsStartingTrial(false);
    }
  };

  /**
   * Open the RevenueCat native Paywall — handles plan selection, payment, and
   * receipt validation inside the RC UI. On success, sync the result to Appwrite.
   */
  const handleRevenueCatPaywall = async () => {
    if (!user) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }
    setIsRCLoading(true);
    try {
      const purchased = await rcPresentPaywall();
      if (purchased) {
        // Sync the verified purchase with Appwrite
        try {
          const customerInfo = await revenueCatService.getCustomerInfo();
          const productId = revenueCatService.getOriginalTransactionId(customerInfo);
          const idLower = productId.toLowerCase();
          const planType: PlanType =
            idLower.includes("annual") || idLower.includes("yearly") ? "annual" : "monthly";
          const provider: PaymentProvider =
            Platform.OS === "ios" ? "apple_iap" : "google_play";

          await subscriptionService.activateProviderSubscription(user.$id, {
            planType,
            provider,
            transactionReference: productId,
            autoRenew: true,
          });
        } catch (syncErr) {
          // Non-blocking — RevenueCat is the source of truth for store purchases
          console.warn("RC → Appwrite sync failed:", syncErr);
        }
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
      }
    } catch (err: any) {
      Alert.alert("Purchase Error", err.message || "Unable to complete purchase.");
    } finally {
      setIsRCLoading(false);
    }
  };

  const handleRestoreStorePurchases = async () => {
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

          await subscriptionService.activateProviderSubscription(user!.$id, {
            planType,
            provider,
            transactionReference: productId,
            autoRenew: true,
          });
        } catch (syncErr) {
          console.warn("Store restore → Appwrite sync failed:", syncErr);
        }
        navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
        return;
      }
      Alert.alert("Restore Purchases", "No active purchases found.");
    } catch (err: any) {
      Alert.alert("Restore Purchases", err.message || "Failed to restore purchases.");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleStartTrial}
            disabled={isStartingTrial}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Get Premium</Text>
            <Text style={styles.subtitle}>
              Unlock all the power of this mobile tool and enjoy digital
              experience like never before!
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
            <Text style={styles.paymentOptionsTitle}>Choose how to pay</Text>

            {/* ── RevenueCat Paywall (App Store / Google Play) ─────────────── */}
            {revenueCatService.isConfigured() ? (
              <TouchableOpacity
                style={[
                  Platform.OS === "ios" ? styles.appleButton : styles.googlePlayButton,
                  isRCLoading && styles.paymentButtonDisabled,
                ]}
                onPress={handleRevenueCatPaywall}
                activeOpacity={0.85}
                disabled={isRCLoading}
              >
                {isRCLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={Platform.OS === "ios" ? "logo-apple" : "logo-google"}
                      size={20}
                      color="#FFF"
                    />
                    <Text
                      style={
                        Platform.OS === "ios" ? styles.appleButtonText : styles.googlePlayButtonText
                      }
                    >
                      {Platform.OS === "ios"
                        ? "Subscribe with App Store"
                        : "Subscribe with Google Play"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            {/* ── Restore Purchases ────────────────────────────────────────── */}
            {revenueCatService.isConfigured() ? (
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
            ) : null}

            <Text style={styles.storeComplianceNote}>
              Subscriptions are processed through the in-app store on this device.
            </Text>
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
                <Text style={styles.freeTrialButtonText}>Start 30-Day Free Trial</Text>
              </>
            )}
          </TouchableOpacity>

          {/* School Code Option */}
          <TouchableOpacity
            style={styles.schoolCodeButton}
            onPress={() => navigation.navigate("SchoolCodeEntry")}
            activeOpacity={0.7}
          >
            <Ionicons name="school-outline" size={20} color="#FFF" />
            <Text style={styles.schoolCodeText}>Have a school code?</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.premiumCodeButton}
            onPress={() => navigation.navigate("PremiumCodeEntry")}
            activeOpacity={0.7}
          >
            <Ionicons name="ticket-outline" size={20} color="#FFD93D" />
            <Text style={styles.premiumCodeText}>Have a premium code?</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFD93D" />
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
                Terms & Conditions
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
  closeButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    marginBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 42,
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
    width: 341,
    height: 342,
    left: 35,
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
    opacity: 0.65,
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
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
  },
  appleButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  googlePlayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A73E8",
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
  },
  googlePlayButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
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
  premiumCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 217, 61, 0.14)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 217, 61, 0.45)",
    gap: 8,
    marginTop: 10,
  },
  premiumCodeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFD93D",
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
});

export default PremiumScreen;
