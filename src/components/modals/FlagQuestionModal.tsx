import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';

const COMMON_REASONS = [
  'Wrong answer marked as correct',
  'Unclear question wording',
  'Typo or grammar error',
  'Outdated information',
  'Answer options are confusing',
  'Question is too ambiguous',
  'Duplicate question',
];

interface Props {
  visible: boolean;
  /** Pre-filled with the logged-in user's display name */
  defaultFlaggedBy?: string;
  onSubmit: (reason: string, flaggedBy: string) => void;
  onClose: () => void;
}

const FlagQuestionModal: React.FC<Props> = ({
  visible,
  defaultFlaggedBy = '',
  onSubmit,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [flaggedBy, setFlaggedBy] = useState<string>(defaultFlaggedBy);

  // Sync default name whenever the modal opens
  React.useEffect(() => {
    if (visible) {
      setFlaggedBy(defaultFlaggedBy);
      setSelectedReason('');
      setCustomReason('');
    }
  }, [visible, defaultFlaggedBy]);

  const effectiveReason = customReason.trim() || selectedReason;
  const canSubmit = effectiveReason.length >= 5;

  const handleSelectReason = (reason: string) => {
    setSelectedReason(reason);
    setCustomReason(''); // clear custom input when a chip is picked
  };

  const handleCustomReasonChange = (text: string) => {
    setCustomReason(text);
    if (text.trim()) {
      setSelectedReason(''); // deselect chip when typing custom
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(effectiveReason, flaggedBy.trim());
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.dismissArea}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="flag" size={22} color="#FF6B6B" />
            <Text style={styles.title}>Report a Problem</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Name field */}
            <Text style={styles.label}>Your name</Text>
            <TextInput
              style={styles.nameInput}
              value={flaggedBy}
              onChangeText={setFlaggedBy}
              placeholder="Enter your name"
              placeholderTextColor="#aaa"
              returnKeyType="done"
            />

            {/* Common reasons */}
            <Text style={styles.label}>Select a reason</Text>
            <View style={styles.chipsContainer}>
              {COMMON_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => handleSelectReason(reason)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.chipText, isSelected && styles.chipTextSelected]}
                    >
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom reason */}
            <Text style={styles.label}>Or describe the issue</Text>
            <TextInput
              style={styles.textArea}
              value={customReason}
              onChangeText={handleCustomReasonChange}
              placeholder="Describe the problem with this question…"
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={3}
              returnKeyType="default"
              textAlignVertical="top"
            />
            {customReason.trim().length > 0 && customReason.trim().length < 5 && (
              <Text style={styles.minLengthHint}>Minimum 5 characters required</Text>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.8}
            >
              <Ionicons name="flag" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>Submit Flag</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 4,
  },
  scrollContent: {
    paddingBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: SPACING.sm,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    backgroundColor: '#fafafa',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.xs,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  chipSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0F0',
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    color: '#666',
  },
  chipTextSelected: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    backgroundColor: '#fafafa',
    minHeight: 80,
  },
  minLengthHint: {
    fontSize: FONT_SIZES.xs,
    color: '#FF6B6B',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.md,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: FONT_SIZES.md,
    color: '#666',
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#FFB3B3',
  },
  submitBtnText: {
    fontSize: FONT_SIZES.md,
    color: '#fff',
    fontWeight: '700',
  },
});

export default FlagQuestionModal;
