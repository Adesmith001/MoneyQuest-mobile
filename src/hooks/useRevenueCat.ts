import { useState, useEffect, useCallback, useRef } from 'react';
import { CustomerInfo } from 'react-native-purchases';
import revenueCatService from '../services/revenueCatService';

interface RevenueCatState {
  isPremium: boolean;
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
}

export interface UseRevenueCatReturn extends RevenueCatState {
  /** Present the full RevenueCat paywall (always shown). Returns true on purchase/restore. */
  presentPaywall: () => Promise<boolean>;
  /** Present the paywall only if the user lacks the premium entitlement. Returns true if they now have access. */
  presentPaywallIfNeeded: () => Promise<boolean>;
  /** Open the RevenueCat Customer Center so users can manage their subscription. */
  presentCustomerCenter: () => Promise<void>;
  /** Manually refresh CustomerInfo from RevenueCat. */
  refreshCustomerInfo: () => Promise<void>;
}

/**
 * Hook that tracks the RevenueCat subscription state and exposes helpers for
 * presenting the paywall and Customer Center.
 *
 * Usage:
 *   const { isPremium, presentPaywall, presentCustomerCenter } = useRevenueCat();
 */
export function useRevenueCat(): UseRevenueCatReturn {
  const [state, setState] = useState<RevenueCatState>({
    isPremium: false,
    customerInfo: null,
    isLoading: true,
  });

  // Keep a stable ref to avoid stale closures in the listener
  const syncRef = useRef<(info: CustomerInfo) => void | undefined>(undefined);

  const syncCustomerInfo = useCallback((info: CustomerInfo) => {
    setState({
      isPremium: revenueCatService.hasActiveEntitlement(info),
      customerInfo: info,
      isLoading: false,
    });
  }, []);

  // Keep ref up to date
  syncRef.current = syncCustomerInfo;

  const refreshCustomerInfo = useCallback(async () => {
    if (!revenueCatService.isConfigured()) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }
    try {
      const info = await revenueCatService.getCustomerInfo();
      syncRef.current?.(info);
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    // Fetch current state immediately
    refreshCustomerInfo();

    // The stable listener wrapper ensures removeCustomerInfoListener gets the
    // exact same function reference that was passed to addCustomerInfoListener.
    const listener = (info: CustomerInfo) => syncRef.current?.(info);
    revenueCatService.addCustomerInfoListener(listener);
    return () => {
      revenueCatService.removeCustomerInfoListener(listener);
    };
  }, [refreshCustomerInfo]);

  const presentPaywall = useCallback(async (): Promise<boolean> => {
    const purchased = await revenueCatService.presentPaywall();
    if (purchased) await refreshCustomerInfo();
    return purchased;
  }, [refreshCustomerInfo]);

  const presentPaywallIfNeeded = useCallback(async (): Promise<boolean> => {
    const result = await revenueCatService.presentPaywallIfNeeded();
    if (result) await refreshCustomerInfo();
    return result;
  }, [refreshCustomerInfo]);

  const presentCustomerCenter = useCallback(async (): Promise<void> => {
    await revenueCatService.presentCustomerCenter();
    // Refresh in case the user changed / cancelled their subscription
    await refreshCustomerInfo();
  }, [refreshCustomerInfo]);

  return {
    ...state,
    presentPaywall,
    presentPaywallIfNeeded,
    presentCustomerCenter,
    refreshCustomerInfo,
  };
}
