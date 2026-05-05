package migrate

type Column struct {
	Name         string
	Type         string
	Nullable     bool
	PrimaryKey   bool
	AutoIncrement bool
	Default      interface{}
	Unique       bool
}

type Index struct {
	Name    string
	Columns []string
	Unique  bool
}

type Table struct {
	Name    string
	Columns []Column
	Indexes []Index
}

type ModelDefinition struct {
	Tables []Table
}

func (m *ModelDefinition) GetTable(name string) *Table {
	for i := range m.Tables {
		if m.Tables[i].Name == name {
			return &m.Tables[i]
		}
	}
	return nil
}

func (m *ModelDefinition) TableNames() []string {
	names := make([]string, len(m.Tables))
	for i, t := range m.Tables {
		names[i] = t.Name
	}
	return names
}
