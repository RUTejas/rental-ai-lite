"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { name: string; value: number };
type Summary = {
  stats: Record<string, number>;
  topPages: Point[]; deviceBreakdown: Point[]; browserBreakdown: Point[]; osBreakdown: Point[]; roleBreakdown: Point[];
  dailyVisitorsSeries: Array<{ date: string; visitors: number; pageViews: number }>;
  recentEvents: Array<{ id: string; eventType: string; path: string | null; userRole: string | null; deviceType: string | null; createdAt: string }>;
  recentAuditLogs: Array<{ id: string; action: string; actorName: string | null; actorRole: string | null; targetType: string | null; targetName: string | null; deleteReason: string | null; createdAt: string }>;
};
type LiveSession = { sessionId: string; visitor: string; role: string; currentPath: string | null; deviceType: string | null; browser: string | null; os: string | null; isPwa: boolean; lastSeenAt: string };

const colors = ["#2f7d5c", "#c69a5b", "#287589", "#d97706", "#7c5aa6", "#9f2d2d"];
const nice = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const time = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
async function get<T>(url: string): Promise<T> { const response = await fetch(url, { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to load analytics."); return data; }

export function FirstPartyAnalyticsView({ notify }: { notify: (type: "success" | "error", text: string) => void }) {
  const [summary, setSummary] = useState<Summary | null>(null); const [live, setLive] = useState<LiveSession[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async (quiet = false) => { if (!quiet) setLoading(true); try { const [nextSummary, realtime] = await Promise.all([get<Summary>("/api/master/analytics/summary"), get<{ sessions: LiveSession[] }>("/api/master/analytics/realtime")]); setSummary(nextSummary); setLive(realtime.sessions); } catch (error) { notify("error", error instanceof Error ? error.message : "Unable to load analytics."); } finally { if (!quiet) setLoading(false); } }, [notify]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(true), 45_000); return () => window.clearInterval(timer); }, [load]);
  if (loading || !summary) return <div className="master-skeleton-grid">{Array.from({ length: 12 }).map((_, index) => <span key={index} />)}</div>;
  const s = summary.stats;
  const cards = [["Active now", s.activeNow], ["Total unique visitors", s.totalUniqueVisitors], ["Today's visitors", s.todayUniqueVisitors], ["Today's page views", s.todayPageViews], ["Last 7 days", s.last7DaysUniqueVisitors], ["Last 30 days", s.last30DaysUniqueVisitors], ["Logged-in active", s.loggedInActiveUsers], ["Guest active", s.guestActiveVisitors], ["Tour started", s.tourStarted], ["Tour completed", s.tourCompleted], ["Tour skipped", s.tourSkipped], ["Install accepted", s.pwaInstallAccepted], ["Standalone launches", s.standaloneLaunches], ["APK download clicks", s.apkDownloadClicks]];
  return <div className="view-stack">
    <section className="view-heading"><div><p className="kicker">First-party product intelligence</p><h2>Website & app analytics</h2><p>Anonymous visitor, session, install-prompt, launch, and download-click measurements from RentWise Lite itself.</p></div><button className="primary-action compact" onClick={() => void load()}><RefreshCw />Refresh</button></section>
    <section className="usage-stat-grid">{cards.map(([label, value]) => <article key={String(label)}><small>{label}</small><strong>{value ?? 0}</strong></article>)}</section>
    <div className="usage-chart-grid">
      <Chart title="Daily visitors and page views"><ResponsiveContainer width="100%" height={250}><LineChart data={summary.dailyVisitorsSeries}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="visitors" stroke="#2f7d5c" strokeWidth={3} /><Line dataKey="pageViews" stroke="#c69a5b" strokeWidth={2} /></LineChart></ResponsiveContainer></Chart>
      <Donut title="Device breakdown" data={summary.deviceBreakdown} />
      <Chart title="Browser breakdown"><ResponsiveContainer width="100%" height={250}><BarChart data={summary.browserBreakdown}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#287589" /></BarChart></ResponsiveContainer></Chart>
      <Donut title="Role breakdown" data={summary.roleBreakdown} />
    </div>
    <section className="content-card table-card"><header className="card-header"><h3><Activity />Active sessions (last 5 minutes)</h3><span>{live.length} live</span></header><div className="data-table-wrap"><table className="data-table analytics-table"><thead><tr><th>Visitor</th><th>Role</th><th>Current page</th><th>Device</th><th>Browser / OS</th><th>Mode</th><th>Last seen</th></tr></thead><tbody>{live.map((item) => <tr key={item.sessionId}><td><b>{item.visitor}</b></td><td>{nice(item.role)}</td><td>{item.currentPath || "/"}</td><td>{item.deviceType || "Unknown"}</td><td>{item.browser || "Unknown"} · {item.os || "Unknown"}</td><td>{item.isPwa ? "Standalone app" : "Browser"}</td><td>{time(item.lastSeenAt)}</td></tr>)}</tbody></table>{!live.length && <Empty text="No session has sent a heartbeat in the last five minutes." />}</div></section>
    <div className="usage-chart-grid"><section className="content-card"><h3>Top pages</h3><div className="analytics-list">{summary.topPages.map((item) => <p key={item.name}><span>{item.name}</span><b>{item.value}</b></p>)}{!summary.topPages.length && <Empty text="Page views will appear after deployment and visits." />}</div></section><section className="content-card"><h3>Recent analytics events</h3><div className="analytics-list">{summary.recentEvents.slice(0, 15).map((item) => <p key={item.id}><span><b>{nice(item.eventType)}</b><small>{item.path || "/"} · {item.userRole ? nice(item.userRole) : "Guest"} · {item.deviceType || "Unknown"}</small></span><time>{time(item.createdAt)}</time></p>)}{!summary.recentEvents.length && <Empty text="No analytics events have been stored yet." />}</div></section></div>
    <section className="content-card"><h3>Recent delete and restore audit</h3><div className="analytics-list">{summary.recentAuditLogs.map((item) => <p key={item.id}><span><b>{nice(item.action)} · {item.targetName || item.targetType || "Record"}</b><small>{item.actorName || "System"} · {item.actorRole ? nice(item.actorRole) : "System"}{item.deleteReason ? ` · ${item.deleteReason}` : ""}</small></span><time>{time(item.createdAt)}</time></p>)}{!summary.recentAuditLogs.length && <Empty text="No deletion or restore actions have been recorded." />}</div></section>
  </div>;
}
function Chart({ title, children }: { title: string; children: React.ReactNode }) { return <section className="chart-card"><h3>{title}</h3>{children}</section>; }
function Donut({ title, data }: { title: string; data: Point[] }) { return <Chart title={title}>{data.length ? <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84}>{data.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <Empty text="This breakdown will populate after visits." />}</Chart>; }
function Empty({ text }: { text: string }) { return <div className="analytics-empty">{text}</div>; }
