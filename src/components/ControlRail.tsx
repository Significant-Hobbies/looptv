"use client";

import { useState, type ReactNode } from "react";
import type { Video } from "@/lib/types";
import { formatDuration } from "@/lib/catalog";

interface ControlRailProps {
  stationName: string;
  currentVideo: Video | null;
  paused: boolean;
  muted: boolean;
  hasHistory: boolean;
  queueCount: number;
  status?: string;
  hideWatched: boolean;
  watchLaterActive: boolean;
  savedForPlayback: boolean;
  guideOpen: boolean;
  isSmartMix: boolean;
  smartMixReason?: string;
  nextVideoPreview?: Video | null;
  onBack: () => void;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSearch: () => void;
  onToggleWatchLater: () => void;
  onToggleGuide: () => void;
  onToggleMute: () => void;
  onToggleHideWatched: () => void;
  onToggleSavedForPlayback: () => void;
  onCopyLink: () => void;
  onFullscreen: () => void;
  onOpenHealth: () => void;
  onOpenShortcuts: () => void;
  onSmartMixFavorite?: () => void;
  onSmartMixDislike?: () => void;
  onSmartMixExport?: () => void;
  onSmartMixImport?: () => void;
  onSmartMixReset?: () => void;
  smartMixFavorite?: boolean;
  smartMixDisliked?: boolean;
  copied?: boolean;
}

function RailButton({
  onClick,
  title,
  disabled,
  active,
  overlay,
  children,
  className = "",
}: {
  onClick?: () => void;
  title: string;
  disabled?: boolean;
  active?: boolean;
  overlay?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        overlay
          ? active
            ? "bg-white/15 text-white"
            : "text-white/55 hover:bg-white/10 hover:text-white"
          : active
            ? "bg-white/15 text-white"
            : "text-white/70 hover:bg-white/10 hover:text-white"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function ControlRail({
  stationName,
  currentVideo,
  paused,
  muted,
  hasHistory,
  queueCount,
  status,
  hideWatched,
  watchLaterActive,
  savedForPlayback,
  guideOpen,
  isSmartMix,
  smartMixReason,
  nextVideoPreview,
  onBack,
  onPlayPause,
  onPrev,
  onNext,
  onSearch,
  onToggleWatchLater,
  onToggleGuide,
  onToggleMute,
  onToggleHideWatched,
  onToggleSavedForPlayback,
  onCopyLink,
  onFullscreen,
  onOpenHealth,
  onOpenShortcuts,
  onSmartMixFavorite,
  onSmartMixDislike,
  onSmartMixExport,
  onSmartMixImport,
  onSmartMixReset,
  smartMixFavorite,
  smartMixDisliked,
  copied,
}: ControlRailProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="bg-zinc-950 border-t border-white/10 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {currentVideo && (
        <div className="border-b border-white/5 px-3 py-2 sm:px-4">
          <div className="flex items-start gap-2">
            <RailButton onClick={onBack} title="Back to channel" className="shrink-0 -ml-1">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </RailButton>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{currentVideo.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/40">
                <span className="font-semibold text-red-500">{stationName}</span>
                {currentVideo.source && <span>via {currentVideo.source}</span>}
                <span>{formatDuration(currentVideo.duration)}</span>
                {queueCount > 0 && <span className="text-blue-400">{queueCount} queued</span>}
                {status && <span className="text-yellow-500">{status}</span>}
              </p>
              {isSmartMix && (
                <p className="mt-1 truncate text-xs text-white/30">
                  {smartMixReason || "Learning from favorites, dislikes, tags, sources, skips, and watch history."}
                </p>
              )}
              {nextVideoPreview && !isSmartMix && (
                <p className="mt-0.5 hidden truncate text-xs text-white/20 sm:block">
                  Up next: {nextVideoPreview.title}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-2 py-2 sm:px-4">
        <div className="flex items-center gap-0.5 sm:gap-1">
          <RailButton onClick={onPrev} title="Previous (P)" disabled={!hasHistory}>
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </RailButton>
          <RailButton onClick={onPlayPause} title="Play / Pause (Space)" className="min-w-[3rem]">
            {paused ? (
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </RailButton>
          <RailButton onClick={onNext} title="Next (N)">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </RailButton>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <RailButton onClick={onSearch} title="Search (/)" overlay>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </RailButton>
          {currentVideo && (
            <RailButton
              onClick={onToggleWatchLater}
              title={watchLaterActive ? "Remove from watch later" : "Watch later"}
              overlay
              active={watchLaterActive}
            >
              <svg className="h-5 w-5" fill={watchLaterActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </RailButton>
          )}
          <RailButton onClick={onToggleGuide} title="Stations (G)" overlay active={guideOpen}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h8M4 18h8" />
            </svg>
          </RailButton>
          <RailButton
            onClick={() => setMoreOpen((open) => !open)}
            title="More controls"
            overlay
            active={moreOpen}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </RailButton>
        </div>
      </div>

      {moreOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[90] bg-black/40"
            aria-label="Close more controls"
            onClick={() => setMoreOpen(false)}
          />
          <div className="relative z-[95] border-t border-white/10 bg-zinc-950 px-3 py-3 sm:px-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
              More controls
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              <RailButton onClick={onToggleMute} title="Mute (M)" active={muted}>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  {muted ? (
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  ) : (
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  )}
                </svg>
              </RailButton>
              <RailButton onClick={onToggleHideWatched} title="Toggle watched filter (W)" active={hideWatched}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {hideWatched ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  )}
                </svg>
              </RailButton>
              {currentVideo && (
                <RailButton
                  onClick={onToggleSavedForPlayback}
                  title={savedForPlayback ? "Remove browser save" : "Save in browser until watched"}
                  active={savedForPlayback}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v10m0 0l4-4m-4 4L8 9m-4 9h16" />
                  </svg>
                </RailButton>
              )}
              <RailButton onClick={onCopyLink} title="Copy YouTube link" active={copied}>
                {copied ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                )}
              </RailButton>
              <RailButton onClick={onFullscreen} title="Fullscreen (F)">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </RailButton>
              <RailButton onClick={() => { setMoreOpen(false); onOpenHealth(); }} title="Channel health (H)" overlay>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </RailButton>
              <RailButton onClick={() => { setMoreOpen(false); onOpenShortcuts(); }} title="Keyboard shortcuts (?)" overlay>
                <span className="text-sm font-mono">?</span>
              </RailButton>
              {isSmartMix && (
                <>
                  <RailButton onClick={onSmartMixFavorite} title="Favorite for Smart Mix" active={smartMixFavorite}>
                    <svg className="h-5 w-5" fill={smartMixFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.48 3.499l2.006 4.064 4.486.652-3.246 3.164.766 4.468-4.012-2.109-4.012 2.109.766-4.468-3.246-3.164 4.486-.652 2.006-4.064z" />
                    </svg>
                  </RailButton>
                  <RailButton onClick={onSmartMixDislike} title="Dislike and skip in Smart Mix" active={smartMixDisliked}>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l2.682-5.364A2 2 0 017.918 4H15v10l-4 7-1-1v-6zM15 4h4v10h-4V4z" />
                    </svg>
                  </RailButton>
                  <RailButton onClick={onSmartMixExport} title="Export Smart Mix profile">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0-12l4 4m-4-4L8 7m-4 10h16v4H4v-4z" />
                    </svg>
                  </RailButton>
                  <RailButton onClick={onSmartMixImport} title="Import Smart Mix profile">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21V9m0 12l4-4m-4 4l-4-4m-4-10h16V3H4v4z" />
                    </svg>
                  </RailButton>
                  <RailButton onClick={onSmartMixReset} title="Reset Smart Mix profile">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0019 5m0 0h-5m5 0v5" />
                    </svg>
                  </RailButton>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
