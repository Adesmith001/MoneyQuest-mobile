import React, { useState, useEffect, useRef } from "react";
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
  Platform,
  AppState,
  AppStateStatus,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { subscriptionService } from "../../services/subscriptionService";

type RootStackParamList = {
  Premium: undefined;
  SchoolCodeEntry: undefined;
  MainTabs: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const PremiumScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(false);
  const appState = useRef(AppState.currentState);

  // Re-check subscription when user returns to app
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active" &&
        user?.$id
      ) {
        try {
          const sub = await subscriptionService.getUserSubscription(user.$id);
          if (sub && sub.status === "active") {
            Alert.alert(
              "Welcome Back! 🎉",
              "Your premium access is active. Enjoy unlimited learning!",
              [
                {
                  text: "Continue",
                  onPress: () => {
                    navigation.reset({
                      index: 0,
                      routes: [{ name: "MainTabs" }],
                    });
                  },
                },
              ]
            );
          }
        } catch (_) {
          // Silently fail
        }
      }
      appState.current = nextState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [user?.$id]);

  const handleStartTrial = async () => {
    if (!user) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    try {
      setIsLoading(true);

      const existingSubscription =
        await subscriptionService.getUserSubscription(user.$id);

      if (existingSubscription) {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
        return;
      }

      await subscriptionService.createTrialSubscription(user.$id);

      Alert.alert(
        "Trial Started! 🎉",
        "Enjoy 30 days of premium access for free!",
        [
          {
            text: "Get Started",
            onPress: () => {
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

  /** Opens the subscription management page in the browser */
  const handleManageSubscription = async () => {
    if (!user) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    const baseUrl = "https://moneyquestschooldashboard.vercel.app/subscribe";
    const params = new URLSearchParams({
      userId: user.$id,
      email: user.email || "",
      name: user.name || "",
    });

    const url = `${baseUrl}?${params.toString()}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open the browser. Please try again.");
    }
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

        {/* CTA — Start Free Trial */}
        <TouchableOpacity
          style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
          onPress={handleStartTrial}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FF6B35" />
          ) : (
            <Text style={styles.ctaButtonText}>Start 30-day free trial</Text>
          )}
        </TouchableOpacity>

        {/* Manage Subscription */}
        <TouchableOpacity
          style={styles.manageButton}
          onPress={handleManageSubscription}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={18} color="#FFF" />
          <Text style={styles.manageText}>Manage your subscription</Text>
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
  ctaButton: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 14,
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
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  manageText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
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
