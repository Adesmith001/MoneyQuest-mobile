import React, { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { updateUserOnboarding, signOut } from '../../store/slices/authSlice';
import { avatars } from '../../utils/avatarUtils';

const learningOptions = ['casual', 'intermediate', 'expert', 'professional'];
const goalOptions = [
  { id: 'grow-wealth', label: 'Grow wealth' },
  { id: 'passive-income', label: 'Build passive income' },
  { id: 'financial-independence', label: 'Financial independence' },
  { id: 'retire-wealthy', label: 'Retire wealthy' },
  { id: 'learn-skills', label: 'Learn useful skills' },
  { id: 'travel-world', label: 'Travel the world' },
];

const ProfileSetupScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [age, setAge] = useState(String(user?.age || ''));
  const [learningLimit, setLearningLimit] = useState(user?.learningLimit === 'needs_onboarding' ? '' : user?.learningLimit || '');
  const [mainGoal, setMainGoal] = useState(user?.mainGoal === 'needs_onboarding' ? '' : user?.mainGoal || '');
  const [avatar, setAvatar] = useState(user?.avatar === 'needs_onboarding' ? '' : user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const numericAge = Number(age);
    if (!user?.$id || !Number.isInteger(numericAge) || numericAge < 7 || numericAge > 150 || !learningLimit || !mainGoal.trim() || !avatar) {
      setError('Enter your age, goal, daily limit, and avatar to continue.');
      return;
    }
    setSaving(true);
    setError('');
    const result = await dispatch(updateUserOnboarding({
      userId: user.$id,
      age: numericAge,
      learningLimit,
      mainGoal: mainGoal.trim(),
      referralSource: user.referralSource || 'profile_recovery',
      avatar,
    }));
    if (updateUserOnboarding.rejected.match(result)) setError(String(result.payload || 'Could not save. Please retry.'));
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Finish your profile</Text>
        <Text style={styles.hint}>Your account is ready. Complete these details to start learning.</Text>
        <Text style={styles.label}>Age</Text>
        <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="Your age" />
        <Text style={styles.label}>Daily learning limit</Text>
        <View style={styles.choices}>
          {learningOptions.map(option => (
            <TouchableOpacity key={option} accessibilityRole="button" onPress={() => setLearningLimit(option)} style={[styles.choice, learningLimit === option && styles.selected]}>
              <Text>{option.charAt(0).toUpperCase() + option.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Your main goal</Text>
        <View style={styles.choices}>
          {goalOptions.map(option => (
            <TouchableOpacity key={option.id} accessibilityRole="button" onPress={() => setMainGoal(option.id)} style={[styles.choice, mainGoal === option.id && styles.selected]}>
              <Text>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Choose an avatar</Text>
        <View style={styles.choices}>
          {avatars.map(option => (
            <TouchableOpacity key={option.id} accessibilityRole="button" accessibilityLabel={option.id} onPress={() => setAvatar(option.id)} style={[styles.choice, avatar === option.id && styles.selected]}>
              <Image source={option.image} style={{ width: 48, height: 48 }} />
            </TouchableOpacity>
          ))}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity accessibilityRole="button" onPress={save} disabled={saving} style={styles.button}>
          <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Continue'}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => dispatch(signOut())} style={{ padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#555' }}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  hint: { color: '#555', marginBottom: 8 },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { padding: 8, borderWidth: 1, borderColor: '#bbb', borderRadius: 8 },
  selected: { borderColor: '#ff5722', backgroundColor: '#fff2ed' },
  error: { color: '#b00020' },
  button: { backgroundColor: '#ff5722', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

export default ProfileSetupScreen;
