import { useEffect, useRef, memo } from 'react';
import Box from '@mui/joy/Box';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Firework {
  x: number;
  y: number;
  particles: Particle[];
}

interface FireworksEffectProps {
  trigger: number;
}

const FireworksEffect = memo(function FireworksEffect({ trigger }: FireworksEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const fireworksRef = useRef<Firework[]>([]);
  const burstCountRef = useRef(0);
  const nextBurstTimeRef = useRef(0);

  useEffect(() => {
    if (trigger === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Reset refs
    fireworksRef.current = [];
    burstCountRef.current = 0;
    nextBurstTimeRef.current = performance.now();

    // OSRS-style colors
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

    const createBurst = () => {
      const newFireworks: Firework[] = [];
      const numFireworks = 5 + Math.floor(Math.random() * 4);

      for (let i = 0; i < numFireworks; i++) {
        const x = canvas.width * (0.2 + Math.random() * 0.6);
        const y = canvas.height * (0.2 + Math.random() * 0.4);
        const color = colors[Math.floor(Math.random() * colors.length)];

        const particles: Particle[] = [];
        const particleCount = 12 + Math.floor(Math.random() * 8);

        for (let j = 0; j < particleCount; j++) {
          const angle = (j / particleCount) * Math.PI * 2;
          const speed = 1.5 + Math.random() * 2.5;

          particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 60,
            maxLife: 60,
            color,
          });
        }

        newFireworks.push({ x, y, particles });
      }

      return newFireworks;
    };

    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 16, 2); // Cap delta for slow frames
      lastTime = currentTime;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      fireworksRef.current = fireworksRef.current
        .map(fw => {
          fw.particles = fw.particles
            .map(p => {
              p.x += p.vx * 0.8 * deltaTime;
              p.y += p.vy * 0.8 * deltaTime + 0.08 * deltaTime;
              p.vy += 0.04 * deltaTime;
              p.life -= deltaTime;
              return p;
            })
            .filter(p => p.life > 0);

          return fw;
        })
        .filter(fw => fw.particles.length > 0);

      // Draw all particles in batches by color for better performance
      const particlesByColor = new Map<string, Particle[]>();
      
      fireworksRef.current.forEach(fw => {
        fw.particles.forEach(p => {
          if (!particlesByColor.has(p.color)) {
            particlesByColor.set(p.color, []);
          }
          particlesByColor.get(p.color)!.push(p);
        });
      });

      // Draw particles grouped by color
      particlesByColor.forEach((particles, color) => {
        ctx.fillStyle = color;
        particles.forEach(p => {
          const opacity = p.life / p.maxLife;
          const size = 4 + (1 - opacity) * 2;
          
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Glow effect
          ctx.shadowBlur = size * 3;
          ctx.shadowColor = color;
        });
        ctx.shadowBlur = 0;
      });

      ctx.globalAlpha = 1;

      // Trigger next burst
      if (fireworksRef.current.length === 0 && burstCountRef.current < 5) {
        if (currentTime >= nextBurstTimeRef.current) {
          fireworksRef.current = createBurst();
          burstCountRef.current++;
          nextBurstTimeRef.current = currentTime + 300;
        }
      }

      // Continue animation if there are particles or more bursts coming
      if (fireworksRef.current.length > 0 || burstCountRef.current < 5) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Start first burst
    fireworksRef.current = createBurst();
    burstCountRef.current = 1;
    animationRef.current = requestAnimationFrame(animate);

    // Cleanup
    const cleanupTimeout = setTimeout(() => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }, 10000);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearTimeout(cleanupTimeout);
    };
  }, [trigger]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </Box>
  );
});

export default FireworksEffect;
