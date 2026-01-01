import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TextInput,
} from 'react-native';
import CustomButton from '../../components/CustomButton';

interface Props {
  navigation: any;
  route: any;
}

const AgeSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const [age, setAge] = useState(7);
  const [ageText, setAgeText] = useState('7');
  const { width } = Dimensions.get('window');

  const handleAgeChange = (text: string) => {
    setAgeText(text);
  };

  const handleContinue = () => {
    const numericValue = parseInt(ageText, 10);
    const fallback = 7;
    const rawAge = isNaN(numericValue) ? fallback : numericValue;
    const finalAge = Math.max(7, Math.min(150, rawAge));
    setAge(finalAge);
    setAgeText(String(finalAge));
    navigation.navigate('LearningLimitSelection', {
      registrationData: route.params.registrationData,
      age: finalAge,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Money Quest</Text>
        </View>

        {/* Main Title */}
        <View style={styles.mainHeader}>
          <Text style={styles.mainTitle}>Enter your age</Text>
        </View>

        {/* Age Input */}
        <View style={styles.ageContainer}>
          <Text style={styles.ageLabel}>Your age:</Text>
          <TextInput
            style={styles.ageInput}
            value={ageText}
            onChangeText={handleAgeChange}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="Enter age"
            placeholderTextColor="#999"
            textAlign="center"
            returnKeyType="done"
          />
          <Text style={styles.ageSubtext}>for the wise</Text>
          <Text style={styles.ageHint}>(between 7 and 150)</Text>
        </View>

        <View style={styles.spacer} />

        {/* Continue Button */}
        <CustomButton title={'Continue'} onPress={handleContinue} />
      </View>
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
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  mainHeader: {
    alignItems: 'center',
    marginBottom: 80,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },
  ageContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  ageLabel: {
    fontSize: 18,
    color: '#212121',
    marginBottom: 20,
  },
  ageInput: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#212121',
    lineHeight: 80,
    borderBottomWidth: 3,
    borderBottomColor: '#FF5722',
    minWidth: 180,
    paddingVertical: 8,
    paddingHorizontal: 16,
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