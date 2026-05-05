package renderer

import (
	"fmt"
	"strings"

	"file-viz-toolkit/pkg/mermaid"
	"file-viz-toolkit/pkg/mermaid/layout"
)

const (
	ColorReset   = "\033[0m"
	ColorRed     = "\033[31m"
	ColorGreen   = "\033[32m"
	ColorYellow  = "\033[33m"
	ColorBlue    = "\033[34m"
	ColorMagenta = "\033[35m"
	ColorCyan    = "\033[36m"
	ColorWhite   = "\033[37m"
	ColorBold    = "\033[1m"
)

type Renderer struct {
	useColors bool
}

func NewRenderer(useColors bool) *Renderer {
	return &Renderer{useColors: useColors}
}

func (r *Renderer) RenderDiagram(diagram *mermaid.Diagram) (string, error) {
	switch diagram.Type {
	case mermaid.DiagramTypeFlowchart:
		return r.RenderFlowchart(diagram.Flowchart)
	case mermaid.DiagramTypeSequence:
		return r.RenderSequenceDiagram(diagram.SequenceDiagram)
	case mermaid.DiagramTypeState:
		return r.RenderStateDiagram(diagram.StateDiagram)
	default:
		return "", fmt.Errorf("不支持的图表类型")
	}
}

func (r *Renderer) RenderFlowchart(flowchart *mermaid.Flowchart) (string, error) {
	engine := layout.NewLayoutEngine()
	l, err := engine.LayoutFlowchart(flowchart)
	if err != nil {
		return "", err
	}

	maxX := 0
	maxY := 0
	for _, node := range l.Nodes {
		if node.PosX+node.Width > maxX {
			maxX = node.PosX + node.Width
		}
		if node.PosY+node.Height > maxY {
			maxY = node.PosY + node.Height
		}
	}

	for _, edge := range l.Edges {
		for _, point := range edge.PathPoints {
			if point.X > maxX {
				maxX = point.X
			}
			if point.Y > maxY {
				maxY = point.Y
			}
		}
	}

	maxX += 2
	maxY += 2

	grid := r.createGrid(maxX, maxY)

	for _, node := range l.Nodes {
		r.drawNode(grid, node)
	}

	for _, edge := range l.Edges {
		r.drawEdge(grid, edge)
	}

	return r.gridToString(grid), nil
}

func (r *Renderer) createGrid(width, height int) [][]rune {
	grid := make([][]rune, height)
	for y := range grid {
		grid[y] = make([]rune, width)
		for x := range grid[y] {
			grid[y][x] = ' '
		}
	}
	return grid
}

func (r *Renderer) drawNode(grid [][]rune, node *layout.LayoutNode) {
	switch node.Node.Shape {
	case mermaid.ShapeRectangle:
		r.drawRectangle(grid, node)
	case mermaid.ShapeRounded:
		r.drawRoundedRectangle(grid, node)
	case mermaid.ShapeCircle:
		r.drawCircle(grid, node)
	case mermaid.ShapeRhombus:
		r.drawRhombus(grid, node)
	case mermaid.ShapeHexagon:
		r.drawHexagon(grid, node)
	case mermaid.ShapeCylindrical:
		r.drawCylindrical(grid, node)
	case mermaid.ShapeStadium:
		r.drawStadium(grid, node)
	default:
		r.drawRectangle(grid, node)
	}

	r.drawNodeLabel(grid, node)
}

func (r *Renderer) drawRectangle(grid [][]rune, node *layout.LayoutNode) {
	x := node.PosX
	y := node.PosY
	w := node.Width
	h := node.Height

	grid[y][x] = '┌'
	for i := 1; i < w-1; i++ {
		grid[y][x+i] = '─'
	}
	grid[y][x+w-1] = '┐'

	for i := 1; i < h-1; i++ {
		grid[y+i][x] = '│'
		grid[y+i][x+w-1] = '│'
	}

	grid[y+h-1][x] = '└'
	for i := 1; i < w-1; i++ {
		grid[y+h-1][x+i] = '─'
	}
	grid[y+h-1][x+w-1] = '┘'
}

func (r *Renderer) drawRoundedRectangle(grid [][]rune, node *layout.LayoutNode) {
	x := node.PosX
	y := node.PosY
	w := node.Width
	h := node.Height

	grid[y][x] = '╭'
	for i := 1; i < w-1; i++ {
		grid[y][x+i] = '─'
	}
	grid[y][x+w-1] = '╮'

	for i := 1; i < h-1; i++ {
		grid[y+i][x] = '│'
		grid[y+i][x+w-1] = '│'
	}

	grid[y+h-1][x] = '╰'
	for i := 1; i < w-1; i++ {
		grid[y+h-1][x+i] = '─'
	}
	grid[y+h-1][x+w-1] = '╯'
}

func (r *Renderer) drawCircle(grid [][]rune, node *layout.LayoutNode) {
	x := node.PosX
	y := node.PosY
	w := node.Width
	h := node.Height

	radius := min(w, h) / 2
	centerX := x + w/2
	centerY := y + h/2

	for dy := -radius; dy <= radius; dy++ {
		for dx := -radius; dx <= radius; dx++ {
			if dx*dx+dy*dy <= radius*radius {
				px := centerX + dx
				py := centerY + dy
				if py >= 0 && py < len(grid) && px >= 0 && px < len(grid[py]) {
					if dx*dx+dy*dy >= (radius-1)*(radius-1) {
						grid[py][px] = '●'
					} else {
						grid[py][px] = ' '
					}
				}
			}
		}
	}
}

func (r *Renderer) drawRhombus(grid [][]rune, node *layout.LayoutNode) {
	x := node.PosX
	y := node.PosY
	w := node.Width
	h := node.Height

	centerX := x + w/2
	centerY := y + h/2

	for dy := 0; dy < h; dy++ {
		offset := abs(centerY - (y + dy))
		startX := centerX - offset
		endX := centerX + offset

		if startX >= 0 && y+dy < len(grid) && startX < len(grid[y+dy]) {
			grid[y+dy][startX] = '╱'
		}
		if endX >= 0 && endX < len(grid[y+dy]) {
			grid[y+dy][endX] = '╲'
		}
	}

	if centerY >= 0 && centerY < len(grid) && centerX >= 0 && centerX < len(grid[centerY]) {
		grid[centerY][centerX] = '◇'
	}
}

func (r *Renderer) drawHexagon(grid [][]rune, node *layout.LayoutNode) {
	x := node.PosX
	y := node.PosY
	w := node.Width
	h := node.Height

	grid[y][x+1] = '╭'
	grid[y][x+w-2] = '╮'

	for i := 2; i < w-2; i++ {
		grid[y][x+i] = '─'
	}

	for i := 1; i < h-1; i++ {
		grid[y+i][x] = '│'
		grid[y+i][x+w-1] = '│'
	}

	grid[y+h-1][x+1] = '╰'
	grid[y+h-1][x+w-2] = '╯'
	for i := 2; i < w-2; i++ {
		grid[y+h-1][x+i] = '─'
	}
}

func (r *Renderer) drawCylindrical(grid [][]rune, node *layout.LayoutNode) {
	x := node.PosX
	y := node.PosY
	w := node.Width
	h := node.Height

	for i := 0; i < w; i++ {
		grid[y][x+i] = '─'
	}
	grid[y][x] = '╭'
	grid[y][x+w-1] = '╮'

	for i := 1; i < h-1; i++ {
		grid[y+i][x] = '│'
		grid[y+i][x+w-1] = '│'
	}

	for i := 0; i < w; i++ {
		grid[y+h-1][x+i] = '─'
	}
	grid[y+h-1][x] = '╰'
	grid[y+h-1][x+w-1] = '╯'
}

func (r *Renderer) drawStadium(grid [][]rune, node *layout.LayoutNode) {
	x := node.PosX
	y := node.PosY
	w := node.Width
	h := node.Height

	radius := h / 2

	grid[y][x+radius] = '╭'
	grid[y][x+w-radius-1] = '╮'

	for i := radius + 1; i < w-radius-1; i++ {
		grid[y][x+i] = '─'
	}

	for i := 1; i < h-1; i++ {
		grid[y+i][x] = '│'
		grid[y+i][x+w-1] = '│'
	}

	grid[y+h-1][x+radius] = '╰'
	grid[y+h-1][x+w-radius-1] = '╯'

	for i := radius + 1; i < w-radius-1; i++ {
		grid[y+h-1][x+i] = '─'
	}
}

func (r *Renderer) drawNodeLabel(grid [][]rune, node *layout.LayoutNode) {
	if len(node.LabelLines) == 0 {
		return
	}

	startY := node.PosY + 1
	for i, line := range node.LabelLines {
		if startY+i >= len(grid) {
			break
		}

		centerX := node.PosX + node.Width/2 - len(line)/2
		for j, ch := range line {
			px := centerX + j
			if px >= 0 && px < len(grid[startY+i]) {
				grid[startY+i][px] = ch
			}
		}
	}
}

func (r *Renderer) drawEdge(grid [][]rune, edge *layout.LayoutEdge) {
	if len(edge.PathPoints) < 2 {
		return
	}

	for i := 0; i < len(edge.PathPoints)-1; i++ {
		from := edge.PathPoints[i]
		to := edge.PathPoints[i+1]

		r.drawLine(grid, from, to, edge.Edge.Style)
	}

	if len(edge.PathPoints) >= 2 {
		lastPoint := edge.PathPoints[len(edge.PathPoints)-1]
		prevPoint := edge.PathPoints[len(edge.PathPoints)-2]

		r.drawArrow(grid, prevPoint, lastPoint, edge.Edge.ArrowType)
	}

	if edge.Label != "" && len(edge.PathPoints) >= 2 {
		midIdx := len(edge.PathPoints) / 2
		midPoint := edge.PathPoints[midIdx]

		labelX := midPoint.X - len(edge.Label)/2
		labelY := midPoint.Y - 1

		if labelY >= 0 && labelY < len(grid) {
			for j, ch := range edge.Label {
				px := labelX + j
				if px >= 0 && px < len(grid[labelY]) {
					grid[labelY][px] = ch
				}
			}
		}
	}
}

func (r *Renderer) drawLine(grid [][]rune, from, to layout.Point, style mermaid.EdgeStyle) {
	dx := to.X - from.X
	dy := to.Y - from.Y

	steps := max(abs(dx), abs(dy))
	if steps == 0 {
		return
	}

	xStep := float64(dx) / float64(steps)
	yStep := float64(dy) / float64(steps)

	for i := 0; i <= steps; i++ {
		x := from.X + int(float64(i)*xStep+0.5)
		y := from.Y + int(float64(i)*yStep+0.5)

		if y >= 0 && y < len(grid) && x >= 0 && x < len(grid[y]) {
			if grid[y][x] == ' ' {
				if dx == 0 {
					if style == mermaid.StyleDotted {
						grid[y][x] = '┆'
					} else {
						grid[y][x] = '│'
					}
				} else if dy == 0 {
					if style == mermaid.StyleDotted {
						grid[y][x] = '┄'
					} else {
						grid[y][x] = '─'
					}
				} else {
					if dx > 0 && dy > 0 {
						grid[y][x] = '┌'
					} else if dx < 0 && dy > 0 {
						grid[y][x] = '┐'
					} else if dx > 0 && dy < 0 {
						grid[y][x] = '└'
					} else {
						grid[y][x] = '┘'
					}
				}
			}
		}
	}
}

func (r *Renderer) drawArrow(grid [][]rune, from, to layout.Point, arrowType mermaid.ArrowType) {
	if arrowType == mermaid.ArrowNone {
		return
	}

	dx := to.X - from.X
	dy := to.Y - from.Y

	if dy > 0 {
		if to.Y < len(grid) && to.X-1 >= 0 && to.X+1 < len(grid[to.Y]) {
			grid[to.Y][to.X] = '▼'
		}
	} else if dy < 0 {
		if to.Y >= 0 && to.X-1 >= 0 && to.X+1 < len(grid[to.Y]) {
			grid[to.Y][to.X] = '▲'
		}
	} else if dx > 0 {
		if to.Y < len(grid) && to.X < len(grid[to.Y]) {
			grid[to.Y][to.X] = '►'
		}
	} else if dx < 0 {
		if to.Y < len(grid) && to.X >= 0 {
			grid[to.Y][to.X] = '◄'
		}
	}
}

func (r *Renderer) gridToString(grid [][]rune) string {
	var builder strings.Builder
	for y := range grid {
		for x := range grid[y] {
			builder.WriteRune(grid[y][x])
		}
		builder.WriteString("\n")
	}
	return builder.String()
}

func (r *Renderer) RenderSequenceDiagram(diagram *mermaid.SequenceDiagram) (string, error) {
	engine := layout.NewLayoutEngine()
	l, err := engine.LayoutSequenceDiagram(diagram)
	if err != nil {
		return "", err
	}

	var builder strings.Builder

	builder.WriteString("\n")
	builder.WriteString("╔════════════════════════════════════════════════════════════╗\n")
	builder.WriteString("║                    时序图                                      ║\n")
	builder.WriteString("╠════════════════════════════════════════════════════════════╣\n")

	for _, p := range diagram.Participants {
		builder.WriteString(fmt.Sprintf("  [%s] ", p.Name))
	}
	builder.WriteString("\n\n")

	for _, msg := range l.Messages {
		if msg.Message.IsNote {
			notePrefix := ""
			switch msg.Message.NoteType {
			case mermaid.NoteLeft:
				notePrefix = "◀─ "
			case mermaid.NoteRight:
				notePrefix = "─▶ "
			case mermaid.NoteOver:
				notePrefix = "┌─"
			}

			for _, line := range msg.ContentLines {
				builder.WriteString(fmt.Sprintf("  %s%s\n", notePrefix, line))
			}
			if msg.Message.NoteType == mermaid.NoteOver {
				builder.WriteString("  └─\n")
			}
		} else {
			arrow := "──▶"
			if msg.Message.Type == mermaid.MessageDottedArrow {
				arrow = "┄┄▶"
			} else if msg.Message.Type == mermaid.MessageCross {
				arrow = "──✕"
			}

			fromName := "?"
			toName := "?"
			for _, p := range diagram.Participants {
				if msg.FromIdx >= 0 && msg.FromIdx < len(diagram.Participants) &&
					diagram.Participants[msg.FromIdx].ID == p.ID {
					fromName = p.Name
				}
				if msg.ToIdx >= 0 && msg.ToIdx < len(diagram.Participants) &&
					diagram.Participants[msg.ToIdx].ID == p.ID {
					toName = p.Name
				}
			}

			for i, line := range msg.ContentLines {
				if i == 0 {
					builder.WriteString(fmt.Sprintf("  %s %s %s: %s\n", fromName, arrow, toName, line))
				} else {
					builder.WriteString(fmt.Sprintf("                  %s\n", line))
				}
			}
		}
	}

	builder.WriteString("╚════════════════════════════════════════════════════════════╝\n")

	return builder.String(), nil
}

func (r *Renderer) RenderStateDiagram(diagram *mermaid.StateDiagram) (string, error) {
	engine := layout.NewLayoutEngine()
	l, err := engine.LayoutStateDiagram(diagram)
	if err != nil {
		return "", err
	}

	maxX := 0
	maxY := 0
	for _, state := range l.States {
		if state.PosX+state.Width > maxX {
			maxX = state.PosX + state.Width
		}
		if state.PosY+state.Height > maxY {
			maxY = state.PosY + state.Height
		}
	}

	for _, transition := range l.Transitions {
		for _, point := range transition.PathPoints {
			if point.X > maxX {
				maxX = point.X
			}
			if point.Y > maxY {
				maxY = point.Y
			}
		}
	}

	maxX += 4
	maxY += 4

	grid := r.createGrid(maxX, maxY)

	if diagram.StartState != "" {
		startState := l.States[diagram.StartState]
		if startState != nil && startState.PosY > 0 {
			grid[startState.PosY-1][startState.PosX+startState.Width/2] = '●'
			grid[startState.PosY-2][startState.PosX+startState.Width/2] = '│'
			grid[startState.PosY-3][startState.PosX+startState.Width/2] = '▶'
		}
	}

	for _, state := range l.States {
		r.drawState(grid, state, diagram)
	}

	for _, transition := range l.Transitions {
		r.drawEdge(grid, transition)
	}

	return r.gridToString(grid), nil
}

func (r *Renderer) drawState(grid [][]rune, node *layout.LayoutNode, diagram *mermaid.StateDiagram) {
	isEnd := false
	for _, endState := range diagram.EndStates {
		if node.Node.ID == endState {
			isEnd = true
			break
		}
	}

	if isEnd {
		x := node.PosX + node.Width/2
		y := node.PosY + node.Height/2
		if y >= 0 && y < len(grid) && x >= 0 && x < len(grid[y]) {
			grid[y][x] = '◉'
			if y+1 < len(grid) {
				grid[y+1][x] = '●'
			}
		}
	} else {
		r.drawRoundedRectangle(grid, node)
		r.drawNodeLabel(grid, node)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func abs(a int) int {
	if a < 0 {
		return -a
	}
	return a
}
