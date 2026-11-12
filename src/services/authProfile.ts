type AccountProfileInfo = {
  $id: string;
  email: string;
  name: string;
};

type ProfileSeed = {
  username?: string;
  schoolName?: string;
  phoneNumber?: string;
  profilePicture?: string;
  profilePictureId?: string;
  age?: number;
  learningLimit?: string;
  mainGoal?: string;
  referralSource?: string;
  avatar?: string;
  xp?: number;
  level?: number;
  currentSection?: number;
  streak?: number;
  totalQuestionsAnswered?: number;
  correctAnswers?: number;
  monthlyXP?: number;
  totalXP?: number;
  lives?: number;
  lastLifeRegenTime?: string;
  currentLevelId?: string | null;
  currentSectionId?: string | null;
  accountStatus?: string;
  lastMonthlyReset?: string;
};

type AppwriteDatabasesLike = {
  getDocument: (dbId: string, collectionId: string, documentId: string) => Promise<any>;
  createDocument: (
    dbId: string,
    collectionId: string,
    documentId: string,
    data: Record<string, unknown>
  ) => Promise<any>;
};

const normalizeOptionalString = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const buildUserDocumentData = (
  accountInfo: AccountProfileInfo,
  profileSeed: ProfileSeed = {}
): Record<string, unknown> => {
  const currentDate = new Date().toISOString();
  const username = normalizeOptionalString(profileSeed.username);
  const schoolName = normalizeOptionalString(profileSeed.schoolName);
  const phoneNumber = normalizeOptionalString(profileSeed.phoneNumber);

  return {
    email: accountInfo.email,
    name: accountInfo.name,
    xp: profileSeed.xp ?? 0,
    level: profileSeed.level ?? 1,
    currentSection: profileSeed.currentSection ?? 1,
    streak: profileSeed.streak ?? 0,
    lastLoginDate: currentDate,
    totalQuestionsAnswered: profileSeed.totalQuestionsAnswered ?? 0,
    correctAnswers: profileSeed.correctAnswers ?? 0,
    monthlyXP: profileSeed.monthlyXP ?? 0,
    totalXP: profileSeed.totalXP ?? 0,
    lives: profileSeed.lives ?? 5,
    lastLifeRegenTime: profileSeed.lastLifeRegenTime ?? currentDate,
    currentLevelId: profileSeed.currentLevelId ?? null,
    currentSectionId: profileSeed.currentSectionId ?? null,
    profilePicture: profileSeed.profilePicture ?? '',
    profilePictureId: profileSeed.profilePictureId ?? '',
    ...(username ? { username: username.toLowerCase() } : {}),
    ...(schoolName ? { schoolName } : {}),
    ...(phoneNumber ? { phoneNumber } : {}),
    ...(profileSeed.age !== undefined ? { age: profileSeed.age } : {}),
    ...(profileSeed.learningLimit !== undefined ? { learningLimit: profileSeed.learningLimit } : {}),
    ...(profileSeed.mainGoal !== undefined ? { mainGoal: profileSeed.mainGoal } : {}),
    ...(profileSeed.referralSource !== undefined ? { referralSource: profileSeed.referralSource } : {}),
    ...(profileSeed.avatar !== undefined ? { avatar: profileSeed.avatar } : {}),
    ...(profileSeed.accountStatus !== undefined ? { accountStatus: profileSeed.accountStatus } : {}),
    ...(profileSeed.lastMonthlyReset !== undefined ? { lastMonthlyReset: profileSeed.lastMonthlyReset } : {}),
  };
};

export async function findOrCreateUserDocument({
  databases,
  dbId,
  usersCollectionId,
  accountInfo,
  profileSeed = {},
}: {
  databases: AppwriteDatabasesLike;
  dbId: string;
  usersCollectionId: string;
  accountInfo: AccountProfileInfo;
  profileSeed?: ProfileSeed;
}): Promise<any> {
  // A guest Appwrite session has no student identity. Never create a profile
  // for it, even when the collection permits client-side document creation.
  if (!accountInfo.email?.trim()) {
    throw Object.assign(new Error('Anonymous account cannot have a profile'), {
      type: 'profile_missing_identity',
    });
  }

  try {
    return await databases.getDocument(dbId, usersCollectionId, accountInfo.$id);
  } catch (error: any) {
    if (error?.code !== 404) {
      throw error;
    }
  }

  const payload = buildUserDocumentData(accountInfo, profileSeed);

  try {
    return await databases.createDocument(
      dbId,
      usersCollectionId,
      accountInfo.$id,
      payload
    );
  } catch (error: any) {
    if (error?.code === 409) {
      return databases.getDocument(dbId, usersCollectionId, accountInfo.$id);
    }

    // Keep signup compatible with environments that have not received the
    // optional schoolName attribute yet.
    if (
      payload.schoolName &&
      (error?.type === 'document_invalid_structure' || /schoolName|unknown attribute/i.test(error?.message || ''))
    ) {
      const { schoolName: _schoolName, ...legacyPayload } = payload;
      return databases.createDocument(
        dbId,
        usersCollectionId,
        accountInfo.$id,
        legacyPayload
      );
    }

    throw error;
  }
}
