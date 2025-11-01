import { Game } from '@core/engine/Game';
import { InputManager } from '@core/input/InputManager';
import { AudioManager } from '@core/audio/Audio';
import { Logger, PerformanceMonitor, Assert } from '@utils/Logging';
import { Canvas2DRenderer, TextureManager, Camera2D, Sprite } from '@core/graphics/Graphics';
import { SaveGameManager, SettingsStorage } from '@core/storage/Storage';

/**
 * Framework test suite
 */
export class FrameworkTest {
  private logger: Logger;
  private performanceMonitor: PerformanceMonitor;
  private testResults: Map<string, boolean> = new Map();

  constructor() {
    this.logger = Logger.getInstance();
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  /**
   * Run all framework tests
   */
  public async runAllTests(): Promise<boolean> {
    this.logger.info('Starting Framework Test Suite');
    this.testResults.clear();

    try {
      await this.testLoggingSystem();
      await this.testPerformanceMonitor();
      await this.testGameEngine();
      await this.testInputManager();
      await this.testGraphicsSystem();
      await this.testAudioManager();
      await this.testStorageSystem();

      const passed = Array.from(this.testResults.values()).filter(Boolean).length;
      const total = this.testResults.size;

      this.logger.info(`Framework Tests Complete: ${passed}/${total} passed`);
      
      if (passed === total) {
        this.logger.info('✅ All framework tests passed!');
      } else {
        this.logger.warn('❌ Some framework tests failed');
      }

      return passed === total;
    } catch (error) {
      this.logger.error('Framework test suite failed', error);
      return false;
    }
  }

  private async testLoggingSystem(): Promise<void> {
    this.logger.info('Testing Logging System...');
    
    try {
      // Test logger singleton
      const logger1 = Logger.getInstance();
      const logger2 = Logger.getInstance();
      Assert.assert(logger1 === logger2, 'Logger should be singleton');

      // Test log levels
      logger1.setLogLevel('INFO' as any);
      logger1.debug('Debug message'); // Should be ignored
      logger1.info('Info message'); // Should be logged
      logger1.warn('Warning message'); // Should be logged
      logger1.error('Error message'); // Should be logged

      // Test listener
      let listenerCalled = false;
      logger1.addListener(() => { listenerCalled = true; });
      logger1.info('Test message for listener');
      Assert.assert(listenerCalled, 'Listener should be called');

      this.testResults.set('logging', true);
      this.logger.info('✅ Logging System test passed');
    } catch (error) {
      this.testResults.set('logging', false);
      this.logger.error('❌ Logging System test failed', error);
    }
  }

  private async testPerformanceMonitor(): Promise<void> {
    this.logger.info('Testing Performance Monitor...');
    
    try {
      // Test singleton
      const monitor1 = PerformanceMonitor.getInstance();
      const monitor2 = PerformanceMonitor.getInstance();
      Assert.assert(monitor1 === monitor2, 'PerformanceMonitor should be singleton');

      // Test frame timing
      monitor1.startFrame();
      await this.delay(16); // Simulate ~60fps frame
      monitor1.endFrame();

      const metrics = monitor1.getMetrics();
      Assert.assert(typeof metrics.fps === 'number', 'FPS should be a number');
      Assert.assert(metrics.fps > 0, 'FPS should be positive');
      Assert.assert(typeof metrics.avgFrameTime === 'number', 'Avg frame time should be a number');

      this.testResults.set('performance', true);
      this.logger.info('✅ Performance Monitor test passed');
    } catch (error) {
      this.testResults.set('performance', false);
      this.logger.error('❌ Performance Monitor test failed', error);
    }
  }

  private async testGameEngine(): Promise<void> {
    this.logger.info('Testing Game Engine...');
    
    try {
      // Test singleton
      const game1 = Game.getInstance();
      const game2 = Game.getInstance();
      Assert.assert(game1 === game2, 'Game should be singleton');

      // Test initial state
      Assert.assert(game1.getCurrentState() === 'LOADING', 'Initial state should be LOADING');
      Assert.assert(!game1.getIsRunning(), 'Game should not be running initially');

      // Test canvas setup
      const canvas = this.createTestCanvas();
      await game1.initialize(canvas);
      
      Assert.assert(game1.getCanvas() === canvas, 'Canvas should be set correctly');
      Assert.assert(game1.getContext() !== null, 'Context should be available');

      this.testResults.set('game_engine', true);
      this.logger.info('✅ Game Engine test passed');
    } catch (error) {
      this.testResults.set('game_engine', false);
      this.logger.error('❌ Game Engine test failed', error);
    }
  }

  private async testInputManager(): Promise<void> {
    this.logger.info('Testing Input Manager...');
    
    try {
      // Test singleton
      const input1 = InputManager.getInstance();
      const input2 = InputManager.getInstance();
      Assert.assert(input1 === input2, 'InputManager should be singleton');

      // Test control mappings
      input1.bindAction('TEST_ACTION', ['KeyA', 'KeyB']);
      const mappings = input1.getControlMappings('TEST_ACTION');
      Assert.assert(mappings.length === 2, 'Should have 2 key mappings');

      // Test event listener
      let eventReceived = false;
      input1.addEventListener('keyPressed', () => { eventReceived = true; });
      
      this.testResults.set('input_manager', true);
      this.logger.info('✅ Input Manager test passed');
    } catch (error) {
      this.testResults.set('input_manager', false);
      this.logger.error('❌ Input Manager test failed', error);
    }
  }

  private async testGraphicsSystem(): Promise<void> {
    this.logger.info('Testing Graphics System...');
    
    try {
      // Test texture manager singleton
      const textureManager1 = TextureManager.getInstance();
      const textureManager2 = TextureManager.getInstance();
      Assert.assert(textureManager1 === textureManager2, 'TextureManager should be singleton');

      // Test camera
      const camera = new Camera2D();
      camera.setPosition(100, 200);
      camera.setZoom(2.0);
      
      const position = camera.getPosition();
      Assert.assert(position.x === 100, 'Camera X position should be 100');
      Assert.assert(position.y === 200, 'Camera Y position should be 200');
      Assert.assert(camera.getZoom() === 2.0, 'Camera zoom should be 2.0');

      // Test sprite
      const sprite = new Sprite();
      sprite.setPosition(50, 75);
      sprite.setSize(32, 32);
      
      const spritePos = sprite.getPosition();
      Assert.assert(spritePos.x === 50, 'Sprite X position should be 50');
      Assert.assert(spritePos.y === 75, 'Sprite Y position should be 75');

      this.testResults.set('graphics', true);
      this.logger.info('✅ Graphics System test passed');
    } catch (error) {
      this.testResults.set('graphics', false);
      this.logger.error('❌ Graphics System test failed', error);
    }
  }

  private async testAudioManager(): Promise<void> {
    this.logger.info('Testing Audio Manager...');
    
    try {
      // Test singleton
      const audio1 = AudioManager.getInstance();
      const audio2 = AudioManager.getInstance();
      Assert.assert(audio1 === audio2, 'AudioManager should be singleton');

      // Test configuration
      const config = audio1.getConfig();
      Assert.assert(typeof config.masterVolume === 'number', 'Master volume should be number');
      Assert.assert(config.masterVolume >= 0 && config.masterVolume <= 1, 'Master volume should be 0-1');

      // Test volume settings
      audio1.setMasterVolume(0.5);
      audio1.setMusicVolume(0.7);
      audio1.setSfxVolume(0.8);

      const updatedConfig = audio1.getConfig();
      Assert.assert(updatedConfig.masterVolume === 0.5, 'Master volume should be updated');
      Assert.assert(updatedConfig.musicVolume === 0.7, 'Music volume should be updated');
      Assert.assert(updatedConfig.sfxVolume === 0.8, 'SFX volume should be updated');

      this.testResults.set('audio', true);
      this.logger.info('✅ Audio Manager test passed');
    } catch (error) {
      this.testResults.set('audio', false);
      this.logger.error('❌ Audio Manager test failed', error);
    }
  }

  private async testStorageSystem(): Promise<void> {
    this.logger.info('Testing Storage System...');
    
    try {
      // Test settings storage singleton
      const settingsStorage1 = SettingsStorage.getInstance();
      const settingsStorage2 = SettingsStorage.getInstance();
      Assert.assert(settingsStorage1 === settingsStorage2, 'SettingsStorage should be singleton');

      // Test save game manager
      const saveGameManager = new SaveGameManager();
      
      // Test default settings
      const defaultSettings = settingsStorage1.getDefaultSettings();
      Assert.assert(defaultSettings.graphics, 'Default settings should have graphics');
      Assert.assert(defaultSettings.audio, 'Default settings should have audio');

      // Test save game data creation
      const newGameData = saveGameManager.createNewGameData();
      Assert.assert(newGameData.commander, 'New game should have commander data');
      Assert.assert(newGameData.playerShip, 'New game should have player ship data');

      this.testResults.set('storage', true);
      this.logger.info('✅ Storage System test passed');
    } catch (error) {
      this.testResults.set('storage', false);
      this.logger.error('❌ Storage System test failed', error);
    }
  }

  /**
   * Get test results summary
   */
  public getTestResults(): Map<string, boolean> {
    return new Map(this.testResults);
  }

  /**
   * Generate test report
   */
  public generateReport(): string {
    const results = Array.from(this.testResults.entries());
    const passed = results.filter(([, passed]) => passed).length;
    const total = results.length;

    let report = '=== Framework Test Report ===\n\n';
    
    results.forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      report += `${status} ${test}\n`;
    });

    report += `\n=== Summary ===\n`;
    report += `Passed: ${passed}/${total}\n`;
    report += `Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%\n`;

    return report;
  }

  /**
   * Create a test canvas element
   */
  private createTestCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    return canvas;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
