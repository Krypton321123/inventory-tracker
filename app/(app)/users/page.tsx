"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Permissions {
  canManageStock: boolean;
  canManageItems: boolean;
  canManageBills: boolean;
}

interface User {
  _id: string;
  name: string;
  username: string;
  role: "superuser" | "staff";
  permissions: Permissions;
  active: boolean;
  createdAt: string;
}
const PERMISSION_META: {
  key: keyof Permissions;
  label: string;
  desc: string;
}[] = [
  {
    key: "canManageStock",
    label: "Manage Stock",
    desc: "Add or deduct stock quantities on existing items",
  },
  {
    key: "canManageItems",
    label: "Manage Items",
    desc: "Create, edit, and delete inventory items",
  },
  {
    key: "canManageBills",
    label: "Manage Bills",
    desc: "Create bills and change their paid/cancelled status",
  },
];

const emptyForm = {
  name: "",
  username: "",
  password: "",
  permissions: {
    canManageStock: false,
    canManageItems: false,
    canManageBills: false,
  } as Permissions,
};

const inputCls =
  "w-full rounded-xl px-3 py-2.5 text-sm transition-all outline-none";
const inputStyle = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
};

export default function UsersPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Gate the whole page behind role === "superuser". The API routes enforce this
  // independently, but checking here too means staff who somehow land on /users
  // (e.g. a stale bookmark) get bounced immediately instead of seeing a broken page.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          router.push("/login");
          return;
        }
        if (d.data.role !== "superuser") {
          router.push("/dashboard");
          return;
        }
        setMe(d.data);
      })
      .finally(() => setCheckingAuth(false));
  }, [router]);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const d = await res.json();
    if (d.success) setUsers(d.data);
    setLoading(false);
  };

  useEffect(() => {
    if (me) fetchUsers();
  }, [me]);

  const openAdd = () => {
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setShowModal(false);
      fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = async (user: User, key: keyof Permissions) => {
    const updated = { ...user.permissions, [key]: !user.permissions[key] };
    // Optimistic update so the toggle feels instant; rolled back if the request fails.
    setUsers((prev) =>
      prev.map((u) =>
        u._id === user._id ? { ...u, permissions: updated } : u,
      ),
    );
    const res = await fetch(`/api/users/${user._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: updated }),
    });
    const d = await res.json();
    if (!d.success) {
      setUsers((prev) => prev.map((u) => (u._id === user._id ? user : u)));
    }
  };

  const toggleActive = async (user: User) => {
    const nextActive = !user.active;
    setUsers((prev) =>
      prev.map((u) => (u._id === user._id ? { ...u, active: nextActive } : u)),
    );
    const res = await fetch(`/api/users/${user._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: nextActive }),
    });
    const d = await res.json();
    if (!d.success) {
      setUsers((prev) => prev.map((u) => (u._id === user._id ? user : u)));
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Remove ${user.name}? They will lose access immediately.`))
      return;
    await fetch(`/api/users/${user._id}`, { method: "DELETE" });
    fetchUsers();
  };

  if (checkingAuth) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-64">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{
            borderColor: "var(--accent)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }
  if (!me) return null; // redirect already in flight

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1
            className="text-xl sm:text-2xl font-semibold"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
          >
            Users & Permissions
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {users.length} account{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors text-white w-full sm:w-auto"
          style={{ background: "var(--accent)" }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add User
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl animate-pulse"
              style={{ background: "var(--surface-2)" }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user._id}
              className="rounded-2xl p-4 sm:p-5"
              style={{
                background: "#fff",
                border: "1px solid var(--border)",
                opacity: user.active ? 1 : 0.6,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {user.name}
                    </p>
                    {user.role === "superuser" && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{
                          background: "var(--accent-light)",
                          color: "var(--accent)",
                        }}
                      >
                        Superuser
                      </span>
                    )}
                    {!user.active && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{
                          background: "var(--danger-light)",
                          color: "var(--danger)",
                        }}
                      >
                        Deactivated
                      </span>
                    )}
                  </div>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {user.username}
                  </p>
                </div>

                {user.role !== "superuser" && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(user)}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                      style={{
                        background: "var(--surface-2)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {user.active ? "Deactivate" : "Reactivate"}
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                      style={{
                        background: "var(--danger-light)",
                        color: "var(--danger)",
                        border: "1px solid #dc262620",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {user.role === "superuser" ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Has full access to every permission by default.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PERMISSION_META.map((perm) => {
                    const on = user.permissions[perm.key];
                    return (
                      <button
                        key={perm.key}
                        onClick={() => togglePermission(user, perm.key)}
                        disabled={!user.active}
                        className="text-left px-3 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={
                          on
                            ? {
                                background: "var(--accent-light)",
                                border: "1px solid #0d7a5f30",
                              }
                            : {
                                background: "var(--surface-2)",
                                border: "1px solid var(--border)",
                              }
                        }
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="text-xs font-semibold"
                            style={{
                              color: on
                                ? "var(--accent)"
                                : "var(--text-secondary)",
                            }}
                          >
                            {perm.label}
                          </span>
                          <div
                            className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              background: on
                                ? "var(--accent)"
                                : "var(--border)",
                            }}
                          >
                            {on && (
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span
                          className="text-[11px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {perm.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto flex items-start sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full sm:max-w-md min-h-screen sm:min-h-0 rounded-none sm:rounded-2xl p-5 sm:p-6 shadow-2xl"
            style={{ background: "#fff", border: "1px solid var(--border)" }}
          >
            <h2
              className="text-lg font-semibold mb-5"
              style={{ color: "var(--text-primary)" }}
            >
              Add New User
            </h2>
            {error && (
              <div
                className="text-sm mb-4 px-3 py-2 rounded-lg"
                style={{
                  background: "var(--danger-light)",
                  color: "var(--danger)",
                  border: "1px solid #dc262620",
                }}
              >
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Full Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="e.g. Priya Sharma"
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Username
                </label>
                <input
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  className={inputCls}
                  style={inputStyle}
                  placeholder="e.g. priya"
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Temporary Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className={inputCls}
                  style={inputStyle}
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Permissions
                </label>
                <div className="space-y-2">
                  {PERMISSION_META.map((perm) => {
                    const on = form.permissions[perm.key];
                    return (
                      <button
                        key={perm.key}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              [perm.key]: !on,
                            },
                          })
                        }
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-left"
                        style={
                          on
                            ? {
                                background: "var(--accent-light)",
                                border: "1px solid #0d7a5f30",
                              }
                            : {
                                background: "var(--surface-2)",
                                border: "1px solid var(--border)",
                              }
                        }
                      >
                        <div>
                          <p
                            className="text-xs font-semibold"
                            style={{
                              color: on
                                ? "var(--accent)"
                                : "var(--text-secondary)",
                            }}
                          >
                            {perm.label}
                          </p>
                          <p
                            className="text-[11px]"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {perm.desc}
                          </p>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: on ? "var(--accent)" : "var(--border)",
                          }}
                        >
                          {on && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
                style={{ background: "var(--accent)" }}
              >
                {saving ? "Creating…" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
