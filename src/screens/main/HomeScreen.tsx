import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  Alert,
  Animated,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from "react-native-svg";
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { getAvatarById } from "../../utils/avatarUtils";
import { backendApi } from "../../services/backendApi";
import cachedBackendApi from "../../services/cachedBackendApi";
import { databases, DB_ID, COLLECTIONS, Query } from "../../services/appwrite";
import { useFocusEffect } from "@react-navigation/native";
import { updateUser } from "../../store/slices/authSlice";
import cacheService from "../../services/cacheService";
import { livesService } from "../../services/lives";
import LearningPathSkeleton from "../../components/skeletons/LearningPathSkeleton";
import { getDecorationsForSection } from "../../config/sectionDecorations";
import CoachMark from "../../components/tutorial/CoachMark";
import { HOME_COACH_STEPS } from "../../config/coachMarkSteps";
import { markHomeTourSeen } from "../../store/slices/tutorialSlice";
import notificationService from "../../services/notifications";

interface Props {
  navigation: any;
}

interface LevelNode {
  id: string; // Now UUID from backend
  sectionTitle: string;
  levelTitle: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  sectionId: string; // Now UUID
  levelId: string; // Now UUID
}

interface Section {
  id: string;
  title: string;
  levels: LevelNode[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const SECTION_IDS_CACHE_KEY = '@moneyquest_last_section_ids';
const LAST_NEW_SECTION_CHECK_KEY = '@moneyquest_last_new_section_check_at';
const NOTIFIED_SECTION_IDS_CACHE_KEY = '@moneyquest_notified_section_ids';
const NEW_SECTION_CHECK_INTERVAL_MS = 15 * 60 * 1000;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { hasSeenHomeTour } = useSelector((state: RootState) => state.tutorial);
  const dispatch = useDispatch();

  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedLevels, setCompletedLevels] = useState<Set<string>>(new Set());
  const [isContentStale, setIsContentStale] = useState(false);
  const [isRefreshingContent, setIsRefreshingContent] = useState(false);
  const [hasNewSectionsAvailable, setHasNewSectionsAvailable] = useState(false);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);

  // Coach marks
  const [coachStep, setCoachStep] = useState(0);
  const showCoachMarks = !hasSeenHomeTour && !isLoading && sections.length > 0;
  // const [hasScrolledToCurrentSection, setHasScrolledToCurrentSection] = useState(false);

  // Track if initial data has been loaded to avoid redundant API calls
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  // Ref mirror of hasInitiallyLoaded — always current inside memoized callbacks
  const hasInitiallyLoadedRef = useRef(false);
  // Prevent concurrent fetches (e.g. useEffect + useFocusEffect firing together)
  const isFetchingRef = useRef(false);
  // Retry counter — when sections come back empty, retry up to 3 times
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Ref for horizontal scroll to scroll to user's current section
  const horizontalScrollRef = useRef<ScrollView>(null);
  const hasInitializedSectionPositionRef = useRef(false);

  // Animation values for parallax scrolling (one per section)
  const scrollYValues = useRef<{ [key: string]: Animated.Value }>({});
  
  // Pulse animation for current level node
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const newSectionBadgePulse = useRef(new Animated.Value(1)).current;

  // Initialize scroll animation values for each section
  useEffect(() => {
    sections.forEach((section) => {
      if (!scrollYValues.current[section.id]) {
        scrollYValues.current[section.id] = new Animated.Value(0);
      }
    });
  }, [sections]);

  // Start pulse animation for current level indicator
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (!hasNewSectionsAvailable) {
      newSectionBadgePulse.setValue(1);
      return;
    }

    const badgePulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(newSectionBadgePulse, {
          toValue: 1.04,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(newSectionBadgePulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );

    badgePulseAnimation.start();
    return () => badgePulseAnimation.stop();
  }, [hasNewSectionsAvailable, newSectionBadgePulse]);

  const refreshStaleState = React.useCallback(async () => {
    try {
      const stale = await cacheService.isSectionsCacheStale();
      setIsContentStale(stale);
    } catch {
      setIsContentStale(true);
    }
  }, []);

  const notifyOnNewSections = React.useCallback(
    async (backendSections: Array<{ section_id?: string; title: string }>) => {
      try {
        const currentSectionIds = backendSections
          .map((section) => section.section_id)
          .filter((id): id is string => !!id);

        const previousRaw = await AsyncStorage.getItem(SECTION_IDS_CACHE_KEY);
        const previousIds = previousRaw ? (JSON.parse(previousRaw) as string[]) : [];
        const newSectionIds = currentSectionIds.filter((id) => !previousIds.includes(id));

        if (hasInitiallyLoadedRef.current && newSectionIds.length > 0) {
          const notifiedRaw = await AsyncStorage.getItem(NOTIFIED_SECTION_IDS_CACHE_KEY);
          const notifiedIds = notifiedRaw ? (JSON.parse(notifiedRaw) as string[]) : [];
          const unnotifiedSectionId = newSectionIds.find((id) => !notifiedIds.includes(id));

          if (unnotifiedSectionId) {
            const firstNewSection = backendSections.find(
              (section) => section.section_id === unnotifiedSectionId
            );
            await notificationService.sendSectionCreatedNotification(
              firstNewSection?.title || 'New section'
            );
            await AsyncStorage.setItem(
              NOTIFIED_SECTION_IDS_CACHE_KEY,
              JSON.stringify([...new Set([...notifiedIds, unnotifiedSectionId])])
            );
          }
        }

        await AsyncStorage.setItem(SECTION_IDS_CACHE_KEY, JSON.stringify(currentSectionIds));
      } catch (error) {
        console.warn('Failed to detect new sections:', error);
      }
    },
    []
  );

  const checkForNewSectionsAvailability = React.useCallback(async (force: boolean = false) => {
    if (!user?.$id || !hasInitiallyLoadedRef.current) {
      return;
    }

    try {
      const lastCheckedAtRaw = await AsyncStorage.getItem(LAST_NEW_SECTION_CHECK_KEY);
      const lastCheckedAt = lastCheckedAtRaw ? Number.parseInt(lastCheckedAtRaw, 10) : 0;

      if (
        !force &&
        Number.isFinite(lastCheckedAt) &&
        lastCheckedAt > 0 &&
        Date.now() - lastCheckedAt < NEW_SECTION_CHECK_INTERVAL_MS
      ) {
        return;
      }

      const latestSections = await backendApi.getSections();
      const latestSectionIds = latestSections
        .map((section) => section.section_id)
        .filter((id): id is string => !!id);

      const previousRaw = await AsyncStorage.getItem(SECTION_IDS_CACHE_KEY);
      const knownSectionIds = previousRaw
        ? (JSON.parse(previousRaw) as string[])
        : sections.map((section) => section.id);

      const newSectionIds = latestSectionIds.filter((id) => !knownSectionIds.includes(id));
      const hasNew = newSectionIds.length > 0;
      setHasNewSectionsAvailable(hasNew);

      if (hasNew) {
        const notifiedRaw = await AsyncStorage.getItem(NOTIFIED_SECTION_IDS_CACHE_KEY);
        const notifiedIds = notifiedRaw ? (JSON.parse(notifiedRaw) as string[]) : [];
        const unnotifiedSectionId = newSectionIds.find((id) => !notifiedIds.includes(id));

        if (unnotifiedSectionId) {
          const newSection = latestSections.find(
            (section) => section.section_id === unnotifiedSectionId
          );
          await notificationService.sendSectionCreatedNotification(
            newSection?.title || 'New section'
          );
          await AsyncStorage.setItem(
            NOTIFIED_SECTION_IDS_CACHE_KEY,
            JSON.stringify([...new Set([...notifiedIds, unnotifiedSectionId])])
          );
        }
      }

      await AsyncStorage.setItem(LAST_NEW_SECTION_CHECK_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Failed to check for new sections:', error);
    }
  }, [sections, user?.$id]);

  // ─────────────────────────────────────────────────────────────────────────
  // Main data-fetch function — stable useCallback so it can be used in both
  // useEffect (initial / user-change load) and useFocusEffect (focus refresh)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchLearningPath = React.useCallback(async () => {
    // Don't fetch if user isn't hydrated yet — wait for Redux Persist
    if (!user?.$id) return;

    // Prevent concurrent invocations (useEffect + useFocusEffect can fire together)
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
        // Show loading spinner only on first-ever load
        if (!hasInitiallyLoadedRef.current) {
          setIsLoading(true);
        }

          // 🩺 STEP 0: Refresh user lives from Appwrite (with timeout protection for iOS)
          if (user?.$id) {
            try {
              // Add timeout to prevent hangs on iOS
              const livesPromise = livesService.refreshLives(
                user.$id,
                user.lives !== undefined && user.lives !== null ? user.lives : 5,
                user.lastLifeRegenTime || new Date().toISOString()
              );
              const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Lives refresh timeout')), 5000)
              );

              const { lives, lastLifeRegenTime } = await Promise.race([livesPromise, timeoutPromise]);

              // Update Redux store if lives changed
              if (lives !== user.lives || lastLifeRegenTime !== user.lastLifeRegenTime) {
                dispatch(updateUser({ lives, lastLifeRegenTime }));
              }
            } catch (error) {
              console.error('Failed to refresh lives on HomeScreen (non-fatal):', error);
              // Continue with cached lives - don't block the UI
            }
          }

          let latestCompletedLevels = new Set<string>();

          // 🚀 STEP 1: Load cached completed levels FIRST (instant!)
          const cachedCompletedLevels = await cacheService.getCompletedLevels();
          if (cachedCompletedLevels.length > 0) {
            latestCompletedLevels = new Set(cachedCompletedLevels);
          }

          // 🌐 STEP 2: Fetch fresh data from Appwrite and MERGE with cache
          // CRITICAL: Merge instead of replace to prevent race conditions where
          // Appwrite might not yet have the just-completed level synced
          if (user?.$id) {
            try {
              const progressDocs = await databases.listDocuments(
                DB_ID,
                COLLECTIONS.USER_PROGRESS,
                [Query.equal('userId', user.$id), Query.equal('isCompleted', true)]
              );
              const appwriteCompletedLevels = progressDocs.documents.map(doc => doc.level);
              // MERGE Appwrite data with cache data - don't replace!
              // This ensures recently completed levels from cache aren't lost
              appwriteCompletedLevels.forEach(levelId => {
                latestCompletedLevels.add(levelId);
              });
              // 💾 Save merged data to cache for next time
              await cacheService.saveCompletedLevels(Array.from(latestCompletedLevels));

              // If user has completed levels but no currentLevelId, update it
              if (latestCompletedLevels.size > 0 && !user.currentLevelId) {
                const sortedCompletedLevels = Array.from(latestCompletedLevels);
                const lastCompletedLevel = sortedCompletedLevels[sortedCompletedLevels.length - 1];

                await databases.updateDocument(
                  DB_ID,
                  COLLECTIONS.USERS,
                  user.$id,
                  {
                    currentLevelId: lastCompletedLevel,
                  }
                );

                dispatch(updateUser({ currentLevelId: lastCompletedLevel }));
              }
            } catch (error) {
              console.error('❌ Failed to fetch from Appwrite:', error);
              // If network fails, we still have cached data!
            }
          }

          // ✨ Update state with latest completed levels BEFORE building sections
          setCompletedLevels(latestCompletedLevels);

          // Get all sections (documents) from backend with caching
          const backendSections = await cachedBackendApi.getSections();
          await notifyOnNewSections(backendSections);

          if (user?.$id) {
            notificationService.syncAdminBroadcasts(user.$id).catch(() => {});
          }

          // Find the first valid section ID for the "default unlock" logic
          const firstValidSectionId = backendSections.find(s => s.section_id)?.section_id;

          const sectionsData: Section[] = [];

          // Process regular sections and insert recap sections after every 9th section
          for (let i = 0; i < backendSections.length; i++) {
            const section = backendSections[i];

            try {
              // Skip sections without a valid section_id
              if (!section.section_id) {
                console.warn(`Section "${section.title}" has no section_id, skipping...`);
                continue;
              }

              // Fetch levels for this section using section_id with caching
              const levels = await cachedBackendApi.getLevels(section.section_id);
              if (levels.length === 0) continue;

              const levelNodes: LevelNode[] = levels.map((level, levelIndex) => {
                // Use the section_id from the level for progress tracking
                const levelSectionId = level.section_id || section.section_id!;

                // Check if this level is completed using the latestCompletedLevels
                // This is the source of truth for completion status
                const isCompleted = latestCompletedLevels.has(level.level_id);

                // Pass the firstValidSectionId and sectionsData to correctly identify section position
                const progress = calculateLevelProgress(
                  levelSectionId,
                  level.level_id,
                  levelIndex,
                  levels,
                  firstValidSectionId,
                  latestCompletedLevels, // Pass the latest completed levels
                  sectionsData // Pass the sections being built for accurate index lookup
                );

                // CRITICAL FIX: Ensure completed levels are ALWAYS marked as unlocked and completed
                // This overrides any progress calculation to guarantee completed levels show checkmarks
                return {
                  id: level.level_id,
                  sectionTitle: section.title,
                  levelTitle: level.title,
                  sectionId: levelSectionId,
                  levelId: level.level_id,
                  ...progress,
                  // Explicitly set these AFTER spreading progress to ensure completed levels are never locked
                  isCompleted: isCompleted,
                  isUnlocked: isCompleted || progress.isUnlocked, // Completed levels are always unlocked
                };
              });

              sectionsData.push({
                id: section.section_id,
                title: section.title,
                levels: levelNodes,
              });

              // Check if we should insert a recap section after this section
              // After every 9 regular sections, insert a recap at position 10, 20, 30, etc.
              // Recap 10 reviews sections 1-9, recap 20 reviews 11-19, etc.
              const currentSectionCount = sectionsData.length;
              if (currentSectionCount % 9 === 0) {
                try {
                  // Calculate the recap section number (10, 20, 30, etc.)
                  // This aligns with backend which expects recap sections at 10, 20, 30
                  const recapSectionNumber = Math.floor(currentSectionCount / 9) * 10;
                  const recapData = await backendApi.getRecapSection(recapSectionNumber, 10, true);

                  // Create level nodes for recap section
                  // Each source section becomes a "level" in the recap
                  const recapLevelNodes: LevelNode[] = recapData.source_sections.map((sourceSection, idx) => {
                    const recapLevelId = `recap_${recapSectionNumber}_source_${sourceSection.section_number}`;

                    return {
                      id: recapLevelId,
                      sectionTitle: recapData.recap_section_title,
                      levelTitle: `Review: ${sourceSection.section_title}`,
                      isUnlocked: false, // Will be calculated by progress logic
                      isCompleted: false,
                      isCurrent: false,
                      sectionId: recapData.recap_section_id,
                      levelId: recapLevelId,
                    };
                  });

                  sectionsData.push({
                    id: recapData.recap_section_id,
                    title: recapData.recap_section_title,
                    levels: recapLevelNodes,
                  });
                } catch (recapError: any) {
                  // If recap section doesn't exist or fails, just log and continue
                  // This is expected for section 10 if only 3 sections exist
                  console.warn(`Could not fetch recap section ${currentSectionCount}:`, recapError.message || recapError);
                }
              }
            } catch (error) {
              console.error(`Failed to fetch levels for section ${section.title}:`, error);
            }
          }

          // If sections came back empty but we haven't exhausted retries,
          // reset the cache session flags and retry after a short delay.
          if (sectionsData.length === 0 && retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current += 1;
            console.warn(`[HomeScreen] Sections empty — retry ${retryCountRef.current}/${MAX_RETRIES}`);
            // Reset the cached API session flags so the next call hits the real API
            cachedBackendApi.resetSessionTracking();
            isFetchingRef.current = false;
            // Short delay before retrying to allow backend/network to settle
            setTimeout(() => fetchLearningPath(), 1000);
            return; // Exit this invocation; the retry will finish the job
          }

          // Reset retry counter on success (or final attempt)
          retryCountRef.current = 0;

          setSections(sectionsData);

          // Mark that we've successfully loaded data
          hasInitiallyLoadedRef.current = true;
          setHasInitiallyLoaded(true);

          // Set the initial horizontal position only once per screen mount.
          if (!hasInitializedSectionPositionRef.current && sectionsData.length > 0) {
            const userSectionIndex = user?.currentSectionId
              ? sectionsData.findIndex((s) => s.id === user.currentSectionId)
              : -1;
            const initialIndex =
              activeSectionIndex >= 0 && activeSectionIndex < sectionsData.length
                ? activeSectionIndex
                : userSectionIndex >= 0
                  ? userSectionIndex
                  : 0;

            setActiveSectionIndex(initialIndex);
            setTimeout(() => {
              horizontalScrollRef.current?.scrollTo({
                x: initialIndex * screenWidth,
                animated: false,
              });
              hasInitializedSectionPositionRef.current = true;
            }, 100);
          }
        } catch (error) {
          console.error('Failed to fetch learning path:', error);
          Alert.alert(
            'Error',
            'Failed to load learning path. Please check your connection and try again.'
          );
        } finally {
          setIsLoading(false);
          await refreshStaleState();
          isFetchingRef.current = false;
        }
  }, [activeSectionIndex, user?.$id, user?.currentLevelId, user?.currentSectionId, dispatch, notifyOnNewSections, refreshStaleState]);

  const handleManualRefresh = React.useCallback(async () => {
    if (isRefreshingContent || !user?.$id) {
      return;
    }

    setIsRefreshingContent(true);
    try {
      await cachedBackendApi.forceRefreshLearningPath();
      await AsyncStorage.setItem(LAST_NEW_SECTION_CHECK_KEY, Date.now().toString());
      cachedBackendApi.resetSessionTracking();
      isFetchingRef.current = false;
      retryCountRef.current = 0;
      await fetchLearningPath();
      await notificationService.syncAdminBroadcasts(user.$id);
      setHasNewSectionsAvailable(false);
      Alert.alert('Updated', 'Content is now up to date.');
    } catch (error) {
      console.error('Manual refresh failed:', error);
      Alert.alert('Refresh failed', 'Could not refresh content right now. Please try again.');
    } finally {
      setIsRefreshingContent(false);
      await refreshStaleState();
      await checkForNewSectionsAvailability();
    }
  }, [checkForNewSectionsAvailability, fetchLearningPath, isRefreshingContent, refreshStaleState, user?.$id]);

  // ── Trigger 1: runs on mount AND whenever user.$id / progress keys change.
  // This guarantees the fetch fires even if Redux Persist hydrates user AFTER
  // the screen has already gained focus (the classic first-load blank screen bug).
  useEffect(() => {
    fetchLearningPath();
  }, [fetchLearningPath]);

  // ── Trigger 2: re-fetch silently when the user navigates back to this screen.
  useFocusEffect(
    React.useCallback(() => {
      fetchLearningPath();
      checkForNewSectionsAvailability();
    }, [checkForNewSectionsAvailability, fetchLearningPath])
  );

  useEffect(() => {
    refreshStaleState();
  }, [refreshStaleState]);

  useEffect(() => {
    if (hasInitiallyLoaded) {
      checkForNewSectionsAvailability(true);
    }
  }, [checkForNewSectionsAvailability, hasInitiallyLoaded]);

  const navigateToLevel = React.useCallback(
    async (node: LevelNode, sectionIndex: number) => {
      if (!node.isUnlocked && !node.isCurrent && !node.isCompleted) {
        return;
      }

      if (user) {
        const { lives } = livesService.calculateCurrentLives(
          user.lives !== undefined && user.lives !== null ? user.lives : 5,
          user.lastLifeRegenTime || new Date().toISOString()
        );

        if (lives === 0) {
          const timeRemaining = livesService.getTimeUntilNextLife(
            0,
            user.lastLifeRegenTime || new Date().toISOString()
          );
          const timeFormatted = livesService.formatTimeRemaining(timeRemaining);

          Alert.alert(
            'No Lives Available',
            `You have 0 lives remaining. Your next life will regenerate in ${timeFormatted}.`,
            [{ text: 'OK', style: 'default' }]
          );
          return;
        }
      }

      try {
        if (user?.$id) {
          const progressUpdate = {
            currentLevelId: node.levelId,
            currentSectionId: node.sectionId,
            currentSection: sectionIndex + 1,
          };
          await databases.updateDocument(
            DB_ID,
            COLLECTIONS.USERS,
            user.$id,
            progressUpdate
          );
          dispatch(updateUser(progressUpdate));
        }
      } catch (error) {
        console.error('Failed to update progress:', error);
      }

      navigation.navigate('Question', {
        levelId: node.levelId,
        sectionId: node.sectionId,
        levelTitle: node.levelTitle,
        sectionTitle: node.sectionTitle,
      });
    },
    [dispatch, navigation, user]
  );

  const scrollToSection = React.useCallback((sectionIndex: number) => {
    horizontalScrollRef.current?.scrollTo({
      x: sectionIndex * screenWidth,
      animated: true,
    });
    setActiveSectionIndex(sectionIndex);
    setIsSectionDropdownOpen(false);
  }, []);

  const sectionPickerItems = React.useMemo(
    () =>
      sections.map((section, sectionIndex) => ({
        key: section.id,
        sectionIndex,
        sectionTitle: section.title,
        levelCount: section.levels.length,
      })),
    [sections]
  );

  // Calculate level progress based on user's current position
  const calculateLevelProgress = (
    sectionId: string,
    levelId: string,
    levelIndex: number,
    sectionLevels: any[],
    firstSectionId?: string,
    completedLevelsSet?: Set<string>,
    builtSectionsData?: Section[] // Pass the sections data being built
  ) => {
    const currentSectionId = user?.currentSectionId;
    const currentLevelId = user?.currentLevelId;

    // Use provided completedLevelsSet or fall back to state
    const levelsToCheck = completedLevelsSet || completedLevels;

    // Check if this level is completed
    const isCompleted = levelsToCheck.has(levelId);

    // CRITICAL: A completed level is ALWAYS unlocked - no exceptions!
    // This ensures completed levels always show checkmarks, never locks
    if (isCompleted) {
      const isCurrent = sectionId === currentSectionId && levelId === currentLevelId;
      return { isUnlocked: true, isCompleted: true, isCurrent };
    }

    // If no progress exists, unlock first level of every section
    if (!currentSectionId || !currentLevelId) {
      return {
        isUnlocked: levelIndex === 0,
        isCompleted: false,
        isCurrent: false,
      };
    }

    const isCurrent = sectionId === currentSectionId && levelId === currentLevelId;

    // Start with: unlock if this is the current level
    let isUnlocked = isCurrent;

    if (levelIndex > 0) {
      // For levels after the first in a section, unlock if previous level is completed
      const previousLevel = sectionLevels[levelIndex - 1];
      isUnlocked = isUnlocked || levelsToCheck.has(previousLevel.level_id);
    } else if (levelIndex === 0) {
      // First level of any section is always unlocked – users can start from any section
      isUnlocked = true;
    }

    return { isUnlocked, isCompleted: false, isCurrent };
  };

  const renderLevelNode = (
    node: LevelNode,
    index: number,
    isLast: boolean,
    sectionIndex: number
  ) => {
    const isLeftSide = index % 2 === 0;

    const handleNodePress = () => {
      void navigateToLevel(node, sectionIndex);
    };

    return (
      <View key={node.id} style={styles.levelContainer}>
        {/* Path Connector */}
        {!isLast && (
          <Svg style={styles.pathSvg}>
            <Path
              d={
                isLeftSide
                  ? `M ${screenWidth * 0.25 + 10}, 45 C ${screenWidth * 0.25 + 80
                  }, 100, ${screenWidth * 0.75 - 80}, 80, ${screenWidth * 0.75 - 10
                  }, 145`
                  : `M ${screenWidth * 0.75 - 10}, 45 C ${screenWidth * 0.75 - 80
                  }, 100, ${screenWidth * 0.25 + 80}, 80, ${screenWidth * 0.25 + 10
                  }, 145`
              }
              stroke="#FF5C02"
              strokeWidth="5"
              fill="none"
            />
          </Svg>
        )}

        <View style={[styles.levelRow, !isLeftSide && styles.levelRowReverse]}>
          {/* Level node */}
          <View style={styles.nodeWrapper}>
            <Animated.View
              style={[
                { transform: node.isCurrent && !node.isCompleted ? [{ scale: pulseAnim }] : [] }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.levelNode,
                  node.isCompleted && styles.completedLevelNode,
                  node.isCurrent && !node.isCompleted && styles.currentLevelNode,
                  !node.isUnlocked && !node.isCurrent && !node.isCompleted && styles.lockedNode,
                ]}
                onPress={handleNodePress}
                disabled={!node.isUnlocked && !node.isCurrent && !node.isCompleted}
              >
                {node.isCompleted ? (
                  <Text style={styles.completedNodeIcon}>✓</Text>
                ) : node.isCurrent ? (
                  <Image
                    source={require("../../../assets/starIcon.png")}
                    style={styles.starIcon}
                  />
                ) : node.isUnlocked ? (
                  <Image
                    source={require("../../../assets/starIcon.png")}
                    style={styles.starIcon}
                  />
                ) : (
                  <Image
                    source={require("../../../assets/lockIcon.png")}
                    style={styles.starIcon}
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
            {/* Removed level title display - users can see it when they click */}
          </View>
        </View>

        {/* Avatar next to current level */}
        {node.isCurrent && (
          <View
            style={[
              styles.avatarContainer,
              isLeftSide ? styles.avatarLeft : styles.avatarRight,
            ]}
          >
            <View style={styles.avatar}>
              <Image
                source={getAvatarById(user?.avatar)}
                style={styles.avatarImage}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSection = (section: Section, sectionIndex: number) => {
    const sectionDecorations = getDecorationsForSection(section.title, sectionIndex);
    
    // Get or create scroll value for this section
    if (!scrollYValues.current[section.id]) {
      scrollYValues.current[section.id] = new Animated.Value(0);
    }
    const scrollY = scrollYValues.current[section.id];

    // Cloud parallax interpolations (slower movement - 0.3x speed)
    const cloudParallax = (initialTop: number) => ({
      transform: [{
        translateY: scrollY.interpolate({
          inputRange: [0, 1000],
          outputRange: [0, -300],
          extrapolate: 'extend',
        })
      }]
    });

    // Decoration parallax interpolations (medium movement - 0.5x speed)
    const decorationParallax = (initialTop: number = 0) => ({
      transform: [{
        translateY: scrollY.interpolate({
          inputRange: [0, 1000],
          outputRange: [0, -500],
          extrapolate: 'extend',
        })
      }]
    });

    return (
      <View key={section.id} style={styles.pageContainer}>
        {/* Cloud decorations with parallax */}
        <View style={styles.cloudsContainer}>
          <Animated.Text style={[styles.cloud, { top: 20, left: 30 }, cloudParallax(20)]}>☁️</Animated.Text>
          <Animated.Text style={[styles.cloud, { top: 60, right: 40 }, cloudParallax(60)]}>☁️</Animated.Text>
          <Animated.Text style={[styles.cloud, { top: 100, left: screenWidth * 0.6 }, cloudParallax(100)]}>
            ☁️
          </Animated.Text>
          <Animated.Text style={[styles.cloud, { top: 200, right: 20, fontSize: 40 }, cloudParallax(200)]}>
            ☁️
          </Animated.Text>
          <Animated.Text style={[styles.cloud, { top: 350, left: 20, fontSize: 45 }, cloudParallax(350)]}>
            ☁️
          </Animated.Text>
          <Animated.Text style={[styles.cloud, { top: 500, right: 50, fontSize: 35 }, cloudParallax(500)]}>
            ☁️
          </Animated.Text>
        </View>

        {/* Section-specific decorative elements with parallax */}
        <View style={styles.decorationsContainer}>
          {sectionDecorations.decorations.map((decoration, idx) => (
            <Animated.Text
              key={`decoration-${idx}`}
              style={[
                styles.sectionDecoration,
                {
                  top: decoration.position.top,
                  bottom: decoration.position.bottom,
                  left: decoration.position.left,
                  right: decoration.position.right,
                  fontSize: decoration.size || 40,
                  opacity: decoration.opacity || 0.9,
                  transform: [{ rotate: `${decoration.rotation || 0}deg` }],
                },
                decorationParallax(decoration.position.top || 0),
              ]}
            >
              {decoration.emoji}
            </Animated.Text>
          ))}
        </View>

        {/* Fixed Section Header */}
        <View style={styles.sectionHeaderContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderContent}>
              <TouchableOpacity
                style={styles.sectionTitleButton}
                activeOpacity={0.85}
                onPress={() =>
                  setIsSectionDropdownOpen((prev) =>
                    activeSectionIndex === sectionIndex ? !prev : true
                  )
                }
              >
                <Text style={styles.sectionTitle} numberOfLines={1}>
                  {section.title}
                </Text>
                <Ionicons
                  name={
                    isSectionDropdownOpen && activeSectionIndex === sectionIndex
                      ? 'chevron-up'
                      : 'chevron-down'
                  }
                  size={18}
                  color="#FFFFFF"
                  style={styles.sectionChevron}
                />
              </TouchableOpacity>
              <Text style={styles.sectionSubtitle}>
                {section.levels.length} {section.levels.length === 1 ? 'Level' : 'Levels'}
              </Text>
            </View>
            <View style={styles.bookIconBadge}>
              <Image
                source={require("../../../assets/bookIcon.png")}
                style={styles.bookIconImage}
              />
            </View>
          </View>

          {isSectionDropdownOpen && activeSectionIndex === sectionIndex && (
            <View style={styles.sectionDropdownPanel}>
              <Text style={styles.sectionDropdownTitle}>Sections</Text>
              <ScrollView style={styles.sectionDropdownList} showsVerticalScrollIndicator={false}>
                {sectionPickerItems.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.sectionDropdownItem,
                      item.sectionIndex === activeSectionIndex && styles.sectionDropdownItemActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => scrollToSection(item.sectionIndex)}
                  >
                    <Text style={styles.sectionDropdownItemTitle} numberOfLines={1}>
                      {item.sectionTitle}
                    </Text>
                    <Text style={styles.sectionDropdownItemMeta}>
                      {item.levelCount} {item.levelCount === 1 ? 'Level' : 'Levels'}
                    </Text>
                  </TouchableOpacity>
                ))}

                {sectionPickerItems.length === 0 && (
                  <Text style={styles.sectionDropdownEmptyText}>No sections available yet.</Text>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Scrollable Levels with scroll tracking */}
        <Animated.ScrollView
          style={styles.sectionScrollView}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          <View style={styles.levelsContainer}>
            {section.levels
              .slice()
              .map((node, reverseIndex) => {
                const originalIndex = section.levels.length - 1 - reverseIndex;
                return renderLevelNode(
                  node,
                  originalIndex,
                  originalIndex === 0, // First level is now at bottom
                  sectionIndex
                );
              })}
          </View>
        </Animated.ScrollView>
      </View>
    );
  };

  if (isLoading || !hasInitiallyLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <LearningPathSkeleton />
      </SafeAreaView>
    );
  }

  // ✅ Add empty state check AFTER a successful initial load AND retries exhausted
  if (sections.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Image
            source={require('../../../assets/fox.png')}
            style={styles.emptyStateFox}
            resizeMode="contain"
          />
          <Text style={styles.emptyStateTitle}>No Learning Content Available</Text>
          <Text style={styles.emptyStateMessage}>
            We couldn't load the learning content.{'\n\n'}
            Check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => {
              // Force fresh fetch: reset all caching guards and retry
              retryCountRef.current = 0;
              cachedBackendApi.resetSessionTracking();
              setIsLoading(true);
              setHasInitiallyLoaded(false);
              hasInitiallyLoadedRef.current = false;
              isFetchingRef.current = false;
              fetchLearningPath();
            }}
          >
            <Text style={styles.emptyStateButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
          if (nextIndex >= 0 && nextIndex < sections.length) {
            setActiveSectionIndex(nextIndex);
            setIsSectionDropdownOpen(false);
          }
        }}
      >
        {sections.map((section, index) => renderSection(section, index))}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.refreshFab,
          hasNewSectionsAvailable && styles.refreshFabHighlighted,
          isRefreshingContent && styles.refreshFabDisabled,
        ]}
        onPress={handleManualRefresh}
        disabled={isRefreshingContent}
        activeOpacity={0.85}
      >
        <Ionicons
          name={isRefreshingContent ? 'sync' : 'refresh'}
          size={24}
          color="#FFFFFF"
        />
        {hasNewSectionsAvailable && !isRefreshingContent && (
          <View style={styles.refreshFabDot} />
        )}
      </TouchableOpacity>

      {hasNewSectionsAvailable && !isContentStale && (
        <Animated.View
          style={[
            styles.newSectionBadgeWrap,
            styles.newSectionBadgeAboveRefresh,
            { transform: [{ scale: newSectionBadgePulse }] },
          ]}
        >
          <TouchableOpacity
            style={styles.newSectionBadge}
            onPress={handleManualRefresh}
            disabled={isRefreshingContent}
            activeOpacity={0.9}
          >
            <Ionicons name="sparkles" size={14} color="#FFFFFF" />
            <Text style={styles.newSectionBadgeText}>
              {isRefreshingContent ? 'Refreshing...' : 'New Section Available'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Coach marks for first-time users */}
      <CoachMark
        visible={showCoachMarks}
        steps={HOME_COACH_STEPS}
        currentStep={coachStep}
        onNext={() => setCoachStep((prev) => prev + 1)}
        onSkip={() => {
          dispatch(markHomeTourSeen());
          setCoachStep(0);
        }}
        onComplete={() => {
          dispatch(markHomeTourSeen());
          setCoachStep(0);
        }}
      /> 
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4E8F5", // Light blue sky background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    width: screenWidth,
    height: "100%",
  },
  sectionScrollView: {
    flex: 1,
    marginTop: 0,
  },
  cloudsContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
  decorationsContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    // zIndex: 1,
    pointerEvents: "none",
  },
  sectionDecoration: {
    position: "absolute",
  },
  cloud: {
    position: "absolute",
    fontSize: 32,
    opacity: 0.4,
  },
  sectionHeaderContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
    marginBottom: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    backgroundColor: "#FF5722", // Orange
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#FFFFFF",
    flexShrink: 1,
    textTransform: "uppercase",
  },
  sectionChevron: {
    marginTop: 1,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.92)",
    marginTop: 4,
    fontWeight: "600",
  },
  bookIconBadge: {
    marginLeft: 12,
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  bookIconImage: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  starIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  levelsContainer: {
    paddingHorizontal: 0,
    marginTop: 10,
    paddingBottom: 28,
  },
  levelContainer: {
    height: 150,
    position: "relative",
  },
  pathSvg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    position: "absolute",
    top: 0,
  },
  levelRowReverse: {
    justifyContent: "flex-end",
  },
  nodeWrapper: {
    width: screenWidth / 2,
    alignItems: "center",
  },
  levelTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 8,
    maxWidth: screenWidth / 2 - 40,
  },
  currentLevelTitle: {
    color: "#FF5722",
    fontWeight: "bold",
  },
  lockedLevelTitle: {
    color: "#999",
  },
  levelNode: {
    width: 50,
    height: 50,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FF9800", // Orange border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  currentLevelNode: {
    width: 50,
    height: 50,
    borderRadius: 45,
    backgroundColor: "#FF5722", // Orange for current level
    borderColor: "#FFC107",
    borderWidth: 5,
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  completedLevelNode: {
    backgroundColor: "#4CAF50", // Green for completed levels
    borderColor: "#2E7D32",
    borderWidth: 4,
  },
  lockedNode: {
    backgroundColor: "#F0F0F0",
    borderColor: "#E0E0E0",
    opacity: 0.8,
  },
  nodeIcon: {
    fontSize: 20,
    color: "#FF9800", // Orange for unlocked
  },
  completedNodeIcon: {
    fontSize: 20,
    color: "#FFFFFF", // White checkmark for completed
    fontWeight: "bold",
  },
  avatarContainer: {
    position: "absolute",
    zIndex: 10,
  },
  avatarLeft: {
    top: 30,
    left: screenWidth * 0.25 - 70,
  },
  avatarRight: {
    top: 30,
    right: screenWidth * 0.25 - 70,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },

  // ✅ Add empty state styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#D4E8F5',
  },
  emptyStateFox: {
    width: 250,
    height: 250,
    marginBottom: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshFab: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
  },
  refreshFabDisabled: {
    opacity: 0.7,
  },
  refreshFabHighlighted: {
    backgroundColor: '#0EA5A4',
  },
  refreshFabDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  newSectionBadge: {
    backgroundColor: '#0EA5A4',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
    overflow: 'hidden',
  },
  newSectionBadgeWrap: {
    position: 'absolute',
    right: 20,
    bottom: 96,
    zIndex: 100,
  },
  newSectionBadgeAboveRefresh: {
    bottom: 160,
  },
  newSectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionDropdownPanel: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F6D5C8',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    maxHeight: screenHeight * 0.34,
  },
  sectionDropdownTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#A14A1C',
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  sectionDropdownList: {
    maxHeight: screenHeight * 0.26,
  },
  sectionDropdownItem: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sectionDropdownItemActive: {
    backgroundColor: '#FCE0D4',
    borderColor: '#E8BAA8',
  },
  sectionDropdownItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C211B',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  sectionDropdownItemMeta: {
    fontSize: 12,
    color: '#7B6A63',
    fontWeight: '500',
  },
  sectionDropdownEmptyText: {
    textAlign: 'center',
    color: '#B45309',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
});

export default HomeScreen;
