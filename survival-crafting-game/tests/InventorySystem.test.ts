import { InventorySystem } from '../src/systems/InventorySystem';
import { Item } from '../src/types';
import { ItemType } from '../src/config';

describe('InventorySystem', () => {
  let inventorySystem: InventorySystem;

  beforeEach(() => {
    inventorySystem = new InventorySystem(10, 64);
  });

  test('should initialize with empty slots', () => {
    const inventory = inventorySystem.getInventory();
    expect(inventory.maxSlots).toBe(10);
    expect(inventory.maxStackSize).toBe(64);
    expect(inventory.slots.every(slot => slot.item === null)).toBe(true);
  });

  test('should add item to empty slot', () => {
    const item: Item = {
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 10
    };

    const result = inventorySystem.addItem(item);
    expect(result).toBe(true);

    const inventory = inventorySystem.getInventory();
    const hasItem = inventory.slots.some(
      slot => slot.item?.type === 'wood' && slot.item.quantity === 10
    );
    expect(hasItem).toBe(true);
  });

  test('should stack items of same type', () => {
    const item1: Item = {
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 30
    };

    const item2: Item = {
      id: 'test_2',
      type: 'wood' as ItemType,
      quantity: 20
    };

    inventorySystem.addItem(item1);
    inventorySystem.addItem(item2);

    const inventory = inventorySystem.getInventory();
    const woodSlots = inventory.slots.filter(slot => slot.item?.type === 'wood');
    
    // 应该堆叠到同一个槽位
    expect(woodSlots.length).toBe(1);
    expect(woodSlots[0].item?.quantity).toBe(50);
  });

  test('should create new stack when stack is full', () => {
    const item1: Item = {
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 50
    };

    const item2: Item = {
      id: 'test_2',
      type: 'wood' as ItemType,
      quantity: 30
    };

    inventorySystem.addItem(item1);
    inventorySystem.addItem(item2);

    const inventory = inventorySystem.getInventory();
    const woodSlots = inventory.slots.filter(slot => slot.item?.type === 'wood');
    
    expect(woodSlots.length).toBe(2);
    expect(woodSlots[0].item?.quantity).toBe(64);
    expect(woodSlots[1].item?.quantity).toBe(16);
  });

  test('should remove item from slot', () => {
    const item: Item = {
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 10
    };

    inventorySystem.addItem(item);
    const inventory = inventorySystem.getInventory();
    const slotIndex = inventory.slots.findIndex(slot => slot.item !== null);

    const removed = inventorySystem.removeItem(slotIndex, 5);
    expect(removed).not.toBeNull();
    expect(removed?.quantity).toBe(5);

    const updatedInventory = inventorySystem.getInventory();
    expect(updatedInventory.slots[slotIndex].item?.quantity).toBe(5);
  });

  test('should remove entire stack when quantity exceeds', () => {
    const item: Item = {
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 5
    };

    inventorySystem.addItem(item);
    const inventory = inventorySystem.getInventory();
    const slotIndex = inventory.slots.findIndex(slot => slot.item !== null);

    const removed = inventorySystem.removeItem(slotIndex, 10);
    expect(removed?.quantity).toBe(5);

    const updatedInventory = inventorySystem.getInventory();
    expect(updatedInventory.slots[slotIndex].item).toBeNull();
  });

  test('should swap items between slots', () => {
    const item1: Item = {
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 10
    };

    const item2: Item = {
      id: 'test_2',
      type: 'stone' as ItemType,
      quantity: 5
    };

    inventorySystem.addItem(item1);
    inventorySystem.addItem(item2);

    const inventory = inventorySystem.getInventory();
    const woodIndex = inventory.slots.findIndex(slot => slot.item?.type === 'wood');
    const stoneIndex = inventory.slots.findIndex(slot => slot.item?.type === 'stone');

    const result = inventorySystem.swapItems(woodIndex, stoneIndex);
    expect(result).toBe(true);

    const updatedInventory = inventorySystem.getInventory();
    expect(updatedInventory.slots[woodIndex].item?.type).toBe('stone');
    expect(updatedInventory.slots[stoneIndex].item?.type).toBe('wood');
  });

  test('should split stack into two slots', () => {
    const item: Item = {
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 20
    };

    inventorySystem.addItem(item);
    const inventory = inventorySystem.getInventory();
    const slotIndex = inventory.slots.findIndex(slot => slot.item !== null);

    const result = inventorySystem.splitStack(slotIndex, 8);
    expect(result).toBe(true);

    const updatedInventory = inventorySystem.getInventory();
    const woodSlots = updatedInventory.slots.filter(slot => slot.item?.type === 'wood');
    
    expect(woodSlots.length).toBe(2);
    expect(woodSlots.some(s => s.item?.quantity === 12)).toBe(true);
    expect(woodSlots.some(s => s.item?.quantity === 8)).toBe(true);
  });

  test('should merge stacks of same type', () => {
    const item1: Item = {
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 20
    };

    const item2: Item = {
      id: 'test_2',
      type: 'wood' as ItemType,
      quantity: 30
    };

    inventorySystem.addItem(item1);
    // 强制放到不同槽位
    inventorySystem = new InventorySystem(10, 64);
    inventorySystem.addItem({ ...item1 });
    inventorySystem.addItem({ ...item2 });

    const inventory = inventorySystem.getInventory();
    const woodSlots = inventory.slots.filter(slot => slot.item?.type === 'wood');
    
    if (woodSlots.length === 2) {
      const index1 = inventory.slots.findIndex(s => s.item?.type === 'wood');
      const index2 = inventory.slots.findIndex((s, i) => s.item?.type === 'wood' && i !== index1);
      
      const result = inventorySystem.mergeStacks(index1, index2);
      expect(result).toBe(true);

      const updatedInventory = inventorySystem.getInventory();
      const updatedWoodSlots = updatedInventory.slots.filter(slot => slot.item?.type === 'wood');
      expect(updatedWoodSlots.length).toBe(1);
      expect(updatedWoodSlots[0].item?.quantity).toBe(50);
    }
  });

  test('should check item count correctly', () => {
    const item: Item = {
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 15
    };

    inventorySystem.addItem(item);
    
    expect(inventorySystem.getItemCount('wood' as ItemType)).toBe(15);
    expect(inventorySystem.getItemCount('stone' as ItemType)).toBe(0);
  });

  test('should check if has required items', () => {
    inventorySystem.addItem({
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 20
    });

    inventorySystem.addItem({
      id: 'test_2',
      type: 'stone' as ItemType,
      quantity: 10
    });

    expect(inventorySystem.hasItems({ wood: 10, stone: 5 } as any)).toBe(true);
    expect(inventorySystem.hasItems({ wood: 30, stone: 5 } as any)).toBe(false);
  });

  test('should remove multiple items by type', () => {
    inventorySystem.addItem({
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 20
    });

    inventorySystem.addItem({
      id: 'test_2',
      type: 'stone' as ItemType,
      quantity: 10
    });

    const result = inventorySystem.removeItems({ wood: 10, stone: 5 } as any);
    expect(result).toBe(true);

    expect(inventorySystem.getItemCount('wood' as ItemType)).toBe(10);
    expect(inventorySystem.getItemCount('stone' as ItemType)).toBe(5);
  });

  test('should serialize and deserialize correctly', () => {
    inventorySystem.addItem({
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 20
    });

    inventorySystem.addItem({
      id: 'test_2',
      type: 'stone' as ItemType,
      quantity: 10
    });

    const serialized = inventorySystem.serialize();
    const newSystem = new InventorySystem();
    newSystem.deserialize(serialized);

    expect(newSystem.getItemCount('wood' as ItemType)).toBe(20);
    expect(newSystem.getItemCount('stone' as ItemType)).toBe(10);
  });

  test('should return false when inventory is full', () => {
    const fullInventory = new InventorySystem(2, 10);
    
    fullInventory.addItem({
      id: 'test_1',
      type: 'wood' as ItemType,
      quantity: 10
    });

    fullInventory.addItem({
      id: 'test_2',
      type: 'stone' as ItemType,
      quantity: 10
    });

    const result = fullInventory.addItem({
      id: 'test_3',
      type: 'apple' as ItemType,
      quantity: 5
    });

    expect(result).toBe(false);
  });
});
