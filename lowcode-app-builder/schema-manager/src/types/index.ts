export type FieldType = 
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'text'
  | 'json'
  | 'uuid'

export type RelationType =
  | 'oneToOne'
  | 'oneToMany'
  | 'manyToOne'
  | 'manyToMany'

export interface Field {
  id: string
  name: string
  type: FieldType
  isPrimary: boolean
  isRequired: boolean
  isUnique: boolean
  default: string
  description: string
  length: number
  precision: number
  scale: number
}

export interface Index {
  id: string
  name: string
  fields: string[]
  isUnique: boolean
  type: string
}

export interface Relation {
  id: string
  name: string
  type: RelationType
  sourceTable: string
  sourceField: string
  targetTable: string
  targetField: string
  onDelete: string
  onUpdate: string
}

export interface Schema {
  id: string
  name: string
  description: string
  tableName: string
  fields: Field[]
  indexes: Index[]
  relations: Relation[]
  createdAt: string
  updatedAt: string
}

export interface CRUDResult {
  sql: string
  goModel: string
  apiHandlers: string
  apiRoutes: string
  typeScript: string
}

export interface FieldTypeOption {
  value: FieldType
  label: string
  description: string
}

export interface RelationTypeOption {
  value: RelationType
  label: string
  description: string
}
