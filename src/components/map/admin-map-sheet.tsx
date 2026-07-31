"use client";

import { useId, useState, type ReactNode } from "react";

export interface AdminMapSheetProps {
  /** Always visible in the collapsed "peek" state — search and metric chips. */
  peek: ReactNode;
  /** Revealed when expanded — the filtered cell/property lists. */
  children: ReactNode;
}

/**
 * Mobile-only drag-up sheet for `/admin/map`.
 *
 * The map is the page at this breakpoint, so everything else (search, metric
 * chips, and the text list that is the map's accessible alternative) lives
 * here. Collapsed, it peeks with search + chips; expanded, it scrolls the
 * full list.
 *
 * Deliberately toggled by a real button rather than a drag gesture. The
 * visual grabber reads as draggable, but a gesture-only sheet is unusable by
 * keyboard and hostile to anyone with reduced dexterity — the button is the
 * accessible core and the whole header row is the target, well past 44px.
 *
 * Not a modal: the map stays visible and usable behind it, so there is no
 * focus trap and no `aria-modal`. Collapsed content is `hidden`, which keeps
 * it out of both the tab order and the accessibility tree.
 *
 * The height transition is neutered automatically by the global
 * `prefers-reduced-motion` rule in globals.css.
 */
export function AdminMapSheet({ peek, children }: AdminMapSheetProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-controls={contentId}
        className="flex min-h-[44px] w-full flex-col items-center justify-center gap-1 px-4 py-2"
      >
        <span aria-hidden="true" className="block h-1 w-10 rounded-full bg-border" />
        <span className="text-base font-medium text-muted">
          {expanded ? "Hide details" : "Show details"}
        </span>
      </button>

      <div className="px-4 pb-3">{peek}</div>

      <div
        id={contentId}
        className={expanded ? "max-h-[55svh] overflow-y-auto px-4 pb-4" : "hidden"}
      >
        {children}
      </div>
    </div>
  );
}
