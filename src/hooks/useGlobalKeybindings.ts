import { useEffect, useRef } from 'react';
import type { PlayerHandle } from '@/components/Player';

export interface KeybindingActions {
  mode: 'lobby' | 'playing';
  searchOpen: boolean;
  categories: { id: string; name: string }[];
  startPlaying: () => void;
  playNext: () => void;
  playPrev: () => void;
  handleCategoryChange: (id: string) => void;
  togglePlay: () => void;
  toggleMute: () => void;
  toggleShortcuts: () => void;
  toggleGuide: () => void;
  toggleHealth: () => void;
  toggleHideWatched: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  closeOverlays: () => void;
  toggleFullscreen: () => void;
}

function handleLobbyKey(key: string, actions: KeybindingActions): boolean {
  if (key === ' ' || key.toLowerCase() === 'n') {
    actions.startPlaying();
    return true;
  }
  return false;
}

function handlePlayingKey(
  key: string,
  actions: KeybindingActions,
  playerRef: React.RefObject<PlayerHandle | null>
): boolean {
  switch (key.toLowerCase()) {
    case ' ':
      playerRef.current?.togglePlay();
      actions.togglePlay();
      return true;
    case 'n':
    case 'arrowright':
      actions.playNext();
      return true;
    case 'p':
    case 'arrowleft':
      actions.playPrev();
      return true;
    case 'm':
      playerRef.current?.toggleMute();
      actions.toggleMute();
      return true;
    case 'f':
      actions.toggleFullscreen();
      return true;
    case 'g':
      actions.toggleGuide();
      return true;
    case 'w':
      actions.toggleHideWatched();
      return true;
    default: {
      const n = parseInt(key, 10);
      if (n >= 1 && n <= Math.min(actions.categories.length, 9)) {
        actions.handleCategoryChange(actions.categories[n - 1].id);
        return true;
      }
      return false;
    }
  }
}

export function useGlobalKeybindings(
  actions: KeybindingActions,
  playerRef: React.RefObject<PlayerHandle | null>
) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const a = actionsRef.current;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key;
      const lower = key.toLowerCase();

      if (key === '?') {
        e.preventDefault();
        a.toggleShortcuts();
        return;
      }
      if (key === '/') {
        e.preventDefault();
        a.openSearch();
        return;
      }
      if (key === 'Escape') {
        e.preventDefault();
        a.closeOverlays();
        return;
      }
      if (lower === 'h') {
        e.preventDefault();
        a.toggleHealth();
        return;
      }
      if (a.searchOpen) return;

      if (a.mode === 'lobby') {
        if (handleLobbyKey(key, a)) e.preventDefault();
        return;
      }

      if (a.mode !== 'playing') return;
      if (handlePlayingKey(key, a, playerRef)) e.preventDefault();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [playerRef]);
}
