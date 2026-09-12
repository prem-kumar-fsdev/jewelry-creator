import * as THREE from 'three';

/**
 * High-Performance 3D Articulated Verlet & Coupled Pendulum Physics Engine
 * Zero allocations in the animation loop for buttery-smooth 60 FPS on mobile.
 */

// Scratch vectors to eliminate GC in animation loop
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _force = new THREE.Vector3();
const _breeze = new THREE.Vector3();
const _spring = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _up = new THREE.Vector3(0, -1, 0);
const _quat = new THREE.Quaternion();

export class EarringPhysicsSystem {
    constructor(anchorPosition = new THREE.Vector3(0, 0, 0), segmentsConfig = []) {
        this.anchor = anchorPosition.clone();
        this.prevAnchor = anchorPosition.clone();

        this.nodes = [];
        this.lengths = [];
        this.masses = [];

        this.gravity = 9.81 * 1.5;
        this.damping = 0.985;
        this.breezeStrength = 0.0;
        this.breezeTime = 0.0;

        this.grabbedNodeIndex = -1;
        this.mouseTarget = new THREE.Vector3();
        this.isDragging = false;
        this.dragPlane = new THREE.Plane();

        this.initChain(segmentsConfig);
    }

    initChain(segmentsConfig = [
        { length: 0.35, mass: 0.4 },
        { length: 0.18, mass: 0.15 },
        { length: 0.55, mass: 0.6 },
        { length: 0.18, mass: 0.15 },
        { length: 0.85, mass: 1.1 }
    ]) {
        this.nodes = [];
        this.lengths = [];
        this.masses = [];

        this.nodes.push({
            pos: this.anchor.clone(),
            prevPos: this.anchor.clone(),
            isStatic: true
        });

        let currentPos = this.anchor.clone();
        for (let i = 0; i < segmentsConfig.length; i++) {
            const seg = segmentsConfig[i];
            const length = seg.length || 0.4;
            currentPos.y -= length;

            this.lengths.push(length);
            this.masses.push(seg.mass || 1.0);

            this.nodes.push({
                pos: currentPos.clone(),
                prevPos: currentPos.clone(),
                isStatic: false
            });
        }
    }

    updateChain(segmentsConfig = []) {
        const oldNodes = this.nodes;
        const newLengths = [];
        const newMasses = [];
        const newNodes = [];

        newNodes.push({
            pos: this.anchor.clone(),
            prevPos: this.anchor.clone(),
            isStatic: true
        });

        for (let i = 0; i < segmentsConfig.length; i++) {
            const seg = segmentsConfig[i];
            const length = seg.length || 0.4;
            newLengths.push(length);
            newMasses.push(seg.mass || 1.0);

            if (oldNodes[i + 1]) {
                newNodes.push(oldNodes[i + 1]);
            } else {
                const prevNode = newNodes[newNodes.length - 1];
                const newPos = prevNode.pos.clone();
                newPos.y -= length;
                const prevP = newPos.clone();
                // Add delicate natural settling impulse
                prevP.x += (Math.random() - 0.5) * 0.05;
                prevP.z += (Math.random() - 0.5) * 0.05;

                newNodes.push({
                    pos: newPos,
                    prevPos: prevP,
                    isStatic: false
                });
            }
        }

        this.nodes = newNodes;
        this.lengths = newLengths;
        this.masses = newMasses;
    }

    getTerminalPosition() {
        if (this.nodes.length === 0) return this.anchor.clone();
        return this.nodes[this.nodes.length - 1].pos.clone();
    }

    setAnchor(newPos) {
        this.prevAnchor.copy(this.anchor);
        this.anchor.copy(newPos);
        this.nodes[0].pos.copy(newPos);
        this.nodes[0].prevPos.copy(newPos);
    }

    applyImpulse(force = new THREE.Vector3(1.2, 0, 0.6)) {
        for (let i = 1; i < this.nodes.length; i++) {
            const factor = i / (this.nodes.length - 1);
            this.nodes[i].prevPos.x -= force.x * factor * 0.06;
            this.nodes[i].prevPos.y -= force.y * factor * 0.06;
            this.nodes[i].prevPos.z -= force.z * factor * 0.06;
        }
    }

    setBreeze(strength = 0.5) {
        this.breezeStrength = strength;
    }

    step(dt = 1 / 60) {
        const clampedDt = Math.min(dt, 0.033);
        const subSteps = 2;
        const subDt = clampedDt / subSteps;
        this.breezeTime += clampedDt;

        for (let s = 0; s < subSteps; s++) {
            this._subStep(subDt);
        }
    }

    _subStep(dt) {
        const dtSq = dt * dt;

        if (this.breezeStrength > 0.01) {
            const t = this.breezeTime;
            _breeze.x = (Math.sin(t * 1.8) * 0.6 + Math.cos(t * 3.2) * 0.25) * this.breezeStrength * 1.5;
            _breeze.y = 0;
            _breeze.z = (Math.cos(t * 1.5) * 0.6 + Math.sin(t * 2.8) * 0.25) * this.breezeStrength * 1.2;
        } else {
            _breeze.set(0, 0, 0);
        }

        // 1. Verlet integration
        for (let i = 1; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            const m = this.masses[i - 1];

            // Velocity
            const vx = (node.pos.x - node.prevPos.x) * this.damping;
            const vy = (node.pos.y - node.prevPos.y) * this.damping;
            const vz = (node.pos.z - node.prevPos.z) * this.damping;

            // Forces: Gravity
            _force.set(0, -this.gravity * m, 0);

            // Breeze
            const depthRatio = i / this.nodes.length;
            _force.x += _breeze.x * depthRatio * m;
            _force.z += _breeze.z * depthRatio * m;

            // Interactive mouse spring
            if (this.isDragging && this.grabbedNodeIndex === i) {
                _spring.copy(this.mouseTarget).sub(node.pos);
                _force.addScaledVector(_spring, 120.0);
            }

            // Next position
            const ax = _force.x / m;
            const ay = _force.y / m;
            const az = _force.z / m;

            const nextX = node.pos.x + vx + ax * dtSq;
            const nextY = node.pos.y + vy + ay * dtSq;
            const nextZ = node.pos.z + vz + az * dtSq;

            node.prevPos.copy(node.pos);
            node.pos.set(nextX, nextY, nextZ);
        }

        // 2. Rigid Distance Constraints (Fast Relaxation)
        for (let iter = 0; iter < 4; iter++) {
            for (let i = 1; i < this.nodes.length; i++) {
                const p1 = this.nodes[i - 1].pos;
                const p2 = this.nodes[i].pos;
                const targetLen = this.lengths[i - 1];

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dz = p2.z - p1.z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
                const diff = (dist - targetLen) / dist;

                if (i === 1) {
                    p2.x -= dx * diff;
                    p2.y -= dy * diff;
                    p2.z -= dz * diff;
                } else {
                    const m1 = this.masses[i - 2];
                    const m2 = this.masses[i - 1];
                    const totalM = m1 + m2;
                    const f1 = diff * (m2 / totalM);
                    const f2 = diff * (m1 / totalM);

                    p1.x += dx * f1;
                    p1.y += dy * f1;
                    p1.z += dz * f1;

                    p2.x -= dx * f2;
                    p2.y -= dy * f2;
                    p2.z -= dz * f2;
                }
            }
        }
    }

    syncScene(segmentObjects = []) {
        for (let i = 0; i < segmentObjects.length && i < this.lengths.length; i++) {
            const obj = segmentObjects[i];
            if (!obj) continue;

            const pStart = this.nodes[i].pos;
            const pEnd = this.nodes[i + 1].pos;

            obj.position.copy(pStart);

            _delta.subVectors(pEnd, pStart);
            const len = _delta.length();
            if (len > 0.0001) {
                _delta.normalize();
                _quat.setFromUnitVectors(_up, _delta);
                obj.quaternion.copy(_quat);
            }
        }
    }

    hitTest(raycaster, camera) {
        let closestIdx = -1;
        let minDist = 0.45;

        for (let i = 1; i < this.nodes.length; i++) {
            const nodePos = this.nodes[i].pos;
            const dist = raycaster.ray.distanceToPoint(nodePos);
            if (dist < minDist) {
                minDist = dist;
                closestIdx = i;
            }
        }
        return closestIdx;
    }

    startDrag(nodeIndex, raycaster, camera) {
        if (nodeIndex < 1 || nodeIndex >= this.nodes.length) return false;
        this.grabbedNodeIndex = nodeIndex;
        this.isDragging = true;

        const nodePos = this.nodes[nodeIndex].pos;
        camera.getWorldDirection(_v1).negate();
        this.dragPlane.setFromNormalAndCoplanarPoint(_v1, nodePos);

        if (raycaster.ray.intersectPlane(this.dragPlane, _hit)) {
            this.mouseTarget.copy(_hit);
        }
        return true;
    }

    updateDrag(raycaster) {
        if (!this.isDragging) return;
        if (raycaster.ray.intersectPlane(this.dragPlane, _hit)) {
            this.mouseTarget.copy(_hit);
        }
    }

    endDrag() {
        this.isDragging = false;
        this.grabbedNodeIndex = -1;
    }
}
