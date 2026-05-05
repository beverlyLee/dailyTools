package k8s

import (
	"context"
	"fmt"
	"strings"
	"time"

	"cloud-native-console/pkg/types"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

type Client struct {
	clientset *kubernetes.Clientset
	clusterID string
}

func NewClient(kubeConfig string, clusterID string) (*Client, error) {
	config, err := clientcmd.RESTConfigFromKubeConfig([]byte(kubeConfig))
	if err != nil {
		return nil, fmt.Errorf("failed to parse kubeconfig: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create clientset: %w", err)
	}

	return &Client{
		clientset: clientset,
		clusterID: clusterID,
	}, nil
}

func (c *Client) TestConnection() error {
	_, err := c.clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{Limit: 1})
	return err
}

func (c *Client) GetVersion() (string, error) {
	version, err := c.clientset.Discovery().ServerVersion()
	if err != nil {
		return "", err
	}
	return version.GitVersion, nil
}

func (c *Client) GetNamespaces() ([]string, error) {
	namespaces, err := c.clientset.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]string, len(namespaces.Items))
	for i, ns := range namespaces.Items {
		result[i] = ns.Name
	}
	return result, nil
}

func (c *Client) GetNodes() ([]types.Node, error) {
	nodes, err := c.clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]types.Node, 0, len(nodes.Items))
	for _, node := range nodes.Items {
		status := types.NodeStatusUnknown
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeReady {
				if condition.Status == corev1.ConditionTrue {
					status = types.NodeStatusReady
				} else {
					status = types.NodeStatusNotReady
				}
				break
			}
		}

		role := types.NodeRoleWorker
		for label := range node.Labels {
			if strings.Contains(label, "node-role.kubernetes.io/master") ||
				strings.Contains(label, "node-role.kubernetes.io/control-plane") {
				role = types.NodeRoleMaster
				break
			}
		}

		cpuUsed := 0.0
		cpuTotal := 0.0
		memUsed := 0.0
		memTotal := 0.0

		if cpu, ok := node.Status.Allocatable[corev1.ResourceCPU]; ok {
			cpuTotal = float64(cpu.MilliValue()) / 1000.0
		}
		if mem, ok := node.Status.Allocatable[corev1.ResourceMemory]; ok {
			memTotal = float64(mem.Value()) / (1024 * 1024 * 1024)
		}

		pods, err := c.clientset.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{
			FieldSelector: fmt.Sprintf("spec.nodeName=%s", node.Name),
		})
		if err != nil {
			continue
		}

		var nodeIP string
		for _, addr := range node.Status.Addresses {
			if addr.Type == corev1.NodeInternalIP {
				nodeIP = addr.Address
				break
			}
		}

		result = append(result, types.Node{
			Name:   node.Name,
			Status: status,
			Role:   role,
			CPU: types.ResourceUsage{
				Used:    cpuUsed,
				Total:   cpuTotal,
				Percent: ifZero(cpuTotal, 0, (cpuUsed/cpuTotal)*100),
			},
			Memory: types.ResourceUsage{
				Used:    memUsed,
				Total:   memTotal,
				Percent: ifZero(memTotal, 0, (memUsed/memTotal)*100),
			},
			Pods:     len(pods.Items),
			IP:       nodeIP,
			Age:      formatAge(node.CreationTimestamp.Time),
			Creation: node.CreationTimestamp.Time,
		})
	}

	return result, nil
}

func (c *Client) GetPods(namespace string) ([]types.Pod, error) {
	if namespace == "" {
		namespace = corev1.NamespaceAll
	}

	pods, err := c.clientset.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]types.Pod, 0, len(pods.Items))
	for _, pod := range pods.Items {
		status := types.PodStatus(pod.Status.Phase)

		var podIP string
		if pod.Status.PodIP != "" {
			podIP = pod.Status.PodIP
		}

		result = append(result, types.Pod{
			Name:       pod.Name,
			Namespace:  pod.Namespace,
			Status:     status,
			Node:       pod.Spec.NodeName,
			IP:         podIP,
			Age:        formatAge(pod.CreationTimestamp.Time),
			Containers: len(pod.Spec.Containers),
			Creation:   pod.CreationTimestamp.Time,
		})
	}

	return result, nil
}

func (c *Client) GetDeployments(namespace string) ([]types.Deployment, error) {
	if namespace == "" {
		namespace = corev1.NamespaceAll
	}

	deployments, err := c.clientset.AppsV1().Deployments(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]types.Deployment, 0, len(deployments.Items))
	for _, deploy := range deployments.Items {
		result = append(result, types.Deployment{
			Name:              deploy.Name,
			Namespace:         deploy.Namespace,
			Replicas:          *deploy.Spec.Replicas,
			ReadyReplicas:     deploy.Status.ReadyReplicas,
			AvailableReplicas: deploy.Status.AvailableReplicas,
			Age:               formatAge(deploy.CreationTimestamp.Time),
			Creation:          deploy.CreationTimestamp.Time,
		})
	}

	return result, nil
}

func (c *Client) GetServices(namespace string) ([]types.Service, error) {
	if namespace == "" {
		namespace = corev1.NamespaceAll
	}

	services, err := c.clientset.CoreV1().Services(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]types.Service, 0, len(services.Items))
	for _, svc := range services.Items {
		ports := make([]types.ServicePort, 0, len(svc.Spec.Ports))
		for _, port := range svc.Spec.Ports {
			ports = append(ports, types.ServicePort{
				Port:       port.Port,
				TargetPort: port.TargetPort.IntVal,
				Protocol:   string(port.Protocol),
			})
		}

		result = append(result, types.Service{
			Name:      svc.Name,
			Namespace: svc.Namespace,
			Type:      types.ServiceType(svc.Spec.Type),
			ClusterIP: svc.Spec.ClusterIP,
			Ports:     ports,
			Age:       formatAge(svc.CreationTimestamp.Time),
			Creation:  svc.CreationTimestamp.Time,
		})
	}

	return result, nil
}

func (c *Client) GetIngresses(namespace string) ([]types.Ingress, error) {
	if namespace == "" {
		namespace = corev1.NamespaceAll
	}

	ingresses, err := c.clientset.NetworkingV1().Ingresses(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	result := make([]types.Ingress, 0, len(ingresses.Items))
	for _, ing := range ingresses.Items {
		hosts := make([]string, 0)
		if ing.Spec.Rules != nil {
			for _, rule := range ing.Spec.Rules {
				if rule.Host != "" {
					hosts = append(hosts, rule.Host)
				}
			}
		}

		result = append(result, types.Ingress{
			Name:      ing.Name,
			Namespace: ing.Namespace,
			Hosts:     hosts,
			Age:       formatAge(ing.CreationTimestamp.Time),
			Creation:  ing.CreationTimestamp.Time,
		})
	}

	return result, nil
}

func (c *Client) GetPodLogs(namespace, podName, container string) (string, error) {
	podLogOptions := &corev1.PodLogOptions{
		Follow: false,
		Tail:   ptrInt64(100),
	}

	if container != "" {
		podLogOptions.Container = container
	}

	req := c.clientset.CoreV1().Pods(namespace).GetLogs(podName, podLogOptions)
	stream, err := req.Stream(context.TODO())
	if err != nil {
		return "", err
	}
	defer stream.Close()

	buf := make([]byte, 4096)
	result := ""
	for {
		n, err := stream.Read(buf)
		if n > 0 {
			result += string(buf[:n])
		}
		if err != nil {
			break
		}
	}

	return result, nil
}

func (c *Client) ApplyDeployment(deployment *appsv1.Deployment) error {
	existing, err := c.clientset.AppsV1().Deployments(deployment.Namespace).Get(
		context.TODO(),
		deployment.Name,
		metav1.GetOptions{},
	)

	if err == nil {
		deployment.ResourceVersion = existing.ResourceVersion
		_, err = c.clientset.AppsV1().Deployments(deployment.Namespace).Update(
			context.TODO(),
			deployment,
			metav1.UpdateOptions{},
		)
		return err
	}

	_, err = c.clientset.AppsV1().Deployments(deployment.Namespace).Create(
		context.TODO(),
		deployment,
		metav1.CreateOptions{},
	)
	return err
}

func (c *Client) ApplyService(service *corev1.Service) error {
	existing, err := c.clientset.CoreV1().Services(service.Namespace).Get(
		context.TODO(),
		service.Name,
		metav1.GetOptions{},
	)

	if err == nil {
		service.ResourceVersion = existing.ResourceVersion
		_, err = c.clientset.CoreV1().Services(service.Namespace).Update(
			context.TODO(),
			service,
			metav1.UpdateOptions{},
		)
		return err
	}

	_, err = c.clientset.CoreV1().Services(service.Namespace).Create(
		context.TODO(),
		service,
		metav1.CreateOptions{},
	)
	return err
}

func (c *Client) ApplyIngress(ingress *networkingv1.Ingress) error {
	existing, err := c.clientset.NetworkingV1().Ingresses(ingress.Namespace).Get(
		context.TODO(),
		ingress.Name,
		metav1.GetOptions{},
	)

	if err == nil {
		ingress.ResourceVersion = existing.ResourceVersion
		_, err = c.clientset.NetworkingV1().Ingresses(ingress.Namespace).Update(
			context.TODO(),
			ingress,
			metav1.UpdateOptions{},
		)
		return err
	}

	_, err = c.clientset.NetworkingV1().Ingresses(ingress.Namespace).Create(
		context.TODO(),
		ingress,
		metav1.CreateOptions{},
	)
	return err
}

func (c *Client) CountPods(namespace string) (int, error) {
	if namespace == "" {
		namespace = corev1.NamespaceAll
	}

	pods, err := c.clientset.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return 0, err
	}
	return len(pods.Items), nil
}

func (c *Client) CountNodes() (int, error) {
	nodes, err := c.clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return 0, err
	}
	return len(nodes.Items), nil
}

func formatAge(t time.Time) string {
	d := time.Since(t)

	if d < time.Minute {
		return fmt.Sprintf("%ds", int(d.Seconds()))
	}
	if d < time.Hour {
		return fmt.Sprintf("%dm", int(d.Minutes()))
	}
	if d < 24*time.Hour {
		return fmt.Sprintf("%dh", int(d.Hours()))
	}
	return fmt.Sprintf("%dd", int(d.Hours()/24))
}

func ifZero(divisor, zeroVal, nonZeroVal float64) float64 {
	if divisor == 0 {
		return zeroVal
	}
	return nonZeroVal
}

func ptrInt64(i int64) *int64 {
	return &i
}
