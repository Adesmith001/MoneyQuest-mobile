import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../CustomButton';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallDevice = screenHeight < 700;
const isTablet = screenWidth >= 768;

interface Props {
  visible: boolean;
  onClose: () => void;
  onRate: () => void;
}

const FeedbackModal: React.FC<Props> = ({ visible, onClose, onRate }) => {
  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View onStartShouldSetResponder={() => true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close-circle" size={30} color="#ccc" />
              </TouchableOpacity>

              <Image
                source={require('../../../assets/fox.png')}
                style={styles.foxImage}
              />
              
              <Text style={styles.title}>How do you like our application?</Text>
              <Text style={styles.subtitle}>We'd love to hear your review to help us improve.</Text>

              <CustomButton title="Click Here to Rate" onPress={onRate} />
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
    maxWidth: isTablet ? 500 : 400,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: isTablet ? 24 : 20,
    padding: isSmallDevice ? 20 : isTablet ? 35 : 25,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: isSmallDevice ? 8 : 10,
    right: isSmallDevice ? 8 : 10,
    zIndex: 10,
  },
  foxImage: {
    width: isSmallDevice ? 80 : isTablet ? 150 : 120,
    height: isSmallDevice ? 80 : isTablet ? 150 : 120,
    resizeMode: 'contain',
    marginBottom: isSmallDevice ? 10 : isTablet ? 20 : 15,
    marginTop: isSmallDevice ? 20 : 0,
  },
  title: {
    fontSize: isSmallDevice ? 16 : isTablet ? 24 : 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: isSmallDevice ? 6 : 8,
    paddingHorizontal: 10,
  },
  subtitle: {
    fontSize: isSmallDevice ? 13 : isTablet ? 18 : 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: isSmallDevice ? 20 : isTablet ? 30 : 25,
    paddingHorizontal: 10,
    lineHeight: isSmallDevice ? 18 : isTablet ? 26 : 22,
  },
});

export default FeedbackModal;