package migrate

import (
	"fmt"
	"strings"
)

type MigrationScript struct {
	Upgrade   string
	Downgrade string
}

type MigrationGenerator struct {
	dbType DatabaseType
}

func NewMigrationGenerator(dbType DatabaseType) *MigrationGenerator {
	return &MigrationGenerator{
		dbType: dbType,
	}
}

func (g *MigrationGenerator) GenerateMigration(diffs []SchemaDiff) (*MigrationScript, error) {
	var upgradeSQL, downgradeSQL strings.Builder

	for i := len(diffs) - 1; i >= 0; i-- {
		downgradeSQL.WriteString(g.generateDowngradeSQL(diffs[i]))
	}

	for _, diff := range diffs {
		upgradeSQL.WriteString(g.generateUpgradeSQL(diff))
	}

	return &MigrationScript{
		Upgrade:   upgradeSQL.String(),
		Downgrade: downgradeSQL.String(),
	}, nil
}

func (g *MigrationGenerator) generateUpgradeSQL(diff SchemaDiff) string {
	switch diff.Type {
	case DiffTypeAddTable:
		return g.generateCreateTableSQL(diff.NewTable)
	case DiffTypeDropTable:
		return fmt.Sprintf("DROP TABLE IF EXISTS %s;\n", diff.TableName)
	case DiffTypeAddColumn:
		return g.generateAddColumnSQL(diff.TableName, diff.NewColumn)
	case DiffTypeDropColumn:
		return g.generateDropColumnSQL(diff.TableName, diff.OldColumn)
	case DiffTypeModifyColumn:
		return g.generateModifyColumnSQL(diff.TableName, diff.NewColumn)
	case DiffTypeAddIndex:
		return g.generateAddIndexSQL(diff.TableName, diff.NewIndex)
	case DiffTypeDropIndex:
		return g.generateDropIndexSQL(diff.TableName, diff.OldIndex)
	}
	return ""
}

func (g *MigrationGenerator) generateDowngradeSQL(diff SchemaDiff) string {
	switch diff.Type {
	case DiffTypeAddTable:
		return fmt.Sprintf("DROP TABLE IF EXISTS %s;\n", diff.TableName)
	case DiffTypeDropTable:
		return g.generateCreateTableSQL(diff.OldTable)
	case DiffTypeAddColumn:
		return g.generateDropColumnSQL(diff.TableName, diff.NewColumn)
	case DiffTypeDropColumn:
		return g.generateAddColumnSQL(diff.TableName, diff.OldColumn)
	case DiffTypeModifyColumn:
		return g.generateModifyColumnSQL(diff.TableName, diff.OldColumn)
	case DiffTypeAddIndex:
		return g.generateDropIndexSQL(diff.TableName, diff.NewIndex)
	case DiffTypeDropIndex:
		return g.generateAddIndexSQL(diff.TableName, diff.OldIndex)
	}
	return ""
}

func (g *MigrationGenerator) generateCreateTableSQL(table *Table) string {
	if table == nil {
		return ""
	}

	var columnsSQL []string
	var constraints []string

	for _, col := range table.Columns {
		colSQL := g.columnDefinitionSQL(&col)
		columnsSQL = append(columnsSQL, colSQL)

		if col.PrimaryKey && g.dbType != SQLite {
			constraints = append(constraints,
				fmt.Sprintf("PRIMARY KEY (%s)", col.Name))
		}
	}

	for _, idx := range table.Indexes {
		if idx.Unique {
			constraints = append(constraints,
				fmt.Sprintf("UNIQUE (%s)", strings.Join(idx.Columns, ", ")))
		}
	}

	allParts := append(columnsSQL, constraints...)

	return fmt.Sprintf("CREATE TABLE %s (\n  %s\n);\n",
		table.Name, strings.Join(allParts, ",\n  "))
}

func (g *MigrationGenerator) columnDefinitionSQL(col *Column) string {
	var parts []string

	parts = append(parts, col.Name)
	parts = append(parts, col.Type)

	if col.PrimaryKey && g.dbType == SQLite {
		parts = append(parts, "PRIMARY KEY")
		if col.AutoIncrement {
			parts = append(parts, "AUTOINCREMENT")
		}
	}

	if !col.Nullable && !col.PrimaryKey {
		parts = append(parts, "NOT NULL")
	}

	if col.Default != nil {
		parts = append(parts, fmt.Sprintf("DEFAULT %v", col.Default))
	}

	if col.Unique && !col.PrimaryKey {
		parts = append(parts, "UNIQUE")
	}

	return strings.Join(parts, " ")
}

func (g *MigrationGenerator) generateAddColumnSQL(tableName string, col *Column) string {
	if col == nil {
		return ""
	}
	return fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s;\n",
		tableName, g.columnDefinitionSQL(col))
}

func (g *MigrationGenerator) generateDropColumnSQL(tableName string, col *Column) string {
	if col == nil {
		return ""
	}
	if g.dbType == SQLite {
		return fmt.Sprintf("-- SQLite 不支持直接删除列: ALTER TABLE %s DROP COLUMN %s;\n",
			tableName, col.Name)
	}
	return fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s;\n",
		tableName, col.Name)
}

func (g *MigrationGenerator) generateModifyColumnSQL(tableName string, col *Column) string {
	if col == nil {
		return ""
	}
	if g.dbType == SQLite {
		return fmt.Sprintf("-- SQLite 不支持直接修改列: ALTER TABLE %s ALTER COLUMN %s;\n",
			tableName, col.Name)
	}
	if g.dbType == MySQL {
		return fmt.Sprintf("ALTER TABLE %s MODIFY COLUMN %s;\n",
			tableName, g.columnDefinitionSQL(col))
	}
	return fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s;\n",
		tableName, g.columnDefinitionSQL(col))
}

func (g *MigrationGenerator) generateAddIndexSQL(tableName string, idx *Index) string {
	if idx == nil {
		return ""
	}
	unique := ""
	if idx.Unique {
		unique = "UNIQUE"
	}
	return fmt.Sprintf("CREATE %s INDEX %s ON %s (%s);\n",
		unique, idx.Name, tableName, strings.Join(idx.Columns, ", "))
}

func (g *MigrationGenerator) generateDropIndexSQL(tableName string, idx *Index) string {
	if idx == nil {
		return ""
	}
	if g.dbType == MySQL {
		return fmt.Sprintf("ALTER TABLE %s DROP INDEX %s;\n",
			tableName, idx.Name)
	}
	return fmt.Sprintf("DROP INDEX %s;\n", idx.Name)
}
