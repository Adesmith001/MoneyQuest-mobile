import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

interface Props {
  navigation: any;
  route: any;
}

const AgeSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const [age, setAge] = useState(18);
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

        {/* Simple Slider */}
        <View style={styles.sliderContainer}>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderProgress, { width: `${((age - 7) / (100 - 7)) * 100}%` }]} />
            <TouchableOpacity 
              style={[styles.sliderThumb, { left: `${((age - 7) / (100 - 7)) * 100}%` }]}
              activeOpacity={0.8}
            />
          </View>
          <View style={styles.sliderControls}>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={() => setAge(Math.max(7, age - 1))}
            >
              <Text style={styles.controlText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={() => setAge(Math.min(100, age + 1))}
            >
              <Text style={styles.controlText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Continue Button */}
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
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
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 50,
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
    alignItems: 'center',
    marginBottom: 40,
  },
  sliderTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    position: 'relative',
    marginBottom: 20,
  },
  sliderProgress: {
    height: '100%',
    backgroundColor: '#FF5722',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#FF5722',
    borderRadius: 10,
    top: -8,
    marginLeft: -10,
  },
  sliderControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  controlButton: {
    width: 50,
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF5722',
  },
  slider: {
    height: 40,
  },
  thumb: {
    backgroundColor: '#FF5722',
    width: 20,
    height: 20,
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