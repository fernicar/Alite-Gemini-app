

import { physicsService3D } from './physicsService3D';
import * as CANNON from 'cannon-es';
import { SHIPS_FOR_SALE } from '../data/ships';
import { Ship } from '../types';

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
    
    public handlePlayerInput(pressedKeys: Set<string>, mouseAim: boolean) {
        const shipBody = physicsService3D.getShipBody();
        if (!shipBody) return;

        const shipSpec = SHIPS_FOR_SALE.find(sfs => sfs.type === (shipBody as any).userData.data.type)?.spec;
        if (!shipSpec) return;

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
            const maxRadius = Math.min(centerX, centerY) * 0.8;

            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > deadZone) {
                const effectiveDistance = Math.min(distance, maxRadius);
                const turnStrength = (effectiveDistance - deadZone) / (maxRadius - deadZone);
                
                yaw = -(deltaX / maxRadius) * turnStrength;
                pitch = -(deltaY / maxRadius) * turnStrength;
            }

            if (pressedKeys.has('shift') && pressedKeys.has('a')) roll = -1;
            if (pressedKeys.has('shift') && pressedKeys.has('d')) roll = 1;

        } else {
            if ((pressedKeys.has('a') && !pressedKeys.has('shift')) || pressedKeys.has('arrowleft')) yaw = 1;
            if ((pressedKeys.has('d') && !pressedKeys.has('shift')) || pressedKeys.has('arrowright')) yaw = -1;
            if (pressedKeys.has('r')) pitch = -1;
            if (pressedKeys.has('f')) pitch = 1;
            if (pressedKeys.has('shift') && pressedKeys.has('a')) roll = 1;
            if (pressedKeys.has('shift') && pressedKeys.has('d')) roll = -1;
        }

        if (pressedKeys.has('w') || pressedKeys.has('arrowup')) thrust = 1; 
        if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) thrust = -0.5;
        if (pressedKeys.has('q')) strafe.x = -1; 
        if (pressedKeys.has('e')) strafe.x = 1; 
        if (pressedKeys.has('pageup') || pressedKeys.has(' ')) strafe.y = 1; 
        if (pressedKeys.has('control') || pressedKeys.has('c')) strafe.y = -1;

        const turnTorque = shipSpec.turnRate * shipSpec.mass * 20;
        const localTorque = new CANNON.Vec3(
            pitch * turnTorque * 0.8, // Pitch is usually a bit slower
            yaw * turnTorque,
            roll * turnTorque * 1.2 // Roll is fastest
        );
        physicsService3D.applyLocalTorque(localTorque);

        physicsService3D.setAssistedThrust(thrust);
        physicsService3D.setAssistedStrafe(strafe);
    }
}

export const playerController3D = new PlayerController3D();