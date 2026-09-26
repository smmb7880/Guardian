import * as crypto from 'crypto';

export class HashService {
  /**
   * Hashes a raw plaintext password using PBKDF2 with a random 16-byte salt.
   * Returns a salt:hash string format.
   */
  public static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verifies a raw plaintext password against a stored salt:hash string.
   */
  public static verifyPassword(password: string, storedHash: string): boolean {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) {
      return false;
    }
    const hashToVerify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(hashToVerify, 'hex'));
  }

  /**
   * Generates a SHA-256 hash of a string (e.g. for session token hashing).
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a cryptographically random hex token string.
   */
  public static generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}
