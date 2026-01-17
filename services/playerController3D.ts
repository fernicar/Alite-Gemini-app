
import { physicsService3D } from './physicsService3D';
import * as CANNON from 'cannon-es';
import { SHIPS_FOR_SALE } from '../data/ships';
import * as THREE from 'three';

class PlayerController3D {
    // Stores the *visual* roll amount for the UI
    public visualRoll: number = 0;

    public init() {
        // No mouse listeners needed for 2D plane steering if using keys
    }

    public destroy() {
        // Cleanup
    }
    
    public handlePlayerInput(pressedKeys: Set<string>) {
        const shipBody = physicsService3D.getShipBody();
        if (!shipBody) return;

        const shipSpec = SHIPS_FOR_SALE.find(sfs => sfs.type === (shipBody as any).userData.data.type)?.spec;
        if (!shipSpec) return;

        let yawInput = 0;
        let thrustInput = 0;

        // --- Keyboard Controls (Arcade 2D) ---
        // A/D rotates ship
        if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) yawInput = 1;
        if (pressedKeys.has('d') || pressedKeys.has('arrowright')) yawInput = -1;

        // W/S thrust
        if (pressedKeys.has('w') || pressedKeys.has('arrowup')) thrustInput = 1;
        if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) thrustInput = -0.5;

        // Calculate visual roll for effect (banking into turns)
        if (yawInput !== 0) {
            this.visualRoll = THREE.MathUtils.lerp(this.visualRoll, -yawInput * 0.5, 0.1);
        } else {
            this.visualRoll = THREE.MathUtils.lerp(this.visualRoll, 0, 0.1);
        }

        // --- Apply Physics ---
        
        // 1. Rotation (Direct angular velocity for snappy control)
        const TURN_SPEED = 2.0;
        shipBody.angularVelocity.set(0, yawInput * TURN_SPEED, 0);

        // 2. Thrust (Apply force in direction of facing)
        if (thrustInput !== 0) {
            // Get World Forward Vector. Local forward is (0, 0, -1) because we use -Z as forward.
            const localForward = new CANNON.Vec3(0, 0, -1);
            const worldForward = shipBody.quaternion.vmult(localForward);
            
            const force = shipSpec.mass * 200 * thrustInput;
            
            shipBody.applyForce(worldForward.scale(force));
        }

        // 3. Speed Cap
        const maxSpeed = shipSpec.speed;
        if (shipBody.velocity.length() > maxSpeed) {
            shipBody.velocity.normalize();
            shipBody.velocity.scale(maxSpeed, shipBody.velocity);
        }
    }
}

export const playerController3D = new PlayerController3D();
