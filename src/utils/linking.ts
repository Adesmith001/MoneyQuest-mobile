import { Linking, Alert } from 'react-native';

const FEEDBACK_FORM_URL = 'https://forms.office.com/r/hKQQsxFzij';

export const openFeedbackForm = async () => {
  try {
    const supported = await Linking.canOpenURL(FEEDBACK_FORM_URL);
    if (supported) {
      await Linking.openURL(FEEDBACK_FORM_URL);
    } else {
      Alert.alert("Error", `Don't know how to open this URL: ${FEEDBACK_FORM_URL}`);
    }
  } catch (error) {
    console.error('Failed to open feedback form:', error);
    Alert.alert("Error", "An error occurred while trying to open the feedback form.");
  }
};