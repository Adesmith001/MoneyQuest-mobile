import React, { useState } from "react";
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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { PlanType, SUBSCRIPTION_PLANS } from "../../types/subscription";
import { koraPayService } from "../../services/korapayService";
import { subscriptionService } from "../../services/subscriptionService";

type RootStackParamList = {
  Premium: undefined;
  SchoolCodeEntry: undefined;
  PaymentPending: {
    reference: string;
    planType: "monthly" | "annual";
  };
  MainTabs: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const PremiumScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("annual");
  const [isLoading, setIsLoading] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  const handleStartTrial = async () => {
    if (!user) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    try {
      setIsLoading(true);

      // Check if user already has a subscription (including trial)
      const existingSubscription = await subscriptionService.getUserSubscription(user.$id);
      
      if (existingSubscription) {
        // User already has a subscription/trial - just navigate to app
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
        return;
      }

      // Create trial subscription only if user doesn't have one
      await subscriptionService.createTrialSubscription(user.$id);

      Alert.alert(
        "Trial Started! 🎉",
        "Enjoy 30 days of premium access for free!",
        [
          {
            text: "Get Started",
            onPress: () => {
              // Navigate to main app
              navigation.reset({
                index: 0,
                routes: [{ name: "MainTabs" }],
              });
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to start trial");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    if (!user.email || !user.name) {
      Alert.alert(
        "Error",
        "User information incomplete. Please update your profile."
      );
      return;
    }

    try {
      setIsLoading(true);

      // Check if user already has a subscription
      const existingSubscription = await subscriptionService.getUserSubscription(user.$id);
      
      if (!existingSubscription) {
        // Create trial subscription first only if user doesn't have one
        await subscriptionService.createTrialSubscription(user.$id);
      }

      // Update auto-renew preference
      if (existingSubscription) {
        await subscriptionService.toggleAutoRenew(user.$id, autoRenew);
      }

      // Initialize payment with KoraPay for after trial period
      const paymentResponse = await koraPayService.initializePayment(
        user.$id,
        selectedPlan,
        user.email,
        user.name
      );

      if (paymentResponse.status && paymentResponse.data.checkout_url) {
        // Open KoraPay checkout URL
        const supported = await Linking.canOpenURL(
          paymentResponse.data.checkout_url
        );

        if (supported) {
          await Linking.openURL(paymentResponse.data.checkout_url);

          // Navigate to payment pending screen
          navigation.navigate("PaymentPending", {
            reference: paymentResponse.data.reference,
            planType: selectedPlan,
          });
        } else {
          throw new Error("Cannot open payment URL");
        }
      } else {
        throw new Error("Failed to initialize payment");
      }
    } catch (error: any) {
      Alert.alert(
        "Payment Error",
        error.message || "Failed to initialize payment. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlanCard = (planType: PlanType) => {
    const plan = SUBSCRIPTION_PLANS[planType];
    const isSelected = selectedPlan === planType;

    return (
      <TouchableOpacity
        key={planType}
        style={[styles.planCard, isSelected && styles.planCardSelected]}
        onPress={() => setSelectedPlan(planType)}
        activeOpacity={0.7}
      >
        <View style={styles.planHeader}>
          <Text
            style={[styles.planTitle, isSelected && styles.planTitleSelected]}
          >
            {plan.name}
          </Text>
          {plan.bestValue && (
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>Best Value</Text>
            </View>
          )}
        </View>
        <Text
          style={[styles.planPrice, isSelected && styles.planPriceSelected]}
        >
          First 30 days free - Then ₦{plan.price.toLocaleString()}/
          {plan.duration}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleStartTrial}
          disabled={isLoading}
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

        {/* Plan Cards */}
        <View style={styles.plansContainer}>
          {renderPlanCard("monthly")}
          {renderPlanCard("annual")}
        </View>

        {/* Auto-Renew Toggle */}
        <View style={styles.autoRenewContainer}>
          <View style={styles.autoRenewTextContainer}>
            <Text style={styles.autoRenewLabel}>Auto-renew subscription</Text>
            <Text style={styles.autoRenewDesc}>
              {autoRenew
                ? "You'll be charged automatically when your plan expires"
                : "You'll need to manually renew when your plan expires"}
            </Text>
          </View>
          <Switch
            value={autoRenew}
            onValueChange={setAutoRenew}
            trackColor={{ false: "rgba(255,255,255,0.3)", true: "#4ECDC4" }}
            thumbColor={autoRenew ? "#FFF" : "#f4f3f4"}
          />
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
          onPress={handleSubscribe}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FF6B35" />
          ) : (
            <Text style={styles.ctaButtonText}>Start 30-day free trial</Text>
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
  plansContainer: {
    marginBottom: 20,
    gap: 16,
  },
  planCard: {
    backgroundColor: "rgba(68, 68, 68, 0.9)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "transparent",
  },
  planCardSelected: {
    borderColor: "#4ECDC4",
    backgroundColor: "rgba(68, 68, 68, 1)",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFF",
  },
  planTitleSelected: {
    color: "#4ECDC4",
  },
  bestValueBadge: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestValueText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  planPrice: {
    fontSize: 15,
    color: "#FFF",
    opacity: 0.8,
  },
  planPriceSelected: {
    opacity: 1,
  },
  ctaButton: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  termsContainer: {
    paddingHorizontal: 10,
  },
  termsText: {
    fontSize: 12,
    color: "#FFF",
    textAlign: "center",
    lineHeight: 18,
    opacity: 0.8,
  },
  termsLink: {
    color: "#FFD93D",
    fontWeight: "600",
  },
  schoolCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
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
  autoRenewContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  autoRenewTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  autoRenewLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
  autoRenewDesc: {
    fontSize: 12,
    color: "#FFF",
    opacity: 0.7,
    marginTop: 2,
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
