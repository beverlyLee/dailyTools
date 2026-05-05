package sfu

import (
	"sync"

	"live-edu-interaction/backend/internal/room"

	"github.com/pion/webrtc/v3"
	"github.com/sirupsen/logrus"
)

type Server struct {
	logger      *logrus.Logger
	roomManager *room.Manager
	peerConns   map[string]*webrtc.PeerConnection
	tracks      map[string]*webrtc.TrackLocalStaticRTP
	mu          sync.RWMutex
}

func NewServer(logger *logrus.Logger, roomManager *room.Manager) *Server {
	return &Server{
		logger:      logger,
		roomManager: roomManager,
		peerConns:   make(map[string]*webrtc.PeerConnection),
		tracks:      make(map[string]*webrtc.TrackLocalStaticRTP),
	}
}

func (s *Server) CreatePeerConnection(userID string, config webrtc.Configuration) (*webrtc.PeerConnection, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	pc, err := webrtc.NewPeerConnection(config)
	if err != nil {
		s.logger.Errorf("Failed to create PeerConnection: %v", err)
		return nil, err
	}

	pc.OnTrack(func(track *webrtc.TrackRemote, receiver *webrtc.RTPReceiver) {
		s.handleTrack(userID, track)
	})

	pc.OnConnectionStateChange(func(state webrtc.PeerConnectionState) {
		s.logger.Infof("PeerConnection state changed for %s: %s", userID, state)
		if state == webrtc.PeerConnectionStateClosed || state == webrtc.PeerConnectionStateFailed {
			s.cleanupPeerConnection(userID)
		}
	})

	s.peerConns[userID] = pc

	s.logger.Infof("PeerConnection created for user: %s", userID)
	return pc, nil
}

func (s *Server) handleTrack(userID string, track *webrtc.TrackRemote) {
	s.logger.Infof("Received track from user %s: %s - %s", userID, track.Codec().MimeType, track.ID())

	localTrack, err := webrtc.NewTrackLocalStaticRTP(
		track.Codec().RTPCodecCapability,
		track.ID(),
		track.StreamID(),
	)
	if err != nil {
		s.logger.Errorf("Failed to create local track: %v", err)
		return
	}

	s.mu.Lock()
	s.tracks[userID+"_"+track.ID()] = localTrack
	s.mu.Unlock()

	go func() {
		buf := make([]byte, 1500)
		for {
			i, _, err := track.Read(buf)
			if err != nil {
				s.logger.Errorf("Failed to read track: %v", err)
				return
			}

			if _, err := localTrack.Write(buf[:i]); err != nil {
				s.logger.Errorf("Failed to write track: %v", err)
				return
			}
		}
	}()

	s.broadcastTrackToRoom(userID, localTrack)
}

func (s *Server) broadcastTrackToRoom(excludeUserID string, track *webrtc.TrackLocalStaticRTP) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, exists := s.roomManager.GetUser(excludeUserID)
	if !exists {
		return
	}

	room, roomExists := s.roomManager.GetRoom(user.RoomID)
	if !roomExists {
		return
	}

	for studentID := range room.Students {
		if studentID == excludeUserID {
			continue
		}

		pc, exists := s.peerConns[studentID]
		if exists {
			_, err := pc.AddTrack(track)
			if err != nil {
				s.logger.Warnf("Failed to add track to peer %s: %v", studentID, err)
			}
		}
	}

	if room.Teacher != nil && room.Teacher.ID != excludeUserID {
		pc, exists := s.peerConns[room.Teacher.ID]
		if exists {
			_, err := pc.AddTrack(track)
			if err != nil {
				s.logger.Warnf("Failed to add track to teacher: %v", err)
			}
		}
	}
}

func (s *Server) cleanupPeerConnection(userID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	pc, exists := s.peerConns[userID]
	if exists {
		pc.Close()
		delete(s.peerConns, userID)
	}

	for key := range s.tracks {
		if len(key) > len(userID) && key[:len(userID)] == userID {
			delete(s.tracks, key)
		}
	}

	s.logger.Infof("Cleaned up PeerConnection for user: %s", userID)
}

func (s *Server) GetPeerConnection(userID string) (*webrtc.PeerConnection, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	pc, exists := s.peerConns[userID]
	return pc, exists
}
