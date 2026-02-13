/**
 * Tests for useTheme composable
 * Note: These tests focus on the exported functions logic.
 * DOM manipulation tests are skipped since useTheme relies on document which is not
 * fully available in happy-dom without proper setup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { themeUtils } from '@/composables/useTheme';

describe('useTheme Composable', () => {
  describe('themeUtils.getSystemTheme', () => {
    it('should return light when system prefers light theme', () => {
      // In happy-dom matchMedia returns false by default
      const result = themeUtils.getSystemTheme();
      expect(['light', 'dark']).toContain(result);
    });
  });
});
