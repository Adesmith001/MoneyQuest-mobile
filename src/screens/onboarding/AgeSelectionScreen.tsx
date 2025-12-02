import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import CustomButton from '../../components/CustomButton';

interface Props {
  navigation: any;
  route: any;
}

const AgeSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const [age, setAge] = useState(7);
  const { width } = Dimensions.get('window');

  const handleContinue = () => {
    navigation.navigate('LearningLimitSelection', {
      registrationData: route.params.registrationData,
      age,
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

        {/* Age Display */}
        <View style={styles.ageContainer}>
          <Text style={styles.ageLabel}>Your age:</Text>
          <Text style={styles.ageNumber}>{age}</Text>
          <Text style={styles.ageSubtext}>for the wise</Text>
        </View>

        {/* Slider */}
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={7}
            maximumValue={150}
            step={1}
            value={age}
            onValueChange={(value: number) => setAge(value)}
            minimumTrackTintColor="#FF5722"
            maximumTrackTintColor="#E0E0E0"
            thumbTintColor="#FF5722"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>7</Text>
            <Text style={styles.sliderLabel}>150</Text>
          </View>
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
  ageNumber: {
    fontSize: 120,
    fontWeight: 'bold',
    color: '#212121',
    lineHeight: 120,
  },
  ageSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  sliderContainer: {
    width: '100%',
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 5,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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