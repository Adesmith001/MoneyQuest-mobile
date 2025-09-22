import React, { useState } from "react";
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
import { getAvatarById } from "../../utils/avatarUtils"; // Import the helper

interface Props {
  navigation: any;
}

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Editable form state
  const [name, setName] = useState(user?.name || "Iyanu Babayemi");
  const [username, setUsername] = useState(user?.username || "iyanubabs");
  const [email, setEmail] = useState(user?.email || "iyanubabs@gmail.com");

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            // Use the signOut thunk to properly sign out from Appwrite
            await dispatch(signOut()).unwrap();
            // Navigation will be handled automatically by auth state change
          } catch (error) {
            console.error('Sign out error:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Implement delete account functionality
            console.log("Delete account");
          },
        },
      ]
    );
  };

  const handleSave = () => {
    // Update user profile in Redux store
    dispatch(
      updateUser({
        name: name.trim(),
        username: username.trim(), // Also save the username
        email: email.trim(),
      })
    );
    Alert.alert("Success", "Profile updated successfully!");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {/* Use the user's actual avatar */}
            <Image source={getAvatarById(user?.avatar)} style={styles.avatarDisplay} />
          </View>
          {/* Navigate to ChangeAvatarScreen on press */}
          <TouchableOpacity
            style={styles.changeAvatarButton}
            onPress={() => navigation.navigate('ChangeAvatar')}
          >
            <Text style={styles.changeAvatarText}>Change Avatar</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.formField}>
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

          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.fieldValueContainer}>
              <TextInput
                style={styles.fieldInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
              />
            </View>
          </View>

          <View style={[styles.formField, styles.lastFormField]}>
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
          <Text style={styles.settingLabel}>Notification</Text>
          <Switch
            value={notificationEnabled}
            onValueChange={setNotificationEnabled}
            trackColor={{ false: "#E0E0E0", true: "#FF6B35" }}
            thumbColor={notificationEnabled ? "#FFFFFF" : "#FFFFFF"}
          />
        </View>

        <View style={[styles.settingItem]}>
          <Text style={styles.settingLabel}>Sound</Text>
          <Switch
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            trackColor={{ false: "#E0E0E0", true: "#FF6B35" }}
            thumbColor={soundEnabled ? "#FFFFFF" : "#FFFFFF"}
          />
        </View>

        <CustomButton
          title={"Save"}
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
    backgroundColor: "#FFFFFF",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "white",
  },
  avatar: {
    width: 120,
    height: 120,
    backgroundColor: "#F5F0E8", // Use a neutral background
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    overflow: 'hidden', // Ensure image stays within the circle
  },
  avatarDisplay: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 60,
  },
  changeAvatarButton: {
    paddingVertical: 8,
  },
  changeAvatarText: {
    fontSize: 13,
    color: "#211E54",
    fontWeight: "600",
  },
  formSection: {
    backgroundColor: "white",
    marginBottom: 20,
  },
  formField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  lastFormField: {
    borderBottomWidth: 0,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#211E54",
  },
  fieldValueContainer: {
    backgroundColor: "#F5EAD980",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: "70%",
  },
  fieldValue: {
    fontSize: 16,
    color: "#000",
  },
  fieldInput: {
    fontSize: 16,
    color: "#000",
    flex: 1,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
    paddingHorizontal: 20,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 5,
  },
  settingLabel: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "600",
  },
  logoutButton: {
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 16,
    color: "#FF9500",
    fontWeight: "500",
  },
  deleteButton: {
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 30,
  },
  deleteText: {
    fontSize: 16,
    color: "#FF9500",
    fontWeight: "500",
  },
});

export default EditProfileScreen;
