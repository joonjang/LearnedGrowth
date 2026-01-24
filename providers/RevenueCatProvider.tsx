import {
  GROWTH_PLUS_ENTITLEMENT,
  PaywallResult,
  configureRevenueCat,
  fetchCustomerInfo,
  fetchOfferings,
  logInRevenueCat,
  logOutRevenueCat,
  presentCustomerCenter,
  presentGrowthPlusPaywall,
  purchaseConsumable,
  restoreRevenueCatPurchases
} from "@/services/revenuecat";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Purchases, {
  CustomerInfo,
  MakePurchaseResult,
  PurchasesOffering,
  PurchasesOfferings,
} from "react-native-purchases";

import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

type RevenueCatContextShape = {
  loading: boolean;
  error: string | null;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
  isGrowthPlusActive: boolean;
  refreshCustomerInfo: () => Promise<void>;
  refreshOfferings: () => Promise<void>;
  showPaywall: () => Promise<PaywallResult>;
  showCustomerCenter: () => Promise<void>;
  restorePurchases: () => Promise<CustomerInfo>;
  buyConsumable: (productId?: string) => Promise<MakePurchaseResult>;
};

const RevenueCatContext = createContext<RevenueCatContextShape | null>(null);

export function RevenueCatProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const configured = useRef(false);
  const lastUserId = useRef<string | null>(null);
  const planSyncing = useRef(false);

  const handleCustomerInfoUpdate = useCallback((info: CustomerInfo) => {
    setCustomerInfo(info);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!configured.current) {
          // Initial Configuration
          await configureRevenueCat(user?.id ?? null);
          configured.current = true;
          lastUserId.current = user?.id ?? null;
        } else if (user?.id !== lastUserId.current) {
          // 🔴 FIX: Handle User Switch Sequentially
          // This prevents the race condition where we try to write to a cache 
          // that is being deleted by a logout.
          
          // 1. If we had a previous user, explicitly log them out first.
          if (lastUserId.current) {
            await logOutRevenueCat();
          }

          // 2. If we have a new user, log them in.
          if (user?.id) {
            await logInRevenueCat(user.id);
          }
          
          lastUserId.current = user?.id ?? null;
        }

        const [info, loadedOfferings] = await Promise.all([
          fetchCustomerInfo(),
          fetchOfferings(),
        ]);

        if (!mounted) return;
        setCustomerInfo(info);
        setOfferings(loadedOfferings);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? "RevenueCat setup failed");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    Purchases.addCustomerInfoUpdateListener(handleCustomerInfoUpdate);

    return () => {
      mounted = false;
      Purchases.removeCustomerInfoUpdateListener(handleCustomerInfoUpdate);
    };
  }, [handleCustomerInfoUpdate, user?.id]);

  const refreshCustomerInfo = useCallback(async () => {
    const info = await fetchCustomerInfo();
    setCustomerInfo(info);
  }, []);

  const refreshOfferings = useCallback(async () => {
    const loadedOfferings = await fetchOfferings();
    setOfferings(loadedOfferings);
  }, []);

  const showPaywall = useCallback(async () => {
    if (!user?.id) {
      throw new Error("Sign in to manage your subscription.");
    }
    let offering = offerings?.current ?? null;
    if (!offering) {
      await refreshOfferings();
      offering = offerings?.current ?? null;
    }
    const result = await presentGrowthPlusPaywall(offering);
    const info = await fetchCustomerInfo();
    setCustomerInfo(info);
    return result;
  }, [offerings, refreshOfferings, user?.id]);

  const showCustomerCenter = useCallback(async () => {
    await presentCustomerCenter();
    const info = await fetchCustomerInfo();
    setCustomerInfo(info);
  }, []);

  const restorePurchases = useCallback(async () => {
    const info = await restoreRevenueCatPurchases();
    setCustomerInfo(info);
    return info;
  }, []);

  const buyConsumable = useCallback(
    async (productId?: string) => {
      const purchaseResult = await purchaseConsumable(productId);
      setCustomerInfo(purchaseResult.customerInfo);
      return purchaseResult;
    },
    []
  );

  const isGrowthPlusActive = useMemo(
    () => {
      const active = customerInfo?.entitlements?.active ?? {};
      return Boolean(
        active[GROWTH_PLUS_ENTITLEMENT]
      );
    },
    [customerInfo?.entitlements?.active]
  );

  useEffect(() => {
    if (!supabase || !user?.id) return;
    if (loading || error || !customerInfo) return;
    if (isGrowthPlusActive) return;
    if (profile?.plan !== "growth_plus") return;
    if (planSyncing.current) return;

    planSyncing.current = true;
    (async () => {
      try {
        const { error: planError } = await supabase.rpc("set_plan_free");
        if (planError) {
          console.warn("Failed to downgrade plan from RevenueCat", planError);
          return;
        }
        await refreshProfile();
      } catch (err) {
        console.warn("Failed to sync plan from RevenueCat", err);
      } finally {
        planSyncing.current = false;
      }
    })();
  }, [
    customerInfo,
    error,
    isGrowthPlusActive,
    loading,
    profile?.plan,
    refreshProfile,
    user?.id,
  ]);

  const value = useMemo<RevenueCatContextShape>(
    () => ({
      loading,
      error,
      customerInfo,
      offerings,
      currentOffering: offerings?.current ?? null,
      isGrowthPlusActive,
      refreshCustomerInfo,
      refreshOfferings,
      showPaywall,
      showCustomerCenter,
      restorePurchases,
      buyConsumable,
    }),
    [
      buyConsumable,
      customerInfo,
      error,
      isGrowthPlusActive,
      loading,
      offerings,
      refreshCustomerInfo,
      refreshOfferings,
      restorePurchases,
      showCustomerCenter,
      showPaywall,
    ]
  );

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) throw new Error("useRevenueCat must be used within RevenueCatProvider");
  return ctx;
}
