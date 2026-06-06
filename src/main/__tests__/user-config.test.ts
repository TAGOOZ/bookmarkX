import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readConfig, writeConfig, configExists, getConfigPath, DEFAULT_CONFIG } from '../user-config';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bookmarkx-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function getConfigPathForTest(): string {
  return path.join(tmpDir, 'user.json');
}

describe('user-config', () => {
  describe('configExists', () => {
    it('returns false when config file does not exist', () => {
      expect(configExists(tmpDir)).toBe(false);
    });

    it('returns true when config file exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'user.json'), '{}', 'utf-8');
      expect(configExists(tmpDir)).toBe(true);
    });
  });

  describe('getConfigPath', () => {
    it('returns path ending with user.json', () => {
      const result = getConfigPath(tmpDir);
      expect(result).toBe(path.join(tmpDir, 'user.json'));
    });
  });

  describe('readConfig', () => {
    it('returns default config when file does not exist', () => {
      const config = readConfig(tmpDir);
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('reads config from existing file', () => {
      const custom = {
        name: 'Mustafa',
        twitterHandle: '@mustafa',
        geminiApiKey: 'test-key',
        birdAuthToken: 'token123',
        birdCt0: 'ct0_456',
        birdChromeProfile: 'Default',
        theme: 'light' as const,
        language: 'en' as const,
        notifications: false,
        fetchFrequency: '0 */12 * * *',
        aiModel: 'gemini-2.0-flash',
      };
      fs.writeFileSync(path.join(tmpDir, 'user.json'), JSON.stringify(custom), 'utf-8');

      const config = readConfig(tmpDir);
      expect(config).toEqual(custom);
    });

    it('fills missing fields with defaults on partial config', () => {
      const partial = { name: 'Mustafa', geminiApiKey: 'key' };
      fs.writeFileSync(path.join(tmpDir, 'user.json'), JSON.stringify(partial), 'utf-8');

      const config = readConfig(tmpDir);
      expect(config.name).toBe('Mustafa');
      expect(config.geminiApiKey).toBe('key');
      expect(config.theme).toBe(DEFAULT_CONFIG.theme);
      expect(config.language).toBe(DEFAULT_CONFIG.language);
      expect(config.notifications).toBe(DEFAULT_CONFIG.notifications);
    });

    it('returns default config for invalid JSON', () => {
      fs.writeFileSync(path.join(tmpDir, 'user.json'), 'not-json', 'utf-8');

      const config = readConfig(tmpDir);
      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });

  describe('writeConfig', () => {
    it('creates config file with provided data', () => {
      const config = { ...DEFAULT_CONFIG, name: 'Test' };
      writeConfig(tmpDir, config);

      const raw = fs.readFileSync(path.join(tmpDir, 'user.json'), 'utf-8');
      expect(JSON.parse(raw)).toEqual(config);
    });

    it('overwrites existing config file', () => {
      writeConfig(tmpDir, { ...DEFAULT_CONFIG, name: 'First' });
      writeConfig(tmpDir, { ...DEFAULT_CONFIG, name: 'Second' });

      const config = readConfig(tmpDir);
      expect(config.name).toBe('Second');
    });

    it('creates directory if it does not exist', () => {
      const nestedDir = path.join(tmpDir, 'nested', 'dir');
      writeConfig(nestedDir, DEFAULT_CONFIG);

      expect(fs.existsSync(path.join(nestedDir, 'user.json'))).toBe(true);
    });
  });
});
