package mermaid

type DiagramType string

const (
	DiagramTypeFlowchart    DiagramType = "flowchart"
	DiagramTypeSequence     DiagramType = "sequenceDiagram"
	DiagramTypeState        DiagramType = "stateDiagram"
)

type Node struct {
	ID          string
	Label       string
	Shape       NodeShape
	IsStart     bool
	IsEnd       bool
	IsDecision  bool
	Metadata    map[string]string
}

type NodeShape string

const (
	ShapeRectangle     NodeShape = "rectangle"
	ShapeRounded       NodeShape = "rounded"
	ShapeStadium       NodeShape = "stadium"
	ShapeSubroutine    NodeShape = "subroutine"
	ShapeCylindrical   NodeShape = "cylindrical"
	ShapeCircle        NodeShape = "circle"
	ShapeAsymmetric    NodeShape = "asymmetric"
	ShapeRhombus       NodeShape = "rhombus"
	ShapeHexagon       NodeShape = "hexagon"
	ShapeParallelogram NodeShape = "parallelogram"
	ShapeParallelogramAlt NodeShape = "parallelogramAlt"
	ShapeDoubleCircle  NodeShape = "doubleCircle"
)

type Edge struct {
	From        string
	To          string
	Label       string
	Style       EdgeStyle
	ArrowType   ArrowType
	Metadata    map[string]string
}

type EdgeStyle string

const (
	StyleSolid    EdgeStyle = "solid"
	StyleDotted   EdgeStyle = "dotted"
	StyleThick    EdgeStyle = "thick"
)

type ArrowType string

const (
	ArrowNone      ArrowType = "none"
	ArrowOpen      ArrowType = "open"
	ArrowClosed    ArrowType = "closed"
	ArrowDotted    ArrowType = "dotted"
	ArrowDouble    ArrowType = "double"
)

type FlowchartDirection string

const (
	DirectionTB FlowchartDirection = "TB"
	DirectionTD FlowchartDirection = "TD"
	DirectionBT FlowchartDirection = "BT"
	DirectionLR FlowchartDirection = "LR"
	DirectionRL FlowchartDirection = "RL"
)

type Flowchart struct {
	Direction FlowchartDirection
	Nodes     map[string]*Node
	Edges     []*Edge
	Subgraphs []*Subgraph
}

type Subgraph struct {
	ID       string
	Label    string
	Nodes    []string
	Direction FlowchartDirection
}

type Participant struct {
	ID    string
	Name  string
	Alias string
	Type  ParticipantType
}

type ParticipantType string

const (
	ParticipantDefault ParticipantType = "default"
	ParticipantActor    ParticipantType = "actor"
)

type Message struct {
	From      string
	To        string
	Content   string
	Type      MessageType
	IsNote    bool
	NoteType  NoteType
	NoteTarget string
}

type MessageType string

const (
	MessageSolid        MessageType = "solid"
	MessageDotted       MessageType = "dotted"
	MessageSolidArrow   MessageType = "solidArrow"
	MessageDottedArrow  MessageType = "dottedArrow"
	MessageCross        MessageType = "cross"
)

type NoteType string

const (
	NoteLeft    NoteType = "left of"
	NoteRight   NoteType = "right of"
	NoteOver    NoteType = "over"
)

type Activation struct {
	Participant string
	IsActive    bool
}

type SequenceDiagram struct {
	Participants []*Participant
	Messages     []*Message
	Activations  []*Activation
}

type State struct {
	ID      string
	Label   string
	IsStart bool
	IsEnd   bool
	IsFork  bool
	IsJoin  bool
	IsChoice bool
}

type Transition struct {
	From   string
	To     string
	Label  string
}

type StateDiagram struct {
	States      map[string]*State
	Transitions []*Transition
	StartState  string
	EndStates   []string
}

type Diagram struct {
	Type            DiagramType
	Flowchart       *Flowchart
	SequenceDiagram *SequenceDiagram
	StateDiagram    *StateDiagram
	Raw             string
}
