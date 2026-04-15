import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import adminPremiumService, {
  ManualGrantRequest,
  ManualGrantResponse,
} from '../../services/adminPremiumService';

interface Props {
  navigation: any;
}

function formatDateLabel(value?: string | null): string {
  if (!value) {
    return 'None';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isValidGrantDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return false;
  }

  const parsed = new Date(`${value.trim()}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

const AdminPremiumGrantScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [targetEmail, setTargetEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<ManualGrantResponse | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGranting, setIsGranting] = useState(false);

  const canAccess = adminPremiumService.canAccessAdminGrant(user);

  useEffect(() => {
    if (canAccess) {
      return;
    }

    Alert.alert('Access Denied', 'Only configured admin emails can use this tool.', [
      {
        text: 'OK',
        onPress: () => {
          if (navigation.canGoBack?.()) {
            navigation.goBack();
            return;
          }

          navigation.navigate('MainTabs');
        },
      },
    ]);
  }, [canAccess, navigation]);

  const buildRequest = (): ManualGrantRequest | null => {
    const normalizedEmail = targetEmail.trim().toLowerCase();
    const trimmedExpiry = expiresAt.trim();
    const trimmedReason = reason.trim();

    if (!normalizedEmail) {
      Alert.alert('Missing Email', 'Enter the user email you want to grant premium access to.');
      return null;
    }

    if (!trimmedExpiry) {
      Alert.alert('Missing Expiry Date', 'Enter an expiry date in YYYY-MM-DD format.');
      return null;
    }

    if (!isValidGrantDate(trimmedExpiry)) {
      Alert.alert('Invalid Date', 'Use a valid expiry date in YYYY-MM-DD format.');
      return null;
    }

    return {
      targetEmail: normalizedEmail,
      expiresAt: trimmedExpiry,
      reason: trimmedReason || undefined,
    };
  };

  const handlePreview = async () => {
    const request = buildRequest();
    if (!request) {
      return;
    }

    setIsPreviewing(true);
    try {
      const response = await adminPremiumService.preview(request);
      setPreview(response);
    } catch (error: any) {
      Alert.alert('Preview Failed', error?.message || 'Unable to preview this premium grant.');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGrant = async () => {
    const request = buildRequest();
    if (!request) {
      return;
    }

    setIsGranting(true);
    try {
      const response = await adminPremiumService.grant(request);
      setPreview(response);
      Alert.alert(
        response.applied ? 'Premium Granted' : 'No Change Needed',
        response.message,
      );
    } catch (error: any) {
      Alert.alert('Grant Failed', error?.message || 'Unable to apply this premium grant.');
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manual Premium Grant</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Grant Premium Access</Text>
          <Text style={styles.heroSubtitle}>
            Admin access is controlled by `MONEYQUEST_ADMIN_ALLOWLIST_EMAILS`.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target User</Text>
          <TextInput
            style={styles.input}
            value={targetEmail}
            onChangeText={setTargetEmail}
            placeholder="user@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expiry Date</Text>
          <TextInput
            style={styles.input}
            value={expiresAt}
            onChangeText={setExpiresAt}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.helperText}>
            Premium access will remain active until the end of this day.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={reason}
            onChangeText={setReason}
            placeholder="Optional internal note"
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.previewButton, isPreviewing && styles.disabledButton]}
            onPress={handlePreview}
            disabled={isPreviewing || isGranting}
          >
            {isPreviewing ? (
              <ActivityIndicator size="small" color="#211E54" />
            ) : (
              <Text style={styles.previewButtonText}>Preview</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.grantButton, isGranting && styles.disabledButton]}
            onPress={handleGrant}
            disabled={isPreviewing || isGranting}
          >
            {isGranting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.grantButtonText}>Grant Premium</Text>
            )}
          </TouchableOpacity>
        </View>

        {preview && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Grant Preview</Text>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>User</Text>
              <Text style={styles.previewValue}>
                {preview.targetUser.name || 'Unknown'} ({preview.targetUser.email})
              </Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Current Access</Text>
              <Text style={styles.previewValue}>{preview.currentAccessSource}</Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Previous Expiry</Text>
              <Text style={styles.previewValue}>
                {formatDateLabel(preview.previousEffectiveEndDate)}
              </Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Final Expiry</Text>
              <Text style={styles.previewValue}>{formatDateLabel(preview.finalEffectiveEndDate)}</Text>
            </View>

            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Action</Text>
              <Text style={styles.previewValue}>{preview.action}</Text>
            </View>

            <Text style={styles.previewMessage}>{preview.message}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: '#211E54',
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#211E54',
  },
  headerSpacer: {
    width: 28,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#211E54',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#E8E6F8',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#211E54',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#F2DED4',
  },
  multilineInput: {
    minHeight: 100,
  },
  helperText: {
    marginTop: 8,
    color: '#7A768E',
    fontSize: 13,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButton: {
    backgroundColor: '#FFE6D8',
  },
  previewButtonText: {
    color: '#211E54',
    fontSize: 16,
    fontWeight: '700',
  },
  grantButton: {
    backgroundColor: '#FF5C02',
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F2DED4',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#211E54',
    marginBottom: 12,
  },
  previewRow: {
    marginBottom: 10,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A768E',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  previewValue: {
    fontSize: 15,
    color: '#1E1E1E',
    lineHeight: 21,
  },
  previewMessage: {
    marginTop: 8,
    color: '#4B4761',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default AdminPremiumGrantScreen;
