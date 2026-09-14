"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Item {
  _id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  unit: string;
  category: string;
}

interface CartItem {
  item: Item;
  quantity: number;
  subtotal: number;
}

interface ExtraCharge {
  id: string;
  label: string;
  amount: number;
}

const CHARGE_PRESETS = ["Packing", "Freight / Loading", "Labour", "Delivery", "Installation", "Other"];

function toWords(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n === 0) return "Zero";
  const convert = (num: number): string => {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
    if (num < 1000) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + convert(num % 100) : "");
    if (num < 100000) return convert(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + convert(num % 1000) : "");
    if (num < 10000000) return convert(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + convert(num % 100000) : "");
    return convert(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + convert(num % 10000000) : "");
  };
  const intPart = Math.floor(n);
  return convert(intPart) + " Rupees Only";
}

export default function BillingPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([]);
  const [newChargeLabel, setNewChargeLabel] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("");
  const [showChargeForm, setShowChargeForm] = useState(false);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((d) => { if (d.success) setItems(d.data); });
  }, []);

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (item: Item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item._id === item._id);
      if (existing) {
        if (existing.quantity >= item.stock) return prev;
        return prev.map((c) =>
          c.item._id === item._id
            ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.item.price }
            : c
        );
      }
      return [...prev, { item, quantity: 1, subtotal: item.price }];
    });
  };

  const updateQty = (id: string, qty: number) => {
    const item = items.find((i) => i._id === id);
    if (!item) return;
    if (qty <= 0) { setCart((prev) => prev.filter((c) => c.item._id !== id)); return; }
    if (qty > item.stock) return;
    setCart((prev) =>
      prev.map((c) => c.item._id === id ? { ...c, quantity: qty, subtotal: qty * c.item.price } : c)
    );
  };

  const addExtraCharge = () => {
    const label = newChargeLabel.trim();
    const amount = parseFloat(newChargeAmount);
    if (!label || isNaN(amount)) return;
    setExtraCharges((prev) => [...prev, { id: Date.now().toString(), label, amount }]);
    setNewChargeLabel("");
    setNewChargeAmount("");
    setShowChargeForm(false);
  };

  const removeCharge = (id: string) =>
    setExtraCharges((prev) => prev.filter((c) => c.id !== id));

  const subtotal = cart.reduce((acc, c) => acc + c.subtotal, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const extraTotal = extraCharges.reduce((acc, c) => acc + c.amount, 0);
  const total = subtotal + taxAmount + extraTotal - discount;

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const fmtNum = (n: number) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const downloadPDF = async (bill: {
    billNumber: string;
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    items: CartItem[];
    subtotal: number;
    tax: number;
    taxRate: number;
    discount: number;
    extraCharges: ExtraCharge[];
    total: number;
    notes?: string;
    createdAt: string;
  }) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    // Receipt-style: narrow width like a real invoice slip
    const doc = new jsPDF({ format: "a5", unit: "mm", orientation: "portrait" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 12;
    let y = 10;

    // ── Header ──────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text("Rough Estimate", pageW / 2, y, { align: "center" });
    y += 7;

    // Top divider
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    // Invoice meta
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);

    const dateStr = new Date(bill.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric"
    });
    doc.setFont("helvetica", "bold");
    doc.text(`INVOICE NO.: ${bill.billNumber}`, margin, y);
    doc.text(`DATED: ${dateStr}`, pageW - margin, y, { align: "right" });
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.text("MS.:", margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(bill.customerName, margin + 8, y);
    y += 4.5;

    if (bill.customerPhone) {
      doc.setFont("helvetica", "normal");
      doc.text(bill.customerPhone, margin + 8, y);
      y += 4.5;
    }
    if (bill.customerAddress) {
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(bill.customerAddress, pageW - margin * 2 - 8);
      doc.text(lines, margin + 8, y);
      y += lines.length * 4.5;
    }
    y += 2;

    // ── Items Table ──────────────────────────────────────────
    const tableData = bill.items.map((c, idx) => [
      (idx + 1).toString(),
      c.item.name + "\n" + c.item.sku,
      `${c.quantity.toFixed(3)} ${c.item.unit}`,
      fmtNum(c.item.price),
      fmtNum(c.subtotal),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["SNO", "ITEM NAME", "QTY", "RATE", "AMOUNT"]],
      body: tableData,
      theme: "plain",
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [40, 40, 40],
        fontSize: 7.5,
        fontStyle: "bold",
        halign: "left",
        lineColor: [180, 180, 180],
        lineWidth: { bottom: 0.3 },
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [40, 40, 40],
        fontSize: 7.5,
        lineColor: [220, 220, 220],
        lineWidth: { bottom: 0.1 },
      },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 22, halign: "right" },
        3: { cellWidth: 18, halign: "right" },
        4: { cellWidth: 22, halign: "right" },
      },
      margin: { left: margin, right: margin },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 2;

    // Items subtotal line
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    // Items subtotal right-aligned
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(40, 40, 40);
    doc.text(fmtNum(bill.subtotal), pageW - margin, y, { align: "right" });
    y += 6;

    // ── Extra charges & tax section ──────────────────────────
    const chargeRows: [string, string][] = [];

    // GST if any
    if (bill.taxRate > 0) {
      chargeRows.push([`GST (${bill.taxRate}%)`, fmtNum(bill.tax)]);
    }

    // Extra charges
    bill.extraCharges.forEach((ec) => {
      chargeRows.push([ec.label, fmtNum(ec.amount)]);
    });

    // Discount
    if (bill.discount > 0) {
      chargeRows.push(["LESS", `-${fmtNum(bill.discount)}`]);
    }

    // Render charges in two-column layout (left: label, right: amount)
    const labelX = margin;
    const amtX = pageW - margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    chargeRows.forEach(([label, amt]) => {
      doc.setTextColor(80, 80, 80);
      doc.text(label, labelX + (pageW - margin * 2) * 0.45, y, { align: "right" });
      doc.setTextColor(40, 40, 40);
      doc.text(amt, amtX, y, { align: "right" });
      y += 5;
    });

    // Zero-value preset charges (Packing, Freight etc.) shown like in the image
    const shownLabels = new Set(bill.extraCharges.map((ec) => ec.label));
    ["Packing", "Freight / Loading", "Labour"].forEach((preset) => {
      if (!shownLabels.has(preset)) {
        doc.setTextColor(80, 80, 80);
        doc.text(preset, labelX + (pageW - margin * 2) * 0.45, y, { align: "right" });
        doc.setTextColor(40, 40, 40);
        doc.text("0.00", amtX, y, { align: "right" });
        y += 5;
      }
    });

    // ── Grand Total ──────────────────────────────────────────
    y += 1;
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text("GRAND TOTAL", labelX + (pageW - margin * 2) * 0.45, y, { align: "right" });
    doc.text(fmtNum(bill.total), amtX, y, { align: "right" });
    y += 4;

    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    // Amount in words
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    doc.text("Amount in Words", margin, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);
    const wordsLines = doc.splitTextToSize(toWords(Math.round(bill.total)), pageW - margin * 2);
    doc.text(wordsLines, margin, y);
    y += wordsLines.length * 4 + 3;

    // Notes
    if (bill.notes) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      const noteLines = doc.splitTextToSize(`Note: ${bill.notes}`, pageW - margin * 2);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 4;
    }

    // Footer line
    y += 3;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text("Generated by StockFlow — Inventory Management System", pageW / 2, y, { align: "center" });

    doc.save(`${bill.billNumber}.pdf`);
  };

  const handleSubmit = async () => {
    if (!customer.name.trim()) { setError("Customer name is required"); return; }
    if (cart.length === 0) { setError("Add at least one item to the bill"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: customer.address,
          items: cart.map((c) => ({
            itemId: c.item._id,
            name: c.item.name,
            sku: c.item.sku,
            price: c.item.price,
            quantity: c.quantity,
            unit: c.item.unit,
            subtotal: c.subtotal,
          })),
          subtotal,
          tax: taxAmount,
          taxRate,
          discount,
          extraCharges,
          total,
          notes,
        }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);

      // Also trigger PDF download
      await downloadPDF({
        billNumber: d.data.billNumber,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        items: cart,
        subtotal,
        tax: taxAmount,
        taxRate,
        discount,
        extraCharges,
        total,
        notes,
        createdAt: d.data.createdAt,
      });

      router.push(`/bills/${d.data._id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error creating bill");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8" style={{ background: "var(--background)", minHeight: "100vh" }}>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Create Bill</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Select items and generate an invoice</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Customer info */}
          <div className="rounded-2xl p-5 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Customer Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Name *", key: "name", placeholder: "Customer name", span: false },
                { label: "Phone", key: "phone", placeholder: "+91 00000 00000", span: false },
              ].map(({ label, key, placeholder, span }) => (
                <div key={key} className={span ? "sm:col-span-2" : ""}>
                  <label className="text-xs mb-1.5 block font-medium" style={{ color: "var(--text-muted)" }}>{label}</label>
                  <input
                    value={customer[key as keyof typeof customer]}
                    onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none transition-colors"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-xs mb-1.5 block font-medium" style={{ color: "var(--text-muted)" }}>Address</label>
                <input
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  placeholder="Customer address"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none transition-colors"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
            </div>
          </div>

          {/* Item search */}
          <div className="rounded-2xl p-5 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Add Items</h2>
            <div className="relative mb-3">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or SKU..."
                className="w-full text-sm rounded-xl pl-9 pr-3 py-2.5 outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>No items found</p>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item._id}
                    onClick={() => addToCart(item)}
                    disabled={item.stock === 0}
                    className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                      <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{item.sku} · {item.stock} {item.unit} left</p>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>{fmt(item.price)}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Extra charges */}
          <div className="rounded-2xl p-5 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Extra Charges</h2>
              <button
                onClick={() => setShowChargeForm((v) => !v)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                style={{ background: "var(--accent-light)", color: "var(--accent)" }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Charge
              </button>
            </div>

            {showChargeForm && (
              <div className="mb-3 p-3 rounded-xl border" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                {/* Preset quick-picks */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {CHARGE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setNewChargeLabel(preset)}
                      className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                      style={{
                        background: newChargeLabel === preset ? "var(--accent)" : "var(--surface)",
                        color: newChargeLabel === preset ? "white" : "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={newChargeLabel}
                    onChange={(e) => setNewChargeLabel(e.target.value)}
                    placeholder="Label (e.g. Packing)"
                    className="flex-1 text-sm rounded-lg px-3 py-2 outline-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newChargeAmount}
                      onChange={(e) => setNewChargeAmount(e.target.value)}
                      placeholder="₹ Amount"
                      className="flex-1 sm:w-28 sm:flex-none text-sm rounded-lg px-3 py-2 outline-none text-right"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      min="0"
                    />
                    <button
                      onClick={addExtraCharge}
                      className="px-3 py-2 rounded-lg text-sm font-semibold text-white transition-colors flex-shrink-0"
                      style={{ background: "var(--accent)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {extraCharges.length === 0 ? (
              <p className="text-sm text-center py-3" style={{ color: "var(--text-muted)" }}>
                No extra charges added
              </p>
            ) : (
              <div className="space-y-2">
                {extraCharges.map((ec) => (
                  <div key={ec.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{ec.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{fmt(ec.amount)}</span>
                      <button
                        onClick={() => removeCharge(ec.id)}
                        className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                        style={{ color: "var(--danger)" }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — Bill Summary */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl p-5 lg:sticky lg:top-8 border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Bill Summary</h2>

            {cart.length === 0 ? (
              <div className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                <svg className="w-8 h-8 mx-auto mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm">Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-2.5 mb-4 max-h-48 overflow-y-auto pr-1">
                {cart.map((c) => (
                  <div key={c.item._id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{c.item.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{fmt(c.item.price)} / {c.item.unit}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(c.item._id, c.quantity - 1)}
                        className="w-6 h-6 rounded-lg text-xs flex items-center justify-center transition-colors font-bold"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      >−</button>
                      <span className="text-xs w-6 text-center font-medium" style={{ color: "var(--text-primary)" }}>{c.quantity}</span>
                      <button
                        onClick={() => updateQty(c.item._id, c.quantity + 1)}
                        className="w-6 h-6 rounded-lg text-xs flex items-center justify-center transition-colors font-bold"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                      >+</button>
                    </div>
                    <span className="text-xs font-semibold w-16 text-right" style={{ color: "var(--text-primary)" }}>{fmt(c.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                <span style={{ color: "var(--text-primary)" }}>{fmt(subtotal)}</span>
              </div>

              {/* GST */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--text-secondary)" }}>GST</span>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="text-xs rounded-lg px-1.5 py-0.5 outline-none"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  >
                    {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <span style={{ color: "var(--text-primary)" }}>{fmt(taxAmount)}</span>
              </div>

              {/* Extra charges summary */}
              {extraCharges.map((ec) => (
                <div key={ec.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>{ec.label}</span>
                  <span style={{ color: "var(--text-primary)" }}>{fmt(ec.amount)}</span>
                </div>
              ))}

              {/* Discount */}
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-secondary)" }}>Discount (₹)</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-20 text-xs rounded-lg px-2 py-1 text-right outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  min="0"
                />
              </div>

              {/* Total */}
              <div className="pt-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)" }}>
                <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Grand Total</span>
                <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>{fmt(total)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="text-xs mb-1.5 block font-medium" style={{ color: "var(--text-muted)" }}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes..."
                className="w-full text-sm rounded-xl px-3 py-2 outline-none resize-none transition-colors"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {error && (
              <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ color: "var(--danger)", background: "var(--danger-light)" }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving || cart.length === 0}
              className="w-full mt-4 text-white text-sm font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--accent)" }}
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = "var(--accent-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
            >
              {saving ? (
                <span>Generating...</span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generate Bill
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}