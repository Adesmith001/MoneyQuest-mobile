import type {
  ChestStateItem,
  GamificationResultBundle,
  QuestProgressResult,
  RewardResult,
} from '../types/gamification';
import type { GamificationState } from '../store/slices/gamificationSlice';
import { buildCelebrationsFromBundle } from './gamificationPresentation';

const grantedXp = (rewards: RewardResult[]): number =>
  rewards
    .filter(
      (reward) =>
        reward.created &&
        reward.reward_type === 'XP' &&
        reward.direction === 'CREDIT' &&
        reward.status === 'GRANTED',
    )
    .reduce((total, reward) => total + reward.amount, 0);

const toChestState = (bundle: GamificationResultBundle): ChestStateItem[] =>
  bundle.chests
    .filter((chest) => chest.chest_claim_id)
    .map((chest) => ({
      chest_claim_id: chest.chest_claim_id,
      chest_definition_id: chest.chest_definition_id,
      chest_code: chest.chest_code || 'CHEST',
      chest_name: chest.chest_code || 'Reward Chest',
      status: chest.status,
      is_claimable: chest.status === 'READY',
      reward:
        chest.reward && chest.reward.reward_type === 'XP'
          ? {
              reward_type: 'XP',
              amount: chest.reward.amount,
              metadata: {},
            }
          : null,
      reward_payload: chest.reward_payload,
    }));

const mergeQuestProgress = (
  quests: GamificationState['activeQuests'],
  results: QuestProgressResult[],
): GamificationState['activeQuests'] =>
  quests.map((quest) => {
    const result = results.find(
      (item) => item.quest_definition_id === quest.quest_definition_id,
    );
    if (!result) return quest;
    return {
      ...quest,
      current_value: result.new_progress,
      target_value: result.target_value,
      status: result.status,
      reward: result.reward ?? quest.reward,
    };
  });

export function applyGamificationEventResult<T extends GamificationState>(
  state: T,
  bundle: GamificationResultBundle,
): T {
  const nextState = {
    ...state,
    lastResultBundle: bundle,
    activeQuests: mergeQuestProgress(state.activeQuests, bundle.quests),
    pendingCelebrations: buildCelebrationsFromBundle(bundle),
  };

  if (bundle.summary) {
    nextState.summary = bundle.summary;
    nextState.rewardBalance = bundle.summary.total_xp;
    nextState.readyChestsCount = bundle.summary.ready_chests_count;
  } else {
    nextState.rewardBalance += grantedXp(bundle.rewards) || bundle.xp_delta;
  }

  if (bundle.streak) {
    nextState.streak = {
      user_id: bundle.user_id,
      current_streak: bundle.streak.current_streak,
      longest_streak: bundle.streak.longest_streak,
      last_qualified_date: bundle.streak.business_date,
      last_source_event_id: bundle.streak.source_event_id,
      timezone: 'Africa/Lagos',
      total_qualified_days: 0,
      created_at: null,
      updated_at: null,
    };
  }

  for (const chest of toChestState(bundle)) {
    const existingIndex = nextState.chests.findIndex(
      (item) => item.chest_claim_id === chest.chest_claim_id,
    );
    if (existingIndex >= 0) {
      nextState.chests[existingIndex] = {
        ...nextState.chests[existingIndex],
        ...chest,
      };
    } else {
      nextState.chests = [chest, ...nextState.chests];
    }
  }

  if (!bundle.summary && bundle.chests.some((chest) => chest.status === 'READY')) {
    nextState.readyChestsCount = nextState.chests.filter(
      (chest) => chest.status === 'READY',
    ).length;
  }

  return nextState;
}
