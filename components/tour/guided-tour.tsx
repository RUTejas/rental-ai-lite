"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "lucide-react";
import { trackAnalytics } from "@/lib/analytics-client";
import { roleBasedTourSteps, type TourRole } from "@/lib/tour-config";

type TourStatus = {
  tourSeen: boolean;
  tourCompleted: boolean;
  tourSkipped: boolean;
  tourCompletedAt: string | null;
};

type Rect = { top: number; left: number; width: number; height: number };
type Position = { top: number; left: number };

const padding = 10;

function readStatus(key: string): TourStatus | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as TourStatus : null;
  } catch {
    return null;
  }
}

function saveStatus(key: string, status: TourStatus) {
  try { localStorage.setItem(key, JSON.stringify(status)); } catch { /* Storage may be unavailable in private browsing. */ }
}

export function GuidedTour({
  role,
  userId,
  replayToken,
  onNavigate,
  onMenuChange
}: {
  role: TourRole;
  userId?: string;
  replayToken: number;
  onNavigate?: (view: string) => void;
  onMenuChange?: (open: boolean) => void;
}) {
  const steps = useMemo(() => roleBasedTourSteps[role], [role]);
  const storageKey = useMemo(
    () => role === "GUEST" ? "rentwise_tour_v1_guest" : `rentwise_tour_v1_${userId || "account"}_${role.toLowerCase()}`,
    [role, userId]
  );
  const [phase, setPhase] = useState<"closed" | "welcome" | "tour">("closed");
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const status = readStatus(storageKey);
    setStepIndex(0);
    setPhase(status?.tourCompleted || status?.tourSkipped ? "closed" : "welcome");
  }, [storageKey]);

  useEffect(() => {
    if (replayToken > 0) {
      setStepIndex(0);
      setRect(null);
      setPosition(null);
      setPhase("welcome");
    }
  }, [replayToken]);

  const closeAsSkipped = useCallback(() => {
    saveStatus(storageKey, { tourSeen: true, tourCompleted: false, tourSkipped: true, tourCompletedAt: null });
    void trackAnalytics("tour_skipped", { role, step: phase === "tour" ? stepIndex + 1 : 0 });
    onMenuChange?.(false);
    setPhase("closed");
  }, [onMenuChange, phase, role, stepIndex, storageKey]);

  const start = useCallback(() => {
    saveStatus(storageKey, { tourSeen: true, tourCompleted: false, tourSkipped: false, tourCompletedAt: null });
    void trackAnalytics("tour_started", { role });
    setStepIndex(0);
    setPhase("tour");
  }, [role, storageKey]);

  const finish = useCallback(() => {
    saveStatus(storageKey, { tourSeen: true, tourCompleted: true, tourSkipped: false, tourCompletedAt: new Date().toISOString() });
    void trackAnalytics("tour_completed", { role, steps: steps.length });
    onMenuChange?.(false);
    setPhase("closed");
  }, [onMenuChange, role, steps.length, storageKey]);

  useEffect(() => {
    if (phase === "closed") return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAsSkipped();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>("button")?.focus(), 0);
    return () => document.removeEventListener("keydown", handleKey);
  }, [closeAsSkipped, phase, stepIndex]);

  useEffect(() => {
    if (phase !== "tour") return;
    const step = steps[stepIndex];
    onMenuChange?.(Boolean(step.openMenu));
    if (step.view) onNavigate?.(step.view);
    let cancelled = false;
    let attempts = 0;
    let target: HTMLElement | null = null;

    const measure = () => {
      if (!target || cancelled) return;
      const next = target.getBoundingClientRect();
      const highlighted: Rect = {
        top: Math.max(6, next.top - padding),
        left: Math.max(6, next.left - padding),
        width: Math.min(window.innerWidth - 12, next.width + padding * 2),
        height: Math.min(window.innerHeight - 12, next.height + padding * 2)
      };
      setRect(highlighted);
      const tooltipWidth = Math.min(400, window.innerWidth - 32);
      const below = highlighted.top + highlighted.height + 18;
      const above = highlighted.top - 18 - 310;
      const top = below + 300 <= window.innerHeight ? below : Math.max(16, above);
      const left = Math.max(16, Math.min(highlighted.left, window.innerWidth - tooltipWidth - 16));
      setPosition({ top, left });
    };

    const locate = () => {
      if (cancelled) return;
      if (!step.target) {
        setRect(null);
        setPosition(null);
        return;
      }
      target = document.querySelector<HTMLElement>(step.target);
      if (!target) {
        attempts += 1;
        if (attempts < 8) window.setTimeout(locate, 120);
        else if (stepIndex < steps.length - 1) setStepIndex((current) => current + 1);
        else finish();
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      window.setTimeout(measure, 260);
    };

    const refresh = () => measure();
    window.setTimeout(locate, step.view || step.openMenu ? 180 : 20);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [finish, onMenuChange, onNavigate, phase, stepIndex, steps]);

  if (phase === "closed") return null;

  if (phase === "welcome") {
    return <div className="tour-layer tour-welcome-layer">
      <section className="tour-welcome" role="dialog" aria-modal="true" aria-labelledby="tour-welcome-title" ref={dialogRef}>
        <button className="tour-close" onClick={closeAsSkipped} aria-label="Skip app guide"><X /></button>
        <span className="tour-emblem"><Sparkles /></span>
        <p className="kicker">A quick guided experience</p>
        <h2 id="tour-welcome-title">Welcome to RentWise Lite</h2>
        <p>Let us quickly show you the most useful parts of {role === "GUEST" ? "the app" : "your dashboard"}.</p>
        <div className="tour-welcome-actions">
          <button className="tour-skip-button" onClick={closeAsSkipped}>Skip</button>
          <button className="tour-primary-button" onClick={start}>Start Guide <ArrowRight /></button>
        </div>
        <small>You can replay this tutorial later from the guide button.</small>
      </section>
    </div>;
  }

  const step = steps[stepIndex];
  const finalStep = stepIndex === steps.length - 1;
  return <div className={`tour-layer ${rect ? "tour-layer-spotlight" : "tour-layer-dim"}`} aria-live="polite">
    {rect && <div className="tour-spotlight" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />}
    <section
      key={step.id}
      className={`tour-tooltip ${rect ? "" : "tour-tooltip-centered"}`}
      style={position && rect ? { top: position.top, left: position.left } : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
      ref={dialogRef}
    >
      <header>
        <span>Step {stepIndex + 1} of {steps.length}</span>
        <button onClick={closeAsSkipped} aria-label="Skip app guide">Skip <X /></button>
      </header>
      <div className="tour-progress" aria-hidden="true"><i style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div>
      <span className="tour-step-icon">{finalStep ? <Check /> : <Sparkles />}</span>
      <h2 id="tour-step-title">{step.title}</h2>
      <p>{step.description}</p>
      <footer>
        <button className="tour-back-button" disabled={stepIndex === 0} onClick={() => setStepIndex((current) => Math.max(0, current - 1))}><ArrowLeft /> Back</button>
        <button className="tour-primary-button" onClick={finalStep ? finish : () => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}>
          {finalStep ? "Finish" : "Next"} {finalStep ? <Check /> : <ArrowRight />}
        </button>
      </footer>
    </section>
  </div>;
}
