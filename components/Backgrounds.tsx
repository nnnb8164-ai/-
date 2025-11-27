
import React, { useEffect, useRef, useMemo } from 'react';
import { BackgroundType } from '../types';

interface BackgroundProps {
  type: BackgroundType;
}

// --- Aurora Effect (Real Image + Dynamic Overlays) ---
const AuroraBackground: React.FC = () => {
  // Generate random snowflakes
  const snowflakes = useMemo(() => {
    return Array.from({ length: 100 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 15 + 10}s`, // Slow fall
      animationDelay: `${Math.random() * -20}s`,
      opacity: Math.random() * 0.5 + 0.3,
      size: `${Math.random() * 3 + 1}px`
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-black">
      {/* 1. Base Real Image with Slow Zoom-Out Effect */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          // High-quality image of Aurora, Snowy Mountains, and Lake Reflection
          backgroundImage: 'url("https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=2070&auto=format&fit=crop")',
          filter: 'brightness(0.75) contrast(1.1)', // Slightly darkened to make overlays pop
          animation: 'slow-zoom 60s ease-in-out infinite alternate'
        }}
      />

      {/* 2. Dynamic Aurora Overlays (Simulating movement in the sky) */}
      
      {/* Layer A: Main Green Curtain (Flowing) */}
      <div className="absolute inset-0 z-10 mix-blend-screen opacity-50 pointer-events-none overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-aurora-wave"
               style={{
                 background: 'radial-gradient(ellipse at 50% 50%, rgba(52, 211, 153, 0) 20%, rgba(52, 211, 153, 0.2) 40%, rgba(16, 185, 129, 0.6) 60%, rgba(5, 150, 105, 0.1) 80%, transparent 100%)',
                 transformOrigin: 'center',
                 filter: 'blur(80px)'
               }}
          />
      </div>

      {/* Layer B: Secondary Purple/Pink Glow (Shifting) */}
       <div className="absolute inset-0 z-10 mix-blend-color-dodge opacity-40 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full animate-aurora-shift"
               style={{
                 background: 'linear-gradient(135deg, transparent 0%, rgba(139, 92, 246, 0.1) 30%, rgba(167, 139, 250, 0.3) 50%, transparent 80%)',
                 filter: 'blur(60px)'
               }}
          />
      </div>

      {/* 3. Falling Snow Particles */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="absolute rounded-full bg-white animate-snowfall"
            style={{
              left: flake.left,
              top: '-20px',
              width: flake.size,
              height: flake.size,
              opacity: flake.opacity,
              animationDuration: flake.animationDuration,
              animationDelay: flake.animationDelay,
              boxShadow: `0 0 4px rgba(255,255,255,0.8)`
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes slow-zoom {
          0% { transform: scale(1.15); }
          100% { transform: scale(1.0); }
        }

        @keyframes aurora-wave {
          0% { transform: rotate(0deg) scale(1) translate(0, 0); opacity: 0.5; }
          33% { transform: rotate(5deg) scale(1.1) translate(2%, 5%); opacity: 0.7; }
          66% { transform: rotate(-5deg) scale(0.9) translate(-2%, -5%); opacity: 0.5; }
          100% { transform: rotate(0deg) scale(1) translate(0, 0); opacity: 0.5; }
        }

        @keyframes aurora-shift {
          0% { transform: translateX(-10%); opacity: 0.3; }
          50% { transform: translateX(10%); opacity: 0.6; }
          100% { transform: translateX(-10%); opacity: 0.3; }
        }

        @keyframes snowfall {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(25vh) translateX(20px); }
          50% { transform: translateY(50vh) translateX(-20px); }
          75% { transform: translateY(75vh) translateX(20px); }
          100% { transform: translateY(110vh) translateX(0); }
        }
      `}</style>
    </div>
  );
};

// --- Meteor Effect (Seamless Canvas Loop) ---
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

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.2,
      alpha: Math.random() * 0.8 + 0.2,
      flickerSpeed: (Math.random() - 0.5) * 0.02
    }));

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
        this.angle = Math.PI / 4; 
        this.active = false;
      }

      spawn() {
        this.x = Math.random() * width;
        this.y = Math.random() * height * 0.5 - 100;
        this.length = Math.random() * 80 + 20;
        this.speed = Math.random() * 3 + 4;
        this.angle = Math.PI / 4 + (Math.random() * 0.2 - 0.1); 
        this.active = true;
      }

      draw() {
        if (!this.active || !ctx) return;
        
        const endX = this.x - this.length * Math.cos(this.angle);
        const endY = this.y - this.length * Math.sin(this.angle);

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

        this.x += this.speed * Math.cos(this.angle);
        this.y += this.speed * Math.sin(this.angle);

        if (this.x > width + 100 || this.y > height + 100) {
          this.active = false;
        }
      }
    }

    const meteors = Array.from({ length: 5 }, () => new Meteor());
    
    const animate = () => {
      if (!ctx) return;
      ctx.fillStyle = '#0f172a'; 
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = 'white';
      stars.forEach(star => {
        star.alpha += star.flickerSpeed;
        if (star.alpha > 1 || star.alpha < 0.2) star.flickerSpeed *= -1; 
        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      meteors.forEach(m => {
        if (!m.active && Math.random() < 0.01) { 
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

      const particleCount = 1000;
      const particles: { 
        angle: number; 
        radius: number; 
        speed: number; 
        size: number; 
        color: string 
      }[] = [];

      for(let i=0; i < particleCount; i++) {
          const r = Math.random() * (Math.min(width, height) * 0.6); 
          const angle = Math.random() * Math.PI * 2;
          const speed = (0.02 / (r / 200 + 0.1)); 
          const rand = Math.random();
          let color = '#ffffff';
          if (rand > 0.9) color = '#fbcfe8'; 
          else if (rand > 0.6) color = '#a855f7'; 
          else if (rand > 0.3) color = '#3b82f6'; 
          
          particles.push({
              angle,
              radius: r,
              speed,
              size: Math.random() * 1.5 + 0.5,
              color
          });
      }
  
      const animate = () => {
        ctx.fillStyle = 'rgba(5, 5, 10, 0.2)'; 
        ctx.fillRect(0, 0, width, height);
  
        ctx.save();
        ctx.translate(width/2, height/2);

        particles.forEach(p => {
            p.angle += p.speed * 0.05; 
            const armOffset = p.radius * 0.002; 
            const currentAngle = p.angle + armOffset;

            const x = Math.cos(currentAngle) * p.radius;
            const y = Math.sin(currentAngle) * p.radius;
            
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });

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
