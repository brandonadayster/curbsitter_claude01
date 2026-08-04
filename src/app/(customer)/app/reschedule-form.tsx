import { requestReschedule } from "./orders/actions";

/**
 * Inline "request a different date" control for an eligible onDemand order
 * (PP-14). A plain form + server action — no client JS needed for a single
 * date input and submit.
 */
export function RescheduleForm({ orderId, currentDate }: { orderId: string; currentDate: string }) {
  const dayAfter = new Date(`${currentDate}T12:00:00-07:00`);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
  const min = dayAfter.toISOString().slice(0, 10);

  return (
    <form action={requestReschedule} className="mt-3 flex flex-wrap items-end gap-3">
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <label htmlFor={`reschedule-${orderId}`} className="mb-1 block text-base font-medium">
          Request a different pickup date
        </label>
        <input
          id={`reschedule-${orderId}`}
          name="newDate"
          type="date"
          min={min}
          required
          className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-base"
        />
        <p className="mt-1 text-sm text-muted">
          Enter the pickup date — we automatically put your bins out the evening before.
        </p>
      </div>
      <button
        type="submit"
        className="rounded-lg border border-cyan/60 px-4 py-2.5 text-base font-semibold text-cyan"
      >
        Request new date
      </button>
    </form>
  );
}
