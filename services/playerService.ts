
import { Ship } from '../types';

const THRUST = 0.1;
const TURN_RATE = 3;
const MAX_VELOCITY = 5;
const DRAG = 0.99;

export const updatePlayerShip = (
  ship: Ship,
  pressedKeys: Set<string>,
  damageToPlayer: number
): Ship => {
  let newAngle = ship.angle;
  let newVelocity = { ...ship.velocity };
  let newPosition = { ...ship.position };
  let newShields = ship.shields;
  let newHull = ship.hull;
  let newEnergy = ship.energy;

  // --- Player Movement ---
  if (pressedKeys.has('a') || pressedKeys.has('arrowleft')) newAngle -= TURN_RATE;
  if (pressedKeys.has('d') || pressedKeys.has('arrowright')) newAngle += TURN_RATE;
  
  if (pressedKeys.has('w') || pressedKeys.has('arrowup')) {
      const radians = (newAngle - 90) * (Math.PI / 180);
      newVelocity.x += Math.cos(radians) * THRUST;
      newVelocity.y += Math.sin(radians) * THRUST;
  }
  if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) {
      newVelocity.x *= 0.95;
      newVelocity.y *= 0.95;
  }
  newVelocity.x *= DRAG;
  newVelocity.y *= DRAG;

  const speed = Math.sqrt(newVelocity.x ** 2 + newVelocity.y ** 2);
  if (speed > MAX_VELOCITY) {
      newVelocity.x = (newVelocity.x / speed) * MAX_VELOCITY;
      newVelocity.y = (newVelocity.y / speed) * MAX_VELOCITY;
  }

  newPosition.x += newVelocity.x;
  newPosition.y += newVelocity.y;
  
  // --- Damage Application ---
  if (damageToPlayer > 0) {
      const tempShields = newShields - damageToPlayer;
      if (tempShields < 0) {
          newHull += tempShields;
          newShields = 0;
      } else {
          newShields = tempShields;
      }
  }

  // --- Shield and Energy Recharge ---
  newShields = Math.min(ship.maxShields, newShields + (ship.maxShields / 200));
  newEnergy = Math.min(ship.maxEnergy, newEnergy + (ship.maxEnergy / 100));

  return {
      ...ship,
      angle: newAngle,
      velocity: newVelocity,
      position: newPosition,
      shields: newShields,
      hull: newHull,
      energy: newEnergy
  };
};
