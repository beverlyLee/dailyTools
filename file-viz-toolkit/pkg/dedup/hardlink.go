package dedup

import (
	"os"
	"syscall"
)

type HardLinkDetector struct{}

func NewHardLinkDetector() *HardLinkDetector {
	return &HardLinkDetector{}
}

func (d *HardLinkDetector) GetInode(filePath string) (uint64, error) {
	info, err := os.Stat(filePath)
	if err != nil {
		return 0, err
	}

	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		return 0, nil
	}

	return stat.Ino, nil
}

func (d *HardLinkDetector) GroupByInode(files []*FileInfo) map[uint64][]*FileInfo {
	inodeMap := make(map[uint64][]*FileInfo)
	for _, file := range files {
		if file.Inode != 0 {
			inodeMap[file.Inode] = append(inodeMap[file.Inode], file)
		}
	}

	result := make(map[uint64][]*FileInfo)
	for inode, fileList := range inodeMap {
		if len(fileList) > 1 {
			result[inode] = fileList
		}
	}

	return result
}

func (d *HardLinkDetector) AreHardLinks(file1, file2 string) (bool, error) {
	inode1, err := d.GetInode(file1)
	if err != nil {
		return false, err
	}

	inode2, err := d.GetInode(file2)
	if err != nil {
		return false, err
	}

	return inode1 == inode2, nil
}

func (d *HardLinkDetector) DetectHardLinksInGroups(groups []*DuplicateGroup) {
	for _, group := range groups {
		group.InodeMap = make(map[uint64][]*FileInfo)
		for _, file := range group.Files {
			group.InodeMap[file.Inode] = append(group.InodeMap[file.Inode], file)
		}
	}
}
