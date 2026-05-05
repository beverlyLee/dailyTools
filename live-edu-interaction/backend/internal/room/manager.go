package room

import (
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

type User struct {
	ID        string
	Name      string
	Role      string
	Conn      interface{}
	RoomID    string
	JoinedAt  time.Time
	IsOnline  bool
	FocusScore int
}

type Room struct {
	ID          string
	Teacher     *User
	Students    map[string]*User
	BreakoutRooms map[string]*BreakoutRoom
	HandRaiseQueue []*HandRaiseRequest
	CreatedAt   time.Time
	mu          sync.RWMutex
}

type BreakoutRoom struct {
	ID        string
	Name      string
	RoomID    string
	Students  map[string]*User
	CreatedAt time.Time
}

type HandRaiseRequest struct {
	UserID    string
	UserName  string
	RaisedAt  time.Time
}

type Manager struct {
	rooms  map[string]*Room
	users  map[string]*User
	logger *logrus.Logger
	mu     sync.RWMutex
}

func NewManager(logger *logrus.Logger) *Manager {
	return &Manager{
		rooms:  make(map[string]*Room),
		users:  make(map[string]*User),
		logger: logger,
	}
}

func (m *Manager) CreateRoom(roomID string) *Room {
	m.mu.Lock()
	defer m.mu.Unlock()

	room := &Room{
		ID:             roomID,
		Students:       make(map[string]*User),
		BreakoutRooms:  make(map[string]*BreakoutRoom),
		HandRaiseQueue: make([]*HandRaiseRequest, 0),
		CreatedAt:      time.Now(),
	}
	m.rooms[roomID] = room

	m.logger.Infof("Room created: %s", roomID)
	return room
}

func (m *Manager) GetRoom(roomID string) (*Room, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	room, exists := m.rooms[roomID]
	return room, exists
}

func (m *Manager) AddUserToRoom(roomID string, user *User) (*Room, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	room, exists := m.rooms[roomID]
	if !exists {
		room = &Room{
			ID:             roomID,
			Students:       make(map[string]*User),
			BreakoutRooms:  make(map[string]*BreakoutRoom),
			HandRaiseQueue: make([]*HandRaiseRequest, 0),
			CreatedAt:      time.Now(),
		}
		m.rooms[roomID] = room
	}

	user.RoomID = roomID
	user.IsOnline = true
	user.JoinedAt = time.Now()
	user.FocusScore = 100

	m.users[user.ID] = user

	if user.Role == "teacher" {
		room.Teacher = user
		m.logger.Infof("Teacher %s joined room %s", user.Name, roomID)
	} else {
		room.Students[user.ID] = user
		m.logger.Infof("Student %s joined room %s", user.Name, roomID)
	}

	return room, nil
}

func (m *Manager) RemoveUser(userID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	user, exists := m.users[userID]
	if !exists {
		return
	}

	room, roomExists := m.rooms[user.RoomID]
	if roomExists {
		if room.Teacher != nil && room.Teacher.ID == userID {
			room.Teacher = nil
		} else {
			delete(room.Students, userID)
		}

		room.HandRaiseQueue = filterHandRaiseQueue(room.HandRaiseQueue, userID)
	}

	user.IsOnline = false
	delete(m.users, userID)

	m.logger.Infof("User %s left room %s", user.Name, user.RoomID)
}

func (m *Manager) GetUser(userID string) (*User, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	user, exists := m.users[userID]
	return user, exists
}

func (m *Manager) AddHandRaise(roomID, userID, userName string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	room, exists := m.rooms[roomID]
	if !exists {
		return
	}

	for _, req := range room.HandRaiseQueue {
		if req.UserID == userID {
			return
		}
	}

	room.HandRaiseQueue = append(room.HandRaiseQueue, &HandRaiseRequest{
		UserID:   userID,
		UserName: userName,
		RaisedAt: time.Now(),
	})

	m.logger.Infof("User %s raised hand in room %s", userName, roomID)
}

func (m *Manager) RemoveHandRaise(roomID, userID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	room, exists := m.rooms[roomID]
	if !exists {
		return
	}

	room.HandRaiseQueue = filterHandRaiseQueue(room.HandRaiseQueue, userID)
	m.logger.Infof("User %s lowered hand in room %s", userID, roomID)
}

func (m *Manager) CreateBreakoutRoom(roomID, breakoutID, name string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	room, exists := m.rooms[roomID]
	if !exists {
		return
	}

	breakoutRoom := &BreakoutRoom{
		ID:        breakoutID,
		Name:      name,
		RoomID:    roomID,
		Students:  make(map[string]*User),
		CreatedAt: time.Now(),
	}

	room.BreakoutRooms[breakoutID] = breakoutRoom
	m.logger.Infof("Breakout room %s created in room %s", name, roomID)
}

func (m *Manager) AssignStudentToBreakout(roomID, breakoutID, userID string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()

	room, exists := m.rooms[roomID]
	if !exists {
		return false
	}

	breakoutRoom, breakoutExists := room.BreakoutRooms[breakoutID]
	if !breakoutExists {
		return false
	}

	student, studentExists := room.Students[userID]
	if !studentExists {
		return false
	}

	breakoutRoom.Students[userID] = student
	m.logger.Infof("Student %s assigned to breakout room %s", userID, breakoutID)
	return true
}

func (m *Manager) CloseBreakoutRoom(roomID, breakoutID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	room, exists := m.rooms[roomID]
	if !exists {
		return
	}

	delete(room.BreakoutRooms, breakoutID)
	m.logger.Infof("Breakout room %s closed in room %s", breakoutID, roomID)
}

func (m *Manager) UpdateFocusScore(userID string, score int) {
	m.mu.Lock()
	defer m.mu.Unlock()

	user, exists := m.users[userID]
	if exists {
		user.FocusScore = score
	}
}

func filterHandRaiseQueue(queue []*HandRaiseRequest, userID string) []*HandRaiseRequest {
	result := make([]*HandRaiseRequest, 0)
	for _, req := range queue {
		if req.UserID != userID {
			result = append(result, req)
		}
	}
	return result
}
