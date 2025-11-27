
import React, { useEffect, useRef } from 'react';
import { BackgroundType } from '../types';

interface BackgroundProps {
  type: BackgroundType;
}

// --- Aurora Effect (Seamless CSS Animation) ---
// Simulates the Northern Lights using moving gradients.
const AuroraBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#000000]">
      {/* Deep dark base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] opacity-100" />
      
      {/* Aurora Layers - using keyframes defined in global styles or tailwind arbitrary values */}
      {/* Green/Teal Layer */}
      <div 
        className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-40 blur-[80px]"
        style={{
          background: 'radial-gradient(circle at center, rgba(52, 211, 153, 0.4) 0%, transparent 50%)',
          animation: 'aurora-spin 25s linear infinite',
        }} 
      />
      
      {/* Purple/Blue Layer */}
      <div 
        className="absolute bottom-[-50%] right-[-50%] w-[200%] h-[200%] opacity-40 blur-[80px]"
        style={{
          background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.4) 0%, transparent 50%)',
          animation: 'aurora-spin 30s linear infinite reverse',
        }} 
      />

      {/* Floating accent */}
      <div 
        className="absolute top-[20%] right-[20%] w-[100%] h-[100%] opacity-30 blur-[100px]"
        style={{
          background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.3) 0%, transparent 60%)',
          animation: 'aurora-pulse 15s ease-in-out infinite',
        }}
      />
      
      <style>{`
        @keyframes aurora-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes aurora-pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

// --- Meteor Effect (Seamless Canvas Loop) ---
// A starry night with randomized shooting stars.
const MeteorBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Static Stars (Background)
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2,
      alpha: Math.random() * 0.8 + 0.2,
      flickerSpeed: (Math.random() - 0.5) * 0.02
    }));

    // Meteor Class
    class Meteor {
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      active: boolean;

      constructor() {
        this.x = 0;
        this.y = 0;
        this.length = 0;
        this.speed = 0;
        this.angle = Math.PI / 4; // 45 degrees
        this.active = false;
      }

      spawn() {
        this.x = Math.random() * width;
        this.y = Math.random() * height * 0.5 - 100; // Start mainly in top half
        this.length = Math.random() * 80 + 20;
        this.speed = Math.random() * 3 + 4;
        this.angle = Math.PI / 4 + (Math.random() * 0.2 - 0.1); // Slight angle variation
        this.active = true;
      }

      draw() {
        if (!this.active || !ctx) return;
        
        const endX = this.x - this.length * Math.cos(this.angle);
        const endY = this.y - this.length * Math.sin(this.angle);

        // Gradient tail
        const gradient = ctx.createLinearGradient(this.x, this.y, endX, endY);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Move
        this.x += this.speed * Math.cos(this.angle);
        this.y += this.speed * Math.sin(this.angle);

        // Check bounds
        if (this.x > width + 100 || this.y > height + 100) {
          this.active = false;
        }
      }
    }

    const meteors = Array.from({ length: 5 }, () => new Meteor());
    
    // Main Animation Loop
    const animate = () => {
      if (!ctx) return;
      
      // Clear canvas
      ctx.fillStyle = '#0f172a'; // Slate-900 base
      ctx.fillRect(0, 0, width, height);
      
      // Draw Stars
      ctx.fillStyle = 'white';
      stars.forEach(star => {
        star.alpha += star.flickerSpeed;
        if (star.alpha > 1 || star.alpha < 0.2) star.flickerSpeed *= -1; // Bounce opacity
        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Manage Meteors
      meteors.forEach(m => {
        if (!m.active && Math.random() < 0.01) { // 1% chance per frame to spawn if inactive
          m.spawn();
        }
        m.draw();
      });

      requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[-1]" />;
};

// --- Galaxy Effect (Rotating Spiral) ---
// A complex particle system resembling a spiral galaxy.
const GalaxyBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
  
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
  
      let width = window.innerWidth;
      let height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      // Galaxy Particles
      const particleCount = 1000;
      const particles: { 
        angle: number; 
        radius: number; 
        speed: number; 
        size: number; 
        color: string 
      }[] = [];

      // Initialize galaxy arms
      for(let i=0; i < particleCount; i++) {
          const r = Math.random() * (Math.min(width, height) * 0.6); // Radius distribution
          const angle = Math.random() * Math.PI * 2;
          
          // Spiral Arm Logic: Closer to center = faster angular velocity
          const speed = (0.02 / (r / 200 + 0.1)); 
          
          // Colors: mix of blue, purple, white
          const rand = Math.random();
          let color = '#ffffff';
          if (rand > 0.9) color = '#fbcfe8'; // pink-ish
          else if (rand > 0.6) color = '#a855f7'; // purple
          else if (rand > 0.3) color = '#3b82f6'; // blue
          
          particles.push({
              angle,
              radius: r,
              speed,
              size: Math.random() * 1.5 + 0.5,
              color
          });
      }
  
      const animate = () => {
        // Trail effect
        ctx.fillStyle = 'rgba(5, 5, 10, 0.2)'; 
        ctx.fillRect(0, 0, width, height);
  
        ctx.save();
        ctx.translate(width/2, height/2);

        // Draw particles
        particles.forEach(p => {
            // Update angle
            p.angle += p.speed * 0.05; // Slow down global speed

            // Calculate Spiral Arm positions (Logarithmic spiral approximation)
            // We modify the visual position by adding an offset based on radius to create arms
            const armOffset = p.radius * 0.002; 
            const currentAngle = p.angle + armOffset;

            const x = Math.cos(currentAngle) * p.radius;
            const y = Math.sin(currentAngle) * p.radius;
            
            // Draw
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });

        // Center bright core
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 150, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
        requestAnimationFrame(animate);
      };
  
      const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
      };
  
      window.addEventListener('resize', handleResize);
      animate();
  
      return () => window.removeEventListener('resize', handleResize);
    }, []);
  
    return <canvas ref={canvasRef} className="fixed inset-0 z-[-1] bg-black" />;
};

export const Background: React.FC<BackgroundProps> = ({ type }) => {
  switch (type) {
    case BackgroundType.METEOR:
      return <MeteorBackground />;
    case BackgroundType.AURORA:
      return <AuroraBackground />;
    case BackgroundType.GALAXY:
      return <GalaxyBackground />;
    default:
      return <GalaxyBackground />;
  }
};
