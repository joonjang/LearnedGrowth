import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PRODUCT_CATEGORY,
  PurchasesOffering,
} from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

// Entitlement identifier as configured in RevenueCat dashboard.
export const GROWTH_PLUS_ENTITLEMENT = "growth_plus_access";
export const MONTHLY_PACKAGE_IDENTIFIER = "monthly";
// Default to the smallest consumable pack when a specific product isn't provided.
export const CONSUMABLE_PRODUCT_IDENTIFIER = "credit_small";

export type PaywallResult = PAYWALL_RESULT;

const shouldIgnoreRevenueCatLog = (message: string) =>
  message.includes("Failed to save codable to cache") &&
  message.includes("revenuecat.etags");

function getRevenueCatApiKey() {
  const isDev = __DEV__;
  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";

  let key: string | undefined = "";

  if (isDev) {
    key = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_DEV;
  } else {
    if (isIOS) {
      key = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_PROD_IOS;
    } else if (isAndroid) {
      key = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_PROD_ANDROID;
    }
  }

  if (!key) {
    throw new Error(
      `RevenueCat API Key not found. Platform: ${Platform.OS}, Mode: ${
        isDev ? "Dev" : "Release"
      }. Check your .env file.`,
    );
  }

  return key;
}

export async function configureRevenueCat(
  appUserId: string | null,
  preferredLocale?: string | null,
) {
  Purchases.setLogHandler((level, message) => {
    if (shouldIgnoreRevenueCatLog(message)) return;
    switch (level) {
      case LOG_LEVEL.DEBUG:
        console.debug(`[RevenueCat] ${message}`);
        break;
      case LOG_LEVEL.INFO:
        console.info(`[RevenueCat] ${message}`);
        break;
      case LOG_LEVEL.WARN:
        console.warn(`[RevenueCat] ${message}`);
        break;
      case LOG_LEVEL.ERROR:
        console.error(`[RevenueCat] ${message}`);
        break;
      default:
        console.log(`[RevenueCat] ${message}`);
    }
  });

  // 🔴 FIX: Changed from INFO to ERROR to prevent console logging crashes
  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  
  Purchases.configure({
    apiKey: getRevenueCatApiKey(),
    appUserID: appUserId ?? null,
    entitlementVerificationMode:
      Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
    preferredUILocaleOverride: preferredLocale ?? undefined,
  });
  return fetchCustomerInfo();
}

export function setRevenueCatPreferredLocale(preferredLocale?: string | null) {
  const rc = Purchases as unknown as {
    overridePreferredLocale?: (locale: string | null) => void;
  };

  if (typeof rc.overridePreferredLocale === "function") {
    rc.overridePreferredLocale(preferredLocale ?? null);
  }
}

export async function logInRevenueCat(appUserId: string) {
  const result = await Purchases.logIn(appUserId);
  return result.customerInfo;
}

export async function logOutRevenueCat() {
  const isAnonymous = await Purchases.isAnonymous();
  if (isAnonymous) {
    return Purchases.getCustomerInfo();
  }
  const info = await Purchases.logOut();
  return info;
}

export async function fetchCustomerInfo() {
  return Purchases.getCustomerInfo();
}

export async function fetchOfferings() {
  return Purchases.getOfferings();
}

export async function presentGrowthPlusPaywall(
  offering?: PurchasesOffering | null,
) {
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: GROWTH_PLUS_ENTITLEMENT,
    offering: offering ?? undefined,
    displayCloseButton: true,
  });
  if (result === PAYWALL_RESULT.NOT_PRESENTED) {
    return RevenueCatUI.presentPaywall({
      offering: offering ?? undefined,
      displayCloseButton: true,
    });
  }
  return result;
}

export async function presentCustomerCenter() {
  await RevenueCatUI.presentCustomerCenter();
}

export async function purchaseConsumable(productId?: string) {
  const products = await Purchases.getProducts(
    [productId ?? CONSUMABLE_PRODUCT_IDENTIFIER],
    PRODUCT_CATEGORY.NON_SUBSCRIPTION,
  );
  const product = products[0];
  if (!product) {
    throw new Error("Consumable product is not configured in RevenueCat");
  }
  const purchaseResult = await Purchases.purchaseStoreProduct(product);
  return purchaseResult;
}

export async function restoreRevenueCatPurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
