"use client";

export interface MapLayerToggleProps {
  showCells: boolean;
  showProperties: boolean;
  onChangeCells: (next: boolean) => void;
  onChangeProperties: (next: boolean) => void;
  className?: string;
}

/**
 * Collapsed layer control for the admin map's small-screen layout.
 *
 * Built on `<details>`/`<summary>` rather than a hand-rolled popover: the
 * open/closed state, keyboard operation, and screen-reader semantics are all
 * native, with no JS state or focus management to get wrong. Tapping the
 * summary again closes it, which is the normal pattern for a map layer
 * button.
 *
 * The summary carries the active count so the collapsed state still says
 * what is on, rather than hiding that behind a tap.
 */
export function MapLayerToggle({
  showCells,
  showProperties,
  onChangeCells,
  onChangeProperties,
  className,
}: MapLayerToggleProps) {
  const activeCount = Number(showCells) + Number(showProperties);

  return (
    <details className={className}>
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center rounded-lg border border-border bg-surface px-4 text-base font-medium [&::-webkit-details-marker]:hidden">
        Layers · {activeCount} on
      </summary>

      <fieldset className="mt-2 rounded-lg border border-border bg-surface px-4 py-2">
        <legend className="sr-only">Map layers</legend>

        <label className="flex min-h-[44px] items-center gap-3 text-base">
          <input
            type="checkbox"
            checked={showCells}
            onChange={(e) => onChangeCells(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-cyan)]"
          />
          Route cells
        </label>

        <label className="flex min-h-[44px] items-center gap-3 text-base">
          <input
            type="checkbox"
            checked={showProperties}
            onChange={(e) => onChangeProperties(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-cyan)]"
          />
          Properties
        </label>
      </fieldset>
    </details>
  );
}
