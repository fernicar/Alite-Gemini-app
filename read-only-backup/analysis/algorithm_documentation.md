# Alite Game Algorithms Documentation

## Overview

This document details the key algorithms and computational logic identified in the Alite source code that will need to be implemented in TypeScript. These algorithms form the core gameplay mechanics and procedural generation systems.

## 1. Galaxy Generation Algorithm

### 1.1 Purpose
Generate consistent, procedurally created galaxies with star systems, planets, and initial conditions using seeded random generation.

### 1.2 Location
`model/generator/GalaxyGenerator.java`

### 1.3 Algorithm Structure

#### Galaxy Structure
```
8 Galaxies
  ↓
256 Systems per Galaxy
  ↓
1-4 Planets per System
  ↓
Stations and Resources
```

#### Core Generation Steps
1. **Seed Initialization**
   ```typescript
   interface GalaxySeed {
     galaxyIndex: number;
     randomSeed: number;
     nameSeed: string;
   }
   ```

2. **System Positioning**
   - Generate 256 positions using seeded random
   - Apply minimum distance constraints
   - Calculate relative coordinates

3. **System Name Generation**
   - Use syllable-based name generation
   - 32 predefined syllables array
   - Procedural combination rules
   - Special names for unique systems

4. **System Properties Assignment**
   - Economy type (6 types): Agricultural, Industrial, etc.
   - Government type (8 types): Anarchy, Corporate State, etc.
   - Technology level (1-14 scale)
   - Population size
   - Tax level

#### Pseudocode Implementation
```typescript
class GalaxyGenerator {
  generateGalaxy(galaxyId: number): Galaxy {
    const seed = this.createSeed(galaxyId);
    const random = new SeededRandom(seed);
    
    const galaxy: Galaxy = {
      id: galaxyId,
      name: this.generateGalaxyName(random),
      systems: []
    };
    
    for (let systemId = 0; systemId < 256; systemId++) {
      const system = this.generateSystem(random, galaxyId, systemId);
      galaxy.systems.push(system);
    }
    
    return galaxy;
  }
  
  private generateSystem(random: SeededRandom, galaxyId: number, systemId: number): System {
    return {
      id: systemId,
      name: this.generateSystemName(random),
      economy: random.choice(Object.values(Economy)),
      government: random.choice(Object.values(Government)),
      techLevel: random.intRange(1, 14),
      population: this.calculatePopulation(random, economy),
      position: this.calculatePosition(random, systemId),
      planets: this.generatePlanets(random),
      market: this.initializeMarket(random),
      description: this.generateDescription(random, properties)
    };
  }
}
```

### 1.4 Implementation Complexity: Very High

## 2. Market Pricing Algorithm

### 2.1 Purpose
Calculate dynamic commodity prices based on system characteristics, supply/demand, and player actions.

### 2.2 Location
`model/trading/AliteMarket.java`

### 2.3 Algorithm Structure

#### 17 Trade Commodities
1. Food
2. Textiles
3. Liquor
4. Luxuries
5. Rare Artifacts
6. Computers
7. Machinery
8. Precious Metals
9. Gemstones
10. Alien Items
11. Firearms
12. Narcotics
13. Slaves
14. Explosives
15. Liquor
16. Computers
17. Machinery

#### Pricing Factors
1. **Economy Type Effect**
   - Agricultural worlds favor Food (+15%)
   - Industrial worlds favor Machinery (+20%)
   - Rich worlds favor Luxuries (+30%)

2. **Government Type Effect**
   - Anarchies reduce all prices (-10%)
   - Corporate states increase prices (+15%)
   - Democracies maintain standard rates

3. **Technology Level Effect**
   - High tech increases Computer prices (+25%)
   - Low tech reduces Computer prices (-20%)

4. **Distance from Core**
   - Outer rim increases luxury prices (+X% per sector)
   - Core systems reduce luxury prices (-X% per sector)

5. **Supply/Demand Cycle**
   - Recent purchases increase price
   - Player selling decreases price
   - Seasonal variations

#### Pseudocode Implementation
```typescript
class Market {
  calculatePrice(commodity: TradeGood, system: System, currentPrice?: number): number {
    const basePrice = commodity.basePrice;
    const economyFactor = this.getEconomyFactor(commodity, system.economy);
    const governmentFactor = this.getGovernmentFactor(system.government);
    const techFactor = this.getTechFactor(commodity, system.techLevel);
    const distanceFactor = this.getDistanceFactor(system, galaxyCore);
    const supplyDemandFactor = this.getSupplyDemandFactor(commodity, currentPrice);
    
    const finalPrice = basePrice * 
      economyFactor * 
      governmentFactor * 
      techFactor * 
      distanceFactor * 
      supplyDemandFactor;
    
    return Math.round(finalPrice * 100) / 100;
  }
  
  private getEconomyFactor(commodity: TradeGood, economy: Economy): number {
    const multipliers = {
      [Economy.AGRICULTURAL]: { food: 1.15, machinery: 0.8 },
      [Economy.INDUSTRIAL]: { machinery: 1.2, food: 0.9 },
      [Economy.RICH]: { luxury: 1.3, food: 0.7 },
      // ... other economy types
    };
    
    return multipliers[economy][commodity.category] || 1.0;
  }
}
```

### 2.4 Implementation Complexity: High

## 3. Space Physics and Movement

### 3.1 Purpose
Simulate realistic 3D space movement with Newtonian physics, thrust, and fuel consumption.

### 3.2 Location
`objects/space/MathHelper.java`, `SpaceObject.java`

### 3.3 Algorithm Structure

#### Vector Math Foundation
```typescript
class Vector3D {
  x: number;
  y: number;
  z: number;
  
  add(other: Vector3D): Vector3D
  subtract(other: Vector3D): Vector3D
  multiply(scalar: number): Vector3D
  length(): number
  normalize(): Vector3D
  cross(other: Vector3D): Vector3F
  dot(other: Vector3D): number
}
```

#### Movement Physics
1. **Velocity Calculation**
   ```typescript
   updatePosition(deltaTime: number): void {
     // Apply acceleration from thrust
     const thrustAcceleration = this.getThrustVector();
     this.velocity.add(thrustAcceleration.multiply(deltaTime));
     
     // Apply braking
     if (this.isBraking) {
       this.velocity.multiply(0.9);
     }
     
     // Update position
     this.position.add(this.velocity.multiply(deltaTime));
   }
   ```

2. **Fuel Consumption**
   ```typescript
   updateFuel(deltaTime: number): void {
     const fuelRate = this.calculateFuelRate();
     this.fuel -= fuelRate * deltaTime;
     
     if (this.fuel <= 0) {
       this.fuel = 0;
       this.disableEngines();
     }
   }
   ```

3. **Gravitational Effects**
   ```typescript
   applyGravity(planets: Planet[]): void {
     planets.forEach(planet => {
       const distance = this.position.distanceTo(planet.position);
       if (distance < planet.gravityRadius) {
         const gravitationalForce = planet.calculateGravitationalPull(this);
         this.velocity.add(gravitationalForce.multiply(deltaTime));
       }
     });
   }
   ```

### 3.4 Implementation Complexity: High

## 4. AI Behavior System

### 4.1 Purpose
Implement state machine-based AI for NPCs including patrol, engage, evade, and flee behaviors.

### 4.2 Location
`objects/space/SpaceObjectAI.java`, `AIMethod.java`

### 4.3 Algorithm Structure

#### AI State Machine
```typescript
enum AIState {
  PATROL,
  INVESTIGATE,
  ENGAGE,
  EVADE,
  FLEE,
  DOCK
}

class SpaceObjectAI {
  private state: AIState;
  private target?: SpaceObject;
  private waypoint: Vector3D;
  
  update(deltaTime: number): void {
    switch (this.state) {
      case AIState.PATROL:
        this.patrolBehavior(deltaTime);
        break;
      case AIState.INVESTIGATE:
        this.investigateBehavior(deltaTime);
        break;
      case AIState.ENGAGE:
        this.engageBehavior(deltaTime);
        break;
      case AIState.EVADE:
        this.evadeBehavior(deltaTime);
        break;
      case AIState.FLEE:
        this.fleeBehavior(deltaTime);
        break;
    }
  }
  
  private patrolBehavior(deltaTime: number): void {
    // Move between waypoints
    const distanceToWaypoint = this.position.distanceTo(this.waypoint);
    
    if (distanceToWaypoint < 100) {
      // Select new waypoint
      this.waypoint = this.selectRandomWaypoint();
    }
    
    // Move towards waypoint
    this.moveTowards(this.waypoint, deltaTime);
    
    // Check for threats
    const nearbyThreats = this.detectThreats();
    if (nearbyThreats.length > 0) {
      this.state = AIState.INVESTIGATE;
    }
  }
  
  private engageBehavior(deltaTime: number): void {
    if (!this.target) return;
    
    // Calculate intercept course
    const leadPosition = this.calculateInterceptPoint(this.target);
    
    // Move to intercept point
    this.moveTowards(leadPosition, deltaTime);
    
    // Fire weapons when in range
    if (this.isInWeaponRange(this.target)) {
      this.fireWeapons(this.target);
    }
    
    // Re-evaluate target
    if (this.shouldEvade()) {
      this.state = AIState.EVADE;
    }
  }
}
```

### 4.4 Implementation Complexity: Very High

## 5. Collision Detection System

### 5.1 Purpose
Detect collisions between space objects, projectiles, and environmental elements.

### 5.2 Location
`objects/space/SpaceObject.java`, `Collision detection logic`

### 5.3 Algorithm Structure

#### Broad Phase Detection
```typescript
class CollisionDetector {
  checkCollisions(objects: SpaceObject[]): Collision[] {
    const collisions: Collision[] = [];
    
    // Spatial partitioning for optimization
    const grid = new SpatialGrid(objects);
    
    for (const object of objects) {
      const nearbyObjects = grid.getNearbyObjects(object.position, object.radius);
      
      for (const other of nearbyObjects) {
        if (object.id !== other.id && this.checkSphereCollision(object, other)) {
          collisions.push({
            object1: object,
            object2: other,
            point: this.calculateCollisionPoint(object, other)
          });
        }
      }
    }
    
    return collisions;
  }
  
  private checkSphereCollision(obj1: SpaceObject, obj2: SpaceObject): boolean {
    const distance = obj1.position.distanceTo(obj2.position);
    const combinedRadius = obj1.collisionRadius + obj2.collisionRadius;
    return distance <= combinedRadius;
  }
}
```

#### Collision Response
```typescript
class Physics {
  resolveCollision(collision: Collision): void {
    const obj1 = collision.object1;
    const obj2 = collision.object2;
    
    // Calculate collision normal
    const normal = obj1.position.subtract(obj2.position).normalize();
    
    // Separate objects
    const penetration = obj1.collisionRadius + obj2.collisionRadius - 
                       obj1.position.distanceTo(obj2.position);
    
    obj1.position.add(normal.multiply(penetration * 0.5));
    obj2.position.subtract(normal.multiply(penetration * 0.5));
    
    // Calculate new velocities using elastic collision formula
    const relativeVelocity = obj1.velocity.subtract(obj2.velocity);
    const velocityAlongNormal = relativeVelocity.dot(normal);
    
    if (velocityAlongNormal > 0) return; // Objects separating
    
    const restitution = 0.8; // 80% energy retention
    const impulse = -(1 + restitution) * velocityAlongNormal / 
                   (obj1.mass + obj2.mass);
    
    obj1.velocity.add(normal.multiply(impulse * obj2.mass));
    obj2.velocity.subtract(normal.multiply(impulse * obj1.mass));
  }
}
```

### 5.4 Implementation Complexity: High

## 6. Mission Generation and Progression

### 6.1 Purpose
Generate dynamic missions and manage story progression through predefined questlines.

### 6.2 Location
`model/missions/MissionManager.java`, individual mission classes

### 6.3 Algorithm Structure

#### Mission Types
1. **Main Story Missions** (12+ missions)
   - Constrictor hunt
   - Cougar hunting expedition
   - Supernova disaster response
   - Thargoid investigation

2. **Procedural Missions**
   - Delivery contracts
   - Bounty hunting
   - Trade runs
   - Escort missions

#### Mission Structure
```typescript
interface Mission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  requirements: MissionRequirement[];
  objectives: MissionObjective[];
  rewards: MissionReward[];
  state: MissionState;
  progress: number;
}

class MissionManager {
  generateMission(system: System, player: Player): Mission | null {
    // Check if player qualifies for any missions
    const availableMissions = this.getAvailableMissions(player);
    
    // Weight missions based on player location and progress
    const weightedMissions = this.calculateWeights(availableMissions, system, player);
    
    // Select mission using weighted random
    return this.selectMission(weightedMissions);
  }
  
  private calculateWeights(missions: Mission[], system: System, player: Player): WeightedMission[] {
    return missions.map(mission => ({
      mission,
      weight: this.calculateMissionWeight(mission, system, player)
    }));
  }
  
  private calculateMissionWeight(mission: Mission, system: System, player: Player): number {
    let weight = 1.0;
    
    // Location-based weighting
    if (mission.location && system.economy === mission.location.economy) {
      weight *= 2.0;
    }
    
    // Player progress weighting
    if (player.rating >= mission.requiredRating) {
      weight *= 1.5;
    }
    
    // Story progression weighting
    if (this.isNextStoryMission(mission)) {
      weight *= 5.0;
    }
    
    return weight;
  }
}
```

### 6.4 Implementation Complexity: High

## 7. Performance Optimization Algorithms

### 7.1 Purpose
Optimize game performance through efficient data structures and algorithms.

### 7.2 Location
Framework optimizations, object pooling, spatial partitioning

### 7.3 Algorithm Structure

#### Object Pooling
```typescript
class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private factory: () => T;
  
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }
  
  release(obj: T): void {
    obj.reset();
    this.pool.push(obj);
  }
}

interface Poolable {
  reset(): void;
}
```

#### Spatial Partitioning
```typescript
class SpatialGrid {
  private grid: Map<string, SpaceObject[]>;
  private cellSize: number;
  
  getNearbyObjects(position: Vector3D, radius: number): SpaceObject[] {
    const minX = Math.floor((position.x - radius) / this.cellSize);
    const maxX = Math.floor((position.x + radius) / this.cellSize);
    const minY = Math.floor((position.y - radius) / this.cellSize);
    const maxY = Math.floor((position.y + radius) / this.cellSize);
    const minZ = Math.floor((position.z - radius) / this.cellSize);
    const maxZ = Math.floor((position.z + radius) / this.cellSize);
    
    const nearby: SpaceObject[] = [];
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const key = `${x},${y},${z}`;
          const cellObjects = this.grid.get(key) || [];
          nearby.push(...cellObjects);
        }
      }
    }
    
    return nearby;
  }
}
```

### 7.4 Implementation Complexity: Medium

## Implementation Recommendations

### Development Priority
1. **High Priority**: Galaxy Generation, Market Pricing, Physics
2. **Medium Priority**: AI Behavior, Collision Detection
3. **Lower Priority**: Mission Generation, Optimizations

### Testing Strategy
1. **Unit Tests**: Each algorithm component
2. **Integration Tests**: Algorithm interactions
3. **Performance Tests**: Memory and CPU usage
4. **Visual Tests**: Procedural generation results

### Key Considerations
- **Seeded Random**: Ensure consistency across sessions
- **Floating Point Precision**: Handle numerical precision issues
- **Performance**: Optimize for mobile browsers
- **Maintainability**: Clean, documented algorithm implementations

---

**Algorithm Documentation Completed:** 2025-10-31  
**Algorithms Documented:** 7 major algorithms  
**Implementation Complexity:** 2 Very High, 3 High, 2 Medium  
**Estimated Implementation Time:** 5-7 days for complete algorithm set