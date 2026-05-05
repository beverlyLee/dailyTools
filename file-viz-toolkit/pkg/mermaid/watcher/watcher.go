package watcher

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/fsnotify/fsnotify"
)

type FileWatcher struct {
	watcher       *fsnotify.Watcher
	callback      func(string)
	watchPath     string
	isRunning     bool
	debounceDelay time.Duration
	lastEvent     time.Time
}

type WatcherConfig struct {
	DebounceDelay time.Duration
}

func NewFileWatcher(config *WatcherConfig) (*FileWatcher, error) {
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	if config == nil {
		config = &WatcherConfig{
			DebounceDelay: 500 * time.Millisecond,
		}
	}

	return &FileWatcher{
		watcher:       w,
		debounceDelay: config.DebounceDelay,
		lastEvent:     time.Now().Add(-1 * time.Second),
	}, nil
}

func (fw *FileWatcher) Watch(path string, callback func(string)) error {
	fw.watchPath = path
	fw.callback = callback

	absPath, err := filepath.Abs(path)
	if err != nil {
		return err
	}

	info, err := os.Stat(absPath)
	if err != nil {
		return err
	}

	if info.IsDir() {
		err = fw.watcher.Add(absPath)
		if err != nil {
			return err
		}

		filepath.Walk(absPath, func(subPath string, subInfo os.FileInfo, walkErr error) error {
			if walkErr != nil {
				return walkErr
			}
			if subInfo.IsDir() {
				fw.watcher.Add(subPath)
			}
			return nil
		})
	} else {
		err = fw.watcher.Add(absPath)
		if err != nil {
			return err
		}
	}

	fw.isRunning = true
	go fw.run()

	fmt.Printf("正在监听: %s\n", absPath)
	fmt.Println("按 Ctrl+C 停止监听...")

	return nil
}

func (fw *FileWatcher) run() {
	for {
		select {
		case event, ok := <-fw.watcher.Events:
			if !ok {
				return
			}

			if event.Op&fsnotify.Write == fsnotify.Write ||
				event.Op&fsnotify.Create == fsnotify.Create {
				now := time.Now()
				if now.Sub(fw.lastEvent) > fw.debounceDelay {
					fw.lastEvent = now
					if fw.callback != nil {
						fw.callback(event.Name)
					}
				}
			}

			if event.Op&fsnotify.Remove == fsnotify.Remove {
				info, err := os.Stat(event.Name)
				if err == nil && info.IsDir() {
					fw.watcher.Add(event.Name)
				}
			}

		case err, ok := <-fw.watcher.Errors:
			if !ok {
				return
			}
			fmt.Printf("监听错误: %v\n", err)
		}
	}
}

func (fw *FileWatcher) Stop() error {
	fw.isRunning = false
	return fw.watcher.Close()
}

func (fw *FileWatcher) IsRunning() bool {
	return fw.isRunning
}

func ReadFileContent(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func IsMermaidFile(path string) bool {
	ext := filepath.Ext(path)
	return ext == ".mmd" || ext == ".mermaid" || ext == ".md"
}
