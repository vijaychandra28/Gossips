import React, { useState } from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = '', isLight = false, tilt = true, ...props }) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!tilt) return;
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    
    // Map coordinate shifts to maximum of 10 degrees rotation
    const rotateX = -(y / (box.height / 2)) * 8;
    const rotateY = (x / (box.width / 2)) * 8;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
        transition: 'transform 0.1s ease-out',
      }}
      className={`rounded-2xl shadow-glass-glow backdrop-blur-md overflow-hidden transition-all duration-300 ${
        isLight 
          ? 'glass-panel-light text-slate-800 border-white/40' 
          : 'glass-panel text-slate-100 border-white/10'
      } ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
