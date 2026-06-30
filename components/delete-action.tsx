"use client";

import { useState } from "react";
import { Loader2, RotateCcw, Trash2, X } from "lucide-react";

async function send(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "The action could not be completed.");
}

export function DeleteAction({ endpoint, itemName, onDone, notify, compact = false }: {
  endpoint: string;
  itemName: string;
  onDone: () => void;
  notify: (type: "success" | "error", text: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      await send(endpoint, { method: "DELETE", body: JSON.stringify({ reason, confirmation }) });
      onDone(); setOpen(false); setReason(""); setConfirmation("");
      notify("success", `${itemName} moved to Deleted Records.`);
    } catch (error) { notify("error", error instanceof Error ? error.message : "Unable to delete record."); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" className="danger-soft delete-trigger" onClick={() => setOpen(true)} title={`Delete ${itemName}`}><Trash2 />{!compact && "Delete"}</button>
    {open && <div className="modal-backdrop"><section className="form-modal deletion-modal" role="dialog" aria-modal="true" aria-label={`Delete ${itemName}`}>
      <button className="icon-button close" onClick={() => setOpen(false)} aria-label="Close"><X /></button>
      <p className="kicker">Protected deletion</p><h2>Move to Deleted Records?</h2>
      <p><b>{itemName}</b> will disappear from normal screens. Master Admin can restore it later, and this action is recorded in the audit log.</p>
      <label>Reason for deletion<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={500} placeholder="Explain why this record should be removed" required /></label>
      <label>Type DELETE to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" placeholder="DELETE" /></label>
      <div className="deletion-actions"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="button" className="danger-action" disabled={busy || confirmation !== "DELETE" || reason.trim().length < 5} onClick={remove}>{busy ? <Loader2 className="spin" /> : <Trash2 />}Move to Deleted Records</button></div>
    </section></div>}
  </>;
}

export function RestoreAction({ endpoint, itemName, onDone, notify }: {
  endpoint: string; itemName: string; onDone: () => void; notify: (type: "success" | "error", text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function restore() { setBusy(true); try { await send(endpoint, { method: "PATCH", body: JSON.stringify({ confirmation: "RESTORE" }) }); onDone(); notify("success", `${itemName} restored.`); } catch (error) { notify("error", error instanceof Error ? error.message : "Unable to restore record."); } finally { setBusy(false); } }
  return <button type="button" disabled={busy} onClick={restore}>{busy ? <Loader2 className="spin" /> : <RotateCcw />}Restore</button>;
}
