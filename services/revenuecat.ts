import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PRODUCT_CATEGORY,
  PurchasesOffering,
} from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

export const GROWTH_PLUS_ENTITLEMENT = "growth_plus";
export const MONTHLY_PACKAGE_IDENTIFIER = "monthly";
export const CONSUMABLE_PRODUCT_IDENTIFIER = "consumable";

export type PaywallResult = PAYWALL_RESULT;

function getRevenueCatApiKey() {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (!key) {
    throw new Error(
      "Missing EXPO_PUBLIC_REVENUECAT_API_KEY. Set it in your .env (app reload required)."
    );
  }
  return key;
}

export async function configureRevenueCat(appUserId: string | null) {
  Purchases.setLogLevel(LOG_LEVEL.INFO);
  Purchases.configure({
    apiKey: getRevenueCatApiKey(),
    appUserID: appUserId ?? null,
    entitlementVerificationMode:
      Purchases.ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL,
  });
  return fetchCustomerInfo();
}

export async function logInRevenueCat(appUserId: string) {
  const result = await Purchases.logIn(appUserId);
  return result.customerInfo;
}

export async function logOutRevenueCat() {
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
  offering?: PurchasesOffering | null
) {
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: GROWTH_PLUS_ENTITLEMENT,
    offering: offering ?? undefined,
    displayCloseButton: true,
  });
  if (result === PAYWALL_RESULT.NOT_PRESENTED) {
    // Fallback to a normal paywall in case the entitlement check short-circuits
    // or the offering lacks a paywall configuration.
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
    PRODUCT_CATEGORY.NON_SUBSCRIPTION
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
