package layout

import (
	"file-viz-toolkit/pkg/mermaid"
)

type LayoutNode struct {
	Node       *mermaid.Node
	Row        int
	Col        int
	Width      int
	Height     int
	PosX       int
	PosY       int
	LabelLines []string
}

type LayoutEdge struct {
	Edge       *mermaid.Edge
	FromNode   *LayoutNode
	ToNode     *LayoutNode
	Label      string
	LabelLines []string
	PathPoints []Point
}

type Point struct {
	X int
	Y int
}

type LayoutFlowchart struct {
	Flowchart *mermaid.Flowchart
	Nodes     map[string]*LayoutNode
	Edges     []*LayoutEdge
	MaxRow    int
	MaxCol    int
	TotalRows int
	TotalCols int
	ColWidths map[int]int
	RowHeights map[int]int
}

type LayoutSequence struct {
	Diagram     *mermaid.SequenceDiagram
	Participants map[string]*LayoutParticipant
	Messages     []*LayoutMessage
	MaxWidth    int
	TotalHeight int
}

type LayoutParticipant struct {
	Participant *mermaid.Participant
	Col         int
	Width       int
	PosX        int
}

type LayoutMessage struct {
	Message     *mermaid.Message
	FromIdx     int
	ToIdx       int
	Row         int
	ContentLines []string
	Height      int
}

type LayoutState struct {
	Diagram    *mermaid.StateDiagram
	States     map[string]*LayoutNode
	Transitions []*LayoutEdge
	MaxRow     int
	MaxCol     int
	ColWidths  map[int]int
	RowHeights map[int]int
}
