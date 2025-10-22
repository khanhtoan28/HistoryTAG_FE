// AuthLayout.tsx
import React, { useEffect, useRef, useState } from "react";
import GridShape from "../../components/common/GridShape";
import { Link } from "react-router-dom";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const recalc = () => {
      const c = containerRef.current;
      const i = innerRef.current;
      if (!c || !i) return;

      // tăng padding top/bottom để không chạm sát viền trên
      const padTop = 32;
      const padBottom = 28;
      const available = c.clientHeight - padTop - padBottom;
      const real = i.scrollHeight;

      // Thu nhỏ thêm một chút và không phóng quá to
      const desired = available / real;          // =1 là vừa khít
      const s = Math.max(0.60, Math.min(0.92, desired)); // min 92%, max 103%
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
    <div className="w-screen h-screen overflow-hidden">
      <div className="flex h-full w-full">
        {/* LEFT */}
        <div
          ref={containerRef}
          className="relative flex flex-1 h-full bg-brand-950 text-white items-start justify-center"
        >
          {/* đẩy xuống nhẹ bằng padding top, KHÔNG translate âm nữa */}
          <div className="w-full flex justify-center pt-[4vh]">
            <div
              className="origin-top transition-transform duration-300 ease-out"
              style={{
                transform: `scale(${scale})`,
                width: "100%",
                maxWidth: "650px",   // ↓ nhỏ hơn
                padding: "0 2rem",
              }}
            >
              <div ref={innerRef}>{children}</div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div
          className="
            relative hidden lg:flex h-full shrink-0
            items-center justify-center bg-white overflow-hidden
            w-[clamp(420px,38vw,520px)]
          "
        >
          <div className="absolute inset-0 pointer-events-none">
            <GridShape />
          </div>
          <Link to="/" className="relative z-10 block">
            <img
              src="/images/logo/logo.jpg"
              alt="Logo"
              className="w-full max-w-[340px] object-contain"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
