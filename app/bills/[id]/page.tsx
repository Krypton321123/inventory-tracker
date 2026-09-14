"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface BillItem {
  itemId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  unit: string;
  subtotal: number;
}

interface Bill {
  _id: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  notes?: string;
  status: "paid" | "unpaid" | "cancelled";
  createdAt: string;
}

const statusStyles: Record<string, string> = {
  paid: "bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent)]/20",
  unpaid: "bg-[var(--warning-light)] text-[var(--warning)] border border-[var(--warning)]/20",
  cancelled: "bg-[var(--danger-light)] text-[var(--danger)] border border-[var(--danger)]/20",
};

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/bills/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setBill(d.data); })
      .finally(() => setLoading(false));
  }, [params.id]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const updateStatus = async (status: string) => {
    if (!bill) return;
    setUpdating(true);
    const res = await fetch(`/api/bills/${bill._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const d = await res.json();
    if (d.success) setBill(d.data);
    setUpdating(false);
  };

  const downloadPDF = async () => {
    if (!bill) return;
    setPdfLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ format: "a4", unit: "mm" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      doc.setFillColor(13, 122, 95);
      doc.rect(0, 0, pageW, 45, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("StockFlow", 15, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(230, 244, 240);
      doc.text("Inventory Management System", 15, 27);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("INVOICE", pageW - 15, 17, { align: "right" });
      doc.setFontSize(16);
      doc.text(bill.billNumber, pageW - 15, 26, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(230, 244, 240);
      doc.text(`Date: ${fmtDate(bill.createdAt)}`, pageW - 15, 33, { align: "right" });
      doc.text(`Status: ${bill.status.toUpperCase()}`, pageW - 15, 39, { align: "right" });

      doc.setFillColor(241, 240, 237);
      doc.roundedRect(10, 52, 90, 35, 3, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(156, 152, 144);
      doc.text("BILL TO", 16, 60);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(26, 25, 23);
      doc.text(bill.customerName, 16, 69);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 104, 96);
      if (bill.customerPhone) doc.text(`Phone: ${bill.customerPhone}`, 16, 76);
      if (bill.customerAddress) {
        const addrLines = doc.splitTextToSize(bill.customerAddress, 75);
        doc.text(addrLines, 16, bill.customerPhone ? 82 : 76);
      }

      const tableData = bill.items.map((item) => [
        item.name,
        item.sku,
        item.unit,
        item.quantity.toString(),
        fmt(item.price),
        fmt(item.subtotal),
      ]);

      autoTable(doc, {
        startY: 95,
        head: [["Item", "SKU", "Unit", "Qty", "Unit Price", "Subtotal"]],
        body: tableData,
        theme: "plain",
        headStyles: {
          fillColor: [241, 240, 237],
          textColor: [107, 104, 96],
          fontSize: 8,
          fontStyle: "bold",
          halign: "left",
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [26, 25, 23],
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [248, 247, 244],
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 25 },
          2: { cellWidth: 15 },
          3: { cellWidth: 15, halign: "center" },
          4: { cellWidth: 30, halign: "right" },
          5: { cellWidth: 30, halign: "right" },
        },
        margin: { left: 10, right: 10 },
        tableLineColor: [228, 226, 220],
        tableLineWidth: 0.1,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable.finalY + 8;
      const totalsX = pageW - 80;

      doc.setFillColor(241, 240, 237);
      doc.roundedRect(totalsX - 5, finalY - 5, 75, bill.notes ? 48 : 40, 3, 3, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 104, 96);
      doc.text("Subtotal:", totalsX, finalY + 4);
      doc.text("GST (" + bill.taxRate + "%):", totalsX, finalY + 12);
      if (bill.discount > 0) doc.text("Discount:", totalsX, finalY + 20);

      doc.setTextColor(26, 25, 23);
      doc.text(fmt(bill.subtotal), pageW - 12, finalY + 4, { align: "right" });
      doc.text(fmt(bill.tax), pageW - 12, finalY + 12, { align: "right" });
      if (bill.discount > 0) doc.text(`-${fmt(bill.discount)}`, pageW - 12, finalY + 20, { align: "right" });

      const totalY = finalY + (bill.discount > 0 ? 28 : 22);
      doc.setDrawColor(13, 122, 95);
      doc.setLineWidth(0.5);
      doc.line(totalsX - 2, totalY - 3, pageW - 12, totalY - 3);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(13, 122, 95);
      doc.text("TOTAL:", totalsX, totalY + 4);
      doc.text(fmt(bill.total), pageW - 12, totalY + 4, { align: "right" });

      if (bill.notes) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(107, 104, 96);
        doc.text("Notes:", 12, finalY + 8);
        doc.setTextColor(26, 25, 23);
        doc.text(bill.notes, 12, finalY + 15);
      }

      doc.setFillColor(241, 240, 237);
      doc.rect(0, pageH - 20, pageW, 20, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(156, 152, 144);
      doc.text("Generated by StockFlow — Inventory Management System", pageW / 2, pageH - 10, { align: "center" });

      doc.save(`${bill.billNumber}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!bill) return <div className="p-4 sm:p-6 lg:p-8 text-[var(--text-secondary)]">Bill not found</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Bills
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-mono">{bill.billNumber}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize ${statusStyles[bill.status]}`}>
              {bill.status}
            </span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">
            {new Date(bill.createdAt).toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bill.status === "unpaid" && (
            <button
              onClick={() => updateStatus("paid")}
              disabled={updating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[var(--accent-light)] hover:bg-[var(--accent)]/20 text-[var(--accent)] text-sm font-medium px-3 py-2 rounded-xl transition-colors border border-[var(--accent)]/20"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mark Paid
            </button>
          )}
          {bill.status !== "cancelled" && (
            <button
              onClick={() => updateStatus("cancelled")}
              disabled={updating}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[var(--danger-light)] hover:bg-[var(--danger)]/15 text-[var(--danger)] text-sm font-medium px-3 py-2 rounded-xl transition-colors border border-[var(--danger)]/20"
            >
              Cancel
            </button>
          )}
          <button
            onClick={downloadPDF}
            disabled={pdfLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pdfLoading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Customer */}
        <div className="sm:col-span-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold mb-3">Customer</p>
          <p className="text-[var(--text-primary)] text-lg font-semibold">{bill.customerName}</p>
          {bill.customerPhone && (
            <p className="text-[var(--text-secondary)] text-sm mt-1">📞 {bill.customerPhone}</p>
          )}
          {bill.customerAddress && (
            <p className="text-[var(--text-secondary)] text-sm mt-1">📍 {bill.customerAddress}</p>
          )}
        </div>

        {/* Total */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-center">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold mb-2">Total Amount</p>
          <p className="text-[var(--accent)] text-3xl font-bold">{fmt(bill.total)}</p>
          <div className="mt-3 space-y-1 text-xs text-[var(--text-muted)]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-[var(--text-secondary)]">{fmt(bill.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST ({bill.taxRate}%)</span>
              <span className="text-[var(--text-secondary)]">{fmt(bill.tax)}</span>
            </div>
            {bill.discount > 0 && (
              <div className="flex justify-between text-[var(--danger)]">
                <span>Discount</span>
                <span>-{fmt(bill.discount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items: table on desktop/tablet, stacked cards on mobile */}
      <div className="hidden sm:block bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden overflow-x-auto mb-6">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3.5">Item</th>
              <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3.5">SKU</th>
              <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3.5">Qty</th>
              <th className="text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3.5">Unit Price</th>
              <th className="text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3.5">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, i) => (
              <tr key={i} className="border-b border-[var(--border)]/60 hover:bg-[var(--surface-2)] transition-colors">
                <td className="px-5 py-3.5 text-[var(--text-primary)] text-sm font-medium">{item.name}</td>
                <td className="px-5 py-3.5 text-[var(--text-secondary)] text-sm font-mono">{item.sku}</td>
                <td className="px-5 py-3.5 text-center text-[var(--text-primary)] text-sm">{item.quantity} {item.unit}</td>
                <td className="px-5 py-3.5 text-right text-[var(--text-secondary)] text-sm">{fmt(item.price)}</td>
                <td className="px-5 py-3.5 text-right text-[var(--text-primary)] text-sm font-semibold">{fmt(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden space-y-2.5 mb-6">
        {bill.items.map((item, i) => (
          <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <div className="min-w-0">
                <p className="text-[var(--text-primary)] text-sm font-medium truncate">{item.name}</p>
                <p className="text-[var(--text-secondary)] text-xs font-mono mt-0.5">{item.sku}</p>
              </div>
              <p className="text-[var(--text-primary)] text-sm font-semibold flex-shrink-0">{fmt(item.subtotal)}</p>
            </div>
            <p className="text-[var(--text-muted)] text-xs">
              {item.quantity} {item.unit} × {fmt(item.price)}
            </p>
          </div>
        ))}
      </div>

      {bill.notes && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold mb-2">Notes</p>
          <p className="text-[var(--text-secondary)] text-sm">{bill.notes}</p>
        </div>
      )}
    </div>
  );
}