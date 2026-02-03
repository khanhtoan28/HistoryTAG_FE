import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Firework {
  x: number;
  y: number;
  particles: Particle[];
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export default function TetCelebration() {
  // Get userId to create user-specific flag
  const userId = (() => {
    try {
      const id = localStorage.getItem("userId") || sessionStorage.getItem("userId");
      return id ? Number(id) : null;
    } catch {
      return null;
    }
  })();

  // Show each time user logs in (flag is per user, cleared on logout)
  const [show, setShow] = useState(() => {
    if (!userId) return false; // No userId = no show
    const key = `tetCelebrationShown_${userId}`;
    const hasSeen = localStorage.getItem(key);
    return !hasSeen;
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fireworksRef = useRef<Firework[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Colors for Tet theme (red, gold, yellow)
  const colors = ["#FF0000", "#FFD700", "#FFA500", "#FF6B6B", "#FFE66D", "#FF8C00"];

  useEffect(() => {
    if (!show) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Create initial fireworks
    const createFirework = (x: number, y: number) => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const particles: Particle[] = [];
      const particleCount = 50 + Math.random() * 30;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
        const speed = 2 + Math.random() * 3;
        particles.push({
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 60 + Math.random() * 40,
        });
      }

      fireworksRef.current.push({
        x,
        y,
        particles,
        color,
      });
    };

    // Create fireworks at random positions
    const createRandomFireworks = () => {
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const x = Math.random() * canvas.width;
          const y = Math.random() * (canvas.height * 0.6) + canvas.height * 0.2;
          createFirework(x, y);
        }, i * 200);
      }
    };

    // Initial burst
    createRandomFireworks();

    // Create more fireworks periodically
    const fireworkInterval = setInterval(() => {
      if (fireworksRef.current.length < 5) {
        createRandomFireworks();
      }
    }, 800);

    // Animation loop
    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      fireworksRef.current = fireworksRef.current.filter((firework) => {
        let hasAliveParticles = false;

        firework.particles.forEach((particle) => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.1; // gravity
          particle.vx *= 0.98; // friction
          particle.vy *= 0.98;
          particle.life++;

          if (particle.life < particle.maxLife) {
            hasAliveParticles = true;

            const alpha = 1 - particle.life / particle.maxLife;
            const size = 2 + alpha * 2;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = firework.color;
            ctx.beginPath();
            ctx.arc(particle.x + firework.x, particle.y + firework.y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });

        return hasAliveParticles;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      clearInterval(fireworkInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [show]);

  // Auto hide after 4 seconds and mark as shown (per user)
  useEffect(() => {
    if (!show || !userId) return;

    const timer = setTimeout(() => {
      setShow(false);
      const key = `tetCelebrationShown_${userId}`;
      localStorage.setItem(key, "true");
    }, 4000);

    return () => clearTimeout(timer);
  }, [show, userId]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[9999] pointer-events-none"
        >
          {/* Canvas for fireworks */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ background: "transparent" }}
          />

          {/* Text overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                duration: 0.8,
              }}
              className="text-center"
            >
              <motion.h1
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-6xl md:text-8xl font-bold mb-4"
                style={{
                  background: "linear-gradient(45deg, #FF0000, #FFD700, #FFA500)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 0 30px rgba(255, 215, 0, 0.5)",
                  filter: "drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))",
                }}
              >
                Chúc Mừng Năm Mới
              </motion.h1>
              <motion.p
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="text-2xl md:text-3xl font-semibold text-yellow-300"
                style={{
                  textShadow: "0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.6)",
                }}
              >
                🎉 An Khang Thịnh Vượng 🎉
              </motion.p>
            </motion.div>
          </div>

          {/* Confetti effect */}
          <ConfettiEffect />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Confetti component for extra celebration effect
function ConfettiEffect() {
  const confettiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const confetti = confettiRef.current;
    if (!confetti) return;

    const colors = ["#FF0000", "#FFD700", "#FFA500", "#FF6B6B", "#FFE66D"];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
      const piece = document.createElement("div");
      piece.style.position = "absolute";
      piece.style.width = `${5 + Math.random() * 10}px`;
      piece.style.height = `${5 + Math.random() * 10}px`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.top = `${-10 + Math.random() * 20}%`;
      piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "0";
      piece.style.opacity = "0.8";
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;

      confetti.appendChild(piece);

      // Animate confetti falling
      const animation = piece.animate(
        [
          {
            transform: `translateY(0) rotate(0deg)`,
            opacity: 0.8,
          },
          {
            transform: `translateY(${window.innerHeight + 100}px) rotate(${360 + Math.random() * 360}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 2000 + Math.random() * 2000,
          delay: Math.random() * 1000,
          easing: "cubic-bezier(0.5, 0, 0.5, 1)",
        }
      );

      animation.onfinish = () => piece.remove();
    }

    return () => {
      if (confetti) {
        confetti.innerHTML = "";
      }
    };
  }, []);

  return <div ref={confettiRef} className="absolute inset-0 pointer-events-none" />;
}

