import { describe, it, expect, vi, beforeEach } from 'vitest';
import { artifactUrl, fetchHealth, fetchCapabilities } from '../api/client';

describe('Frontend API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly constructs artifact URL', () => {
    const url = artifactUrl('test-job-123', '04_footprint.png');
    expect(url).toContain('/api/v1/artifacts/test-job-123/04_footprint.png');
  });

  it('fetchHealth returns data on 200 response', async () => {
    const mockHealth = { status: 'ok', version: '0.1.0', algorithm_version: 'ORB-v1' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    });

    const res = await fetchHealth();
    expect(res.status).toBe('ok');
    expect(res.version).toBe('0.1.0');
  });

  it('fetchHealth throws helpful error on failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(fetchHealth()).rejects.toThrow('Health check failed: 503');
  });

  it('fetchCapabilities returns supported formats', async () => {
    const mockCaps = { supported_formats: ['JPEG', 'PNG'], algorithms: ['ORB'] };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCaps,
    });

    const res = await fetchCapabilities();
    expect(res.supported_formats).toContain('JPEG');
  });
});
