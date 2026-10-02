import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ICONS } from "../data/catalog";
import { scrollToId, useStore } from "../store";
import CraftCanvas from "./CraftCanvas";
import { useLang } from "../i18n";

// Pointed Mughal arch as polygon points in a 0–100 box.
function archPoints() {
  const pts: [number, number][] = [];
  const bez = (t: number, a: number, b: number, c: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
  for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([bez(t, 0, 0, 28, 50), bez(t, 34, 12, 6, 0)]); }
  for (let i = 19; i >= 0; i--) { const [x, y] = pts[i]; pts.push([100 - x, y]); }
  pts.push([100, 100], [0, 100]);
  return pts;
}
const ARCH = archPoints();
const ARCH_CLIP = `polygon(${ARCH.map(([x, y]) => `${x}% ${y}%`).join(",")})`;
const ARCH_PATH = "M" + ARCH.map(([x, y]) => `${x} ${y}`).join("L") + "Z";

export function Arch({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={ARCH_PATH} fill="none" stroke="#E7BE63" strokeOpacity=".6" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute inset-3" style={{ clipPath: ARCH_CLIP }}>{children}</div>
    </div>
  );
}

export default function CraftJourney() {
  const { setFilter } = useStore();
  const { t, lang } = useLang();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  // Track which panel is centred as the row scrolls.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0, dist = Infinity;
        [...el.children].forEach((c, i) => { const ch = c as HTMLElement; const d = Math.abs(ch.offsetLeft + ch.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
        setActive(best);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);

  const go = (i: number) => {
    const el = track.current;
    const c = el?.children[Math.max(0, Math.min(ICONS.length - 1, i))] as HTMLElement | undefined;
    if (el && c) el.scrollTo({ left: c.offsetLeft - (el.clientWidth - c.offsetWidth) / 2, behavior: "smooth" });
  };

  return (
    <section id="icons" className="relative scroll-mt-16 py-[clamp(72px,10vw,130px)]" aria-label={t("Icons of UP", "यूपी की पहचान")}>
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-end justify-between gap-6 px-4 sm:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-marigold">{t("Icons of UP", "यूपी की पहचान")}</p>
          <h2 className="mt-4 max-w-[12em] font-display text-[clamp(44px,6vw,88px)] leading-[0.95]">{lang === "hi" ? <>शिल्प, जिन्हें दुनिया <span className="zari-text">उनके शहर से जानती है</span></> : <>Crafts the world knows <span className="zari-text">by their town</span></>}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => go(active - 1)} disabled={active === 0} aria-label={t("Previous craft", "पिछला शिल्प")} className="grid h-14 w-14 place-items-center rounded-full border border-white/20 transition hover:border-zari hover:text-zari disabled:opacity-30">
            <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true"><path d="M19 7H2M7 1 1 7l6 6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          </button>
          <button onClick={() => go(active + 1)} disabled={active === ICONS.length - 1} aria-label={t("Next craft", "अगला शिल्प")} className="grid h-14 w-14 place-items-center rounded-full bg-zari text-night transition hover:brightness-110 disabled:opacity-30">
            <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true"><path d="M1 7h17M13 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          </button>
        </div>
      </div>

      <div
        ref={track}
        className="mt-12 flex snap-x snap-mandatory gap-[5vw] overflow-x-auto md:mt-0 md:pt-[clamp(72px,11vw,160px)] overscroll-x-contain px-[6vw] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => { if (e.pointerType === "mouse" && track.current) drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false }; }}
        onPointerMove={(e) => {
          const d = drag.current, el = track.current;
          if (!d || !el) return;
          if (Math.abs(e.clientX - d.x) > 4) { d.moved = true; el.style.scrollSnapType = "none"; }
          el.scrollLeft = d.left - (e.clientX - d.x);
        }}
        onPointerUp={() => {
          const d = drag.current, el = track.current;
          drag.current = null;
          if (!d || !el) return;
          el.style.scrollSnapType = "";
          if (d.moved) go(active);
        }}
        onPointerLeave={() => { const el = track.current; if (drag.current && el) { drag.current = null; el.style.scrollSnapType = ""; go(active); } }}
        tabIndex={0}
        aria-label={t("Swipe through six crafts", "छह शिल्प देखने के लिए स्वाइप करें")}
      >
        {ICONS.map((c, i) => { const x = lang === "hi" ? c.hi : c; return (
          <motion.article
            key={c.name}
            animate={{ opacity: active === i ? 1 : 0.35, scale: active === i ? 1 : 0.94 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="grid w-[min(88vw,1060px)] shrink-0 snap-center items-center gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] md:gap-14"
          >
            <Arch className="mx-auto h-[min(42svh,360px)] w-[min(66vw,290px)] md:h-[min(62svh,560px)] md:w-full md:max-w-[420px]">
              <CraftCanvas art={c.art} seed={c.seed} label={t(`${c.name} from ${c.place}`, `${x.name}, ${x.place}`)} />
            </Arch>
            <div className="relative min-w-0 select-none">
              <span className="text-outline pointer-events-none absolute -top-[0.95em] left-0 hidden font-display md:block text-[clamp(64px,10vw,150px)] leading-none opacity-60" aria-hidden="true">{lang === "hi" ? c.name : c.hindi}</span>
              <p className="relative font-mono text-xs uppercase tracking-[0.25em] text-marigold">{String(i + 1).padStart(2, "0")} / {String(ICONS.length).padStart(2, "0")} · {x.place}</p>
              <h3 className="relative mt-3 font-display text-[clamp(38px,5vw,72px)] leading-none">{x.name}</h3>
              <div className="mt-6 flex items-baseline gap-4 border-t border-white/10 pt-5">
                <span className="zari-text font-display text-[clamp(44px,5.5vw,84px)] leading-none">{x.figure}</span>
                <span className="max-w-[12em] text-sm text-ivory/70">{x.figureLabel}</span>
              </div>
              <p className="mt-5 max-w-[34em] text-[17px] text-ivory/80">{x.fact}</p>
              <button
                onClick={() => { setFilter(c.filter); scrollToId("bazaar"); }}
                className="group mt-7 inline-flex items-center gap-3 rounded-full border border-zari/50 px-6 py-3 font-semibold text-zari transition hover:bg-zari hover:text-night"
              >
                {t(`Shop ${c.name}`, `${x.name} ख़रीदें`)}
                <svg width="18" height="12" viewBox="0 0 18 12" className="transition group-hover:translate-x-1" aria-hidden="true"><path d="M0 6h15M10 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
              </button>
            </div>
          </motion.article>
        ); })}
      </div>

      <div className="mx-auto mt-8 flex max-w-[1320px] justify-center gap-2 px-4" role="group" aria-label={t("Choose a craft", "शिल्प चुनें")}>
        {ICONS.map((c, i) => (
          <button key={c.name} onClick={() => go(i)} aria-label={lang === "hi" ? c.hi.name : c.name} aria-current={active === i} className="group grid h-8 place-items-center px-1">
            <motion.span animate={{ width: active === i ? 40 : 10 }} className={`block h-2.5 rounded-full ${active === i ? "bg-zari" : "bg-white/25 group-hover:bg-white/50"}`} />
          </button>
        ))}
      </div>
    </section>
  );
}
