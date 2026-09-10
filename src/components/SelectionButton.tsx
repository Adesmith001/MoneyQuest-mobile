import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface SelectionButtonProps {
  label: string;
  subtitle?: string;
  isSelected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

const SelectionButton: React.FC<SelectionButtonProps> = ({
  label,
  subtitle,
  isSelected = false,
  onPress,
  style,
  textStyle,
  subtitleStyle,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isSelected && styles.selectedButton,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, isSelected && styles.selectedLabel, textStyle]}>
        {label}
      </Text>
      {Boolean(subtitle) && (
        <Text style={[styles.subtitle, isSelected && styles.selectedSubtitle, subtitleStyle]}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedButton: {
    borderColor: '#FF5722',
    backgroundColor: '#FF5722',
  },
  label: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
    flex: 1,
  },
  selectedLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '600',
  },
  selectedSubtitle: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default SelectionButton;
