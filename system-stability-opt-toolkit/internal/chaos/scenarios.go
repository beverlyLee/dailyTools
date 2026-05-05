package chaos

import (
	"time"

	"github.com/google/uuid"
)

type ScenarioTemplate struct {
	Name        string
	Description string
	Experiment  Experiment
}

var PredefinedScenarios = []ScenarioTemplate{
	{
		Name:        "Pod Failure - Single Pod",
		Description: "Kill a single pod to test failover capabilities",
		Experiment: Experiment{
			ID:          uuid.New().String(),
			Name:        "single-pod-failure",
			Description: "Test system resilience by killing a single pod",
			Config: ExperimentConfig{
				Type: ExperimentTypePodFailure,
				Target: Target{
					Namespace: "default",
				},
				PodFailure: &PodFailureConfig{
					PodCount:    1,
					Duration:    5 * time.Minute,
					GracePeriod: 30 * time.Second,
				},
				Duration:     10 * time.Minute,
				Interval:     10 * time.Second,
				AutoRollback: true,
				RollbackThreshold: &RollbackThreshold{
					ErrorRate:   0.05,
					LatencyP99:  500,
					QPSDropRate: 0.3,
				},
			},
		},
	},
	{
		Name:        "Pod Failure - Multiple Pods",
		Description: "Kill multiple pods to test high availability",
		Experiment: Experiment{
			ID:          uuid.New().String(),
			Name:        "multiple-pod-failure",
			Description: "Test HA by killing 50% of pods",
			Config: ExperimentConfig{
				Type: ExperimentTypePodFailure,
				Target: Target{
					Namespace: "default",
				},
				PodFailure: &PodFailureConfig{
					PodCount:    3,
					Duration:    10 * time.Minute,
					GracePeriod: 30 * time.Second,
				},
				Duration:     15 * time.Minute,
				Interval:     10 * time.Second,
				AutoRollback: true,
				RollbackThreshold: &RollbackThreshold{
					ErrorRate:   0.1,
					LatencyP99:  1000,
					QPSDropRate: 0.5,
				},
			},
		},
	},
	{
		Name:        "Network Delay - Mild",
		Description: "Add mild network latency to test graceful degradation",
		Experiment: Experiment{
			ID:          uuid.New().String(),
			Name:        "network-delay-mild",
			Description: "Add 100ms latency with 20ms jitter",
			Config: ExperimentConfig{
				Type: ExperimentTypeNetworkDelay,
				Target: Target{
					Namespace: "default",
				},
				NetworkDelay: &NetworkDelayConfig{
					Latency: 100 * time.Millisecond,
					Jitter:  20 * time.Millisecond,
				},
				Duration:     10 * time.Minute,
				Interval:     5 * time.Second,
				AutoRollback: true,
				RollbackThreshold: &RollbackThreshold{
					ErrorRate:   0.03,
					LatencyP99:  500,
					QPSDropRate: 0.2,
				},
			},
		},
	},
	{
		Name:        "Network Delay - Severe",
		Description: "Add severe network latency to test timeout handling",
		Experiment: Experiment{
			ID:          uuid.New().String(),
			Name:        "network-delay-severe",
			Description: "Add 500ms latency with 100ms jitter",
			Config: ExperimentConfig{
				Type: ExperimentTypeNetworkDelay,
				Target: Target{
					Namespace: "default",
				},
				NetworkDelay: &NetworkDelayConfig{
					Latency: 500 * time.Millisecond,
					Jitter:  100 * time.Millisecond,
				},
				Duration:     5 * time.Minute,
				Interval:     5 * time.Second,
				AutoRollback: true,
				RollbackThreshold: &RollbackThreshold{
					ErrorRate:   0.1,
					LatencyP99:  2000,
					QPSDropRate: 0.5,
				},
			},
		},
	},
	{
		Name:        "Disk Pressure",
		Description: "Fill disk space to test disk exhaustion handling",
		Experiment: Experiment{
			ID:          uuid.New().String(),
			Name:        "disk-pressure",
			Description: "Create large files to simulate disk exhaustion",
			Config: ExperimentConfig{
				Type: ExperimentTypeDiskPressure,
				Target: Target{
					Namespace: "default",
				},
				DiskPressure: &DiskPressureConfig{
					SizeGB: 10,
					Path:   "/var/tmp",
				},
				Duration:     10 * time.Minute,
				Interval:     30 * time.Second,
				AutoRollback: true,
				RollbackThreshold: &RollbackThreshold{
					ErrorRate:   0.05,
					LatencyP99:  1000,
					QPSDropRate: 0.3,
				},
			},
		},
	},
	{
		Name:        "CPU Stress - High",
		Description: "Stress CPU to test resource limits and throttling",
		Experiment: Experiment{
			ID:          uuid.New().String(),
			Name:        "cpu-stress-high",
			Description: "Consume 80% CPU capacity",
			Config: ExperimentConfig{
				Type: ExperimentTypeCPUStress,
				Target: Target{
					Namespace: "default",
				},
				CPUStress: &CPUStressConfig{
					Load:     80,
					Duration: 5 * time.Minute,
				},
				Duration:     10 * time.Minute,
				Interval:     5 * time.Second,
				AutoRollback: true,
				RollbackThreshold: &RollbackThreshold{
					ErrorRate:   0.05,
					LatencyP99:  1000,
					QPSDropRate: 0.4,
				},
			},
		},
	},
	{
		Name:        "Memory Stress",
		Description: "Consume memory to test OOM handling and eviction",
		Experiment: Experiment{
			ID:          uuid.New().String(),
			Name:        "memory-stress",
			Description: "Consume 500MB of memory",
			Config: ExperimentConfig{
				Type: ExperimentTypeMemoryStress,
				Target: Target{
					Namespace: "default",
				},
				MemoryStress: &MemoryStressConfig{
					SizeMB:   500,
					Duration: 5 * time.Minute,
				},
				Duration:     10 * time.Minute,
				Interval:     5 * time.Second,
				AutoRollback: true,
				RollbackThreshold: &RollbackThreshold{
					ErrorRate:   0.05,
					LatencyP99:  1000,
					QPSDropRate: 0.4,
				},
			},
		},
	},
}

func GetScenarioByName(name string) *Experiment {
	for _, scenario := range PredefinedScenarios {
		if scenario.Name == name {
			exp := scenario.Experiment
			exp.ID = uuid.New().String()
			return &exp
		}
	}
	return nil
}

func ListScenarios() []string {
	names := make([]string, len(PredefinedScenarios))
	for i, scenario := range PredefinedScenarios {
		names[i] = scenario.Name
	}
	return names
}

func CreateCustomExperiment(name, description string, config ExperimentConfig) *Experiment {
	return &Experiment{
		ID:          uuid.New().String(),
		Name:        name,
		Description: description,
		Config:      config,
		Status:      ExperimentStatusPending,
		CreatedAt:   time.Now(),
	}
}
