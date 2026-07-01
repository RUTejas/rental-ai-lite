import Link from "next/link";
import { WifiOff } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
export default function OfflinePage() { return <PublicShell><section className="offline-card"><WifiOff /><p className="kicker">Connection required</p><h1>You are offline</h1><p>RentWise Lite needs internet access for live rental records, login, dashboards, and admin/user data. Please reconnect and try again.</p><Link className="primary-action" href="/">Try again</Link></section></PublicShell>; }
