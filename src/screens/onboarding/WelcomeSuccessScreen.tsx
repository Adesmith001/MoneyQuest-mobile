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

          {/* Speech Bubble - Absolutely Positioned */}
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
    width: width * 0.7,
    height: height * 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foxImage: {
    width: '100%',
    height: '100%',
  },
  speechBubbleContainer: {
    // Position the bubble relative to the characterContainer
    position: 'absolute',
    top: '10%', // Position it near the top of the fox's head
    right: '0%', // Position it to the right side
  },
  speechBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxWidth: width * 0.45,
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
    // This creates the triangle pointing towards the mouth
    position: 'absolute',
    bottom: 8,
    left: -8, // Position tail on the left edge
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderRightWidth: 12,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: 'transparent',
    borderRightColor: '#FFFFFF', // The tail color
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    transform: [{ rotate: '-25deg' }], // Angle the tail towards the mouth
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