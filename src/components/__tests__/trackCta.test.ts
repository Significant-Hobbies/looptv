import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackCta } from '../trackCta';

describe('trackCta', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('tracks and flushes a named event before navigation', () => {
    const track = vi.fn();
    const flush = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('window', { appHealth: { track, flush } });

    trackCta('looptv.cta.start_watching');

    expect(track).toHaveBeenCalledWith('looptv.cta.start_watching');
    expect(flush).toHaveBeenCalledOnce();
  });

  it('does not throw when analytics flush fails', async () => {
    const flush = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('window', { appHealth: { track: vi.fn(), flush } });

    expect(() => trackCta('looptv.cta.start_watching')).not.toThrow();
    await Promise.resolve();
  });
});
