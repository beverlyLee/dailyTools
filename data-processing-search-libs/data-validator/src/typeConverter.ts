import { FieldType } from './types';

export class TypeConverter {
  static convert(value: any, targetType: FieldType): { converted: boolean; value: any; error?: string } {
    if (value === null || value === undefined) {
      return { converted: true, value };
    }

    switch (targetType) {
      case 'string':
        return this.toString(value);
      case 'number':
        return this.toNumber(value);
      case 'boolean':
        return this.toBoolean(value);
      case 'date':
        return this.toDate(value);
      case 'array':
        return this.toArray(value);
      case 'object':
        return this.toObject(value);
      default:
        return { converted: true, value };
    }
  }

  private static toString(value: any): { converted: boolean; value: string } {
    if (typeof value === 'string') {
      return { converted: true, value };
    }
    if (value === null || value === undefined) {
      return { converted: true, value: '' };
    }
    return { converted: true, value: String(value) };
  }

  private static toNumber(value: any): { converted: boolean; value: number | null; error?: string } {
    if (typeof value === 'number') {
      return { converted: true, value: Number.isFinite(value) ? value : null };
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return { converted: true, value: null };
      }
      
      const num = Number(trimmed);
      if (Number.isFinite(num)) {
        return { converted: true, value: num };
      }
      
      return { 
        converted: false, 
        value: null, 
        error: `Cannot convert string "${value}" to number` 
      };
    }

    if (typeof value === 'boolean') {
      return { converted: true, value: value ? 1 : 0 };
    }

    return { 
      converted: false, 
      value: null, 
      error: `Cannot convert ${typeof value} to number` 
    };
  }

  private static toBoolean(value: any): { converted: boolean; value: boolean; error?: string } {
    if (typeof value === 'boolean') {
      return { converted: true, value };
    }

    if (typeof value === 'string') {
      const lower = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on', 'y'].includes(lower)) {
        return { converted: true, value: true };
      }
      if (['false', '0', 'no', 'off', 'n', ''].includes(lower)) {
        return { converted: true, value: false };
      }
      return { 
        converted: false, 
        value: false, 
        error: `Cannot convert string "${value}" to boolean` 
      };
    }

    if (typeof value === 'number') {
      return { converted: true, value: value !== 0 };
    }

    return { 
      converted: false, 
      value: !!value, 
      error: `Cannot convert ${typeof value} to boolean` 
    };
  }

  private static toDate(value: any): { converted: boolean; value: Date | null; error?: string } {
    if (value instanceof Date) {
      if (Number.isFinite(value.getTime())) {
        return { converted: true, value };
      }
      return { converted: false, value: null, error: 'Invalid Date object' };
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return { converted: true, value: null };
      }
      
      const parsed = new Date(trimmed);
      if (Number.isFinite(parsed.getTime())) {
        return { converted: true, value: parsed };
      }
      
      const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        const [, year, month, day] = isoMatch;
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        if (Number.isFinite(date.getTime())) {
          return { converted: true, value: date };
        }
      }
      
      return { 
        converted: false, 
        value: null, 
        error: `Cannot convert string "${value}" to date` 
      };
    }

    if (typeof value === 'number') {
      const date = new Date(value);
      if (Number.isFinite(date.getTime())) {
        return { converted: true, value: date };
      }
      return { converted: false, value: null, error: `Cannot convert number ${value} to date` };
    }

    return { 
      converted: false, 
      value: null, 
      error: `Cannot convert ${typeof value} to date` 
    };
  }

  private static toArray(value: any): { converted: boolean; value: any[]; error?: string } {
    if (Array.isArray(value)) {
      return { converted: true, value };
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return { converted: true, value: [] };
      }
      
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return { converted: true, value: parsed };
          }
        } catch {
        }
      }
      
      const delimiters = [',', ';', '|', '\t'];
      for (const delimiter of delimiters) {
        if (trimmed.includes(delimiter)) {
          const parts = trimmed.split(delimiter).map(p => p.trim());
          if (parts.length > 1) {
            return { converted: true, value: parts };
          }
        }
      }
      
      return { converted: true, value: [trimmed] };
    }

    return { converted: true, value: [value] };
  }

  private static toObject(value: any): { converted: boolean; value: object | null; error?: string } {
    if (value === null || value === undefined) {
      return { converted: true, value: null };
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return { converted: true, value };
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') {
        return { converted: true, value: null };
      }
      
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return { converted: true, value: parsed };
          }
        } catch {
        }
      }
      
      return { 
        converted: false, 
        value: null, 
        error: `Cannot convert string "${value}" to object` 
      };
    }

    return { 
      converted: false, 
      value: null, 
      error: `Cannot convert ${typeof value} to object` 
    };
  }

  static inferType(value: any): FieldType {
    if (value === null || value === undefined) {
      return 'string';
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      
      if (trimmed === '') {
        return 'string';
      }
      
      const num = Number(trimmed);
      if (Number.isFinite(num)) {
        return 'number';
      }
      
      const date = new Date(trimmed);
      if (Number.isFinite(date.getTime())) {
        return 'date';
      }
      
      if (['true', 'false', 'yes', 'no', 'on', 'off', 'y', 'n'].includes(trimmed.toLowerCase())) {
        return 'boolean';
      }
      
      return 'string';
    }

    if (Array.isArray(value)) {
      return 'array';
    }

    if (value instanceof Date) {
      return 'date';
    }

    return typeof value as FieldType;
  }
}
