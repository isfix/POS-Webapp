"use client";

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function LiquidGlass({ children, className }: { children: React.ReactNode, className?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = (canvas.width = container.offsetWidth);
        let height = (canvas.height = container.offsetHeight);
        let animationFrameId: number;

        class Metaball {
            constructor(public x: number, public y: number, public r: number, public vx: number, public vy: number) {}

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x - this.r < 0 || this.x + this.r > width) {
                    this.vx *= -1;
                }
                if (this.y - this.r < 0 || this.y + this.r > height) {
                    this.vy *= -1;
                }
            }
        }

        const metaballs = [
            new Metaball(width / 2, height / 2, 150, Math.random() * 4 - 2, Math.random() * 4 - 2),
            new Metaball(width / 2, height / 2, 100, Math.random() * 4 - 2, Math.random() * 4 - 2),
            new Metaball(width / 2, height / 2, 80, Math.random() * 4 - 2, Math.random() * 4 - 2),
        ];

        const draw = () => {
            ctx.clearRect(0, 0, width, height);
            metaballs.forEach(ball => {
                ctx.beginPath();
                ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
                ctx.fill();
                ball.update();
            });
            animationFrameId = requestAnimationFrame(draw);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            container.style.setProperty('--x', `${clientX}px`);
            container.style.setProperty('--y', `${clientY}px`);
        };

        const handleResize = () => {
            width = canvas.width = container.offsetWidth;
            height = canvas.height = container.offsetHeight;
        };

        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        const [h, s, l] = primaryColor.split(' ').map(parseFloat);
        ctx.fillStyle = `hsl(${h}, ${s}%, ${l}%)`;

        window.addEventListener('resize', handleResize);
        container.addEventListener('mousemove', handleMouseMove);

        draw();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            if (container) {
                container.removeEventListener('mousemove', handleMouseMove);
                if (canvas.parentNode === container) {
                    container.removeChild(canvas);
                }
            }
        };

    }, []);

    return (
        <div ref={containerRef} className={cn("relative isolate w-full min-h-screen overflow-hidden liquid-glass-spotlight", className)}>
            <style jsx global>{`
                .liquid-glass-canvas {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    filter: blur(80px) opacity(0.5);
                    z-index: -1;
                }
                .liquid-glass-spotlight::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(800px circle at var(--x) var(--y), hsla(var(--primary), 0.1), transparent 40%);
                    z-index: -1;
                }
            `}</style>
            <canvas className="liquid-glass-canvas" />
            <div className="relative">
                {children}
            </div>
        </div>
    );
}
