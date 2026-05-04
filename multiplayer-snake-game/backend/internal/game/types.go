package game

type Direction string

const (
	Up    Direction = "up"
	Down  Direction = "down"
	Left  Direction = "left"
	Right Direction = "right"
)

type Point struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type Snake struct {
	ID        string    `json:"id"`
	Body      []Point   `json:"body"`
	Direction Direction `json:"direction"`
	Alive     bool      `json:"alive"`
	Score     int       `json:"score"`
	Color     string    `json:"color"`
	Name      string    `json:"name"`
}

type Food struct {
	Point Point `json:"point"`
	Value int   `json:"value"`
}

type GameState struct {
	Width     int             `json:"width"`
	Height    int             `json:"height"`
	Snakes    map[string]*Snake `json:"snakes"`
	Foods     []Food          `json:"foods"`
	GameOver  bool            `json:"gameOver"`
	Winner    string          `json:"winner,omitempty"`
}

func NewGameState(width, height int) *GameState {
	return &GameState{
		Width:    width,
		Height:   height,
		Snakes:   make(map[string]*Snake),
		Foods:    make([]Food, 0),
		GameOver: false,
	}
}

func NewSnake(id, name, color string, startX, startY int, initialLength int) *Snake {
	body := make([]Point, initialLength)
	for i := 0; i < initialLength; i++ {
		body[i] = Point{X: startX - i, Y: startY}
	}

	return &Snake{
		ID:        id,
		Body:      body,
		Direction: Right,
		Alive:     true,
		Score:     0,
		Color:     color,
		Name:      name,
	}
}
