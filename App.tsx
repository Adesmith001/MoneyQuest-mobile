import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Demo screens to showcase the app structure
const DemoWelcomeScreen = () => (
  <SafeAreaView style={styles.container}>
    <View style={styles.welcomeContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoIcon}>🏦</Text>
      </View>
      <Text style={styles.appName}>Money Quest</Text>
      <Text style={styles.tagline}>Master your financial future</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Already have an account?</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>What you'll get:</Text>
        <Text style={styles.featureItem}>🎯 Interactive financial lessons</Text>
        <Text style={styles.featureItem}>🏆 Daily streaks & XP system</Text>
        <Text style={styles.featureItem}>📊 Monthly leaderboards</Text>
        <Text style={styles.featureItem}>🔊 Audio questions</Text>
        <Text style={styles.featureItem}>👥 Social authentication</Text>
        <Text style={styles.featureItem}>📱 Push notifications</Text>
      </View>
    </View>
  </SafeAreaView>
);

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <DemoWelcomeScreen />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF5722', // Orange primary color from design
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  logoContainer: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 32,
    marginTop: 60,
  },
  logoIcon: {
    fontSize: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 48,
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF5722',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textDecorationLine: 'underline',
  },
  featuresContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 24,
    marginTop: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    lineHeight: 24,
  },
});
