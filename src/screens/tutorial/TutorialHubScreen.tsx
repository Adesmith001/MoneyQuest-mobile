import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  resetAllTutorials,
  resetGuide,
  resetTutorialActions,
  TutorialReplayKey,
} from '../../store/slices/tutorialSlice';
import { FONT_FAMILY } from '../../constants';
import cachedBackendApi from '../../services/cachedBackendApi';
import { getCompletedLevelIds } from '../../services/completedLevelService';
import { databases, DB_ID, COLLECTIONS, Query } from '../../services/appwrite';
import { getSectionPlayableLevelId } from '../../utils/progressBehavior';
import { getTutorialReplayActionKeys } from '../../utils/tutorialBehavior';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallDevice = screenHeight < 700;
const isTablet = screenWidth >= 768;

interface TutorialTopic {
  id: string;
  icon: string;
  title: string;
  description: string;
  resetKey: TutorialReplayKey;
  color: string;
}

const TUTORIAL_TOPICS: TutorialTopic[] = [
  {
    id: 'app-tour',
    icon: '🗺️',
    title: 'App Tour',
    description: 'Full walkthrough of learning, XP, Quests, Chests, Badges, lives, streaks, and tutorials.',
    resetKey: 'hasCompletedAppTour',
    color: '#FF5722',
  },
  {
    id: 'home-guide',
    icon: '🏠',
    title: 'Learning Path',
    description: 'How to navigate sections, swipe between them, refresh content, and start only the current unlocked level.',
    resetKey: 'hasSeenHomeTour',
    color: '#2196F3',
  },
  {
    id: 'question-guide',
    icon: '❓',
    title: 'Answering Questions',
    description: 'Resume your active lesson and replay how to answer questions, read feedback, manage lives, and flag issues.',
    resetKey: 'hasSeenQuestionGuide',
    color: '#9C27B0',
  },
  {
    id: 'streak-guide',
    icon: '🔥',
    title: 'Daily Streaks',
    description: 'How the streak system works and why missing today puts your progress at risk.',
    resetKey: 'hasSeenStreakGuide',
    color: '#FF9800',
  },
  {
    id: 'profile-guide',
    icon: '👤',
    title: 'Your Profile',
    description: 'Understand your stats, lives, XP, and how to find tutorials again from your profile.',
    resetKey: 'hasSeenProfileGuide',
    color: '#4CAF50',
  },
];

interface Props {
  navigation: any;
}

const TutorialHubScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const resolveQuestionGuideLevel = async () => {
    if (!user?.$id) {
      return null;
    }

    const inProgressDocs = await databases.listDocuments(
      DB_ID,
      COLLECTIONS.USER_PROGRESS,
      [
        Query.equal('userId', user.$id),
        Query.equal('isCompleted', false),
        Query.orderDesc('updatedAt'),
        Query.limit(1),
      ]
    );

    const inProgress = inProgressDocs.documents[0] as any;
    if (inProgress?.level && typeof inProgress.level === 'string') {
      const inProgressSectionId =
        typeof inProgress.sectionId === 'string' ? inProgress.sectionId : user.currentSectionId;
      let levelTitle = 'Continue Lesson';
      let sectionTitle = 'Learning Path';

      if (typeof inProgressSectionId === 'string' && inProgressSectionId) {
        const levels = await cachedBackendApi.getLevels(inProgressSectionId);
        const matchedLevel = levels.find((level) => level.level_id === inProgress.level);
        if (matchedLevel?.title) {
          levelTitle = matchedLevel.title;
        }

        const sections = await cachedBackendApi.getSections();
        const matchedSection = sections.find((section) => section.section_id === inProgressSectionId);
        if (matchedSection?.title) {
          sectionTitle = matchedSection.title;
        }
      }

      if (typeof inProgressSectionId === 'string' && inProgressSectionId) {
        return {
          levelId: inProgress.level,
          sectionId: inProgressSectionId,
          levelTitle,
          sectionTitle,
        };
      }
    }

    const completedLevelIds = new Set(await getCompletedLevelIds(user.$id));
    const backendSections = await cachedBackendApi.getSections();

    for (const section of backendSections) {
      if (!section.section_id) {
        continue;
      }

      const levels = await cachedBackendApi.getLevels(section.section_id);
      const playableLevelId = getSectionPlayableLevelId(
        levels.map((level) => level.level_id),
        completedLevelIds
      );

      if (playableLevelId) {
        const playableLevel = levels.find((level) => level.level_id === playableLevelId);
        return {
          levelId: playableLevelId,
          sectionId: section.section_id,
          levelTitle: playableLevel?.title || 'Continue Lesson',
          sectionTitle: section.title,
        };
      }
    }

    const firstSection = backendSections.find((section) => section.section_id);
    if (!firstSection?.section_id) {
      return null;
    }

    const firstLevels = await cachedBackendApi.getLevels(firstSection.section_id);
    if (!firstLevels[0]) {
      return null;
    }

    return {
      levelId: firstLevels[0].level_id,
      sectionId: firstSection.section_id,
      levelTitle: firstLevels[0].title || 'Continue Lesson',
      sectionTitle: firstSection.title,
    };
  };

  const handleReplayTopic = async (topic: TutorialTopic) => {
    dispatch(resetGuide(topic.resetKey));
    dispatch(resetTutorialActions(getTutorialReplayActionKeys(topic.resetKey)));

    switch (topic.id) {
      case 'app-tour':
        dispatch(resetGuide('hasCompletedAppTour'));
        break;
      case 'home-guide':
        navigation.navigate('Home');
        break;
      case 'question-guide':
        try {
          const activeLevel = await resolveQuestionGuideLevel();
          if (!activeLevel) {
            navigation.navigate('Home');
            return;
          }

          navigation.getParent()?.getParent()?.navigate('Question', {
            levelId: activeLevel.levelId,
            sectionId: activeLevel.sectionId,
            levelTitle: activeLevel.levelTitle,
            sectionTitle: activeLevel.sectionTitle,
          });
        } catch (error) {
          console.error('Failed to open question guide:', error);
          navigation.navigate('Home');
        }
        break;
      case 'streak-guide':
        navigation.navigate('Streak');
        break;
      case 'profile-guide':
        navigation.goBack();
        break;
      default:
        navigation.goBack();
    }
  };

  const handleReplayAll = () => {
    dispatch(resetAllTutorials());
    dispatch(resetTutorialActions(undefined));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How to Play</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <Image
            source={require('../../../assets/fox.png')}
            style={styles.foxImage}
            resizeMode="contain"
          />
          <View style={styles.introBubble}>
            <Text style={styles.introText}>
              Need a refresher? Tap any topic below to replay that guide in the right place.
            </Text>
            <View style={styles.introTail} />
          </View>
        </View>

        {TUTORIAL_TOPICS.map((topic) => (
          <TouchableOpacity
            key={topic.id}
            style={styles.topicCard}
            activeOpacity={0.7}
            onPress={() => {
              void handleReplayTopic(topic);
            }}
          >
            <View style={[styles.topicIconContainer, { backgroundColor: `${topic.color}15` }]}>
              <Text style={styles.topicIcon}>{topic.icon}</Text>
            </View>
            <View style={styles.topicContent}>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicDescription}>{topic.description}</Text>
            </View>
            <Ionicons name="play-circle-outline" size={28} color={topic.color} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.replayAllBtn}
          activeOpacity={0.8}
          onPress={handleReplayAll}
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.replayAllText}>Replay Full Tour</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: isSmallDevice ? 10 : 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: FONT_FAMILY,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  introSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  foxImage: {
    width: isSmallDevice ? 60 : 80,
    height: isSmallDevice ? 60 : 80,
  },
  introBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  introText: {
    fontSize: isSmallDevice ? 13 : 15,
    color: '#555',
    lineHeight: 22,
    fontFamily: FONT_FAMILY,
  },
  introTail: {
    position: 'absolute',
    top: '35%',
    left: -8,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderRightWidth: 10,
    borderBottomWidth: 6,
    borderLeftWidth: 0,
    borderTopColor: 'transparent',
    borderRightColor: '#FFFFFF',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  topicIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  topicIcon: {
    fontSize: 24,
  },
  topicContent: {
    flex: 1,
    marginRight: 8,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
    fontFamily: FONT_FAMILY,
  },
  topicDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
    fontFamily: FONT_FAMILY,
  },
  replayAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5722',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 12,
    gap: 8,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  replayAllText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY,
  },
});

export default TutorialHubScreen;
