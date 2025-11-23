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
      </View>

      <ScrollView style={styles.content}>
        {/* Avatar Section */}
        <TouchableOpacity
          style={styles.avatarSection}
          onPress={() => navigation.navigate("ChangeAvatar")}
        >
          <Image
            source={getAvatarById(user?.avatar || "")}
            style={styles.avatar}
          />
          <Text style={styles.changeAvatarText}>Change Avatar</Text>
        </TouchableOpacity>

        {/* Profile Fields */}
        <View style={styles.fieldsContainer}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            <View style={styles.fieldValueContainer}>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.fieldValueContainer}>
              <TextInput
                style={styles.fieldInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.fieldValueContainer}>
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        <Text style={styles.settingsTitle}>Settings</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingDescription}>
              {notificationEnabled ? 'Receive daily learning reminders' : 'Enable to get reminders'}
            </Text>
          </View>
          <Switch
            value={notificationEnabled}
            onValueChange={handleNotificationToggle}
            disabled={isLoadingPermissions}
            trackColor={{ false: "#E0E0E0", true: "#FF6B35" }}
            thumbColor={notificationEnabled ? "#FFFFFF" : "#FFFFFF"}
          />
        </View>

        <View style={[styles.settingItem]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Sound Effects</Text>
            <Text style={styles.settingDescription}>
              {soundEnabled ? 'Play sounds for actions' : 'Sounds are muted'}
            </Text>
          </View>
          <Switch
            value={soundEnabled}
            onValueChange={handleSoundToggle}
            trackColor={{ false: "#E0E0E0", true: "#FF6B35" }}
            thumbColor={soundEnabled ? "#FFFFFF" : "#FFFFFF"}
          />
        </View>

        <CustomButton
          title={"Save Changes"}
          onPress={handleSave}
        />

        {/* Action Buttons */}
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteText}>Delete my account</Text>
        </TouchableOpacity>
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    paddingTop: 40,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 40,
  },
  backButtonText: {
    fontSize: 28,
    color: "#333",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: "center",
    marginVertical: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  changeAvatarText: {
    marginTop: 10,
    fontSize: 16,
    color: "#FF6B35",
    fontWeight: "600",
  },
  fieldsContainer: {
    marginBottom: 30,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  fieldValueContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  fieldInput: {
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: "#999",
  },
  logoutButton: {
    marginTop: 30,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FF6B35",
    alignItems: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
  },
  deleteButton: {
    marginTop: 16,
    marginBottom: 40,
    padding: 16,
    alignItems: "center",
  },
  deleteText: {
    fontSize: 14,
    color: "#999",
  },
});

export default EditProfileScreen;
