package game

import (
	"testing"
)

func TestNewSnake(t *testing.T) {
	snake := NewSnake("test-id", "TestPlayer", "#ff0000", 5, 5, 3)

	if snake.ID != "test-id" {
		t.Errorf("Expected snake ID to be 'test-id', got '%s'", snake.ID)
	}

	if snake.Name != "TestPlayer" {
		t.Errorf("Expected snake name to be 'TestPlayer', got '%s'", snake.Name)
	}

	if snake.Color != "#ff0000" {
		t.Errorf("Expected snake color to be '#ff0000', got '%s'", snake.Color)
	}

	if len(snake.Body) != 3 {
		t.Errorf("Expected snake body length to be 3, got %d", len(snake.Body))
	}

	if snake.Body[0].X != 5 || snake.Body[0].Y != 5 {
		t.Errorf("Expected snake head at (5,5), got (%d,%d)", snake.Body[0].X, snake.Body[0].Y)
	}

	if snake.Direction != Right {
		t.Errorf("Expected initial direction to be Right, got %s", snake.Direction)
	}

	if !snake.Alive {
		t.Error("Expected snake to be alive initially")
	}
}

func TestNewGameState(t *testing.T) {
	gs := NewGameState(20, 15)

	if gs.Width != 20 {
		t.Errorf("Expected width 20, got %d", gs.Width)
	}

	if gs.Height != 15 {
		t.Errorf("Expected height 15, got %d", gs.Height)
	}

	if gs.Snakes == nil {
		t.Error("Expected Snakes map to be initialized")
	}

	if gs.Foods == nil {
		t.Error("Expected Foods slice to be initialized")
	}

	if gs.GameOver {
		t.Error("Expected GameOver to be false initially")
	}
}

func TestAddSnake(t *testing.T) {
	g := NewGame(20, 20)
	snake := NewSnake("snake1", "Player1", "#ff0000", 5, 5, 3)

	g.AddSnake(snake)

	if len(g.State.Snakes) != 1 {
		t.Errorf("Expected 1 snake in game, got %d", len(g.State.Snakes))
	}

	if _, exists := g.State.Snakes["snake1"]; !exists {
		t.Error("Expected snake1 to exist in game")
	}
}

func TestRemoveSnake(t *testing.T) {
	g := NewGame(20, 20)
	snake1 := NewSnake("snake1", "Player1", "#ff0000", 5, 5, 3)
	snake2 := NewSnake("snake2", "Player2", "#00ff00", 10, 10, 3)

	g.AddSnake(snake1)
	g.AddSnake(snake2)

	if len(g.State.Snakes) != 2 {
		t.Errorf("Expected 2 snakes, got %d", len(g.State.Snakes))
	}

	g.RemoveSnake("snake1")

	if len(g.State.Snakes) != 1 {
		t.Errorf("Expected 1 snake after removal, got %d", len(g.State.Snakes))
	}

	if _, exists := g.State.Snakes["snake1"]; exists {
		t.Error("Expected snake1 to be removed")
	}
}

func TestGenerateFood(t *testing.T) {
	g := NewGame(20, 20)

	g.GenerateFood(3)

	if len(g.State.Foods) != 3 {
		t.Errorf("Expected 3 foods, got %d", len(g.State.Foods))
	}

	for i, food := range g.State.Foods {
		if food.Point.X < 0 || food.Point.X >= 20 || food.Point.Y < 0 || food.Point.Y >= 20 {
			t.Errorf("Food %d is out of bounds: (%d,%d)", i, food.Point.X, food.Point.Y)
		}
	}

	g.GenerateFood(10)
	if len(g.State.Foods) > 5 {
		t.Errorf("Expected max 5 foods, got %d", len(g.State.Foods))
	}
}

func TestMoveSnakes(t *testing.T) {
	g := NewGame(20, 20)
	snake := NewSnake("snake1", "Player1", "#ff0000", 5, 5, 3)
	g.AddSnake(snake)

	originalHead := snake.Body[0]
	g.MoveSnakes()

	newHead := snake.Body[0]
	if newHead.X != originalHead.X+1 || newHead.Y != originalHead.Y {
		t.Errorf("Expected snake to move right from (%d,%d) to (%d,%d), but got (%d,%d)",
			originalHead.X, originalHead.Y, originalHead.X+1, originalHead.Y, newHead.X, newHead.Y)
	}

	if len(snake.Body) != 3 {
		t.Errorf("Expected snake length to remain 3, got %d", len(snake.Body))
	}
}

func TestMoveSnakeEatsFood(t *testing.T) {
	g := NewGame(20, 20)
	snake := NewSnake("snake1", "Player1", "#ff0000", 5, 5, 3)
	g.AddSnake(snake)

	g.State.Foods = append(g.State.Foods, Food{
		Point: Point{X: 6, Y: 5},
		Value: 10,
	})

	g.MoveSnakes()

	if len(snake.Body) != 4 {
		t.Errorf("Expected snake length to be 4 after eating food, got %d", len(snake.Body))
	}

	if snake.Score != 10 {
		t.Errorf("Expected snake score to be 10, got %d", snake.Score)
	}

	if len(g.State.Foods) != 0 {
		t.Errorf("Expected food to be eaten, but found %d foods", len(g.State.Foods))
	}
}

func TestCollisionWithWall(t *testing.T) {
	g := NewGame(10, 10)
	snake := NewSnake("snake1", "Player1", "#ff0000", 0, 5, 3)
	snake.Direction = Left
	g.AddSnake(snake)

	g.MoveSnakes()

	if snake.Alive {
		t.Error("Expected snake to die after hitting wall")
	}
}

func TestCollisionWithSelf(t *testing.T) {
	g := NewGame(10, 10)
	snake := NewSnake("snake1", "Player1", "#ff0000", 5, 5, 5)
	g.AddSnake(snake)

	g.ChangeDirection("snake1", Down)
	g.MoveSnakes()
	g.ChangeDirection("snake1", Left)
	g.MoveSnakes()
	g.ChangeDirection("snake1", Up)
	g.MoveSnakes()
	g.ChangeDirection("snake1", Right)
	g.MoveSnakes()

	if snake.Alive {
		t.Error("Expected snake to die after colliding with self")
	}
}

func TestCollisionWithOtherSnake(t *testing.T) {
	g := NewGame(10, 10)
	snake1 := NewSnake("snake1", "Player1", "#ff0000", 5, 5, 3)
	snake2 := NewSnake("snake2", "Player2", "#00ff00", 6, 5, 3)
	g.AddSnake(snake1)
	g.AddSnake(snake2)

	g.MoveSnakes()

	if snake1.Alive {
		t.Error("Expected snake1 to die after colliding with snake2")
	}
}

func TestChangeDirection(t *testing.T) {
	g := NewGame(10, 10)
	snake := NewSnake("snake1", "Player1", "#ff0000", 5, 5, 3)
	g.AddSnake(snake)

	if snake.Direction != Right {
		t.Errorf("Expected initial direction Right, got %s", snake.Direction)
	}

	g.ChangeDirection("snake1", Up)
	if snake.Direction != Up {
		t.Errorf("Expected direction Up, got %s", snake.Direction)
	}

	g.ChangeDirection("snake1", Down)
	if snake.Direction != Up {
		t.Error("Expected direction to remain Up (opposite of Down)")
	}

	g.ChangeDirection("snake1", Left)
	if snake.Direction != Left {
		t.Errorf("Expected direction Left, got %s", snake.Direction)
	}
}

func TestCheckGameOver(t *testing.T) {
	g := NewGame(10, 10)
	snake1 := NewSnake("snake1", "Player1", "#ff0000", 5, 5, 3)
	snake2 := NewSnake("snake2", "Player2", "#00ff00", 6, 5, 3)
	g.AddSnake(snake1)
	g.AddSnake(snake2)

	g.CheckGameOver()
	if g.State.GameOver {
		t.Error("Expected game not over when both snakes alive")
	}

	snake1.Alive = false
	g.CheckGameOver()

	if !g.State.GameOver {
		t.Error("Expected game over when only one snake alive")
	}

	if g.State.Winner != "Player2" {
		t.Errorf("Expected winner to be Player2, got %s", g.State.Winner)
	}
}

func TestMultipleSnakeGame(t *testing.T) {
	g := NewGame(20, 20)
	snake1 := NewSnake("snake1", "Alice", "#ff0000", 5, 5, 3)
	snake2 := NewSnake("snake2", "Bob", "#00ff00", 10, 10, 3)
	g.AddSnake(snake1)
	g.AddSnake(snake2)

	g.GenerateFood(3)
	initialFoodCount := len(g.State.Foods)

	for i := 0; i < 3; i++ {
		g.MoveSnakes()
	}

	if !snake1.Alive || !snake2.Alive {
		t.Error("Expected both snakes to be alive after 3 moves")
	}

	if snake1.Body[0].X == snake2.Body[0].X && snake1.Body[0].Y == snake2.Body[0].Y {
		t.Error("Snakes should not be at same position")
	}

	if len(g.State.Foods) < initialFoodCount-2 {
		t.Error("Food count should not decrease too much")
	}
}
