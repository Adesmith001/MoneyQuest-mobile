// =============================================
// Gamification Types — mirrors backend Pydantic schemas
// =============================================

// ── Enums ──────────────────────────────────────

export type EventType = 'LESSON_COMPLETED' | 'QUEST_COMPLETED' | 'BADGE_AWARDED' | 'STREAK_UPDATED' | 'CHEST_READY' | 'CHEST_CLAIMED';

export type EventProcessingStatus = 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

export type BadgeCategory = 'JOURNEY' | 'SECTION' | 'CONSISTENCY' | 'ACHIEVEMENT' | 'QUEST';

export type BadgeEvaluationType = 'COUNT_BASED' | 'THRESHOLD_BASED' | 'FIRST_OCCURRENCE' | 'METADATA_CONDITION' | 'STREAK_BASED' | 'STREAK_RESET_BASED';

export type RepeatPeriod = 'LIFETIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type QuestType = 'DAILY' | 'WEEKLY' | 'SECTION' | 'ACHIEVEMENT' | 'GENERIC';

export type QuestPeriod = 'DAILY' | 'WEEKLY' | 'SECTION' | 'LIFETIME';

export type QuestProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLAIMED' | 'EXPIRED';

export type RewardType = 'XP' | 'BADGE' | 'QUEST' | 'CHEST' | 'LIFE' | 'OTHER';

export type RewardDirection = 'CREDIT' | 'DEBIT';

export type RewardStatus = 'PENDING' | 'GRANTED' | 'FAILED' | 'REVERSED';

export type RewardGrantState = 'CREATED' | 'ALREADY_EXISTS' | 'REJECTED' | 'REVERSED';

export type StreakStatus = 'STARTED' | 'CONTINUED' | 'ALREADY_COUNTED_TODAY' | 'RESET' | 'OUT_OF_ORDER' | 'UNCHANGED';

export type ChestStatus = 'LOCKED' | 'IN_PROGRESS' | 'READY' | 'CLAIMING' | 'CLAIMED' | 'EXPIRED' | 'ERROR';

export type ChestTriggerType = 'QUEST_COUNT' | 'QUEST_SET' | 'PROGRESS_POINTS';

export type EntitlementStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'REVOKED';

// ── Pagination ─────────────────────────────────

export interface PaginationMeta {
  limit: number;
  offset: number;
  count: number;
}

// ── Summary / Profile ──────────────────────────

export interface NextBadgeProgress {
  badge_definition_id: string | null;
  badge_code: string | null;
  badge_name: string | null;
  progress_value: number;
  target_value: number;
  remaining_value: number;
}

export interface GamificationSummary {
  user_id: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  next_badge_progress: NextBadgeProgress | null;
  active_quests_count: number;
  completed_quests_count: number;
  ready_chests_count: number;
  feature_flags: Record<string, boolean>;
  current_level_id: string | null;
  current_section_id: string | null;
  updated_at: string | null;
}

export interface StreakState {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_qualified_date: string | null;
  last_source_event_id: string | null;
  timezone: string;
  total_qualified_days: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface GamificationProfileResponse {
  summary: GamificationSummary;
  streak: StreakState | null;
  next_badge_progress: NextBadgeProgress | null;
  feature_flags: Record<string, boolean>;
}

// ── Badges ─────────────────────────────────────

export interface BadgeDefinition {
  badge_definition_id: string;
  code: string;
  name: string;
  description: string;
  category: BadgeCategory;
  trigger_event: EventType;
  evaluation_type: BadgeEvaluationType;
  evaluation_config: Record<string, any>;
  reward_config: Record<string, any>;
  asset_reference: string | null;
  is_repeatable: boolean;
  repeat_period: RepeatPeriod;
  max_awards_per_user: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserBadge {
  user_badge_id: string;
  user_id: string;
  badge_definition_id: string;
  badge_code: string;
  award_cycle: string;
  source_event_id: string;
  awarded_at: string;
  metadata: Record<string, any>;
  created_at: string | null;
}

export interface BadgeAwardResult {
  badge_definition_id: string;
  badge_code: string;
  badge_name: string;
  asset_reference?: string | null;
  was_awarded: boolean;
  already_owned: boolean;
  award_cycle: string;
  user_badge_id: string | null;
  progress_value: number | null;
  target_value: number | null;
  reward_config: Record<string, any>;
  message: string | null;
}

export interface BadgeCatalogueEntry {
  badge_definition_id: string;
  code: string;
  name: string;
  description: string;
  category: BadgeCategory;
  asset_reference: string | null;
  is_earned: boolean;
  progress_value: number;
  target_value: number;
  awarded_at: string | null;
}

export interface BadgeCatalogueResponse {
  user_id: string;
  badges: BadgeCatalogueEntry[];
  total_count: number;
  earned_count: number;
  next_badge: NextBadgeProgress | null;
}

export interface BadgeListResponse {
  user_id: string;
  badges: UserBadge[];
  catalog: BadgeCatalogueEntry[];
  category_counts?: Array<{
    category: BadgeCategory;
    earned: number;
    total: number;
  }>;
  earned_count: number;
  total_count: number;
  next_badge_progress: NextBadgeProgress | null;
  pagination: PaginationMeta;
}

// ── Quests ─────────────────────────────────────

export interface QuestDefinition {
  quest_definition_id: string;
  code: string;
  name: string;
  description: string;
  quest_type: QuestType;
  quest_period: QuestPeriod;
  event_type: EventType;
  target_value: number;
  evaluation_config: Record<string, any>;
  reward_config: Record<string, any>;
  entitlement_key: string | null;
  badge_definition_id: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuestReward {
  reward_type: RewardType;
  amount: number;
  metadata: Record<string, any>;
}

export interface QuestTabEntry {
  quest_definition_id: string;
  code: string;
  name: string;
  description: string;
  quest_type: QuestType;
  current_value: number;
  target_value: number;
  status: QuestProgressStatus;
  reward: QuestReward | null;
  reset_at: string | null;
}

export interface QuestTabResponse {
  user_id: string;
  quests: QuestTabEntry[];
  ready_chests_count: number;
}

export interface UserQuestProgress {
  quest_definition_id: any;
  progress_id: string;
  user_id: string;
  quest_instance_id: string;
  current_value: number;
  target_value: number;
  status: QuestProgressStatus;
  completed_at: string | null;
  claimed_at: string | null;
  last_event_id: string | null;
  metadata: Record<string, any>;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuestProgressResult {
  quest_definition_id: string;
  quest_instance_id: string;
  quest_code: string;
  quest_name: string;
  period_key: string;
  old_progress: number;
  new_progress: number;
  target_value: number;
  status: QuestProgressStatus;
  was_completed_now: boolean;
  reward: QuestReward | null;
  attached_badge: BadgeAwardResult | null;
  message: string | null;
}

export interface QuestHistoryEntry {
  quest_definition_id: string;
  code: string;
  name: string;
  quest_type: QuestType;
  period_key: string;
  current_value: number;
  target_value: number;
  status: QuestProgressStatus;
  reward: QuestReward | null;
  completed_at: string | null;
  claimed_at: string | null;
}

export interface QuestHistoryResponse {
  user_id: string;
  quests: QuestHistoryEntry[];
  pagination: PaginationMeta;
}

export interface QuestListResponse {
  user_id: string;
  quests: UserQuestProgress[];
  quest_feed?: Array<{
    quest_definition_id: string;
    quest_instance_id: string;
    quest_code: string;
    quest_name: string;
    description: string;
    quest_type: QuestType;
    quest_period: QuestPeriod;
    period_key: string;
    status: QuestProgressStatus;
    current_value: number;
    target_value: number;
    progress_percent: number;
    starts_at?: string | null;
    ends_at?: string | null;
    reset_at?: string | null;
    completed_at?: string | null;
    claimed_at?: string | null;
    reward?: QuestReward | null;
    display_order: number;
  }>;
  quest_groups?: Array<{
    quest_period: QuestPeriod;
    label: string;
    reset_at?: string | null;
    total_count: number;
    completed_count: number;
    quests: QuestTabEntry[];
  }>;
  chests?: Array<{
    chest_claim_id: string;
    chest_definition_id: string;
    chest_code: string;
    chest_name: string;
    description?: string | null;
    status: ChestStatus;
    is_claimable: boolean;
    ready_at?: string | null;
    claimed_at?: string | null;
    reward?: QuestReward | null;
    reward_payload: Record<string, any>;
  }>;
  summary?: {
    total_count: number;
    active_count: number;
    completed_count: number;
    ready_chests_count: number;
    next_reset_at?: string | null;
  };
  pagination: PaginationMeta;
}

// ── Chests ─────────────────────────────────────

export interface ChestDefinition {
  chest_definition_id: string;
  code: string;
  name: string;
  description: string | null;
  asset_reference: string | null;
  trigger_type: ChestTriggerType;
  trigger_config: Record<string, any>;
  reward_config: Record<string, any>;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChestClaim {
  chest_claim_id: string;
  user_id: string;
  chest_definition_id: string;
  source_event_id: string;
  status: ChestStatus;
  ready_at: string | null;
  claimed_at: string | null;
  reward_payload: Record<string, any>;
  idempotency_key: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChestClaimRequest {
  user_id: string;
  claim_request_id: string;
}

export interface ChestClaimResult {
  chest_claim_id: string;
  chest_definition_id: string;
  chest_code: string | null;
  status: ChestStatus;
  was_claimed_now: boolean;
  already_claimed: boolean;
  reward: RewardResult | null;
  reward_payload: Record<string, any>;
  summary?: GamificationSummary | null;
  message: string | null;
}

export interface ChestStateItem {
  chest_claim_id: string;
  chest_definition_id: string;
  chest_code: string;
  chest_name: string;
  description?: string | null;
  status: ChestStatus;
  is_claimable: boolean;
  ready_at?: string | null;
  claimed_at?: string | null;
  reward?: QuestReward | null;
  reward_payload: Record<string, any>;
}

export interface ChestListResponse {
  user_id: string;
  chests: ChestClaim[];
  states?: ChestStateItem[];
  pagination: PaginationMeta;
}

// ── Rewards ────────────────────────────────────

export interface RewardLedgerEntry {
  reward_ledger_id: string;
  user_id: string;
  reward_type: RewardType;
  amount: number;
  direction: RewardDirection;
  source_type: string;
  source_reference: string;
  source_event_id: string;
  idempotency_key: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string | null;
}

export interface RewardResult {
  reward_ledger_id: string | null;
  reward_type: RewardType;
  amount: number;
  direction: RewardDirection;
  source_reference: string | null;
  idempotency_key: string | null;
  status: RewardStatus;
  grant_state: RewardGrantState;
  created: boolean;
  already_exists: boolean;
  message: string | null;
}

export interface RewardListResponse {
  user_id: string;
  rewards: RewardLedgerEntry[];
  balance: number;
  pagination: PaginationMeta;
}

// ── Streak ─────────────────────────────────────

export interface StreakUpdateResult {
  user_id: string;
  previous_streak: number;
  current_streak: number;
  longest_streak: number;
  business_date: string;
  status: StreakStatus;
  incremented: boolean;
  reset: boolean;
  increased_today: boolean;
  already_counted_today: boolean;
  out_of_order: boolean;
  source_event_id: string | null;
  policy_applied: string | null;
  milestone_candidates: number[];
  message: string | null;
}

// ── Feature Flags ──────────────────────────────

export interface FeatureFlag {
  feature_flag_id: string;
  key: string;
  description: string | null;
  is_enabled: boolean;
  config: Record<string, any>;
  created_at: string | null;
  updated_at: string | null;
}

// ── Entitlements ───────────────────────────────

export interface Entitlement {
  entitlement_id: string;
  user_id: string;
  entitlement_key: string;
  status: EntitlementStatus;
  starts_at: string | null;
  ends_at: string | null;
  metadata: Record<string, any>;
  created_at: string | null;
  updated_at: string | null;
}

// ── Celebration ────────────────────────────────

export interface CelebrationPayload {
  celebration_type: string;
  hero_element: string;
  xp_earned: number;
  streak_status: StreakStatus | null;
  next_badge_progress: NextBadgeProgress | null;
  unlocked_badges: string[];
  completed_quests: string[];
  section_completion: { section_id: string } | null;
}

// ── Result Bundle (full gamification response) ─

export interface GamificationResultBundle {
  event_id: string | null;
  event_type: EventType | null;
  user_id: string;
  source: string;
  source_reference: string;
  processing_status: EventProcessingStatus;
  xp_delta: number;
  streak: StreakUpdateResult | null;
  badges: BadgeAwardResult[];
  quests: QuestProgressResult[];
  rewards: RewardResult[];
  chests: ChestClaimResult[];
  celebration_order: string[];
  primary_celebration: CelebrationPayload | null;
  summary: GamificationSummary | null;
  errors: GamificationErrorDetail[];
  processed_at: string;
}

export interface GamificationErrorDetail {
  code: string;
  message: string;
  context: Record<string, any>;
}

// ── Bootstrap (app launch bundle) ──────────────

export interface GamificationBootstrapResponse {
  profile: GamificationProfileResponse;
  badges: BadgeListResponse;
  quests: QuestListResponse;
  rewards: RewardListResponse;
  chests: ChestListResponse;
}

// ── Readiness ──────────────────────────────────

export interface GamificationReadinessResponse {
  ready: boolean;
  gamification_enabled: boolean;
  schema_ready: boolean;
  missing_tables: string[];
  feature_flags: Record<string, boolean>;
  appwrite?: {
    enabled: boolean;
    configured: boolean;
    connected: boolean;
    endpoint?: string | null;
    project_id_configured: boolean;
    api_key_configured: boolean;
    api_path: string;
    health_path: string;
    base_url?: string | null;
    status_code?: number | null;
    message: string;
    checked_at: string;
  };
  checks: Record<string, boolean>;
}

// ── Event Request ──────────────────────────────

export interface GamificationEventRequest {
  user_id: string;
  event_type: EventType;
  source: string;
  source_reference: string;
  idempotency_key?: string;
  event_payload?: Record<string, any>;
  occurred_at?: string;
}

// ── Derived UI helpers ─────────────────────────

/** Badge category display config */
export const BADGE_CATEGORY_CONFIG: Record<BadgeCategory, { label: string; color: string; icon: string }> = {
  JOURNEY: { label: 'Journey', color: '#4CAF50', icon: '🌎' },
  SECTION: { label: 'Section', color: '#2196F3', icon: '📚' },
  CONSISTENCY: { label: 'Consistency', color: '#FF9800', icon: '🔥' },
  ACHIEVEMENT: { label: 'Achievement', color: '#9C27B0', icon: '🏆' },
  QUEST: { label: 'Quest', color: '#FF5722', icon: '⚔️' },
};

/** Quest type display config */
export const QUEST_TYPE_CONFIG: Record<QuestType, { label: string; color: string; icon: string }> = {
  DAILY: { label: 'Daily', color: '#FF5722', icon: '📅' },
  WEEKLY: { label: 'Weekly', color: '#FF9800', icon: '📆' },
  SECTION: { label: 'Section', color: '#2196F3', icon: '📚' },
  ACHIEVEMENT: { label: 'Achievement', color: '#9C27B0', icon: '🏆' },
  GENERIC: { label: 'Challenge', color: '#607D8B', icon: '⭐' },
};

/** Get a human-readable label for quest progress status */
export function getQuestStatusLabel(status: QuestProgressStatus): string {
  switch (status) {
    case 'NOT_STARTED': return 'Not Started';
    case 'IN_PROGRESS': return 'In Progress';
    case 'COMPLETED': return 'Completed';
    case 'CLAIMED': return 'Claimed';
    case 'EXPIRED': return 'Expired';
    default: return status;
  }
}
