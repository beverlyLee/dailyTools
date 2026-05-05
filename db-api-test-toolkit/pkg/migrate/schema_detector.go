package migrate

import (
	"database/sql"
	"fmt"
)

type SchemaDetector struct {
	db     *sql.DB
	dbType DatabaseType
}

func NewSchemaDetector(db *sql.DB, dbType DatabaseType) *SchemaDetector {
	return &SchemaDetector{
		db:     db,
		dbType: dbType,
	}
}

func (d *SchemaDetector) DetectSchema() (*ModelDefinition, error) {
	tables, err := d.getTables()
	if err != nil {
		return nil, err
	}

	for i := range tables {
		columns, err := d.getColumns(tables[i].Name)
		if err != nil {
			return nil, err
		}
		tables[i].Columns = columns

		indexes, err := d.getIndexes(tables[i].Name)
		if err != nil {
			return nil, err
		}
		tables[i].Indexes = indexes
	}

	return &ModelDefinition{Tables: tables}, nil
}

func (d *SchemaDetector) getTables() ([]Table, error) {
	var tables []Table
	var query string

	switch d.dbType {
	case SQLite:
		query = `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
	case PostgreSQL:
		query = `SELECT tablename FROM pg_tables WHERE schemaname='public'`
	case MySQL:
		query = `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
	default:
		return nil, fmt.Errorf("unsupported database type: %s", d.dbType)
	}

	rows, err := d.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get tables: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		tables = append(tables, Table{Name: name})
	}

	return tables, nil
}

func (d *SchemaDetector) getColumns(tableName string) ([]Column, error) {
	var columns []Column
	var query string

	switch d.dbType {
	case SQLite:
		query = fmt.Sprintf(`PRAGMA table_info(%s)`, tableName)
		rows, err := d.db.Query(query)
		if err != nil {
			return nil, fmt.Errorf("failed to get columns for table %s: %v", tableName, err)
		}
		defer rows.Close()

		for rows.Next() {
			var col Column
			var cid, notNull, pk int
			var dfltValue sql.NullString
			if err := rows.Scan(&cid, &col.Name, &col.Type, &notNull, &dfltValue, &pk); err != nil {
				return nil, err
			}
			col.Nullable = notNull == 0
			col.PrimaryKey = pk > 0
			col.AutoIncrement = pk > 0 && col.Type == "INTEGER"
			if dfltValue.Valid {
				col.Default = dfltValue.String
			}
			columns = append(columns, col)
		}
		return columns, nil

	case PostgreSQL:
		query = `
			SELECT column_name, data_type, is_nullable, column_default,
			       CASE WHEN column_name = ANY(
			           SELECT kcu.column_name
			           FROM information_schema.table_constraints tc
			           JOIN information_schema.key_column_usage kcu
			               ON tc.constraint_name = kcu.constraint_name
			           WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
			       ) THEN true ELSE false END AS is_primary_key
			FROM information_schema.columns
			WHERE table_name = $1
			ORDER BY ordinal_position
		`
		rows, err := d.db.Query(query, tableName)
		if err != nil {
			return nil, fmt.Errorf("failed to get columns for table %s: %v", tableName, err)
		}
		defer rows.Close()

		for rows.Next() {
			var col Column
			var isNullable string
			var columnDefault sql.NullString
			if err := rows.Scan(&col.Name, &col.Type, &isNullable, &columnDefault, &col.PrimaryKey); err != nil {
				return nil, err
			}
			col.Nullable = isNullable == "YES"
			if columnDefault.Valid {
				col.Default = columnDefault.String
			}
			columns = append(columns, col)
		}
		return columns, nil

	case MySQL:
		query = `
			SELECT column_name, data_type, is_nullable, column_default, column_key
			FROM information_schema.columns
			WHERE table_schema = DATABASE() AND table_name = ?
			ORDER BY ordinal_position
		`
		rows, err := d.db.Query(query, tableName)
		if err != nil {
			return nil, fmt.Errorf("failed to get columns for table %s: %v", tableName, err)
		}
		defer rows.Close()

		for rows.Next() {
			var col Column
			var isNullable string
			var columnDefault sql.NullString
			var columnKey string
			if err := rows.Scan(&col.Name, &col.Type, &isNullable, &columnDefault, &columnKey); err != nil {
				return nil, err
			}
			col.Nullable = isNullable == "YES"
			col.PrimaryKey = columnKey == "PRI"
			col.AutoIncrement = columnKey == "PRI" && col.Type == "int"
			if columnDefault.Valid {
				col.Default = columnDefault.String
			}
			columns = append(columns, col)
		}
		return columns, nil
	}

	return nil, fmt.Errorf("unsupported database type: %s", d.dbType)
}

func (d *SchemaDetector) getIndexes(tableName string) ([]Index, error) {
	var indexes []Index
	var query string

	switch d.dbType {
	case SQLite:
		query = fmt.Sprintf(`PRAGMA index_list(%s)`, tableName)
		rows, err := d.db.Query(query)
		if err != nil {
			return nil, fmt.Errorf("failed to get indexes for table %s: %v", tableName, err)
		}
		defer rows.Close()

		for rows.Next() {
			var seq, unique, partial int
			var name, origin string
			if err := rows.Scan(&seq, &name, &unique, &origin, &partial); err != nil {
				return nil, err
			}
			if name == "" || origin == "pk" {
				continue
			}

			index := Index{
				Name:   name,
				Unique: unique == 1,
			}

			idxQuery := fmt.Sprintf(`PRAGMA index_info(%s)`, name)
			idxRows, err := d.db.Query(idxQuery)
			if err != nil {
				return nil, err
			}
			for idxRows.Next() {
				var seqno, cid int
				var colName string
				if err := idxRows.Scan(&seqno, &cid, &colName); err != nil {
					idxRows.Close()
					return nil, err
				}
				index.Columns = append(index.Columns, colName)
			}
			idxRows.Close()
			indexes = append(indexes, index)
		}
		return indexes, nil

	case PostgreSQL:
		query = `
			SELECT
				idx.indexname AS index_name,
				idx.indexdef AS index_def,
				CASE WHEN idx.indisunique THEN true ELSE false END AS is_unique
			FROM pg_indexes idx
			JOIN pg_class c ON idx.indexname = c.relname
			JOIN pg_index i ON c.oid = i.indexrelid
			WHERE idx.tablename = $1
			  AND NOT i.indisprimary
		`
		rows, err := d.db.Query(query, tableName)
		if err != nil {
			return nil, fmt.Errorf("failed to get indexes for table %s: %v", tableName, err)
		}
		defer rows.Close()

		for rows.Next() {
			var indexName, indexDef string
			var isUnique bool
			if err := rows.Scan(&indexName, &indexDef, &isUnique); err != nil {
				return nil, err
			}
			indexes = append(indexes, Index{
				Name:    indexName,
				Columns: []string{},
				Unique:  isUnique,
			})
		}
		return indexes, nil

	case MySQL:
		query = `
			SELECT
				index_name,
				column_name,
				CASE WHEN non_unique = 0 THEN true ELSE false END AS is_unique
			FROM information_schema.statistics
			WHERE table_schema = DATABASE()
			  AND table_name = ?
			  AND index_name != 'PRIMARY'
			ORDER BY index_name, seq_in_index
		`
		rows, err := d.db.Query(query, tableName)
		if err != nil {
			return nil, fmt.Errorf("failed to get indexes for table %s: %v", tableName, err)
		}
		defer rows.Close()

		indexMap := make(map[string]*Index)
		for rows.Next() {
			var indexName, columnName string
			var isUnique bool
			if err := rows.Scan(&indexName, &columnName, &isUnique); err != nil {
				return nil, err
			}

			if _, exists := indexMap[indexName]; !exists {
				indexMap[indexName] = &Index{
					Name:    indexName,
					Columns: []string{},
					Unique:  isUnique,
				}
			}
			indexMap[indexName].Columns = append(indexMap[indexName].Columns, columnName)
		}

		for _, idx := range indexMap {
			indexes = append(indexes, *idx)
		}
		return indexes, nil
	}

	return nil, fmt.Errorf("unsupported database type: %s", d.dbType)
}
