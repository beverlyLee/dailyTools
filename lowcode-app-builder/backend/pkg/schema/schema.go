package schema

import (
	"bytes"
	"fmt"
	"text/template"
	"time"
)

type Schema struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	TableName   string      `json:"tableName"`
	Fields      []Field     `json:"fields"`
	Indexes     []Index     `json:"indexes"`
	Relations   []Relation  `json:"relations"`
	CreatedAt   time.Time   `json:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt"`
}

type Field struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Type        FieldType   `json:"type"`
	IsPrimary   bool        `json:"isPrimary"`
	IsRequired  bool        `json:"isRequired"`
	IsUnique    bool        `json:"isUnique"`
	Default     string      `json:"default"`
	Description string      `json:"description"`
	Length      int         `json:"length"`
	Precision   int         `json:"precision"`
	Scale       int         `json:"scale"`
}

type FieldType string

const (
	FieldTypeString    FieldType = "string"
	FieldTypeInteger   FieldType = "integer"
	FieldTypeFloat     FieldType = "float"
	FieldTypeBoolean   FieldType = "boolean"
	FieldTypeDate      FieldType = "date"
	FieldTypeDateTime  FieldType = "datetime"
	FieldTypeText      FieldType = "text"
	FieldTypeJSON      FieldType = "json"
	FieldTypeUUID      FieldType = "uuid"
)

type Index struct {
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	Fields   []string `json:"fields"`
	IsUnique bool     `json:"isUnique"`
	Type     string   `json:"type"`
}

type Relation struct {
	ID             string         `json:"id"`
	Name           string         `json:"name"`
	Type           RelationType   `json:"type"`
	SourceTable    string         `json:"sourceTable"`
	SourceField    string         `json:"sourceField"`
	TargetTable    string         `json:"targetTable"`
	TargetField    string         `json:"targetField"`
	OnDelete       string         `json:"onDelete"`
	OnUpdate       string         `json:"onUpdate"`
}

type RelationType string

const (
	RelationTypeOneToOne  RelationType = "oneToOne"
	RelationTypeOneToMany RelationType = "oneToMany"
	RelationTypeManyToOne RelationType = "manyToOne"
	RelationTypeManyToMany RelationType = "manyToMany"
)

type CRUDResult struct {
	SQL           string       `json:"sql"`
	GoModel       string       `json:"goModel"`
	APIHandlers   string       `json:"apiHandlers"`
	APIRoutes     string       `json:"apiRoutes"`
	TypeScript    string       `json:"typeScript"`
}

type Service struct {
	schemas map[string]*Schema
}

func NewService() *Service {
	return &Service{
		schemas: make(map[string]*Schema),
	}
}

func (s *Service) CreateSchema(schema *Schema) error {
	now := time.Now()
	schema.CreatedAt = now
	schema.UpdatedAt = now
	s.schemas[schema.ID] = schema
	return nil
}

func (s *Service) GetSchema(id string) (*Schema, error) {
	if schema, exists := s.schemas[id]; exists {
		return schema, nil
	}
	return nil, fmt.Errorf("数据模型不存在: %s", id)
}

func (s *Service) UpdateSchema(id string, schema *Schema) error {
	if _, exists := s.schemas[id]; !exists {
		return fmt.Errorf("数据模型不存在: %s", id)
	}
	schema.UpdatedAt = time.Now()
	s.schemas[id] = schema
	return nil
}

func (s *Service) DeleteSchema(id string) error {
	if _, exists := s.schemas[id]; !exists {
		return fmt.Errorf("数据模型不存在: %s", id)
	}
	delete(s.schemas, id)
	return nil
}

func (s *Service) ListSchemas() ([]Schema, error) {
	var schemas []Schema
	for _, schema := range s.schemas {
		schemas = append(schemas, *schema)
	}
	return schemas, nil
}

func (s *Service) GenerateCRUD(id string) (*CRUDResult, error) {
	schema, err := s.GetSchema(id)
	if err != nil {
		return nil, err
	}

	sql := generateSQL(schema)
	goModel := generateGoModel(schema)
	apiHandlers := generateAPIHandlers(schema)
	apiRoutes := generateAPIRoutes(schema)
	typeScript := generateTypeScript(schema)

	return &CRUDResult{
		SQL:         sql,
		GoModel:     goModel,
		APIHandlers: apiHandlers,
		APIRoutes:   apiRoutes,
		TypeScript:  typeScript,
	}, nil
}

func generateSQL(schema *Schema) string {
	var buf bytes.Buffer

	buf.WriteString(fmt.Sprintf("-- 创建表: %s\n", schema.TableName))
	buf.WriteString(fmt.Sprintf("CREATE TABLE %s (\n", schema.TableName))

	for i, field := range schema.Fields {
		fieldSQL := generateFieldSQL(field)
		if i < len(schema.Fields)-1 {
			fieldSQL += ","
		}
		buf.WriteString("  " + fieldSQL + "\n")
	}

	primaryFields := getPrimaryFields(schema.Fields)
	if len(primaryFields) > 0 {
		buf.WriteString("  PRIMARY KEY (")
		for i, f := range primaryFields {
			if i > 0 {
				buf.WriteString(", ")
			}
			buf.WriteString(f.Name)
		}
		buf.WriteString(")\n")
	}

	buf.WriteString(");\n\n")

	for _, idx := range schema.Indexes {
		unique := ""
		if idx.IsUnique {
			unique = "UNIQUE "
		}
		buf.WriteString(fmt.Sprintf("CREATE %sINDEX %s ON %s (", unique, idx.Name, schema.TableName))
		for i, f := range idx.Fields {
			if i > 0 {
				buf.WriteString(", ")
			}
			buf.WriteString(f)
		}
		buf.WriteString(");\n")
	}

	return buf.String()
}

func generateFieldSQL(field Field) string {
	var sqlType string
	switch field.Type {
	case FieldTypeString:
		if field.Length > 0 {
			sqlType = fmt.Sprintf("VARCHAR(%d)", field.Length)
		} else {
			sqlType = "VARCHAR(255)"
		}
	case FieldTypeInteger:
		sqlType = "INTEGER"
	case FieldTypeFloat:
		if field.Precision > 0 && field.Scale > 0 {
			sqlType = fmt.Sprintf("DECIMAL(%d, %d)", field.Precision, field.Scale)
		} else {
			sqlType = "FLOAT"
		}
	case FieldTypeBoolean:
		sqlType = "BOOLEAN"
	case FieldTypeDate:
		sqlType = "DATE"
	case FieldTypeDateTime:
		sqlType = "TIMESTAMP"
	case FieldTypeText:
		sqlType = "TEXT"
	case FieldTypeJSON:
		sqlType = "JSON"
	case FieldTypeUUID:
		sqlType = "UUID"
	default:
		sqlType = "VARCHAR(255)"
	}

	sql := fmt.Sprintf("%s %s", field.Name, sqlType)

	if field.IsRequired {
		sql += " NOT NULL"
	}

	if field.IsUnique {
		sql += " UNIQUE"
	}

	if field.Default != "" {
		sql += fmt.Sprintf(" DEFAULT %s", field.Default)
	}

	return sql
}

func generateGoModel(schema *Schema) string {
	tmpl := `package model

import (
	"time"
)

type {{.StructName}} struct {
{{range .Fields}}	{{.GoName}} {{.GoType}} ` + "`json:\"{{.Name}}\"`" + `
{{end}}
}

func ({{.StructName}}) TableName() string {
	return "{{.TableName}}"
}
`

	type templateField struct {
		Name   string
		GoName string
		GoType string
	}

	type templateData struct {
		StructName string
		TableName  string
		Fields     []templateField
	}

	fields := make([]templateField, len(schema.Fields))
	for i, f := range schema.Fields {
		fields[i] = templateField{
			Name:   f.Name,
			GoName: toPascalCase(f.Name),
			GoType: fieldTypeToGoType(f.Type),
		}
	}

	data := templateData{
		StructName: toPascalCase(schema.Name),
		TableName:  schema.TableName,
		Fields:     fields,
	}

	var buf bytes.Buffer
	t, _ := template.New("model").Parse(tmpl)
	t.Execute(&buf, data)
	return buf.String()
}

func generateAPIHandlers(schema *Schema) string {
	tmpl := `package handler

import (
	"net/http"
	"strconv"

	"{{.Module}}/model"

	"github.com/gin-gonic/gin"
)

type {{.StructName}}Handler struct {
	service *{{.StructName}}Service
}

func New{{.StructName}}Handler(service *{{.StructName}}Service) *{{.StructName}}Handler {
	return &{{.StructName}}Handler{service: service}
}

func (h *{{.StructName}}Handler) List(c *gin.Context) {
	items, err := h.service.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *{{.StructName}}Handler) Get(c *gin.Context) {
	id := c.Param("id")
	item, err := h.service.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *{{.StructName}}Handler) Create(c *gin.Context) {
	var item model.{{.StructName}}
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求体"})
		return
	}

	if err := h.service.Create(&item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, item)
}

func (h *{{.StructName}}Handler) Update(c *gin.Context) {
	id := c.Param("id")
	var item model.{{.StructName}}
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求体"})
		return
	}

	if err := h.service.Update(id, &item); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, item)
}

func (h *{{.StructName}}Handler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
`

	type templateData struct {
		Module      string
		StructName  string
	}

	data := templateData{
		Module:     "lowcode-app-builder",
		StructName: toPascalCase(schema.Name),
	}

	var buf bytes.Buffer
	t, _ := template.New("handler").Parse(tmpl)
	t.Execute(&buf, data)
	return buf.String()
}

func generateAPIRoutes(schema *Schema) string {
	tmpl := `package routes

import (
	"{{.Module}}/api/handler"

	"github.com/gin-gonic/gin"
)

func Register{{.StructName}}Routes(r *gin.Engine, handler *handler.{{.StructName}}Handler) {
	api := r.Group("/api/v1/{{.RouteName}}")
	{
		api.GET("", handler.List)
		api.GET("/:id", handler.Get)
		api.POST("", handler.Create)
		api.PUT("/:id", handler.Update)
		api.DELETE("/:id", handler.Delete)
	}
}
`

	type templateData struct {
		Module      string
		StructName  string
		RouteName   string
	}

	data := templateData{
		Module:     "lowcode-app-builder",
		StructName: toPascalCase(schema.Name),
		RouteName:  schema.TableName,
	}

	var buf bytes.Buffer
	t, _ := template.New("routes").Parse(tmpl)
	t.Execute(&buf, data)
	return buf.String()
}

func generateTypeScript(schema *Schema) string {
	tmpl := `export interface {{.InterfaceName}} {
{{range .Fields}}	{{.Name}}: {{.TSType}};
{{end}}}

export interface {{.InterfaceName}}Create {
{{range .CreateFields}}	{{.Name}}?: {{.TSType}};
{{end}}}

export interface {{.InterfaceName}}Update {
{{range .UpdateFields}}	{{.Name}}?: {{.TSType}};
{{end}}}
`

	type templateField struct {
		Name   string
		TSType string
	}

	type templateData struct {
		InterfaceName string
		Fields        []templateField
		CreateFields  []templateField
		UpdateFields  []templateField
	}

	fields := make([]templateField, len(schema.Fields))
	createFields := make([]templateField, 0)
	updateFields := make([]templateField, 0)

	for i, f := range schema.Fields {
		tsType := fieldTypeToTSType(f.Type)
		fields[i] = templateField{
			Name:   f.Name,
			TSType: tsType,
		}

		if !f.IsPrimary {
			createFields = append(createFields, templateField{
				Name:   f.Name,
				TSType: tsType,
			})
			updateFields = append(updateFields, templateField{
				Name:   f.Name,
				TSType: tsType,
			})
		}
	}

	data := templateData{
		InterfaceName: toPascalCase(schema.Name),
		Fields:        fields,
		CreateFields:  createFields,
		UpdateFields:  updateFields,
	}

	var buf bytes.Buffer
	t, _ := template.New("typescript").Parse(tmpl)
	t.Execute(&buf, data)
	return buf.String()
}

func getPrimaryFields(fields []Field) []Field {
	var primary []Field
	for _, f := range fields {
		if f.IsPrimary {
			primary = append(primary, f)
		}
	}
	return primary
}

func toPascalCase(s string) string {
	if len(s) == 0 {
		return s
	}
	result := ""
	capNext := true
	for _, c := range s {
		if c == '_' || c == '-' {
			capNext = true
			continue
		}
		if capNext {
			result += string(uppercase(c))
			capNext = false
		} else {
			result += string(c)
		}
	}
	return result
}

func uppercase(c rune) rune {
	if c >= 'a' && c <= 'z' {
		return c - 'a' + 'A'
	}
	return c
}

func fieldTypeToGoType(ft FieldType) string {
	switch ft {
	case FieldTypeString, FieldTypeText, FieldTypeUUID:
		return "string"
	case FieldTypeInteger:
		return "int64"
	case FieldTypeFloat:
		return "float64"
	case FieldTypeBoolean:
		return "bool"
	case FieldTypeDate, FieldTypeDateTime:
		return "time.Time"
	case FieldTypeJSON:
		return "interface{}"
	default:
		return "string"
	}
}

func fieldTypeToTSType(ft FieldType) string {
	switch ft {
	case FieldTypeString, FieldTypeText, FieldTypeUUID, FieldTypeDate, FieldTypeDateTime:
		return "string"
	case FieldTypeInteger, FieldTypeFloat:
		return "number"
	case FieldTypeBoolean:
		return "boolean"
	case FieldTypeJSON:
		return "any"
	default:
		return "string"
	}
}
