import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size variations
    const sizeStyles: Record<string, ViewStyle> = {
      small: {
        paddingVertical: 12,
        paddingHorizontal: 24,
      },
      medium: {
        paddingVertical: 16,
        paddingHorizontal: 32,
      },
      large: {
        paddingVertical: 20,
        paddingHorizontal: 40,
      },
    };

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: "#F04D23",
      },
      secondary: {
        backgroundColor: "#E0E0E0",
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: "#F04D23",
      },
    };

    // Disabled state
    const disabledStyle: ViewStyle = disabled || loading ? {
      opacity: 0.6,
    } : {};

    // Full width style
    const widthStyle: ViewStyle = fullWidth ? {
      alignSelf: 'stretch',
    } : {
      width: 247,
      alignSelf: 'center',
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...disabledStyle,
      ...widthStyle,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
    };

    // Size variations
    const sizeStyles: Record<string, TextStyle> = {
      small: {
        fontSize: 14,
      },
      medium: {
        fontSize: 16,
      },
      large: {
        fontSize: 18,
      },
    };

    // Variant text colors
    const variantTextStyles: Record<string, TextStyle> = {
      primary: {
        color: "#FFFFFF",
      },
      secondary: {
        color: "#212121",
      },
      outline: {
        color: "#F04D23",
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantTextStyles[variant],
    };
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={handlePress}
      activeOpacity={disabled || loading ? 1 : 0.8}
      disabled={disabled || loading}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? "#FFFFFF" : "#F04D23"}
          style={{ marginRight: 8 }}
        />
      )}
      <Text style={[getTextStyle(), textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export default CustomButton;