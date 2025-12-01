import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';
import { completeWelcomeScreen } from '../../store/slices/authSlice';

interface Props {
  navigation: any;
  route: any;
}

const { width, height } = Dimensions.get('window');

const WelcomeSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userName } = route.params;
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Complete welcome screen and authenticate user after 4 seconds
    const timer = setTimeout(() => {
      dispatch(completeWelcomeScreen());
    }, 4000);

    return () => clearTimeout(timer);
  }, [dispatch]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* This container holds the fox and the bubble, allowing absolute positioning for the bubble relative to the fox */}
        <View style={styles.characterContainer}>
          {/* Fox Character - Centered */}
          <Image
            source={require('../../../assets/fox.png')}
            style={styles.foxImage}
            resizeMode="contain"
          />

          {/* Speech Bubble - Absolutely Positioned next to fox's mouth */}
          <View style={styles.speechBubbleContainer}>
            <View style={styles.speechBubble}>
              <Text style={styles.welcomeText}>
                Welcome {userName}, Now you can learn about money
              </Text>
            </View>
            {/* Speech bubble tail pointing towards the mouth */}
            <View style={styles.speechTail} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF5722',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterContainer: {
    // This container is the positioning reference for the bubble
    position: 'relative',
    width: width * 0.8,
    height: height * 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foxImage: {
    width: '100%',
    height: '100%',
    // Ensure the fox is positioned at the bottom/center of the container
    position: 'absolute',
    bottom: 0,
  },
  speechBubbleContainer: {
    // Position the bubble to the right side, near the fox's mouth area
    position: 'absolute',
    top: '35%', // Adjusted to be around mouth level (fox head is usually in upper-middle area)
    right: -20, // Positioned to the right, outside the fox container
    zIndex: 10, // Ensure it's above the fox image
  },
  speechBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxWidth: width * 0.5,
    minWidth: width * 0.4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  speechTail: {
    // This creates the triangle pointing towards the fox's mouth
    position: 'absolute',
    top: '35%', // Vertically centered on the bubble
    left: -10, // Position tail on the left edge, pointing towards fox
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderRightWidth: 15,
    borderBottomWidth: 10,
    borderLeftWidth: 0,
    borderTopColor: 'transparent',
    borderRightColor: '#FFFFFF', // The tail color matches bubble
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'left',
    lineHeight: 22,
  },
});

export default WelcomeSuccessScreen;