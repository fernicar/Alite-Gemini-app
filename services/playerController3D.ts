
import { physicsService3D } from './physicsService3D';

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
    
    public handlePlayerInput(pressedKeys: Set<string>, flightAssist: boolean, mouseAim: boolean) {
        let yaw = 0;
        let pitch = 0;
        let roll = 0;
        let thrust = 0;
        let strafe = { x: 0, y: 0 };

        if (mouseAim) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            const deltaX = this.mousePosition.x - centerX;
            const deltaY = this.mousePosition.y - centerY;

            const deadZone = 30; // pixels
            const maxRadius = Math.min(centerX, centerY) * 0.8; // Use 80% of the smaller screen dimension half

            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > deadZone) {
                const effectiveDistance = Math.min(distance, maxRadius);
                const turnStrength = (effectiveDistance - deadZone) / (maxRadius - deadZone);
                
                yaw = -(deltaX / maxRadius) * turnStrength * 2;
                pitch = -(deltaY / maxRadius) * turnStrength * 2;
            }

            // Keyboard roll is still active
            if (pressedKeys.has('shift') && pressedKeys.has('a')) roll = -1; // Roll Left
            if (pressedKeys.has('shift') && pressedKeys.has('d')) roll = 1;  // Roll Right

        } else {
            // Yaw (turn left/right) on A/D
            if (pressedKeys.has('a') && !pressedKeys.has('shift')) yaw = 1;
            if (pressedKeys.has('d') && !pressedKeys.has('shift')) yaw = -1;
            
            // Pitch (nose up/down) on R/F
            if (pressedKeys.has('r')) pitch = -1; // R for nose up
            if (pressedKeys.has('f')) pitch = 1;  // F for nose down

            // Roll on Shift + A/D
            if (pressedKeys.has('shift') && pressedKeys.has('a')) roll = -1; // Roll Left
            if (pressedKeys.has('shift') && pressedKeys.has('d')) roll = 1;  // Roll Right
        }

        // --- Translation ---
        if (pressedKeys.has('w')) thrust = 1; 
        if (pressedKeys.has('s')) thrust = -0.5;
        if (pressedKeys.has('q')) strafe.x = -1; 
        if (pressedKeys.has('e')) strafe.x = 1; 
        if (pressedKeys.has(' ')) strafe.y = 1; 
        if (pressedKeys.has('control')) strafe.y = -1;

        // Apply rotational inputs as torques
        physicsService3D.applyYaw(yaw);
        physicsService3D.applyPitch(pitch);
        physicsService3D.applyRoll(roll);

        // Handle translational inputs based on flight assist mode
        if (flightAssist) {
            physicsService3D.setAssistedThrust(thrust);
            physicsService3D.setAssistedStrafe(strafe);
        } else {
            physicsService3D.applyThrust(thrust);
            physicsService3D.applyStrafe(strafe);
        }
    }
}

export const playerController3D = new PlayerController3D();