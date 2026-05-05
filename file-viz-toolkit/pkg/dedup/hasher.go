package dedup

import (
	"crypto/sha256"
	"fmt"
	"io"
	"os"
)

type Hasher struct{}

func NewHasher() *Hasher {
	return &Hasher{}
}

func (h *Hasher) CalculateHash(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}

	return fmt.Sprintf("%x", hash.Sum(nil)), nil
}

func (h *Hasher) CalculateHashesForFiles(files []*FileInfo) error {
	for _, file := range files {
		hash, err := h.CalculateHash(file.Path)
		if err != nil {
			return err
		}
		file.Hash = hash
	}
	return nil
}

func (h *Hasher) GroupByHash(files []*FileInfo) map[string][]*FileInfo {
	hashMap := make(map[string][]*FileInfo)
	for _, file := range files {
		if file.Hash != "" {
			hashMap[file.Hash] = append(hashMap[file.Hash], file)
		}
	}

	result := make(map[string][]*FileInfo)
	for hash, fileList := range hashMap {
		if len(fileList) > 1 {
			result[hash] = fileList
		}
	}

	return result
}
