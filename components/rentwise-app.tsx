"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowRight, BadgeIndianRupee, Bell, Building2, Check, ChevronRight,
  CircleDollarSign, Droplets, Eye, EyeOff, FileCheck2, Gauge, Home, LayoutDashboard,
  Loader2, LogOut, Menu, Pencil, Plus, ReceiptText, ShieldCheck, Sparkles,
  Trash2, UserRound, UsersRound, WalletCards, X, Zap, BarChart3, CalendarDays, FileText, KeyRound, LifeBuoy, CircleHelp
} from "lucide-react";
import { AnalyticsView, DocumentsView, RentView, type AnalyticsData, type RentalDocumentData, type RentData } from "@/components/rental-workflows";
import { MasterAdminConsole } from "@/components/master-admin-console";
import { DeleteAction } from "@/components/delete-action";
import { RecordCleanup } from "@/components/record-cleanup";
import { AIAssistant, NotificationCenter, UsageTracker } from "@/components/ai-assistant";
import { CalendarView, ComplaintsView, NoticesView, ReceiptsView, RoleInsights } from "@/components/value-features";
import { FirstPartyAnalyticsView } from "@/components/first-party-analytics";
import { GuidedTour } from "@/components/tour/guided-tour";

type Role = "MASTER_ADMIN" | "ADMIN" | "TENANT";
type SessionUser = { id: string; name: string; email: string; role: Role };
type Person = { id: string; name: string; email: string };
type TenantStatus = "NOT_MARKED" | "TENANT_MARKED_PAID" | "TENANT_MARKED_NOT_PAID";
type AdminStatus = "PENDING" | "VERIFIED_PAID" | "UNPAID" | "OVERDUE" | "WAIVED" | "REJECTED_CLAIM";
type View = "overview" | "analytics" | "usage" | "owners" | "master-tenants" | "support" | "activity" | "deleted" | "rent" | "bills" | "documents" | "complaints" | "notices" | "receipts" | "calendar" | "tenants";
type Bill = {
  id: string; adminId: string; tenantId: string; billType: "ELECTRICITY" | "WATER";
  billingMonth: number; billingYear: number; amount: number; dueDate: string;
  tenantPaymentStatus: TenantStatus; tenantMarkedAt: string | null; tenantNote: string | null;
  adminVerificationStatus: AdminStatus; adminVerifiedAt: string | null; adminNote: string | null;
  remarks: string | null; admin: Person; tenant: Person;
};

const tenantLabels: Record<TenantStatus, string> = { NOT_MARKED: "Not marked", TENANT_MARKED_PAID: "Marked paid", TENANT_MARKED_NOT_PAID: "Not paid" };
const adminLabels: Record<AdminStatus, string> = { PENDING: "Pending", VERIFIED_PAID: "Verified paid", UNPAID: "Unpaid", OVERDUE: "Overdue", WAIVED: "Waived", REJECTED_CLAIM: "Rejected claim" };
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const demos = [
  ["Owner", "aarav.owner@rentwise.ai", "Owner@12345", Building2],
  ["Tenant", "priya.tenant@rentwise.ai", "Tenant@12345", UserRound]
] as const;

const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)) : "—";
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export function RentWiseApp() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [tenants, setTenants] = useState<Person[]>([]);
  const [rents, setRents] = useState<RentData[]>([]);
  const [documents, setDocuments] = useState<RentalDocumentData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("overview");
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot" | "support" | "help" | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [tourReplayToken, setTourReplayToken] = useState(0);

  const notify = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text }); window.setTimeout(() => setToast(null), 4200);
  }, []);
  const loadData = useCallback(async (current: SessionUser) => {
    const [billData, rentData, documentData, analyticsData] = await Promise.all([
      request<{ bills: Bill[] }>("/api/bills"), request<{ rents: RentData[] }>("/api/rents"),
      request<{ documents: RentalDocumentData[] }>("/api/documents"), request<AnalyticsData>("/api/analytics")
    ]);
    setBills(billData.bills); setRents(rentData.rents); setDocuments(documentData.documents); setAnalytics(analyticsData);
    if (current.role === "ADMIN") {
      const people = await request<{ tenants: Person[] }>("/api/tenants"); setTenants(people.tenants);
    }
  }, []);

  useEffect(() => {
    request<{ user: SessionUser | null }>("/api/auth/session")
      .then(async ({ user: current }) => { setUser(current); if (current) await loadData(current); })
      .catch((error) => notify("error", error.message))
      .finally(() => setInitializing(false));
  }, [loadData, notify]);

  async function authenticate(payload: Record<string, unknown>, mode: "login" | "signup") {
    setBusy(true);
    try {
      const data = await request<{ user?: SessionUser; pending?: boolean; message?: string; redirectTo?: string }>(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(payload) });
      if (!data.user) { setAuthMode(null); notify("success", data.message || "Your account request was submitted."); return; }
      if (data.redirectTo) { window.location.assign(data.redirectTo); return; }
      setUser(data.user); setAuthMode(null); setView("overview"); await loadData(data.user);
      notify("success", `Welcome ${data.user.name}. Your dashboard is ready.`);
      window.history.replaceState({}, "", `/#${data.user.role.toLowerCase()}-dashboard`);
    } catch (error) { notify("error", error instanceof Error ? error.message : "Unable to continue."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); await request("/api/auth/logout", { method: "POST" });
    setUser(null); setBills([]); setTenants([]); setRents([]); setDocuments([]); setAnalytics(null); setView("overview"); setMobileNav(false); setBusy(false);
    window.history.replaceState({}, "", "/"); notify("success", "You have signed out safely.");
  }
  const navigateTour = useCallback((next: string) => setView(next as View), []);
  const replayTour = useCallback(() => setTourReplayToken((current) => current + 1), []);

  if (initializing) return <LoadingScreen />;
  return (
    <>
      {user ? (
        <Dashboard
          user={user} bills={bills} tenants={tenants} rents={rents} documents={documents} analytics={analytics} view={view} mobileNav={mobileNav}
          setMobileNav={setMobileNav} setView={setView} onLogout={logout} onNotify={notify} onReplayTour={replayTour}
          setBills={setBills} setTenants={setTenants} setRents={setRents} setDocuments={setDocuments} setAnalytics={setAnalytics}
        />
      ) : <Landing onAuth={setAuthMode} onReplayTour={replayTour} />}
      {authMode && <AuthModal mode={authMode} setMode={setAuthMode} busy={busy} onSubmit={authenticate} onNotify={notify} />}
      {busy && <div className="global-busy"><Loader2 size={22} className="spin" /> Working…</div>}
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.type === "success" ? <Check size={18} /> : <Activity size={18} />}{toast.text}</div>}
      <GuidedTour role={user?.role || "GUEST"} userId={user?.id} replayToken={tourReplayToken} onNavigate={user ? navigateTour : undefined} onMenuChange={user ? setMobileNav : undefined} />
    </>
  );
}

function Landing({ onAuth, onReplayTour }: { onAuth: (mode: "login" | "signup" | "forgot" | "support" | "help") => void; onReplayTour: () => void }) {
  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return <main className="landing">
    <nav className="landing-nav" data-tour="landing-navigation">
      <button className="brand-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span>RW</span><b>RentWise Lite</b></button>
      <div><button onClick={() => scroll("features")}>Features</button><button onClick={() => scroll("roles")}>For every role</button><button onClick={() => scroll("how")}>How it works</button><Link className="landing-link" href="/install">Install app</Link></div>
      <div className="nav-actions" data-tour="landing-auth"><button className="ghost-btn" onClick={() => onAuth("login")}>Sign in</button><button className="gold-btn" onClick={() => onAuth("signup")}>Create account <ArrowRight size={16} /></button></div>
    </nav>
    <section className="hero" data-tour="landing-hero">
      <Image src="/rentwise-hero.png" alt="Warm contemporary rental apartment" fill priority sizes="100vw" />
      <div className="hero-shade" />
      <div className="hero-copy"><p className="kicker"><Sparkles size={15} /> Rental management, beautifully clear</p><h1>Your home records,<br /><em>finally in order.</em></h1><p>One calm place for owners and tenants to track utility bills, payment claims, verification, and rental readiness.</p><div className="hero-actions"><button className="gold-btn large" onClick={() => onAuth("signup")}>Start managing <ArrowRight size={18} /></button><button className="glass-btn" onClick={() => onAuth("login")}><Eye size={18} /> View demo</button></div></div>
      <div className="hero-proof"><span><ShieldCheck /> Role-protected</span><span><Zap /> Real-time records</span><span><FileCheck2 /> Clear audit trail</span></div>
    </section>
    <section className="feature-section" id="features" data-tour="landing-features"><p className="kicker">Made for real rental life</p><div className="section-title"><h2>Less chasing. More certainty.</h2><p>Every action has a clear owner, timestamp, status, and next step.</p></div><div className="feature-grid">
      <Feature icon={ReceiptText} title="Utility bill clarity" text="Electricity and water records with separate tenant claims and owner verification." />
      <Feature icon={UsersRound} title="Scoped tenant access" text="Owners see only their tenants. Tenants see only their own records." />
      <Feature icon={Gauge} title="Useful dashboards" text="Live counts, payment states, and attention items instead of blank screens." />
      <Feature icon={Bell} title="Immediate feedback" text="Loading states, confirmations, and helpful success or error messages." />
    </div></section>
    <section className="role-section" id="roles"><p className="kicker">One system · Three perspectives</p><h2>Everyone sees exactly what they need.</h2><div className="role-grid">
      <RoleCard icon={Building2} label="Admin / Owner" text="Add tenants and bills, review claims, and record final status." onClick={() => onAuth("login")} />
      <RoleCard icon={UserRound} label="Tenant / User" text="See bills, add notes, and report paid or unpaid status." onClick={() => onAuth("login")} />
    </div></section>
    <section className="how-section" id="how"><div><p className="kicker">A clean four-step record</p><h2>From bill to verified status.</h2></div>{["Owner adds a bill", "Tenant reports payment", "Owner verifies the claim", "Records stay auditable"].map((step, index) => <article key={step}><span>0{index + 1}</span><b>{step}</b></article>)}</section>
    <footer className="landing-footer"><div><span className="mini-logo">RW</span><b>RentWise Lite</b></div><div className="footer-links"><Link href="/install" data-tour="landing-install">Install</Link><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact-support">Support</Link><Link href="/delete-account">Delete account</Link><button onClick={() => onAuth("help")}>Troubleshooting</button><button onClick={onReplayTour}>Start App Guide</button></div><small>Created and Developed by Tejas R U</small></footer>
  </main>;
}

function Feature({ icon: Icon, title, text }: { icon: typeof Home; title: string; text: string }) { return <article className="feature-card"><span><Icon size={22} /></span><h3>{title}</h3><p>{text}</p></article>; }
function RoleCard({ icon: Icon, label, text, onClick }: { icon: typeof Home; label: string; text: string; onClick: () => void }) { return <button className="role-card" onClick={onClick}><Icon size={25} /><h3>{label}</h3><p>{text}</p><span>Open demo <ChevronRight size={16} /></span></button>; }

function AuthModal({ mode, setMode, busy, onSubmit, onNotify }: { mode: "login" | "signup" | "forgot" | "support" | "help"; setMode: (mode: "login" | "signup" | "forgot" | "support" | "help" | null) => void; busy: boolean; onSubmit: (payload: Record<string, unknown>, mode: "login" | "signup") => void; onNotify: (type: "success" | "error", text: string) => void }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "TENANT">("TENANT");
  const [owners, setOwners] = useState<Array<{ id: string; name: string; email: string; properties: string[] }>>([]);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (mode === "signup") request<{ owners: typeof owners }>("/api/owners").then((data) => setOwners(data.owners)).catch(() => setOwners([])); }, [mode]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const payload = Object.fromEntries(new FormData(event.currentTarget)); if (mode === "login" || mode === "signup") return onSubmit(payload, mode); setSubmitting(true); try { if (mode === "forgot") { const data = await request<{ message: string }>("/api/auth/forgot", { method: "POST", body: JSON.stringify(payload) }); onNotify("success", data.message); setMode("login"); } else { const data = await request<{ ticketId: string }>("/api/support", { method: "POST", body: JSON.stringify(payload) }); onNotify("success", `Support request ${data.ticketId.slice(-6)} was created.`); setMode("login"); } } catch (error) { onNotify("error", error instanceof Error ? error.message : "Unable to submit request."); } finally { setSubmitting(false); } }
  const title = mode === "login" ? "Welcome home." : mode === "signup" ? "Create your account." : mode === "forgot" ? "Recover account access." : mode === "support" ? "Tell us what went wrong." : "Account access help.";
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><section className="auth-modal"><button className="icon-button close" aria-label="Close" onClick={() => setMode(null)}><X /></button><div className="auth-brand"><span>RW</span><div><p className="kicker">Secure rental portal</p><h2>{title}</h2></div></div>
    {mode === "help" ? <div className="help-panel"><article><KeyRound /><div><b>Forgotten password?</b><p>Submit a secure recovery request for support review.</p><button onClick={() => setMode("forgot")}>Start recovery</button></div></article><article><LifeBuoy /><div><b>Sign-in or registration issue?</b><p>Send the problem details and receive a trackable ticket.</p><button onClick={() => setMode("support")}>Report issue</button></div></article><button className="primary-action" onClick={() => setMode("login")}>Return to sign in</button></div> : <form onSubmit={submit}>
      {mode === "signup" && <><label>Full name<input name="name" placeholder="Your full name" minLength={2} required /></label><div className="role-toggle"><button type="button" className={role === "TENANT" ? "active" : ""} onClick={() => setRole("TENANT")}>Tenant</button><button type="button" className={role === "ADMIN" ? "active" : ""} onClick={() => setRole("ADMIN")}>Owner / Admin</button></div><input type="hidden" name="role" value={role} />{role === "TENANT" ? <><label>Age group (optional)<select name="ageGroup" defaultValue="NOT_PROVIDED"><option value="NOT_PROVIDED">Prefer not to say</option><option value="18-24">18–24</option><option value="25-34">25–34</option><option value="35-44">35–44</option><option value="45-54">45–54</option><option value="55+">55+</option></select></label><label>Search approved owners<input value={ownerSearch} onChange={(event) => setOwnerSearch(event.target.value)} placeholder="Owner, email, or property" /></label><label>Select your approved owner<select name="adminId" required defaultValue=""><option value="" disabled>Choose owner / property</option>{owners.filter((owner) => `${owner.name} ${owner.email} ${owner.properties.join(" ")}`.toLowerCase().includes(ownerSearch.toLowerCase())).map((owner) => <option value={owner.id} key={owner.id}>{owner.name} · {owner.properties.join(", ") || "Property pending"} · {owner.email}</option>)}</select></label></> : <><label>Property name<input name="propertyName" placeholder="Your primary property" required /></label><label>Property address<textarea name="propertyAddress" placeholder="Full property address" required /></label><label>Phone number (optional)<input name="phone" type="tel" placeholder="Contact number" /></label></>}</>}
      <label>Email address<input type="email" name="email" placeholder="you@example.com" autoComplete="email" required /></label>
      {(mode === "login" || mode === "signup") && <label>Password<div className="password-field"><input type={passwordVisible ? "text" : "password"} name="password" placeholder={mode === "signup" ? "12+ characters, mixed case, number & symbol" : "Your password"} minLength={mode === "signup" ? 12 : 1} autoComplete={mode === "login" ? "current-password" : "new-password"} required /><button type="button" aria-label={passwordVisible ? "Hide password" : "Show password"} onClick={() => setPasswordVisible(!passwordVisible)}>{passwordVisible ? <EyeOff /> : <Eye />}</button></div></label>}
      {mode === "support" && <><label>Name<input name="name" placeholder="Your name (optional)" /></label><div className="form-row"><label>Your role<select name="role" defaultValue="TENANT"><option value="TENANT">Tenant</option><option value="ADMIN">Owner / Admin</option><option value="UNKNOWN">Not sure</option></select></label><label>Issue type<select name="issueType" defaultValue="LOGIN_ISSUE"><option value="LOGIN_ISSUE">Login issue</option><option value="SIGNUP_ISSUE">Signup issue</option><option value="CREATE_ACCOUNT_ISSUE">Create-account issue</option><option value="PASSWORD_RESET_TROUBLE">Forgot password trouble</option><option value="OWNER_NOT_FOUND">Unable to find owner</option><option value="OWNER_APPROVAL_ISSUE">Owner approval issue</option></select></label></div><label>What happened?<textarea name="description" placeholder="Describe the login, sign-in, or create-account issue" minLength={10} required /></label></>}
      <button className="primary-action" disabled={busy || submitting}>{busy || submitting ? <Loader2 className="spin" /> : mode === "login" ? "Sign in securely" : mode === "signup" ? "Create account" : mode === "forgot" ? "Request recovery" : "Submit support ticket"}<ArrowRight size={17} /></button>
    </form>}
    {mode === "login" && <div className="demo-panel"><span>One-click demo access</span>{demos.map(([label, email, password, Icon]) => <button key={label} onClick={() => onSubmit({ email, password }, "login")} disabled={busy}><Icon size={16} />{label}</button>)}</div>}
    {mode === "login" && <div className="auth-links"><button onClick={() => setMode("forgot")}>Forgot password?</button><button onClick={() => setMode("support")}>Report sign-in issue</button></div>}
    {(mode === "login" || mode === "signup") && <><p className="auth-switch">{mode === "login" ? "New to RentWise?" : "Already registered?"} <button onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Create account" : "Sign in"}</button></p><div className="auth-legal"><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact-support">Support</Link></div></>}
    {mode === "signup" && <div className="auth-links"><button onClick={() => setMode("forgot")}>Forgot password?</button><button onClick={() => setMode("support")}>Report account issue</button><button onClick={() => setMode("help")}>Troubleshooting</button></div>}
  </section></div>;
}

function Dashboard({ user, bills, tenants, rents, documents, analytics, view, mobileNav, setMobileNav, setView, onLogout, onNotify, onReplayTour, setBills, setTenants, setRents, setDocuments }: {
  user: SessionUser; bills: Bill[]; tenants: Person[]; rents: RentData[]; documents: RentalDocumentData[]; analytics: AnalyticsData | null; view: View; mobileNav: boolean;
  setMobileNav: (open: boolean) => void; setView: (view: View) => void; onLogout: () => void; onReplayTour: () => void;
  onNotify: (type: "success" | "error", text: string) => void; setBills: React.Dispatch<React.SetStateAction<Bill[]>>; setTenants: React.Dispatch<React.SetStateAction<Person[]>>; setRents: React.Dispatch<React.SetStateAction<RentData[]>>; setDocuments: React.Dispatch<React.SetStateAction<RentalDocumentData[]>>; setAnalytics: React.Dispatch<React.SetStateAction<AnalyticsData | null>>;
}) {
  const nav = [{ id: "overview" as View, label: user.role === "MASTER_ADMIN" ? "Command center" : "Overview", icon: LayoutDashboard }, ...(user.role !== "TENANT" ? [{ id: "analytics" as View, label: "Analytics", icon: BarChart3 }] : []), ...(user.role === "MASTER_ADMIN" ? [{ id: "usage" as View, label: "Live usage", icon: Gauge }, { id: "owners" as View, label: "Owners", icon: Building2 }, { id: "master-tenants" as View, label: "All tenants", icon: UsersRound }, { id: "support" as View, label: "Issue reports", icon: LifeBuoy }, { id: "activity" as View, label: "Activity logs", icon: Activity }, { id: "deleted" as View, label: "Deleted Records", icon: Trash2 }] : []), { id: "rent" as View, label: user.role === "TENANT" ? "My rent" : "Rent tracking", icon: WalletCards }, { id: "bills" as View, label: user.role === "TENANT" ? "My bills" : user.role === "MASTER_ADMIN" ? "All utility bills" : "Utility bills", icon: ReceiptText }, { id: "documents" as View, label: user.role === "TENANT" ? "My document vault" : "Document vault", icon: FileText }, { id: "complaints" as View, label: "Complaints", icon: Activity }, { id: "notices" as View, label: "Notice board", icon: Bell }, { id: "receipts" as View, label: "Rent receipts", icon: BadgeIndianRupee }, { id: "calendar" as View, label: "Calendar", icon: CalendarDays }, ...(user.role === "ADMIN" ? [{ id: "tenants" as View, label: "Tenants", icon: UsersRound }] : [])];
  const changeView = (next: View) => { setView(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className="dashboard-shell">
    <aside className={`dashboard-sidebar ${mobileNav ? "open" : ""} ${user.role === "MASTER_ADMIN" ? "master-sidebar" : ""}`}><div className="dash-brand"><span>RW</span><div><b>RentWise Lite</b><small>{user.role === "MASTER_ADMIN" ? "Command authority" : "Rental clarity"}</small></div><button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X /></button></div><nav>{nav.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => changeView(id)}><Icon size={19} />{label}</button>)}</nav><div className="side-help"><Sparkles size={18} /><b>{user.role === "MASTER_ADMIN" ? "Protected command center" : "Clear records, calmer rentals."}</b><p>{user.role === "MASTER_ADMIN" ? "Every privileged action is role-checked and audited." : "Every status is visible to the right people."}</p></div><div className="side-user"><Avatar name={user.name} /><div><b>{user.name}</b><small>{roleName(user.role)}</small></div><button className="icon-button" onClick={onLogout} aria-label="Sign out"><LogOut size={18} /></button></div></aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main className="dashboard-main"><header className="dash-topbar"><button className="icon-button menu-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu /></button><div><p>{roleName(user.role)} portal</p><h1>{viewTitle(view, user.role)}</h1></div><div className="top-actions"><button className="icon-button guide-button" data-tour="guide-replay" onClick={onReplayTour} aria-label="Replay app guide" title="Replay app guide"><CircleHelp /></button><NotificationCenter /><Avatar name={user.name} /></div></header>
      <UsageTracker page={`/${user.role.toLowerCase()}/${view}`} />
      {view === "overview" && (user.role === "MASTER_ADMIN" ? <div className="tour-view-target" data-tour="master-overview"><MasterAdminConsole mode="overview" analytics={analytics} notify={onNotify} /></div> : <Overview user={user} bills={bills} tenants={tenants} rents={rents} documents={documents} analytics={analytics} onView={changeView} />)}
      {view === "analytics" && user.role !== "TENANT" && <div className="tour-view-target" data-tour="analytics-section"><AnalyticsView data={analytics} role={user.role} notify={onNotify} /></div>}
      {view === "usage" && user.role === "MASTER_ADMIN" && <div className="tour-view-target" data-tour="live-usage-section"><FirstPartyAnalyticsView notify={onNotify} /></div>}
      {view === "rent" && <div className="tour-view-target" data-tour="rent-section"><RentView role={user.role} rents={rents} setRents={setRents} tenants={tenants} properties={analytics?.properties || []} notify={onNotify} /></div>}
      {view === "bills" && <div className="tour-view-target" data-tour="bills-section"><BillsView user={user} bills={bills} tenants={tenants} setBills={setBills} onNotify={onNotify} /></div>}
      {view === "documents" && <div className="tour-view-target" data-tour="documents-section"><DocumentsView role={user.role} documents={documents} setDocuments={setDocuments} notify={onNotify} /></div>}
      {view === "complaints" && <ComplaintsView role={user.role} notify={onNotify} />}
      {view === "notices" && <NoticesView role={user.role} notify={onNotify} />}
      {view === "receipts" && <ReceiptsView role={user.role} notify={onNotify} />}
      {view === "calendar" && <CalendarView rents={rents} bills={bills} documents={documents} />}
      {view === "tenants" && user.role === "ADMIN" && <div className="tour-view-target" data-tour="tenants-section"><TenantDirectory tenants={tenants} setTenants={setTenants} onNotify={onNotify} /></div>}
      {user.role === "MASTER_ADMIN" && (view === "owners" || view === "master-tenants" || view === "support" || view === "activity" || view === "deleted") && <div className="tour-view-target" data-tour={`${view}-section`}><MasterAdminConsole mode={view} analytics={analytics} notify={onNotify} /></div>}
      {view !== "deleted" && <RecordCleanup user={user} bills={bills} rents={rents} documents={documents} tenants={tenants} properties={analytics?.properties || []} notify={onNotify} removeBill={(id) => setBills((current) => current.filter((item) => item.id !== id))} removeRent={(id) => setRents((current) => current.filter((item) => item.id !== id))} removeDocument={(id) => setDocuments((current) => current.filter((item) => item.id !== id))} removeTenant={(id) => setTenants((current) => current.filter((item) => item.id !== id))} />}
      <footer className="dash-footer">RentWise Lite · Manual status tracking only · Created and Developed by Tejas R U</footer>
    </main>
    <AIAssistant role={user.role} />
  </div>;
}

function Overview({ user, bills, tenants, rents, documents, analytics, onView }: { user: SessionUser; bills: Bill[]; tenants: Person[]; rents: RentData[]; documents: RentalDocumentData[]; analytics: AnalyticsData | null; onView: (view: View) => void }) {
  const pending = bills.filter((b) => b.adminVerificationStatus === "PENDING").length;
  return <div className="view-stack"><section className="welcome-card"><div><p className="kicker">Good to see you, {user.name.split(" ")[0]}</p><h2>{overviewHeading(user.role)}</h2><p>{overviewText(user.role)}</p><button onClick={() => onView("bills")}>Review utility records <ArrowRight size={17} /></button></div><div className="welcome-art"><Home size={55} /><span>{bills.length} active records</span></div></section>
    <RoleInsights role={user.role} rents={rents} documents={documents} analytics={analytics} />
    <section className="stats-grid"><Stat icon={ReceiptText} label="Utility records" value={bills.length} note="Electricity and water" /><Stat icon={WalletCards} label="Rent records" value={rents.length} note={`${analytics?.properties.length || 0} linked properties`} /><Stat icon={Activity} label="Pending review" value={pending + rents.filter((item) => item.adminVerificationStatus === "PENDING").length} note="Awaiting final status" /><Stat icon={FileCheck2} label="Documents" value={documents.length} note={`${documents.filter((item) => item.status === "VERIFIED").length} verified`} /></section>
    <div className="overview-grid"><section className="content-card wide"><CardHeader icon={Activity} title="Recent activity" action="View all" onClick={() => onView("bills")} />{bills.length ? <div className="activity-list">{bills.slice(0, 4).map((bill) => <article key={bill.id}><span className={`bill-icon ${bill.billType.toLowerCase()}`}>{bill.billType === "WATER" ? <Droplets /> : <Zap />}</span><div><b>{bill.billType === "WATER" ? "Water" : "Electricity"} · {bill.tenant.name}</b><small>{months[bill.billingMonth - 1]} {bill.billingYear} · Due {date(bill.dueDate)}</small></div><Status type={bill.adminVerificationStatus}>{adminLabels[bill.adminVerificationStatus]}</Status><strong>{money(bill.amount)}</strong></article>)}</div> : <EmptyState icon={ReceiptText} title="No utility records yet" text="New bills and updates will appear here." />}</section>
      <section className="content-card"><CardHeader icon={ShieldCheck} title="Rental readiness" /> <Readiness user={user} bills={bills} tenants={tenants} /></section>
    </div>
    {user.role === "MASTER_ADMIN" && <AdminSummary bills={bills} />}
    <section className="info-strip"><button onClick={() => onView("documents")}><FileCheck2 /><div><b>E-agreement</b><p>{documents.find((item) => item.kind === "AGREEMENT")?.fileName || "Upload or review the signed rental agreement."}</p></div><ArrowRight /></button><button onClick={() => onView("documents")}><ShieldCheck /><div><b>ID proof</b><p>{documents.find((item) => item.kind === "ID_PROOF")?.fileName || "Upload or review tenant identification."}</p></div><ArrowRight /></button></section>
  </div>;
}

function Stat({ icon: Icon, label, value, note }: { icon: typeof Home; label: string; value: string | number; note: string }) { return <article className="stat-card"><span><Icon /></span><p>{label}</p><strong>{value}</strong><small>{note}</small></article>; }
function CardHeader({ icon: Icon, title, action, onClick }: { icon: typeof Home; title: string; action?: string; onClick?: () => void }) { return <header className="card-header"><h3><Icon size={19} />{title}</h3>{action && <button onClick={onClick}>{action}<ChevronRight size={15} /></button>}</header>; }
function Readiness({ user, bills, tenants }: { user: SessionUser; bills: Bill[]; tenants: Person[] }) { const complete = bills.filter((b) => b.adminVerificationStatus === "VERIFIED_PAID").length; const score = bills.length ? Math.round((complete / bills.length) * 100) : 0; return <div className="readiness"><div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}><span>{score}%</span></div><h4>{score >= 80 ? "Records in excellent shape" : score ? "Verification in progress" : "Ready to get started"}</h4><p>{user.role === "ADMIN" ? `${tenants.length} tenant accounts connected.` : `${complete} of ${bills.length} visible records verified.`}</p></div>; }
function AdminSummary({ bills }: { bills: Bill[] }) { const groups = Object.values(bills.reduce<Record<string, { admin: Person; bills: Bill[] }>>((acc, bill) => { acc[bill.adminId] ||= { admin: bill.admin, bills: [] }; acc[bill.adminId].bills.push(bill); return acc; }, {})); return <section className="content-card"><CardHeader icon={Building2} title="Admin-wise summary" /><div className="admin-summary">{groups.length ? groups.map((group) => <article key={group.admin.id}><Avatar name={group.admin.name} /><div><b>{group.admin.name}</b><small>{group.admin.email}</small></div><span>{group.bills.length} bills</span><strong>{money(group.bills.reduce((sum, bill) => sum + bill.amount, 0))}</strong></article>) : <EmptyState icon={Building2} title="No admin activity" text="Owner activity will appear here." />}</div></section>; }

function BillsView({ user, bills, tenants, setBills, onNotify }: { user: SessionUser; bills: Bill[]; tenants: Person[]; setBills: React.Dispatch<React.SetStateAction<Bill[]>>; onNotify: (type: "success" | "error", text: string) => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const update = (bill: Bill) => setBills((current) => current.map((item) => item.id === bill.id ? bill : item));
  return <div className="view-stack"><section className="view-heading"><div><p className="kicker">Payment records</p><h2>{user.role === "TENANT" ? "My utility bills" : user.role === "ADMIN" ? "Tenant utility bills" : "All utility bills"}</h2><p>Tenant status is self-reported. Owner verification remains the final record.</p></div>{user.role === "ADMIN" && <button className="primary-action compact" onClick={() => setShowCreate(true)}><Plus size={17} />Add bill</button>}</section>
    {showCreate && <CreateBillModal tenants={tenants} onClose={() => setShowCreate(false)} onCreated={(bill) => { setBills((current) => [bill, ...current]); setShowCreate(false); onNotify("success", "Bill added for tenant review."); }} onError={(text) => onNotify("error", text)} />}
    {bills.length === 0 ? <EmptyState icon={ReceiptText} title="No bills to show" text={user.role === "ADMIN" ? "Add the first utility bill for one of your tenants." : "Records will appear here when an owner adds them."} /> : user.role === "TENANT" ? <TenantBills bills={bills} onUpdated={update} onNotify={onNotify} /> : <BillTable role={user.role} bills={bills} onUpdated={update} onNotify={onNotify} />}
  </div>;
}

function CreateBillModal({ tenants, onClose, onCreated, onError }: { tenants: Person[]; onClose: () => void; onCreated: (bill: Bill) => void; onError: (text: string) => void }) { const [saving, setSaving] = useState(false); async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); try { const data = await request<{ bill: Bill }>("/api/bills", { method: "POST", body: JSON.stringify({ tenantId: form.get("tenantId"), billType: form.get("billType"), billingMonth: Number(form.get("billingMonth")), billingYear: Number(form.get("billingYear")), amount: Number(form.get("amount")), dueDate: new Date(`${form.get("dueDate")}T00:00:00.000Z`).toISOString(), remarks: form.get("remarks") }) }); onCreated(data.bill); } catch (error) { onError(error instanceof Error ? error.message : "Could not add bill."); } finally { setSaving(false); } } return <div className="modal-backdrop"><section className="form-modal"><button className="icon-button close" onClick={onClose} aria-label="Close"><X /></button><p className="kicker">New utility record</p><h2>Add a tenant bill</h2>{tenants.length ? <form className="modal-form" onSubmit={submit}><label>Tenant<select name="tenantId" required>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label><div className="form-row"><label>Bill type<select name="billType"><option value="ELECTRICITY">Electricity</option><option value="WATER">Water</option></select></label><label>Amount (INR)<input name="amount" type="number" min="1" step=".01" placeholder="1800" required /></label></div><div className="form-row"><label>Month<select name="billingMonth" defaultValue={new Date().getMonth() + 1}>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label><label>Year<input name="billingYear" type="number" defaultValue={new Date().getFullYear()} min="2020" max="2100" required /></label></div><label>Due date<input name="dueDate" type="date" required /></label><label>Remarks<textarea name="remarks" placeholder="Optional meter reading or billing context" /></label><button className="primary-action" disabled={saving}>{saving ? <Loader2 className="spin" /> : <Plus />}Add bill</button></form> : <EmptyState icon={UsersRound} title="No tenants available" text="Add a tenant before creating a bill." />}</section></div>; }

function TenantBills({ bills, onUpdated, onNotify }: { bills: Bill[]; onUpdated: (bill: Bill) => void; onNotify: (type: "success" | "error", text: string) => void }) { const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(bills.map((b) => [b.id, b.tenantNote || ""]))); const [saving, setSaving] = useState(""); async function update(bill: Bill, status: "TENANT_MARKED_PAID" | "TENANT_MARKED_NOT_PAID") { setSaving(bill.id); try { const data = await request<{ bill: Bill }>(`/api/bills/${bill.id}`, { method: "PATCH", body: JSON.stringify({ tenantPaymentStatus: status, tenantNote: notes[bill.id] || "" }) }); onUpdated(data.bill); onNotify("success", "Your payment status was saved for owner review."); } catch (error) { onNotify("error", error instanceof Error ? error.message : "Unable to update."); } finally { setSaving(""); } } return <div className="bill-card-grid">{bills.map((bill) => <article className="payment-card" key={bill.id}><header><span className={`bill-icon ${bill.billType.toLowerCase()}`}>{bill.billType === "WATER" ? <Droplets /> : <Zap />}</span><div><small>{bill.billType}</small><h3>{months[bill.billingMonth - 1]} {bill.billingYear}</h3></div><strong>{money(bill.amount)}</strong></header><div className="payment-meta"><span>Due <b>{date(bill.dueDate)}</b></span><span>Owner <b>{bill.admin.name}</b></span></div><div className="status-row"><div><small>Your status</small><Status type={bill.tenantPaymentStatus}>{tenantLabels[bill.tenantPaymentStatus]}</Status></div><div><small>Owner verification</small><Status type={bill.adminVerificationStatus}>{adminLabels[bill.adminVerificationStatus]}</Status></div></div><label>Your note<textarea value={notes[bill.id] ?? ""} onChange={(e) => setNotes((current) => ({ ...current, [bill.id]: e.target.value }))} placeholder="Optional note for your owner" /></label><div className="card-actions"><button disabled={saving === bill.id} onClick={() => update(bill, "TENANT_MARKED_PAID")}><Check />Mark paid</button><button className="danger-soft" disabled={saving === bill.id} onClick={() => update(bill, "TENANT_MARKED_NOT_PAID")}><X />Not paid yet</button></div><p className="manual-disclaimer">Manual status only—this app does not process payments.</p></article>)}</div>; }

function BillTable({ role, bills, onUpdated, onNotify }: { role: "ADMIN" | "MASTER_ADMIN"; bills: Bill[]; onUpdated: (bill: Bill) => void; onNotify: (type: "success" | "error", text: string) => void }) { const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(bills.map((b) => [b.id, b.adminNote || ""]))); const [saving, setSaving] = useState(""); async function verify(bill: Bill, status: Exclude<AdminStatus, "PENDING">) { setSaving(bill.id); try { const data = await request<{ bill: Bill }>(`/api/bills/${bill.id}`, { method: "PATCH", body: JSON.stringify({ adminVerificationStatus: status, adminNote: notes[bill.id] || "" }) }); onUpdated(data.bill); onNotify("success", `Bill marked ${adminLabels[status].toLowerCase()}.`); } catch (error) { onNotify("error", error instanceof Error ? error.message : "Unable to update."); } finally { setSaving(""); } } return <section className="content-card table-card"><div className="data-table-wrap"><table className="data-table"><thead><tr>{role === "MASTER_ADMIN" && <th>Owner</th>}<th>Tenant & bill</th><th>Amount & due</th><th>Tenant status</th><th>Final status</th><th>Notes</th>{role === "ADMIN" && <th>Actions</th>}</tr></thead><tbody>{bills.map((bill) => <tr key={bill.id}>{role === "MASTER_ADMIN" && <td><b>{bill.admin.name}</b><small>{bill.admin.email}</small></td>}<td><b>{bill.tenant.name}</b><small>{bill.billType === "WATER" ? "Water" : "Electricity"} · {months[bill.billingMonth - 1]} {bill.billingYear}</small></td><td><b>{money(bill.amount)}</b><small>Due {date(bill.dueDate)}</small></td><td><Status type={bill.tenantPaymentStatus}>{tenantLabels[bill.tenantPaymentStatus]}</Status><small>{date(bill.tenantMarkedAt)}</small></td><td><Status type={bill.adminVerificationStatus}>{adminLabels[bill.adminVerificationStatus]}</Status><small>{date(bill.adminVerifiedAt)}</small></td><td><small><b>Tenant:</b> {bill.tenantNote || "—"}</small><small><b>Admin:</b> {bill.adminNote || "—"}</small></td>{role === "ADMIN" && <td className="action-cell"><textarea aria-label={`Admin note for ${bill.tenant.name}`} value={notes[bill.id] ?? ""} onChange={(e) => setNotes((current) => ({ ...current, [bill.id]: e.target.value }))} placeholder="Admin note" /><div><button disabled={saving === bill.id} onClick={() => verify(bill, "VERIFIED_PAID")}>Verify paid</button><button disabled={saving === bill.id} onClick={() => verify(bill, "UNPAID")}>Unpaid</button><button disabled={saving === bill.id} onClick={() => verify(bill, "OVERDUE")}>Overdue</button><button disabled={saving === bill.id} onClick={() => verify(bill, "REJECTED_CLAIM")}>Reject</button><button disabled={saving === bill.id} onClick={() => verify(bill, "WAIVED")}>Waive</button></div></td>}</tr>)}</tbody></table></div></section>; }

function TenantDirectory({ tenants, setTenants, onNotify }: { tenants: Person[]; setTenants: React.Dispatch<React.SetStateAction<Person[]>>; onNotify: (type: "success" | "error", text: string) => void }) {
  const [adding, setAdding] = useState(false); const [editing, setEditing] = useState<Person | null>(null);
  return <div className="view-stack"><section className="view-heading"><div><p className="kicker">Your portfolio</p><h2>Tenant directory</h2><p>Add and maintain only the tenants assigned to your owner account.</p></div><button className="primary-action compact" onClick={() => setAdding(true)}><Plus />Add tenant</button></section>{tenants.length ? <div className="tenant-grid">{tenants.map((tenant) => <article className="tenant-card" key={tenant.id}><Avatar name={tenant.name} /><div><h3>{tenant.name}</h3><p>{tenant.email}</p><Status type="VERIFIED_PAID">Approved</Status></div><div className="tenant-actions"><button aria-label={`Edit ${tenant.name}`} onClick={() => setEditing(tenant)}><Pencil /></button><DeleteAction compact endpoint={`/api/tenants/${tenant.id}`} itemName={tenant.name} onDone={() => setTenants((current) => current.filter((item) => item.id !== tenant.id))} notify={onNotify} /></div></article>)}</div> : <EmptyState icon={UsersRound} title="No tenants yet" text="Add your first tenant to start tracking their utility bills." />} {(adding || editing) && <TenantForm tenant={editing} onClose={() => { setAdding(false); setEditing(null); }} onSaved={(tenant) => { setTenants((current) => editing ? current.map((t) => t.id === tenant.id ? tenant : t) : [...current, tenant]); setAdding(false); setEditing(null); onNotify("success", editing ? "Tenant updated." : "Tenant added successfully."); }} onError={(text) => onNotify("error", text)} />}</div>;
}

function TenantForm({ tenant, onClose, onSaved, onError }: { tenant: Person | null; onClose: () => void; onSaved: (tenant: Person) => void; onError: (text: string) => void }) { const [saving, setSaving] = useState(false); const [show, setShow] = useState(false); async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); setSaving(true); try { const data = await request<{ tenant: Person }>(tenant ? `/api/tenants/${tenant.id}` : "/api/tenants", { method: tenant ? "PATCH" : "POST", body: JSON.stringify(Object.fromEntries(form)) }); onSaved(data.tenant); } catch (error) { onError(error instanceof Error ? error.message : "Unable to save tenant."); } finally { setSaving(false); } } return <div className="modal-backdrop"><section className="form-modal"><button className="icon-button close" onClick={onClose} aria-label="Close"><X /></button><p className="kicker">Tenant account</p><h2>{tenant ? "Edit tenant" : "Add a tenant"}</h2><form className="modal-form" onSubmit={submit}><label>Full name<input name="name" defaultValue={tenant?.name} placeholder="Tenant’s full name" required minLength={2} /></label><label>Email<input name="email" type="email" defaultValue={tenant?.email} placeholder="tenant@example.com" required /></label>{!tenant && <label>Temporary password<div className="password-field"><input name="password" type={show ? "text" : "password"} placeholder="12+ characters, mixed case, number & symbol" minLength={12} required /><button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button></div></label>}<button className="primary-action" disabled={saving}>{saving ? <Loader2 className="spin" /> : <Check />}{tenant ? "Save changes" : "Create tenant"}</button></form></section></div>; }
function ConfirmModal({ title, text, onCancel, onConfirm }: { title: string; text: string; onCancel: () => void; onConfirm: () => void }) { return <div className="modal-backdrop"><section className="confirm-modal"><span><Trash2 /></span><h2>{title}</h2><p>{text}</p><div><button onClick={onCancel}>Cancel</button><button className="danger-button" onClick={onConfirm}>Remove tenant</button></div></section></div>; }

function Status({ type, children }: { type: string; children: React.ReactNode }) { return <span className={`status status-${type.toLowerCase()}`}>{children}</span>; }
function Avatar({ name }: { name: string }) { return <span className="avatar">{name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span>; }
function EmptyState({ icon: Icon, title, text }: { icon: typeof Home; title: string; text: string }) { return <div className="empty-state"><span><Icon /></span><h3>{title}</h3><p>{text}</p></div>; }
function LoadingScreen() { return <div className="loading-screen"><span className="mini-logo">RW</span><Loader2 className="spin" /><p>Preparing your rental workspace…</p></div>; }
function roleName(role: Role) { return role === "MASTER_ADMIN" ? "Master Admin" : role === "ADMIN" ? "Admin / Owner" : "Tenant / User"; }
function viewTitle(view: View, role: Role) { if (view === "usage") return "Live website usage"; if (view === "complaints") return "Complaints"; if (view === "notices") return "Notice board"; if (view === "receipts") return "Rent receipts"; if (view === "calendar") return "Rental calendar"; if (view === "owners") return "Owner governance"; if (view === "master-tenants") return "Tenant visibility"; if (view === "support") return "Issue management"; if (view === "activity") return "Security audit"; if (view === "tenants") return "Tenant management"; if (view === "analytics") return role === "MASTER_ADMIN" ? "Master analytics" : "Owner analytics"; if (view === "rent") return role === "TENANT" ? "My rent" : "Rent tracking"; if (view === "documents") return role === "TENANT" ? "My documents" : "Document verification"; if (view === "bills") return role === "TENANT" ? "My bills" : "Utility records"; return role === "MASTER_ADMIN" ? "Master Admin Dashboard" : role === "ADMIN" ? "Admin Dashboard" : "Tenant Dashboard"; }
function overviewHeading(role: Role) { return role === "MASTER_ADMIN" ? "Your whole rental network, at a glance." : role === "ADMIN" ? "Every tenant record, neatly under control." : "Your bills and rental status, without the guesswork."; }
function overviewText(role: Role) { return role === "MASTER_ADMIN" ? "Monitor owner activity and payment verification across the portfolio." : role === "ADMIN" ? "Review claims, add records, and keep tenants informed from one calm workspace." : "Report payment status and follow the owner’s final verification in one clear timeline."; }
