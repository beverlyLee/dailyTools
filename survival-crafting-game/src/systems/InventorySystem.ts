import { Inventory, InventorySlot, Item, InventoryOperation, Serializable } from '../types';
import { GAME_CONFIG, ITEM_TYPES, ItemType } from '../config';

export class InventorySystem implements Serializable {
  private inventory: Inventory;

  constructor(maxSlots: number = GAME_CONFIG.inventory.slots, maxStackSize: number = GAME_CONFIG.inventory.maxStackSize) {
    this.inventory = {
      slots: Array.from({ length: maxSlots }, (_, i) => ({ index: i, item: null })),
      maxSlots,
      maxStackSize
    };
  }

  getInventory(): Inventory {
    return {
      slots: this.inventory.slots.map(slot => ({ 
        index: slot.index, 
        item: slot.item ? { ...slot.item } : null 
      })),
      maxSlots: this.inventory.maxSlots,
      maxStackSize: this.inventory.maxStackSize
    };
  }

  addItem(item: Item): boolean {
    if (item.quantity <= 0) return false;

    const itemType = ITEM_TYPES[item.type];
    let remainingQuantity = item.quantity;

    if (itemType.stackable) {
      for (let i = 0; i < this.inventory.slots.length && remainingQuantity > 0; i++) {
        const slot = this.inventory.slots[i];
        if (slot.item && slot.item.type === item.type) {
          const spaceInSlot = this.inventory.maxStackSize - slot.item.quantity;
          if (spaceInSlot > 0) {
            const quantityToAdd = Math.min(spaceInSlot, remainingQuantity);
            slot.item.quantity += quantityToAdd;
            remainingQuantity -= quantityToAdd;
          }
        }
      }
    }

    while (remainingQuantity > 0) {
      const emptySlot = this.inventory.slots.find(slot => slot.item === null);
      if (!emptySlot) return false;

      const quantityToAdd = itemType.stackable 
        ? Math.min(this.inventory.maxStackSize, remainingQuantity)
        : 1;

      emptySlot.item = {
        id: this.generateItemId(),
        type: item.type,
        quantity: quantityToAdd,
        metadata: item.metadata ? { ...item.metadata } : undefined
      };

      remainingQuantity -= quantityToAdd;
    }

    return true;
  }

  removeItem(index: number, quantity: number = 1): Item | null {
    const slot = this.inventory.slots[index];
    if (!slot.item) return null;
    if (quantity <= 0) return null;

    const quantityToRemove = Math.min(quantity, slot.item.quantity);
    const removedItem: Item = {
      ...slot.item,
      quantity: quantityToRemove
    };

    slot.item.quantity -= quantityToRemove;
    if (slot.item.quantity <= 0) {
      slot.item = null;
    }

    return removedItem;
  }

  swapItems(index1: number, index2: number): boolean {
    if (index1 < 0 || index1 >= this.inventory.maxSlots) return false;
    if (index2 < 0 || index2 >= this.inventory.maxSlots) return false;
    if (index1 === index2) return true;

    const slot1 = this.inventory.slots[index1];
    const slot2 = this.inventory.slots[index2];

    const temp = slot1.item;
    slot1.item = slot2.item;
    slot2.item = temp;

    return true;
  }

  splitStack(index: number, splitQuantity: number): boolean {
    const slot = this.inventory.slots[index];
    if (!slot.item) return false;
    if (splitQuantity <= 0 || splitQuantity >= slot.item.quantity) return false;

    const emptySlot = this.inventory.slots.find(s => s.item === null);
    if (!emptySlot) return false;

    const itemType = ITEM_TYPES[slot.item.type];
    if (!itemType.stackable) return false;

    emptySlot.item = {
      id: this.generateItemId(),
      type: slot.item.type,
      quantity: splitQuantity,
      metadata: slot.item.metadata ? { ...slot.item.metadata } : undefined
    };

    slot.item.quantity -= splitQuantity;

    return true;
  }

  mergeStacks(index1: number, index2: number): boolean {
    const slot1 = this.inventory.slots[index1];
    const slot2 = this.inventory.slots[index2];

    if (!slot1.item || !slot2.item) return false;
    if (slot1.item.type !== slot2.item.type) return false;

    const itemType = ITEM_TYPES[slot1.item.type];
    if (!itemType.stackable) return false;

    const spaceInSlot2 = this.inventory.maxStackSize - slot2.item.quantity;
    const quantityToMerge = Math.min(slot1.item.quantity, spaceInSlot2);

    if (quantityToMerge <= 0) return false;

    slot2.item.quantity += quantityToMerge;
    slot1.item.quantity -= quantityToMerge;

    if (slot1.item.quantity <= 0) {
      slot1.item = null;
    }

    return true;
  }

  getItemCount(type: ItemType): number {
    return this.inventory.slots.reduce((count, slot) => {
      if (slot.item && slot.item.type === type) {
        return count + slot.item.quantity;
      }
      return count;
    }, 0);
  }

  hasItems(requirements: Partial<Record<ItemType, number>>): boolean {
    for (const [type, quantity] of Object.entries(requirements)) {
      if (this.getItemCount(type as ItemType) < (quantity || 0)) {
        return false;
      }
    }
    return true;
  }

  removeItems(requirements: Partial<Record<ItemType, number>>): boolean {
    if (!this.hasItems(requirements)) return false;

    for (const [type, quantity] of Object.entries(requirements)) {
      let remaining = quantity || 0;
      
      for (let i = 0; i < this.inventory.slots.length && remaining > 0; i++) {
        const slot = this.inventory.slots[i];
        if (slot.item && slot.item.type === type) {
          const toRemove = Math.min(slot.item.quantity, remaining);
          slot.item.quantity -= toRemove;
          remaining -= toRemove;
          
          if (slot.item.quantity <= 0) {
            slot.item = null;
          }
        }
      }
    }

    return true;
  }

  executeOperation(operation: InventoryOperation): boolean {
    switch (operation.type) {
      case 'ADD':
        return this.addItem(operation.item);
      case 'REMOVE':
        return this.removeItem(operation.index, operation.quantity) !== null;
      case 'SWAP':
        return this.swapItems(operation.index1, operation.index2);
      case 'SPLIT':
        return this.splitStack(operation.index, operation.splitQuantity);
      case 'MERGE':
        return this.mergeStacks(operation.index1, operation.index2);
      default:
        return false;
    }
  }

  private generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  serialize(): string {
    return JSON.stringify({
      slots: this.inventory.slots.map(slot => ({
        index: slot.index,
        item: slot.item
      })),
      maxSlots: this.inventory.maxSlots,
      maxStackSize: this.inventory.maxStackSize
    });
  }

  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.inventory.slots = parsed.slots || this.inventory.slots;
      this.inventory.maxSlots = parsed.maxSlots || this.inventory.maxSlots;
      this.inventory.maxStackSize = parsed.maxStackSize || this.inventory.maxStackSize;
    } catch (error) {
      console.error('Failed to deserialize InventorySystem:', error);
    }
  }
}
