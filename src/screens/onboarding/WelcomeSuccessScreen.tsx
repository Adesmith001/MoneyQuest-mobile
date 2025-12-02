import React, { useEffect, useState } from 'react';
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

const WelcomeSuccessScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userName } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(completeWelcomeScreen());
    }, 4000);

    return () => clearTimeout(timer);
  }, [dispatch]);

  const { width, height } = dimensions;
  
  // Detect device types
  const isSmallScreen = height < 700;
  const isTablet = width > 600;

  // Calculate responsive sizes - fox should be centered and reasonably sized
  const foxWidth = isTablet ? Math.min(width * 0.4, 300) : Math.min(width * 0.5, 250);
  const foxHeight = isSmallScreen ? height * 0.5 : height * 0.6;
  
  // Speech bubble positioning - to the right of the fox's head
  // The bubble should be at head/mouth level (around 20-30% from top of fox)
  const bubbleTopPosition = foxHeight * 0.25;
  const bubbleLeftOffset = foxWidth * 0.55; // Position to the right of fox
  
  // Bubble sizing
  const bubbleWidth = isTablet ? width * 0.35 : width * 0.45;
  const fontSize = isTablet ? 16 : isSmallScreen ? 13 : 15;
  const bubblePadding = isSmallScreen ? 12 : 16;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.mainContainer}>
          {/* Fox and Speech Bubble Container */}
          <View
            style={[
              styles.characterContainer,
              {
                width: foxWidth,
                height: foxHeight,
              },
            ]}
          >
            {/* Fox Character - Centered */}
            <Image
              source={require('../../../assets/fox.png')}
              style={styles.foxImage}
              resizeMode="contain"
            />

            {/* Speech Bubble - Positioned to the right of fox's head */}
            <View
              style={[
                styles.speechBubbleContainer,
                {
                  top: bubbleTopPosition,
                  left: bubbleLeftOffset,
                },
              ]}
            >
              <View
                style={[
                  styles.speechBubble,
                  {
                    width: bubbleWidth,
                    paddingHorizontal: bubblePadding,
                    paddingVertical: bubblePadding,
                  },
                ]}
              >
                <Text style={[styles.welcomeText, { fontSize, lineHeight: fontSize * 1.4 }]}>
                  Welcome {userName}, Now you can learn about money
                </Text>
              </View>
              {/* Speech bubble tail pointing to the left (towards fox) */}
              <View style={styles.speechTail} />
            </View>
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
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  characterContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foxImage: {
    width: '100%',
    height: '100%',
  },
  speechBubbleContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  speechBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    position: 'absolute',
    top: '30%',
    left: -8,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderRightWidth: 12,
    borderBottomWidth: 8,
    borderLeftWidth: 0,
    borderTopColor: 'transparent',
    borderRightColor: '#FFFFFF',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  welcomeText: {
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'left',
  },
});

export default WelcomeSuccessScreen;