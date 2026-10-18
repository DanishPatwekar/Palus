import { useState } from "react";

const ENCRYPTED_STORAGE_KEY = "palus.encrypted-customers.v1";
const LEGACY_STORAGE_KEY = "customers";
const PBKDF2_ITERATIONS = 310_000;
const MIN_PASSPHRASE_LENGTH = 12;

function getInitialStatus() {
  if (localStorage.getItem(ENCRYPTED_STORAGE_KEY)) return "locked";
  return readLegacyCustomers().length ? "legacy" : "empty";
}

function readLegacyCustomers() {
  try {
    const value = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null");
    return Array.isArray(value) ? normalizeCustomers(value) : [];
  } catch {
    return [];
  }
}

function normalizeCustomers(input) {
  let rows = Array.isArray(input) ? input : input?.customers;
  if (!Array.isArray(rows)) {
    throw new Error("JSON must contain an array of customer objects or a customers array.");
  }

  if (Array.isArray(rows[0])) {
    const firstRow = rows[0].map(value => String(value).trim().toLowerCase());
    if (firstRow.includes("name") && firstRow.some(value => value.includes("mobile"))) {
      rows = rows.slice(1);
    }
  }

  const customers = rows.map(row => {
    if (Array.isArray(row)) {
      return { name: row[0], mobile: row[1], dibba: row[2] };
    }
    if (!row || typeof row !== "object") return {};

    const values = Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[^a-z]/g, ""), value]),
    );
    return {
      name: values.name ?? values.customername,
      mobile: values.mobile ?? values.mobilenumber ?? values.phone ?? values.phonenumber,
      dibba: values.dibba ?? values.dibbanumber,
    };
  }).map(customer => ({
    name: String(customer.name ?? "").trim(),
    mobile: String(customer.mobile ?? "").trim(),
    dibba: String(customer.dibba ?? "").trim(),
  })).filter(customer => customer.name || customer.mobile || customer.dibba);

  if (!customers.length) {
    throw new Error("No customer rows found. Each row needs a name, mobile number, or dibba number.");
  }
  return customers;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

async function deriveKey(passphrase, salt) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure browser encryption requires HTTPS or localhost and a modern browser.");
  }
  const sourceKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    sourceKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptCustomers(customers, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(customers)),
  );

  return {
    version: 1,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA-256",
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptCustomers(envelope, passphrase) {
  if (envelope?.version !== 1 || envelope.algorithm !== "AES-GCM") {
    throw new Error("This encrypted customer file has an unsupported format.");
  }
  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const key = await deriveKey(passphrase, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToBytes(envelope.ciphertext),
  );
  return normalizeCustomers(JSON.parse(new TextDecoder().decode(plaintext)));
}

function isEncryptedEnvelope(value) {
  return value?.version === 1 && value.algorithm === "AES-GCM";
}

function validatePassphrase(passphrase, confirmation) {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(`Use a passphrase with at least ${MIN_PASSPHRASE_LENGTH} characters.`);
  }
  if (passphrase !== confirmation) {
    throw new Error("The passphrases do not match.");
  }
}

function readEncryptedEnvelope() {
  try {
    return JSON.parse(localStorage.getItem(ENCRYPTED_STORAGE_KEY) || "null");
  } catch {
    throw new Error("The saved encrypted customer data is damaged or unreadable.");
  }
}

export default function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [legacyCustomers, setLegacyCustomers] = useState(readLegacyCustomers);
  const [status, setStatus] = useState(getInitialStatus);
  const [error, setError] = useState("");

  const unlock = async passphrase => {
    setError("");
    try {
      const envelope = readEncryptedEnvelope();
      if (!envelope) throw new Error("No encrypted customer data was found in this browser.");
      setCustomers(await decryptCustomers(envelope, passphrase));
      setStatus("ready");
    } catch (unlockError) {
      setError(unlockError.name === "OperationError"
        ? "Unable to unlock. Check the passphrase and try again."
        : unlockError.message);
    }
  };

  const saveCustomers = async (nextCustomers, passphrase) => {
    const envelope = await encryptCustomers(nextCustomers, passphrase);
    localStorage.setItem(ENCRYPTED_STORAGE_KEY, JSON.stringify(envelope));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setCustomers(nextCustomers);
    setLegacyCustomers([]);
    setError("");
    setStatus("ready");
  };

  const importJsonFile = async (file, passphrase, confirmation) => {
    setError("");
    try {
      if (!file) throw new Error("Choose a JSON file to import.");
      validatePassphrase(passphrase, confirmation);
      const parsed = JSON.parse(await file.text());
      const nextCustomers = isEncryptedEnvelope(parsed)
        ? await decryptCustomers(parsed, passphrase)
        : normalizeCustomers(parsed);
      await saveCustomers(nextCustomers, passphrase);
    } catch (importError) {
      setError(importError.name === "OperationError"
        ? "Could not decrypt this backup. Check the passphrase."
        : importError.message || "Could not import this customer file.");
    }
  };

  const encryptLegacyCustomers = async (passphrase, confirmation) => {
    setError("");
    try {
      validatePassphrase(passphrase, confirmation);
      if (!legacyCustomers.length) throw new Error("No previous customer cache was found.");
      await saveCustomers(legacyCustomers, passphrase);
    } catch (migrationError) {
      setError(migrationError.message || "Could not encrypt the saved customer data.");
    }
  };

  const lock = () => {
    setCustomers([]);
    setStatus(localStorage.getItem(ENCRYPTED_STORAGE_KEY) ? "locked" : "empty");
    setError("");
  };

  const downloadEncryptedBackup = () => {
    setError("");
    try {
      const envelope = readEncryptedEnvelope();
      if (!envelope) throw new Error("There is no encrypted customer data to download.");
      const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "palus-customers.encrypted.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      setError(downloadError.message || "Could not create the encrypted backup.");
    }
  };

  return {
    customers,
    status,
    error,
    legacyCount: legacyCustomers.length,
    unlock,
    importJsonFile,
    encryptLegacyCustomers,
    downloadEncryptedBackup,
    lock,
    clearError: () => setError(""),
  };
}
