"use client";
import { useEffect, useState } from "react";

interface Item {
  _id: string; name: string; sku: string; category: string;
  price: number; stock: number; unit: string; description?: string;
}

const CATEGORIES = ["Electronics", "Clothing", "Food & Beverage", "Hardware", "Stationery", "Other"];
const UNITS = ["pcs", "kg", "g", "l", "ml", "m", "box", "dozen", "pack"];
const emptyForm = { name: "", sku: "", category: "Other", price: "", stock: "", unit: "pcs", description: "" };

function Input({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm transition-all outline-none focus:ring-2";
const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" };

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState<Item | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [stockQty, setStockQty] = useState("");
  const [stockOp, setStockOp] = useState<"add" | "remove">("add");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    const res = await fetch(`/api/items${search ? `?search=${encodeURIComponent(search)}` : ""}`);
    const d = await res.json();
    if (d.success) setItems(d.data);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [search]); // eslint-disable-line

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setError(""); setShowModal(true); };
  const openEdit = (item: Item) => {
    setEditItem(item);
    setForm({ name: item.name, sku: item.sku, category: item.category, price: String(item.price), stock: String(item.stock), unit: item.unit, description: item.description || "" });
    setError(""); setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const url = editItem ? `/api/items/${editItem._id}` : "/api/items";
      const res = await fetch(url, { method: editItem ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, price: Number(form.price), stock: Number(form.stock) }) });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setShowModal(false); fetchItems();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/items/${id}`, { method: "DELETE" }); fetchItems();
  };

  const handleStock = async () => {
    if (!showStockModal || !stockQty) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/stock/${showStockModal._id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: Number(stockQty), operation: stockOp }) });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setShowStockModal(null); setStockQty(""); fetchItems();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setSaving(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const stockColor = (s: number) => s <= 5 ? "#dc2626" : s <= 20 ? "#d97706" : "#0d7a5f";

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Inventory</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{items.length} items</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors text-white"
          style={{ background: "var(--accent)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Add Item
        </button>
      </div>

      <div className="relative mb-5">
        <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU…"
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none"
          style={{ background: "#fff", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
              {["Item", "SKU", "Category", "Price", "Stock", "Actions"].map((h, i) => (
                <th key={h} className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider ${i >= 3 ? "text-right" : "text-left"}`}
                  style={{ color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-5 py-4"><div className="h-4 rounded animate-pulse" style={{ background: "var(--surface-2)" }} /></td>
                ))}
              </tr>
            )) : items.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16 text-sm" style={{ color: "var(--text-muted)" }}>No items found</td></tr>
            ) : items.map((item) => (
              <tr key={item._id} className="transition-colors" style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                  {item.description && <p className="text-xs truncate max-w-[180px] mt-0.5" style={{ color: "var(--text-muted)" }}>{item.description}</p>}
                </td>
                <td className="px-5 py-3.5 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{item.sku}</td>
                <td className="px-5 py-3.5">
                  <span className="text-xs px-2.5 py-1 rounded-lg font-medium" style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>{item.category}</span>
                </td>
                <td className="px-5 py-3.5 text-right text-sm font-medium" style={{ color: "var(--text-primary)" }}>{fmt(item.price)}</td>
                <td className="px-5 py-3.5 text-right">
                  <span className="text-sm font-semibold" style={{ color: stockColor(item.stock) }}>
                    {item.stock} <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>{item.unit}</span>
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setShowStockModal(item); setStockOp("add"); setStockQty(""); setError(""); }}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                      style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid #0d7a5f30" }}>+ Stock</button>
                    <button onClick={() => openEdit(item)} className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                      style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>Edit</button>
                    <button onClick={() => handleDelete(item._id)} className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                      style={{ background: "var(--danger-light)", color: "var(--danger)", border: "1px solid #dc262620" }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 shadow-2xl" style={{ background: "#fff", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold mb-5" style={{ color: "var(--text-primary)" }}>{editItem ? "Edit Item" : "Add New Item"}</h2>
            {error && <div className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "var(--danger-light)", color: "var(--danger)", border: "1px solid #dc262620" }}>{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Item Name *">
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} style={inputStyle} placeholder="e.g. Wireless Mouse" />
                </Input>
              </div>
              <Input label="SKU *">
                <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className={`${inputCls} font-mono`} style={inputStyle} placeholder="WM-001" />
              </Input>
              <Input label="Category *">
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Input>
              <Input label="Price (₹) *">
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputCls} style={inputStyle} placeholder="0.00" min="0" />
              </Input>
              <Input label="Initial Stock">
                <div className="flex gap-2">
                  <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className={inputCls} style={inputStyle} placeholder="0" min="0" />
                  <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="rounded-xl px-3 py-2.5 text-sm outline-none" style={{ ...inputStyle, minWidth: "70px" }}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </Input>
              <div className="col-span-2">
                <Input label="Description">
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Optional description…" />
                </Input>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: "var(--accent)" }}>{saving ? "Saving…" : editItem ? "Update Item" : "Add Item"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: "#fff", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Update Stock</h2>
            <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
              {showStockModal.name} — Current: <strong style={{ color: "var(--text-primary)" }}>{showStockModal.stock} {showStockModal.unit}</strong>
            </p>
            {error && <div className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "var(--danger-light)", color: "var(--danger)" }}>{error}</div>}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setStockOp("add")} className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                style={stockOp === "add" ? { background: "var(--accent)", color: "#fff" } : { background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>+ Add</button>
              <button onClick={() => setStockOp("remove")} className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors"
                style={stockOp === "remove" ? { background: "var(--danger)", color: "#fff" } : { background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>− Remove</button>
            </div>
            <input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder={`Quantity in ${showStockModal.unit}`} min="1"
              className={`${inputCls} mb-4`} style={inputStyle} />
            <div className="flex gap-3">
              <button onClick={() => { setShowStockModal(null); setError(""); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>Cancel</button>
              <button onClick={handleStock} disabled={saving || !stockQty} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "var(--accent)" }}>{saving ? "Updating…" : "Update"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}