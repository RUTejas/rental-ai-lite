"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, ExternalLink } from "lucide-react";
import { trackAnalytics } from "@/lib/analytics-client";

type DeferredPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallClient() {
  const [prompt, setPrompt] = useState<DeferredPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone); void trackAnalytics("install_page_view");
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as DeferredPrompt); void trackAnalytics("beforeinstallprompt_available"); };
    const complete = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", available); window.addEventListener("appinstalled", complete);
    return () => { window.removeEventListener("beforeinstallprompt", available); window.removeEventListener("appinstalled", complete); };
  }, []);
  async function install() {
    void trackAnalytics("pwa_install_button_click");
    if (!prompt) { document.getElementById("manual-install")?.scrollIntoView({ behavior: "smooth" }); void trackAnalytics("manual_install_instructions"); return; }
    void trackAnalytics("pwa_prompt_shown"); await prompt.prompt(); const choice = await prompt.userChoice;
    void trackAnalytics(choice.outcome === "accepted" ? "pwa_install_accepted" : "pwa_install_dismissed");
    setPrompt(null);
  }
  return <div className="install-actions"><button className="primary-action" onClick={() => void install()} disabled={installed}>{installed ? <CheckCircle2 /> : <Download />}{installed ? "App installed" : prompt ? "Install app" : "See manual steps"}</button><Link className="secondary-action" href="/"><ExternalLink />Open web app</Link></div>;
}
