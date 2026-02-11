// TetAuthPageLayout.tsx – Giao diện Tết Bính Ngọ 2026
// Import vào SignIn.tsx thay cho AuthPageLayout.tsx, hết Tết đổi lại.
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";

/* ───────────────────── CSS keyframes ───────────────────── */
const tetStyles = `
@keyframes petalFall {
  0% { transform: translateY(-10vh) translateX(0) rotate(0deg) scale(1); opacity: 1; }
  25% { transform: translateY(22vh) translateX(15px) rotate(90deg) scale(0.95); opacity: 0.9; }
  50% { transform: translateY(50vh) translateX(-10px) rotate(180deg) scale(0.9); opacity: 0.8; }
  75% { transform: translateY(75vh) translateX(20px) rotate(270deg) scale(0.85); opacity: 0.5; }
  100% { transform: translateY(105vh) translateX(-5px) rotate(360deg) scale(0.8); opacity: 0; }
}
@keyframes lanternSway {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}
@keyframes sparkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes glowPulse {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.4)); }
  50% { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8)); }
}

/* 🎆 Mini fireworks – box-shadow technique (to + rõ) */
@keyframes miniFw1 {
  0%   { box-shadow: 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c); transform: scale(0.3); opacity: 1; }
  40%  { opacity: 1; }
  100% { box-shadow: -24px -36px 6px 0px var(--fw-c), 24px -32px 6px 0px var(--fw-c), 36px -8px 6px 0px var(--fw-c), -32px 16px 6px 0px var(--fw-c), 20px 28px 6px 0px var(--fw-c), -12px -42px 6px 0px var(--fw-c), 34px 18px 6px 0px var(--fw-c), -28px -20px 6px 0px var(--fw-c); transform: scale(1); opacity: 0; }
}
@keyframes miniFw2 {
  0%   { box-shadow: 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c); transform: scale(0.3); opacity: 1; }
  40%  { opacity: 1; }
  100% { box-shadow: 32px -28px 6px 0px var(--fw-c), -28px -36px 6px 0px var(--fw-c), -40px 4px 6px 0px var(--fw-c), 16px 32px 6px 0px var(--fw-c), 40px 12px 6px 0px var(--fw-c), -20px 36px 6px 0px var(--fw-c), -36px -14px 6px 0px var(--fw-c), 8px -40px 6px 0px var(--fw-c); transform: scale(1); opacity: 0; }
}
@keyframes miniFw3 {
  0%   { box-shadow: 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c), 0 0 4px var(--fw-c); transform: scale(0.3); opacity: 1; }
  40%  { opacity: 1; }
  100% { box-shadow: -36px -20px 6px 0px var(--fw-c), 28px -40px 6px 0px var(--fw-c), 44px 16px 6px 0px var(--fw-c), -16px 40px 6px 0px var(--fw-c), -40px -36px 6px 0px var(--fw-c), 12px 32px 6px 0px var(--fw-c), 38px -10px 6px 0px var(--fw-c), -30px 24px 6px 0px var(--fw-c); transform: scale(1); opacity: 0; }
}

.tet-petal {
  position: absolute;
  top: -40px;
  pointer-events: none;
  animation: petalFall linear infinite;
  z-index: 5;
}
.tet-lantern {
  animation: lanternSway 3s ease-in-out infinite;
  transform-origin: top center;
}
.tet-sparkle {
  animation: sparkle 2s ease-in-out infinite;
}
.tet-fadein {
  animation: fadeInUp 0.8s ease-out forwards;
}
.tet-glow {
  animation: glowPulse 3s ease-in-out infinite;
}
.mini-fw {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  pointer-events: none;
  z-index: 3;
  filter: brightness(1.3);
}
.mini-fw-1 { animation: miniFw1 var(--fw-dur) ease-out var(--fw-delay) infinite; }
.mini-fw-2 { animation: miniFw2 var(--fw-dur) ease-out var(--fw-delay) infinite; }
.mini-fw-3 { animation: miniFw3 var(--fw-dur) ease-out var(--fw-delay) infinite; }

/* 🧧 Lì xì rơi */
@keyframes envelopeFall {
  0%   { transform: translateY(0) rotate(0deg) scale(0.6); opacity: 0; }
  3%   { opacity: 1; transform: translateY(2vh) rotate(2deg) scale(1); }
  25%  { transform: translateY(25vh) rotate(-6deg) scale(1); opacity: 1; }
  50%  { transform: translateY(50vh) rotate(8deg) scale(1); opacity: 1; }
  75%  { transform: translateY(75vh) rotate(-4deg) scale(1); opacity: 1; }
  92%  { opacity: 1; }
  100% { transform: translateY(100vh) rotate(6deg) scale(0.9); opacity: 0; }
}
@keyframes envelopeGlow {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.4)); }
  50%  { filter: drop-shadow(0 0 16px rgba(255, 215, 0, 0.9)); }
}
.tet-envelope-track {
  position: absolute;
  top: 0;
  z-index: 100;
  pointer-events: none;
  animation: envelopeFall var(--env-dur) ease-in-out var(--env-delay) forwards;
  will-change: transform, opacity;
}
.tet-envelope-btn {
  cursor: pointer;
  pointer-events: auto;
  animation: envelopeGlow 1.5s ease-in-out infinite;
  transition: transform 0.15s, filter 0.15s;
  position: relative;
}
.tet-envelope-btn:hover { transform: scale(1.2); filter: drop-shadow(0 0 20px rgba(255, 215, 0, 1)) brightness(1.15); }
.tet-envelope-btn:active { transform: scale(0.9); }

/* 🎁 Prize popup */
@keyframes prizePopIn {
  0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
  50%  { transform: scale(1.1) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes prizeShine {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes confettiBurst {
  0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
  60%  { opacity: 1; }
  100% { transform: translate(var(--dx, 40px), var(--dy, -60px)) rotate(360deg) scale(0.3); opacity: 0; }
}
.prize-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
}
.prize-card {
  animation: prizePopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  position: relative;
}
.prize-amount {
  background: linear-gradient(90deg, #FFD700, #FFF8DC, #FFD700, #FFA500, #FFD700);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: prizeShine 2s linear infinite;
}
.confetti-piece {
  position: absolute;
  width: 8px; height: 8px;
  border-radius: 2px;
  animation: confettiBurst 1s ease-out forwards;
}
`;

/* ───────────────────── Hoa mai SVG ───────────────────── */
function MaiFlower({ size = 20, color = "#FFD700" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="20"
          cy="8"
          rx="6"
          ry="10"
          fill={color}
          transform={`rotate(${angle} 20 20)`}
          opacity="0.9"
        />
      ))}
      <circle cx="20" cy="20" r="4" fill="#B8860B" />
    </svg>
  );
}

/* ───────────────────── Đèn lồng SVG ───────────────────── */
function Lantern({ size = 60, color = "#DC2626" }: { size?: number; color?: string }) {
  const w = size;
  const h = size * 1.5;
  return (
    <svg width={w} height={h} viewBox="0 0 60 90" fill="none" className="tet-lantern">
      {/* Dây treo */}
      <line x1="30" y1="0" x2="30" y2="15" stroke="#B8860B" strokeWidth="2" />
      {/* Núm trên */}
      <rect x="22" y="13" width="16" height="6" rx="2" fill="#FFD700" />
      {/* Thân đèn */}
      <ellipse cx="30" cy="45" rx="22" ry="28" fill={color} />
      <ellipse cx="30" cy="45" rx="22" ry="28" fill="url(#lanternGrad)" />
      {/* Sọc trang trí */}
      <ellipse cx="30" cy="45" rx="22" ry="28" fill="none" stroke="#FFD700" strokeWidth="1.5" opacity="0.5" />
      <line x1="30" y1="17" x2="30" y2="73" stroke="#FFD700" strokeWidth="1" opacity="0.4" />
      {/* Núm dưới */}
      <rect x="24" y="71" width="12" height="5" rx="2" fill="#FFD700" />
      {/* Tua rua */}
      <line x1="27" y1="76" x2="27" y2="88" stroke="#DC2626" strokeWidth="1.5" />
      <line x1="30" y1="76" x2="30" y2="90" stroke="#DC2626" strokeWidth="1.5" />
      <line x1="33" y1="76" x2="33" y2="88" stroke="#DC2626" strokeWidth="1.5" />
      <defs>
        <radialGradient id="lanternGrad" cx="0.4" cy="0.35" r="0.6">
          <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* ───────────────────── Hoa mai rơi ───────────────────── */
function FallingPetals() {
  const petals = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: 12 + Math.random() * 14,
    duration: 6 + Math.random() * 8,
    delay: Math.random() * 10,
    color: Math.random() > 0.4 ? "#FFD700" : "#FFA500",
  }));
  return (
    <>
      {petals.map((p) => (
        <div
          key={p.id}
          className="tet-petal"
          style={{
            left: p.left,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          <MaiFlower size={p.size} color={p.color} />
        </div>
      ))}
    </>
  );
}

/* ───────────────────── Sparkles background ───────────────────── */
function Sparkles() {
  const dots = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: `${5 + Math.random() * 90}%`,
    top: `${5 + Math.random() * 90}%`,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 4,
  }));
  return (
    <>
      {dots.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full bg-yellow-300 tet-sparkle"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </>
  );
}

/* ───────────────────── 🎆 Pháo hoa mini CSS ───────────────────── */
const MINI_FW_COLORS = ["#FFD700", "#FF6B6B", "#FFA500", "#FF69B4", "#44FFFF", "#FF4444", "#FFE066"];

function MiniFireworks({ count = 8 }: { count?: number }) {
  const bursts = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: 8 + Math.random() * 84,
    top: 5 + Math.random() * 75,
    color: MINI_FW_COLORS[i % MINI_FW_COLORS.length],
    delay: Math.random() * 8,
    duration: 2.5 + Math.random() * 2,
    variant: (i % 3) + 1, // 1, 2, or 3
  }));

  return (
    <>
      {bursts.map((b) => (
        <div
          key={b.id}
          className={`mini-fw mini-fw-${b.variant}`}
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            backgroundColor: b.color,
            "--fw-c": b.color,
            "--fw-delay": `${b.delay}s`,
            "--fw-dur": `${b.duration}s`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

/* ───────────────────── 🧧 Phong bì lì xì SVG ───────────────────── */
function EnvelopeSVG({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 80 92" fill="none">
      {/* Thân phong bì */}
      <rect x="4" y="12" width="72" height="76" rx="6" fill="#DC2626" stroke="#B91C1C" strokeWidth="2" />
      {/* Gradient sáng */}
      <rect x="4" y="12" width="72" height="76" rx="6" fill="url(#envGrad)" />
      {/* Nắp phong bì */}
      <path d="M4 18 C4 14 6 12 10 12 L70 12 C74 12 76 14 76 18 L40 42 Z" fill="#EF4444" stroke="#B91C1C" strokeWidth="1.5" />
      {/* Viền vàng trang trí */}
      <rect x="12" y="30" width="56" height="48" rx="4" fill="none" stroke="#FFD700" strokeWidth="1.5" />
      {/* Chữ 福 */}
      <text x="40" y="62" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#FFD700" fontFamily="serif" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>福</text>
      {/* Shine */}
      <ellipse cx="26" cy="28" rx="8" ry="4" fill="white" opacity="0.15" transform="rotate(-20 26 28)" />
      <defs>
        <linearGradient id="envGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.3" />
          <stop offset="50%" stopColor="transparent" stopOpacity="0" />
          <stop offset="100%" stopColor="#991B1B" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ───────────────────── 🎁 Bảng giải thưởng lì xì ───────────────────── */
type PrizeItem = { label: string; isMoney: boolean; weight: number };

const PRIZE_TABLE: PrizeItem[] = [
  { label: "Một cái nịt ", isMoney: false, weight: 35 },
  { label: "Hai cái nịt", isMoney: false, weight: 10 },
  { label: "Ba cái nịt", isMoney: true, weight: 20 },
  { label: "Bốn cái nịt", isMoney: true, weight: 14 },
  { label: "Năm cái nịt", isMoney: true, weight: 9 },
  { label: "Sáu cái nịt", isMoney: true, weight: 6 },
  { label: "200,000đ", isMoney: true, weight: 4 },
  { label: "500,000đ", isMoney: true, weight: 2 },
];

function pickPrize(): PrizeItem {
  const total = PRIZE_TABLE.reduce((s, p) => s + p.weight, 0);
  let rand = Math.random() * total;
  for (const p of PRIZE_TABLE) {
    rand -= p.weight;
    if (rand <= 0) return p;
  }
  return PRIZE_TABLE[0];
}

const CONFETTI_COLORS = ["#FFD700", "#FF6B6B", "#FF69B4", "#44FFFF", "#FFA500", "#7C3AED", "#10B981"];

/* ───────────────────── 🎊 Popup mở lì xì ───────────────────── */
function PrizePopup({ prize, onClose }: { prize: PrizeItem; onClose: () => void }) {
  const confetti = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left: `${20 + Math.random() * 60}%`,
    top: `${20 + Math.random() * 40}%`,
    delay: Math.random() * 0.4,
    angle: Math.random() * 360,
    dx: (Math.random() - 0.5) * 120,
    dy: -(30 + Math.random() * 80),
  }));

  return (
    <div className="prize-overlay" onClick={onClose}>
      <div
        className="prize-card bg-gradient-to-br from-red-700 via-red-600 to-red-800 rounded-3xl p-8 max-w-sm w-[90vw] text-center shadow-2xl border-2 border-yellow-500/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti */}
        {prize.isMoney && confetti.map((c) => (
          <div
            key={c.id}
            className="confetti-piece"
            style={{
              left: c.left,
              top: c.top,
              backgroundColor: c.color,
              animationDelay: `${c.delay}s`,
              transform: `rotate(${c.angle}deg)`,
              "--dx": `${c.dx}px`,
              "--dy": `${c.dy}px`,
            } as React.CSSProperties}
          />
        ))}

        {/* Phong bì mở */}
        <div className="mb-4">
          <span className="text-6xl">🧧</span>
        </div>

        <p className="text-yellow-300/80 text-sm font-medium mb-2 tracking-wider">
          {prize.isMoney ? "🎉 CHÚC MỪNG! BẠN NHẬN ĐƯỢC" : ""}
        </p>

        <h2 className={`text-3xl font-extrabold mb-4 ${prize.isMoney ? "prize-amount" : "text-yellow-200"}`}>
          {prize.label}
        </h2>

        {prize.isMoney && (
          <p className="text-yellow-100/60 text-xs mb-4">
            * Giải thưởng mang tính chất vui Tết, chúc bạn năm mới phát tài! 🐴
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-2 px-8 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-red-900 font-bold rounded-full shadow-lg hover:shadow-xl transition-all text-sm"
        >
          {prize.isMoney ? "Nhận lì xì 🎊" : "Đóng ✨"}
        </button>
      </div>
    </div>
  );
}

/* ───────────────────── 🧧 Hệ thống lì xì rơi ───────────────────── */
type FallingEnvelope = {
  id: number;
  left: number;     // %
  duration: number;  // seconds
  delay: number;     // seconds
  size: number;
};

function LuckyEnvelopes() {
  const [envelopes, setEnvelopes] = useState<FallingEnvelope[]>([]);
  const [prize, setPrize] = useState<PrizeItem | null>(null);
  const nextId = useRef(0);

  const spawnEnvelope = useCallback(() => {
    const env: FallingEnvelope = {
      id: nextId.current++,
      left: 8 + Math.random() * 80,
      duration: 8 + Math.random() * 6, // 8-14s fall
      delay: 0,
      size: 40 + Math.random() * 16, // 40-56px
    };
    setEnvelopes((prev) => [...prev, env]);

    // Auto-remove after animation
    setTimeout(() => {
      setEnvelopes((prev) => prev.filter((e) => e.id !== env.id));
    }, (env.duration + env.delay) * 1000 + 500);
  }, []);

  // Spawn envelopes at random intervals
  useEffect(() => {
    // Spawn first one very quickly so user sees it
    const t1 = setTimeout(spawnEnvelope, 1500);
    // Spawn a second one shortly after
    const t2 = setTimeout(spawnEnvelope, 4000);

    // Then keep spawning at regular intervals
    const interval = setInterval(() => {
      spawnEnvelope();
    }, 7000 + Math.random() * 5000); // every 7-12s

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
    };
  }, [spawnEnvelope]);

  const handleClick = (envId: number) => {
    // Remove the clicked envelope
    setEnvelopes((prev) => prev.filter((e) => e.id !== envId));
    // Pick a prize
    setPrize(pickPrize());
  };

  return (
    <>
      {envelopes.map((env) => (
        <div
          key={env.id}
          className="tet-envelope-track"
          style={{
            left: `${env.left}%`,
            "--env-dur": `${env.duration}s`,
            "--env-delay": `${env.delay}s`,
          } as React.CSSProperties}
        >
          <div
            className="tet-envelope-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleClick(env.id);
            }}
            role="button"
            tabIndex={0}
            title="🧧 Bấm nhận lì xì!"
          >
            <EnvelopeSVG size={env.size} />
          </div>
        </div>
      ))}

      {prize && <PrizePopup prize={prize} onClose={() => setPrize(null)} />}
    </>
  );
}

/* ───────────────────── MAIN LAYOUT ───────────────────── */
export default function TetAuthLayout({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const recalc = () => {
      const c = containerRef.current;
      const i = innerRef.current;
      if (!c || !i) return;
      const padTop = 40;
      const padBottom = 40;
      const available = c.clientHeight - padTop - padBottom;
      const real = i.scrollHeight;
      const desired = available / real;
      const s = Math.max(0.7, Math.min(1.0, desired));
      setScale(s);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", recalc);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, []);

  return (
    <>
      {/* Inject CSS animations */}
      <style>{tetStyles}</style>

      <div className="w-screen h-screen overflow-hidden">
        <div className="flex h-full w-full">
          {/* ═══════════════ LEFT – Form đăng nhập ═══════════════ */}
          <div
            ref={containerRef}
            className="relative flex flex-1 h-full items-center justify-center overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #7F1D1D 0%, #991B1B 30%, #B91C1C 60%, #7F1D1D 100%)",
            }}
          >
            {/* 🧧 Lì xì rơi */}
            <LuckyEnvelopes />
            {/* 🎆 Pháo hoa mini */}
            <MiniFireworks count={8} />
            {/* Falling mai petals */}
            <FallingPetals />
            <Sparkles />

            {/* Đèn lồng trang trí trái */}
            <div className="absolute top-0 left-8 z-10 opacity-80">
              <Lantern size={45} />
            </div>
            <div className="absolute top-0 left-24 z-10 opacity-60">
              <Lantern size={35} color="#EF4444" />
            </div>

            {/* Đèn lồng trang trí phải */}
            <div className="absolute top-0 right-8 z-10 opacity-80">
              <Lantern size={45} />
            </div>
            <div className="absolute top-0 right-24 z-10 opacity-60">
              <Lantern size={35} color="#EF4444" />
            </div>

            {/* Viền vàng trang trí góc */}
            <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-yellow-500/40 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-yellow-500/40 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-yellow-500/40 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-yellow-500/40 rounded-br-lg" />

            {/* Greeting top */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center tet-fadein pointer-events-none">
              <p
                className="text-yellow-300 font-bold tracking-widest"
                style={{ fontSize: "clamp(0.65rem, 1.2vw, 0.85rem)", textShadow: "0 0 12px rgba(255,215,0,0.5)" }}
              >
                ✨ CHÚC MỪNG NĂM MỚI ✨
              </p>
            </div>

            {/* Form container */}
            <div className="w-full flex justify-center -mt-4 z-10">
              <div
                className="origin-center transition-transform duration-300 ease-out"
                style={{
                  transform: `scale(${scale})`,
                  width: "100%",
                  maxWidth: "450px",
                  padding: "0 2rem",
                }}
              >
                <div ref={innerRef}>{children}</div>
              </div>
            </div>

            {/* Bottom decoration */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-70">
              <div className="flex items-center gap-2">
                <MaiFlower size={14} />
                <span
                  className="text-yellow-400/80 text-xs tracking-wider"
                  style={{ textShadow: "0 0 6px rgba(255,215,0,0.3)" }}
                >
                  Bính Ngọ 2026
                </span>
                <MaiFlower size={14} />
              </div>
            </div>
          </div>

          {/* ═══════════════ RIGHT – Panel Tết ═══════════════ */}
          <div
            className="
              relative hidden lg:flex h-full shrink-0 flex-col
              items-center justify-center overflow-hidden
              w-[clamp(420px,38vw,520px)]
            "
            style={{
              background: "linear-gradient(180deg, #FEF3C7 0%, #FDE68A 30%, #FBBF24 70%, #F59E0B 100%)",
            }}
          >
            {/* Pattern overlay */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  #92400E 0px, #92400E 1px,
                  transparent 1px, transparent 20px
                )`,
              }}
            />

            {/* 🎆 Pháo hoa mini panel phải */}
            <MiniFireworks count={5} />

            {/* Sparkles */}
            <Sparkles />

            {/* Top lanterns */}
            <div className="absolute top-2 left-1/3 z-10 opacity-70">
              <Lantern size={40} />
            </div>
            <div className="absolute top-2 right-1/3 z-10 opacity-70">
              <Lantern size={40} />
            </div>

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center text-center px-8 tet-fadein" style={{ animationDelay: "0.3s" }}>
              {/* Câu đối trên */}
              <div
                className="mb-6 px-4 py-2 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #DC2626, #B91C1C)",
                  boxShadow: "0 4px 20px rgba(185, 28, 28, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                  border: "2px solid #FFD700",
                }}
              >
                <p className="text-yellow-300 font-bold text-lg" style={{ fontFamily: "serif", textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                  🧧 Tân Xuân Vạn Phúc 🧧
                </p>
              </div>

              {/* Logo */}
              <Link to="/" className="relative z-10 block mb-4">
                <div className="relative">
                  <div className="absolute -inset-3 bg-white/60 rounded-2xl blur-sm" />
                  <img
                    src="/images/logo/logo.jpg"
                    alt="Logo"
                    className="relative w-full max-w-[280px] object-contain rounded-xl shadow-lg"
                    style={{ border: "3px solid #FFD700" }}
                  />
                </div>
              </Link>

              {/* Năm Bính Ngọ – ảnh ngựa cute */}
              <div className="mt-4 mb-2 tet-glow">
                <img
                  src="/horse_no_bg.png"
                  alt="Ngựa Bính Ngọ 2026"
                  className="w-[160px] h-auto object-contain drop-shadow-lg"
                  style={{ filter: "drop-shadow(0 4px 12px rgba(185, 28, 28, 0.3))" }}
                />
              </div>

              <h2
                className="text-3xl font-extrabold mb-1"
                style={{
                  background: "linear-gradient(135deg, #92400E, #B45309, #D97706)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "none",
                  filter: "drop-shadow(0 2px 4px rgba(146,64,14,0.3))",
                }}
              >
                Xuân Bính Ngọ
              </h2>
              <p className="text-amber-800/80 text-sm font-medium tracking-wide mb-4">
                Năm mới 2026
              </p>

              {/* Câu đối dưới */}
              <div
                className="px-4 py-2 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, #DC2626, #B91C1C)",
                  boxShadow: "0 4px 20px rgba(185, 28, 28, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                  border: "2px solid #FFD700",
                }}
              >
                <p className="text-yellow-300 font-bold text-lg" style={{ fontFamily: "serif", textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                  🏮 Mã Đáo Thành Công 🏮
                </p>
              </div>

              {/* Hoa mai trang trí */}
              <div className="flex items-center gap-3 mt-6">
                <MaiFlower size={18} color="#D97706" />
                <MaiFlower size={24} color="#F59E0B" />
                <MaiFlower size={18} color="#D97706" />
                <MaiFlower size={24} color="#F59E0B" />
                <MaiFlower size={18} color="#D97706" />
              </div>
            </div>

            {/* Bottom mai flowers */}
            <div className="absolute bottom-6 left-6 opacity-50">
              <MaiFlower size={30} color="#D97706" />
            </div>
            <div className="absolute bottom-10 left-16 opacity-40">
              <MaiFlower size={22} color="#F59E0B" />
            </div>
            <div className="absolute bottom-6 right-6 opacity-50">
              <MaiFlower size={30} color="#D97706" />
            </div>
            <div className="absolute bottom-10 right-16 opacity-40">
              <MaiFlower size={22} color="#F59E0B" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

