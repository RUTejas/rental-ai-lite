"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { trackAnalytics } from "@/lib/analytics-client";

async function submitSupport(payload: Record<string, string>) {
  const response = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to submit your request."); return data as { ticketId: string };
}

export function SupportForm() {
  const [busy, setBusy] = useState(false); const [result, setResult] = useState(""); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); try { const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>; const data = await submitSupport({ ...form, issueType: form.issueType || "GENERAL_SUPPORT" }); setResult(`Support request ${data.ticketId.slice(-6)} was received.`); event.currentTarget.reset(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to submit your request."); } finally { setBusy(false); } }
  if (result) return <div className="form-success"><CheckCircle2 /><h2>Request received</h2><p>{result}</p></div>;
  return <form className="public-form" onSubmit={submit}><div className="form-row"><label>Name<input name="name" minLength={2} maxLength={80} required /></label><label>Registered email<input name="email" type="email" required /></label></div><label>Issue type<select name="issueType" defaultValue="GENERAL_SUPPORT"><option value="GENERAL_SUPPORT">General support</option><option value="LOGIN_ISSUE">Login issue</option><option value="SIGNUP_ISSUE">Signup issue</option><option value="RENTAL_RECORD">Rental record question</option><option value="PRIVACY_REQUEST">Privacy request</option></select></label><label>How can we help?<textarea name="description" minLength={10} maxLength={2000} required /></label>{error && <p className="form-error">{error}</p>}<button className="primary-action" disabled={busy}>{busy ? <Loader2 className="spin" /> : <Send />}Send support request</button></form>;
}

export function DeleteAccountForm() {
  const [busy, setBusy] = useState(false); const [result, setResult] = useState(""); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); try { const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>; const data = await submitSupport({ ...form, issueType: "ACCOUNT_DELETE_REQUEST", role: "ACCOUNT_HOLDER", description: `Account deletion request. Confirmation: ${form.confirmation}. Details: ${form.description}` }); void trackAnalytics("account_delete_request"); setResult(`Deletion request ${data.ticketId.slice(-6)} was received for identity verification.`); event.currentTarget.reset(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to submit your request."); } finally { setBusy(false); } }
  if (result) return <div className="form-success"><CheckCircle2 /><h2>Deletion request received</h2><p>{result}</p></div>;
  return <form className="public-form" onSubmit={submit}><label>Registered email<input name="email" type="email" required /></label><label>Request details<textarea name="description" minLength={10} maxLength={1500} placeholder="Tell us which account and data you want removed." required /></label><label>Type DELETE MY ACCOUNT<input name="confirmation" pattern="DELETE MY ACCOUNT" autoComplete="off" required /></label>{error && <p className="form-error">{error}</p>}<button className="danger-action" disabled={busy}>{busy ? <Loader2 className="spin" /> : <Send />}Request account deletion</button></form>;
}
