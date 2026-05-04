import { levels } from '../src/levels';
import { LevelValidator } from '../src/utils/LevelValidator';
import { TileType } from '../src/types';

describe('All Levels Validation', () => {
  it('should validate all levels correctly', () => {
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const result = LevelValidator.validateLevel(level);
      
      console.log(`\n=== 关卡 ${i}: ${level.name} ===`);
      console.log('主题:', level.theme);
      
      // 统计箱子和目标点
      let boxCount = 0;
      let targetCount = 0;
      
      for (let z = 0; z < level.grid.length; z++) {
        for (let x = 0; x < level.grid[z].length; x++) {
          const tile = level.grid[z][x];
          if (tile === TileType.BOX || tile === TileType.BOX_ON_TARGET) {
            boxCount++;
            console.log(`  箱子位置: (${x}, ${z})`);
          }
          if (tile === TileType.TARGET || tile === TileType.BOX_ON_TARGET || tile === TileType.PLAYER_ON_TARGET) {
            targetCount++;
            console.log(`  目标点位置: (${x}, ${z})`);
          }
        }
      }
      
      console.log(`箱子数量: ${boxCount}`);
      console.log(`目标点数量: ${targetCount}`);
      console.log(`验证结果: ${result.isValid ? '有效 ✓' : '无效 ✗'}`);
      
      if (result.errors.length > 0) {
        console.log('错误:');
        result.errors.forEach(err => console.log(`  - ${err}`));
      }
      
      if (result.warnings.length > 0) {
        console.log('警告:');
        result.warnings.forEach(warn => console.log(`  - ${warn}`));
      }
      
      // 断言
      expect(result.isValid).toBe(true);
      expect(boxCount).toBe(targetCount);
    }
  });
});
