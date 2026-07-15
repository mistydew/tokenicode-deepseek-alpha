import { useEffect, useState, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Apple-style window control buttons (close / minimize / maximize).
 *
 * Rendered as three circular dots in the top-left corner:
 *   red = close, yellow = minimize, green = maximize.
 * Glyphs are hidden until the user hovers the cluster — matching the
 * macOS traffic-light convention.
 *
 * The window is created with `decorations: false`, so these buttons are
 * the only way to minimize / maximize / close on every platform.
 */
export function WindowControls() {
  const [hovered, setHovered] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Sync maximize state so the green button shows the correct glyph
  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;

    win.isMaximized()
      .then(setIsMaximized)
      .catch(() => {});

    win.onResized(() => {
      win.isMaximized()
        .then(setIsMaximized)
        .catch(() => {});
    }).then((fn) => {
      unlisten = fn;
    });

    return () => { unlisten?.(); };
  }, []);

  const handleClose = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    // close() fires the native close-requested event, so the existing
    // exit-confirmation dialog in App.tsx (onCloseRequested) still runs.
    // Requires the `core:window:allow-close` capability.
    getCurrentWindow().close().catch((err) => {
      console.error('[WindowControls] close() failed:', err);
    });
  }, []);

  const handleMinimize = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    getCurrentWindow().minimize().catch((err) => {
      console.error('[WindowControls] minimize() failed:', err);
    });
  }, []);

  const handleToggleMaximize = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    getCurrentWindow().toggleMaximize().catch((err) => {
      console.error('[WindowControls] toggleMaximize() failed:', err);
    });
  }, []);

  return (
    <div
      className="flex items-center gap-2 px-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Never let the drag region start a drag when interacting with buttons
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Close — red */}
      <ControlDot
        color="bg-[#ff5f57]"
        border="border-[#e0443e]"
        label="close"
        onClick={handleClose}
        showGlyph={hovered}
        glyph="close"
      />
      {/* Minimize — yellow */}
      <ControlDot
        color="bg-[#febc2e]"
        border="border-[#d9a116]"
        label="minimize"
        onClick={handleMinimize}
        showGlyph={hovered}
        glyph="minimize"
      />
      {/* Maximize / restore — green */}
      <ControlDot
        color="bg-[#28c840]"
        border="border-[#1aab29]"
        label={isMaximized ? 'restore' : 'maximize'}
        onClick={handleToggleMaximize}
        showGlyph={hovered}
        glyph={isMaximized ? 'restore' : 'maximize'}
      />
    </div>
  );
}

interface ControlDotProps {
  color: string;
  border: string;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  showGlyph: boolean;
  glyph: 'close' | 'minimize' | 'maximize' | 'restore';
}

function ControlDot({ color, border, label, onClick, showGlyph, glyph }: ControlDotProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`relative w-[14px] h-[14px] rounded-full ${color} ${border}
        border flex items-center justify-center
        text-black/55 transition-colors duration-100`}
    >
      {showGlyph && <Glyph type={glyph} />}
    </button>
  );
}

function Glyph({ type }: { type: 'close' | 'minimize' | 'maximize' | 'restore' }) {
  const common = 'absolute pointer-events-none';
  if (type === 'close') {
    return (
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={common}>
        <path d="M2 2l4 4M6 2l-4 4" />
      </svg>
    );
  }
  if (type === 'minimize') {
    return (
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className={common}>
        <path d="M1.5 4h5" />
      </svg>
    );
  }
  if (type === 'restore') {
    // Two overlapping triangles (macOS restore-down glyph)
    return (
      <svg width="8" height="8" viewBox="0 0 10 10" fill="none"
        stroke="currentColor" strokeWidth="1" strokeLinejoin="round" className={common}>
        <path d="M2.5 4.5L5 2l2.5 2.5v3L5 8z" />
      </svg>
    );
  }
  // maximize — two outward triangles
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" className={common}>
      <path d="M5 1.8L7 3.8 5 5.8 3 3.8z" opacity="0" />
      <path d="M2 2.5L3.8 1 5 2.2 3.2 3.7z" />
      <path d="M8 2.5L6.2 1 5 2.2 6.8 3.7z" />
      <path d="M2 7.5L3.8 9 5 7.8 3.2 6.3z" />
      <path d="M8 7.5L6.2 9 5 7.8 6.8 6.3z" />
    </svg>
  );
}
