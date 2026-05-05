import { ValidationRule } from './types';

const EMAIL_PATTERN: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN: RegExp = /^1[3-9]\d{9}$/;
const URL_PATTERN: RegExp = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;

export const EmailValidator: ValidationRule = {
  type: 'email',
  pattern: EMAIL_PATTERN,
  message: 'Invalid email format'
};

export const PhoneValidator: ValidationRule = {
  type: 'phone',
  pattern: PHONE_PATTERN,
  message: 'Invalid phone number format (must be 11-digit Chinese mobile number)'
};

export const URLValidator: ValidationRule = {
  type: 'url',
  pattern: URL_PATTERN,
  message: 'Invalid URL format'
};

export class Validator {
  static validate(value: any, rule: ValidationRule): { valid: boolean; message?: string } {
    if (value === null || value === undefined) {
      return { valid: true };
    }

    switch (rule.type) {
      case 'email':
        return this.validateEmail(value, rule);
      case 'phone':
        return this.validatePhone(value, rule);
      case 'url':
        return this.validateURL(value, rule);
      case 'pattern':
        return this.validatePattern(value, rule);
      case 'range':
        return this.validateRange(value, rule);
      case 'enum':
        return this.validateEnum(value, rule);
      case 'length':
        return this.validateLength(value, rule);
      case 'custom':
        return this.validateCustom(value, rule);
      default:
        return { valid: true };
    }
  }

  private static validateEmail(value: any, rule: ValidationRule): { valid: boolean; message?: string } {
    const strValue = String(value);
    const pattern = rule.pattern || EMAIL_PATTERN;
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    
    if (regex.test(strValue)) {
      return { valid: true };
    }
    return { valid: false, message: rule.message || 'Invalid email format' };
  }

  private static validatePhone(value: any, rule: ValidationRule): { valid: boolean; message?: string } {
    const strValue = String(value);
    const pattern = rule.pattern || PHONE_PATTERN;
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    
    if (regex.test(strValue)) {
      return { valid: true };
    }
    return { valid: false, message: rule.message || 'Invalid phone number format' };
  }

  private static validateURL(value: any, rule: ValidationRule): { valid: boolean; message?: string } {
    const strValue = String(value);
    const pattern = rule.pattern || URL_PATTERN;
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    
    if (regex.test(strValue)) {
      return { valid: true };
    }
    
    try {
      new URL(strValue);
      return { valid: true };
    } catch {
    }
    
    return { valid: false, message: rule.message || 'Invalid URL format' };
  }

  private static validatePattern(value: any, rule: ValidationRule): { valid: boolean; message?: string } {
    if (!rule.pattern) {
      return { valid: true };
    }
    
    const strValue = String(value);
    const regex = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern);
    
    if (regex.test(strValue)) {
      return { valid: true };
    }
    return { valid: false, message: rule.message || `Value does not match pattern` };
  }

  private static validateRange(value: any, rule: ValidationRule): { valid: boolean; message?: string } {
    const numValue = Number(value);
    
    if (Number.isNaN(numValue)) {
      return { valid: false, message: rule.message || 'Value is not a number' };
    }
    
    if (rule.min !== undefined && numValue < rule.min) {
      return { valid: false, message: rule.message || `Value must be at least ${rule.min}` };
    }
    
    if (rule.max !== undefined && numValue > rule.max) {
      return { valid: false, message: rule.message || `Value must be at most ${rule.max}` };
    }
    
    return { valid: true };
  }

  private static validateEnum(value: any, rule: ValidationRule): { valid: boolean; message?: string } {
    if (!rule.values || rule.values.length === 0) {
      return { valid: true };
    }
    
    if (rule.values.includes(value)) {
      return { valid: true };
    }
    
    return { 
      valid: false, 
      message: rule.message || `Value must be one of: ${rule.values.join(', ')}` 
    };
  }

  private static validateLength(value: any, rule: ValidationRule): { valid: boolean; message?: string } {
    const strValue = String(value);
    const length = strValue.length;
    
    if (rule.min !== undefined && length < rule.min) {
      return { valid: false, message: rule.message || `Length must be at least ${rule.min}` };
    }
    
    if (rule.max !== undefined && length > rule.max) {
      return { valid: false, message: rule.message || `Length must be at most ${rule.max}` };
    }
    
    return { valid: true };
  }

  private static validateCustom(value: any, rule: ValidationRule): { valid: boolean; message?: string } {
    if (!rule.validator) {
      return { valid: true };
    }
    
    try {
      if (rule.validator(value)) {
        return { valid: true };
      }
      return { valid: false, message: rule.message || 'Custom validation failed' };
    } catch (error) {
      return { valid: false, message: rule.message || `Validation error: ${error}` };
    }
  }

  static validateAll(value: any, rules: ValidationRule[]): { valid: boolean; errors: Array<{ message: string; rule: string }> } {
    const errors: Array<{ message: string; rule: string }> = [];
    
    for (const rule of rules) {
      const result = this.validate(value, rule);
      if (!result.valid && result.message) {
        errors.push({ message: result.message, rule: rule.type });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
