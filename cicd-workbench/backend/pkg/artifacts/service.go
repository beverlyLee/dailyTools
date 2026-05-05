package artifacts

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

type Artifact struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Size int64  `json:"size"`
	Type string `json:"type"`
	Path string `json:"path,omitempty"`
}

type Build struct {
	ID           string     `json:"id"`
	PipelineName string     `json:"pipelineName"`
	Branch       string     `json:"branch"`
	Tag          *string    `json:"tag"`
	Commit       string     `json:"commit"`
	Status       string     `json:"status"`
	StartTime    time.Time  `json:"startTime"`
	EndTime      *time.Time `json:"endTime,omitempty"`
	Duration     *int       `json:"duration,omitempty"`
	Artifacts    []Artifact `json:"artifacts"`
	Creator      string     `json:"creator"`
	LogPath      string     `json:"logPath,omitempty"`
}

type Service struct {
	builds map[string]*Build
}

func NewService() *Service {
	s := &Service{
		builds: make(map[string]*Build),
	}
	s.initMockData()
	return s
}

func (s *Service) initMockData() {
	tag1 := "v1.0.0"
	tag4 := "v1.1.0"
	duration1 := 185
	duration3 := 120
	duration4 := 300
	endTime1 := time.Now().Add(-time.Hour)
	endTime3 := time.Now().Add(-24 * time.Hour)
	endTime4 := time.Now().Add(-20 * time.Hour)

	s.builds["build-001"] = &Build{
		ID:           "build-001",
		PipelineName: "前端构建流水线",
		Branch:       "main",
		Tag:          &tag1,
		Commit:       "abc123def456",
		Status:       "success",
		StartTime:    time.Now().Add(-2 * time.Hour),
		EndTime:      &endTime1,
		Duration:     &duration1,
		Artifacts: []Artifact{
			{ID: "art-1", Name: "dist.zip", Size: 25600000, Type: "zip", Path: "/tmp/artifacts/build-001/dist.zip"},
			{ID: "art-2", Name: "build.log", Size: 102400, Type: "log", Path: "/tmp/artifacts/build-001/build.log"},
		},
		Creator: "张三",
		LogPath: "/tmp/logs/build-001.log",
	}

	s.builds["build-002"] = &Build{
		ID:           "build-002",
		PipelineName: "后端构建流水线",
		Branch:       "develop",
		Tag:          nil,
		Commit:       "def789ghi012",
		Status:       "running",
		StartTime:    time.Now().Add(-30 * time.Minute),
		EndTime:      nil,
		Duration:     nil,
		Artifacts:    []Artifact{},
		Creator:      "李四",
		LogPath:      "/tmp/logs/build-002.log",
	}

	s.builds["build-003"] = &Build{
		ID:           "build-003",
		PipelineName: "前端构建流水线",
		Branch:       "feature/login",
		Tag:          nil,
		Commit:       "ghi345jkl678",
		Status:       "failed",
		StartTime:    time.Now().Add(-26 * time.Hour),
		EndTime:      &endTime3,
		Duration:     &duration3,
		Artifacts: []Artifact{
			{ID: "art-3", Name: "error.log", Size: 51200, Type: "log", Path: "/tmp/artifacts/build-003/error.log"},
		},
		Creator: "王五",
		LogPath: "/tmp/logs/build-003.log",
	}

	s.builds["build-004"] = &Build{
		ID:           "build-004",
		PipelineName: "部署流水线",
		Branch:       "main",
		Tag:          &tag4,
		Commit:       "jkl901mno234",
		Status:       "success",
		StartTime:    time.Now().Add(-22 * time.Hour),
		EndTime:      &endTime4,
		Duration:     &duration4,
		Artifacts: []Artifact{
			{ID: "art-4", Name: "app.tar.gz", Size: 51200000, Type: "archive", Path: "/tmp/artifacts/build-004/app.tar.gz"},
			{ID: "art-5", Name: "deploy.log", Size: 204800, Type: "log", Path: "/tmp/artifacts/build-004/deploy.log"},
			{ID: "art-6", Name: "manifest.json", Size: 1024, Type: "json", Path: "/tmp/artifacts/build-004/manifest.json"},
		},
		Creator: "张三",
		LogPath: "/tmp/logs/build-004.log",
	}
}

func (s *Service) ListBuilds() ([]Build, error) {
	builds := make([]Build, 0, len(s.builds))
	for _, build := range s.builds {
		builds = append(builds, *build)
	}
	return builds, nil
}

func (s *Service) GetBuild(buildID string) (*Build, error) {
	build, exists := s.builds[buildID]
	if !exists {
		return nil, errors.New("build not found")
	}
	return build, nil
}

func (s *Service) GetBuildLogs(buildID string) (string, error) {
	_, exists := s.builds[buildID]
	if !exists {
		return "", errors.New("build not found")
	}

	return s.generateMockLogs(buildID), nil
}

func (s *Service) generateMockLogs(buildID string) string {
	build, exists := s.builds[buildID]
	if !exists {
		return ""
	}

	logs := `[INFO] ============================================
[INFO] CI/CD Workbench Build Log
[INFO] Build ID: ` + buildID + `
[INFO] Pipeline: ` + build.PipelineName + `
[INFO] Branch: ` + build.Branch + `
[INFO] Commit: ` + build.Commit + `
[INFO] Status: ` + build.Status + `
[INFO] ============================================

[INFO] Starting build process...
[INFO] Cloning repository from git...
[INFO] Repository cloned successfully

[STEP] Setting up environment
[INFO] Checking Node.js version...
[INFO] Node.js v18.17.0
[INFO] npm version 9.6.7

[STEP] Installing dependencies
[INFO] Running: npm ci
[INFO] Installing dependencies from package-lock.json...
[INFO] added 1250 packages in 45s
[INFO] Dependencies installed successfully

[STEP] Running lint check
[INFO] Running: npm run lint
[INFO] Checking code style...
[INFO] ✔ No ESLint warnings or errors
[INFO] Lint check passed

[STEP] Running tests
[INFO] Running: npm test
[INFO] Starting test runner...
[INFO] 
[INFO]  PASS  src/components/Button.test.js
[INFO]  PASS  src/pages/Home.test.js
[INFO]  PASS  src/utils/helpers.test.js
[INFO] 
[INFO] Test Suites: 3 passed, 3 total
[INFO] Tests:       15 passed, 15 total
[INFO] Time:        3.25s
[INFO] All tests passed!

[STEP] Building application
[INFO] Running: npm run build
[INFO] Creating an optimized production build...
[INFO] 
[INFO] Compiled successfully.
[INFO] 
[INFO] File sizes after gzip:
[INFO] 
[INFO]   42.56 KB  build/static/js/main.chunk.js
[INFO]   1.23 KB   build/static/css/main.chunk.css
[INFO]   789 B     build/static/js/runtime-main.js
[INFO] 
[INFO] The project was built assuming it is hosted at /.
[INFO] You can control this with the homepage field in your package.json.
[INFO] 
[INFO] Build folder is ready to be deployed.
[INFO] 
[INFO] Creating artifact archive...
[INFO] Archiving build folder...
[INFO] Archive created: dist.zip (25.6 MB)

[INFO] ============================================
`

	if build.Status == "success" {
		logs += `[SUCCESS] Build completed successfully!
[INFO] Total duration: ` + formatDuration(build.Duration) + `
[INFO] Artifacts generated:
[INFO]   - dist.zip (25.6 MB)
[INFO]   - build.log (100 KB)
[INFO] ============================================
`
	} else if build.Status == "failed" {
		logs += `[ERROR] Build failed!
[ERROR] Error during test execution:
[ERROR] 
[ERROR]   ● Test suite failed to run
[ERROR] 
[ERROR]     Cannot find module 'missing-module'
[ERROR]     
[ERROR]     Require stack:
[ERROR]     - src/utils/helpers.js
[ERROR]     - src/utils/helpers.test.js
[ERROR] 
[ERROR] Test Suites: 1 failed, 2 passed, 3 total
[ERROR] Tests:       0 failed, 10 passed, 10 total
[ERROR] 
[INFO] ============================================
[FAILURE] Build failed!
[INFO] Duration: ` + formatDuration(build.Duration) + `
[INFO] Error logs saved to: error.log
[INFO] ============================================
`
	} else if build.Status == "running" {
		logs += `[INFO] Build is still running...
[INFO] Current step: Building application
[INFO] Progress: 75%
[INFO] ============================================
`
	}

	return logs
}

func formatDuration(duration *int) string {
	if duration == nil {
		return "N/A"
	}
	mins := *duration / 60
	secs := *duration % 60
	return string(rune(mins)) + "分" + string(rune(secs)) + "秒"
}

func (s *Service) DeleteBuild(buildID string) error {
	_, exists := s.builds[buildID]
	if !exists {
		return errors.New("build not found")
	}
	delete(s.builds, buildID)
	return nil
}

func (s *Service) DownloadArtifact(buildID, artifactID string) ([]byte, error) {
	build, exists := s.builds[buildID]
	if !exists {
		return nil, errors.New("build not found")
	}

	for _, artifact := range build.Artifacts {
		if artifact.ID == artifactID {
			return []byte("Mock artifact content for: " + artifact.Name), nil
		}
	}

	return nil, errors.New("artifact not found")
}

func (s *Service) CreateBuild(build *Build) (*Build, error) {
	if build.ID == "" {
		build.ID = "build-" + uuid.New().String()[:8]
	}
	s.builds[build.ID] = build
	return build, nil
}

func (s *Service) UpdateBuildStatus(buildID, status string) error {
	build, exists := s.builds[buildID]
	if !exists {
		return errors.New("build not found")
	}
	build.Status = status
	return nil
}
