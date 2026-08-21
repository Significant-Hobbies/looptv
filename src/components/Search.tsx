'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Video } from '@/lib/types';
import { formatDuration } from '@/lib/catalog';

interface WatchLaterProps {
  ids?: Set<string>;
  onToggle?: (videoId: string) => void;
}

interface SearchProps {
  videos: Video[];
  onSelect: (video: Video) => void;
  onQueue?: (video: Video) => void;
  onClose: () => void;
  visible: boolean;
  watchLater: WatchLaterProps;
}

function WatchLaterButton({ video, watchLater }: { video: Video; watchLater: WatchLaterProps }) {
  if (!watchLater.onToggle) return null;
  const saved = watchLater.ids?.has(video.id) ?? false;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        watchLater.onToggle?.(video.id);
      }}
      className={`p-1.5 rounded transition-colors ${saved ? 'text-yellow-400' : 'text-white/20 hover:text-white/50'}`}
      title={saved ? 'Remove from Watch Later' : 'Watch Later'}
    >
      <svg
        className="w-4 h-4"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    </button>
  );
}

function QueueButton({ video, onQueue }: { video: Video; onQueue?: (v: Video) => void }) {
  if (!onQueue) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onQueue(video);
      }}
      className="p-1.5 rounded text-white/20 hover:text-white/50 transition-colors"
      title="Add to queue"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}

interface RowSelection {
  index: number;
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
}

interface RowHandlers {
  onSelect: (v: Video) => void;
  onQueue?: (v: Video) => void;
  handleRowKeyDown: (e: React.KeyboardEvent, v: Video) => void;
}

function SearchResultRow({
  video,
  selection,
  handlers,
  watchLater,
}: {
  video: Video;
  selection: RowSelection;
  handlers: RowHandlers;
  watchLater: WatchLaterProps;
}) {
  const { index, selectedIndex, setSelectedIndex } = selection;
  const { onSelect, onQueue, handleRowKeyDown } = handlers;
  return (
    <div
      key={video.id}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(video)}
      onKeyDown={(e) => handleRowKeyDown(e, video)}
      onMouseEnter={() => setSelectedIndex(index)}
      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
        index === selectedIndex ? 'bg-white/10' : 'cursor-pointer hover:bg-white/5'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-white text-sm truncate">{video.title}</p>
        <p className="text-white/40 text-xs mt-0.5 flex items-center gap-2">
          {video.source && <span className="text-white/30">{video.source}</span>}
          <span>{formatDuration(video.duration)}</span>
          {video.tags.length > 0 && (
            <span className="truncate">{video.tags.slice(0, 3).join(' \u00b7 ')}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <WatchLaterButton video={video} watchLater={watchLater} />
        <QueueButton video={video} onQueue={onQueue} />
        {index === selectedIndex && (
          <kbd className="text-white/20 text-xs bg-white/5 px-1.5 py-0.5 rounded">&crarr;</kbd>
        )}
      </div>
    </div>
  );
}

function WatchLaterList({
  videos,
  onSelect,
  watchLater,
  handleRowKeyDown,
}: {
  videos: Video[];
  onSelect: (v: Video) => void;
  watchLater: WatchLaterProps;
  handleRowKeyDown: (e: React.KeyboardEvent, v: Video) => void;
}) {
  const wlVideos =
    watchLater.ids && watchLater.ids.size > 0
      ? videos.filter((v) => watchLater.ids!.has(v.id))
      : [];
  if (wlVideos.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-white/30 text-sm">
        Type to search across {videos.length.toLocaleString()} videos
      </div>
    );
  }
  return (
    <div>
      <p className="px-4 pt-3 pb-1 text-white/30 text-xs font-medium uppercase tracking-wider">
        Watch Later
      </p>
      <div className="max-h-[50vh] overflow-y-auto">
        {wlVideos.map((video) => (
          <div
            key={video.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(video)}
            onKeyDown={(e) => handleRowKeyDown(e, video)}
            className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm truncate">{video.title}</p>
              <p className="text-white/40 text-xs mt-0.5">
                {video.source && <span className="text-white/30">{video.source}</span>}
              </p>
            </div>
            {watchLater.onToggle && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  watchLater.onToggle?.(video.id);
                }}
                className="p-1.5 rounded text-yellow-400 transition-colors"
                title="Remove from Watch Later"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Search({
  videos,
  onSelect,
  onQueue,
  onClose,
  visible,
  watchLater,
}: SearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [visible]);

  const results = useMemo(() => searchVideos(query, videos), [query, videos]);

  const handleQuery = (val: string) => {
    setQuery(val);
    setSelectedIndex(0);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, video: Video) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(video);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) onSelect(results[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4">
        <div className="bg-zinc-900 rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          <SearchInputBar
            inputRef={inputRef}
            query={query}
            handleQuery={handleQuery}
            handleKeyDown={handleKeyDown}
          />
          {results.length > 0 && (
            <SearchResultsList
              results={results}
              selection={{ selectedIndex, setSelectedIndex }}
              handlers={{ onSelect, onQueue, handleRowKeyDown }}
              watchLater={watchLater}
            />
          )}
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-white/30 text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {!query.trim() && (
            <WatchLaterList
              videos={videos}
              onSelect={onSelect}
              watchLater={watchLater}
              handleRowKeyDown={handleRowKeyDown}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function scoreVideo(v: Video, terms: string[]): number {
  const titleLower = v.title.toLowerCase();
  const sourceLower = (v.source || '').toLowerCase();
  let score = 0;
  const fullQuery = terms.join(' ');
  if (titleLower.includes(fullQuery)) score += 15;
  if (titleLower.startsWith(fullQuery)) score += 5;
  for (const term of terms) {
    if (titleLower.includes(term)) score += 5;
    if (sourceLower.includes(term)) score += 3;
    for (const tag of v.tags) {
      if (tag.toLowerCase().includes(term)) score += 4;
    }
  }
  const searchable = `${titleLower} ${v.tags.join(' ').toLowerCase()} ${sourceLower}`;
  const allMatch = terms.every((t) => searchable.includes(t));
  if (!allMatch) score = 0;
  return score;
}

function searchVideos(query: string, videos: Video[]): Video[] {
  if (!query.trim()) return [];
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return videos
    .map((v) => ({ video: v, score: scoreVideo(v, terms) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map((s) => s.video);
}

function SearchInputBar({
  inputRef,
  query,
  handleQuery,
  handleKeyDown,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  handleQuery: (val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div className="flex items-center px-4 border-b border-white/10">
      <svg
        className="w-5 h-5 text-white/40 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search videos, cast members, sketches..."
        className="w-full bg-transparent text-white text-lg px-3 py-4 outline-none placeholder:text-white/30"
      />
      <kbd className="text-white/20 text-xs bg-white/5 px-1.5 py-0.5 rounded shrink-0">ESC</kbd>
    </div>
  );
}

function SearchResultsList({
  results,
  selection,
  handlers,
  watchLater,
}: {
  results: Video[];
  selection: Omit<RowSelection, 'index'>;
  handlers: RowHandlers;
  watchLater: WatchLaterProps;
}) {
  return (
    <div className="max-h-[50vh] overflow-y-auto">
      {results.map((video, i) => (
        <SearchResultRow
          key={video.id}
          video={video}
          selection={{ index: i, ...selection }}
          handlers={handlers}
          watchLater={watchLater}
        />
      ))}
    </div>
  );
}
