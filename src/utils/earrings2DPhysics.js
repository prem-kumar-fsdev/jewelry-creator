/**
 * High-Performance 2D Articulated Verlet Physics Engine for Drop Earrings
 * 
 * Simulates linked rigid jewelry segments (hooks, collets, pearls, jump rings)
 * with snappy, weighted mass inertia, gravity, velocity damping, distance constraints,
 * mouse/touch drag manipulation, and organic ambient sway.
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
        this.damping = 0.972; // velocity retention per frame (quick settling, good momentum)
        this.ambientSwayStrength = 18; // gentle atelier breeze
        this.swayTime = Math.random() * 10;
        this.phaseOffset = Math.random() * Math.PI * 2;

        // Interaction
        this.grabbedNodeIndex = -1;
        this.dragTarget = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

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
            angle: 0
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
                angle: 0
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
            } else {
                // New node added at the bottom: inherit parent's velocity with slight impulse
                const parent = this.nodes[i - 1];
                this.nodes[i].x = parent.x;
                this.nodes[i].y = parent.y + this.lengths[i - 1];
                this.nodes[i].prevX = parent.prevX;
                this.nodes[i].prevY = parent.prevY;
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
     * Grab the nearest node to (x, y) within hit threshold
     */
    grabNodeAt(x, y, threshold = 40) {
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
            // Give slight momentum on release based on last displacement
            const node = this.nodes[this.grabbedNodeIndex];
            const vx = (node.x - node.prevX) * 1.2;
            const vy = (node.y - node.prevY) * 1.2;
            node.prevX = node.x - Math.max(-50, Math.min(50, vx));
            node.prevY = node.y - Math.max(-50, Math.min(50, vy));
        }
        this.isDragging = false;
        this.grabbedNodeIndex = -1;
    }

    getMaxReachableDistance(nodeIndex) {
        let total = 0;
        for (let i = 0; i < nodeIndex && i < this.lengths.length; i++) {
            total += this.lengths[i];
        }
        return total;
    }

    /**
     * Advance physics simulation step by dt
     */
    step(dt = 1 / 60) {
        // Clamp dt for stability
        const clampedDt = Math.min(0.033, Math.max(0.008, dt));
        const dtSq = clampedDt * clampedDt;

        this.swayTime += clampedDt;

        // Ambient sway harmonic force (gentle atelier air current)
        const swayForceX = Math.sin(this.swayTime * 1.6 + this.phaseOffset) * this.ambientSwayStrength +
                           Math.cos(this.swayTime * 2.8 + this.phaseOffset) * (this.ambientSwayStrength * 0.4);

        // 1. Verlet integration for all non-static nodes
        for (let i = 1; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const mass = this.masses[i - 1] || 1.0;

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

            // Current velocity
            let vx = (node.x - node.prevX) * this.damping;
            let vy = (node.y - node.prevY) * this.damping;

            node.prevX = node.x;
            node.prevY = node.y;

            // Forces: Gravity (downwards) + Ambient Sway (horizontal) + Inertia mass scaling
            const ax = (swayForceX / mass);
            const ay = this.gravity;

            node.x += vx + ax * dtSq;
            node.y += vy + ay * dtSq;
        }

        // 2. Solve rigid inextensible distance constraints iteratively (Relaxation method)
        const ITERATIONS = 12; // High iterations for perfectly rigid non-stretch chain
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
        }

        // 3. Compute segment orientation angles for rendering
        // In Canvas 2D (Y down, X right), a clockwise rotation (positive) swings vertical downward vector (0, 1) towards negative X (left).
        // Therefore, when (n2.x - n1.x) < 0 (segment swings left), angle must be positive: Math.atan2(-(n2.x - n1.x), n2.y - n1.y).
        for (let i = 0; i < this.lengths.length; i++) {
            const n1 = this.nodes[i];
            const n2 = this.nodes[i + 1];
            const angle = Math.atan2(-(n2.x - n1.x), n2.y - n1.y);
            this.nodes[i + 1].angle = angle;
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

            segments.push({
                index: i,
                startX: start.x,
                startY: start.y,
                endX: end.x,
                endY: end.y,
                midX: (start.x + end.x) / 2,
                midY: (start.y + end.y) / 2,
                angle: end.angle || 0,
                length: this.lengths[i],
                ...config
            });
        }
        return segments;
    }

    /**
     * Add gentle impulse to simulate breeze flick
     */
    applyImpulse(fx, fy) {
        for (let i = 1; i < this.nodes.length; i++) {
            const mass = this.masses[i - 1] || 1.0;
            this.nodes[i].prevX -= (fx / mass);
            this.nodes[i].prevY -= (fy / mass);
        }
    }
}
