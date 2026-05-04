package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"multiplayer-snake-game/internal/websocket"
)

func findFrontendDir() string {
	envDir := os.Getenv("FRONTEND_DIR")
	if envDir != "" {
		if info, err := os.Stat(envDir); err == nil && info.IsDir() {
			return envDir
		}
	}

	execPath, err := os.Executable()
	if err == nil {
		execDir := filepath.Dir(execPath)

		tryPaths := []string{
			filepath.Join(execDir, "frontend"),
			filepath.Join(execDir, "..", "frontend"),
			filepath.Join(execDir, "..", "..", "frontend"),
			filepath.Join(execDir, "..", "..", "..", "frontend"),
		}

		for _, path := range tryPaths {
			if absPath, err := filepath.Abs(path); err == nil {
				if info, err := os.Stat(absPath); err == nil && info.IsDir() {
					indexFile := filepath.Join(absPath, "index.html")
					if _, err := os.Stat(indexFile); err == nil {
						log.Printf("Found frontend directory: %s", absPath)
						return absPath
					}
				}
			}
		}
	}

	cwd, err := os.Getwd()
	if err == nil {
		tryPaths := []string{
			filepath.Join(cwd, "frontend"),
			filepath.Join(cwd, "..", "frontend"),
			filepath.Join(cwd, "..", "..", "frontend"),
		}

		for _, path := range tryPaths {
			if absPath, err := filepath.Abs(path); err == nil {
				if info, err := os.Stat(absPath); err == nil && info.IsDir() {
					indexFile := filepath.Join(absPath, "index.html")
					if _, err := os.Stat(indexFile); err == nil {
						log.Printf("Found frontend directory (from cwd): %s", absPath)
						return absPath
					}
				}
			}
		}
	}

	return "frontend"
}

func main() {
	server := websocket.NewServer()
	websocket.SetServerInstance(server)

	go server.Run()

	http.HandleFunc("/ws", server.ServeWS)

	frontendDir := findFrontendDir()
	log.Printf("Serving frontend from: %s", frontendDir)

	fs := http.FileServer(http.Dir(frontendDir))
	http.Handle("/", fs)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
