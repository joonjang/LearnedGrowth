import CryptoJS from "crypto-js";
import * as Crypto from "expo-crypto";

const MASTER_KEY_BYTES = 32;
const SALT_BYTES = 16;
const IV_BYTES = 16;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_SIZE_WORDS = 256 / 32;

// Helper: Convert Uint8Array to Hex String
const hexFromBytes = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * FAIL-SAFE RANDOM GENERATOR
 * 1. Tries Native Secure Random (Phone)
 * 2. Falls back to Insecure Math.random (Browser/Debugger)
 */
async function randomHex(byteLength: number): Promise<string> {
  try {
    // Attempt 1: Native Secure Random
    const bytes = await Crypto.getRandomBytesAsync(byteLength);
    return hexFromBytes(bytes);
  } catch (error) {
    console.warn(
      "[Crypto] Native secure random failed. Using insecure fallback for DEVELOPMENT ONLY."
    );
    
    // Attempt 2: Pure JS Fallback (Works in Chrome Debugger)
    // We manually build the hex string to avoid any other library dependencies
    const hexChars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < byteLength * 2; i++) {
      result += hexChars[Math.floor(Math.random() * 16)];
    }
    return result;
  }
}

// --- Formatters ---

const formatCipherPayload = (
  cipherText: string,
  iv: CryptoJS.lib.WordArray
): string => `${iv.toString(CryptoJS.enc.Hex)}:${cipherText}`;

const parseCipherPayload = (
  payload: string
): { iv: CryptoJS.lib.WordArray; cipherText: string } => {
  const [ivHex, cipherText] = payload.split(":");
  if (!ivHex || !cipherText) {
    throw new Error("Invalid cipher payload");
  }
  return {
    iv: CryptoJS.enc.Hex.parse(ivHex),
    cipherText,
  };
};

// --- Core AES Logic ---

const encryptWithKey = (plaintext: string, keyHex: string): string => {
  const key = CryptoJS.enc.Hex.parse(keyHex);
  
  // NOTE: CryptoJS.lib.WordArray.random can also fail in Debugger.
  // We use a try/catch block here too.
  let iv;
  try {
    iv = CryptoJS.lib.WordArray.random(IV_BYTES);
  } catch (e) {
    // Fallback IV generation for Debugger
    const hex = Array(IV_BYTES * 2).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    iv = CryptoJS.enc.Hex.parse(hex);
  }

  const cipher = CryptoJS.AES.encrypt(plaintext, key, { iv });
  return formatCipherPayload(cipher.toString(), iv);
};

const decryptWithKey = (payload: string, keyHex: string): string => {
  const { iv, cipherText } = parseCipherPayload(payload);
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const result = CryptoJS.AES.decrypt(cipherText, key, { iv }).toString(
    CryptoJS.enc.Utf8
  );
  if (!result) {
    // Decryption failed logic
  }
  return result;
};

// --- Public API ---

export async function generateMasterKey(): Promise<string> {
  return randomHex(MASTER_KEY_BYTES);
}

export function deriveKeyFromPassword(password: string, salt: string): string {
  if (!password) throw new Error("Password is required for key derivation");
  if (!salt) throw new Error("Salt is required for key derivation");

  const saltWordArray = CryptoJS.enc.Hex.parse(salt);
  return CryptoJS.PBKDF2(password, saltWordArray, {
    keySize: PBKDF2_KEY_SIZE_WORDS,
    iterations: PBKDF2_ITERATIONS,
  }).toString(CryptoJS.enc.Hex);
}

export async function encryptMasterKey(
  masterKey: string,
  password: string
): Promise<{ encryptedMasterKey: string; salt: string }> {
  if (!masterKey) throw new Error("Missing master key");
  if (!password) throw new Error("Password is required to wrap master key");

  const salt = await randomHex(SALT_BYTES);
  const derivedKey = deriveKeyFromPassword(password, salt);
  const encryptedMasterKey = encryptWithKey(masterKey, derivedKey);

  return { encryptedMasterKey, salt };
}

export function decryptMasterKey(
  encryptedMasterKey: string,
  password: string,
  salt: string
): string {
  if (!encryptedMasterKey) throw new Error("Missing encrypted master key");
  const derivedKey = deriveKeyFromPassword(password, salt);
  return decryptWithKey(encryptedMasterKey, derivedKey);
}

export function encryptData(text: string, masterKey: string): string {
  if (!text) return "";
  if (!masterKey) throw new Error("Missing master key");
  return encryptWithKey(text, masterKey);
}

export function decryptData(ciphertext: string, masterKey: string): string {
  if (!ciphertext) return "";
  if (!masterKey) throw new Error("Missing master key");
  return decryptWithKey(ciphertext, masterKey);
}