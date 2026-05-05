package dedup

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

type InteractiveUI struct {
	scanner *bufio.Scanner
}

func NewInteractiveUI() *InteractiveUI {
	return &InteractiveUI{
		scanner: bufio.NewScanner(os.Stdin),
	}
}

func (ui *InteractiveUI) PrintDuplicateGroups(groups []*DuplicateGroup) {
	fmt.Println("========================================")
	fmt.Println("发现重复文件组:")
	fmt.Println("========================================")

	for i, group := range groups {
		fmt.Printf("\n【组 %d】大小: %d bytes, Hash: %s\n", i+1, group.Size, group.Hash)
		fmt.Println("----------------------------------------")

		for j, file := range group.Files {
			hardLinkMarker := ""
			if len(group.InodeMap) > 1 {
				for inode, files := range group.InodeMap {
					for _, f := range files {
						if f.Path == file.Path {
							hardLinkMarker = fmt.Sprintf(" [硬链接组: %d]", inode)
							break
						}
					}
				}
			}
			fmt.Printf("  %d. %s%s\n", j+1, file.Path, hardLinkMarker)
		}
	}

	fmt.Println("\n========================================")
}

func (ui *InteractiveUI) AskForSelection(group *DuplicateGroup, groupIndex int) (int, error) {
	fmt.Printf("\n【组 %d】请选择要保留的文件编号 (输入 0 跳过此组): ", groupIndex+1)

	for {
		ui.scanner.Scan()
		input := ui.scanner.Text()
		input = strings.TrimSpace(input)

		if input == "0" {
			return 0, nil
		}

		selection, err := strconv.Atoi(input)
		if err != nil || selection < 1 || selection > len(group.Files) {
			fmt.Printf("无效输入，请输入 0 到 %d 之间的数字: ", len(group.Files))
			continue
		}

		return selection, nil
	}
}

func (ui *InteractiveUI) AskForDeletionConfirmation(fileToDelete string) (bool, error) {
	fmt.Printf("确认删除: %s? (y/n): ", fileToDelete)

	for {
		ui.scanner.Scan()
		input := ui.scanner.Text()
		input = strings.TrimSpace(strings.ToLower(input))

		if input == "y" || input == "yes" {
			return true, nil
		} else if input == "n" || input == "no" {
			return false, nil
		} else {
			fmt.Print("请输入 y 或 n: ")
		}
	}
}

func (ui *InteractiveUI) AskForEmptyDirDeletion(dirs []*EmptyDirInfo) ([]*EmptyDirInfo, error) {
	if len(dirs) == 0 {
		return nil, nil
	}

	fmt.Println("\n========================================")
	fmt.Println("发现空文件夹:")
	fmt.Println("========================================")

	for i, dir := range dirs {
		fmt.Printf("  %d. %s\n", i+1, dir.Path)
	}

	fmt.Printf("\n是否删除这些空文件夹? (输入 'all' 删除全部, 'none' 跳过, 或输入要删除的编号用逗号分隔): ")

	for {
		ui.scanner.Scan()
		input := ui.scanner.Text()
		input = strings.TrimSpace(strings.ToLower(input))

		if input == "all" {
			return dirs, nil
		} else if input == "none" || input == "" {
			return nil, nil
		} else {
			parts := strings.Split(input, ",")
			var selectedDirs []*EmptyDirInfo

			for _, part := range parts {
				part = strings.TrimSpace(part)
				index, err := strconv.Atoi(part)
				if err != nil || index < 1 || index > len(dirs) {
					fmt.Printf("无效输入 '%s', 请重新输入: ", part)
					continue
				}
				selectedDirs = append(selectedDirs, dirs[index-1])
			}

			return selectedDirs, nil
		}
	}
}

func (ui *InteractiveUI) PrintSummary(totalGroups int, deletedFiles int, deletedDirs int) {
	fmt.Println("\n========================================")
	fmt.Println("操作完成总结:")
	fmt.Printf("  处理的重复文件组: %d\n", totalGroups)
	fmt.Printf("  删除的文件数量: %d\n", deletedFiles)
	fmt.Printf("  删除的空文件夹数量: %d\n", deletedDirs)
	fmt.Println("========================================")
}

func (ui *InteractiveUI) AskForAutoMode() (bool, error) {
	fmt.Print("是否启用自动模式 (自动保留第一个文件并删除其他重复文件)? (y/n): ")

	for {
		ui.scanner.Scan()
		input := ui.scanner.Text()
		input = strings.TrimSpace(strings.ToLower(input))

		if input == "y" || input == "yes" {
			return true, nil
		} else if input == "n" || input == "no" {
			return false, nil
		} else {
			fmt.Print("请输入 y 或 n: ")
		}
	}
}
