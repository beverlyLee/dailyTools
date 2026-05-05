package layout

import (
	"strings"

	"file-viz-toolkit/pkg/mermaid"
)

type LayoutEngine struct{}

func NewLayoutEngine() *LayoutEngine {
	return &LayoutEngine{}
}

func (e *LayoutEngine) LayoutFlowchart(flowchart *mermaid.Flowchart) (*LayoutFlowchart, error) {
	layout := &LayoutFlowchart{
		Flowchart:  flowchart,
		Nodes:      make(map[string]*LayoutNode),
		Edges:      []*LayoutEdge{},
		ColWidths:  make(map[int]int),
		RowHeights: make(map[int]int),
	}

	for id, node := range flowchart.Nodes {
		labelLines := e.splitLabel(node.Label, 20)
		width := e.calculateNodeWidth(node, labelLines)
		height := e.calculateNodeHeight(node, labelLines)

		layout.Nodes[id] = &LayoutNode{
			Node:       node,
			Width:      width,
			Height:     height,
			LabelLines: labelLines,
		}
	}

	e.assignTopologicalOrder(layout, flowchart)
	e.calculatePositions(layout)

	for _, edge := range flowchart.Edges {
		fromNode := layout.Nodes[edge.From]
		toNode := layout.Nodes[edge.To]

		if fromNode == nil || toNode == nil {
			continue
		}

		labelLines := []string{}
		if edge.Label != "" {
			labelLines = e.splitLabel(edge.Label, 15)
		}

		pathPoints := e.calculateEdgePath(fromNode, toNode, flowchart.Direction)

		layout.Edges = append(layout.Edges, &LayoutEdge{
			Edge:       edge,
			FromNode:   fromNode,
			ToNode:     toNode,
			Label:      edge.Label,
			LabelLines: labelLines,
			PathPoints: pathPoints,
		})
	}

	return layout, nil
}

func (e *LayoutEngine) splitLabel(label string, maxWidth int) []string {
	if len(label) <= maxWidth {
		return []string{label}
	}

	var lines []string
	words := strings.Fields(label)
	currentLine := ""

	for _, word := range words {
		if currentLine == "" {
			currentLine = word
		} else if len(currentLine)+1+len(word) <= maxWidth {
			currentLine += " " + word
		} else {
			lines = append(lines, currentLine)
			currentLine = word
		}
	}

	if currentLine != "" {
		lines = append(lines, currentLine)
	}

	return lines
}

func (e *LayoutEngine) calculateNodeWidth(node *mermaid.Node, labelLines []string) int {
	maxLen := 0
	for _, line := range labelLines {
		if len(line) > maxLen {
			maxLen = len(line)
		}
	}

	switch node.Shape {
	case mermaid.ShapeRhombus:
		return maxLen + 6
	case mermaid.ShapeCircle:
		return maxLen + 4
	case mermaid.ShapeHexagon:
		return maxLen + 4
	case mermaid.ShapeCylindrical:
		return maxLen + 4
	default:
		return maxLen + 4
	}
}

func (e *LayoutEngine) calculateNodeHeight(node *mermaid.Node, labelLines []string) int {
	baseHeight := 2
	if len(labelLines) > 1 {
		baseHeight = len(labelLines) + 2
	}

	switch node.Shape {
	case mermaid.ShapeRhombus:
		return baseHeight + 2
	case mermaid.ShapeCircle:
		return baseHeight
	default:
		return baseHeight
	}
}

func (e *LayoutEngine) assignTopologicalOrder(layout *LayoutFlowchart, flowchart *mermaid.Flowchart) {
	inDegree := make(map[string]int)
	for id := range layout.Nodes {
		inDegree[id] = 0
	}

	for _, edge := range flowchart.Edges {
		inDegree[edge.To]++
	}

	var queue []string
	for id, degree := range inDegree {
		if degree == 0 {
			queue = append(queue, id)
		}
	}

	row := 0
	col := 0
	colCount := make(map[int]int)

	for len(queue) > 0 {
		levelSize := len(queue)
		for i := 0; i < levelSize; i++ {
			id := queue[i]
			node := layout.Nodes[id]
			node.Row = row
			node.Col = col
			colCount[col]++
			col++

			for _, edge := range flowchart.Edges {
				if edge.From == id {
					inDegree[edge.To]--
					if inDegree[edge.To] == 0 {
						queue = append(queue, edge.To)
					}
				}
			}
		}
		queue = queue[levelSize:]
		row++
		col = 0
	}

	maxRow := 0
	maxCol := 0
	for _, node := range layout.Nodes {
		if node.Row > maxRow {
			maxRow = node.Row
		}
		if node.Col > maxCol {
			maxCol = node.Col
		}
	}

	layout.MaxRow = maxRow
	layout.MaxCol = maxCol
	layout.TotalRows = maxRow + 1
	layout.TotalCols = maxCol + 1
}

func (e *LayoutEngine) calculatePositions(layout *LayoutFlowchart) {
	for col := 0; col <= layout.MaxCol; col++ {
		maxWidth := 0
		for _, node := range layout.Nodes {
			if node.Col == col && node.Width > maxWidth {
				maxWidth = node.Width
			}
		}
		layout.ColWidths[col] = maxWidth + 4
	}

	for row := 0; row <= layout.MaxRow; row++ {
		maxHeight := 0
		for _, node := range layout.Nodes {
			if node.Row == row && node.Height > maxHeight {
				maxHeight = node.Height
			}
		}
		layout.RowHeights[row] = maxHeight + 2
	}

	for _, node := range layout.Nodes {
		posX := 2
		for col := 0; col < node.Col; col++ {
			posX += layout.ColWidths[col]
		}

		posY := 1
		for row := 0; row < node.Row; row++ {
			posY += layout.RowHeights[row]
		}

		node.PosX = posX
		node.PosY = posY
	}
}

func (e *LayoutEngine) calculateEdgePath(from, to *LayoutNode, direction mermaid.FlowchartDirection) []Point {
	var points []Point

	fromCenterX := from.PosX + from.Width/2
	fromCenterY := from.PosY + from.Height/2
	toCenterX := to.PosX + to.Width/2
	toCenterY := to.PosY + to.Height/2

	switch direction {
	case mermaid.DirectionTB, mermaid.DirectionTD:
		points = append(points, Point{X: fromCenterX, Y: from.PosY + from.Height})
		midY := (from.PosY + from.Height + to.PosY) / 2
		points = append(points, Point{X: fromCenterX, Y: midY})
		points = append(points, Point{X: toCenterX, Y: midY})
		points = append(points, Point{X: toCenterX, Y: to.PosY})

	case mermaid.DirectionLR:
		points = append(points, Point{X: from.PosX + from.Width, Y: fromCenterY})
		midX := (from.PosX + from.Width + to.PosX) / 2
		points = append(points, Point{X: midX, Y: fromCenterY})
		points = append(points, Point{X: midX, Y: toCenterY})
		points = append(points, Point{X: to.PosX, Y: toCenterY})

	case mermaid.DirectionRL:
		points = append(points, Point{X: from.PosX, Y: fromCenterY})
		midX := (from.PosX + to.PosX + to.Width) / 2
		points = append(points, Point{X: midX, Y: fromCenterY})
		points = append(points, Point{X: midX, Y: toCenterY})
		points = append(points, Point{X: to.PosX + to.Width, Y: toCenterY})

	case mermaid.DirectionBT:
		points = append(points, Point{X: fromCenterX, Y: from.PosY})
		midY := (from.PosY + to.PosY + to.Height) / 2
		points = append(points, Point{X: fromCenterX, Y: midY})
		points = append(points, Point{X: toCenterX, Y: midY})
		points = append(points, Point{X: toCenterX, Y: to.PosY + to.Height})
	}

	return points
}

func (e *LayoutEngine) LayoutSequenceDiagram(diagram *mermaid.SequenceDiagram) (*LayoutSequence, error) {
	layout := &LayoutSequence{
		Diagram:      diagram,
		Participants: make(map[string]*LayoutParticipant),
		Messages:     []*LayoutMessage{},
	}

	maxNameWidth := 0
	for i, p := range diagram.Participants {
		nameWidth := len(p.Name)
		if nameWidth > maxNameWidth {
			maxNameWidth = nameWidth
		}

		layout.Participants[p.ID] = &LayoutParticipant{
			Participant: p,
			Col:         i,
			Width:       nameWidth + 4,
		}
	}

	colWidth := maxNameWidth + 8
	for i, p := range diagram.Participants {
		layout.Participants[p.ID].Width = colWidth
		layout.Participants[p.ID].PosX = i * colWidth
	}

	currentRow := 3
	for _, msg := range diagram.Messages {
		contentLines := []string{}
		if msg.Content != "" {
			contentLines = e.splitLabel(msg.Content, 30)
		}

		height := len(contentLines) + 2

		fromIdx := -1
		toIdx := -1
		for i, p := range diagram.Participants {
			if p.ID == msg.From {
				fromIdx = i
			}
			if p.ID == msg.To {
				toIdx = i
			}
			if msg.IsNote && msg.NoteTarget == p.ID {
				fromIdx = i
				toIdx = i
			}
		}

		layout.Messages = append(layout.Messages, &LayoutMessage{
			Message:      msg,
			FromIdx:      fromIdx,
			ToIdx:        toIdx,
			Row:          currentRow,
			ContentLines: contentLines,
			Height:       height,
		})

		currentRow += height
	}

	layout.MaxWidth = len(diagram.Participants) * colWidth
	layout.TotalHeight = currentRow

	return layout, nil
}

func (e *LayoutEngine) LayoutStateDiagram(diagram *mermaid.StateDiagram) (*LayoutState, error) {
	layout := &LayoutState{
		Diagram:    diagram,
		States:     make(map[string]*LayoutNode),
		Transitions: []*LayoutEdge{},
		ColWidths:  make(map[int]int),
		RowHeights: make(map[int]int),
	}

	for id, state := range diagram.States {
		label := state.Label
		if label == "" {
			label = id
		}
		labelLines := e.splitLabel(label, 20)
		width := len(labelLines[0]) + 4
		height := len(labelLines) + 2

		layout.States[id] = &LayoutNode{
			Node: &mermaid.Node{
				ID:    id,
				Label: label,
				Shape: mermaid.ShapeRounded,
			},
			Width:      width,
			Height:     height,
			LabelLines: labelLines,
		}
	}

	e.assignStateTopologicalOrder(layout, diagram)
	e.calculateStatePositions(layout)

	for _, transition := range diagram.Transitions {
		fromState := layout.States[transition.From]
		toState := layout.States[transition.To]

		if fromState == nil || toState == nil {
			continue
		}

		labelLines := []string{}
		if transition.Label != "" {
			labelLines = e.splitLabel(transition.Label, 15)
		}

		pathPoints := e.calculateEdgePath(fromState, toState, mermaid.DirectionTB)

		layout.Transitions = append(layout.Transitions, &LayoutEdge{
			Edge: &mermaid.Edge{
				From:  transition.From,
				To:    transition.To,
				Label: transition.Label,
			},
			FromNode:   fromState,
			ToNode:     toState,
			Label:      transition.Label,
			LabelLines: labelLines,
			PathPoints: pathPoints,
		})
	}

	return layout, nil
}

func (e *LayoutEngine) assignStateTopologicalOrder(layout *LayoutState, diagram *mermaid.StateDiagram) {
	inDegree := make(map[string]int)
	for id := range layout.States {
		inDegree[id] = 0
	}

	for _, transition := range diagram.Transitions {
		if transition.From != "[*]" && transition.To != "[*]" {
			inDegree[transition.To]++
		}
	}

	var queue []string
	for id, degree := range inDegree {
		if degree == 0 {
			queue = append(queue, id)
		}
	}

	if diagram.StartState != "" {
		queue = []string{diagram.StartState}
		for id := range inDegree {
			if id != diagram.StartState && inDegree[id] == 0 {
				queue = append(queue, id)
			}
		}
	}

	row := 0
	col := 0

	for len(queue) > 0 {
		levelSize := len(queue)
		for i := 0; i < levelSize; i++ {
			id := queue[i]
			state := layout.States[id]
			state.Row = row
			state.Col = col
			col++

			for _, transition := range diagram.Transitions {
				if transition.From == id {
					inDegree[transition.To]--
					if inDegree[transition.To] == 0 && transition.To != "[*]" {
						queue = append(queue, transition.To)
					}
				}
			}
		}
		queue = queue[levelSize:]
		row++
		col = 0
	}

	maxRow := 0
	maxCol := 0
	for _, state := range layout.States {
		if state.Row > maxRow {
			maxRow = state.Row
		}
		if state.Col > maxCol {
			maxCol = state.Col
		}
	}

	layout.MaxRow = maxRow
	layout.MaxCol = maxCol
}

func (e *LayoutEngine) calculateStatePositions(layout *LayoutState) {
	for col := 0; col <= layout.MaxCol; col++ {
		maxWidth := 0
		for _, state := range layout.States {
			if state.Col == col && state.Width > maxWidth {
				maxWidth = state.Width
			}
		}
		layout.ColWidths[col] = maxWidth + 6
	}

	for row := 0; row <= layout.MaxRow; row++ {
		maxHeight := 0
		for _, state := range layout.States {
			if state.Row == row && state.Height > maxHeight {
				maxHeight = state.Height
			}
		}
		layout.RowHeights[row] = maxHeight + 3
	}

	for _, state := range layout.States {
		posX := 2
		for col := 0; col < state.Col; col++ {
			posX += layout.ColWidths[col]
		}

		posY := 1
		for row := 0; row < state.Row; row++ {
			posY += layout.RowHeights[row]
		}

		state.PosX = posX
		state.PosY = posY
	}
}
