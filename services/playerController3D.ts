
import { physicsService3D } from './physicsService3D';
import * as CANNON from 'cannon-es';
import { SHIPS_FOR_SALE } from '../data/ships';
import * as THREE from 'three';

class PlayerController3D {
    private mousePosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    public init() {
        window.addEventListener('mousemove', this.handleMouseMove);
    }

    public destroy() {
        window.removeEventListener('mousemove', this.handleMouseMove);
    }

    private handleMouseMove = (e: MouseEvent) => {
        this.mousePosition.x = e.clientX;
        this.mousePosition.y = e.clientY;
    };
    
    public handlePlayerInput(pressedKeys: Set<string>) {
        const shipBody = physicsService3D.getShipBody();
        if (!shipBody) return;

        const shipSpec = SHIPS_FOR_SALE.find(sfs => sfs.type === (shipBody as any).userData.data.type)?.spec;
        if (!shipSpec) return;

        let yawInput = 0;
        let pitchInput = 0;
        let rollInput = 0;
        let thrustInput = 0;
        let strafeInput = { x: 0, y: 0 }; // x for horizontal, y for vertical

        // --- Gyro-Mouse Controls (Pitch & Roll) ---
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const deltaX = this.mousePosition.x - centerX;
        const deltaY = this.mousePosition.y - centerY;
        
        // The further the mouse from the center, the faster the turn.
        // Clamp to a reasonable max rotation.
        pitchInput = -THREE.MathUtils.clamp(deltaY / (centerY * 0.8), -1, 1);
        rollInput = -THREE.MathUtils.clamp(deltaX / (centerX * 0.8), -1, 1);

        // --- Keyboard Controls ---
        if (pressedKeys.has('a')) yawInput = 1;
        if (pressedKeys.has('d')) yawInput = -1;

        if (pressedKeys.has('w') || pressedKeys.has('arrowup')) thrustInput = 1;
        if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) thrustInput = -0.5; // Less reverse thrust

        if (pressedKeys.has('q')) strafeInput.x = -1; // Strafe Left
        if (pressedKeys.has('e')) strafeInput.x = 1;  // Strafe Right

        if (pressedKeys.has('r')) strafeInput.y = 1;  // Strafe Up
        if (pressedKeys.has('f')) strafeInput.y = -1; // Strafe Down

        // Wake the ship's physics body if any input is detected
        if (yawInput !== 0 || pitchInput !== 0 || rollInput !== 0 || thrustInput !== 0 || strafeInput.x !== 0 || strafeInput.y !== 0) {
            shipBody.wakeUp();
        }
        
        // --- Apply Physics ---

        // 1. Rotation (Using a P-controller for smooth, assisted flight)
        const MAX_ROTATION_SPEED = Math.PI * 0.8; // Max ~144 deg/s rotation
        const rotationCorrectionFactor = shipSpec.mass * 5; // How quickly the ship corrects to the target rotation speed. Tunable.

        // Desired angular velocity in the ship's local frame
        const targetLocalAngularVelocity = new CANNON.Vec3(
            pitchInput * MAX_ROTATION_SPEED,
            yawInput * MAX_ROTATION_SPEED,
            rollInput * MAX_ROTATION_SPEED
        );

        // Current angular velocity in world frame, convert to local
        const worldAngularVelocity = shipBody.angularVelocity;
        const shipInverseQuaternion = shipBody.quaternion.inverse();
        const localAngularVelocity = shipInverseQuaternion.vmult(worldAngularVelocity);

        // Calculate the error (difference) between desired and current rotation
        const angularVelocityError = new CANNON.Vec3();
        targetLocalAngularVelocity.vsub(localAngularVelocity, angularVelocityError);
        
        // Apply a corrective torque proportional to the error
        // This makes the ship automatically turn towards the desired rotation speed
        const localTorque = new CANNON.Vec3(
            angularVelocityError.x * rotationCorrectionFactor,
            angularVelocityError.y * rotationCorrectionFactor,
            angularVelocityError.z * rotationCorrectionFactor
        );

        // Convert local torque to world space and apply it
        const worldTorque = shipBody.quaternion.vmult(localTorque);
        shipBody.applyTorque(worldTorque);


        // 2. Translation (Apply force)
        const mainThrustForce = shipSpec.mass * shipSpec.acceleration * 10; // Re-tuned multiplier
        const strafeThrustForce = mainThrustForce * 0.6;

        const localForce = new CANNON.Vec3(
            strafeInput.x * strafeThrustForce,
            strafeInput.y * strafeThrustForce,
            -thrustInput * mainThrustForce // Thrust along local -Z axis (forward)
        );
        const worldForce = shipBody.quaternion.vmult(localForce);
        shipBody.applyForce(worldForce);

        // 3. Speed Cap
        const maxSpeed = shipSpec.speed;
        if (shipBody.velocity.length() > maxSpeed) {
            shipBody.velocity.normalize();
            shipBody.velocity.scale(maxSpeed, shipBody.velocity);
        }
    }
}

export const playerController3D = new PlayerController3D();