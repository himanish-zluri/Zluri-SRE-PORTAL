import { encrypt, decrypt } from '../../utils/crypto';

describe('Crypto Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, ENCRYPTION_KEY: 'test-encryption-key-32-chars-long!' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('encrypt', () => {
    it('should encrypt a string', () => {
      const plainText = 'my-secret-password';
      const encrypted = encrypt(plainText);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainText);
      expect(encrypted.split(':').length).toBe(3); // iv:authTag:encrypted
    });

    it('should produce different ciphertext for same input (due to random IV)', () => {
      const plainText = 'my-secret-password';
      const encrypted1 = encrypt(plainText);
      const encrypted2 = encrypt(plainText);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted string', () => {
      const plainText = 'my-secret-password';
      const encrypted = encrypt(plainText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should decrypt various types of content', () => {
      const testCases = [
        'simple-password',
        'password with spaces',
        'p@$$w0rd!#$%^&*()',
        'mongodb://user:pass@localhost:27017',
        '{"json": "content"}'
      ];

      testCases.forEach(plainText => {
        const encrypted = encrypt(plainText);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(plainText);
      });
    });

    it('should throw error on invalid encrypted format', () => {
      expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted text format');
      expect(() => decrypt('only:two')).toThrow('Invalid encrypted text format');
    });

    it('should throw error on tampered ciphertext', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      parts[2] = 'tampered' + parts[2].slice(8); // Tamper with encrypted data
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      const encrypted = encrypt('test');
      delete process.env.ENCRYPTION_KEY;

      expect(() => decrypt(encrypted)).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });
});
