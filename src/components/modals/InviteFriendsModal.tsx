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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import ErrorModal from './ErrorModal';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Detect if device is a tablet (screen width > 600dp is commonly used)
const isTablet = screenWidth >= 600;

// Responsive scaling helper
const scale = (size: number) => {
  const baseWidth = 375; // iPhone 11 Pro width as base
  const scaleFactor = screenWidth / baseWidth;
  // For tablets, cap the scaling to prevent elements from becoming too large
  const maxScale = isTablet ? 1.5 : 2;
  return Math.min(size * scaleFactor, size * maxScale);
};

// Responsive font scaling
const fontScale = (size: number) => {
  const baseWidth = 375;
  const scaleFactor = screenWidth / baseWidth;
  // More conservative scaling for fonts
  const maxScale = isTablet ? 1.3 : 1.5;
  return Math.min(size * scaleFactor, size * maxScale);
};

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
  const [errorMessage, setErrorMessage] = React.useState('');

  const close = () => {
    setErrorMessage('');
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(inviteLink);
      Alert.alert('Copied!', 'Invite link copied to clipboard.');
    } catch {
      setErrorMessage('Couldn’t copy the invite link. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Money Quest and let's learn about money together! ${inviteLink}`,
        url: inviteLink, // for iOS
        title: 'Join me on Money Quest!', // for Android
      });
    } catch (error: any) {
      setErrorMessage(error.message || 'Couldn’t share the invite. Please try again.');
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={close}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPressOut={close}
      >
        <View onStartShouldSetResponder={() => true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Header with Fox */}
              <View style={styles.headerContainer}>
                <Image
                  source={require('../../../assets/fox.png')}
                  style={styles.foxImage}
                  resizeMode="contain"
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
                <TouchableOpacity onPress={handleCopyLink} style={styles.copyButton}>
                  <Text style={styles.copyButtonText}>Copy Link</Text>
                </TouchableOpacity>
              </View>

              {/* Share On Section */}
              <Text style={styles.shareTitle}>Share On</Text>
              <View style={styles.shareIconsContainer}>
                <TouchableOpacity style={[styles.iconWrapper, { backgroundColor: '#1877F2' }]} onPress={handleShare}>
                  <Ionicons name="logo-facebook" size={scale(28)} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconWrapper, { backgroundColor: '#E4405F' }]} onPress={handleShare}>
                  <Ionicons name="logo-instagram" size={scale(28)} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconWrapper, { backgroundColor: '#25D366' }]} onPress={handleShare}>
                  <Ionicons name="logo-whatsapp" size={scale(28)} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconWrapper, { backgroundColor: '#007AFF' }]} onPress={handleShare}>
                  <Ionicons name="chatbubble" size={scale(26)} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      {visible && errorMessage ? (
        <ErrorModal title="Invite problem" message={errorMessage} onDismiss={() => setErrorMessage('')} />
      ) : null}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 60 : 20,
  },
  modalContainer: {
    width: isTablet ? Math.min(screenWidth * 0.6, 500) : screenWidth - 40,
    maxWidth: 500,
    backgroundColor: 'white',
    borderRadius: scale(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  modalContent: {
    padding: scale(24),
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    position: 'relative',
    marginBottom: scale(24),
    height: isTablet ? scale(160) : scale(140),
    width: '100%',
    justifyContent: 'center',
  },
  foxImage: {
    width: isTablet ? scale(120) : scale(100),
    height: isTablet ? scale(150) : scale(130),
  },
  speechBubble: {
    position: 'absolute',
    top: isTablet ? scale(10) : scale(5),
    right: isTablet ? '5%' : '2%',
    backgroundColor: '#FF6B35',
    borderRadius: scale(16),
    paddingHorizontal: scale(18),
    paddingVertical: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '60%',
  },
  speechBubbleText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: fontScale(15),
    textAlign: 'center',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#FF6B35',
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    width: '100%',
    marginBottom: scale(24),
  },
  linkText: {
    flex: 1,
    color: '#333',
    fontSize: fontScale(14),
  },
  copyButton: {
    marginLeft: scale(12),
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
  },
  copyButtonText: {
    color: '#FF6B35',
    fontWeight: 'bold',
    fontSize: fontScale(14),
  },
  shareTitle: {
    fontSize: fontScale(17),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: scale(16),
    alignSelf: 'flex-start',
  },
  shareIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: scale(8),
  },
  iconWrapper: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    justifyContent: 'center',
    alignItems: 'center',
    // Add touch feedback area for tablets
    minWidth: 50,
    minHeight: 50,
  },
});

export default InviteFriendsModal;
