import { applyGamificationEventResult } from '../src/utils/gamificationState';
import { type GamificationState } from '../src/store/slices/gamificationSlice';
import { GamificationResultBundle } from '../src/types/gamification';

const assertEqual = (actual: unknown, expected: unknown, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${String(actual)}`);
  }
};

const initialState: GamificationState = {
  summary: null,
  streak: null,
  nextBadgeProgress: null,
  featureFlags: {},
  badgeCatalogue: [],
  earnedBadgeCount: 0,
  totalBadgeCount: 0,
  activeQuests: [],
  readyChestsCount: 0,
  rewardBalance: 20,
  chests: [],
  lastResultBundle: null,
  pendingCelebrations: [],
  isBootstrapped: true,
  isLoading: false,
  error: null,
};

const bundle: GamificationResultBundle = {
  event_id: 'event-1',
  event_type: 'LESSON_COMPLETED',
  user_id: 'user-1',
  source: 'lesson',
  source_reference: 'level-1',
  processing_status: 'PROCESSED',
  xp_delta: 15,
  streak: null,
  badges: [],
  quests: [
    {
      quest_definition_id: 'quest-1',
      quest_instance_id: 'instance-1',
      quest_code: 'FIRST_LESSON',
      quest_name: 'First Lesson Quest',
      period_key: 'lifetime',
      old_progress: 0,
      new_progress: 1,
      target_value: 1,
      status: 'COMPLETED',
      was_completed_now: true,
      reward: { reward_type: 'XP', amount: 15, metadata: {} },
      attached_badge: null,
      message: null,
    },
  ],
  rewards: [
    {
      reward_ledger_id: 'reward-1',
      reward_type: 'XP',
      amount: 15,
      direction: 'CREDIT',
      source_reference: 'instance-1',
      idempotency_key: 'quest-reward:event-1:instance-1',
      status: 'GRANTED',
      grant_state: 'CREATED',
      created: true,
      already_exists: false,
      message: 'Reward granted.',
    },
  ],
  chests: [
    {
      chest_claim_id: 'claim-1',
      chest_definition_id: 'chest-1',
      chest_code: 'CHEST_SECTION_BUILDER',
      status: 'READY',
      was_claimed_now: false,
      already_claimed: false,
      reward: null,
      reward_payload: { reward_type: 'XP', amount: 25 },
      message: 'Chest is ready to claim.',
    },
  ],
  celebration_order: [],
  primary_celebration: null,
  summary: null,
  errors: [],
  processed_at: '2026-09-02T10:00:00.000Z',
};

const nextState = applyGamificationEventResult(initialState, bundle);

assertEqual(nextState.rewardBalance, 35, 'adds granted quest XP to the visible reward balance');
assertEqual(nextState.readyChestsCount, 1, 'counts newly ready chests from the event result');
assertEqual(nextState.chests.length, 1, 'adds newly ready chests from the event result');
assertEqual(nextState.chests[0].is_claimable, true, 'marks newly ready chest as claimable');
