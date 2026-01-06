import { useEffect, useRef } from "react";

// Component hoa đào và hoa mai rơi như tuyết - luôn hiển thị
export default function FlowerFall() {
  const containerRef = useRef<HTMLDivElement>(null);
  const flowersRef = useRef<HTMLDivElement[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Hoa đào (pink) và hoa mai (yellow) emoji
    const flowerTypes = ["🌸", "🌺", "🏵️"];
    const maxFlowers = 40; // Số lượng hoa tối đa trên màn hình

    // Hàm tạo một hoa mới
    const createFlower = () => {
      if (flowersRef.current.length >= maxFlowers) return;

      const flower = document.createElement("div");
      flower.style.position = "fixed"; // Dùng fixed để không bị ảnh hưởng bởi scroll
      flower.style.fontSize = `${18 + Math.random() * 22}px`; // Kích thước hoa 18-40px
      flower.style.left = `${Math.random() * 100}%`;
      flower.style.top = `${-50 - Math.random() * 50}px`; // Bắt đầu từ trên màn hình
      flower.style.opacity = "0.9";
      flower.style.pointerEvents = "none";
      flower.style.userSelect = "none";
      flower.style.zIndex = "9998"; // Dưới TetCelebration nhưng trên nội dung
      flower.textContent = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];

      // Thêm rotation ban đầu
      const initialRotation = Math.random() * 360;
      flower.style.transform = `rotate(${initialRotation}deg)`;

      container.appendChild(flower);
      flowersRef.current.push(flower);

      // Tạo animation rơi với hiệu ứng sway (đung đưa)
      const duration = 2000 + Math.random() * 5000; // 4-10 giây
      const horizontalDrift = (Math.random() - 0.5) * 300; // Độ lệch ngang -150 đến 150px
      const rotationAmount = 360 + Math.random() * 720; // Xoay 1-3 vòng

      // Animation với keyframes để tạo hiệu ứng sway tự nhiên
      const keyframes = [
        {
          transform: `translateY(0) translateX(0) rotate(${initialRotation}deg)`,
          opacity: 0.9,
        },
        {
          transform: `translateY(${window.innerHeight * 0.25}px) translateX(${horizontalDrift * 0.25}px) rotate(${initialRotation + rotationAmount * 0.25}deg)`,
          opacity: 0.95,
          offset: 0.25,
        },
        {
          transform: `translateY(${window.innerHeight * 0.5}px) translateX(${horizontalDrift * 0.5}px) rotate(${initialRotation + rotationAmount * 0.5}deg)`,
          opacity: 0.9,
          offset: 0.5,
        },
        {
          transform: `translateY(${window.innerHeight * 0.75}px) translateX(${horizontalDrift * 0.75}px) rotate(${initialRotation + rotationAmount * 0.75}deg)`,
          opacity: 0.85,
          offset: 0.75,
        },
        {
          transform: `translateY(${window.innerHeight + 100}px) translateX(${horizontalDrift}px) rotate(${initialRotation + rotationAmount}deg)`,
          opacity: 0,
        },
      ];

      const animation = flower.animate(keyframes, {
        duration: duration,
        easing: "linear",
        fill: "forwards",
      });

      animation.onfinish = () => {
        flower.remove();
        flowersRef.current = flowersRef.current.filter((f) => f !== flower);
      };
    };

    // Tạo hoa ban đầu
    for (let i = 0; i < 15; i++) {
      setTimeout(() => createFlower(), i * 200); // Tạo từng hoa với delay
    }

    // Tạo hoa mới liên tục để duy trì số lượng
    intervalRef.current = window.setInterval(() => {
      if (flowersRef.current.length < maxFlowers) {
        createFlower();
      }
    }, 800); // Tạo hoa mới mỗi 800ms

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (container) {
        container.innerHTML = "";
      }
      flowersRef.current = [];
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 9998 }}
    />
  );
}
