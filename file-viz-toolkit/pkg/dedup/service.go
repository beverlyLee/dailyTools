package dedup

import (
	"fmt"
	"os"
)

type DedupService struct {
	scanner        *Scanner
	hasher         *Hasher
	hardLinkDet    *HardLinkDetector
	emptyDirCleaner *EmptyDirCleaner
	ui             *InteractiveUI
}

func NewDedupService(config *ScannerConfig) *DedupService {
	return &DedupService{
		scanner:        NewScanner(config),
		hasher:         NewHasher(),
		hardLinkDet:    NewHardLinkDetector(),
		emptyDirCleaner: NewEmptyDirCleaner(),
		ui:             NewInteractiveUI(),
	}
}

func (s *DedupService) FindDuplicates(rootPath string) ([]*DuplicateGroup, error) {
	fmt.Println("正在扫描文件...")
	files, err := s.scanner.Scan(rootPath)
	if err != nil {
		return nil, err
	}
	fmt.Printf("扫描完成，共发现 %d 个文件\n", len(files))

	fmt.Println("正在按大小分组...")
	sizeGroups := s.scanner.GroupBySize(files)
	fmt.Printf("发现 %d 个大小相同的文件组\n", len(sizeGroups))

	var allFiles []*FileInfo
	for _, files := range sizeGroups {
		allFiles = append(allFiles, files...)
	}

	if len(allFiles) == 0 {
		fmt.Println("未发现重复文件")
		return nil, nil
	}

	fmt.Println("正在计算文件哈希...")
	err = s.hasher.CalculateHashesForFiles(allFiles)
	if err != nil {
		return nil, err
	}

	fmt.Println("正在按哈希分组...")
	hashGroups := s.hasher.GroupByHash(allFiles)

	var duplicateGroups []*DuplicateGroup
	for hash, files := range hashGroups {
		if len(files) > 0 {
			group := &DuplicateGroup{
				Size:     files[0].Size,
				Hash:     hash,
				Files:    files,
				InodeMap: make(map[uint64][]*FileInfo),
			}

			if s.scanner.config.CheckHardLinks {
				for _, file := range files {
					group.InodeMap[file.Inode] = append(group.InodeMap[file.Inode], file)
				}
			}

			duplicateGroups = append(duplicateGroups, group)
		}
	}

	fmt.Printf("发现 %d 个重复文件组\n", len(duplicateGroups))

	return duplicateGroups, nil
}

func (s *DedupService) ProcessDuplicates(groups []*DuplicateGroup, autoMode bool) (int, error) {
	if len(groups) == 0 {
		return 0, nil
	}

	s.ui.PrintDuplicateGroups(groups)

	if !autoMode {
		var err error
		autoMode, err = s.ui.AskForAutoMode()
		if err != nil {
			return 0, err
		}
	}

	deletedCount := 0

	for i, group := range groups {
		var keepIndex int

		if autoMode {
			keepIndex = 1
			fmt.Printf("\n【自动模式】组 %d: 保留第一个文件，删除其他重复文件\n", i+1)
		} else {
			var err error
			keepIndex, err = s.ui.AskForSelection(group, i)
			if err != nil {
				return deletedCount, err
			}

			if keepIndex == 0 {
				fmt.Printf("跳过组 %d\n", i+1)
				continue
			}
		}

		for j, file := range group.Files {
			if j != keepIndex-1 {
				confirm := true
				if !autoMode {
					var err error
					confirm, err = s.ui.AskForDeletionConfirmation(file.Path)
					if err != nil {
						return deletedCount, err
					}
				}

				if confirm {
					err := os.Remove(file.Path)
					if err != nil {
						fmt.Printf("删除失败: %s, 错误: %v\n", file.Path, err)
						continue
					}
					fmt.Printf("已删除: %s\n", file.Path)
					deletedCount++
				}
			}
		}
	}

	return deletedCount, nil
}

func (s *DedupService) CleanEmptyDirs(rootPath string) (int, error) {
	fmt.Println("\n正在查找空文件夹...")
	emptyDirs, err := s.emptyDirCleaner.FindEmptyDirs(rootPath)
	if err != nil {
		return 0, err
	}

	if len(emptyDirs) == 0 {
		fmt.Println("未发现空文件夹")
		return 0, nil
	}

	dirsToDelete, err := s.ui.AskForEmptyDirDeletion(emptyDirs)
	if err != nil {
		return 0, err
	}

	if len(dirsToDelete) == 0 {
		fmt.Println("跳过空文件夹删除")
		return 0, nil
	}

	deletedCount := 0
	for _, dir := range dirsToDelete {
		err := s.emptyDirCleaner.DeleteEmptyDir(dir)
		if err != nil {
			fmt.Printf("删除失败: %s, 错误: %v\n", dir.Path, err)
			continue
		}
		fmt.Printf("已删除: %s\n", dir.Path)
		deletedCount++
	}

	return deletedCount, nil
}
