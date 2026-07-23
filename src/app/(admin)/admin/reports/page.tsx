import { formatCents } from "@/config/business";
import {
  getExceptionBuckets,
  getReliabilityKpis,
  getRouteCellReports,
} from "@/lib/reports";

export const metadata = { title: "Admin — Reports" };
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const [kpis, cells, exceptions] = await Promise.all([
    getReliabilityKpis(),
    getRouteCellReports(),
    getExceptionBuckets(),
  ]);

  const reliabilityCards = [
    { label: "Total cycles", value: String(kpis.totalCycles) },
    { label: "Proof rate", value: `${kpis.proofRatePct}%` },
    { label: "Completed", value: String(kpis.completed) },
    { label: "With exception", value: String(kpis.completedWithException) },
    { label: "Hauler-delayed", value: String(kpis.delayedByHauler) },
    { label: "Open exceptions", value: String(kpis.openExceptions) },
  ];

  const totalMrr = cells.reduce((sum, cell) => sum + cell.monthlyRecurringCents, 0);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
      <p className="mt-2 max-w-2xl text-base text-muted">
        Operational reliability and route-economics inputs. These are internal decision inputs —
        not public metrics.
      </p>

      <section className="mt-6">
        <h2 className="text-xl font-bold">Reliability</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {reliabilityCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="mt-1 text-base text-muted">{card.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Route economics</h2>
        <p className="mt-1 text-base text-muted">
          Monthly-recurring shown as a monthly equivalent (quarterly prepay ÷ 3). Total MRR:{" "}
          <strong className="text-text">{formatCents(totalMrr)}</strong>.
        </p>
        <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border border-border text-left">
          <thead className="bg-surface">
            <tr>
              <th className="px-4 py-3 text-base font-semibold">Route cell</th>
              <th className="px-4 py-3 text-base font-semibold">State</th>
              <th className="px-4 py-3 text-base font-semibold">Active properties</th>
              <th className="px-4 py-3 text-base font-semibold">Monthly recurring</th>
            </tr>
          </thead>
          <tbody>
            {cells.map((cell) => (
              <tr key={cell.cellId ?? "unassigned"}>
                <td className="border-t border-border px-4 py-3 text-base">{cell.name}</td>
                <td className="border-t border-border px-4 py-3 text-base">{cell.state}</td>
                <td className="border-t border-border px-4 py-3 text-base">{cell.activeProperties}</td>
                <td className="border-t border-border px-4 py-3 text-base">
                  {formatCents(cell.monthlyRecurringCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Exceptions by category</h2>
        {exceptions.length === 0 ? (
          <p className="mt-3 text-base text-muted">No exceptions recorded.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {exceptions.map((bucket) => (
              <li key={bucket.type} className="flex items-center gap-3">
                <span className="w-56 text-base">{bucket.type.replace(/_/g, " ")}</span>
                <span
                  className="inline-block h-4 rounded bg-cyan"
                  style={{ width: `${Math.min(bucket.count * 24, 320)}px` }}
                  aria-hidden="true"
                />
                <span className="text-base text-muted">{bucket.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
