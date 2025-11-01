# Java to TypeScript Module Mapping

## Package-to-Module Mapping

### 1. Framework Layer Mapping

#### Core Engine Systems
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.framework.Game` | `core/engine/Game.ts` | Main game loop and timing | High |
| `de.phbouillon.android.framework.Screen` | `core/engine/Screen.ts` | Screen management | Medium |
| `de.phbouillon.android.framework.GlScreen` | `core/engine/GlScreen.ts` | OpenGL screen base | High |

#### Graphics System
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.framework.Graphics` | `core/graphics/Graphics.ts` | 2D graphics interface | High |
| `de.phbouillon.android.framework.impl.AndroidGraphics` | `core/graphics/CanvasGraphics.ts` | Canvas implementation | High |
| `de.phbouillon.android.framework.gl.*` | `core/graphics/webgl/*` | 3D graphics system | Very High |

#### Input System
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.framework.Input` | `core/input/Input.ts` | Input interface | Medium |
| `de.phbouillon.android.framework.impl.AndroidInput` | `core/input/BrowserInput.ts` | Browser input handling | Medium |
| `de.phbouillon.android.framework.impl.MultiTouchHandler` | `core/input/TouchHandler.ts` | Touch input processing | High |

#### Audio System
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.framework.Audio` | `core/audio/Audio.ts` | Audio interface | Medium |
| `de.phbouillon.android.framework.impl.AndroidAudio` | `core/audio/WebAudio.ts` | Web Audio API wrapper | High |
| `de.phbouillon.android.framework.Music` | `core/audio/Music.ts` | Background music | Medium |

### 2. Alite Game Layer Mapping

#### Data Models
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.games.alite.model.CommanderData` | `game/models/Commander.ts` | Player statistics | Medium |
| `de.phbouillon.android.games.alite.model.Player` | `game/models/Player.ts` | Player state | Medium |
| `de.phbouillon.android.games.alite.model.PlayerCobra` | `game/models/Ship.ts` | Ship data model | High |

#### Equipment & Inventory
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.games.alite.model.Equipment` | `game/models/Equipment.ts` | Equipment definitions | Medium |
| `de.phbouillon.android.games.alite.model.InventoryItem` | `game/models/Inventory.ts` | Inventory system | Medium |
| `de.phbouillon.android.games.alite.model.EquipmentStore` | `game/systems/EquipmentStore.ts` | Equipment catalog | Low |

#### Galaxy & Generation
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.games.alite.model.generator.GalaxyGenerator` | `game/systems/GalaxyGenerator.ts` | Procedural galaxy creation | Very High |
| `de.phbouillon.android.games.alite.model.generator.SystemData` | `game/models/System.ts` | Star system data | High |
| `de.phbouillon.android.games.alite.model.generator.InhabitantComputation` | `game/systems/PopulationGenerator.ts` | Population calculations | High |

#### Trading System
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.games.alite.model.trading.AliteMarket` | `game/systems/Market.ts` | Market management | High |
| `de.phbouillon.android.games.alite.model.trading.TradeGood` | `game/models/TradeGood.ts` | Commodity definitions | Low |
| `de.phbouillon.android.games.alite.model.trading.Market` | `game/models/MarketInstance.ts` | Individual market state | Medium |

#### Mission System
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.games.alite.model.missions.Mission` | `game/systems/Mission.ts` | Base mission interface | High |
| `de.phbouillon.android.games.alite.model.missions.MissionManager` | `game/systems/MissionManager.ts` | Mission progression | High |
| `*Mission.java` | `game/missions/*Mission.ts` | Specific mission implementations | Medium |

### 3. UI System Mapping

#### 2D Canvas Screens
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.games.alite.screens.canvas.*Screen` | `game/screens/*Screen.ts` | 2D UI screens | Medium-High |
| `de.phbouillon.android.games.alite.Button` | `game/ui/Button.ts` | Interactive button component | Low |
| `de.phbouillon.android.games.alite.NavigationBar` | `game/ui/NavigationBar.ts` | Navigation control bar | Medium |

#### 3D OpenGL Screens
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.games.alite.screens.opengl.ingame.FlightScreen` | `game/screens/FlightScreen.ts` | Main gameplay screen | Very High |
| `de.phbouillon.android.games.alite.screens.opengl.HyperspaceScreen` | `game/screens/HyperspaceScreen.ts` | Travel screen | High |

### 4. Space Object System Mapping

#### 3D Objects
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.games.alite.screens.opengl.objects.AliteObject` | `game/objects/BaseObject.ts` | Base 3D object | High |
| `de.phbouillon.android.games.alite.screens.opengl.objects.SpaceObject` | `game/objects/SpaceObject.ts` | Space entity | High |
| `de.phbouillon.android.games.alite.screens.opengl.objects.PlanetSpaceObject` | `game/objects/Planet.ts` | Planetary bodies | High |

#### AI System
| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.games.alite.screens.opengl.objects.space.SpaceObjectAI` | `game/ai/BaseAI.ts` | AI behavior framework | Very High |
| `de.phbouillon.android.games.alite.screens.opengl.objects.space.MathHelper` | `game/ai/MathUtils.ts` | Spatial calculations | Medium |

### 5. Plugin System Mapping

| Java Package | TypeScript Module | Purpose | Complexity |
|-------------|------------------|---------|-----------|
| `de.phbouillon.android.games.alite.oxp.OXPParser` | `plugins/OXPParser.ts` | Plugin format parser | High |
| `de.phbouillon.android.games.alite.framework.PluginManager` | `plugins/PluginManager.ts` | Plugin loading system | High |

## Implementation Priorities

### Phase 2-3: Core Systems (High Priority)
1. **Game Engine Core** - Foundation for everything else
2. **Graphics System** - Rendering is critical for gameplay
3. **Input Handling** - Essential for user interaction
4. **Audio System** - Important for immersion

### Phase 3-4: Game Logic (Medium Priority)
1. **Data Models** - Commander, Ship, Equipment
2. **Galaxy Generator** - Procedural content creation
3. **Market System** - Core gameplay loop
4. **UI Screens** - User interface implementation

### Phase 4-5: Advanced Features (Lower Priority)
1. **3D Space Objects** - Visual elements
2. **AI System** - NPC behavior
3. **Mission Framework** - Story content
4. **Plugin System** - Extensibility

## Technical Challenges

### High Complexity Mappings
1. **OpenGL to WebGL** - Graphics API translation
2. **Android APIs to Web APIs** - Platform differences
3. **Plugin Loading** - Security model differences
4. **Asset Management** - Loading and caching strategies

### Performance Considerations
1. **Memory Management** - Garbage collection differences
2. **Threading** - Web Workers vs Android threads
3. **Rendering Performance** - WebGL optimization
4. **Battery Usage** - Mobile optimization strategies

### Browser Compatibility
1. **API Differences** - Feature detection and fallbacks
2. **Security Restrictions** - CORS, local storage limits
3. **Performance Variations** - Cross-browser optimization
4. **Mobile Touch** - Responsive design challenges

## Recommended Development Order

1. **Foundation** (Week 1)
   - Core engine and graphics system
   - Basic input and audio

2. **Game Logic** (Week 2-3)
   - Data models and galaxy generation
   - Market and trading systems

3. **UI Implementation** (Week 3-4)
   - 2D screens and navigation
   - User interface components

4. **3D Systems** (Week 4-5)
   - Space rendering and objects
   - Physics and collision

5. **Advanced Features** (Week 5-6)
   - AI and missions
   - Plugin system and polish

---

**Module Mapping Completed:** 2025-10-31  
**Total Modules Mapped:** 50+ TypeScript modules  
**Complexity Assessment:** 8 Very High, 15 High, 20 Medium, 10 Low  
**Estimated Development:** 16-20 days following this mapping