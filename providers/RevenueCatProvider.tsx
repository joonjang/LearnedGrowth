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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const configured = useRef(false);
  const lastUserId = useRef<string | null>(null);

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
          await configureRevenueCat(user?.id ?? null);
          configured.current = true;
          lastUserId.current = user?.id ?? null;
        } else if (user?.id !== lastUserId.current) {
          if (user?.id) {
            await logInRevenueCat(user.id);
          } else {
            await logOutRevenueCat();
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
        active[GROWTH_PLUS_ENTITLEMENT] ||
          active["growth_plus"] ||
          active["Growth Plus"]
      );
    },
    [customerInfo?.entitlements?.active]
  );

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
