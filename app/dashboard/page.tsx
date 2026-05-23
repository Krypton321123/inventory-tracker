"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalItems: number;
  totalBills: number;
  paidBills: number;
  unpaidBills: number;
  lowStockItems: number;
  inventoryValue: number;
  totalRevenue: number;
  recentRevenue: number;
}

function StatCard({ title, value, sub, accent, icon }: {
  title: string; value: string; sub?: string; accent: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid var(--border)" }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{title}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + "18", color: accent }}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(d => { if (d.success) setStats(d.data); }).finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <StatCard title="Total Items" value={String(stats.totalItems)} sub="in inventory" accent="#0d7a5f"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} />
            <StatCard title="Inventory Value" value={fmt(stats.inventoryValue)} sub="current stock" accent="#2563eb"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <StatCard title="Total Revenue" value={fmt(stats.totalRevenue)} sub="from paid bills" accent="#7c3aed"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
            <StatCard title="Low Stock Alerts" value={String(stats.lowStockItems)} sub="items ≤ 5 units" accent="#dc2626"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
          </div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Bills" value={String(stats.totalBills)} sub="all time" accent="#d97706"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
            <StatCard title="Paid Bills" value={String(stats.paidBills)} accent="#0d7a5f"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <StatCard title="Unpaid Bills" value={String(stats.unpaidBills)} accent="#d97706"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <StatCard title="7-Day Revenue" value={fmt(stats.recentRevenue)} sub="last 7 days" accent="#0891b2"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
          </div>

          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>Quick Actions</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { href: "/items", label: "Add Inventory Item", desc: "Register a new product or SKU", accent: "#0d7a5f", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg> },
              { href: "/billing", label: "Create New Bill", desc: "Add items and generate invoice", accent: "#2563eb", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
              { href: "/bills", label: "View All Bills", desc: "Browse and manage invoices", accent: "#7c3aed", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="group rounded-2xl p-5 flex items-center gap-4 transition-all duration-150 hover:shadow-sm"
                style={{ background: "#fff", border: "1px solid var(--border)" }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-150"
                  style={{ background: a.accent + "15", color: a.accent }}>
                  {a.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{a.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-20" style={{ color: "var(--text-muted)" }}>
          <p>Could not load stats. Make sure MongoDB is connected.</p>
        </div>
      )}
    </div>
  );
}