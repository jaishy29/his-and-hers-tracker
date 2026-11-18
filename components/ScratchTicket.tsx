"use client";
import { useEffect, useRef } from "react";

/** Silver foil you scratch off with a finger or mouse. Calls onDone once about half is cleared. */
export default function ScratchTicket({ label, sub, onDone }: { label: string; sub: string; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const c = ref.current;
    const box = c?.parentElement;
    if (!c || !box) return;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) return;
    const css = getComputedStyle(document.documentElement);
    let touched = false;

    const paint = () => {
      const r = box.getBoundingClientRect();
      if (!r.width) return false;
      const dpr = window.devicePixelRatio || 1;
      c.width = r.width * dpr;
      c.height = r.height * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gr = g.createLinearGradient(0, 0, r.width, r.height);
      gr.addColorStop(0, css.getPropertyValue("--foil1").trim());
      gr.addColorStop(0.5, css.getPropertyValue("--foil2").trim());
      gr.addColorStop(1, css.getPropertyValue("--foil1").trim());
      g.fillStyle = gr;
      g.fillRect(0, 0, r.width, r.height);
      g.fillStyle = "rgba(0,0,0,.45)";
      g.textAlign = "center";
      g.font = `900 22px ${css.getPropertyValue("--font-display")}`;
      g.fillText(label, r.width / 2, r.height / 2 + 4);
      g.font = `600 11px ${css.getPropertyValue("--font-body")}`;
      g.fillText(sub, r.width / 2, r.height / 2 + 24);
      return true;
    };

    let ro: ResizeObserver | null = null;
    // Wait for fonts so the foil text uses the right typeface.
    document.fonts?.ready.then(() => { if (!touched) paint(); });
    if (!paint()) {
      ro = new ResizeObserver(() => { if (paint()) ro?.disconnect(); });
      ro.observe(box);
    }

    let down = false;
    let claimed = false;
    let last: { x: number; y: number } | null = null;
    // Clears a thick line from the previous finger position, so fast swipes leave no gaps.
    const scratchAt = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const pt = { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
      const from = last ?? pt;
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "destination-out";
      g.lineCap = "round";
      g.lineWidth = 36 * dpr;
      g.beginPath();
      g.moveTo(from.x, from.y);
      g.lineTo(pt.x + 0.01, pt.y);
      g.stroke();
      g.restore();
      last = pt;
    };
    const check = () => {
      if (claimed) return;
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let clear = 0, tot = 0;
      for (let i = 3; i < d.length; i += 64) { tot++; if (d[i] < 40) clear++; }
      if (clear / tot > 0.5) {
        claimed = true;
        c.style.transition = "opacity .5s";
        c.style.opacity = "0";
        setTimeout(() => doneRef.current(), 500);
      }
    };
    const onDown = (e: PointerEvent) => { down = true; touched = true; last = null; c.setPointerCapture(e.pointerId); scratchAt(e); };
    const onMove = (e: PointerEvent) => { if (down) scratchAt(e); };
    const onUp = () => { if (down) { down = false; last = null; check(); } };
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerup", onUp);
    c.addEventListener("pointercancel", onUp);
    return () => {
      ro?.disconnect();
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerup", onUp);
      c.removeEventListener("pointercancel", onUp);
    };
  }, [label, sub]);

  return <canvas ref={ref} aria-label={`${label}: drag to scratch`} />;
}
