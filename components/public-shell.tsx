import Image from "next/image";
import Link from "next/link";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="public-page"><header className="public-nav"><Link className="public-brand" href="/"><Image src="/icons/icon-192.png" width={42} height={42} alt="" /><span><b>RentWise Lite</b><small>Rental management, clearly organized</small></span></Link><nav><Link href="/install">Install</Link><Link href="/download">Android APK</Link><Link href="/contact-support">Support</Link><Link className="public-open" href="/">Open app</Link></nav></header><main>{children}</main><footer className="public-footer"><div><b>RentWise Lite</b><p>First-party usage analytics help improve the service and monitor app activity.</p></div><nav><Link href="/privacy-policy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact-support">Support</Link><Link href="/delete-account">Delete account</Link></nav><small>© {new Date().getFullYear()} RentWise Lite · Created and developed by Tejas R U</small></footer></div>;
}

export function PublicHero({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <section className="public-hero"><p className="kicker">{eyebrow}</p><h1>{title}</h1><p>{text}</p></section>;
}

export function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="policy-section"><h2>{title}</h2>{children}</section>;
}
