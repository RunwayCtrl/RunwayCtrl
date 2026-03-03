import { describe, it, expect } from 'vitest';
import { VERSION } from './index.js';

describe('RunwayCtrl', () => {
  it('should export a version string', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
  });
});
