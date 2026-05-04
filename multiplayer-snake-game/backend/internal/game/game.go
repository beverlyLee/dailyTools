package game

import (
	"math/rand"
	"time"
)

type Game struct {
	State         *GameState
	rand          *rand.Rand
	occupiedCells map[string]bool
}

func NewGame(width, height int) *Game {
	return &Game{
		State:         NewGameState(width, height),
		rand:          rand.New(rand.NewSource(time.Now().UnixNano())),
		occupiedCells: make(map[string]bool),
	}
}

func (g *Game) AddSnake(snake *Snake) {
	g.State.Snakes[snake.ID] = snake
	g.updateOccupiedCells()
}

func (g *Game) RemoveSnake(snakeID string) {
	delete(g.State.Snakes, snakeID)
	g.updateOccupiedCells()
}

func (g *Game) updateOccupiedCells() {
	g.occupiedCells = make(map[string]bool)
	for _, snake := range g.State.Snakes {
		if snake.Alive {
			for _, p := range snake.Body {
				g.occupiedCells[pointToKey(p)] = true
			}
		}
	}
}

func (g *Game) GenerateFood(numFoods int) {
	for i := 0; i < numFoods; i++ {
		if len(g.State.Foods) >= 5 {
			break
		}

		var foodPos Point
		attempts := 0
		maxAttempts := 100

		for attempts < maxAttempts {
			foodPos = Point{
				X: g.rand.Intn(g.State.Width),
				Y: g.rand.Intn(g.State.Height),
			}

			key := pointToKey(foodPos)
			if !g.occupiedCells[key] && !g.isFoodAt(foodPos) {
				break
			}
			attempts++
		}

		if attempts < maxAttempts {
			food := Food{
				Point: foodPos,
				Value: 10,
			}
			g.State.Foods = append(g.State.Foods, food)
			g.occupiedCells[pointToKey(foodPos)] = true
		}
	}
}

func (g *Game) isFoodAt(p Point) bool {
	for _, food := range g.State.Foods {
		if food.Point.X == p.X && food.Point.Y == p.Y {
			return true
		}
	}
	return false
}

func (g *Game) MoveSnakes() {
	for _, snake := range g.State.Snakes {
		if !snake.Alive {
			continue
		}

		head := snake.Body[0]
		newHead := g.calculateNextHead(head, snake.Direction)

		if g.CheckCollision(newHead, snake.ID) {
			snake.Alive = false
			continue
		}

		snake.Body = append([]Point{newHead}, snake.Body...)

		foodEaten := false
		for i, food := range g.State.Foods {
			if food.Point.X == newHead.X && food.Point.Y == newHead.Y {
				foodEaten = true
				snake.Score += food.Value
				g.State.Foods = append(g.State.Foods[:i], g.State.Foods[i+1:]...)
				break
			}
		}

		if !foodEaten {
			tail := snake.Body[len(snake.Body)-1]
			snake.Body = snake.Body[:len(snake.Body)-1]
			delete(g.occupiedCells, pointToKey(tail))
		}

		g.occupiedCells[pointToKey(newHead)] = true
	}
}

func (g *Game) calculateNextHead(head Point, dir Direction) Point {
	newHead := head
	switch dir {
	case Up:
		newHead.Y--
	case Down:
		newHead.Y++
	case Left:
		newHead.X--
	case Right:
		newHead.X++
	}
	return newHead
}

func (g *Game) CheckCollision(p Point, excludeSnakeID string) bool {
	if p.X < 0 || p.X >= g.State.Width || p.Y < 0 || p.Y >= g.State.Height {
		return true
	}

	for _, snake := range g.State.Snakes {
		if !snake.Alive {
			continue
		}

		bodyToCheck := snake.Body
		if snake.ID == excludeSnakeID {
			bodyToCheck = snake.Body[:len(snake.Body)-1]
		}

		for _, bodyPoint := range bodyToCheck {
			if bodyPoint.X == p.X && bodyPoint.Y == p.Y {
				return true
			}
		}
	}

	return false
}

func (g *Game) ChangeDirection(snakeID string, newDir Direction) {
	snake, exists := g.State.Snakes[snakeID]
	if !exists || !snake.Alive {
		return
	}

	if !isOppositeDirection(snake.Direction, newDir) {
		snake.Direction = newDir
	}
}

func isOppositeDirection(current, newDir Direction) bool {
	return (current == Up && newDir == Down) ||
		(current == Down && newDir == Up) ||
		(current == Left && newDir == Right) ||
		(current == Right && newDir == Left)
}

func (g *Game) CheckGameOver() {
	aliveSnakes := 0
	var lastAliveSnake *Snake

	for _, snake := range g.State.Snakes {
		if snake.Alive {
			aliveSnakes++
			lastAliveSnake = snake
		}
	}

	if aliveSnakes <= 1 && len(g.State.Snakes) > 1 {
		g.State.GameOver = true
		if lastAliveSnake != nil {
			g.State.Winner = lastAliveSnake.Name
		}
	}
}

func pointToKey(p Point) string {
	return string(rune(p.X)) + "," + string(rune(p.Y))
}
