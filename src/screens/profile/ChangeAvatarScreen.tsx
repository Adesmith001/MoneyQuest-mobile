import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { updateUser } from '../../store/slices/authSlice';
import { avatars } from '../../utils/avatarUtils';
import CustomButton from '../../components/CustomButton';
import { databases, DB_ID, COLLECTIONS } from '../../services/appwrite';

interface Props {
  navigation: any;
}

const ChangeAvatarScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAvatar = async () => {
    if (selectedAvatar === user?.avatar) {
      navigation.goBack();
      return;
    }

    if (!user?.$id) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    try {
      setIsSaving(true);
      
      // Update avatar in Appwrite
      await databases.updateDocument(
        DB_ID,
        COLLECTIONS.USERS,
        user.$id,
        {
          avatar: selectedAvatar,
          updatedAt: new Date().toISOString(),
        }
      );

      // Update Redux store
      dispatch(updateUser({ avatar: selectedAvatar }));
      
      Alert.alert('Success', 'Avatar updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to update avatar:', error);
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Change Avatar</Text>
      </View>
      <ScrollView>
        <View style={styles.avatarGrid}>
          {avatars.map((avatar) => (
            <TouchableOpacity
              key={avatar.id}
              style={[
                styles.avatarOption,
                selectedAvatar === avatar.id && styles.selectedAvatar,
              ]}
              onPress={() => setSelectedAvatar(avatar.id)}
            >
              <Image source={avatar.image} style={styles.avatarImage} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <CustomButton
          title={isSaving ? 'Saving...' : 'Save'}
          onPress={handleSaveAvatar}
          disabled={isSaving || isLoading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFFFFF' },
  header: { alignItems: 'center', paddingVertical: 16, paddingTop: 40 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 16,
  },
  avatarOption: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#F5F0E8',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedAvatar: { borderColor: '#FF5722' },
  avatarImage: { width: '80%', height: '80%' },
  buttonContainer: { padding: 20 },
});

export default ChangeAvatarScreen;