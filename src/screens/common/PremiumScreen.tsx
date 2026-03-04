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
  TextInput,
  KeyboardAvoidingView,
  Platform,
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

  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isStartingTrial, setIsStartingTrial] = useState(false);

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

  /** Opens the subscription page in the browser */
  const handleSubscribe = async () => {
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

    try {
      await Linking.openURL(`${baseUrl}?${params.toString()}`);
    } catch {
      Alert.alert("Error", "Could not open the browser. Please try again.");
    }
  };

  /** Redeem the premium code the user received after payment */
  const handleRedeemCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert("Error", "Please enter your premium code.");
      return;
    }
    if (!user) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    setIsRedeeming(true);
    try {
      const result = await subscriptionService.redeemPremiumCode(
        user.$id,
        trimmed
      );

      if (result.success) {
        Alert.alert("Premium Activated! 🎉", "Enjoy unlimited learning!", [
          {
            text: "Let's Go",
            onPress: () =>
              navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] }),
          },
        ]);
      } else {
        Alert.alert("Invalid Code", result.message);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to redeem code.");
    } finally {
      setIsRedeeming(false);
    }
  };

  /** Format code input — auto-uppercase, alphanumeric + dash only */
  const handleCodeChange = (text: string) => {
    setCode(text.toUpperCase().replace(/[^A-Z0-9-]/g, ""));
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

          {/* Step 1 — Subscribe on Web */}
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            activeOpacity={0.8}
          >
            <Ionicons name="card-outline" size={20} color="#1A1A1A" />
            <Text style={styles.subscribeButtonText}>Manage Subscription</Text>
          </TouchableOpacity>

          {/* Step 2 — Enter Premium Code */}
          <View style={styles.codeSection}>
            <Text style={styles.codeSectionTitle}>
              Enter your code
            </Text>
            <View style={styles.codeRow}>
              <TextInput
                style={styles.codeInput}
                placeholder="MQP-XXXXXX"
                placeholderTextColor="#999"
                value={code}
                onChangeText={handleCodeChange}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={10}
                returnKeyType="done"
                onSubmitEditing={handleRedeemCode}
              />
              <TouchableOpacity
                style={[
                  styles.redeemButton,
                  (!code.trim() || isRedeeming) && styles.redeemButtonDisabled,
                ]}
                onPress={handleRedeemCode}
                disabled={!code.trim() || isRedeeming}
                activeOpacity={0.8}
              >
                {isRedeeming ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.redeemButtonText}>Redeem</Text>
                )}
              </TouchableOpacity>
            </View>
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
  subscribeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  codeSection: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  codeSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    marginBottom: 10,
    textAlign: "center",
  },
  codeRow: {
    flexDirection: "row",
    gap: 10,
  },
  codeInput: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    letterSpacing: 1,
  },
  redeemButton: {
    backgroundColor: "#4ECDC4",
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  redeemButtonDisabled: {
    opacity: 0.5,
  },
  redeemButtonText: {
    fontSize: 15,
    fontWeight: "bold",
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
