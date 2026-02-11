// TetAuthPageLayout.tsx – Giao diện Tết Bính Ngọ 2026
// Import vào SignIn.tsx thay cho AuthPageLayout.tsx, hết Tết đổi lại.
import React, { useEffect, useRef, useState } from "react";
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

