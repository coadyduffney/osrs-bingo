import { useEffect, useState } from 'react';
import Box from '@mui/joy/Box';

interface Firework {
  id: number;
  x: number;
  y: number;
  color: string;
  particles: Particle[];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface FireworksEffectProps {
  trigger: boolean;
  onComplete?: () => void;
}

const FireworksEffect: React.FC<FireworksEffectProps> = ({ trigger, onComplete }) => {
  const [fireworks, setFireworks] = useState<Firework[]>([]);

  useEffect(() => {
    if (!trigger) return;

    // OSRS-style colors: red, blue, green, yellow, purple
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    const newFireworks: Firework[] = [];
    
    // Create 5-8 fireworks at different positions
    const numFireworks = 5 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numFireworks; i++) {
      const x = 20 + Math.random() * 60; // Random position 20-80% across
      const y = 20 + Math.random() * 40; // Random position 20-60% down
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Create particles in a burst
      const particles: Particle[] = [];
      const particleCount = 12 + Math.floor(Math.random() * 8); // 12-20 particles
      
      for (let j = 0; j < particleCount; j++) {
        const angle = (j / particleCount) * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2.5;
        
        particles.push({
          id: j,
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 60,
          maxLife: 60,
          color: color,
        });
      }
      
      newFireworks.push({
        id: i,
        x,
        y,
        color,
        particles,
      });
    }
    
    setFireworks(newFireworks);
    
    // Animate particles
    const animationInterval = setInterval(() => {
      setFireworks(prev => {
        const updated = prev.map(fw => ({
          ...fw,
          particles: fw.particles
            .map(p => ({
              ...p,
              x: p.x + p.vx * 0.8,
              y: p.y + p.vy * 0.8 + 0.08, // Slower gravity
              vy: p.vy + 0.04, // Reduced gravity acceleration
              life: p.life - 1,
            }))
            .filter(p => p.life > 0),
        })).filter(fw => fw.particles.length > 0);
        
        if (updated.length === 0 && onComplete) {
          onComplete();
        }
        
        return updated;
      });
    }, 16); // ~60fps
    
    // Cleanup after animation
    const timeout = setTimeout(() => {
      clearInterval(animationInterval);
      setFireworks([]);
    }, 2000);
    
    return () => {
      clearInterval(animationInterval);
      clearTimeout(timeout);
    };
  }, [trigger, onComplete]);

  if (fireworks.length === 0) return null;

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
      {fireworks.map(fw => (
        <Box key={fw.id}>
          {fw.particles.map(p => {
            const opacity = p.life / p.maxLife;
            const size = 4 + (1 - opacity) * 2; // Particles shrink as they fade
            
            return (
              <Box
                key={p.id}
                sx={{
                  position: 'absolute',
                  left: `calc(${fw.x}% + ${p.x * 3}px)`,
                  top: `calc(${fw.y}% + ${p.y * 3}px)`,
                  width: `${size}px`,
                  height: `${size}px`,
                  borderRadius: '50%',
                  backgroundColor: p.color,
                  opacity: opacity,
                  boxShadow: `0 0 ${size * 2}px ${p.color}`,
                  transition: 'none',
                }}
              />
            );
          })}
        </Box>
      ))}
    </Box>
  );
};

export default FireworksEffect;
