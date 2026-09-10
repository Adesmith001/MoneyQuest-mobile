import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  Animated,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AnimatedTextInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  focusedLabelStyle?: TextStyle;
  error?: string;
  errorStyle?: TextStyle;
  showPasswordToggle?: boolean;
}

const AnimatedTextInput: React.FC<AnimatedTextInputProps> = ({
  label,
  value,
  onChangeText,
  containerStyle,
  inputStyle,
  labelStyle,
  focusedLabelStyle,
  error,
  errorStyle,
  showPasswordToggle = false,
  secureTextEntry,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const animatedColor = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shouldMoveUp = isFocused || value.length > 0;
    
    Animated.parallel([
      Animated.timing(animatedValue, {
        toValue: shouldMoveUp ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(animatedColor, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused, value, animatedValue, animatedColor]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const labelTranslateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -8],
  });

  const labelScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.75],
  });

  const labelColor = animatedColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#999', '#FF5722'],
  });

  const borderColor = animatedColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E0E0E0', '#FF5722'],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.inputContainer}>
        <Animated.View
          style={[
            styles.labelContainer,
            {
              transform: [
                { translateY: labelTranslateY },
                { scale: labelScale },
              ],
            },
          ]}
        >
          <Animated.Text
            style={[
              styles.label,
              labelStyle,
              isFocused && focusedLabelStyle,
              { color: labelColor },
            ]}
          >
            {label}
          </Animated.Text>
        </Animated.View>
        
        <Animated.View
          style={[
            styles.textInputWrapper,
            { borderColor },
          ]}
        >
          <TextInput
            style={[styles.textInput, inputStyle]}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor="transparent"
            secureTextEntry={showPasswordToggle ? !showPassword : secureTextEntry}
            {...textInputProps}
          />
          {showPasswordToggle && (
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
      
      {Boolean(error) && (
        <Text style={[styles.errorText, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputContainer: {
    position: 'relative',
  },
  labelContainer: {
    position: 'absolute',
    left: 20,
    zIndex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '400',
  },
  textInputWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#212121',
    backgroundColor: 'transparent',
  },
  eyeIcon: {
    padding: 12,
    paddingRight: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#FF5722',
    marginTop: 4,
    marginLeft: 20,
  },
});

export default AnimatedTextInput;
