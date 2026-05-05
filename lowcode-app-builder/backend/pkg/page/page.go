package page

import (
	"bytes"
	"fmt"
	"text/template"
	"time"
)

type Page struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Content     map[string]interface{} `json:"content"`
	Components  []Component            `json:"components"`
	Events      []EventBinding         `json:"events"`
	CreatedAt   time.Time              `json:"createdAt"`
	UpdatedAt   time.Time              `json:"updatedAt"`
}

type Component struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"`
	Properties map[string]interface{} `json:"properties"`
	Styles     map[string]string      `json:"styles"`
	Children   []Component            `json:"children"`
}

type EventBinding struct {
	ComponentID string `json:"componentId"`
	EventType   string `json:"eventType"`
	Action      string `json:"action"`
	Target      string `json:"target"`
	Handler     string `json:"handler"`
}

type GeneratedCode struct {
	HTML       string `json:"html"`
	CSS        string `json:"css"`
	JavaScript string `json:"javascript"`
	Framework  string `json:"framework"`
}

type Service struct {
	pages map[string]*Page
}

func NewService() *Service {
	return &Service{
		pages: make(map[string]*Page),
	}
}

func (s *Service) CreatePage(p *Page) error {
	now := time.Now()
	p.CreatedAt = now
	p.UpdatedAt = now
	s.pages[p.ID] = p
	return nil
}

func (s *Service) GetPage(id string) (*Page, error) {
	if p, exists := s.pages[id]; exists {
		return p, nil
	}
	return nil, fmt.Errorf("页面不存在: %s", id)
}

func (s *Service) UpdatePage(id string, p *Page) error {
	if _, exists := s.pages[id]; !exists {
		return fmt.Errorf("页面不存在: %s", id)
	}
	p.UpdatedAt = time.Now()
	s.pages[id] = p
	return nil
}

func (s *Service) DeletePage(id string) error {
	if _, exists := s.pages[id]; !exists {
		return fmt.Errorf("页面不存在: %s", id)
	}
	delete(s.pages, id)
	return nil
}

func (s *Service) ListPages() ([]Page, error) {
	var pages []Page
	for _, p := range s.pages {
		pages = append(pages, *p)
	}
	return pages, nil
}

func (s *Service) GenerateCode(id string, framework string) (*GeneratedCode, error) {
	p, err := s.GetPage(id)
	if err != nil {
		return nil, err
	}

	var result *GeneratedCode
	switch framework {
	case "vue":
		result = s.generateVueCode(p)
	case "react":
		result = s.generateReactCode(p)
	default:
		result = s.generateVueCode(p)
	}

	return result, nil
}

func (s *Service) generateVueCode(p *Page) *GeneratedCode {
	var htmlBuf bytes.Buffer

	htmlTemplate := `<template>
  <div class="page-{{.ID}}">
    {{range .Components}}
    {{.}}
    {{end}}
  </div>
</template>

<script setup>
{{.JavaScript}}
</script>

<style scoped>
{{.CSS}}
</style>`

	componentHTML := ""
	for _, comp := range p.Components {
		componentHTML += generateComponentHTML(comp)
	}

	componentCSS := ""
	for _, comp := range p.Components {
		componentCSS += generateComponentCSS(comp)
	}

	jsCode := `import { ref } from 'vue';

`
	for _, event := range p.Events {
		jsCode += fmt.Sprintf(`function %s() {
  // 事件处理逻辑
  console.log('执行事件: %s');
}

`, event.Handler, event.EventType)
	}

	data := map[string]interface{}{
		"ID":         p.ID,
		"Components": []string{componentHTML},
		"CSS":        componentCSS,
		"JavaScript": jsCode,
	}

	tmpl, _ := template.New("vue").Parse(htmlTemplate)
	tmpl.Execute(&htmlBuf, data)

	return &GeneratedCode{
		HTML:       htmlBuf.String(),
		CSS:        componentCSS,
		JavaScript: jsCode,
		Framework:  "vue",
	}
}

func (s *Service) generateReactCode(p *Page) *GeneratedCode {
	componentHTML := ""
	for _, comp := range p.Components {
		componentHTML += generateComponentHTML(comp)
	}

	componentCSS := ""
	for _, comp := range p.Components {
		componentCSS += generateComponentCSS(comp)
	}

	jsCode := `import React, { useState } from 'react';
import './Page.css';

function Page() {
  const [state, setState] = useState({});

  `
	for _, event := range p.Events {
		jsCode += fmt.Sprintf(`const %s = () => {
    // 事件处理逻辑
    console.log('执行事件: %s');
  };

  `, event.Handler, event.EventType)
	}

	jsCode += `
  return (
    <div className="page-${p.ID}">
      ${componentHTML}
    </div>
  );
}

export default Page;`

	return &GeneratedCode{
		HTML:       componentHTML,
		CSS:        componentCSS,
		JavaScript: jsCode,
		Framework:  "react",
	}
}

func generateComponentHTML(comp Component) string {
	html := ""
	switch comp.Type {
	case "input":
		html = fmt.Sprintf(`<input type="text" id="%s" placeholder="输入框" />`, comp.ID)
	case "button":
		html = fmt.Sprintf(`<button id="%s">按钮</button>`, comp.ID)
	case "text":
		html = fmt.Sprintf(`<p id="%s">文本内容</p>`, comp.ID)
	case "form":
		html = fmt.Sprintf(`<form id="%s">
      <!-- 表单内容 -->
    </form>`, comp.ID)
	case "list":
		html = fmt.Sprintf(`<ul id="%s">
      <!-- 列表项 -->
    </ul>`, comp.ID)
	case "chart":
		html = fmt.Sprintf(`<div id="%s" class="chart-container">
      <!-- 图表容器 -->
    </div>`, comp.ID)
	default:
		html = fmt.Sprintf(`<div id="%s" class="component"></div>`, comp.ID)
	}
	return html
}

func generateComponentCSS(comp Component) string {
	css := fmt.Sprintf(`#%s {
  margin: 8px 0;
`, comp.ID)

	for key, value := range comp.Styles {
		css += fmt.Sprintf("  %s: %s;\n", key, value)
	}

	css += "}\n\n"
	return css
}
