package parser

import (
	"bufio"
	"fmt"
	"regexp"
	"strings"

	"file-viz-toolkit/pkg/mermaid"
)

type Parser struct{}

func NewParser() *Parser {
	return &Parser{}
}

func (p *Parser) Parse(content string) (*mermaid.Diagram, error) {
	lines := p.splitLines(content)
	if len(lines) == 0 {
		return nil, fmt.Errorf("空的图表内容")
	}

	firstLine := strings.TrimSpace(lines[0])
	diagramType := p.detectDiagramType(firstLine)

	switch diagramType {
	case mermaid.DiagramTypeFlowchart:
		flowchart, err := p.parseFlowchart(lines)
		if err != nil {
			return nil, err
		}
		return &mermaid.Diagram{
			Type:      diagramType,
			Flowchart: flowchart,
			Raw:       content,
		}, nil

	case mermaid.DiagramTypeSequence:
		seqDiagram, err := p.parseSequenceDiagram(lines)
		if err != nil {
			return nil, err
		}
		return &mermaid.Diagram{
			Type:            diagramType,
			SequenceDiagram: seqDiagram,
			Raw:             content,
		}, nil

	case mermaid.DiagramTypeState:
		stateDiagram, err := p.parseStateDiagram(lines)
		if err != nil {
			return nil, err
		}
		return &mermaid.Diagram{
			Type:         diagramType,
			StateDiagram: stateDiagram,
			Raw:          content,
		}, nil

	default:
		return nil, fmt.Errorf("不支持的图表类型: %s", firstLine)
	}
}

func (p *Parser) splitLines(content string) []string {
	var lines []string
	scanner := bufio.NewScanner(strings.NewReader(content))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" {
			lines = append(lines, line)
		}
	}
	return lines
}

func (p *Parser) detectDiagramType(firstLine string) mermaid.DiagramType {
	if strings.HasPrefix(firstLine, "flowchart") || strings.HasPrefix(firstLine, "graph") {
		return mermaid.DiagramTypeFlowchart
	}
	if strings.HasPrefix(firstLine, "sequenceDiagram") {
		return mermaid.DiagramTypeSequence
	}
	if strings.HasPrefix(firstLine, "stateDiagram") {
		return mermaid.DiagramTypeState
	}
	return ""
}

func (p *Parser) parseFlowchart(lines []string) (*mermaid.Flowchart, error) {
	flowchart := &mermaid.Flowchart{
		Direction: mermaid.DirectionTB,
		Nodes:     make(map[string]*mermaid.Node),
		Edges:     []*mermaid.Edge{},
		Subgraphs: []*mermaid.Subgraph{},
	}

	firstLine := lines[0]
	parts := strings.Fields(firstLine)
	if len(parts) > 1 {
		switch parts[1] {
		case "TB", "TD":
			flowchart.Direction = mermaid.DirectionTB
		case "BT":
			flowchart.Direction = mermaid.DirectionBT
		case "LR":
			flowchart.Direction = mermaid.DirectionLR
		case "RL":
			flowchart.Direction = mermaid.DirectionRL
		}
	}

	for i := 1; i < len(lines); i++ {
		line := lines[i]

		if strings.HasPrefix(line, "subgraph") {
			subgraph, newIdx, err := p.parseSubgraph(lines, i)
			if err != nil {
				return nil, err
			}
			flowchart.Subgraphs = append(flowchart.Subgraphs, subgraph)
			i = newIdx
			continue
		}

		if strings.HasPrefix(line, "end") {
			continue
		}

		if strings.Contains(line, "-->") || strings.Contains(line, "---") ||
			strings.Contains(line, "-.->") || strings.Contains(line, "==>") {
			p.parseLineWithEdge(flowchart, line)
		} else if strings.Contains(line, "[") || strings.Contains(line, "(") ||
			strings.Contains(line, "{") || strings.Contains(line, ">") ||
			strings.Contains(line, "]]") || strings.Contains(line, "})") ||
			strings.Contains(line, "[(") || strings.Contains(line, "])") ||
			strings.Contains(line, "(((") || strings.Contains(line, ")))") {
			node, err := p.parseNode(line)
			if err != nil {
				return nil, err
			}
			flowchart.Nodes[node.ID] = node
		}
	}

	return flowchart, nil
}

func (p *Parser) parseLineWithEdge(flowchart *mermaid.Flowchart, line string) {
	var arrowPattern string
	var style mermaid.EdgeStyle
	var arrowType mermaid.ArrowType

	switch {
	case strings.Contains(line, "-.->"):
		arrowPattern = "-.->"
		style = mermaid.StyleDotted
		arrowType = mermaid.ArrowOpen
	case strings.Contains(line, "==>"):
		arrowPattern = "==>"
		style = mermaid.StyleThick
		arrowType = mermaid.ArrowOpen
	case strings.Contains(line, "---"):
		arrowPattern = "---"
		style = mermaid.StyleSolid
		arrowType = mermaid.ArrowNone
	case strings.Contains(line, "-->"):
		arrowPattern = "-->"
		style = mermaid.StyleSolid
		arrowType = mermaid.ArrowOpen
	default:
		return
	}

	parts := strings.SplitN(line, arrowPattern, 2)
	if len(parts) != 2 {
		return
	}

	leftPart := strings.TrimSpace(parts[0])
	rightPart := strings.TrimSpace(parts[1])

	label := ""
	if strings.Contains(rightPart, "|") {
		labelParts := strings.SplitN(rightPart, "|", 3)
		if len(labelParts) >= 2 {
			label = strings.TrimSpace(labelParts[1])
			if len(labelParts) >= 3 {
				rightPart = strings.TrimSpace(labelParts[2])
			} else {
				rightPart = ""
			}
		}
	}

	fromNode := p.parseNodeFromPart(leftPart)
	if fromNode != nil {
		if _, exists := flowchart.Nodes[fromNode.ID]; !exists {
			flowchart.Nodes[fromNode.ID] = fromNode
		}
	}

	toNode := p.parseNodeFromPart(rightPart)
	if toNode != nil {
		if _, exists := flowchart.Nodes[toNode.ID]; !exists {
			flowchart.Nodes[toNode.ID] = toNode
		}
	}

	if fromNode != nil && toNode != nil {
		flowchart.Edges = append(flowchart.Edges, &mermaid.Edge{
			From:      fromNode.ID,
			To:        toNode.ID,
			Label:     label,
			Style:     style,
			ArrowType: arrowType,
		})
	}
}

func (p *Parser) parseNodeFromPart(part string) *mermaid.Node {
	if part == "" {
		return nil
	}

	node, err := p.parseNode(part)
	if err == nil {
		return node
	}

	re := regexp.MustCompile(`^([a-zA-Z0-9_]+)$`)
	match := re.FindStringSubmatch(part)
	if len(match) > 0 {
		return &mermaid.Node{
			ID:    match[1],
			Label: match[1],
			Shape: mermaid.ShapeRectangle,
		}
	}

	return nil
}

func (p *Parser) parseSubgraph(lines []string, startIdx int) (*mermaid.Subgraph, int, error) {
	subgraph := &mermaid.Subgraph{
		Direction: mermaid.DirectionTB,
	}

	firstLine := lines[startIdx]
	parts := strings.SplitN(firstLine, " ", 2)
	if len(parts) > 1 {
		subgraph.Label = parts[1]
		if idParts := strings.SplitN(parts[1], " ", 2); len(idParts) > 1 {
			subgraph.ID = idParts[0]
			subgraph.Label = idParts[1]
		} else {
			subgraph.ID = parts[1]
		}
	}

	for i := startIdx + 1; i < len(lines); i++ {
		line := lines[i]

		if strings.HasPrefix(line, "end") {
			return subgraph, i, nil
		}

		if strings.HasPrefix(line, "direction") {
			parts := strings.Fields(line)
			if len(parts) > 1 {
				switch parts[1] {
				case "TB", "TD":
					subgraph.Direction = mermaid.DirectionTB
				case "BT":
					subgraph.Direction = mermaid.DirectionBT
				case "LR":
					subgraph.Direction = mermaid.DirectionLR
				case "RL":
					subgraph.Direction = mermaid.DirectionRL
				}
			}
			continue
		}

		if strings.Contains(line, "[") || strings.Contains(line, "(") ||
			strings.Contains(line, "{") || strings.Contains(line, ">") {
			nodeID := p.extractNodeID(line)
			if nodeID != "" {
				subgraph.Nodes = append(subgraph.Nodes, nodeID)
			}
		}
	}

	return subgraph, len(lines) - 1, nil
}

func (p *Parser) extractNodeID(line string) string {
	re := regexp.MustCompile(`^([a-zA-Z0-9_]+)`)
	match := re.FindStringSubmatch(line)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func (p *Parser) parseNode(line string) (*mermaid.Node, error) {
	node := &mermaid.Node{
		Metadata: make(map[string]string),
	}

	re := regexp.MustCompile(`^([a-zA-Z0-9_]+)\s*([\[\(\{>\]\)\}]+)\s*(.*?)\s*([\]\)\}]+)\s*$`)
	match := re.FindStringSubmatch(line)

	if len(match) > 0 {
		node.ID = match[1]
		startBracket := match[2]
		node.Label = strings.TrimSpace(match[3])
		endBracket := match[4]

		switch {
		case startBracket == "[" && endBracket == "]":
			node.Shape = mermaid.ShapeRectangle
		case startBracket == "(" && endBracket == ")":
			node.Shape = mermaid.ShapeRounded
		case startBracket == "((" && endBracket == "))":
			node.Shape = mermaid.ShapeCircle
		case startBracket == ">" && endBracket == "]":
			node.Shape = mermaid.ShapeAsymmetric
		case startBracket == "{" && endBracket == "}":
			node.Shape = mermaid.ShapeRhombus
			node.IsDecision = true
		case startBracket == "{{" && endBracket == "}}":
			node.Shape = mermaid.ShapeHexagon
		case startBracket == "[/" && endBracket == "/]":
			node.Shape = mermaid.ShapeParallelogram
		case startBracket == "[\\" && endBracket == "\\]":
			node.Shape = mermaid.ShapeParallelogramAlt
		case startBracket == "[(" && endBracket == ")]":
			node.Shape = mermaid.ShapeCylindrical
		case startBracket == "[{" && endBracket == "}]":
			node.Shape = mermaid.ShapeStadium
		case startBracket == ">>" && endBracket == "<<":
			node.Shape = mermaid.ShapeDoubleCircle
		default:
			node.Shape = mermaid.ShapeRectangle
		}

		if node.Label == "" {
			node.Label = node.ID
		}

		return node, nil
	}

	re = regexp.MustCompile(`^([a-zA-Z0-9_]+)\s*$`)
	match = re.FindStringSubmatch(line)
	if len(match) > 0 {
		node.ID = match[1]
		node.Label = match[1]
		node.Shape = mermaid.ShapeRectangle
		return node, nil
	}

	re = regexp.MustCompile(`^([a-zA-Z0-9_]+)\s*-\s*(.+)$`)
	match = re.FindStringSubmatch(line)
	if len(match) > 0 {
		node.ID = match[1]
		node.Label = strings.TrimSpace(match[2])
		node.Shape = mermaid.ShapeRectangle
		return node, nil
	}

	return nil, fmt.Errorf("无法解析节点: %s", line)
}

func (p *Parser) parseEdge(line string) (*mermaid.Edge, error) {
	edge := &mermaid.Edge{
		Metadata: make(map[string]string),
	}

	var arrowPattern string
	var style mermaid.EdgeStyle
	var arrowType mermaid.ArrowType

	switch {
	case strings.Contains(line, "-.->"):
		arrowPattern = `-\.\-`
		style = mermaid.StyleDotted
		arrowType = mermaid.ArrowOpen
	case strings.Contains(line, "==>"):
		arrowPattern = `==`
		style = mermaid.StyleThick
		arrowType = mermaid.ArrowOpen
	case strings.Contains(line, "---"):
		arrowPattern = `---`
		style = mermaid.StyleSolid
		arrowType = mermaid.ArrowNone
	case strings.Contains(line, "-->"):
		arrowPattern = `--`
		style = mermaid.StyleSolid
		arrowType = mermaid.ArrowOpen
	default:
		return nil, fmt.Errorf("无法解析边: %s", line)
	}

	re := regexp.MustCompile(`^([a-zA-Z0-9_]+)\s*` + arrowPattern + `\s*\|?([^|>]*)\|?\s*>?\s*([a-zA-Z0-9_]+)\s*$`)
	match := re.FindStringSubmatch(line)

	if len(match) > 0 {
		edge.From = match[1]
		edge.To = match[3]
		edge.Label = strings.TrimSpace(match[2])
		edge.Style = style
		edge.ArrowType = arrowType
		return edge, nil
	}

	re = regexp.MustCompile(`^([a-zA-Z0-9_]+)\s*` + arrowPattern + `\s*>?\s*([a-zA-Z0-9_]+)\s*$`)
	match = re.FindStringSubmatch(line)
	if len(match) > 0 {
		edge.From = match[1]
		edge.To = match[2]
		edge.Style = style
		edge.ArrowType = arrowType
		return edge, nil
	}

	return nil, fmt.Errorf("无法解析边: %s", line)
}

func (p *Parser) parseSequenceDiagram(lines []string) (*mermaid.SequenceDiagram, error) {
	diagram := &mermaid.SequenceDiagram{
		Participants: []*mermaid.Participant{},
		Messages:     []*mermaid.Message{},
		Activations:  []*mermaid.Activation{},
	}

	participantMap := make(map[string]*mermaid.Participant)

	for i := 1; i < len(lines); i++ {
		line := lines[i]

		if strings.HasPrefix(line, "participant") {
			participant := p.parseParticipant(line, mermaid.ParticipantDefault)
			participantMap[participant.ID] = participant
			diagram.Participants = append(diagram.Participants, participant)
		} else if strings.HasPrefix(line, "actor") {
			participant := p.parseParticipant(line, mermaid.ParticipantActor)
			participantMap[participant.ID] = participant
			diagram.Participants = append(diagram.Participants, participant)
		} else if strings.HasPrefix(line, "activate") {
			parts := strings.Fields(line)
			if len(parts) > 1 {
				diagram.Activations = append(diagram.Activations, &mermaid.Activation{
					Participant: parts[1],
					IsActive:    true,
				})
			}
		} else if strings.HasPrefix(line, "deactivate") {
			parts := strings.Fields(line)
			if len(parts) > 1 {
				diagram.Activations = append(diagram.Activations, &mermaid.Activation{
					Participant: parts[1],
					IsActive:    false,
				})
			}
		} else if strings.HasPrefix(line, "Note") {
			message, err := p.parseNote(line)
			if err == nil {
				diagram.Messages = append(diagram.Messages, message)
			}
		} else if strings.Contains(line, "->") || strings.Contains(line, "-->") ||
			strings.Contains(line, "-x") || strings.Contains(line, "--x") {
			message, err := p.parseSequenceMessage(line)
			if err == nil {
				diagram.Messages = append(diagram.Messages, message)
			}
		}
	}

	return diagram, nil
}

func (p *Parser) parseParticipant(line string, pType mermaid.ParticipantType) *mermaid.Participant {
	participant := &mermaid.Participant{
		Type: pType,
	}

	re := regexp.MustCompile(`(participant|actor)\s+([a-zA-Z0-9_]+)(?:\s+as\s+(.+))?$`)
	match := re.FindStringSubmatch(line)

	if len(match) > 0 {
		participant.ID = match[2]
		if len(match) > 3 && match[3] != "" {
			participant.Alias = match[3]
			participant.Name = match[3]
		} else {
			participant.Name = match[2]
		}
	} else {
		parts := strings.Fields(line)
		if len(parts) > 1 {
			participant.ID = parts[1]
			participant.Name = parts[1]
		}
	}

	return participant
}

func (p *Parser) parseSequenceMessage(line string) (*mermaid.Message, error) {
	message := &mermaid.Message{
		IsNote: false,
	}

	var pattern string
	var msgType mermaid.MessageType

	switch {
	case strings.Contains(line, "--x"):
		pattern = `--x`
		msgType = mermaid.MessageCross
	case strings.Contains(line, "-x"):
		pattern = `-x`
		msgType = mermaid.MessageCross
	case strings.Contains(line, "-->"):
		pattern = `-->`
		msgType = mermaid.MessageDottedArrow
	case strings.Contains(line, "->"):
		pattern = `->`
		msgType = mermaid.MessageSolidArrow
	default:
		return nil, fmt.Errorf("无法解析消息: %s", line)
	}

	re := regexp.MustCompile(`^([a-zA-Z0-9_]+)\s*` + pattern + `\s*([a-zA-Z0-9_]+)\s*:\s*(.+)$`)
	match := re.FindStringSubmatch(line)

	if len(match) > 0 {
		message.From = match[1]
		message.To = match[2]
		message.Content = strings.TrimSpace(match[3])
		message.Type = msgType
		return message, nil
	}

	return nil, fmt.Errorf("无法解析消息: %s", line)
}

func (p *Parser) parseNote(line string) (*mermaid.Message, error) {
	message := &mermaid.Message{
		IsNote: true,
	}

	if strings.Contains(line, "left of") {
		message.NoteType = mermaid.NoteLeft
		re := regexp.MustCompile(`Note\s+left\s+of\s+([a-zA-Z0-9_]+)\s*:\s*(.+)$`)
		match := re.FindStringSubmatch(line)
		if len(match) > 0 {
			message.NoteTarget = match[1]
			message.Content = strings.TrimSpace(match[2])
			return message, nil
		}
	} else if strings.Contains(line, "right of") {
		message.NoteType = mermaid.NoteRight
		re := regexp.MustCompile(`Note\s+right\s+of\s+([a-zA-Z0-9_]+)\s*:\s*(.+)$`)
		match := re.FindStringSubmatch(line)
		if len(match) > 0 {
			message.NoteTarget = match[1]
			message.Content = strings.TrimSpace(match[2])
			return message, nil
		}
	} else if strings.Contains(line, "over") {
		message.NoteType = mermaid.NoteOver
		re := regexp.MustCompile(`Note\s+over\s+([a-zA-Z0-9_]+(?:\s*,\s*[a-zA-Z0-9_]+)*)\s*:\s*(.+)$`)
		match := re.FindStringSubmatch(line)
		if len(match) > 0 {
			message.NoteTarget = match[1]
			message.Content = strings.TrimSpace(match[2])
			return message, nil
		}
	}

	return nil, fmt.Errorf("无法解析注释: %s", line)
}

func (p *Parser) parseStateDiagram(lines []string) (*mermaid.StateDiagram, error) {
	diagram := &mermaid.StateDiagram{
		States:      make(map[string]*mermaid.State),
		Transitions: []*mermaid.Transition{},
		EndStates:   []string{},
	}

	for i := 1; i < len(lines); i++ {
		line := lines[i]

		if strings.HasPrefix(line, "[*]") {
			if strings.Contains(line, "-->") {
				parts := strings.Split(line, "-->")
				if len(parts) == 2 {
					target := strings.TrimSpace(parts[1])
					if target != "[*]" {
						target = p.extractStateID(target)
						diagram.StartState = target
						diagram.States[target] = &mermaid.State{
							ID:    target,
							Label: target,
						}
						diagram.Transitions = append(diagram.Transitions, &mermaid.Transition{
							From: "[*]",
							To:   target,
						})
					}
				}
			} else if strings.Contains(line, "<--") || strings.Contains(strings.ReplaceAll(line, "<", ""), "--") {
				parts := strings.Split(line, "<--")
				if len(parts) == 1 {
					parts = strings.Split(line, "--")
				}
				if len(parts) == 2 {
					source := strings.TrimSpace(parts[0])
					source = p.extractStateID(source)
					diagram.EndStates = append(diagram.EndStates, source)
					if _, exists := diagram.States[source]; !exists {
						diagram.States[source] = &mermaid.State{
							ID:    source,
							Label: source,
						}
					}
					diagram.Transitions = append(diagram.Transitions, &mermaid.Transition{
						From: source,
						To:   "[*]",
					})
				}
			}
		} else if strings.Contains(line, "-->") {
			transition, err := p.parseStateTransition(line)
			if err == nil {
				if _, exists := diagram.States[transition.From]; !exists {
					diagram.States[transition.From] = &mermaid.State{
						ID:    transition.From,
						Label: transition.From,
					}
				}
				if _, exists := diagram.States[transition.To]; !exists {
					diagram.States[transition.To] = &mermaid.State{
						ID:    transition.To,
						Label: transition.To,
					}
				}
				diagram.Transitions = append(diagram.Transitions, transition)
			}
		} else if strings.Contains(line, ":") && !strings.Contains(line, "-->") {
			state := p.parseStateDefinition(line)
			if state != nil {
				diagram.States[state.ID] = state
			}
		}
	}

	return diagram, nil
}

func (p *Parser) extractStateID(line string) string {
	re := regexp.MustCompile(`^([a-zA-Z0-9_]+)`)
	match := re.FindStringSubmatch(line)
	if len(match) > 1 {
		return match[1]
	}
	return line
}

func (p *Parser) parseStateDefinition(line string) *mermaid.State {
	state := &mermaid.State{}

	re := regexp.MustCompile(`^([a-zA-Z0-9_]+)\s*:\s*(.+)$`)
	match := re.FindStringSubmatch(line)

	if len(match) > 0 {
		state.ID = match[1]
		state.Label = strings.TrimSpace(match[2])
		return state
	}

	return nil
}

func (p *Parser) parseStateTransition(line string) (*mermaid.Transition, error) {
	transition := &mermaid.Transition{}

	re := regexp.MustCompile(`^([a-zA-Z0-9_]+)\s*-->\s*([a-zA-Z0-9_]+)(?:\s*:\s*(.+))?$`)
	match := re.FindStringSubmatch(line)

	if len(match) > 0 {
		transition.From = match[1]
		transition.To = match[2]
		if len(match) > 3 {
			transition.Label = strings.TrimSpace(match[3])
		}
		return transition, nil
	}

	return nil, fmt.Errorf("无法解析状态转换: %s", line)
}
