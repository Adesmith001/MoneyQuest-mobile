import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

interface Props {
  visible: boolean;
  onClose: () => void;
  inviteLink: string;
}

const InviteFriendsModal: React.FC<Props> = ({
  visible,
  onClose,
  inviteLink,
}) => {
  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    Alert.alert('Copied!', 'Invite link copied to clipboard.');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Money Quest and let's learn about money together! ${inviteLink}`,
        url: inviteLink, // for iOS
        title: 'Join me on Money Quest!', // for Android
      });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };

  return (
    <Modal
      animationType="fade" // Fade animation is more suitable for a centered modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPressOut={onClose} // This allows closing the modal by tapping the background
      >
        {/* Use a regular View and prevent the modal itself from being touchable */}
        <View onStartShouldSetResponder={() => true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Header with Fox */}
              <View style={styles.headerContainer}>
                <Image
                  source={require('../../../assets/fox.png')}
                  style={styles.foxImage}
                />
                <View style={styles.speechBubble}>
                  <Text style={styles.speechBubbleText}>Invite your friends</Text>
                </View>
              </View>

              {/* Copy Link Section */}
              <View style={styles.linkContainer}>
                <Text style={styles.linkText} numberOfLines={1}>
                  {inviteLink}
                </Text>
                <TouchableOpacity onPress={handleCopyLink}>
                  <Text style={styles.copyButtonText}>Copy Link</Text>
                </TouchableOpacity>
              </View>

              {/* Share On Section */}
              <Text style={styles.shareTitle}>Share On</Text>
              <View style={styles.shareIconsContainer}>
                <TouchableOpacity style={[styles.iconWrapper, { backgroundColor: '#1877F2' }]} onPress={handleShare}>
                  <Ionicons name="logo-facebook" size={32} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconWrapper, { backgroundColor: '#E4405F' }]} onPress={handleShare}>
                  <Ionicons name="logo-instagram" size={32} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconWrapper, { backgroundColor: '#25D366' }]} onPress={handleShare}>
                  <Ionicons name="logo-whatsapp" size={32} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconWrapper, { backgroundColor: '#007AFF' }]} onPress={handleShare}>
                  <Ionicons name="chatbubble" size={30} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Slightly darker overlay
    justifyContent: 'center', // Center vertically
    alignItems: 'center', // Center horizontally
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 24, // Apply radius to all corners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: 24,
    height: 150,
  },
  foxImage: {
    width: 120,
    height: 150,
    resizeMode: 'contain',
  },
  speechBubble: {
    position: 'absolute',
    top: 40,
    right: -110,
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  speechBubbleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    marginBottom: 24,
  },
  linkText: {
    flex: 1,
    color: '#333',
    fontSize: 14,
  },
  copyButtonText: {
    color: '#FF6B35',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 10,
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  shareIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Use space-between for better alignment
    width: '100%',
    paddingHorizontal: 10, // Add some padding to prevent icons from touching the edges
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InviteFriendsModal;