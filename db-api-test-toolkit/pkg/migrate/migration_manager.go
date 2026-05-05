package migrate

import (
	"database/sql"
	"fmt"
	"strings"
)

type MigrationManager struct {
	db               *sql.DB
	dbType           DatabaseType
	schemaDetector   *SchemaDetector
	diffDetector     *DiffDetector
	migrationGen     *MigrationGenerator
}

func NewMigrationManager(db *sql.DB, dbType DatabaseType) *MigrationManager {
	return &MigrationManager{
		db:             db,
		dbType:         dbType,
		schemaDetector: NewSchemaDetector(db, dbType),
		diffDetector:   NewDiffDetector(),
		migrationGen:   NewMigrationGenerator(dbType),
	}
}

func (m *MigrationManager) DetectSchema() (*ModelDefinition, error) {
	return m.schemaDetector.DetectSchema()
}

func (m *MigrationManager) GenerateMigrationScript(targetSchema *ModelDefinition) (*MigrationScript, []SchemaDiff, error) {
	currentSchema, err := m.schemaDetector.DetectSchema()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to detect current schema: %v", err)
	}

	diffs, err := m.diffDetector.DetectDiffs(currentSchema, targetSchema)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to detect schema diffs: %v", err)
	}

	if len(diffs) == 0 {
		return &MigrationScript{}, []SchemaDiff{}, nil
	}

	script, err := m.migrationGen.GenerateMigration(diffs)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate migration script: %v", err)
	}

	return script, diffs, nil
}

func (m *MigrationManager) ApplyMigration(script *MigrationScript, dryRun bool) error {
	if dryRun {
		fmt.Println("=== DRY-RUN MODE - 不实际执行以下 SQL ===")
		fmt.Println("\nUpgrade SQL:")
		fmt.Println(script.Upgrade)
		fmt.Println("\nDowngrade SQL (用于回滚):")
		fmt.Println(script.Downgrade)
		return nil
	}

	if script.Upgrade == "" {
		fmt.Println("没有需要执行的迁移")
		return nil
	}

	tx, err := m.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to start transaction: %v", err)
	}

	for _, stmt := range splitSQLStatements(script.Upgrade) {
		if stmt == "" {
			continue
		}
		_, err := tx.Exec(stmt)
		if err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to execute statement '%s': %v", stmt, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %v", err)
	}

	fmt.Println("迁移已成功应用")
	return nil
}

func splitSQLStatements(sql string) []string {
	var statements []string
	var current strings.Builder

	inString := false
	stringChar := byte(0)

	for i := 0; i < len(sql); i++ {
		c := sql[i]

		if inString {
			current.WriteByte(c)
			if c == stringChar && (i == 0 || sql[i-1] != '\\') {
				inString = false
			}
			continue
		}

		if c == '"' || c == '\'' {
			inString = true
			stringChar = c
			current.WriteByte(c)
			continue
		}

		if c == ';' {
			stmt := strings.TrimSpace(current.String())
			if stmt != "" {
				statements = append(statements, stmt)
			}
			current.Reset()
			continue
		}

		current.WriteByte(c)
	}

	stmt := strings.TrimSpace(current.String())
	if stmt != "" {
		statements = append(statements, stmt)
	}

	return statements
}

func (m *MigrationManager) Close() error {
	return m.db.Close()
}
