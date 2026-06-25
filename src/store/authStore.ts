import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  isAuthenticated: boolean;
  initialized: boolean;
  pinUnlocked: boolean;
  cnpj: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;

  initAuth: () => Promise<void>;
  login: (cnpj: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  unlockPin: (pin: string) => Promise<boolean>;
  lockPin: () => void;

  recoverPasswordWithPin: (pin: string) => Promise<string | null>;
  recoverPinWithCredentials: (cnpj: string, password: string) => Promise<string | null>;

  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;

  setCnpj: (cnpj: string) => Promise<void>;
  setCompanyName: (name: string) => Promise<void>;
  setCompanyAddress: (address: string) => Promise<void>;
  setCompanyPhone: (phone: string) => Promise<void>;
}

// All credential handling now happens server-side in the `app-auth` edge
// function. The browser never reads or stores the password/PIN/CNPJ in plain
// text, and the Data API requires a real authenticated session.
async function callAuth<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T | null> {
  try {
    const { data, error } = await supabase.functions.invoke('app-auth', {
      body: { action, ...payload },
    });
    if (error) return null;
    return data as T;
  } catch (_) {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      initialized: false,
      pinUnlocked: false,
      cnpj: '',
      companyName: '',
      companyAddress: '',
      companyPhone: '',

      initAuth: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const info = await callAuth('get_company');
          set({
            isAuthenticated: true,
            initialized: true,
            companyName: info?.companyName ?? get().companyName,
            companyAddress: info?.companyAddress ?? get().companyAddress,
            companyPhone: info?.companyPhone ?? get().companyPhone,
            cnpj: info?.cnpj ?? get().cnpj,
          });
        } else {
          set({ isAuthenticated: false, pinUnlocked: false, initialized: true });
        }
      },

      login: async (cnpj, password) => {
        const res = await callAuth('login', { cnpj, password });
        if (res?.success && res.session) {
          await supabase.auth.setSession({
            access_token: res.session.access_token,
            refresh_token: res.session.refresh_token,
          });
          set({
            isAuthenticated: true,
            initialized: true,
            companyName: res.companyName || '',
            companyAddress: res.companyAddress || '',
            companyPhone: res.companyPhone || '',
            cnpj: res.cnpj || '',
          });
          return true;
        }
        return false;
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ isAuthenticated: false, pinUnlocked: false });
      },

      unlockPin: async (pin) => {
        const res = await callAuth('unlock_pin', { pin });
        if (res?.success) {
          set({ pinUnlocked: true });
          return true;
        }
        return false;
      },

      lockPin: () => set({ pinUnlocked: false }),

      recoverPasswordWithPin: async (pin) => {
        const res = await callAuth('recover_password', { pin });
        return res?.success ? (res.password ?? null) : null;
      },

      recoverPinWithCredentials: async (cnpj, password) => {
        const res = await callAuth('recover_pin', { cnpj, password });
        return res?.success ? (res.pin ?? null) : null;
      },

      changePassword: async (currentPassword, newPassword) => {
        const res = await callAuth('change_password', { currentPassword, newPassword });
        return !!res?.success;
      },

      changePin: async (currentPin, newPin) => {
        const res = await callAuth('change_pin', { currentPin, newPin });
        return !!res?.success;
      },

      setCnpj: async (cnpj) => {
        const res = await callAuth('set_cnpj', { cnpj });
        if (res?.success) set({ cnpj });
      },

      setCompanyName: async (name) => {
        const res = await callAuth('set_company', { companyName: name });
        if (res?.success) set({ companyName: name });
      },

      setCompanyAddress: async (address) => {
        const res = await callAuth('set_company', { companyAddress: address });
        if (res?.success) set({ companyAddress: address });
      },

      setCompanyPhone: async (phone) => {
        const res = await callAuth('set_company', { companyPhone: phone });
        if (res?.success) set({ companyPhone: phone });
      },
    }),
    {
      name: 'bella-pizza-auth',
      partialize: (state) => ({
        // Display-only company info; the real session lives in Supabase storage.
        companyName: state.companyName,
        companyAddress: state.companyAddress,
        companyPhone: state.companyPhone,
        cnpj: state.cnpj,
      }),
    }
  )
);
