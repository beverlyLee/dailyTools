package scripts

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"sync"
	"time"

	"self-healing-orchestrator/config"
)

type Executor struct {
	config   *config.ScriptsConfig
	scripts  map[string]*config.ScriptDefinition
	mutex    sync.RWMutex
	execChan chan ExecutionRequest
}

type ExecutionRequest struct {
	ScriptID   string
	Args       []string
	Env        map[string]string
	Timeout    int
	Callback   func(result ExecutionResult)
}

type ExecutionResult struct {
	ScriptID   string
	Success    bool
	ExitCode   int
	Output     string
	Error      string
	Duration   time.Duration
	StartTime  time.Time
	EndTime    time.Time
}

func NewExecutor(cfg *config.ScriptsConfig) *Executor {
	e := &Executor{
		config:   cfg,
		scripts:  make(map[string]*config.ScriptDefinition),
		execChan: make(chan ExecutionRequest, 100),
	}

	for i := range cfg.Scripts {
		e.scripts[cfg.Scripts[i].ID] = &cfg.Scripts[i]
	}

	go e.processQueue()

	return e
}

func (e *Executor) processQueue() {
	for req := range e.execChan {
		result := e.executeSync(req)
		if req.Callback != nil {
			req.Callback(result)
		}
	}
}

func (e *Executor) ExecuteAsync(req ExecutionRequest) {
	e.execChan <- req
}

func (e *Executor) ExecuteSync(scriptID string, args []string, env map[string]string, timeout int) ExecutionResult {
	req := ExecutionRequest{
		ScriptID: scriptID,
		Args:     args,
		Env:      env,
		Timeout:  timeout,
	}
	return e.executeSync(req)
}

func (e *Executor) executeSync(req ExecutionRequest) ExecutionResult {
	e.mutex.RLock()
	script, exists := e.scripts[req.ScriptID]
	e.mutex.RUnlock()

	if !exists {
		return ExecutionResult{
			ScriptID: req.ScriptID,
			Success:  false,
			ExitCode: -1,
			Error:    fmt.Sprintf("script not found: %s", req.ScriptID),
			StartTime: time.Now(),
			EndTime:   time.Now(),
		}
	}

	startTime := time.Now()

	timeout := req.Timeout
	if timeout == 0 {
		timeout = script.Timeout
	}
	if timeout == 0 {
		timeout = e.config.Timeout
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
	defer cancel()

	var cmd *exec.Cmd
	switch script.Type {
	case "shell":
		cmdArgs := append([]string{script.Path}, req.Args...)
		cmd = exec.CommandContext(ctx, "sh", cmdArgs...)
	case "python":
		cmdArgs := append([]string{script.Path}, req.Args...)
		cmd = exec.CommandContext(ctx, "python3", cmdArgs...)
	default:
		return ExecutionResult{
			ScriptID: req.ScriptID,
			Success:  false,
			ExitCode: -1,
			Error:    fmt.Sprintf("unsupported script type: %s", script.Type),
			StartTime: startTime,
			EndTime:   time.Now(),
		}
	}

	for k, v := range script.Env {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, v))
	}
	for k, v := range req.Env {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", k, v))
	}
	cmd.Env = append(cmd.Env, os.Environ()...)

	output, err := cmd.CombinedOutput()
	endTime := time.Now()
	duration := endTime.Sub(startTime)

	result := ExecutionResult{
		ScriptID:  req.ScriptID,
		Output:    string(output),
		Duration:  duration,
		StartTime: startTime,
		EndTime:   endTime,
	}

	if ctx.Err() == context.DeadlineExceeded {
		result.Success = false
		result.ExitCode = -1
		result.Error = "execution timeout"
		return result
	}

	if err != nil {
		result.Success = false
		result.Error = err.Error()
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
		} else {
			result.ExitCode = -1
		}
		return result
	}

	result.Success = true
	result.ExitCode = 0
	return result
}

func (e *Executor) GetScript(scriptID string) (*config.ScriptDefinition, bool) {
	e.mutex.RLock()
	defer e.mutex.RUnlock()

	script, exists := e.scripts[scriptID]
	return script, exists
}

func (e *Executor) GetAllScripts() []config.ScriptDefinition {
	e.mutex.RLock()
	defer e.mutex.RUnlock()

	scripts := make([]config.ScriptDefinition, 0, len(e.scripts))
	for _, s := range e.scripts {
		scripts = append(scripts, *s)
	}
	return scripts
}

func (e *Executor) AddScript(script config.ScriptDefinition) {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	e.scripts[script.ID] = &script
}

func (e *Executor) RemoveScript(scriptID string) {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	delete(e.scripts, scriptID)
}

func (e *Executor) GetScriptsByType(scriptType string) []config.ScriptDefinition {
	e.mutex.RLock()
	defer e.mutex.RUnlock()

	var scripts []config.ScriptDefinition
	for _, s := range e.scripts {
		if s.Type == scriptType {
			scripts = append(scripts, *s)
		}
	}
	return scripts
}

func (e *Executor) ValidateScript(scriptID string) error {
	e.mutex.RLock()
	script, exists := e.scripts[scriptID]
	e.mutex.RUnlock()

	if !exists {
		return fmt.Errorf("script not found: %s", scriptID)
	}

	if _, err := os.Stat(script.Path); os.IsNotExist(err) {
		return fmt.Errorf("script file not found: %s", script.Path)
	}

	return nil
}
