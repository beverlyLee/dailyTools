package k8s

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"cloud-native-console/pkg/types"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"gopkg.in/yaml.v3"
)

type DeployService struct {
	manager *ClusterManager
}

func NewDeployService(manager *ClusterManager) *DeployService {
	return &DeployService{
		manager: manager,
	}
}

func (s *DeployService) GenerateYAML(config *types.DeployConfig) (string, error) {
	var yamlParts []string

	namespace := config.Namespace
	if namespace == "" {
		namespace = "default"
	}

	deployment := s.buildDeployment(config, namespace)
	deployYAML, err := yaml.Marshal(deployment)
	if err != nil {
		return "", fmt.Errorf("failed to marshal deployment: %w", err)
	}
	yamlParts = append(yamlParts, string(deployYAML))

	if config.Service != nil {
		service := s.buildService(config, namespace)
		svcYAML, err := yaml.Marshal(service)
		if err != nil {
			return "", fmt.Errorf("failed to marshal service: %w", err)
		}
		yamlParts = append(yamlParts, "---", string(svcYAML))
	}

	if config.Ingress != nil {
		ingress := s.buildIngress(config, namespace)
		ingYAML, err := yaml.Marshal(ingress)
		if err != nil {
			return "", fmt.Errorf("failed to marshal ingress: %w", err)
		}
		yamlParts = append(yamlParts, "---", string(ingYAML))
	}

	result := strings.Join(yamlParts, "\n")

	if len(config.Variables) > 0 {
		result = s.applyVariables(result, config.Variables)
	}

	return result, nil
}

func (s *DeployService) Deploy(config *types.DeployConfig) (*types.DeployResult, error) {
	client, exists := s.manager.GetClient(config.ClusterID)
	if !exists {
		return nil, fmt.Errorf("cluster not found")
	}

	var logs []string
	namespace := config.Namespace
	if namespace == "" {
		namespace = "default"
	}

	logs = append(logs, fmt.Sprintf("[%s] Starting deployment to cluster...", time.Now().Format("15:04:05")))
	logs = append(logs, fmt.Sprintf("[%s] Namespace: %s", time.Now().Format("15:04:05"), namespace))

	deployment := s.buildDeployment(config, namespace)
	logs = append(logs, fmt.Sprintf("[%s] Creating Deployment: %s", time.Now().Format("15:04:05"), deployment.Name))

	if err := client.ApplyDeployment(deployment); err != nil {
		logs = append(logs, fmt.Sprintf("[%s] ERROR: Failed to create Deployment: %v", time.Now().Format("15:04:05"), err))
		return &types.DeployResult{
			Success: false,
			Message: fmt.Sprintf("Failed to create deployment: %v", err),
			Logs:    logs,
		}, err
	}
	logs = append(logs, fmt.Sprintf("[%s] Deployment created successfully", time.Now().Format("15:04:05")))

	if config.Service != nil {
		service := s.buildService(config, namespace)
		logs = append(logs, fmt.Sprintf("[%s] Creating Service: %s", time.Now().Format("15:04:05"), service.Name))

		if err := client.ApplyService(service); err != nil {
			logs = append(logs, fmt.Sprintf("[%s] ERROR: Failed to create Service: %v", time.Now().Format("15:04:05"), err))
			return &types.DeployResult{
				Success: false,
				Message: fmt.Sprintf("Failed to create service: %v", err),
				Logs:    logs,
			}, err
		}
		logs = append(logs, fmt.Sprintf("[%s] Service created successfully", time.Now().Format("15:04:05")))
	}

	if config.Ingress != nil {
		ingress := s.buildIngress(config, namespace)
		logs = append(logs, fmt.Sprintf("[%s] Creating Ingress: %s", time.Now().Format("15:04:05"), ingress.Name))

		if err := client.ApplyIngress(ingress); err != nil {
			logs = append(logs, fmt.Sprintf("[%s] ERROR: Failed to create Ingress: %v", time.Now().Format("15:04:05"), err))
			return &types.DeployResult{
				Success: false,
				Message: fmt.Sprintf("Failed to create ingress: %v", err),
				Logs:    logs,
			}, err
		}
		logs = append(logs, fmt.Sprintf("[%s] Ingress created successfully", time.Now().Format("15:04:05")))
	}

	logs = append(logs, fmt.Sprintf("[%s] Deployment completed successfully!", time.Now().Format("15:04:05")))

	return &types.DeployResult{
		Success: true,
		Message: "Deployment completed successfully",
		Logs:    logs,
	}, nil
}

func (s *DeployService) buildDeployment(config *types.DeployConfig, namespace string) *appsv1.Deployment {
	deploySpec := &config.Deployment

	var containers []corev1.Container
	for _, c := range deploySpec.Containers {
		var ports []corev1.ContainerPort
		for _, p := range c.Ports {
			ports = append(ports, corev1.ContainerPort{
				ContainerPort: p.ContainerPort,
			})
		}

		var envVars []corev1.EnvVar
		for _, e := range c.Env {
			envVars = append(envVars, corev1.EnvVar{
				Name:  e.Name,
				Value: e.Value,
			})
		}

		var resources corev1.ResourceRequirements
		if c.Resources.Limits.CPU != "" || c.Resources.Limits.Memory != "" {
			resources.Limits = make(corev1.ResourceList)
			if c.Resources.Limits.CPU != "" {
				resources.Limits[corev1.ResourceCPU] = parseQuantity(c.Resources.Limits.CPU)
			}
			if c.Resources.Limits.Memory != "" {
				resources.Limits[corev1.ResourceMemory] = parseQuantity(c.Resources.Limits.Memory)
			}
		}
		if c.Resources.Requests.CPU != "" || c.Resources.Requests.Memory != "" {
			resources.Requests = make(corev1.ResourceList)
			if c.Resources.Requests.CPU != "" {
				resources.Requests[corev1.ResourceCPU] = parseQuantity(c.Resources.Requests.CPU)
			}
			if c.Resources.Requests.Memory != "" {
				resources.Requests[corev1.ResourceMemory] = parseQuantity(c.Resources.Requests.Memory)
			}
		}

		containers = append(containers, corev1.Container{
			Name:      c.Name,
			Image:     c.Image,
			Ports:     ports,
			Env:       envVars,
			Resources: resources,
		})
	}

	labels := map[string]string{
		"app": deploySpec.Name,
	}

	return &appsv1.Deployment{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "apps/v1",
			Kind:       "Deployment",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      deploySpec.Name,
			Namespace: namespace,
			Labels:    labels,
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &deploySpec.Replicas,
			Selector: &metav1.LabelSelector{
				MatchLabels: labels,
			},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{
					Labels: labels,
				},
				Spec: corev1.PodSpec{
					Containers: containers,
				},
			},
		},
	}
}

func (s *DeployService) buildService(config *types.DeployConfig, namespace string) *corev1.Service {
	svcSpec := config.Service
	if svcSpec == nil {
		return nil
	}

	var ports []corev1.ServicePort
	for _, p := range svcSpec.Ports {
		ports = append(ports, corev1.ServicePort{
			Port:       p.Port,
			TargetPort: intstr.FromInt(int(p.TargetPort)),
			Protocol:   corev1.Protocol(p.Protocol),
		})
	}

	labels := map[string]string{
		"app": config.Deployment.Name,
	}

	return &corev1.Service{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Service",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      svcSpec.Name,
			Namespace: namespace,
			Labels:    labels,
		},
		Spec: corev1.ServiceSpec{
			Type:     corev1.ServiceType(svcSpec.Type),
			Selector: labels,
			Ports:    ports,
		},
	}
}

func (s *DeployService) buildIngress(config *types.DeployConfig, namespace string) *networkingv1.Ingress {
	ingSpec := config.Ingress
	if ingSpec == nil {
		return nil
	}

	var paths []networkingv1.HTTPIngressPath
	for _, p := range ingSpec.Paths {
		paths = append(paths, networkingv1.HTTPIngressPath{
			Path:     p.Path,
			PathType: func() *networkingv1.PathType {
				pt := networkingv1.PathTypePrefix
				return &pt
			}(),
			Backend: networkingv1.IngressBackend{
				Service: &networkingv1.IngressServiceBackend{
					Name: p.ServiceName,
					Port: networkingv1.ServiceBackendPort{
						Number: p.ServicePort,
					},
				},
			},
		})
	}

	var rules []networkingv1.IngressRule
	for _, host := range ingSpec.Hosts {
		rules = append(rules, networkingv1.IngressRule{
			Host: host,
			IngressRuleValue: networkingv1.IngressRuleValue{
				HTTP: &networkingv1.HTTPIngressRuleValue{
					Paths: paths,
				},
			},
		})
	}

	return &networkingv1.Ingress{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "networking.k8s.io/v1",
			Kind:       "Ingress",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      ingSpec.Name,
			Namespace: namespace,
		},
		Spec: networkingv1.IngressSpec{
			Rules: rules,
		},
	}
}

func (s *DeployService) applyVariables(yaml string, variables map[string]string) string {
	result := yaml
	for key, value := range variables {
		placeholder := fmt.Sprintf("{{%s}}", key)
		result = strings.ReplaceAll(result, placeholder, value)
	}
	return result
}

func parseQuantity(_ string) intstr.IntOrString {
	return intstr.FromString("")
}

func MarshalYAML(obj interface{}) (string, error) {
	var buf bytes.Buffer
	encoder := yaml.NewEncoder(&buf)
	encoder.SetIndent(2)
	if err := encoder.Encode(obj); err != nil {
		return "", err
	}
	return buf.String(), nil
}
