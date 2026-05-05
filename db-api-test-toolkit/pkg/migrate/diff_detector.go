package migrate

import (
	"fmt"
)

type DiffType string

const (
	DiffTypeAddTable    DiffType = "add_table"
	DiffTypeDropTable   DiffType = "drop_table"
	DiffTypeAddColumn   DiffType = "add_column"
	DiffTypeDropColumn  DiffType = "drop_column"
	DiffTypeModifyColumn DiffType = "modify_column"
	DiffTypeAddIndex    DiffType = "add_index"
	DiffTypeDropIndex   DiffType = "drop_index"
)

type SchemaDiff struct {
	Type        DiffType
	TableName   string
	Description string
	OldTable    *Table
	NewTable    *Table
	OldColumn   *Column
	NewColumn   *Column
	OldIndex    *Index
	NewIndex    *Index
}

type DiffDetector struct{}

func NewDiffDetector() *DiffDetector {
	return &DiffDetector{}
}

func (d *DiffDetector) DetectDiffs(currentSchema, targetSchema *ModelDefinition) ([]SchemaDiff, error) {
	var diffs []SchemaDiff

	currentTables := make(map[string]*Table)
	for i := range currentSchema.Tables {
		currentTables[currentSchema.Tables[i].Name] = &currentSchema.Tables[i]
	}

	targetTables := make(map[string]*Table)
	for i := range targetSchema.Tables {
		targetTables[targetSchema.Tables[i].Name] = &targetSchema.Tables[i]
	}

	for name := range targetTables {
		if _, exists := currentTables[name]; !exists {
			diffs = append(diffs, SchemaDiff{
				Type:        DiffTypeAddTable,
				TableName:   name,
				Description: fmt.Sprintf("添加表: %s", name),
				NewTable:    targetTables[name],
			})
		} else {
			tableDiffs, err := d.detectTableDiffs(currentTables[name], targetTables[name])
			if err != nil {
				return nil, err
			}
			diffs = append(diffs, tableDiffs...)
		}
	}

	for name := range currentTables {
		if _, exists := targetTables[name]; !exists {
			diffs = append(diffs, SchemaDiff{
				Type:        DiffTypeDropTable,
				TableName:   name,
				Description: fmt.Sprintf("删除表: %s", name),
				OldTable:    currentTables[name],
			})
		}
	}

	return diffs, nil
}

func (d *DiffDetector) detectTableDiffs(currentTable, targetTable *Table) ([]SchemaDiff, error) {
	var diffs []SchemaDiff

	currentColumns := make(map[string]*Column)
	for i := range currentTable.Columns {
		currentColumns[currentTable.Columns[i].Name] = &currentTable.Columns[i]
	}

	targetColumns := make(map[string]*Column)
	for i := range targetTable.Columns {
		targetColumns[targetTable.Columns[i].Name] = &targetTable.Columns[i]
	}

	for name := range targetColumns {
		if _, exists := currentColumns[name]; !exists {
			diffs = append(diffs, SchemaDiff{
				Type:        DiffTypeAddColumn,
				TableName:   currentTable.Name,
				Description: fmt.Sprintf("添加列: %s.%s", currentTable.Name, name),
				NewColumn:   targetColumns[name],
			})
		} else if !d.columnsEqual(currentColumns[name], targetColumns[name]) {
			diffs = append(diffs, SchemaDiff{
				Type:        DiffTypeModifyColumn,
				TableName:   currentTable.Name,
				Description: fmt.Sprintf("修改列: %s.%s", currentTable.Name, name),
				OldColumn:   currentColumns[name],
				NewColumn:   targetColumns[name],
			})
		}
	}

	for name := range currentColumns {
		if _, exists := targetColumns[name]; !exists {
			diffs = append(diffs, SchemaDiff{
				Type:        DiffTypeDropColumn,
				TableName:   currentTable.Name,
				Description: fmt.Sprintf("删除列: %s.%s", currentTable.Name, name),
				OldColumn:   currentColumns[name],
			})
		}
	}

	currentIndexes := make(map[string]*Index)
	for i := range currentTable.Indexes {
		currentIndexes[currentTable.Indexes[i].Name] = &currentTable.Indexes[i]
	}

	targetIndexes := make(map[string]*Index)
	for i := range targetTable.Indexes {
		targetIndexes[targetTable.Indexes[i].Name] = &targetTable.Indexes[i]
	}

	for name := range targetIndexes {
		if _, exists := currentIndexes[name]; !exists {
			diffs = append(diffs, SchemaDiff{
				Type:        DiffTypeAddIndex,
				TableName:   currentTable.Name,
				Description: fmt.Sprintf("添加索引: %s", name),
				NewIndex:    targetIndexes[name],
			})
		}
	}

	for name := range currentIndexes {
		if _, exists := targetIndexes[name]; !exists {
			diffs = append(diffs, SchemaDiff{
				Type:        DiffTypeDropIndex,
				TableName:   currentTable.Name,
				Description: fmt.Sprintf("删除索引: %s", name),
				OldIndex:    currentIndexes[name],
			})
		}
	}

	return diffs, nil
}

func (d *DiffDetector) columnsEqual(col1, col2 *Column) bool {
	if col1.Name != col2.Name {
		return false
	}
	if col1.Type != col2.Type {
		return false
	}
	if col1.Nullable != col2.Nullable {
		return false
	}
	if col1.PrimaryKey != col2.PrimaryKey {
		return false
	}
	if col1.AutoIncrement != col2.AutoIncrement {
		return false
	}
	if col1.Unique != col2.Unique {
		return false
	}
	return true
}
