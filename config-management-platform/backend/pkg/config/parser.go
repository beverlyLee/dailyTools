package config

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

type ConfigParser interface {
	Parse(content string) (map[string]interface{}, error)
	Serialize(data map[string]interface{}) (string, error)
	Validate(content string) error
}

type JSONParser struct{}

type YAMLParser struct{}

type KeyValueParser struct{}

type PropertiesParser struct{}

func NewParser(format string) ConfigParser {
	switch format {
	case "json":
		return &JSONParser{}
	case "yaml", "yml":
		return &YAMLParser{}
	case "keyvalue", "env":
		return &KeyValueParser{}
	case "properties":
		return &PropertiesParser{}
	default:
		return &KeyValueParser{}
	}
}

func (p *JSONParser) Parse(content string) (map[string]interface{}, error) {
	var result map[string]interface{}
	err := json.Unmarshal([]byte(content), &result)
	if err != nil {
		return nil, fmt.Errorf("JSON 解析错误: %w", err)
	}
	return result, nil
}

func (p *JSONParser) Serialize(data map[string]interface{}) (string, error) {
	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return "", fmt.Errorf("JSON 序列化错误: %w", err)
	}
	return string(bytes), nil
}

func (p *JSONParser) Validate(content string) error {
	var result interface{}
	return json.Unmarshal([]byte(content), &result)
}

func (p *YAMLParser) Parse(content string) (map[string]interface{}, error) {
	var result map[string]interface{}
	err := yaml.Unmarshal([]byte(content), &result)
	if err != nil {
		return nil, fmt.Errorf("YAML 解析错误: %w", err)
	}
	return result, nil
}

func (p *YAMLParser) Serialize(data map[string]interface{}) (string, error) {
	bytes, err := yaml.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("YAML 序列化错误: %w", err)
	}
	return string(bytes), nil
}

func (p *YAMLParser) Validate(content string) error {
	var result interface{}
	return yaml.Unmarshal([]byte(content), &result)
}

func (p *KeyValueParser) Parse(content string) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	lines := strings.Split(content, "\n")
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "//") {
			continue
		}
		
		equalIndex := strings.Index(line, "=")
		if equalIndex == -1 {
			continue
		}
		
		key := strings.TrimSpace(line[:equalIndex])
		value := strings.TrimSpace(line[equalIndex+1:])
		
		value = strings.Trim(value, `"'`)
		value = unescapeValue(value)
		
		result[key] = parseValue(value)
	}
	
	return result, nil
}

func (p *KeyValueParser) Serialize(data map[string]interface{}) (string, error) {
	var builder strings.Builder
	
	for key, value := range data {
		serializedValue := serializeValue(value)
		builder.WriteString(fmt.Sprintf("%s=%s\n", key, serializedValue))
	}
	
	return builder.String(), nil
}

func (p *KeyValueParser) Validate(content string) error {
	lines := strings.Split(content, "\n")
	
	for i, line := range lines {
		line = strings.TrimSpace(line)
		
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "//") {
			continue
		}
		
		if !strings.Contains(line, "=") {
			return fmt.Errorf("第 %d 行格式错误: 缺少等号", i+1)
		}
	}
	
	return nil
}

func (p *PropertiesParser) Parse(content string) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	lines := strings.Split(content, "\n")
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "!") {
			continue
		}
		
		var key, value string
		sepIndex := -1
		
		for i, c := range line {
			if c == '=' || c == ':' || c == ' ' {
				sepIndex = i
				break
			}
		}
		
		if sepIndex == -1 {
			key = line
			value = ""
		} else {
			key = strings.TrimSpace(line[:sepIndex])
			value = strings.TrimSpace(line[sepIndex+1:])
		}
		
		value = unescapePropertiesValue(value)
		result[key] = parseValue(value)
	}
	
	return result, nil
}

func (p *PropertiesParser) Serialize(data map[string]interface{}) (string, error) {
	var builder strings.Builder
	
	for key, value := range data {
		serializedValue := escapePropertiesValue(serializeValue(value))
		builder.WriteString(fmt.Sprintf("%s=%s\n", key, serializedValue))
	}
	
	return builder.String(), nil
}

func (p *PropertiesParser) Validate(content string) error {
	return nil
}

func ConvertFormat(content string, fromFormat, toFormat string) (string, error) {
	fromParser := NewParser(fromFormat)
	toParser := NewParser(toFormat)
	
	data, err := fromParser.Parse(content)
	if err != nil {
		return "", err
	}
	
	return toParser.Serialize(data)
}

func GetNestedValue(data map[string]interface{}, path string) (interface{}, error) {
	parts := strings.Split(path, ".")
	current := data
	
	for i, part := range parts {
		if i == len(parts)-1 {
			if val, ok := current[part]; ok {
				return val, nil
			}
			return nil, fmt.Errorf("路径不存在: %s", path)
		}
		
		if next, ok := current[part].(map[string]interface{}); ok {
			current = next
		} else {
			return nil, fmt.Errorf("路径不存在: %s (在 %s 处不是对象)", path, part)
		}
	}
	
	return nil, fmt.Errorf("路径不存在: %s", path)
}

func SetNestedValue(data map[string]interface{}, path string, value interface{}) error {
	parts := strings.Split(path, ".")
	current := data
	
	for i, part := range parts {
		if i == len(parts)-1 {
			current[part] = value
			return nil
		}
		
		if _, ok := current[part]; !ok {
			current[part] = make(map[string]interface{})
		}
		
		if next, ok := current[part].(map[string]interface{}); ok {
			current = next
		} else {
			return fmt.Errorf("路径冲突: %s (在 %s 处不是对象)", path, part)
		}
	}
	
	return nil
}

func MergeConfigs(base, override map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	
	for k, v := range base {
		result[k] = v
	}
	
	for k, v := range override {
		if baseVal, ok := result[k]; ok {
			baseMap, baseIsMap := baseVal.(map[string]interface{})
			overrideMap, overrideIsMap := v.(map[string]interface{})
			
			if baseIsMap && overrideIsMap {
				result[k] = MergeConfigs(baseMap, overrideMap)
				continue
			}
		}
		result[k] = v
	}
	
	return result
}

func FlattenConfig(data map[string]interface{}, prefix string) map[string]string {
	result := make(map[string]string)
	
	for key, value := range data {
		fullKey := key
		if prefix != "" {
			fullKey = prefix + "." + key
		}
		
		switch v := value.(type) {
		case map[string]interface{}:
			nested := FlattenConfig(v, fullKey)
			for k, val := range nested {
				result[k] = val
			}
		default:
			result[fullKey] = fmt.Sprintf("%v", v)
		}
	}
	
	return result
}

func UnflattenConfig(data map[string]string) map[string]interface{} {
	result := make(map[string]interface{})
	
	for key, value := range data {
		_ = SetNestedValue(result, key, parseValue(value))
	}
	
	return result
}

func parseValue(value string) interface{} {
	value = strings.TrimSpace(value)
	
	if strings.EqualFold(value, "true") {
		return true
	}
	if strings.EqualFold(value, "false") {
		return false
	}
	if strings.EqualFold(value, "null") || strings.EqualFold(value, "nil") {
		return nil
	}
	
	reInt := regexp.MustCompile(`^-?\d+$`)
	if reInt.MatchString(value) {
		var intVal int
		if _, err := fmt.Sscanf(value, "%d", &intVal); err == nil {
			return intVal
		}
	}
	
	reFloat := regexp.MustCompile(`^-?\d+\.\d+$`)
	if reFloat.MatchString(value) {
		var floatVal float64
		if _, err := fmt.Sscanf(value, "%f", &floatVal); err == nil {
			return floatVal
		}
	}
	
	return value
}

func serializeValue(value interface{}) string {
	switch v := value.(type) {
	case string:
		if strings.ContainsAny(v, "\n\t \"'") {
			return fmt.Sprintf("%q", v)
		}
		return v
	case int, int32, int64, float32, float64, bool:
		return fmt.Sprintf("%v", v)
	case nil:
		return ""
	default:
		return fmt.Sprintf("%v", v)
	}
}

func unescapeValue(value string) string {
	value = strings.ReplaceAll(value, "\\n", "\n")
	value = strings.ReplaceAll(value, "\\t", "\t")
	value = strings.ReplaceAll(value, "\\r", "\r")
	value = strings.ReplaceAll(value, "\\\\", "\\")
	value = strings.ReplaceAll(value, "\\\"", "\"")
	value = strings.ReplaceAll(value, "\\'", "'")
	return value
}

func unescapePropertiesValue(value string) string {
	value = strings.ReplaceAll(value, "\\:", ":")
	value = strings.ReplaceAll(value, "\\=", "=")
	value = strings.ReplaceAll(value, "\\ ", " ")
	value = strings.ReplaceAll(value, "\\\\", "\\")
	value = strings.ReplaceAll(value, "\\n", "\n")
	value = strings.ReplaceAll(value, "\\t", "\t")
	value = strings.ReplaceAll(value, "\\r", "\r")
	return value
}

func escapePropertiesValue(value string) string {
	value = strings.ReplaceAll(value, "\\", "\\\\")
	value = strings.ReplaceAll(value, ":", "\\:")
	value = strings.ReplaceAll(value, "=", "\\=")
	value = strings.ReplaceAll(value, " ", "\\ ")
	value = strings.ReplaceAll(value, "\n", "\\n")
	value = strings.ReplaceAll(value, "\t", "\\t")
	value = strings.ReplaceAll(value, "\r", "\\r")
	return value
}

func FindSensitiveKeys(data map[string]interface{}) []string {
	sensitiveKeys := []string{}
	sensitivePatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)password`),
		regexp.MustCompile(`(?i)secret`),
		regexp.MustCompile(`(?i)token`),
		regexp.MustCompile(`(?i)api[_-]?key`),
		regexp.MustCompile(`(?i)private[_-]?key`),
		regexp.MustCompile(`(?i)credential`),
		regexp.MustCompile(`(?i)passphrase`),
		regexp.MustCompile(`(?i)pin`),
		regexp.MustCompile(`(?i)auth`),
	}
	
	flattened := FlattenConfig(data, "")
	
	for key := range flattened {
		for _, pattern := range sensitivePatterns {
			if pattern.MatchString(key) {
				sensitiveKeys = append(sensitiveKeys, key)
				break
			}
		}
	}
	
	return sensitiveKeys
}

func MaskSensitiveValues(data map[string]interface{}, keysToMask []string) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range data {
		result[k] = v
	}
	
	for _, key := range keysToMask {
		_ = SetNestedValue(result, key, "********")
	}
	
	return result
}
