import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { account, databases, ID, Query } from '../lib/appwrite';
import { config } from '../config';
import { School } from '../types';

interface AuthState {
  school: School | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateSchool: (data: Partial<School>) => Promise<void>;
  clearError: () => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  contactPerson: string;
  phoneNumber?: string;
  city?: string;
  state?: string;
  country?: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      school: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          // Delete any existing session first
          try {
            await account.deleteSession('current');
          } catch (e) {
            // No session exists, continue
          }

          // Create session with Appwrite
          await account.createEmailSession(email, password);

          // Get the current user
          const user = await account.get();

          // Fetch school data from database
          const response = await databases.listDocuments(
            config.appwrite.databaseId,
            config.collections.schools,
            [Query.equal('email', email), Query.limit(1)]
          );

          if (response.documents.length === 0) {
            throw new Error('School account not found');
          }

          const school = response.documents[0] as unknown as School;

          set({
            school,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        try {
          set({ isLoading: true, error: null });

          // Delete any existing session first
          try {
            await account.deleteSession('current');
          } catch (e) {
            // No session exists, continue
          }

          // Create Appwrite account
          await account.create(ID.unique(), data.email, data.password, data.name);

          // Create session
          await account.createEmailSession(data.email, data.password);

          // Create school document
          const schoolData = {
            name: data.name,
            email: data.email,
            contactPerson: data.contactPerson,
            totalSeatsEverPurchased: 0,
            phone: data.phoneNumber || '',
            address: data.city || '',
            status: 'active',
            isVerified: false,
          };

          const school = await databases.createDocument(
            config.appwrite.databaseId,
            config.collections.schools,
            ID.unique(),
            schoolData
          );

          set({
            school: school as unknown as School,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await account.deleteSession('current');
        } catch (error) {
          // Session might already be deleted
        } finally {
          set({
            school: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });

          // Check if there's an active session
          const user = await account.get();

          // Fetch school data
          const response = await databases.listDocuments(
            config.appwrite.databaseId,
            config.collections.schools,
            [Query.equal('email', user.email), Query.limit(1)]
          );

          if (response.documents.length === 0) {
            throw new Error('School not found');
          }

          const school = response.documents[0] as unknown as School;

          set({
            school,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            school: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      updateSchool: async (data: Partial<School>) => {
        try {
          const { school } = get();
          if (!school) throw new Error('Not authenticated');

          const updated = await databases.updateDocument(
            config.appwrite.databaseId,
            config.collections.schools,
            school.$id,
            {
              ...data,
              updatedAt: new Date().toISOString(),
            }
          );

          set({ school: updated as unknown as School });
        } catch (error: any) {
          set({ error: error.message || 'Update failed' });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'school-auth',
      partialize: (state) => ({
        school: state.school,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Check auth on rehydration
        state?.checkAuth();
      },
    }
  )
);
