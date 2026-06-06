import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectChromeProfiles, extractTwitterCookies, detectAndExtract } from '../chrome-profile-detect';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('chrome-profile-detect', () => {
  describe('detectChromeProfiles', () => {
    it('returns empty array when chrome dir does not exist', () => {
      const profiles = detectChromeProfiles(path.join(tmpDir, 'nonexistent'));
      expect(profiles).toEqual([]);
    });

    it('detects Default profile', () => {
      const chromeDir = path.join(tmpDir, 'chrome');
      fs.mkdirSync(path.join(chromeDir, 'Default'), { recursive: true });

      const profiles = detectChromeProfiles(chromeDir);
      expect(profiles).toContain('Default');
    });

    it('detects multiple numbered profiles', () => {
      const chromeDir = path.join(tmpDir, 'chrome');
      fs.mkdirSync(path.join(chromeDir, 'Default'), { recursive: true });
      fs.mkdirSync(path.join(chromeDir, 'Profile 1'), { recursive: true });
      fs.mkdirSync(path.join(chromeDir, 'Profile 2'), { recursive: true });

      const profiles = detectChromeProfiles(chromeDir);
      expect(profiles).toHaveLength(3);
      expect(profiles).toContain('Default');
      expect(profiles).toContain('Profile 1');
      expect(profiles).toContain('Profile 2');
    });

    it('ignores non-profile directories', () => {
      const chromeDir = path.join(tmpDir, 'chrome');
      fs.mkdirSync(path.join(chromeDir, 'Default'), { recursive: true });
      fs.mkdirSync(path.join(chromeDir, 'SingletonLock'), { recursive: true });
      fs.mkdirSync(path.join(chromeDir, 'GrShaderCache'), { recursive: true });

      const profiles = detectChromeProfiles(chromeDir);
      expect(profiles).toEqual(['Default']);
    });
  });

  describe('extractTwitterCookies', () => {
    it('returns null values when no Cookies DB exists', async () => {
      const profileDir = path.join(tmpDir, 'profile');
      fs.mkdirSync(profileDir, { recursive: true });

      const result = await extractTwitterCookies(profileDir);
      expect(result.authToken).toBeNull();
      expect(result.ct0).toBeNull();
    });

    it('returns null values when profile dir does not exist', async () => {
      const result = await extractTwitterCookies(path.join(tmpDir, 'nonexistent'));
      expect(result.authToken).toBeNull();
      expect(result.ct0).toBeNull();
    });
  });

  describe('detectAndExtract', () => {
    it('returns empty result when no chrome dir exists', async () => {
      const result = await detectAndExtract(path.join(tmpDir, 'nonexistent'));
      expect(result.profiles).toEqual([]);
      expect(result.selectedProfile).toBe('');
      expect(result.authToken).toBeUndefined();
      expect(result.ct0).toBeUndefined();
    });

    it('returns profiles but no cookies when no Cookies DB', async () => {
      const chromeDir = path.join(tmpDir, 'chrome');
      fs.mkdirSync(path.join(chromeDir, 'Default'), { recursive: true });

      const result = await detectAndExtract(chromeDir);
      expect(result.profiles).toContain('Default');
      expect(result.selectedProfile).toBe('Default');
      expect(result.authToken).toBeUndefined();
      expect(result.ct0).toBeUndefined();
    });
  });
});
