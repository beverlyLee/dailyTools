package dedup

import (
	"os"
)

type FileInfo struct {
	Path    string
	Size    int64
	ModTime int64
	Mode    os.FileMode
	Hash    string
	Inode   uint64
}

type DuplicateGroup struct {
	Size     int64
	Hash     string
	Files    []*FileInfo
	InodeMap map[uint64][]*FileInfo
}

type ScannerConfig struct {
	MinSize           int64
	MaxSize           int64
	IncludeExtensions []string
	ExcludeDirs       []string
	CheckHardLinks    bool
}

type EmptyDirInfo struct {
	Path string
}
