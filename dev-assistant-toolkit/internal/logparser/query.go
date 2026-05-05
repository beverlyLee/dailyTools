package logparser

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type QueryCondition struct {
	Field    string
	Operator string
	Value    interface{}
}

type Query struct {
	Conditions []QueryCondition
	Logic      string
	Limit      int
	Offset     int
}

type QueryParser struct {
}

func NewQueryParser() *QueryParser {
	return &QueryParser{}
}

func (qp *QueryParser) Parse(queryStr string) (*Query, error) {
	queryStr = strings.TrimSpace(queryStr)
	if queryStr == "" {
		return &Query{
			Conditions: []QueryCondition{},
			Logic:      "AND",
		}, nil
	}
	
	query := &Query{
		Logic: "AND",
	}
	
	var conditions []QueryCondition
	var err error
	
	queryStr, query.Limit, err = qp.parseLimit(queryStr)
	if err != nil {
		return nil, err
	}
	
	queryStr, query.Offset, err = qp.parseOffset(queryStr)
	if err != nil {
		return nil, err
	}
	
	parts := strings.Split(queryStr, " AND ")
	if len(parts) == 1 {
		parts = strings.Split(queryStr, " and ")
	}
	if len(parts) > 1 {
		query.Logic = "AND"
	} else {
		parts = strings.Split(queryStr, " OR ")
		if len(parts) == 1 {
			parts = strings.Split(queryStr, " or ")
		}
		if len(parts) > 1 {
			query.Logic = "OR"
		} else {
			parts = []string{queryStr}
		}
	}
	
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		
		cond, err := qp.parseCondition(part)
		if err != nil {
			return nil, err
		}
		conditions = append(conditions, cond)
	}
	
	query.Conditions = conditions
	return query, nil
}

func (qp *QueryParser) parseLimit(queryStr string) (string, int, error) {
	limitPattern := regexp.MustCompile(`(?i)\s+LIMIT\s+(\d+)$`)
	matches := limitPattern.FindStringSubmatch(queryStr)
	if len(matches) == 2 {
		limit, err := strconv.Atoi(matches[1])
		if err != nil {
			return queryStr, 0, err
		}
		queryStr = limitPattern.ReplaceAllString(queryStr, "")
		return queryStr, limit, nil
	}
	return queryStr, 0, nil
}

func (qp *QueryParser) parseOffset(queryStr string) (string, int, error) {
	offsetPattern := regexp.MustCompile(`(?i)\s+OFFSET\s+(\d+)`)
	matches := offsetPattern.FindStringSubmatch(queryStr)
	if len(matches) == 2 {
		offset, err := strconv.Atoi(matches[1])
		if err != nil {
			return queryStr, 0, err
		}
		queryStr = offsetPattern.ReplaceAllString(queryStr, "")
		return queryStr, offset, nil
	}
	return queryStr, 0, nil
}

func (qp *QueryParser) parseCondition(conditionStr string) (QueryCondition, error) {
	conditionStr = strings.TrimSpace(conditionStr)
	
	operators := []string{"==", "!=", ">=", "<=", ">", "<", "=~", "!~", "=", "CONTAINS", "STARTS", "ENDS"}
	
	for _, op := range operators {
		idx := strings.Index(conditionStr, " "+op+" ")
		if idx != -1 {
			field := strings.TrimSpace(conditionStr[:idx])
			valueStr := strings.TrimSpace(conditionStr[idx+len(op)+2:])
			value := qp.parseValue(valueStr)
			
			return QueryCondition{
				Field:    field,
				Operator: op,
				Value:    value,
			}, nil
		}
		
		idx = strings.Index(conditionStr, op)
		if idx != -1 {
			field := strings.TrimSpace(conditionStr[:idx])
			valueStr := strings.TrimSpace(conditionStr[idx+len(op):])
			value := qp.parseValue(valueStr)
			
			return QueryCondition{
				Field:    field,
				Operator: op,
				Value:    value,
			}, nil
		}
	}
	
	return QueryCondition{}, fmt.Errorf("无法解析条件: %s", conditionStr)
}

func (qp *QueryParser) parseValue(valueStr string) interface{} {
	valueStr = strings.TrimSpace(valueStr)
	
	if strings.HasPrefix(valueStr, "'") && strings.HasSuffix(valueStr, "'") {
		return strings.Trim(valueStr, "'")
	}
	if strings.HasPrefix(valueStr, "\"") && strings.HasSuffix(valueStr, "\"") {
		return strings.Trim(valueStr, "\"")
	}
	
	if valueStr == "true" || valueStr == "TRUE" {
		return true
	}
	if valueStr == "false" || valueStr == "FALSE" {
		return false
	}
	
	if intVal, err := strconv.ParseInt(valueStr, 10, 64); err == nil {
		return intVal
	}
	if floatVal, err := strconv.ParseFloat(valueStr, 64); err == nil {
		return floatVal
	}
	
	return valueStr
}

func (q *Query) Matches(entry *LogEntry) bool {
	if len(q.Conditions) == 0 {
		return true
	}
	
	if q.Logic == "AND" {
		for _, cond := range q.Conditions {
			if !q.matchCondition(entry, cond) {
				return false
			}
		}
		return true
	} else {
		for _, cond := range q.Conditions {
			if q.matchCondition(entry, cond) {
				return true
			}
		}
		return false
	}
}

func (q *Query) matchCondition(entry *LogEntry, cond QueryCondition) bool {
	var fieldValue interface{}
	
	switch strings.ToLower(cond.Field) {
	case "message", "msg":
		fieldValue = entry.Message
	case "level":
		fieldValue = entry.Level
	case "timestamp", "time":
		fieldValue = entry.Timestamp
	case "format":
		fieldValue = string(entry.Format)
	default:
		if val, ok := entry.Fields[cond.Field]; ok {
			fieldValue = val
		} else {
			fieldValue = ""
		}
	}
	
	switch cond.Operator {
	case "==", "=":
		return q.compareEqual(fieldValue, cond.Value)
	case "!=":
		return !q.compareEqual(fieldValue, cond.Value)
	case ">":
		return q.compareGreater(fieldValue, cond.Value, false)
	case ">=":
		return q.compareGreater(fieldValue, cond.Value, true)
	case "<":
		return q.compareLess(fieldValue, cond.Value, false)
	case "<=":
		return q.compareLess(fieldValue, cond.Value, true)
	case "=~", "CONTAINS":
		return q.contains(fieldValue, cond.Value)
	case "!~":
		return !q.contains(fieldValue, cond.Value)
	case "STARTS":
		return q.startsWith(fieldValue, cond.Value)
	case "ENDS":
		return q.endsWith(fieldValue, cond.Value)
	default:
		return false
	}
}

func (q *Query) compareEqual(a, b interface{}) bool {
	switch va := a.(type) {
	case string:
		if vb, ok := b.(string); ok {
			return va == vb
		}
	case int64:
		if vb, ok := b.(int64); ok {
			return va == vb
		}
		if vb, ok := b.(float64); ok {
			return float64(va) == vb
		}
	case float64:
		if vb, ok := b.(float64); ok {
			return va == vb
		}
		if vb, ok := b.(int64); ok {
			return va == float64(vb)
		}
	case time.Time:
		if vb, ok := b.(string); ok {
			parsed, err := time.Parse("2006-01-02", vb)
			if err == nil {
				return va.Format("2006-01-02") == parsed.Format("2006-01-02")
			}
			parsed, err = time.Parse("2006-01-02 15:04:05", vb)
			if err == nil {
				return va.Equal(parsed)
			}
		}
	}
	return fmt.Sprintf("%v", a) == fmt.Sprintf("%v", b)
}

func (q *Query) compareGreater(a, b interface{}, orEqual bool) bool {
	switch va := a.(type) {
	case int64:
		if vb, ok := b.(int64); ok {
			if orEqual {
				return va >= vb
			}
			return va > vb
		}
	case float64:
		if vb, ok := b.(float64); ok {
			if orEqual {
				return va >= vb
			}
			return va > vb
		}
	case time.Time:
		if vb, ok := b.(string); ok {
			parsed, err := time.Parse("2006-01-02", vb)
			if err == nil {
				if orEqual {
					return !va.Before(parsed)
				}
				return va.After(parsed)
			}
		}
	case string:
		if vb, ok := b.(string); ok {
			if orEqual {
				return va >= vb
			}
			return va > vb
		}
	}
	return false
}

func (q *Query) compareLess(a, b interface{}, orEqual bool) bool {
	switch va := a.(type) {
	case int64:
		if vb, ok := b.(int64); ok {
			if orEqual {
				return va <= vb
			}
			return va < vb
		}
	case float64:
		if vb, ok := b.(float64); ok {
			if orEqual {
				return va <= vb
			}
			return va < vb
		}
	case time.Time:
		if vb, ok := b.(string); ok {
			parsed, err := time.Parse("2006-01-02", vb)
			if err == nil {
				if orEqual {
					return !va.After(parsed)
				}
				return va.Before(parsed)
			}
		}
	case string:
		if vb, ok := b.(string); ok {
			if orEqual {
				return va <= vb
			}
			return va < vb
		}
	}
	return false
}

func (q *Query) contains(a, b interface{}) bool {
	strA := fmt.Sprintf("%v", a)
	strB := fmt.Sprintf("%v", b)
	return strings.Contains(strings.ToLower(strA), strings.ToLower(strB))
}

func (q *Query) startsWith(a, b interface{}) bool {
	strA := fmt.Sprintf("%v", a)
	strB := fmt.Sprintf("%v", b)
	return strings.HasPrefix(strings.ToLower(strA), strings.ToLower(strB))
}

func (q *Query) endsWith(a, b interface{}) bool {
	strA := fmt.Sprintf("%v", a)
	strB := fmt.Sprintf("%v", b)
	return strings.HasSuffix(strings.ToLower(strA), strings.ToLower(strB))
}
