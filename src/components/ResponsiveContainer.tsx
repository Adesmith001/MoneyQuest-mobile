import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { isTablet, getResponsivePadding } from '../utils';

interface Props {
  children: React.ReactNode;
  scrollable?: boolean;
  keyboardAware?: boolean;
  contentContainerStyle?: ViewStyle;
  style?: ViewStyle;
}

/**
 * Responsive container component that adapts to different screen sizes
 * and handles keyboard avoiding automatically
 */
const ResponsiveContainer: React.FC<Props> = ({
  children,
  scrollable = true,
  keyboardAware = true,
  contentContainerStyle,
  style,
}) => {
  const padding = getResponsivePadding();

  const content = (
    <View
      style={[
        styles.content,
        { paddingHorizontal: padding },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  if (!scrollable) {
    return keyboardAware ? (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, style]}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {content}
      </KeyboardAvoidingView>
    ) : (
      <View style={[styles.container, style]}>{content}</View>
    );
  }

  return keyboardAware ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, style]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: padding },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  ) : (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal: padding },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      style={[styles.container, style]}
    >
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
});

export default ResponsiveContainer;
