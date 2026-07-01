import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Monitor, ShieldCheck, Smartphone } from "lucide-react";
import { InstallClient } from "@/components/install-client";
import { PublicHero, PublicShell } from "@/components/public-shell";

const steps = {
  Android: ["Open rental-ai-lite.vercel.app in Chrome, Edge, or Samsung Internet.", "Open the browser menu.", "Tap Install app or Add to Home screen.", "Confirm installation.", "Open RentWise Lite from your home screen."],
  "iPhone or iPad": ["Open rental-ai-lite.vercel.app in Safari.", "Tap the Share button.", "Choose Add to Home Screen.", "Tap Add.", "Open RentWise Lite from your home screen."],
  Desktop: ["Open rental-ai-lite.vercel.app in Chrome or Edge.", "Click the install icon in the address bar if it appears.", "Or open the browser menu and choose Install RentWise Lite.", "Launch it like a desktop app."]
};

export const metadata = { title: "Install App" };

export default function InstallPage() { return <PublicShell><section className="install-hero"><div><PublicHero eyebrow="Free browser installation" title="Install RentWise Lite" text="Use RentWise Lite like an app on your phone or desktop. No app-store download is required for the PWA method." /><InstallClient /><p className="install-trust"><ShieldCheck />HTTPS hosted · Automatic web updates · No private dashboard data cached</p></div><Image src="/icons/icon-512.png" width={240} height={240} alt="RentWise Lite app icon" priority /></section><section className="public-content" id="manual-install"><div className="platform-grid">{Object.entries(steps).map(([name, items]) => <article key={name}><span>{name === "Desktop" ? <Monitor /> : <Smartphone />}</span><h2>Install on {name}</h2><ol>{items.map((item) => <li key={item}>{item}</li>)}</ol></article>)}</div><section className="public-callout"><CheckCircle2 /><div><h2>Recommended free method</h2><p>PWA installation does not download an APK. Updates arrive automatically from the live HTTPS website, and live rental records still require an internet connection.</p></div></section><section className="troubleshooting"><h2>If the install option is not visible</h2><ul><li>Refresh the page and use an up-to-date browser.</li><li>Confirm the address begins with HTTPS.</li><li>Try Chrome or Edge on Android; on iPhone, use Safari.</li><li>If an old shortcut opens as a normal browser tab, remove it and install again.</li></ul><Link className="secondary-action" href="/contact-support">Contact support</Link></section></section></PublicShell>; }
