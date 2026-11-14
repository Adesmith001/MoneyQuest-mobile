import { Linking } from 'react-native';
import analyticsService from '../services/analytics';
import { showErrorAlert } from '../services/errorAlerts';

const FEEDBACK_FORM_URL = 'https://forms.office.com/r/hKQQsxFzij';

export const openFeedbackForm = async () => {
  try {
    await analyticsService.trackEvent('bug_report_opened', {
      destination: 'office_form',
    }, {
      featureName: 'feedback_form',
    });
    await analyticsService.trackEvent('support_link_opened', {
      destination: 'office_form',
    }, {
      featureName: 'support',
    });
    const supported = await Linking.canOpenURL(FEEDBACK_FORM_URL);
    if (supported) {
      await Linking.openURL(FEEDBACK_FORM_URL);
    } else {
      showErrorAlert('Couldn’t open feedback form', 'Please try again.');
    }
  } catch (error) {
    console.error('Failed to open feedback form:', error);
    showErrorAlert('Couldn’t open feedback form', 'Please try again.');
  }
};
