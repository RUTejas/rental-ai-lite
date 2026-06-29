"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Role = "MASTER_ADMIN" | "ADMIN" | "TENANT";
type SessionUser = { id: string; name: string; email: string; role: Role };
type Person = { id: string; name: string; email: string };
type TenantStatus = "NOT_MARKED" | "TENANT_MARKED_PAID" | "TENANT_MARKED_NOT_PAID";
type AdminStatus =
  | "PENDING"
  | "VERIFIED_PAID"
  | "UNPAID"
  | "OVERDUE"
  | "WAIVED"
  | "REJECTED_CLAIM";

type Bill = {
  id: string;
  adminId: string;
  tenantId: string;
  billType: "ELECTRICITY" | "WATER";
  billingMonth: number;
  billingYear: number;
  amount: number;
  dueDate: string;
  tenantPaymentStatus: TenantStatus;
  tenantMarkedAt: string | null;
  tenantNote: string | null;
  adminVerificationStatus: AdminStatus;
  adminVerifiedAt: string | null;
  adminNote: string | null;
  remarks: string | null;
  admin: Person;
  tenant: Person;
};

const tenantLabels: Record<TenantStatus, string> = {
  NOT_MARKED: "Not Marked",
  TENANT_MARKED_PAID: "Tenant Marked Paid",
  TENANT_MARKED_NOT_PAID: "Tenant Marked Not Paid"
};

const adminLabels: Record<AdminStatus, string> = {
  PENDING: "Pending",
  VERIFIED_PAID: "Verified Paid",
  UNPAID: "Unpaid",
  OVERDUE: "Overdue",
  WAIVED: "Waived",
  REJECTED_CLAIM: "Rejected Claim"
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const demoAccounts = [
  ["Master Admin", "master@rentwise.ai", "Master@12345"],
  ["Owner", "aarav.owner@rentwise.ai", "Owner@12345"],
  ["Tenant", "priya.tenant@rentwise.ai", "Tenant@12345"]
] as const;

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

function date(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

async function jsonRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function Badge({ kind, children }: { kind: string; children: React.ReactNode }) {
  return <span className={`badge badge-${kind.toLowerCase()}`}>{children}</span>;
}

function Metric({ label, value, note }: { label: string; value: number | string; note: string }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

export function RentWiseApp() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<Bill[]>([]);
  const [tenants, setTenants] = useState<Person[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadBills = useCallback(async () => {
    const data = await jsonRequest<{ bills: Bill[] }>("/api/bills");
    setBills(data.bills);
  }, []);

  useEffect(() => {
    jsonRequest<{ user: SessionUser | null }>("/api/auth/session")
      .then(async ({ user: current }) => {
        setUser(current);
        if (current) {
          const tasks: Promise<unknown>[] = [loadBills()];
          if (current.role === "ADMIN") {
            tasks.push(
              jsonRequest<{ tenants: Person[] }>("/api/tenants").then((data) => setTenants(data.tenants))
            );
          }
          await Promise.all(tasks);
        }
      })
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [loadBills]);

  async function login(email: string, password: string) {
    setError("");
    setLoading(true);
    try {
      const data = await jsonRequest<{ user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setUser(data.user);
      await loadBills();
      if (data.user.role === "ADMIN") {
        const tenantData = await jsonRequest<{ tenants: Person[] }>("/api/tenants");
        setTenants(tenantData.tenants);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await jsonRequest("/api/auth/logout", { method: "POST" });
    setUser(null);
    setBills([]);
    setTenants([]);
  }

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  if (loading && !user) return <div className="loading-screen">Preparing your rental ledger…</div>;
  if (!user) return <LoginScreen onLogin={login} error={error} loading={loading} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">RW</div>
        <div>
          <p className="eyebrow">Rental clarity</p>
          <h1>RentWise Lite</h1>
        </div>
        <nav>
          <a href="#overview">Overview</a>
          <a href="#bills">
            {user.role === "TENANT"
              ? "My Bills"
              : user.role === "MASTER_ADMIN"
                ? "All Utility Bills"
                : "Utility Bills"}
          </a>
          {user.role === "ADMIN" && <a href="#new-bill">Add Bill</a>}
        </nav>
        <div className="sidebar-user">
          <span>{user.role.replace("_", " ")}</span>
          <strong>{user.name}</strong>
          <small>{user.email}</small>
          <button className="text-button" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">Welcome back, {user.name.split(" ")[0]}</p>
            <h2>{headingFor(user.role)}</h2>
            <p>{subtitleFor(user.role)}</p>
          </div>
          <div className="header-seal">Created and Developed by Tejas R U</div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {notice && <div className="alert alert-success">{notice}</div>}

        <section id="overview">
          <RoleMetrics role={user.role} bills={bills} />
        </section>

        {user.role === "ADMIN" && (
          <CreateBill
            tenants={tenants}
            onCreated={(bill) => {
              setBills((current) => [bill, ...current]);
              flash("Utility bill added and ready for the tenant to review.");
            }}
            onError={setError}
          />
        )}

        <section id="bills" className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Two-stage record</p>
              <h3>{user.role === "TENANT" ? "My Bills" : user.role === "ADMIN" ? "Tenant Utility Bills" : "All Utility Bills"}</h3>
            </div>
            <p>Tenant payment status is self-reported. Admin verification is the final record status.</p>
          </div>

          {bills.length === 0 ? (
            <div className="empty-state">No utility bills have been added yet.</div>
          ) : user.role === "TENANT" ? (
            <TenantBills
              bills={bills}
              onUpdated={(updated) => {
                setBills((current) => current.map((bill) => bill.id === updated.id ? updated : bill));
                flash("Your status was saved for your owner to review.");
              }}
              onError={setError}
            />
          ) : (
            <BillTable
              role={user.role}
              bills={bills}
              onUpdated={(updated) => {
                setBills((current) => current.map((bill) => bill.id === updated.id ? updated : bill));
                flash("Admin verification status updated.");
              }}
              onError={setError}
            />
          )}
        </section>

        <footer>RentWise Lite · Created and Developed by Tejas R U · Manual tracking only—no online payments.</footer>
      </main>
    </div>
  );
}

function LoginScreen({
  onLogin,
  error,
  loading
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  error: string;
  loading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    void onLogin(email, password);
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand-mark large">RW</div>
        <p className="eyebrow">RentWise Lite</p>
        <h1>A calmer way to keep rental bills clear.</h1>
        <p>Tenants report. Owners verify. Master Admin sees the full picture—without turning your home into a payment platform.</p>
        <div className="promise-row"><span>01</span> Self-reported tenant status</div>
        <div className="promise-row"><span>02</span> Final owner verification</div>
        <div className="promise-row"><span>03</span> Strict account-level visibility</div>
      </section>
      <section className="login-card">
        <p className="eyebrow">Secure portal</p>
        <h2>Sign in</h2>
        <p>Use an approved RentWise account.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <button className="primary-button" disabled={loading}>{loading ? "Signing in…" : "Enter RentWise"}</button>
        </form>
        <div className="demo-logins">
          <span>Seeded demo accounts</span>
          {demoAccounts.map(([label, demoEmail, demoPassword]) => (
            <button key={label} onClick={() => { setEmail(demoEmail); setPassword(demoPassword); }}>{label}</button>
          ))}
        </div>
        <small>Created and Developed by Tejas R U</small>
      </section>
    </main>
  );
}

function RoleMetrics({ role, bills }: { role: Role; bills: Bill[] }) {
  const metrics = useMemo(() => {
    const count = (predicate: (bill: Bill) => boolean) => bills.filter(predicate).length;
    if (role === "TENANT") {
      const upcoming = [...bills]
        .filter((bill) => bill.adminVerificationStatus !== "VERIFIED_PAID")
        .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];
      return [
        ["Pending bills", count((bill) => bill.adminVerificationStatus === "PENDING"), "Awaiting final review"],
        ["I marked paid", count((bill) => bill.tenantPaymentStatus === "TENANT_MARKED_PAID"), "Self-reported"],
        ["Verified paid", count((bill) => bill.adminVerificationStatus === "VERIFIED_PAID"), "Confirmed by owner"],
        ["Rejected", count((bill) => bill.adminVerificationStatus === "REJECTED_CLAIM"), "Needs follow-up"],
        ["Next due", upcoming ? date(upcoming.dueDate) : "Clear", "Nearest open bill"]
      ];
    }
    if (role === "ADMIN") {
      return [
        ["Claims to review", count((bill) => bill.tenantPaymentStatus === "TENANT_MARKED_PAID" && bill.adminVerificationStatus === "PENDING"), "Tenant marked paid"],
        ["Verified paid", count((bill) => bill.adminVerificationStatus === "VERIFIED_PAID"), "Final record"],
        ["Unpaid", count((bill) => bill.adminVerificationStatus === "UNPAID"), "Owner confirmed"],
        ["Overdue", count((bill) => bill.adminVerificationStatus === "OVERDUE"), "Past due"],
        ["Rejected", count((bill) => bill.adminVerificationStatus === "REJECTED_CLAIM"), "Claims declined"]
      ];
    }
    return [
      ["Total bills", bills.length, "Across all owners"],
      ["Tenant marked paid", count((bill) => bill.tenantPaymentStatus === "TENANT_MARKED_PAID"), "Self-reported"],
      ["Marked not paid", count((bill) => bill.tenantPaymentStatus === "TENANT_MARKED_NOT_PAID"), "Self-reported"],
      ["Verified paid", count((bill) => bill.adminVerificationStatus === "VERIFIED_PAID"), "Owner confirmed"],
      ["Unpaid / overdue", count((bill) => ["UNPAID", "OVERDUE"].includes(bill.adminVerificationStatus)), "Needs attention"],
      ["Rejected claims", count((bill) => bill.adminVerificationStatus === "REJECTED_CLAIM"), "Owner declined"]
    ];
  }, [bills, role]);

  return <div className="metrics-grid">{metrics.map(([label, value, note]) => <Metric key={label} label={String(label)} value={value} note={String(note)} />)}</div>;
}

function CreateBill({ tenants, onCreated, onError }: { tenants: Person[]; onCreated: (bill: Bill) => void; onError: (message: string) => void }) {
  const today = new Date();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    onError("");
    try {
      const data = await jsonRequest<{ bill: Bill }>("/api/bills", {
        method: "POST",
        body: JSON.stringify({
          tenantId: form.get("tenantId"),
          billType: form.get("billType"),
          billingMonth: Number(form.get("billingMonth")),
          billingYear: Number(form.get("billingYear")),
          amount: Number(form.get("amount")),
          dueDate: new Date(`${form.get("dueDate")}T00:00:00.000Z`).toISOString(),
          remarks: form.get("remarks")
        })
      });
      onCreated(data.bill);
      event.currentTarget.reset();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Unable to add the bill.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="new-bill" className="panel">
      <div className="section-heading"><div><p className="eyebrow">Owner action</p><h3>Add a utility bill</h3></div><p>The selected tenant will see it immediately.</p></div>
      {tenants.length === 0 ? <div className="empty-state">Add an approved tenant to your account before creating bills.</div> : (
        <form className="bill-form" onSubmit={submit}>
          <label>Tenant<select name="tenantId" required>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <label>Bill type<select name="billType"><option value="ELECTRICITY">Electricity</option><option value="WATER">Water</option></select></label>
          <label>Month<select name="billingMonth" defaultValue={today.getMonth() + 1}>{monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
          <label>Year<input name="billingYear" type="number" min="2020" max="2100" defaultValue={today.getFullYear()} required /></label>
          <label>Amount (INR)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
          <label>Due date<input name="dueDate" type="date" required /></label>
          <label className="wide">Remarks<input name="remarks" maxLength={1000} placeholder="Meter reading or billing context (optional)" /></label>
          <button className="primary-button" disabled={saving}>{saving ? "Adding…" : "Add bill"}</button>
        </form>
      )}
    </section>
  );
}

function TenantBills({ bills, onUpdated, onError }: { bills: Bill[]; onUpdated: (bill: Bill) => void; onError: (message: string) => void }) {
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(bills.map((bill) => [bill.id, bill.tenantNote || ""])));
  const [saving, setSaving] = useState("");

  async function update(bill: Bill, status: Exclude<TenantStatus, "NOT_MARKED">) {
    setSaving(bill.id);
    onError("");
    try {
      const data = await jsonRequest<{ bill: Bill }>(`/api/bills/${bill.id}`, {
        method: "PATCH",
        body: JSON.stringify({ tenantPaymentStatus: status, tenantNote: notes[bill.id] || "" })
      });
      onUpdated(data.bill);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Unable to save your status.");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="tenant-bills">
      <div className="manual-note">This app does not process online payments. Your selection is a manual status update for your owner/admin to review.</div>
      {bills.map((bill) => (
        <article className="bill-card" key={bill.id}>
          <div className="bill-card-top"><div><span>{bill.billType === "ELECTRICITY" ? "Electricity" : "Water"}</span><h4>{monthNames[bill.billingMonth - 1]} {bill.billingYear}</h4></div><strong>{money(bill.amount)}</strong></div>
          <div className="bill-facts"><p><span>Due date</span>{date(bill.dueDate)}</p><p><span>Owner remarks</span>{bill.remarks || "—"}</p><p><span>Owner note</span>{bill.adminNote || "—"}</p></div>
          <div className="status-pair"><div><span>Tenant self-status</span><Badge kind={bill.tenantPaymentStatus}>{tenantLabels[bill.tenantPaymentStatus]}</Badge><small>Marked {date(bill.tenantMarkedAt)}</small></div><div><span>Admin verified-status</span><Badge kind={bill.adminVerificationStatus}>{adminLabels[bill.adminVerificationStatus]}</Badge><small>Verified {date(bill.adminVerifiedAt)}</small></div></div>
          <label>Your note<textarea value={notes[bill.id] ?? bill.tenantNote ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [bill.id]: event.target.value }))} maxLength={1000} placeholder="Add a note for your owner" /></label>
          <div className="button-row"><button className="primary-button" disabled={saving === bill.id} onClick={() => update(bill, "TENANT_MARKED_PAID")}>Mark as Paid</button><button className="secondary-button danger" disabled={saving === bill.id} onClick={() => update(bill, "TENANT_MARKED_NOT_PAID")}>Mark as Not Paid</button></div>
        </article>
      ))}
    </div>
  );
}

function BillTable({ role, bills, onUpdated, onError }: { role: "ADMIN" | "MASTER_ADMIN"; bills: Bill[]; onUpdated: (bill: Bill) => void; onError: (message: string) => void }) {
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(bills.map((bill) => [bill.id, bill.adminNote || ""])));
  const [saving, setSaving] = useState("");

  async function verify(bill: Bill, status: Exclude<AdminStatus, "PENDING">) {
    setSaving(bill.id);
    onError("");
    try {
      const data = await jsonRequest<{ bill: Bill }>(`/api/bills/${bill.id}`, {
        method: "PATCH",
        body: JSON.stringify({ adminVerificationStatus: status, adminNote: notes[bill.id] || "" })
      });
      onUpdated(data.bill);
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Unable to update verification.");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr>{role === "MASTER_ADMIN" && <th>Admin</th>}<th>Tenant / bill</th><th>Amount / due</th><th>Tenant self-status</th><th>Admin verified-status</th><th>Notes</th>{role === "ADMIN" && <th>Actions</th>}</tr></thead>
        <tbody>{bills.map((bill) => (
          <tr key={bill.id}>
            {role === "MASTER_ADMIN" && <td><strong>{bill.admin.name}</strong><small>{bill.admin.email}</small></td>}
            <td><strong>{bill.tenant.name}</strong><small>{bill.billType === "ELECTRICITY" ? "Electricity" : "Water"} · {monthNames[bill.billingMonth - 1]} {bill.billingYear}</small></td>
            <td><strong>{money(bill.amount)}</strong><small>Due {date(bill.dueDate)}</small></td>
            <td><Badge kind={bill.tenantPaymentStatus}>{tenantLabels[bill.tenantPaymentStatus]}</Badge><small>{date(bill.tenantMarkedAt)}</small></td>
            <td><Badge kind={bill.adminVerificationStatus}>{adminLabels[bill.adminVerificationStatus]}</Badge><small>{date(bill.adminVerifiedAt)}</small></td>
            <td><small><b>Tenant:</b> {bill.tenantNote || "—"}</small><small><b>Admin:</b> {bill.adminNote || "—"}</small></td>
            {role === "ADMIN" && <td className="action-cell"><textarea aria-label={`Admin note for ${bill.tenant.name}`} value={notes[bill.id] ?? bill.adminNote ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [bill.id]: event.target.value }))} placeholder="Admin note" maxLength={1000} /><div className="action-grid"><button disabled={saving === bill.id} onClick={() => verify(bill, "VERIFIED_PAID")}>Verify as Paid</button><button disabled={saving === bill.id} onClick={() => verify(bill, "UNPAID")}>Mark Unpaid</button><button disabled={saving === bill.id} onClick={() => verify(bill, "OVERDUE")}>Mark Overdue</button><button disabled={saving === bill.id} onClick={() => verify(bill, "REJECTED_CLAIM")}>Reject Claim</button><button disabled={saving === bill.id} onClick={() => verify(bill, "WAIVED")}>Waive Bill</button></div></td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function headingFor(role: Role) {
  if (role === "TENANT") return "Your utility bills, without the guesswork.";
  if (role === "ADMIN") return "Review every tenant claim with context.";
  return "A complete view across every owner.";
}

function subtitleFor(role: Role) {
  if (role === "TENANT") return "Mark what you have paid and follow your owner’s final verification.";
  if (role === "ADMIN") return "Create bills, review self-reported payment status, and set the final record.";
  return "Monitor all utility records while keeping each owner’s workflow intact.";
}
