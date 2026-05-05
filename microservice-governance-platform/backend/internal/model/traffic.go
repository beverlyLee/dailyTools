package model

import "time"

type CanaryRule struct {
	ID             string          `json:"id" yaml:"id"`
	ServiceName    string          `json:"serviceName" yaml:"serviceName"`
	CanaryVersion  string          `json:"canaryVersion" yaml:"canaryVersion"`
	StableVersion  string          `json:"stableVersion" yaml:"stableVersion"`
	Weight         int             `json:"weight" yaml:"weight"`
	RuleType       string          `json:"ruleType" yaml:"ruleType"` // weight, header, cookie
	MatchCondition string          `json:"matchCondition,omitempty" yaml:"matchCondition,omitempty"`
	Status         string          `json:"status" yaml:"status"` // enabled, disabled
	Description    string          `json:"description,omitempty" yaml:"description,omitempty"`
	Stats          CanaryStats     `json:"stats" yaml:"stats"`
	CreatedAt      time.Time       `json:"createdAt" yaml:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt" yaml:"updatedAt"`
}

type CanaryStats struct {
	TotalRequests     int64 `json:"totalRequests" yaml:"totalRequests"`
	CanaryRequests    int64 `json:"canaryRequests" yaml:"canaryRequests"`
	StableRequests    int64 `json:"stableRequests" yaml:"stableRequests"`
	CanarySuccess     int64 `json:"canarySuccess" yaml:"canarySuccess"`
	CanaryFailed      int64 `json:"canaryFailed" yaml:"canaryFailed"`
	StableSuccess     int64 `json:"stableSuccess" yaml:"stableSuccess"`
	StableFailed      int64 `json:"stableFailed" yaml:"stableFailed"`
}

type BlueGreenRule struct {
	ID               string          `json:"id" yaml:"id"`
	ServiceName      string          `json:"serviceName" yaml:"serviceName"`
	GreenVersion     string          `json:"greenVersion" yaml:"greenVersion"`
	BlueVersion      string          `json:"blueVersion" yaml:"blueVersion"`
	SwitchStrategy   string          `json:"switchStrategy" yaml:"switchStrategy"` // manual, auto
	ValidationRules  string          `json:"validationRules,omitempty" yaml:"validationRules,omitempty"`
	RollbackStrategy string          `json:"rollbackStrategy" yaml:"rollbackStrategy"` // manual, auto
	Status           string          `json:"status" yaml:"status"` // running, completed, rollbacked
	Progress         int             `json:"progress" yaml:"progress"`
	Step             int             `json:"step" yaml:"step"`
	Description      string          `json:"description,omitempty" yaml:"description,omitempty"`
	StartTime        *time.Time      `json:"startTime,omitempty" yaml:"startTime,omitempty"`
	CompleteTime     *time.Time      `json:"completeTime,omitempty" yaml:"completeTime,omitempty"`
	CreatedAt        time.Time       `json:"createdAt" yaml:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt" yaml:"updatedAt"`
}

type CircuitBreakerRule struct {
	ID                string             `json:"id" yaml:"id"`
	ServiceName       string             `json:"serviceName" yaml:"serviceName"`
	CircuitType       string             `json:"circuitType" yaml:"circuitType"` // error_rate, slow_call, error_count
	Threshold         float64            `json:"threshold" yaml:"threshold"`
	WindowSize        int                `json:"windowSize" yaml:"windowSize"` // 秒
	MinRequests       int                `json:"minRequests" yaml:"minRequests"`
	CircuitDuration   int                `json:"circuitDuration" yaml:"circuitDuration"` // 秒
	HalfOpenRequests  int                `json:"halfOpenRequests" yaml:"halfOpenRequests"`
	FallbackStrategy  string             `json:"fallbackStrategy" yaml:"fallbackStrategy"` // return_default, redirect, custom
	FallbackValue     string             `json:"fallbackValue,omitempty" yaml:"fallbackValue,omitempty"`
	RedirectUrl       string             `json:"redirectUrl,omitempty" yaml:"redirectUrl,omitempty"`
	Status            string             `json:"status" yaml:"status"` // enabled, disabled
	CircuitStatus     string             `json:"circuitStatus" yaml:"circuitStatus"` // closed, open, half_open
	Description       string             `json:"description,omitempty" yaml:"description,omitempty"`
	Stats             CircuitBreakerStats `json:"stats" yaml:"stats"`
	CreatedAt         time.Time          `json:"createdAt" yaml:"createdAt"`
	UpdatedAt         time.Time          `json:"updatedAt" yaml:"updatedAt"`
}

type CircuitBreakerStats struct {
	TotalRequests       int64 `json:"totalRequests" yaml:"totalRequests"`
	SuccessRequests     int64 `json:"successRequests" yaml:"successRequests"`
	FailedRequests      int64 `json:"failedRequests" yaml:"failedRequests"`
	CircuitOpenCount    int64 `json:"circuitOpenCount" yaml:"circuitOpenCount"`
	CircuitCloseCount   int64 `json:"circuitCloseCount" yaml:"circuitCloseCount"`
}

type MirrorRule struct {
	ID              string          `json:"id" yaml:"id"`
	SourceService   string          `json:"sourceService" yaml:"sourceService"`
	TargetService   string          `json:"targetService" yaml:"targetService"`
	MirrorPercent   int             `json:"mirrorPercent" yaml:"mirrorPercent"`
	MirrorType      string          `json:"mirrorType" yaml:"mirrorType"` // all, path, header
	PathPattern     string          `json:"pathPattern,omitempty" yaml:"pathPattern,omitempty"`
	HeaderPattern   string          `json:"headerPattern,omitempty" yaml:"headerPattern,omitempty"`
	Timeout         int             `json:"timeout" yaml:"timeout"` // 毫秒
	Async           bool            `json:"async" yaml:"async"`
	Status          string          `json:"status" yaml:"status"` // enabled, disabled
	Description     string          `json:"description,omitempty" yaml:"description,omitempty"`
	Stats           MirrorStats     `json:"stats" yaml:"stats"`
	CreatedAt       time.Time       `json:"createdAt" yaml:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt" yaml:"updatedAt"`
}

type MirrorStats struct {
	TotalRequests      int64 `json:"totalRequests" yaml:"totalRequests"`
	MirroredRequests   int64 `json:"mirroredRequests" yaml:"mirroredRequests"`
	SuccessResponses   int64 `json:"successResponses" yaml:"successResponses"`
	FailedResponses    int64 `json:"failedResponses" yaml:"failedResponses"`
}

type FaultRule struct {
	ID                 string          `json:"id" yaml:"id"`
	TargetService      string          `json:"targetService" yaml:"targetService"`
	FaultType          string          `json:"faultType" yaml:"faultType"` // delay, abort, error
	DelayDuration      int             `json:"delayDuration,omitempty" yaml:"delayDuration,omitempty"` // 毫秒
	AbortStatus        int             `json:"abortStatus,omitempty" yaml:"abortStatus,omitempty"`
	ErrorMessage       string          `json:"errorMessage,omitempty" yaml:"errorMessage,omitempty"`
	InjectionPercent   int             `json:"injectionPercent" yaml:"injectionPercent"`
	InjectionScope     string          `json:"injectionScope" yaml:"injectionScope"` // all, specific
	SpecificInstances  string          `json:"specificInstances,omitempty" yaml:"specificInstances,omitempty"`
	Duration           int             `json:"duration" yaml:"duration"` // 秒, 0 表示持续
	Status             string          `json:"status" yaml:"status"` // active, stopped
	StartTime          *time.Time      `json:"startTime,omitempty" yaml:"startTime,omitempty"`
	Description        string          `json:"description,omitempty" yaml:"description,omitempty"`
	Stats              FaultStats      `json:"stats" yaml:"stats"`
	CreatedAt          time.Time       `json:"createdAt" yaml:"createdAt"`
	UpdatedAt          time.Time       `json:"updatedAt" yaml:"updatedAt"`
}

type FaultStats struct {
	TotalRequests      int64 `json:"totalRequests" yaml:"totalRequests"`
	InjectedRequests   int64 `json:"injectedRequests" yaml:"injectedRequests"`
	SuccessInjections  int64 `json:"successInjections" yaml:"successInjections"`
	FailedInjections   int64 `json:"failedInjections" yaml:"failedInjections"`
}

type EnvoyConfig struct {
	ServiceName       string                 `json:"serviceName" yaml:"serviceName"`
	Version           string                 `json:"version" yaml:"version"`
	Routes            []RouteConfig         `json:"routes" yaml:"routes"`
	Clusters          []ClusterConfig       `json:"clusters" yaml:"clusters"`
	CircuitBreakers   *CircuitBreakerConfig `json:"circuitBreakers,omitempty" yaml:"circuitBreakers,omitempty"`
	RetryPolicy       *RetryPolicy          `json:"retryPolicy,omitempty" yaml:"retryPolicy,omitempty"`
	TrafficShifting   *TrafficShifting      `json:"trafficShifting,omitempty" yaml:"trafficShifting,omitempty"`
	MirrorPolicy      *MirrorPolicy         `json:"mirrorPolicy,omitempty" yaml:"mirrorPolicy,omitempty"`
	FaultInjection    *FaultInjection       `json:"faultInjection,omitempty" yaml:"faultInjection,omitempty"`
}

type RouteConfig struct {
	Name              string                 `json:"name" yaml:"name"`
	Match             RouteMatch             `json:"match" yaml:"match"`
	Route             RouteAction            `json:"route" yaml:"route"`
	Redirect          *RedirectAction        `json:"redirect,omitempty" yaml:"redirect,omitempty"`
	DirectResponse    *DirectResponseAction  `json:"directResponse,omitempty" yaml:"directResponse,omitempty"`
}

type RouteMatch struct {
	Prefix            string            `json:"prefix,omitempty" yaml:"prefix,omitempty"`
	Path              string            `json:"path,omitempty" yaml:"path,omitempty"`
	Regex             string            `json:"regex,omitempty" yaml:"regex,omitempty"`
	Headers           []HeaderMatch     `json:"headers,omitempty" yaml:"headers,omitempty"`
	QueryParameters   []QueryParameter  `json:"queryParameters,omitempty" yaml:"queryParameters,omitempty"`
}

type HeaderMatch struct {
	Name              string `json:"name" yaml:"name"`
	ExactMatch        string `json:"exactMatch,omitempty" yaml:"exactMatch,omitempty"`
	RegexMatch        string `json:"regexMatch,omitempty" yaml:"regexMatch,omitempty"`
	PrefixMatch       string `json:"prefixMatch,omitempty" yaml:"prefixMatch,omitempty"`
	SuffixMatch       string `json:"suffixMatch,omitempty" yaml:"suffixMatch,omitempty"`
	PresentMatch      bool   `json:"presentMatch,omitempty" yaml:"presentMatch,omitempty"`
	InvertMatch       bool   `json:"invertMatch,omitempty" yaml:"invertMatch,omitempty"`
}

type QueryParameter struct {
	Name              string `json:"name" yaml:"name"`
	ExactMatch        string `json:"exactMatch,omitempty" yaml:"exactMatch,omitempty"`
	RegexMatch        string `json:"regexMatch,omitempty" yaml:"regexMatch,omitempty"`
}

type RouteAction struct {
	ClusterName       string          `json:"clusterName,omitempty" yaml:"clusterName,omitempty"`
	WeightedClusters  []WeightedCluster `json:"weightedClusters,omitempty" yaml:"weightedClusters,omitempty"`
	PrefixRewrite     string          `json:"prefixRewrite,omitempty" yaml:"prefixRewrite,omitempty"`
	Timeout           string          `json:"timeout,omitempty" yaml:"timeout,omitempty"`
	RetryPolicy       *RetryPolicy    `json:"retryPolicy,omitempty" yaml:"retryPolicy,omitempty"`
	RequestMirrorPolicies []RequestMirrorPolicy `json:"requestMirrorPolicies,omitempty" yaml:"requestMirrorPolicies,omitempty"`
	FaultInjection    *FaultInjection `json:"faultInjection,omitempty" yaml:"faultInjection,omitempty"`
}

type WeightedCluster struct {
	Name              string `json:"name" yaml:"name"`
	Weight            int    `json:"weight" yaml:"weight"`
}

type RetryPolicy struct {
	RetryOn           string `json:"retryOn,omitempty" yaml:"retryOn,omitempty"`
	NumRetries        int    `json:"numRetries,omitempty" yaml:"numRetries,omitempty"`
	PerTryTimeout     string `json:"perTryTimeout,omitempty" yaml:"perTryTimeout,omitempty"`
}

type RequestMirrorPolicy struct {
	Cluster           string `json:"cluster,omitempty" yaml:"cluster,omitempty"`
	RuntimeFraction   *RuntimeFraction `json:"runtimeFraction,omitempty" yaml:"runtimeFraction,omitempty"`
}

type RuntimeFraction struct {
	DefaultValue      *FractionalPercent `json:"defaultValue,omitempty" yaml:"defaultValue,omitempty"`
	RuntimeKey        string             `json:"runtimeKey,omitempty" yaml:"runtimeKey,omitempty"`
}

type FractionalPercent struct {
	Numerator         int    `json:"numerator,omitempty" yaml:"numerator,omitempty"`
	Denominator       string `json:"denominator,omitempty" yaml:"denominator,omitempty"`
}

type RedirectAction struct {
	HostRedirect      string `json:"hostRedirect,omitempty" yaml:"hostRedirect,omitempty"`
	PathRedirect      string `json:"pathRedirect,omitempty" yaml:"pathRedirect,omitempty"`
	PrefixRewrite     string `json:"prefixRewrite,omitempty" yaml:"prefixRewrite,omitempty"`
	ResponseCode      string `json:"responseCode,omitempty" yaml:"responseCode,omitempty"`
	StripQuery        bool   `json:"stripQuery,omitempty" yaml:"stripQuery,omitempty"`
}

type DirectResponseAction struct {
	Status            int    `json:"status,omitempty" yaml:"status,omitempty"`
	Body              string `json:"body,omitempty" yaml:"body,omitempty"`
}

type ClusterConfig struct {
	Name              string            `json:"name" yaml:"name"`
	ServiceName       string            `json:"serviceName,omitempty" yaml:"serviceName,omitempty"`
	ConnectTimeout    string            `json:"connectTimeout,omitempty" yaml:"connectTimeout,omitempty"`
	Type              string            `json:"type,omitempty" yaml:"type,omitempty"`
	LbPolicy          string            `json:"lbPolicy,omitempty" yaml:"lbPolicy,omitempty"`
	HealthChecks      []HealthCheck     `json:"healthChecks,omitempty" yaml:"healthChecks,omitempty"`
	CircuitBreakers   *CircuitBreakers `json:"circuitBreakers,omitempty" yaml:"circuitBreakers,omitempty"`
	OutlierDetection  *OutlierDetection `json:"outlierDetection,omitempty" yaml:"outlierDetection,omitempty"`
}

type HealthCheck struct {
	Timeout           string `json:"timeout,omitempty" yaml:"timeout,omitempty"`
	Interval          string `json:"interval,omitempty" yaml:"interval,omitempty"`
	UnhealthyThreshold int   `json:"unhealthyThreshold,omitempty" yaml:"unhealthyThreshold,omitempty"`
	HealthyThreshold  int    `json:"healthyThreshold,omitempty" yaml:"healthyThreshold,omitempty"`
	HttpHealthCheck   *HttpHealthCheck `json:"httpHealthCheck,omitempty" yaml:"httpHealthCheck,omitempty"`
}

type HttpHealthCheck struct {
	Path              string `json:"path,omitempty" yaml:"path,omitempty"`
	Host              string `json:"host,omitempty" yaml:"host,omitempty"`
}

type CircuitBreakers struct {
	Thresholds        []CircuitBreakerThreshold `json:"thresholds,omitempty" yaml:"thresholds,omitempty"`
}

type CircuitBreakerThreshold struct {
	Priority           string `json:"priority,omitempty" yaml:"priority,omitempty"`
	MaxConnections     int    `json:"maxConnections,omitempty" yaml:"maxConnections,omitempty"`
	MaxPendingRequests int    `json:"maxPendingRequests,omitempty" yaml:"maxPendingRequests,omitempty"`
	MaxRequests        int    `json:"maxRequests,omitempty" yaml:"maxRequests,omitempty"`
	MaxRetries         int    `json:"maxRetries,omitempty" yaml:"maxRetries,omitempty"`
}

type OutlierDetection struct {
	Consecutive5xx             int    `json:"consecutive5xx,omitempty" yaml:"consecutive5xx,omitempty"`
	ConsecutiveGatewayFailure  int    `json:"consecutiveGatewayFailure,omitempty" yaml:"consecutiveGatewayFailure,omitempty"`
	Interval                   string `json:"interval,omitempty" yaml:"interval,omitempty"`
	BaseEjectionTime           string `json:"baseEjectionTime,omitempty" yaml:"baseEjectionTime,omitempty"`
	MaxEjectionPercent         int    `json:"maxEjectionPercent,omitempty" yaml:"maxEjectionPercent,omitempty"`
	EnforcingConsecutive5xx    int    `json:"enforcingConsecutive5xx,omitempty" yaml:"enforcingConsecutive5xx,omitempty"`
	EnforcingSuccessRate        int    `json:"enforcingSuccessRate,omitempty" yaml:"enforcingSuccessRate,omitempty"`
}

type CircuitBreakerConfig struct {
	MaxConnections     int    `json:"maxConnections,omitempty" yaml:"maxConnections,omitempty"`
	MaxPendingRequests int    `json:"maxPendingRequests,omitempty" yaml:"maxPendingRequests,omitempty"`
	MaxRequests        int    `json:"maxRequests,omitempty" yaml:"maxRequests,omitempty"`
	MaxRetries         int    `json:"maxRetries,omitempty" yaml:"maxRetries,omitempty"`
}

type TrafficShifting struct {
	Routes            []TrafficShiftingRoute `json:"routes,omitempty" yaml:"routes,omitempty"`
}

type TrafficShiftingRoute struct {
	Match             RouteMatch          `json:"match" yaml:"match"`
	Route             WeightedRouteAction `json:"route" yaml:"route"`
}

type WeightedRouteAction struct {
	WeightedClusters  []WeightedCluster `json:"weightedClusters,omitempty" yaml:"weightedClusters,omitempty"`
}

type MirrorPolicy struct {
	Cluster           string             `json:"cluster,omitempty" yaml:"cluster,omitempty"`
	RuntimeFraction   *RuntimeFraction   `json:"runtimeFraction,omitempty" yaml:"runtimeFraction,omitempty"`
}

type FaultInjection struct {
	Delay             *DelayFault    `json:"delay,omitempty" yaml:"delay,omitempty"`
	Abort             *AbortFault    `json:"abort,omitempty" yaml:"abort,omitempty"`
}

type DelayFault struct {
	FixedDelay        string           `json:"fixedDelay,omitempty" yaml:"fixedDelay,omitempty"`
	Percentage        *Percentage      `json:"percentage,omitempty" yaml:"percentage,omitempty"`
}

type AbortFault struct {
	HttpStatus        int              `json:"httpStatus,omitempty" yaml:"httpStatus,omitempty"`
	Percentage        *Percentage      `json:"percentage,omitempty" yaml:"percentage,omitempty"`
}

type Percentage struct {
	Value             float64 `json:"value,omitempty" yaml:"value,omitempty"`
}

type APIResponse struct {
	Success bool        `json:"success" yaml:"success"`
	Message string      `json:"message,omitempty" yaml:"message,omitempty"`
	Data    interface{} `json:"data,omitempty" yaml:"data,omitempty"`
}
