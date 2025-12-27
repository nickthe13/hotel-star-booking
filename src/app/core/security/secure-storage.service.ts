import { Injectable } from '@angular/core';
import { SecurityConfig } from './security.config';
import * as nacl from 'tweetnacl';
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * Secure Storage Service
 * Uses authenticated encryption (NaCl secretbox) for storing sensitive data in localStorage
 *
 * SECURITY FEATURES:
 * - Authenticated encryption using TweetNaCl (audited cryptography library)
 * - Automatic nonce generation for each encryption
 * - Protection against tampering and forgery
 */
@Injectable({
  providedIn: 'root'
})
export class SecureStorageService {
  private readonly STORAGE_PREFIX = 'secure_';
  private encryptionKey: Uint8Array | null = null;

  constructor() {
    this.initializeEncryptionKey();
  }

  /**
   * Initializes encryption key from secure source
   * In production, this should be derived from user authentication
   */
  private initializeEncryptionKey(): void {
    // Generate or retrieve encryption key
    // SECURITY NOTE: In production, derive this from user's authentication token
    // or generate once and store securely (e.g., in memory only during session)
    const storedKey = sessionStorage.getItem('_ek');

    if (storedKey) {
      this.encryptionKey = decodeBase64(storedKey);
    } else {
      // Generate a new key (32 bytes for secretbox)
      this.encryptionKey = nacl.randomBytes(nacl.secretbox.keyLength);
      sessionStorage.setItem('_ek', encodeBase64(this.encryptionKey));
    }
  }

  /**
   * Stores data securely in localStorage using authenticated encryption
   */
  setItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value);
      const encrypted = SecurityConfig.dataProtection.encryptLocalStorage
        ? this.encrypt(serialized)
        : serialized;

      localStorage.setItem(this.STORAGE_PREFIX + key, encrypted);
    } catch (error) {
      console.error('Error storing data:', error);
      throw new Error('Failed to store data securely');
    }
  }

  /**
   * Retrieves and decrypts data from localStorage
   */
  getItem<T>(key: string): T | null {
    try {
      const encrypted = localStorage.getItem(this.STORAGE_PREFIX + key);

      if (!encrypted) {
        return null;
      }

      const decrypted = SecurityConfig.dataProtection.encryptLocalStorage
        ? this.decrypt(encrypted)
        : encrypted;

      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Error retrieving data:', error);
      return null;
    }
  }

  /**
   * Removes item from localStorage
   */
  removeItem(key: string): void {
    localStorage.removeItem(this.STORAGE_PREFIX + key);
  }

  /**
   * Clears all secure storage items
   */
  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Checks if item exists in storage
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(this.STORAGE_PREFIX + key) !== null;
  }

  /**
   * Encrypts data using NaCl secretbox (authenticated encryption)
   * Provides both confidentiality and integrity protection
   */
  private encrypt(data: string): string {
    if (!data || !this.encryptionKey) return '';

    try {
      // Generate random nonce (24 bytes for secretbox)
      const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

      // Convert string to Uint8Array
      const messageUint8 = decodeUTF8(data);

      // Encrypt using secretbox
      const ciphertext = nacl.secretbox(messageUint8, nonce, this.encryptionKey);

      // Combine nonce + ciphertext for storage
      const fullMessage = new Uint8Array(nonce.length + ciphertext.length);
      fullMessage.set(nonce);
      fullMessage.set(ciphertext, nonce.length);

      // Encode to base64 for storage
      return encodeBase64(fullMessage);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypts data using NaCl secretbox
   * Verifies authenticity before returning data
   */
  private decrypt(encrypted: string): string {
    if (!encrypted || !this.encryptionKey) return '';

    try {
      // Decode from base64
      const fullMessage = decodeBase64(encrypted);

      // Extract nonce and ciphertext
      const nonce = fullMessage.slice(0, nacl.secretbox.nonceLength);
      const ciphertext = fullMessage.slice(nacl.secretbox.nonceLength);

      // Decrypt and verify
      const decrypted = nacl.secretbox.open(ciphertext, nonce, this.encryptionKey);

      if (!decrypted) {
        throw new Error('Decryption failed - data may be corrupted or tampered with');
      }

      // Convert back to string
      return encodeUTF8(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Migrates data from regular localStorage to secure storage
   */
  migrateFromLocalStorage(oldKey: string, newKey?: string): void {
    const targetKey = newKey || oldKey;
    const data = localStorage.getItem(oldKey);

    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.setItem(targetKey, parsed);
        localStorage.removeItem(oldKey);
        console.log(`Migrated ${oldKey} to secure storage`);
      } catch (error) {
        console.error(`Failed to migrate ${oldKey}:`, error);
      }
    }
  }

  /**
   * Validates storage integrity
   */
  validateIntegrity(key: string): boolean {
    try {
      const data = this.getItem(key);
      return data !== null;
    } catch (error) {
      console.error(`Storage integrity check failed for ${key}:`, error);
      this.removeItem(key);
      return false;
    }
  }
}
