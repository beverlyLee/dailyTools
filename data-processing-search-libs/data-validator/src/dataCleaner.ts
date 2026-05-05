import {
  SchemaDefinition,
  FieldDefinition,
  CleanResult,
  ValidationError,
  OutlierInfo,
  OutlierMethod
} from './types';
import { TypeConverter } from './typeConverter';
import { Validator } from './validators';
import { OutlierDetector } from './outlierDetector';

export class DataCleaner {
  private schema: SchemaDefinition;

  constructor(schema: SchemaDefinition) {
    this.schema = schema;
  }

  clean<T = any>(data: any[]): CleanResult<T> {
    const result: CleanResult<T> = {
      data: [],
      removedRows: [],
      outliers: [],
      errors: [],
      transformations: []
    };

    const columnValues: Record<string, number[]> = {};
    for (const fieldName in this.schema.fields) {
      const fieldDef = this.schema.fields[fieldName];
      if (fieldDef.type === 'number' && fieldDef.outlierDetection) {
        columnValues[fieldName] = data.map(row => {
          const value = row[fieldName];
          const converted = TypeConverter.convert(value, 'number');
          return converted.value;
        });
      }
    }

    const columnOutliers: Record<string, OutlierInfo[]> = {};
    for (const fieldName in columnValues) {
      const fieldDef = this.schema.fields[fieldName];
      const method: OutlierMethod = fieldDef.outlierMethod || 'iqr';
      const outliers = OutlierDetector.detect(columnValues[fieldName], method);
      columnOutliers[fieldName] = outliers.map((o, i) => ({ ...o, field: fieldName, index: i }));
      
      result.outliers.push(...columnOutliers[fieldName]);
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const cleanedRow: any = {};
      let shouldRemove = false;

      for (const fieldName in this.schema.fields) {
        const fieldDef = this.schema.fields[fieldName];
        let value = row[fieldName];

        if (fieldDef.outlierDetection && columnOutliers[fieldName] && columnOutliers[fieldName][i]?.isOutlier) {
          const outlierInfo = columnOutliers[fieldName][i];
          
          if (fieldDef.outlierAction === 'remove') {
            shouldRemove = true;
          } else if (fieldDef.outlierAction === 'error') {
            result.errors.push({
              field: fieldName,
              value: outlierInfo.value,
              message: `Outlier detected: ${outlierInfo.value}`,
              rule: 'outlier'
            });
          }
        }

        const isMissing = value === null || value === undefined || value === '';
        
        if (isMissing) {
          if (fieldDef.required && !fieldDef.nullable) {
            if (fieldDef.missingStrategy === 'error') {
              result.errors.push({
                field: fieldName,
                value,
                message: `Field "${fieldName}" is required and cannot be null or empty`,
                rule: 'required'
              });
              shouldRemove = true;
            } else if (fieldDef.missingStrategy === 'drop') {
              shouldRemove = true;
            } else if (fieldDef.missingStrategy === 'fill') {
              if (fieldDef.default !== undefined) {
                result.transformations.push({
                  field: fieldName,
                  index: i,
                  from: value,
                  to: fieldDef.default
                });
                value = fieldDef.default;
              }
            }
          } else if (fieldDef.default !== undefined) {
            result.transformations.push({
              field: fieldName,
              index: i,
              from: value,
              to: fieldDef.default
            });
            value = fieldDef.default;
          }
        }

        const originalValue = value;
        const conversion = TypeConverter.convert(value, fieldDef.type);
        
        if (!conversion.converted && conversion.error) {
          if (this.schema.strict) {
            result.errors.push({
              field: fieldName,
              value: originalValue,
              message: conversion.error,
              rule: 'type'
            });
            shouldRemove = true;
          }
        }
        
        value = conversion.value;

        if (fieldDef.transform && value !== null && value !== undefined) {
          try {
            const transformedValue = fieldDef.transform(value);
            if (transformedValue !== value) {
              result.transformations.push({
                field: fieldName,
                index: i,
                from: value,
                to: transformedValue
              });
              value = transformedValue;
            }
          } catch (err: any) {
            result.errors.push({
              field: fieldName,
              value: value,
              message: `Transform error: ${err.message}`,
              rule: 'transform'
            });
          }
        }

        if (fieldDef.rules && value !== null && value !== undefined) {
          const validation = Validator.validateAll(value, fieldDef.rules);
          
          if (!validation.valid) {
            for (const error of validation.errors) {
              result.errors.push({
                field: fieldName,
                value: value,
                message: error.message,
                rule: error.rule
              });
            }
            
            if (this.schema.strict) {
              shouldRemove = true;
            }
          }
        }

        cleanedRow[fieldName] = value;
      }

      if (shouldRemove) {
        result.removedRows.push(i);
      } else {
        result.data.push(cleanedRow as T);
      }
    }

    return result;
  }

  validate<T = any>(data: any[]): { valid: boolean; errors: ValidationError[]; data: T[] } {
    const errors: ValidationError[] = [];
    const validatedData: T[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const validatedRow: any = {};
      let rowValid = true;

      for (const fieldName in this.schema.fields) {
        const fieldDef = this.schema.fields[fieldName];
        let value = row[fieldName];

        const isMissing = value === null || value === undefined || value === '';
        if (isMissing) {
          if (fieldDef.required && !fieldDef.nullable) {
            errors.push({
              field: fieldName,
              value,
              message: `Field "${fieldName}" is required`,
              rule: 'required'
            });
            rowValid = false;
          }
          validatedRow[fieldName] = fieldDef.default ?? null;
          continue;
        }

        const conversion = TypeConverter.convert(value, fieldDef.type);
        if (!conversion.converted && conversion.error) {
          errors.push({
            field: fieldName,
            value,
            message: conversion.error,
            rule: 'type'
          });
          rowValid = false;
        }
        value = conversion.value;

        if (fieldDef.rules) {
          const validation = Validator.validateAll(value, fieldDef.rules);
          if (!validation.valid) {
            for (const error of validation.errors) {
              errors.push({
                field: fieldName,
                value,
                message: error.message,
                rule: error.rule
              });
            }
            rowValid = false;
          }
        }

        validatedRow[fieldName] = value;
      }

      if (rowValid) {
        validatedData.push(validatedRow as T);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data: validatedData
    };
  }

  inferSchema(data: any[]): SchemaDefinition {
    const fields: Record<string, FieldDefinition> = {};
    const sampleSize = Math.min(data.length, 100);
    const sample = data.slice(0, sampleSize);

    if (sample.length === 0) {
      return { fields };
    }

    const firstRow = sample[0];
    
    for (const key in firstRow) {
      const values = sample.map(row => row[key]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
      
      let inferredType = 'string';
      
      if (nonNullValues.length > 0) {
        const types = nonNullValues.map(v => TypeConverter.inferType(v));
        const typeCounts: Record<string, number> = {};
        for (const t of types) {
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        }
        
        const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
        inferredType = sortedTypes[0][0];
      }

      fields[key] = {
        type: inferredType as any,
        required: values.every(v => v !== null && v !== undefined && v !== ''),
        nullable: values.some(v => v === null || v === undefined),
        default: undefined,
        missingStrategy: 'ignore',
        outlierDetection: inferredType === 'number',
        outlierMethod: 'iqr',
        rules: []
      };
    }

    return {
      fields,
      strict: false
    };
  }
}
