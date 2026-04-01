import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  isAuthenticated: boolean;
  cnpj: string;
  password: string;
  pin: string;
  pinUnlocked: boolean;
  companyName: string;
  dbLoaded: boolean;

  login: (cnpj: string, password: string) => Promise<boolean>;
  logout: () => void;
  unlockPin: (pin: string) => boolean;
  lockPin: () => void;

  recoverPasswordWithPin: (pin: string) => string | null;
  recoverPinWithCredentials: (cnpj: string, password: string) => string | null;

  changePassword: (currentPassword: string, newPassword: string) => boolean;
  changePin: (currentPin: string, newPin: string) => boolean;

  setCompanyName: (name: string) => void;
  setCnpj: (cnpj: string) => void;

  loadFromDb: () => Promise<void>;
}

async function saveToDb(key: string, value: string) {
  try {
    await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
  } catch (_) { /* silent */ }
}

function parseDbValue(raw: unknown): string {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
    } catch (_) { /* not JSON, use as-is */ }
    return raw;
  }
  return String(raw);
}

async function fetchCredentialsFromDb(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['auth_password', 'auth_pin', 'auth_cnpj', 'company_name']);
    if (data) {
      data.forEach(r => { map[r.key] = parseDbValue(r.value); });
    }
  } catch (_) { /* silent */ }
  return map;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      cnpj: '',
      password: '',
      pin: '',
      pinUnlocked: false,
      companyName: '',
      dbLoaded: false,

      loadFromDb: async () => {
        const map = await fetchCredentialsFromDb();
        set({
          password: map.auth_password || '',
          pin: map.auth_pin || '',
          cnpj: map.auth_cnpj || '',
          companyName: map.company_name || '',
          dbLoaded: true,
        });
      },

      login: async (cnpj, password) => {
        // Always fetch fresh credentials from DB before validating
        const map = await fetchCredentialsFromDb();
        const dbCnpj = map.auth_cnpj || '';
        const dbPassword = map.auth_password || '';

        const cleanInput = cnpj.replace(/\D/g, '');
        const cleanStored = dbCnpj.replace(/\D/g, '');

        if (cleanInput === cleanStored && password === dbPassword) {
          set({
            isAuthenticated: true,
            password: dbPassword,
            pin: map.auth_pin || '',
            cnpj: dbCnpj,
            companyName: map.company_name || '',
            dbLoaded: true,
          });
          return true;
        }
        return false;
      },

      logout: () => set({ isAuthenticated: false, pinUnlocked: false }),

      unlockPin: (pin) => {
        if (pin === get().pin) {
          set({ pinUnlocked: true });
          return true;
        }
        return false;
      },

      lockPin: () => set({ pinUnlocked: false }),

      recoverPasswordWithPin: (pin) => {
        if (pin === get().pin) return get().password;
        return null;
      },

      recoverPinWithCredentials: (cnpj, password) => {
        const state = get();
        const cleanInput = cnpj.replace(/\D/g, '');
        const cleanStored = state.cnpj.replace(/\D/g, '');
        if (cleanInput === cleanStored && password === state.password) return state.pin;
        return null;
      },

      changePassword: (currentPassword, newPassword) => {
        if (currentPassword === get().password) {
          set({ password: newPassword });
          saveToDb('auth_password', newPassword);
          return true;
        }
        return false;
      },

      changePin: (currentPin, newPin) => {
        if (currentPin === get().pin) {
          set({ pin: newPin });
          saveToDb('auth_pin', newPin);
          return true;
        }
        return false;
      },

      setCompanyName: (name) => {
        set({ companyName: name });
        saveToDb('company_name', name);
      },

      setCnpj: (cnpj) => {
        set({ cnpj });
        saveToDb('auth_cnpj', cnpj);
      },
    }),
    {
      name: 'bella-pizza-auth',
      partialize: (state) => ({
        // Only persist session state, NEVER credentials
        isAuthenticated: state.isAuthenticated,
        pinUnlocked: state.pinUnlocked,
      }),
    }
  )
);
