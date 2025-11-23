import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomButton from '../CustomButton';

interface Props {
  visible: boolean;
  onClose: () => void;
  onRate: () => void;
}

const FeedbackModal: React.FC<Props> = ({ visible, onClose, onRate }) => {
  return (
    <Modal
      animationType="fade"
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
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  foxImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
});

export default FeedbackModal;