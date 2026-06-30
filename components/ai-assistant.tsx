"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Check, Loader2, MessageCircle, Send, Sparkles, UserRound, X } from "lucide-react";

type Role = "MASTER_ADMIN" | "ADMIN" | "TENANT";
type Message = { id: number; sender: "assistant" | "user"; text: string };
const quick: Record<Role, string[]> = { TENANT: ["Check rent status", "Check bill status", "Document status", "Open complaints", "View receipt"], ADMIN: ["What needs attention?", "Pending payments", "Pending ID verification", "Open complaints", "Tenant summary"], MASTER_ADMIN: ["Live users", "Website analytics", "Owner performance", "Pending verifications", "Complaint analytics"] };
const roleLabel: Record<Role, string> = { TENANT: "Tenant assistant", ADMIN: "Owner assistant", MASTER_ADMIN: "Master intelligence" };

export function AIAssistant({ role }: { role: Role }) {
  const [open, setOpen] = useState(false); const [messages, setMessages] = useState<Message[]>([{ id: 1, sender: "assistant", text: "Hello — I’m your RentWise AI assistant. Ask me about rent, bills, documents, complaints, receipts, or dashboard analytics." }]); const [suggestions, setSuggestions] = useState(quick[role]); const [busy, setBusy] = useState(false); const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  async function ask(text: string) { if (!text.trim() || busy) return; setMessages((current) => [...current, { id: Date.now(), sender: "user", text: text.trim() }]); setBusy(true); try { const response = await fetch("/api/ai-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text.trim() }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "The assistant is temporarily unavailable."); setMessages((current) => [...current, { id: Date.now() + 1, sender: "assistant", text: data.reply }]); if (Array.isArray(data.suggestedActions)) setSuggestions(data.suggestedActions.slice(0, 6)); } catch (error) { setMessages((current) => [...current, { id: Date.now() + 1, sender: "assistant", text: `${error instanceof Error ? error.message : "I couldn’t answer that."} Try asking about rent, bills, documents, agreements, complaints, or analytics.` }]); } finally { setBusy(false); } }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const input = new FormData(form).get("message")?.toString() || ""; form.reset(); void ask(input); }
  return <>
    <motion.button className="ai-fab" onClick={() => setOpen(true)} whileHover={{ scale: 1.06 }} whileTap={{ scale: .96 }} aria-label="Open AI Assistant"><span><Sparkles /></span><MessageCircle /><b>AI</b></motion.button>
    <AnimatePresence>{open && <motion.aside className="ai-drawer" initial={{ opacity: 0, y: 25, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .97 }} transition={{ duration: .22 }}>
      <header><span><Bot /></span><div><small>{roleLabel[role]}</small><h2>RentWise AI Assistant</h2></div><button onClick={() => setOpen(false)} aria-label="Close AI Assistant"><X /></button></header>
      <div className="ai-trust"><Check />Answers are securely limited to your role and rental records.</div>
      <div className="ai-messages">{messages.map((message) => <div className={`ai-message ${message.sender}`} key={message.id}><span>{message.sender === "assistant" ? <Bot /> : <UserRound />}</span><p>{message.text}</p></div>)}{busy && <div className="ai-message assistant"><span><Bot /></span><div className="typing"><i /><i /><i /></div></div>}<div ref={endRef} /></div>
      <div className="ai-quick">{suggestions.map((item) => <button key={item} onClick={() => void ask(item)} disabled={busy}>{item}</button>)}</div>
      <form onSubmit={submit}><input name="message" maxLength={500} autoComplete="off" placeholder="Ask about your rental workspace…" aria-label="Ask RentWise AI" /><button disabled={busy} aria-label="Send message">{busy ? <Loader2 className="spin" /> : <Send />}</button></form>
      <footer>Rule-based rental intelligence · No AI API cost · No credentials shared</footer>
    </motion.aside>}</AnimatePresence>
  </>;
}

export function UsageTracker({ page }: { page: string }) { useEffect(() => { const heartbeat = () => fetch("/api/usage/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ page }) }).catch(() => undefined); void heartbeat(); const timer = window.setInterval(heartbeat, 45_000); return () => window.clearInterval(timer); }, [page]); return null; }

type Notification = { id: string; title: string; message: string; type: string; isRead: boolean; createdAt: string };
export function NotificationCenter() { const [items, setItems] = useState<Notification[]>([]); const [open, setOpen] = useState(false); useEffect(() => { fetch("/api/notifications").then((response) => response.ok ? response.json() : { notifications: [] }).then((data) => setItems(data.notifications || [])).catch(() => setItems([])); }, []); async function read(item: Notification) { if (!item.isRead) { await fetch(`/api/notifications/${item.id}`, { method: "PATCH" }); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry)); } } const unread = items.filter((item) => !item.isRead).length; return <div className="notification-center"><button className="icon-button notification" aria-label="Notifications" onClick={() => setOpen(!open)}><MessageCircle />{unread > 0 && <span />}</button>{open && <section><header><h3>Notifications</h3><small>{unread} unread</small></header>{items.length ? items.slice(0, 12).map((item) => <button key={item.id} className={item.isRead ? "read" : ""} onClick={() => void read(item)}><b>{item.title}</b><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString("en-IN")}</small></button>) : <p className="notification-empty">You’re all caught up.</p>}</section>}</div>; }
