"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Bill {
  _id: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  status: "paid" | "unpaid" | "cancelled";
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  paid: "bg-[var(--accent-light)] text-[var(--accent)]",
  unpaid: "bg-[var(--warning-light)] text-[var(--warning)]",
  cancelled: "bg-[var(--danger-light)] text-[var(--danger)]",
};

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchBills = () => {
    setLoading(true);
    const url = filter === "all" ? "/api/bills" : `/api/bills?status=${filter}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (d.success) setBills(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBills(); }, [filter]); // eslint-disable-line

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Bills</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">{bills.length} invoices</p>
        </div>
        <Link
          href="/billing"
          className="flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Bill
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {["all", "paid", "unpaid", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors flex-shrink-0 ${
              filter === s
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Desktop / tablet: table. */}
      <div className="hidden sm:block bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3.5">Bill #</th>
              <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3.5">Customer</th>
              <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3.5">Date</th>
              <th className="text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3.5">Amount</th>
              <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3.5">Status</th>
              <th className="text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)]/60">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-[var(--surface-2)] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-[var(--text-muted)]">
                  <p className="text-sm">No bills found</p>
                </td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr
                  key={bill._id}
                  className="border-b border-[var(--border)]/60 hover:bg-[var(--surface-2)] transition-colors"
                >
                  <td className="px-5 py-4 font-mono text-[var(--accent)] text-sm font-medium">{bill.billNumber}</td>
                  <td className="px-5 py-4">
                    <p className="text-[var(--text-primary)] text-sm">{bill.customerName}</p>
                    {bill.customerPhone && (
                      <p className="text-[var(--text-muted)] text-xs">{bill.customerPhone}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-[var(--text-secondary)] text-sm">{fmtDate(bill.createdAt)}</td>
                  <td className="px-5 py-4 text-right text-[var(--text-primary)] text-sm font-semibold">{fmt(bill.total)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize ${statusStyles[bill.status]}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/bills/${bill._id}`}
                      className="text-xs bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards, one per bill, whole card is a tap target through to detail. */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse bg-[var(--surface-2)]" />
          ))
        ) : bills.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
            <p className="text-sm">No bills found</p>
          </div>
        ) : (
          bills.map((bill) => (
            <Link
              key={bill._id}
              href={`/bills/${bill._id}`}
              className="block bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 active:bg-[var(--surface-2)] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-mono text-[var(--accent)] text-sm font-medium">{bill.billNumber}</p>
                  <p className="text-[var(--text-primary)] text-sm mt-0.5 truncate">{bill.customerName}</p>
                  {bill.customerPhone && (
                    <p className="text-[var(--text-muted)] text-xs">{bill.customerPhone}</p>
                  )}
                </div>
                <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium capitalize ${statusStyles[bill.status]}`}>
                  {bill.status}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/60">
                <span className="text-[var(--text-secondary)] text-xs">{fmtDate(bill.createdAt)}</span>
                <span className="text-[var(--text-primary)] text-sm font-semibold">{fmt(bill.total)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}