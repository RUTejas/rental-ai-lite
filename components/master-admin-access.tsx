"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, LifeBuoy, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

type Mode = "login" | "reset" | "report" | "setup";

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to continue.");
  return data;
}

export function MasterAdminAccess() {
  const [mode, setMode] = useState<Mode>("login");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    api<{ setupAvailable: boolean }>("/api/auth/master/setup").then((data) => setSetupAvailable(data.setupAvailable)).catch(() => setSetupAvailable(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "login") {
        await api("/api/auth/master/login", { method: "POST", body: JSON.stringify(payload) });
        window.location.assign("/master-admin/dashboard");
        return;
      }
      if (mode === "reset") {
        const data = await api<{ message: string }>("/api/auth/master/reset", { method: "POST", body: JSON.stringify(payload) });
        setNotice({ kind: "success", text: data.message }); setMode("login");
      } else if (mode === "setup") {
        await api("/api/auth/master/setup", { method: "POST", body: JSON.stringify(payload) });
        setSetupAvailable(false); setNotice({ kind: "success", text: "Master Admin created. Sign in through secure access." }); setMode("login");
      } else {
        const data = await api<{ ticketId: string }>("/api/support", { method: "POST", body: JSON.stringify({ ...payload, role: "MASTER_ADMIN", issueType: "MASTER_ADMIN_LOGIN" }) });
        setNotice({ kind: "success", text: `Secure support report ${data.ticketId.slice(-6)} created.` }); setMode("login");
      }
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "Unable to continue." }); }
    finally { setBusy(false); }
  }

  const title = mode === "login" ? "Master Admin Secure Access" : mode === "reset" ? "Recover protected access" : mode === "setup" ? "One-time secure setup" : "Report a secure access issue";
  return <main className="master-access-page">
    <Image src="/rentwise-hero.png" alt="Premium residence interior" fill priority sizes="100vw" />
    <div className="master-access-shade" />
    <Link className="master-back" href="/"><ArrowLeft />Return to RentWise Lite</Link>
    <section className="master-access-copy"><span className="master-seal"><ShieldCheck /></span><p><Sparkles /> Portfolio command center</p><h1>Control with clarity.<br /><em>Lead with confidence.</em></h1><span>Encrypted session · Role-locked entry · Audited access</span></section>
    <section className="master-access-card" aria-live="polite">
      <header><span><LockKeyhole /></span><div><small>Restricted portal</small><h2>{title}</h2></div></header>
      <p className="master-access-intro">{mode === "login" ? "This entrance is reserved exclusively for the authorized RentWise Master Admin." : mode === "reset" ? "Verify the protected recovery key and choose a strong new password." : mode === "setup" ? "Creation is available once and closes permanently after completion." : "Send the details directly to the support queue."}</p>
      {notice && <div className={`master-notice ${notice.kind}`}>{notice.kind === "success" ? <Check /> : <LifeBuoy />}{notice.text}</div>}
      <form onSubmit={submit}>
        {(mode === "setup" || mode === "report") && <label>Your name<input name="name" minLength={2} maxLength={80} required placeholder="Authorized administrator" /></label>}
        <label>Master Admin email<input name="email" type="email" autoComplete="email" required placeholder="admin@company.com" /></label>
        {mode === "report" ? <label>Describe the access issue<textarea name="description" minLength={10} maxLength={2000} required placeholder="What happened while signing in?" /></label> : <>
          {(mode === "setup" || mode === "reset") && <label>Protected setup / recovery key<input name="setupKey" type="password" autoComplete="off" required placeholder="Server-issued key" /></label>}
          <label>{mode === "login" ? "Password" : "New strong password"}<div className="password-field"><input name="password" type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 12} required placeholder={mode === "login" ? "Enter your password" : "12+ characters, mixed case, number & symbol"} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff /> : <Eye />}</button></div></label>
          {mode === "setup" && <label>Confirm password<input name="confirmPassword" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} required placeholder="Repeat the strong password" /></label>}
        </>}
        <button className="master-submit" disabled={busy}>{busy ? <Loader2 className="spin" /> : <ShieldCheck />}{mode === "login" ? "Enter command center" : mode === "reset" ? "Reset protected password" : mode === "setup" ? "Create Master Admin" : "Submit secure report"}<ArrowRight /></button>
      </form>
      <div className="master-access-links">
        {mode === "login" ? <><button onClick={() => setMode("reset")}><KeyRound />Forgot password?</button><button onClick={() => setMode("report")}><LifeBuoy />Report login issue</button></> : <button onClick={() => { setMode("login"); setNotice(null); }}><ArrowLeft />Back to secure sign in</button>}
      </div>
      {setupAvailable && mode === "login" && <button className="setup-link" onClick={() => setMode("setup")}>Authorized first-time setup</button>}
      <footer><ShieldCheck />Protected by role validation on every request</footer>
    </section>
  </main>;
}
