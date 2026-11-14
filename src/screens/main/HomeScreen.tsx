import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  Alert,
  Animated,
  Platform,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from "react-native-svg";
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../store";
import { getAvatarById } from "../../utils/avatarUtils";
import { ApiHttpError, getApiRecoveryMessage } from "../../services/backendApi";
import cachedBackendApi from "../../services/cachedBackendApi";
import { databases, DB_ID, COLLECTIONS } from "../../services/appwrite";
import { useFocusEffect } from "@react-navigation/native";
import { updateUser } from "../../store/slices/authSlice";
import cacheService from "../../services/cacheService";
import { getCompletedLevelIds } from "../../services/completedLevelService";
import { livesService } from "../../services/lives";
import LearningPathSkeleton from "../../components/skeletons/LearningPathSkeleton";
import { getSupportCode } from '../../utils/supportCode';
import analyticsService from '../../services/analytics';
import { getDecorationsForSection } from "../../config/sectionDecorations";
import CoachMark from "../../components/tutorial/CoachMark";
import { HOME_COACH_STEPS } from "../../config/coachMarkSteps";
import { markHomeTourSeen, markTutorialActionCompleted } from "../../store/slices/tutorialSlice";
import notificationService from "../../services/notifications";
import {
  getInitialSectionIndex,
  getLevelProgressState,
  getRecapLevelProgressState,
  getRecapSectionNumberForCompletedRegularSections,
  getTopFirstLevelRenderItems,
  isLevelEnterable,
  resolveRecapSourceLevelIds,
} from "../../utils/progressBehavior";
import {
  getHomeSwipeTutorialAnchorIndex,
  getNextHomeSwipeTutorialStage,
  type HomeSwipeTutorialStage,
} from "../../utils/tutorialBehavior";
import {
  getHorizontalDragDelta,
  getHorizontalWheelDelta,
  getVerticalDragDelta,
} from "../../utils/webScrollNavigation";

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
  regularSectionNumber?: number;
  levels: LevelNode[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const SECTION_IDS_CACHE_KEY = '@moneyquest_last_section_ids';
const NOTIFIED_SECTION_IDS_CACHE_KEY = '@moneyquest_notified_section_ids';
const WEB_DRAG_AXIS_THRESHOLD_PX = 6;

const clampSectionIndex = (sectionIndex: number, sectionCount: number) =>
  Math.max(0, Math.min(sectionCount - 1, sectionIndex));

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { hasSeenHomeTour } = useSelector((state: RootState) => state.tutorial);
  const dispatch = useDispatch();

  const { width: windowWidth } = useWindowDimensions();
  // On web the app renders inside AppFrame's centered phone frame (max 480px
  // wide). All layout geometry must use the frame width — the raw window width
  // would size pages, paths and decorations wider than the visible frame and
  // distort on refresh or when the window is resized.
  const layoutWidth = Platform.OS === 'web' ? Math.min(windowWidth, 480) : windowWidth;

  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedLevels, setCompletedLevels] = useState<Set<string>>(new Set());
  const [isContentStale, setIsContentStale] = useState(false);
  const [isRefreshingContent, setIsRefreshingContent] = useState(false);
  const [hasNewSectionsAvailable, setHasNewSectionsAvailable] = useState(false);
  const shownPathVersion = useRef<string | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [isWebPagerMouseDown, setIsWebPagerMouseDown] = useState(false);

  // Coach marks
  const [coachStep, setCoachStep] = useState(0);
  const [homeSwipeTutorialStage, setHomeSwipeTutorialStage] = useState<HomeSwipeTutorialStage | null>(null);
  const [isHomeSwipePromptVisible, setIsHomeSwipePromptVisible] = useState(false);
  const showCoachMarks = !hasSeenHomeTour && !isLoading && sections.length > 0 && homeSwipeTutorialStage === null;
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
  const horizontalScrollRef = useRef<FlatList<Section>>(null);
  const horizontalScrollXRef = useRef(0);
  const verticalScrollRefs = useRef<Record<string, React.ComponentRef<typeof ScrollView> | null>>({});
  const verticalScrollYRefs = useRef<Record<string, number>>({});
  const verticalMouseDragRef = useRef<{
    sectionId: string;
    axis: 'pending' | 'vertical';
    startClientX: number;
    startClientY: number;
    lastClientY: number;
  } | null>(null);
  const horizontalMouseDragRef = useRef<{
    axis: 'pending' | 'horizontal' | 'vertical';
    startClientX: number;
    startClientY: number;
    startScrollX: number;
  } | null>(null);

  // RNW fails to resolve flex/percentage heights inside the horizontal pager
  // pages on web, which clips the levels and breaks wheel scrolling. The
  // FlatList height is stable (flex-resolved), so measure it plus each
  // section's header and size the levels ScrollView explicitly on web.
  // Native keeps normal flex layout. State so measurements re-render.
  const [pagerHeight, setPagerHeight] = useState(0);
  const [headerHeights, setHeaderHeights] = useState<Record<string, number>>({});
  const hasInitializedSectionPositionRef = useRef(false);
  const hasUserDraggedSectionsRef = useRef(false);
  const dropdownScrollY = useRef(new Animated.Value(0)).current;
  const [dropdownScrollMetrics, setDropdownScrollMetrics] = useState({
    contentHeight: 0,
    viewportHeight: 0,
  });

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
      const stale = await cachedBackendApi.isLearningPathStale();
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

  // ─────────────────────────────────────────────────────────────────────────
  // Main data-fetch function — stable useCallback so it can be used in both
  // useEffect (initial / user-change load) and useFocusEffect (focus refresh)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchLearningPath = React.useCallback(async (fresh = false) => {
    // Don't fetch if user isn't hydrated yet — wait for Redux Persist
    if (!user?.$id) return;

    // Prevent concurrent invocations (useEffect + useFocusEffect can fire together)
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setStartupError(null);
    const fetchStartedAt = Date.now();
    const pathRequest = cachedBackendApi.getLearningPath(fresh);
    void pathRequest.catch(() => {});

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

              void Promise.race([livesPromise, timeoutPromise]).then(({ lives, lastLifeRegenTime }) => {
                if (lives !== user.lives || lastLifeRegenTime !== user.lastLifeRegenTime) {
                  dispatch(updateUser({ lives, lastLifeRegenTime }));
                }
              }).catch(error => console.warn('Lives refresh unavailable:', error));
            } catch (error) {
              console.error('Failed to refresh lives on HomeScreen (non-fatal):', error);
              // Continue with cached lives - don't block the UI
            }
          }

          let latestCompletedLevels = new Set<string>();

          // 🚀 STEP 1: Load cached completed levels FIRST (instant!)
          // 🌐 STEP 2: Fetch fresh data from Appwrite and MERGE with cache
          // CRITICAL: Merge instead of replace to prevent race conditions where
          // Appwrite might not yet have the just-completed level synced
          if (user?.$id) {
            const cachedCompletedLevels = await Promise.race([
              cacheService.getCompletedLevels(user.$id),
              new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 3000)),
            ]);
            if (cachedCompletedLevels.length > 0) {
              latestCompletedLevels = new Set(cachedCompletedLevels);
            }

            try {
              const appwriteCompletedLevels = await Promise.race([
                getCompletedLevelIds(user.$id),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Progress request timed out')), 5000)),
              ]);
              // MERGE: always include both Appwrite and cached levels.
              // Appwrite is the source of truth, but recent completions may
              // not have synced yet, so we keep cache entries too.
              const mergedSet = new Set<string>([
                ...latestCompletedLevels,
                ...appwriteCompletedLevels,
              ]);
              latestCompletedLevels = mergedSet;
              // 💾 Persist the merged set so both platforms stay in sync
              void cacheService.saveCompletedLevels(user.$id, Array.from(latestCompletedLevels)).catch(() => {});

            } catch (error) {
              console.error('❌ Failed to fetch from Appwrite:', error);
              // If network fails, we still have cached data!
            }
          }

          // ✨ Update state with latest completed levels BEFORE building sections
          setCompletedLevels(latestCompletedLevels);

          const { sections: backendSections, version } = await pathRequest;
          shownPathVersion.current = version;
          void cachedBackendApi.getPendingLearningPath()?.then(next => {
            if (shownPathVersion.current === version) setHasNewSectionsAvailable(next.version !== version);
          }).catch(() => {});
          void notifyOnNewSections(backendSections);
          void notificationService.syncAdminBroadcasts(user.$id).catch(() => {});

          const sectionsData: Section[] = [];
          let regularSectionsProcessed = 0;
          for (const section of backendSections) {
            try {
              // Skip sections without a valid section_id
              if (!section.section_id || section.title.startsWith("Recap Section ")) {
                console.warn(`Section "${section.title}" has no section_id, skipping...`);
                continue;
              }

              // Fetch levels for this section using section_id with caching
              const levels = section.levels;
              if (levels.length === 0) continue;

              const levelNodes: LevelNode[] = levels.map((level, levelIndex) => {
                // Use the section_id from the level for progress tracking
                const levelSectionId = level.section_id || section.section_id!;

                const progress = calculateLevelProgress(
                  levelSectionId,
                  level.level_id,
                  levelIndex,
                  levels,
                  latestCompletedLevels
                );

                return {
                  id: level.level_id,
                  sectionTitle: section.title,
                  levelTitle: level.title,
                  sectionId: levelSectionId,
                  levelId: level.level_id,
                  ...progress,
                };
              });

              const regularSectionNumber = regularSectionsProcessed + 1;

              sectionsData.push({
                id: section.section_id,
                title: section.title,
                regularSectionNumber,
                levels: levelNodes,
              });
              regularSectionsProcessed = regularSectionNumber;

              // Check if we should insert a recap section after this section
              // After every 9 regular sections, insert a recap at position 10, 20, 30, etc.
              // Recap 10 reviews sections 1-9, recap 20 reviews 11-19, etc.
              const recapSectionNumber = getRecapSectionNumberForCompletedRegularSections(regularSectionsProcessed);
              if (recapSectionNumber !== null) {
                const sourceSections = sectionsData.filter(entry => entry.regularSectionNumber).slice(-9);
                const existingRecap = backendSections.find(entry => entry.section_number === recapSectionNumber &&
                  entry.title.startsWith('Recap Section '));
                const recapSectionId = existingRecap?.section_id || 'recap_' + recapSectionNumber;
                const recapLevelIds = sourceSections.map(entry =>
                  'recap_' + recapSectionNumber + '_source_' + (backendSections.find(item => item.section_id === entry.id)?.section_number ?? entry.regularSectionNumber)
                );
                const title = existingRecap?.title || 'Review & Practice';
                sectionsData.push({
                  id: recapSectionId,
                  title,
                  levels: sourceSections.map((source, index) => ({
                    id: recapLevelIds[index],
                    sectionTitle: title,
                    levelTitle: 'Review: ' + source.title,
                    sectionId: recapSectionId,
                    levelId: recapLevelIds[index],
                    ...getRecapLevelProgressState({
                      recapSectionId,
                      recapLevelId: recapLevelIds[index],
                      recapLevelIndex: index,
                      recapLevelIds,
                      sourceLevelIds: resolveRecapSourceLevelIds({
                        sourceSectionId: source.id,
                        sourceSectionNumber: source.regularSectionNumber!,
                        sourceSectionTitle: source.title,
                        builtSections: sectionsData,
                      }),
                      completedLevelIds: latestCompletedLevels,
                      currentSectionId: user?.currentSectionId,
                      currentLevelId: user?.currentLevelId,
                    }),
                  })),
                });
              }
            } catch (error) {
              console.error(`Failed to fetch levels for section ${section.title}:`, error);
            }
          }

          if (!hasInitiallyLoadedRef.current && sectionsData.length > 0) {
            void analyticsService.trackEvent('feature_used', {
              stage: 'home_first_content',
              duration_ms: Date.now() - fetchStartedAt,
              support_code: getSupportCode(),
            }).catch(() => {});
          }

          // Reset retry counter on success (or final attempt)
          retryCountRef.current = 0;

          setSections(sectionsData);
          if (sectionsData.length === 0) {
            void analyticsService.trackEvent('app_error', {
              stage: 'home_empty_content',
              support_code: getSupportCode(),
            }).catch(() => {});
          }

          // Mark that we've successfully loaded data
          hasInitiallyLoadedRef.current = true;
          setHasInitiallyLoaded(true);

          // Set the initial horizontal position only once per screen mount.
          if (!hasInitializedSectionPositionRef.current && sectionsData.length > 0) {
            const initialIndex = getInitialSectionIndex(
              sectionsData,
              user?.currentSectionId
            );

            setActiveSectionIndex(initialIndex);
            setTimeout(() => {
              horizontalScrollRef.current?.scrollToIndex({
                index: initialIndex,
                animated: false,
              });
              hasInitializedSectionPositionRef.current = true;
            }, 100);
          }
        } catch (error) {
          console.error('Failed to fetch learning path:', error);
          void analyticsService.trackEvent('app_error', {
            stage: 'home_content',
            support_code: getSupportCode(),
            error_code: String((error as any)?.code ?? (error as any)?.status ?? 'network'),
            request_id: error instanceof ApiHttpError ? error.requestId : null,
          }).catch(() => {});
          setStartupError(getApiRecoveryMessage(error));
          hasInitiallyLoadedRef.current = true;
          setHasInitiallyLoaded(true);
          if (fresh) throw error;
        } finally {
          setIsLoading(false);
          void refreshStaleState().catch(() => {});
          isFetchingRef.current = false;

        }
  }, [dispatch, notifyOnNewSections, refreshStaleState, user?.$id, user?.currentLevelId, user?.currentSectionId]);

  const handleManualRefresh = React.useCallback(async () => {
    if (isRefreshingContent || isFetchingRef.current || !user?.$id) {
      return;
    }

    setIsRefreshingContent(true);
    try {
      await fetchLearningPath(true);
      setHasNewSectionsAvailable(false);
      Alert.alert('Updated', 'Content is now up to date.');
    } catch (error) {
      console.error('Manual refresh failed:', error);
      Alert.alert('Refresh failed', 'Could not refresh content right now. Please try again.');
    } finally {
      setIsRefreshingContent(false);
      await refreshStaleState();
    }
  }, [fetchLearningPath, isRefreshingContent, refreshStaleState, user?.$id]);

  const handleWebHorizontalWheel = React.useCallback((event: any) => {
    if (Platform.OS !== 'web') {
      return;
    }

    const wheelDelta = getHorizontalWheelDelta(event.nativeEvent ?? event);
    if (wheelDelta === 0) {
      return;
    }

    event.preventDefault?.();
    horizontalScrollRef.current?.scrollToOffset({
      offset: horizontalScrollXRef.current + wheelDelta,
      animated: false,
    });
  }, []);

  const goToSection = React.useCallback((sectionIndex: number, animated = true) => {
    if (sections.length === 0) {
      return;
    }

    const nextIndex = clampSectionIndex(sectionIndex, sections.length);
    horizontalScrollXRef.current = nextIndex * layoutWidth;
    horizontalScrollRef.current?.scrollToOffset({
      offset: horizontalScrollXRef.current,
      animated,
    });
    setActiveSectionIndex(nextIndex);
    setIsSectionDropdownOpen(false);
    hasUserDraggedSectionsRef.current = false;
  }, [layoutWidth, sections.length]);

  const completeWebHorizontalDrag = React.useCallback(() => {
    horizontalMouseDragRef.current = null;
    setIsWebPagerMouseDown(false);

    if (sections.length === 0) {
      return;
    }

    const nextIndex = Math.max(
      0,
      Math.min(sections.length - 1, Math.round(horizontalScrollXRef.current / layoutWidth))
    );

    if (hasUserDraggedSectionsRef.current && nextIndex !== activeSectionIndex && homeSwipeTutorialStage) {
      const nextStage = getNextHomeSwipeTutorialStage(
        homeSwipeTutorialStage,
        activeSectionIndex,
        nextIndex
      );

      if (homeSwipeTutorialStage === 'left' && nextStage === 'right') {
        dispatch(markTutorialActionCompleted('home_swipe_left_performed'));
        setHomeSwipeTutorialStage('right');
        setIsHomeSwipePromptVisible(true);
      } else if (homeSwipeTutorialStage === 'right' && nextStage === 'complete') {
        dispatch(markTutorialActionCompleted('home_swipe_right_performed'));
        dispatch(markHomeTourSeen());
        setIsHomeSwipePromptVisible(false);
        setHomeSwipeTutorialStage(null);
        setCoachStep(0);
      }
    }

    goToSection(nextIndex, true);
  }, [activeSectionIndex, dispatch, goToSection, homeSwipeTutorialStage, layoutWidth, sections.length]);

  const getWebVerticalDragProps = React.useCallback((sectionId: string) => {
    if (Platform.OS !== 'web') {
      return {};
    }

    return {
      onMouseDown: (event: any) => {
        const mouseEvent = event.nativeEvent ?? event;
        if (mouseEvent.button !== 0) {
          return;
        }

        verticalMouseDragRef.current = {
          sectionId,
          axis: 'pending',
          startClientX: mouseEvent.clientX,
          startClientY: mouseEvent.clientY,
          lastClientY: mouseEvent.clientY,
        };
        event.preventDefault?.();
      },
      onMouseMove: (event: any) => {
        const dragState = verticalMouseDragRef.current;
        if (!dragState || dragState.sectionId !== sectionId) {
          return;
        }

        const mouseEvent = event.nativeEvent ?? event;
        if (typeof mouseEvent.buttons === 'number' && (mouseEvent.buttons & 1) !== 1) {
          verticalMouseDragRef.current = null;
          return;
        }

        if (dragState.axis === 'pending') {
          const deltaX = Math.abs(mouseEvent.clientX - dragState.startClientX);
          const deltaY = Math.abs(mouseEvent.clientY - dragState.startClientY);

          if (Math.max(deltaX, deltaY) < WEB_DRAG_AXIS_THRESHOLD_PX) {
            return;
          }

          if (deltaX > deltaY) {
            verticalMouseDragRef.current = null;
            return;
          }

          dragState.axis = 'vertical';
        }

        if (dragState.axis !== 'vertical') {
          return;
        }

        const dragDelta = getVerticalDragDelta(dragState.lastClientY, mouseEvent.clientY);
        if (dragDelta === 0) {
          return;
        }

        const nextOffset = Math.max(0, (verticalScrollYRefs.current[sectionId] ?? 0) + dragDelta);
        verticalScrollRefs.current[sectionId]?.scrollTo({ y: nextOffset, animated: false });
        verticalScrollYRefs.current[sectionId] = nextOffset;
        dragState.lastClientY = mouseEvent.clientY;
        event.preventDefault?.();
      },
      onMouseUp: () => {
        verticalMouseDragRef.current = null;
      },
      onMouseLeave: () => {
        verticalMouseDragRef.current = null;
      },
    };
  }, []);

  const webPagerMouseProps =
    Platform.OS === 'web'
      ? ({
          onMouseDown: (event: any) => {
            const mouseEvent = event.nativeEvent ?? event;
            if (mouseEvent.button === 0) {
              setIsWebPagerMouseDown(true);
              horizontalMouseDragRef.current = {
                axis: 'pending',
                startClientX: mouseEvent.clientX,
                startClientY: mouseEvent.clientY,
                startScrollX: horizontalScrollXRef.current,
              };
            }
          },
          onMouseMove: (event: any) => {
            const dragState = horizontalMouseDragRef.current;
            if (!dragState) {
              return;
            }

            const mouseEvent = event.nativeEvent ?? event;
            if (typeof mouseEvent.buttons === 'number' && (mouseEvent.buttons & 1) !== 1) {
              completeWebHorizontalDrag();
              return;
            }

            if (dragState.axis === 'pending') {
              const deltaX = Math.abs(mouseEvent.clientX - dragState.startClientX);
              const deltaY = Math.abs(mouseEvent.clientY - dragState.startClientY);

              if (Math.max(deltaX, deltaY) < WEB_DRAG_AXIS_THRESHOLD_PX) {
                return;
              }

              dragState.axis = deltaX >= deltaY ? 'horizontal' : 'vertical';
            }

            if (dragState.axis !== 'horizontal') {
              return;
            }

            const dragDelta = getHorizontalDragDelta(dragState.startClientX, mouseEvent.clientX);
            const nextOffset = Math.max(0, dragState.startScrollX + dragDelta);
            hasUserDraggedSectionsRef.current = true;
            horizontalScrollRef.current?.scrollToOffset({
              offset: nextOffset,
              animated: false,
            });
            event.preventDefault?.();
          },
          onMouseUp: () => {
            completeWebHorizontalDrag();
          },
          onMouseLeave: () => {
            completeWebHorizontalDrag();
          },
        } as any)
      : {};

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
    }, [fetchLearningPath])
  );

  useEffect(() => {
    refreshStaleState();
  }, [refreshStaleState]);

  useEffect(() => {
    if (isSectionDropdownOpen) {
      dropdownScrollY.setValue(0);
    }
  }, [dropdownScrollY, isSectionDropdownOpen, activeSectionIndex]);

  const navigateToLevel = React.useCallback(
    async (node: LevelNode, sectionIndex: number) => {
      const section = sections[sectionIndex];
      const isRegularSection = Boolean(section?.regularSectionNumber);

      if (isRegularSection) {
        const canEnter = node.isUnlocked || node.isCurrent || node.isCompleted;

        if (!canEnter) {
          Alert.alert(
            'Level Locked',
            'Finish the current level in this section before moving to the next one.'
          );
          return;
        }
      } else if (!node.isUnlocked && !node.isCurrent && !node.isCompleted) {
        return;
      }

      if (user) {
        const lives = user.lives !== undefined && user.lives !== null ? user.lives : 5;

        if (lives === 0) {
          Alert.alert(
            'No Lives Available',
            'You have 0 lives remaining. Complete a level to earn another life.',
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
    [completedLevels, dispatch, navigation, sections, user]
  );

  const scrollToSection = React.useCallback((sectionIndex: number) => {
    goToSection(sectionIndex, true);
  }, [goToSection]);

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

  const showDropdownScrollCue =
    dropdownScrollMetrics.contentHeight > dropdownScrollMetrics.viewportHeight + 4;
  const dropdownThumbHeight =
    dropdownScrollMetrics.contentHeight > 0 && dropdownScrollMetrics.viewportHeight > 0
      ? Math.max(
          34,
          (dropdownScrollMetrics.viewportHeight / dropdownScrollMetrics.contentHeight) *
            dropdownScrollMetrics.viewportHeight
        )
      : 34;
  const dropdownMaxScroll = Math.max(
    1,
    dropdownScrollMetrics.contentHeight - dropdownScrollMetrics.viewportHeight
  );
  const dropdownMaxThumbOffset = Math.max(
    0,
    dropdownScrollMetrics.viewportHeight - dropdownThumbHeight
  );
  const dropdownThumbTranslateY = dropdownScrollY.interpolate({
    inputRange: [0, dropdownMaxScroll],
    outputRange: [0, dropdownMaxThumbOffset],
    extrapolate: 'clamp',
  });

  // Calculate level progress based on user's current position
  const calculateLevelProgress = (
    sectionId: string,
    levelId: string,
    levelIndex: number,
    sectionLevels: any[],
    completedLevelsSet?: Set<string>
  ) => {
    return getLevelProgressState({
      sectionId,
      levelId,
      levelIndex,
      sectionLevelIds: sectionLevels.map((level) => level.level_id),
      completedLevelIds: completedLevelsSet || completedLevels,
      currentSectionId: user?.currentSectionId,
      currentLevelId: user?.currentLevelId,
    });
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
                  ? `M ${layoutWidth * 0.25 + 10}, 45 C ${layoutWidth * 0.25 + 80
                  }, 100, ${layoutWidth * 0.75 - 80}, 80, ${layoutWidth * 0.75 - 10
                  }, 145`
                  : `M ${layoutWidth * 0.75 - 10}, 45 C ${layoutWidth * 0.75 - 80
                  }, 100, ${layoutWidth * 0.25 + 80}, 80, ${layoutWidth * 0.25 + 10
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
          <View style={[styles.nodeWrapper, { width: layoutWidth / 2 }]}>
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
        {node.isCurrent && !node.isCompleted && (
          <View
            style={[
              styles.avatarContainer,
              isLeftSide ? styles.avatarLeft : styles.avatarRight,
              isLeftSide
                ? { left: layoutWidth * 0.25 - 70 }
                : { right: layoutWidth * 0.25 - 70 },
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
    const headerHeight = headerHeights[section.id] ?? 0;
    const webScrollHeight =
      Platform.OS === 'web' && pagerHeight > 0 && headerHeight > 0
        ? Math.max(pagerHeight - headerHeight, 160)
        : undefined;

    const sectionDecorations = getDecorationsForSection(section.title, sectionIndex, layoutWidth);
    
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
      <View key={section.id} style={[styles.pageContainer, { width: layoutWidth }]}>
        {/* Cloud decorations with parallax */}
        <View style={styles.cloudsContainer}>
          <Animated.Text style={[styles.cloud, { top: 20, left: 30 }, cloudParallax(20)]}>☁️</Animated.Text>
          <Animated.Text style={[styles.cloud, { top: 60, right: 40 }, cloudParallax(60)]}>☁️</Animated.Text>
          <Animated.Text style={[styles.cloud, { top: 100, left: layoutWidth * 0.6 }, cloudParallax(100)]}>
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
        <View
          style={styles.sectionHeaderContainer}
          onLayout={(event) => {
            const height = Math.round(event.nativeEvent.layout.height);
            setHeaderHeights((prev) =>
              prev[section.id] === height ? prev : { ...prev, [section.id]: height }
            );
          }}
        >
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
            <View style={styles.sectionHeaderActions}>
              {Platform.OS === 'web' && (
                <>
                  <TouchableOpacity
                    style={[
                      styles.sectionNavButton,
                      sectionIndex === 0 && styles.sectionNavButtonDisabled,
                    ]}
                    activeOpacity={0.85}
                    disabled={sectionIndex === 0}
                    onPress={() => goToSection(sectionIndex - 1)}
                    {...({ onClick: () => goToSection(sectionIndex - 1) } as any)}
                  >
                    <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sectionNavButton,
                      sectionIndex === sections.length - 1 && styles.sectionNavButtonDisabled,
                    ]}
                    activeOpacity={0.85}
                    disabled={sectionIndex === sections.length - 1}
                    onPress={() => goToSection(sectionIndex + 1)}
                    {...({ onClick: () => goToSection(sectionIndex + 1) } as any)}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              )}
              <View style={styles.bookIconBadge}>
                <Image
                  source={require("../../../assets/bookIcon.png")}
                  style={styles.bookIconImage}
                />
              </View>
            </View>
          </View>

          {isSectionDropdownOpen && activeSectionIndex === sectionIndex && (
            <View style={styles.sectionDropdownPanel}>
              <Text style={styles.sectionDropdownTitle}>Sections</Text>
              <View style={styles.sectionDropdownListWrap}>
              <Animated.ScrollView
                style={styles.sectionDropdownList}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onLayout={(event) => {
                  const viewportHeight = event.nativeEvent.layout.height;
                  setDropdownScrollMetrics((metrics) => ({
                    ...metrics,
                    viewportHeight,
                  }));
                }}
                onContentSizeChange={(_, height) => {
                  setDropdownScrollMetrics((metrics) => ({
                    ...metrics,
                    contentHeight: height,
                  }));
                }}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: dropdownScrollY } } }],
                  { useNativeDriver: false }
                )}
              >
                {sectionPickerItems.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.sectionDropdownItem,
                      item.sectionIndex === activeSectionIndex && styles.sectionDropdownItemActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => scrollToSection(item.sectionIndex)}
                    {...({ onClick: () => scrollToSection(item.sectionIndex) } as any)}
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
              </Animated.ScrollView>

              {showDropdownScrollCue && (
                <View
                  style={[
                    styles.sectionDropdownScrollTrack,
                    { height: dropdownScrollMetrics.viewportHeight },
                  ]}
                  pointerEvents="none"
                >
                  <Animated.View
                    style={[
                      styles.sectionDropdownScrollThumb,
                      {
                        height: dropdownThumbHeight,
                        transform: [{ translateY: dropdownThumbTranslateY }],
                      },
                    ]}
                  />
                </View>
              )}
              </View>
            </View>
          )}
        </View>

        {/* Scrollable Levels with scroll tracking */}
        <Animated.ScrollView
          ref={(ref) => {
            verticalScrollRefs.current[section.id] = ref as React.ComponentRef<typeof ScrollView> | null;
          }}
          style={[
            styles.sectionScrollView,
            webScrollHeight
              ? {
                  height: webScrollHeight,
                  flexGrow: 0,
                  flexShrink: 0,
                  // `flex: 1` sets flex-basis 0%, which would win over height.
                  flexBasis: 'auto',
                }
              : null,
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            {
              useNativeDriver: true,
              listener: (event: any) => {
                verticalScrollYRefs.current[section.id] =
                  event.nativeEvent.contentOffset.y;
              },
            }
          )}
          scrollEventThrottle={16}
          {...getWebVerticalDragProps(section.id)}
        >
          <View style={styles.levelsContainer}>
            {getTopFirstLevelRenderItems(section.levels)
              .map(({ node, pathIndex, isLast }) => {
                return renderLevelNode(
                  node,
                  pathIndex,
                  isLast,
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
            {startupError ? 'You’re signed in. We couldn’t load your lessons. ' + startupError : 'You’re signed in. We couldn’t load your lessons.'}
          </Text>
          <Text style={{ textAlign: 'center', marginBottom: 12 }}>Support code: {getSupportCode()} · lessons</Text>
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
              void fetchLearningPath(true).catch(() => {});
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
      <FlatList
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        onLayout={(event) => {
          setPagerHeight(Math.round(event.nativeEvent.layout.height));
        }}
        showsHorizontalScrollIndicator={false}
        style={[
          styles.scrollView,
          Platform.OS === 'web'
            ? ({ cursor: isWebPagerMouseDown ? 'grabbing' : 'grab' } as any)
            : null,
        ]}
        data={sections}
        keyExtractor={(section) => section.id}
        renderItem={({ item, index }) => renderSection(item, index)}
        getItemLayout={(_, index) => ({
          length: layoutWidth,
          offset: layoutWidth * index,
          index,
        })}
        initialScrollIndex={activeSectionIndex}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews
        decelerationRate="fast"
        extraData={{
          activeSectionIndex,
          isSectionDropdownOpen,
          dropdownScrollMetrics,
          isWebPagerMouseDown,
        }}
        {...webPagerMouseProps}
        {...(Platform.OS === 'web' ? ({ onWheel: handleWebHorizontalWheel } as any) : {})}
        onScroll={(event) => {
          horizontalScrollXRef.current = event.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            horizontalScrollRef.current?.scrollToIndex({
              index: Math.min(info.index, sections.length - 1),
              animated: false,
            });
          }, 100);
        }}
        onScrollBeginDrag={() => {
          hasUserDraggedSectionsRef.current = true;
        }}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / layoutWidth);
          if (nextIndex >= 0 && nextIndex < sections.length) {
            if (hasUserDraggedSectionsRef.current && nextIndex !== activeSectionIndex && homeSwipeTutorialStage) {
              const nextStage = getNextHomeSwipeTutorialStage(
                homeSwipeTutorialStage,
                activeSectionIndex,
                nextIndex
              );

              if (homeSwipeTutorialStage === 'left' && nextStage === 'right') {
                dispatch(markTutorialActionCompleted('home_swipe_left_performed'));
                setHomeSwipeTutorialStage('right');
                setIsHomeSwipePromptVisible(true);
              } else if (homeSwipeTutorialStage === 'right' && nextStage === 'complete') {
                dispatch(markTutorialActionCompleted('home_swipe_right_performed'));
                dispatch(markHomeTourSeen());
                setIsHomeSwipePromptVisible(false);
                setHomeSwipeTutorialStage(null);
                setCoachStep(0);
              }
            }
            setActiveSectionIndex(nextIndex);
            setIsSectionDropdownOpen(false);
          }
          hasUserDraggedSectionsRef.current = false;
        }}
      />

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
          setIsHomeSwipePromptVisible(false);
          setHomeSwipeTutorialStage(null);
          setCoachStep(0);
        }}
        onComplete={() => {
          if (sections.length <= 1) {
            dispatch(markHomeTourSeen());
            setCoachStep(0);
            return;
          }

          const anchorIndex = getHomeSwipeTutorialAnchorIndex(activeSectionIndex, sections.length);
          if (anchorIndex !== activeSectionIndex) {
            horizontalScrollRef.current?.scrollToIndex({
              index: anchorIndex,
              animated: false,
            });
            setActiveSectionIndex(anchorIndex);
          }

          setHomeSwipeTutorialStage('left');
          setIsHomeSwipePromptVisible(true);
        }}
      /> 

      <CoachMark
        visible={homeSwipeTutorialStage !== null && isHomeSwipePromptVisible}
        steps={[
          homeSwipeTutorialStage === 'right'
            ? {
                icon: 'arrow-back',
                title: 'Now Swipe Right',
                description:
                  'Nice. Swipe right once to return to the previous section. When you do, this prompt will close automatically.',
                mascotMessage: 'Perfect. Swipe back right and you are done.',
                tooltipPosition: 'center' as const,
              }
            : {
                icon: 'arrow-forward',
                title: 'Swipe Left',
                description:
                  'Swipe left once to move to the next section. As soon as you do, the app will prompt you for the return swipe.',
                mascotMessage: 'Give the learning path one real left swipe now.',
                tooltipPosition: 'center' as const,
              },
        ]}
        currentStep={0}
        onNext={() => setIsHomeSwipePromptVisible(false)}
        onSkip={() => {
          dispatch(markHomeTourSeen());
          setIsHomeSwipePromptVisible(false);
          setHomeSwipeTutorialStage(null);
          setCoachStep(0);
        }}
        onComplete={() => setIsHomeSwipePromptVisible(false)}
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
  sectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionNavButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNavButtonDisabled: {
    opacity: 0.35,
  },
  bookIconBadge: {
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
  },
  avatarRight: {
    top: 30,
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
  sectionDropdownListWrap: {
    position: 'relative',
  },
  sectionDropdownScrollTrack: {
    position: 'absolute',
    right: 1,
    top: 0,
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 107, 53, 0.14)',
  },
  sectionDropdownScrollThumb: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B35',
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
