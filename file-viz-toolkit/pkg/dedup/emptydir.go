package dedup

import (
	"os"
	"path/filepath"
)

type EmptyDirCleaner struct{}

func NewEmptyDirCleaner() *EmptyDirCleaner {
	return &EmptyDirCleaner{}
}

func (c *EmptyDirCleaner) FindEmptyDirs(rootPath string) ([]*EmptyDirInfo, error) {
	var emptyDirs []*EmptyDirInfo

	err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() {
			return nil
		}

		if path == rootPath {
			return nil
		}

		isEmpty, err := c.isDirEmpty(path)
		if err != nil {
			return err
		}

		if isEmpty {
			emptyDirs = append(emptyDirs, &EmptyDirInfo{Path: path})
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return emptyDirs, nil
}

func (c *EmptyDirCleaner) isDirEmpty(dirPath string) (bool, error) {
	f, err := os.Open(dirPath)
	if err != nil {
		return false, err
	}
	defer f.Close()

	entries, err := f.Readdir(-1)
	if err != nil {
		return false, err
	}

	return len(entries) == 0, nil
}

func (c *EmptyDirCleaner) DeleteEmptyDirs(dirs []*EmptyDirInfo) error {
	for i := len(dirs) - 1; i >= 0; i-- {
		err := os.Remove(dirs[i].Path)
		if err != nil {
			return err
		}
	}
	return nil
}

func (c *EmptyDirCleaner) DeleteEmptyDir(dir *EmptyDirInfo) error {
	return os.Remove(dir.Path)
}
