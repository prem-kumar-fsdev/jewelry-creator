/**
 * Studio Ambient Animation Engine
 * Provides subtle, realistic light animations for the jewelry studio backdrop:
 * - Floating light particles (dust motes in studio lighting)
 * - Slow ambient light sweep (spotlight movement)
 * - Soft pulsing caustic sparkles on metal surfaces
 */

// ============================================
// PARTICLE SYSTEM: Floating Studio Light Motes
// ============================================
class LightParticle {
    constructor(width, height) {
        this.reset(width, height, true);
    }

    reset(width, height, randomizeY = false) {
        this.x = Math.random() * width;
        this.y = randomizeY ? Math.random() * height : height + 10;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = -(Math.random() * 0.4 + 0.1);
        this.opacity = Math.random() * 0.3 + 0.05;
        this.maxOpacity = this.opacity;
        this.life = 0;
        this.maxLife = Math.random() * 600 + 300;
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.02 + 0.005;
        this.wobbleAmplitude = Math.random() * 0.5 + 0.1;
    }

    update(width, height) {
        this.life++;
        this.x += this.speedX + Math.sin(this.wobblePhase) * this.wobbleAmplitude;
        this.y += this.speedY;
        this.wobblePhase += this.wobbleSpeed;

        // Fade in/out lifecycle
        const lifeRatio = this.life / this.maxLife;
        if (lifeRatio < 0.1) {
            this.opacity = this.maxOpacity * (lifeRatio / 0.1);
        } else if (lifeRatio > 0.8) {
            this.opacity = this.maxOpacity * ((1 - lifeRatio) / 0.2);
        } else {
            this.opacity = this.maxOpacity;
        }

        if (this.life >= this.maxLife || this.y < -10 || this.x < -10 || this.x > width + 10) {
            this.reset(width, height);
        }
    }

    draw(ctx, isLightBg) {
        if (this.opacity <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = isLightBg
            ? `rgba(201, 169, 98, ${this.opacity})`  // Warm gold dust on light bg
            : `rgba(255, 255, 255, ${this.opacity})`; // White motes on dark bg
        ctx.shadowColor = isLightBg ? "rgba(201, 169, 98, 0.3)" : "rgba(255, 255, 255, 0.3)";
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.restore();
    }
}

// ============================================
// AMBIENT LIGHT SWEEP
// ============================================
class AmbientLightSweep {
    constructor() {
        this.angle = 0;
        this.speed = 0.003; // Very slow rotation
        this.intensity = 0;
        this.targetIntensity = 0.06;
        this.breathePhase = 0;
    }

    update() {
        this.angle += this.speed;
        if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;

        // Slow breathing intensity
        this.breathePhase += 0.008;
        this.intensity = this.targetIntensity + Math.sin(this.breathePhase) * 0.02;
    }

    draw(ctx, width, height, isLightBg) {
        const cx = width / 2 + Math.cos(this.angle) * width * 0.25;
        const cy = height * 0.35 + Math.sin(this.angle * 0.7) * height * 0.1;
        const radius = Math.max(width, height) * 0.6;

        ctx.save();
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);

        if (isLightBg) {
            grad.addColorStop(0, `rgba(255, 248, 230, ${this.intensity * 0.8})`);
            grad.addColorStop(0.4, `rgba(255, 240, 210, ${this.intensity * 0.4})`);
            grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        } else {
            grad.addColorStop(0, `rgba(255, 255, 255, ${this.intensity})`);
            grad.addColorStop(0.35, `rgba(255, 250, 240, ${this.intensity * 0.5})`);
            grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        }

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }
}

// ============================================
// CAUSTIC SPARKLE (on-metal glint that breathes)
// ============================================
class CausticSparkle {
    constructor(width, height) {
        this.reset(width, height);
    }

    reset(width, height) {
        // Cluster sparkles around the center jewelry area
        const centerX = width / 2;
        const centerY = height * 0.45;
        const spread = Math.min(width, height) * 0.3;

        this.x = centerX + (Math.random() - 0.5) * spread * 2;
        this.y = centerY + (Math.random() - 0.5) * spread * 1.5;
        this.size = Math.random() * 4 + 2;
        this.maxSize = this.size;
        this.opacity = 0;
        this.maxOpacity = Math.random() * 0.4 + 0.1;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.03 + 0.01;
        this.life = 0;
        this.maxLife = Math.random() * 200 + 100;
        this.rotation = Math.random() * Math.PI;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
    }

    update(width, height) {
        this.life++;
        this.phase += this.speed;
        this.rotation += this.rotationSpeed;

        // Pulsing lifecycle
        const lifeRatio = this.life / this.maxLife;
        const pulse = Math.sin(this.phase) * 0.5 + 0.5;

        if (lifeRatio < 0.15) {
            this.opacity = this.maxOpacity * (lifeRatio / 0.15) * pulse;
        } else if (lifeRatio > 0.75) {
            this.opacity = this.maxOpacity * ((1 - lifeRatio) / 0.25) * pulse;
        } else {
            this.opacity = this.maxOpacity * pulse;
        }

        this.size = this.maxSize * (0.7 + pulse * 0.3);

        if (this.life >= this.maxLife) {
            this.reset(width, height);
        }
    }

    draw(ctx) {
        if (this.opacity <= 0.01) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;

        // 4-point star sparkle
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
        ctx.shadowBlur = 8;

        ctx.beginPath();
        const s = this.size;
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s * 0.15, -s * 0.15, s * 0.6, 0);
        ctx.quadraticCurveTo(s * 0.15, s * 0.15, 0, s);
        ctx.quadraticCurveTo(-s * 0.15, s * 0.15, -s * 0.6, 0);
        ctx.quadraticCurveTo(-s * 0.15, -s * 0.15, 0, -s);
        ctx.fill();

        // Bright center dot
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        ctx.restore();
    }
}

// ============================================
// STUDIO ANIMATION MANAGER
// ============================================
export class StudioAnimationEngine {
    constructor() {
        this.particles = [];
        this.sparkles = [];
        this.lightSweep = new AmbientLightSweep();
        this.animationId = null;
        this.isRunning = false;
        this.width = 0;
        this.height = 0;
        this.isLightBg = false;
        this.onFrame = null; // Callback to trigger re-composite
        this.frameCount = 0;
    }

    init(width, height, isLightBg = false) {
        this.width = width;
        this.height = height;
        this.isLightBg = isLightBg;

        // Create particle pool
        this.particles = [];
        const particleCount = Math.floor((width * height) / 15000); // ~16 for 500x500
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new LightParticle(width, height));
        }

        // Create sparkle pool
        this.sparkles = [];
        const sparkleCount = Math.floor((width * height) / 40000); // ~6 for 500x500
        for (let i = 0; i < sparkleCount; i++) {
            this.sparkles.push(new CausticSparkle(width, height));
        }
    }

    updateBackdrop(isLightBg) {
        this.isLightBg = isLightBg;
    }

    start(onFrame) {
        if (this.isRunning) return;
        this.isRunning = true;
        this.onFrame = onFrame;
        this._loop();
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    _loop() {
        if (!this.isRunning) return;

        this.frameCount++;

        // Update all systems
        this.lightSweep.update();
        this.particles.forEach(p => p.update(this.width, this.height));
        this.sparkles.forEach(s => s.update(this.width, this.height));

        // Notify parent to re-composite with animation overlay
        if (this.onFrame) {
            this.onFrame();
        }

        this.animationId = requestAnimationFrame(() => this._loop());
    }

    /**
     * Draw all animation layers onto the given context.
     * Call this AFTER the base jewelry has been composited.
     */
    drawOverlay(ctx) {
        // 1. Ambient light sweep
        this.lightSweep.draw(ctx, this.width, this.height, this.isLightBg);

        // 2. Floating dust/light particles
        this.particles.forEach(p => p.draw(ctx, this.isLightBg));

        // 3. Caustic sparkles on jewelry
        this.sparkles.forEach(s => s.draw(ctx));
    }

    destroy() {
        this.stop();
        this.particles = [];
        this.sparkles = [];
        this.onFrame = null;
    }
}
