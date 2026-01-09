import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from "react-redux";
import { signOut, updateUser } from "../../store/slices/authSlice";
import { RootState, AppDispatch } from "../../store";
import CustomButton from "../../components/CustomButton";
import { getAvatarById } from "../../utils/avatarUtils";
import { databases, DB_ID, COLLECTIONS } from "../../services/appwrite";
import NotificationService from "../../services/notifications";
import soundService from "../../services/soundService";
import { Platform, Linking } from 'react-native';

interface Props {
  navigation: any;
}

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  // Editable form state
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");

  // Load current settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      // Load notification status
      const permissionStatus = await NotificationService.getPermissionsStatus();
      setNotificationEnabled(permissionStatus === 'granted');

      // Load sound status
      const soundStatus = soundService.getSoundEnabled();
      setSoundEnabled(soundStatus);
    };

    loadSettings();
  }, []);

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      // Request permissions
      setIsLoadingPermissions(true);
      const granted = await NotificationService.requestPermissions();
      setIsLoadingPermissions(false);

      if (granted) {
        setNotificationEnabled(true);
        // Schedule daily reminders
        await NotificationService.scheduleDailyReminder();
        Alert.alert('Success', 'Notifications enabled! You will receive daily reminders.');
      } else {
        setNotificationEnabled(false);
        Alert.alert(
          'Permission Denied',
          'Please enable notifications in your device settings to receive reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // Open app settings (platform specific)
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
      }
    } else {
      // Disable notifications
      await NotificationService.cancelAllNotifications();
      setNotificationEnabled(false);
      Alert.alert('Disabled', 'Notifications have been turned off.');
    }
  };

  const handleSoundToggle = (value: boolean) => {
    setSoundEnabled(value);
    soundService.setSoundEnabled(value);
    
    // Play a test sound when enabling
    if (value) {
      soundService.playSound('click');
    }
  };

  const handleSave = async () => {
    if (!user?.$id) return;

    try {
      // Update user data in Appwrite
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, user.$id, {
        name,
        username,
        email,
        updatedAt: new Date().toISOString(),
      });

      // Update Redux store
      dispatch(updateUser({ name, username, email }));

      Alert.alert("Success", "Profile updated successfully!");
      navigation.goBack();
    } catch (error) {
      console.error("Failed to update profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => dispatch(signOut()),
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Implement account deletion logic
            Alert.alert("Coming Soon", "Account deletion will be implemented soon.");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => navigation.navigate("ChangeAvatar")}
          >
            <View style={styles.avatarBackground}>
              <Image
                source={getAvatarById(user?.avatar || "")}
                style={styles.avatar}
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("ChangeAvatar")}>
            <Text style={styles.changeAvatarText}>Change Avatar</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Fields */}
        <View style={styles.formContainer}>
          <View style={styles.inputRow}>
            <Text style={styles.label}>Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Name"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingsContainer}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Notification</Text>
            <Switch
              value={notificationEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: "#E0E0E0", true: "#FF4500" }}
              thumbColor={"#FFFFFF"}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Sound</Text>
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: "#E0E0E0", true: "#FF4500" }}
              thumbColor={"#FFFFFF"}
            />
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSignOut} style={styles.textButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDeleteAccount} style={styles.textButton}>
            <Text style={styles.deleteText}>Delete my account</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Us Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Contact Us</Text>
          <Text style={styles.contactSubtitle}>Have questions or feedback? Reach out to us!</Text>
          
          <View style={styles.contactOptions}>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => Linking.openURL('mailto:moneyquest25@gmail.com')}
            >
              <View style={[styles.contactIconWrapper, { backgroundColor: '#EA4335' }]}>
                <Ionicons name="mail" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.contactButtonText}>Email Us</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => Linking.openURL('https://www.instagram.com/nurture_haven/')}
            >
              <View style={[styles.contactIconWrapper, { backgroundColor: '#E4405F' }]}>
                <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.contactButtonText}>Instagram</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => Linking.openURL('https://www.tiktok.com/@nurture_haven')}
            >
              <View style={[styles.contactIconWrapper, { backgroundColor: '#000000' }]}>
                <Ionicons name="logo-tiktok" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.contactButtonText}>TikTok</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: "#333",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
  },
  avatarContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  avatarBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F04D23", 
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    width: 100,
    height: 100,
  },
  changeAvatarText: {
    fontSize: 16,
    color: "#211E54", // Orange color
    fontWeight: "600",
  },
  formContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  label: {
    width: 100,
    fontSize: 16,
    color: "#333",
    fontWeight: "700",
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    fontSize: 16,
    backgroundColor: "#F5EAD980",
    textAlign: "left",
    padding: 16,
    color: '#000000', 
    borderRadius: 8, 
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 20,
    marginBottom: 16,
  },
  settingsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: "#333",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: "#FF4500", // Orange color
    width: "100%",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#FF4500",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  textButton: {
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 16,
    color: "#FF4500",
    fontWeight: "600",
  },
  deleteText: {
    fontSize: 14,
    color: "#999",
  },
  contactSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 16,
    marginBottom: 40,
    backgroundColor: "#F9F9F9",
    marginHorizontal: 20,
    borderRadius: 16,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  contactSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  contactOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  contactButton: {
    alignItems: "center",
  },
  contactIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  contactButtonText: {
    fontSize: 12,
    color: "#333",
    fontWeight: "500",
  },
});

export default EditProfileScreen;
