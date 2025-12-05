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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400, // Max width for larger screens
    backgroundColor: 'white',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  modalContent: {
    padding: Math.max(screenWidth * 0.05, 16), // Responsive padding (5% of screen width, min 16)
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: Math.max(screenHeight * 0.03, 24), // Responsive margin
    height: Math.max(screenHeight * 0.18, 140), // Responsive height
    width: '100%',
    justifyContent: 'center',
  },
  foxImage: {
    width: Math.max(screenWidth * 0.28, 100), // Responsive width (28% of screen, min 100)
    height: Math.max(screenHeight * 0.18, 140), // Responsive height
    resizeMode: 'contain',
  },
  speechBubble: {
    position: 'absolute',
    top: Math.max(screenHeight * 0.055, 35), // Position near fox's mouth (responsive)
    right: Math.max(-screenWidth * 0.28, -110), // Position to the right of fox
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    paddingHorizontal: Math.max(screenWidth * 0.04, 16),
    paddingVertical: Math.max(screenHeight * 0.012, 10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: screenWidth * 0.4, // Max width to prevent overflow on small screens
  },
  speechBubbleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: Math.max(screenWidth * 0.04, 14), // Responsive font size
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: Math.max(screenWidth * 0.04, 14),
    paddingVertical: Math.max(screenHeight * 0.015, 12),
    width: '100%',
    marginBottom: Math.max(screenHeight * 0.025, 20),
  },
  linkText: {
    flex: 1,
    color: '#333',
    fontSize: Math.max(screenWidth * 0.035, 13), // Responsive font size
  },
  copyButtonText: {
    color: '#FF6B35',
    fontWeight: 'bold',
    fontSize: Math.max(screenWidth * 0.035, 13),
    marginLeft: 10,
  },
  shareTitle: {
    fontSize: Math.max(screenWidth * 0.045, 16), // Responsive font size
    fontWeight: 'bold',
    color: '#333',
    marginBottom: Math.max(screenHeight * 0.018, 14),
    alignSelf: 'flex-start',
  },
  shareIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Math.max(screenWidth * 0.02, 8),
  },
  iconWrapper: {
    width: Math.max(screenWidth * 0.14, 50), // Responsive size (14% of screen width, min 50)
    height: Math.max(screenWidth * 0.14, 50),
    borderRadius: Math.max(screenWidth * 0.07, 25),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InviteFriendsModal;