/**
 * High-Performance 2D Articulated Verlet Physics Engine for Drop Earrings
 * 
 * Simulates linked rigid jewelry segments (hooks, collets, pearls, jump rings)
 * with snappy, weighted mass inertia, gravity, velocity damping, distance constraints,
 * mouse/touch drag manipulation, and organic ambient sway.
 * 
 * v2 — Enhanced with:
 *   • Angular momentum / rotational inertia per node
 *   • Sub-stepping (3 sub-steps per frame) for buttery smooth constraint resolution
 *   • Angular joint limits (±55°) for realistic hinge arcs
 *   • Mass-proportional damping (heavy pearls settle differently)
 *   • Richer multi-harmonic ambient sway
 *   • Velocity tracking for motion blur and particle effects
 *   • Release particle burst spawning
 */

export class Earring2DPhysicsSystem {
    constructor(anchor = { x: 0, y: 0 }, segmentsConfig = []) {
        this.anchor = { x: anchor.x, y: anchor.y };
        this.nodes = [];
        this.lengths = [];
        this.masses = [];
        this.types = [];

        // Tuned for "snappy and weighted" fine jewelry physics (solid gold & dense pearls)
        this.gravity = 2200; // px/s^2
        this.baseDamping = 0.972; // velocity retention per frame (quick settling, good momentum)
        this.ambientSwayStrength = 18; // gentle atelier breeze
        this.swayTime = Math.random() * 10;
        this.phaseOffset = Math.random() * Math.PI * 2;

        // Angular constraint limit (radians, ±55° from parent)
        this.maxJointAngle = 55 * (Math.PI / 180);

        // Sub-stepping config
        this.subSteps = 3;

        // Interaction
        this.grabbedNodeIndex = -1;
        this.dragTarget = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        // Hovered node for cursor feedback
        this.hoveredNodeIndex = -1;

        // Release particle burst queue
        this.particleBursts = [];

        this.initChain(segmentsConfig);
    }

    /**
     * Initialize the chain nodes based on configuration
     * Segment config: array of { length, mass, type, id, data }
     */
    initChain(segmentsConfig = []) {
        this.nodes = [];
        this.lengths = [];
        this.masses = [];
        this.types = [];

        // Anchor node 0 (fixed at ear hook)
        this.nodes.push({
            x: this.anchor.x,
            y: this.anchor.y,
            prevX: this.anchor.x,
            prevY: this.anchor.y,
            isStatic: true,
            angle: 0,
            angularVelocity: 0
        });

        let currentY = this.anchor.y;
        let currentX = this.anchor.x;

        for (let i = 0; i < segmentsConfig.length; i++) {
            const seg = segmentsConfig[i];
            const len = seg.length || 35;
            const mass = seg.mass || 1.0;

            currentY += len;

            this.lengths.push(len);
            this.masses.push(mass);
            this.types.push(seg);

            this.nodes.push({
                x: currentX,
                y: currentY,
                prevX: currentX,
                prevY: currentY,
                isStatic: false,
                angle: 0,
                angularVelocity: 0
            });
        }
    }

    /**
     * Update chain structure dynamically when tiers are added or removed
     */
    updateChain(segmentsConfig = []) {
        const oldNodes = [...this.nodes];
        this.initChain(segmentsConfig);

        // Preserve previous positions and velocities for existing nodes to avoid jarring teleportation
        for (let i = 1; i < this.nodes.length; i++) {
            if (oldNodes[i]) {
                this.nodes[i].x = oldNodes[i].x;
                this.nodes[i].y = oldNodes[i].y;
                this.nodes[i].prevX = oldNodes[i].prevX;
                this.nodes[i].prevY = oldNodes[i].prevY;
                this.nodes[i].angle = oldNodes[i].angle || 0;
                this.nodes[i].angularVelocity = oldNodes[i].angularVelocity || 0;
            } else {
                // New node added at the bottom: inherit parent's velocity smoothly with NO artificial length offset
                const parent = this.nodes[i - 1];
                const newX = parent.x;
                const newY = parent.y + this.lengths[i - 1];
                this.nodes[i].x = newX;
                this.nodes[i].y = newY;
                const parentVx = parent.x - parent.prevX;
                const parentVy = parent.y - parent.prevY;
                this.nodes[i].prevX = newX - parentVx;
                this.nodes[i].prevY = newY - parentVy;
                this.nodes[i].angle = parent.angle || 0;
                this.nodes[i].angularVelocity = 0;
            }
        }
    }

    setAnchor(x, y) {
        this.anchor.x = x;
        this.anchor.y = y;
        if (this.nodes.length > 0) {
            this.nodes[0].x = x;
            this.nodes[0].y = y;
            this.nodes[0].prevX = x;
            this.nodes[0].prevY = y;
        }
    }

    /**
     * Check if (x, y) is near any draggable node (for cursor feedback)
     */
    getNodeAt(x, y, threshold = 40) {
        let bestDist = threshold;
        let bestIndex = -1;

        for (let i = 1; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const dist = Math.hypot(node.x - x, node.y - y);
            if (dist < bestDist) {
                bestDist = dist;
                bestIndex = i;
            }
        }
        return bestIndex;
    }

    /**
     * Grab the nearest node to (x, y) within hit threshold
     */
    grabNodeAt(x, y, threshold = 40) {
        const bestIndex = this.getNodeAt(x, y, threshold);

        if (bestIndex !== -1) {
            this.grabbedNodeIndex = bestIndex;
            this.isDragging = true;
            this.dragTarget.x = x;
            this.dragTarget.y = y;
            this.dragOffset.x = this.nodes[bestIndex].x - x;
            this.dragOffset.y = this.nodes[bestIndex].y - y;
            return true;
        }
        return false;
    }

    updateDrag(x, y) {
        if (!this.isDragging || this.grabbedNodeIndex === -1) return;
        this.dragTarget.x = x;
        this.dragTarget.y = y;
    }

    releaseGrab() {
        if (this.isDragging && this.grabbedNodeIndex !== -1) {
            const node = this.nodes[this.grabbedNodeIndex];
            const vx = (node.x - node.prevX) * 1.2;
            const vy = (node.y - node.prevY) * 1.2;
            node.prevX = node.x - Math.max(-50, Math.min(50, vx));
            node.prevY = node.y - Math.max(-50, Math.min(50, vy));

            // Spawn particle burst at release point
            const speed = Math.hypot(vx, vy);
            if (speed > 2) {
                this.particleBursts.push({
                    x: node.x,
                    y: node.y,
                    vx: vx * 0.3,
                    vy: vy * 0.3,
                    life: 1.0,
                    particles: this._generateBurstParticles(node.x, node.y, speed)
                });
            }
        }
        this.isDragging = false;
        this.grabbedNodeIndex = -1;
    }

    _generateBurstParticles(cx, cy, speed) {
        const count = Math.min(12, Math.floor(speed * 0.8) + 4);
        const particles = [];
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            const v = (Math.random() * 0.5 + 0.5) * Math.min(speed * 0.4, 25);
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * v,
                vy: Math.sin(angle) * v,
                size: Math.random() * 2.5 + 1.5,
                life: 1.0
            });
        }
        return particles;
    }

    /**
     * Update particle bursts (call each frame)
     */
    updateParticles(dt) {
        for (let b = this.particleBursts.length - 1; b >= 0; b--) {
            const burst = this.particleBursts[b];
            burst.life -= dt * 2.5;
            for (const p of burst.particles) {
                p.x += p.vx * dt * 60;
                p.y += p.vy * dt * 60;
                p.vy += 80 * dt; // mini gravity
                p.vx *= 0.97;
                p.vy *= 0.97;
                p.life -= dt * 2.2;
            }
            if (burst.life <= 0) {
                this.particleBursts.splice(b, 1);
            }
        }
    }

    getMaxReachableDistance(nodeIndex) {
        let total = 0;
        for (let i = 0; i < nodeIndex && i < this.lengths.length; i++) {
            total += this.lengths[i];
        }
        return total;
    }

    /**
     * Get velocity magnitude for a node (for motion blur intensity)
     */
    getNodeVelocity(i) {
        if (i < 0 || i >= this.nodes.length) return 0;
        const n = this.nodes[i];
        return Math.hypot(n.x - n.prevX, n.y - n.prevY);
    }

    /**
     * Advance physics simulation step by dt — with sub-stepping for smoothness
     */
    step(dt = 1 / 60) {
        // Clamp dt for stability
        const clampedDt = Math.min(0.033, Math.max(0.008, dt));

        // Sub-step for buttery smooth constraint resolution
        const subDt = clampedDt / this.subSteps;

        for (let sub = 0; sub < this.subSteps; sub++) {
            this._stepInternal(subDt);
        }

        // Update angular momentum for rendering
        this._updateAngularMomentum(clampedDt);

        // Update particles
        this.updateParticles(clampedDt);
    }

    _stepInternal(dt) {
        const dtSq = dt * dt;

        this.swayTime += dt;

        // Richer multi-harmonic ambient sway (gentle atelier air current)
        const swayForceX =
            Math.sin(this.swayTime * 1.6 + this.phaseOffset) * this.ambientSwayStrength +
            Math.cos(this.swayTime * 2.8 + this.phaseOffset) * (this.ambientSwayStrength * 0.4) +
            Math.sin(this.swayTime * 0.7 + this.phaseOffset * 1.3) * (this.ambientSwayStrength * 0.25) +
            Math.cos(this.swayTime * 4.1 + this.phaseOffset * 0.8) * (this.ambientSwayStrength * 0.15);

        // 1. Verlet integration for all non-static nodes
        for (let i = 1; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const mass = this.masses[i - 1] || 1.0;

            // Mass-proportional damping: heavier pearls have slightly lower damping (more momentum)
            const damping = this.baseDamping + (1 - this.baseDamping) * Math.min(mass / 5, 0.3);

            if (this.isDragging && i === this.grabbedNodeIndex) {
                let targetX = this.dragTarget.x + this.dragOffset.x;
                let targetY = this.dragTarget.y + this.dragOffset.y;

                // Limit chain stretching: clamp to exact maximum physical reach from anchor
                const maxReach = this.getMaxReachableDistance(this.grabbedNodeIndex);
                const dx = targetX - this.anchor.x;
                const dy = targetY - this.anchor.y;
                const dist = Math.hypot(dx, dy);

                if (dist > maxReach) {
                    targetX = this.anchor.x + (dx / dist) * maxReach;
                    targetY = this.anchor.y + (dy / dist) * maxReach;
                }

                // Prevent dragging above earlobe
                if (targetY < this.anchor.y + 4) {
                    targetY = this.anchor.y + 4;
                }

                node.prevX = node.x;
                node.prevY = node.y;
                node.x += (targetX - node.x) * 0.75;
                node.y += (targetY - node.y) * 0.75;
                continue;
            }

            // Current velocity with mass-proportional damping (clamped to prevent explosive spikes)
            let vx = (node.x - node.prevX) * damping;
            let vy = (node.y - node.prevY) * damping;

            const maxSubStepVel = 24;
            vx = Math.max(-maxSubStepVel, Math.min(maxSubStepVel, vx));
            vy = Math.max(-maxSubStepVel, Math.min(maxSubStepVel, vy));

            node.prevX = node.x;
            node.prevY = node.y;

            // Forces: Gravity (downwards) + Ambient Sway (horizontal) + Inertia mass scaling
            const ax = (swayForceX / mass);
            const ay = this.gravity;

            node.x += vx + ax * dtSq;
            node.y += vy + ay * dtSq;
        }

        // 2. Solve rigid inextensible distance constraints iteratively (Relaxation method)
        const ITERATIONS = 5; // Per sub-step (3 sub-steps x 5 = 15 effective iterations)
        for (let iter = 0; iter < ITERATIONS; iter++) {
            // Anchor is permanently fixed
            this.nodes[0].x = this.anchor.x;
            this.nodes[0].y = this.anchor.y;

            for (let i = 0; i < this.lengths.length; i++) {
                const n1 = this.nodes[i];
                const n2 = this.nodes[i + 1];
                const targetLen = this.lengths[i];

                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                const currentLen = Math.hypot(dx, dy) || 0.001;
                const diff = (currentLen - targetLen) / currentLen;

                const m1 = n1.isStatic ? 0 : (this.masses[i - 1] || 1.0);
                const m2 = this.masses[i] || 1.0;
                const totalMass = m1 + m2;

                const ratio1 = n1.isStatic ? 0 : (m2 / totalMass);
                const ratio2 = (this.isDragging && (i + 1) === this.grabbedNodeIndex) ? 0 : (n1.isStatic ? 1.0 : (m1 / totalMass));

                if (!n1.isStatic) {
                    n1.x += dx * diff * ratio1;
                    n1.y += dy * diff * ratio1;
                }
                if (!(this.isDragging && (i + 1) === this.grabbedNodeIndex)) {
                    n2.x -= dx * diff * ratio2;
                    n2.y -= dy * diff * ratio2;
                }
            }

            // 2b. Angular joint limits: clamp angle between consecutive segments to +/-maxJointAngle
            this._enforceAngularLimits();
        }

        // 3. Compute segment orientation angles for rendering
        for (let i = 0; i < this.lengths.length; i++) {
            const n1 = this.nodes[i];
            const n2 = this.nodes[i + 1];
            const angle = Math.atan2(-(n2.x - n1.x), n2.y - n1.y);
            this.nodes[i + 1].angle = angle;
        }
    }

    /**
     * Enforce angular joint limits between consecutive segments
     */
    _enforceAngularLimits() {
        for (let i = 1; i < this.lengths.length; i++) {
            const n0 = this.nodes[i - 1];
            const n1 = this.nodes[i];
            const n2 = this.nodes[i + 1];

            // Parent segment direction
            const parentAngle = Math.atan2(n1.y - n0.y, n1.x - n0.x);
            // Child segment direction
            const childAngle = Math.atan2(n2.y - n1.y, n2.x - n1.x);

            // Relative angle
            let relAngle = childAngle - parentAngle;
            while (relAngle > Math.PI) relAngle -= Math.PI * 2;
            while (relAngle < -Math.PI) relAngle += Math.PI * 2;

            // Clamp to limits
            if (Math.abs(relAngle) > this.maxJointAngle) {
                const clampedAngle = parentAngle + Math.sign(relAngle) * this.maxJointAngle;
                const len = this.lengths[i];
                const targetX = n1.x + Math.cos(clampedAngle) * len;
                const targetY = n1.y + Math.sin(clampedAngle) * len;

                // Soft correction (blend 40% toward clamped position to avoid jerky snapping)
                if (!(this.isDragging && (i + 1) === this.grabbedNodeIndex)) {
                    n2.x += (targetX - n2.x) * 0.4;
                    n2.y += (targetY - n2.y) * 0.4;
                }
            }
        }
    }

    /**
     * Update angular momentum for each node (visual rotational inertia)
     */
    _updateAngularMomentum(dt) {
        for (let i = 1; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const prevAngle = node._prevAngle || node.angle;
            let deltaAngle = node.angle - prevAngle;

            while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
            while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

            // Angular velocity with damping (heavier = more momentum retention)
            const mass = this.masses[i - 1] || 1.0;
            const angDamping = 0.88 + Math.min(mass / 8, 0.08);
            node.angularVelocity = node.angularVelocity * angDamping + deltaAngle * 0.6;

            // Clamp angular velocity
            node.angularVelocity = Math.max(-0.15, Math.min(0.15, node.angularVelocity));

            node._prevAngle = node.angle;
        }
    }

    /**
     * Get computed render data for all segments
     */
    getSegments() {
        const segments = [];
        for (let i = 0; i < this.lengths.length; i++) {
            const start = this.nodes[i];
            const end = this.nodes[i + 1];
            const config = this.types[i] || {};

            // Compute velocity for motion blur
            const velocity = this.getNodeVelocity(i + 1);

            segments.push({
                index: i,
                startX: start.x,
                startY: start.y,
                endX: end.x,
                endY: end.y,
                midX: (start.x + end.x) / 2,
                midY: (start.y + end.y) / 2,
                angle: end.angle || 0,
                angularVelocity: end.angularVelocity || 0,
                velocity,
                length: this.lengths[i],
                ...config
            });
        }
        return segments;
    }

    /**
     * Add gentle impulse to simulate breeze flick or config change reaction
     */
    applyImpulse(fx, fy = 0) {
        const clampedFx = Math.max(-15, Math.min(15, fx));
        const clampedFy = Math.max(-6, Math.min(6, fy));
        for (let i = 1; i < this.nodes.length; i++) {
            const mass = this.masses[i - 1] || 1.0;
            this.nodes[i].prevX -= (clampedFx / mass);
            this.nodes[i].prevY -= (clampedFy / mass);
        }
    }
}
