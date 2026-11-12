import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import CustomButton from '../../components/CustomButton';
import analyticsService, { getAgeGroup } from '../../services/analytics';

interface Props {
  navigation: any;
  route: any;
}

const AgeSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const [age, setAge] = useState(7);
  const [ageText, setAgeText] = useState('7');

  const pressDigit = (digit: string) => {
    setAgeText((prev) => {
      if (prev.length >= 3) return prev;
      if (prev === '' && digit === '0') return prev;
      return prev + digit;
    });
  };

  const pressBackspace = () => {
    setAgeText((prev) => prev.slice(0, -1));
  };

  const pressClear = () => {
    setAgeText('');
  };

  type NumpadKey = { label: string; onPress: () => void; action?: boolean };
  const digitKey = (digit: string): NumpadKey => ({
    label: digit,
    onPress: () => pressDigit(digit),
  });
  const numpadRows: NumpadKey[][] = [
    [digitKey('1'), digitKey('2'), digitKey('3')],
    [digitKey('4'), digitKey('5'), digitKey('6')],
    [digitKey('7'), digitKey('8'), digitKey('9')],
    [
      { label: 'C', onPress: pressClear, action: true },
      digitKey('0'),
      { label: '⌫', onPress: pressBackspace, action: true },
    ],
  ];

  const handleContinue = () => {
    const numericValue = parseInt(ageText, 10);
    const fallback = 7;
    const rawAge = isNaN(numericValue) ? fallback : numericValue;
    const finalAge = Math.max(7, Math.min(100, rawAge));
    setAge(finalAge);
    setAgeText(String(finalAge));
    analyticsService
      .trackOnboardingStep('age_selection', {
        age: finalAge,
        age_group: getAgeGroup(finalAge),
      })
      .catch(() => {});
    navigation.navigate('LearningLimitSelection', {
      registrationData: route.params.registrationData,
      age: finalAge,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Money Quest</Text>
        </View>

        {/* Main Title */}
        <View style={styles.mainHeader}>
          <Text style={styles.mainTitle}>Enter your age</Text>
        </View>

        {/* Age display (entered via the on-screen numpad below) */}
        <View style={styles.ageContainer}>
          <Text style={styles.ageLabel}>Your age:</Text>
          <View style={styles.ageInput}>
            <Text
              style={[styles.ageValue, ageText === '' && styles.ageValueEmpty]}
            >
              {ageText === '' ? '--' : ageText}
            </Text>
          </View>
          <Text style={styles.ageSubtext}>for the wise</Text>
          <Text style={styles.ageHint}>(between 7 and 100)</Text>
        </View>

        {/* On-screen numpad */}
        <View style={styles.numpad}>
          {numpadRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.numpadRow}>
              {row.map((key) => (
                <TouchableOpacity
                  key={key.label}
                  style={styles.key}
                  onPress={key.onPress}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={
                    key.action
                      ? key.label === 'C'
                        ? 'Clear age'
                        : 'Delete last digit'
                      : `Digit ${key.label}`
                  }
                >
                  <Text style={[styles.keyText, key.action && styles.keyTextAction]}>
                    {key.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.spacer} />

        {/* Continue Button */}
        <CustomButton title={'Continue'} onPress={handleContinue} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  mainHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },
  ageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ageLabel: {
    fontSize: 18,
    color: '#212121',
    marginBottom: 20,
  },
  ageInput: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF5722',
    minWidth: 180,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageValue: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#212121',
    lineHeight: 80,
    textAlign: 'center',
  },
  ageValueEmpty: {
    color: '#CCC',
  },
  numpad: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  key: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
  },
  keyTextAction: {
    color: '#F04D23',
  },
  ageSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  ageHint: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
  },
  spacer: {
    flex: 1,
  },
  continueButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AgeSelectionScreen;
