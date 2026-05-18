'use client';

import { useEffect, useRef } from 'react';

interface FloatingShape {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  type: 'square' | 'circle' | 'triangle' | 'diamond';
  speed: number;
  rotationSpeed: number;
  opacity: number;
  direction: { x: number; y: number };
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shapesRef = useRef<FloatingShape[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize floating shapes
    const shapeTypes: FloatingShape['type'][] = ['square', 'circle', 'triangle', 'diamond'];
    const shapes: FloatingShape[] = [];
    const numShapes = 8;

    for (let i = 0; i < numShapes; i++) {
      shapes.push({
        id: i,
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 20 + Math.random() * 40,
        rotation: Math.random() * Math.PI * 2,
        type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
        speed: 0.2 + Math.random() * 0.3,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        opacity: 0.06 + Math.random() * 0.08,
        direction: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
        },
      });
    }
    shapesRef.current = shapes;

    const drawDottedGrid = () => {
      const dotSpacing = 24;
      const dotSize = 1;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';

      for (let x = 0; x < canvas.width; x += dotSpacing) {
        for (let y = 0; y < canvas.height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawShape = (shape: FloatingShape) => {
      ctx.save();
      ctx.translate(shape.x, shape.y);
      ctx.rotate(shape.rotation);
      ctx.fillStyle = `rgba(255, 255, 255, ${shape.opacity})`;
      ctx.strokeStyle = `rgba(255, 255, 255, ${shape.opacity * 0.5})`;
      ctx.lineWidth = 1;

      const halfSize = shape.size / 2;

      switch (shape.type) {
        case 'square':
          ctx.fillRect(-halfSize, -halfSize, shape.size, shape.size);
          ctx.strokeRect(-halfSize, -halfSize, shape.size, shape.size);
          break;

        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;

        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(0, -halfSize);
          ctx.lineTo(halfSize, halfSize);
          ctx.lineTo(-halfSize, halfSize);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;

        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(0, -halfSize);
          ctx.lineTo(halfSize, 0);
          ctx.lineTo(0, halfSize);
          ctx.lineTo(-halfSize, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
      }

      ctx.restore();
    };

    const updateShape = (shape: FloatingShape) => {
      shape.x += shape.direction.x * shape.speed;
      shape.y += shape.direction.y * shape.speed;
      shape.rotation += shape.rotationSpeed;

      // Wrap around edges smoothly
      const padding = shape.size;
      if (shape.x < -padding) shape.x = canvas.width + padding;
      if (shape.x > canvas.width + padding) shape.x = -padding;
      if (shape.y < -padding) shape.y = canvas.height + padding;
      if (shape.y > canvas.height + padding) shape.y = -padding;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw dotted grid
      drawDottedGrid();

      // Update and draw shapes
      shapesRef.current.forEach((shape) => {
        updateShape(shape);
        drawShape(shape);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: 'rgb(0, 0, 0)' }}
    />
  );
}
