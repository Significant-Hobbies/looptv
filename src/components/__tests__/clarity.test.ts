import fs from 'node:fs';
import vm from 'node:vm';
import { expect, it, vi } from 'vitest';

const layout = fs.readFileSync('src/layouts/BaseLayout.astro', 'utf8');
const script = [...layout.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].find(([, body]) =>
  body.includes('window.clarity(')
)?.[1];

it.each(['pointerdown', 'keydown', 'touchstart', 'scroll', 'timer'])(
  'queues Clarity immediately and loads once after %s',
  (trigger) => {
    const listeners = new Map<string, () => void>();
    const insertBefore = vi.fn();
    const clearTimeout = vi.fn();
    let timer = () => {};
    const context = {
      window: {} as { clarity: { q: Array<ArrayLike<string>> } },
      document: {
        createElement: () => ({}),
        getElementsByTagName: () => [{ parentNode: { insertBefore } }],
      },
      addEventListener: (event: string, callback: () => void, options: object) => {
        expect(options).toEqual({ passive: true, once: true });
        listeners.set(event, callback);
      },
      removeEventListener: (event: string) => listeners.delete(event),
      setTimeout: (callback: () => void, delay: number) => {
        expect(delay).toBe(30_000);
        timer = callback;
        return 1;
      },
      clearTimeout,
    };
    expect(script).toBeDefined();
    vm.runInNewContext(script ?? '', context);
    expect(insertBefore).not.toHaveBeenCalled();
    expect(Array.from(context.window.clarity.q[0])).toEqual(['set', 'project_id', 'looptv']);
    expect([...listeners.keys()]).toEqual(['pointerdown', 'keydown', 'touchstart', 'scroll']);
    const go = trigger === 'timer' ? timer : listeners.get(trigger);
    go?.();
    timer();
    expect(insertBefore).toHaveBeenCalledOnce();
    expect(insertBefore.mock.calls[0][0]).toEqual({
      async: 1,
      src: 'https://www.clarity.ms/tag/y6bubc8t38',
    });
    expect(clearTimeout).toHaveBeenCalledWith(1);
    expect(listeners.size).toBe(0);
  }
);
