import React, { useEffect, useRef } from 'react';
import { 
  View,  
  StyleSheet, 
  SafeAreaView,
  Image,
  Animated,
} from 'react-native';
import CustomButton from '../../components/CustomButton';

interface Props {
  navigation: any; 
}

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const buttonAnimation = useRef(new Animated.Value(100)).current;
  const opacityAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(buttonAnimation, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Image
          source={require("../../../assets/logo-black.png")}
          style={styles.logo}
        />
      </View>

      <Animated.View 
        style={[
          styles.buttonContainer,
          {
            transform: [{ translateY: buttonAnimation }],
            opacity: opacityAnimation,
          }
        ]}
      >
        <CustomButton
          title='Login'
          onPress={() => navigation.navigate('Login')}
        />
        <CustomButton
          title='Sign Up'
          onPress={() => navigation.navigate('Register')}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 420,
    height: 420,
    resizeMode: "contain",
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 50,
    gap: 16,
  },
});

export default WelcomeScreen;