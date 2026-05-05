"""
成本估算器模块
用于估算 IaC 资源的成本
"""

import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class CostUnit(Enum):
    HOURLY = "hourly"
    DAILY = "daily"
    MONTHLY = "monthly"
    YEARLY = "yearly"


@dataclass
class ResourceCost:
    """
    资源成本数据类
    """
    resource_type: str
    resource_name: str
    estimated_cost: float
    currency: str = "USD"
    unit: CostUnit = CostUnit.MONTHLY
    breakdown: Dict[str, float] = field(default_factory=dict)
    assumptions: List[str] = field(default_factory=list)


@dataclass
class CostEstimateResult:
    """
    成本估算结果数据类
    """
    total_estimated_cost: float
    currency: str = "USD"
    unit: CostUnit = CostUnit.MONTHLY
    resource_costs: List[ResourceCost] = field(default_factory=list)
    savings_opportunities: List[Dict[str, Any]] = field(default_factory=list)
    assumptions: List[str] = field(default_factory=list)


class CostEstimator:
    """
    成本估算器类
    用于估算 IaC 资源的成本
    """
    
    PRICING_DATA = {
        "aws_ec2_instance": {
            "t2.micro": {"hourly": 0.0116, "monthly": 8.50},
            "t2.small": {"hourly": 0.023, "monthly": 16.90},
            "t2.medium": {"hourly": 0.0464, "monthly": 33.90},
            "t3.micro": {"hourly": 0.0104, "monthly": 7.60},
            "t3.small": {"hourly": 0.0208, "monthly": 15.20},
            "t3.medium": {"hourly": 0.0416, "monthly": 30.40},
            "m5.large": {"hourly": 0.096, "monthly": 70.08},
            "m5.xlarge": {"hourly": 0.192, "monthly": 140.16},
            "c5.large": {"hourly": 0.085, "monthly": 62.05},
            "r5.large": {"hourly": 0.126, "monthly": 92.00},
        },
        "aws_s3_bucket": {
            "storage": {"per_gb_monthly": 0.023},
            "requests": {
                "put": 0.000005,
                "get": 0.0000004,
                "delete": 0.0
            },
            "data_transfer": {
                "out_to_internet": 0.09,
                "in": 0.0
            }
        },
        "aws_ebs_volume": {
            "gp2": {"per_gb_monthly": 0.10},
            "gp3": {"per_gb_monthly": 0.08},
            "io1": {"per_gb_monthly": 0.125, "per_iops_monthly": 0.065},
            "st1": {"per_gb_monthly": 0.045},
            "sc1": {"per_gb_monthly": 0.025},
        },
        "aws_rds_cluster": {
            "db.t2.small": {"hourly": 0.043, "monthly": 31.40},
            "db.t2.medium": {"hourly": 0.086, "monthly": 62.80},
            "db.t3.small": {"hourly": 0.034, "monthly": 24.82},
            "db.t3.medium": {"hourly": 0.068, "monthly": 49.64},
            "db.r5.large": {"hourly": 0.17, "monthly": 124.10},
        },
        "aws_db_instance": {
            "db.t2.micro": {"hourly": 0.022, "monthly": 16.06},
            "db.t2.small": {"hourly": 0.043, "monthly": 31.40},
            "db.t2.medium": {"hourly": 0.086, "monthly": 62.80},
            "db.t3.micro": {"hourly": 0.017, "monthly": 12.41},
            "db.t3.small": {"hourly": 0.034, "monthly": 24.82},
            "db.t3.medium": {"hourly": 0.068, "monthly": 49.64},
        },
        "aws_lambda_function": {
            "request_cost": 0.0000002,
            "duration_cost_per_100ms": 0.0000002,
        },
        "aws_dynamodb_table": {
            "read_capacity": {"per_hourly": 0.00013},
            "write_capacity": {"per_hourly": 0.00065},
            "storage": {"per_gb_monthly": 0.25},
        },
        "aws_api_gateway_rest_api": {
            "requests_per_million": 3.50,
            "data_transfer_out_per_gb": 0.09,
        },
        "aws_cloudfront_distribution": {
            "requests_per_10000": 0.009,
            "data_transfer_out_per_gb": 0.085,
        },
        "kubernetes.Pod": {
            "cpu_per_core_hourly": 0.04,
            "memory_per_gb_hourly": 0.004,
        },
        "kubernetes.Deployment": {
            "cpu_per_core_hourly": 0.04,
            "memory_per_gb_hourly": 0.004,
        },
        "kubernetes.Service": {
            "load_balancer_monthly": 22.50,
        },
    }
    
    DEFAULT_ASSUMPTIONS = [
        "估算基于 AWS 美国东部（弗吉尼亚北部）区域的按需定价",
        "假设资源 730 小时/月（24 小时 × 365 天 / 12 月）持续运行",
        "存储成本基于估算的平均使用量",
        "数据传输成本不包含在估算中（除非特别说明）",
        "定价可能会随时间变化，请参考官方定价页面获取最新信息",
    ]
    
    def estimate(
        self, 
        resources: List[Dict[str, Any]], 
        unit: CostUnit = CostUnit.MONTHLY
    ) -> CostEstimateResult:
        """
        估算资源成本
        
        Args:
            resources: 资源列表
            unit: 成本单位
            
        Returns:
            成本估算结果
        """
        result = CostEstimateResult(
            total_estimated_cost=0.0,
            unit=unit,
            assumptions=self.DEFAULT_ASSUMPTIONS.copy()
        )
        
        for resource in resources:
            resource_cost = self._estimate_resource(resource, unit)
            if resource_cost:
                result.resource_costs.append(resource_cost)
                result.total_estimated_cost += resource_cost.estimated_cost
        
        result.savings_opportunities = self._identify_savings_opportunities(resources)
        
        return result
    
    def _estimate_resource(
        self, 
        resource: Dict[str, Any], 
        unit: CostUnit
    ) -> Optional[ResourceCost]:
        """
        估算单个资源的成本
        
        Args:
            resource: 资源信息
            unit: 成本单位
            
        Returns:
            资源成本估算
        """
        resource_type = resource.get('type', '')
        resource_name = resource.get('name', 'unknown')
        config = resource.get('config', {})
        
        resource_cost = None
        
        if 'aws_ec2_instance' in resource_type or 'AWS::EC2::Instance' in resource_type:
            resource_cost = self._estimate_ec2_instance(config, resource_type, resource_name, unit)
        
        elif 'aws_s3_bucket' in resource_type or 'AWS::S3::Bucket' in resource_type:
            resource_cost = self._estimate_s3_bucket(config, resource_type, resource_name, unit)
        
        elif 'aws_ebs_volume' in resource_type or 'AWS::EC2::Volume' in resource_type:
            resource_cost = self._estimate_ebs_volume(config, resource_type, resource_name, unit)
        
        elif 'aws_rds_cluster' in resource_type or 'aws_db_instance' in resource_type:
            resource_cost = self._estimate_rds(config, resource_type, resource_name, unit)
        
        elif 'aws_lambda_function' in resource_type:
            resource_cost = self._estimate_lambda(config, resource_type, resource_name, unit)
        
        elif 'aws_dynamodb_table' in resource_type:
            resource_cost = self._estimate_dynamodb(config, resource_type, resource_name, unit)
        
        elif 'kubernetes' in resource_type:
            resource_cost = self._estimate_kubernetes_resource(config, resource_type, resource_name, unit)
        
        return resource_cost
    
    def _estimate_ec2_instance(
        self, 
        config: Dict[str, Any], 
        resource_type: str, 
        resource_name: str,
        unit: CostUnit
    ) -> ResourceCost:
        """
        估算 EC2 实例成本
        
        Args:
            config: 资源配置
            resource_type: 资源类型
            resource_name: 资源名称
            unit: 成本单位
            
        Returns:
            资源成本估算
        """
        instance_type = config.get('instance_type', 't2.micro')
        pricing = self.PRICING_DATA.get('aws_ec2_instance', {})
        
        instance_pricing = pricing.get(instance_type, pricing.get('t2.micro', {'hourly': 0.0116, 'monthly': 8.50}))
        
        hourly_cost = instance_pricing.get('hourly', 0.0116)
        monthly_cost = instance_pricing.get('monthly', hourly_cost * 730)
        
        estimated_cost = self._convert_cost(hourly_cost, monthly_cost, unit)
        
        return ResourceCost(
            resource_type=resource_type,
            resource_name=resource_name,
            estimated_cost=estimated_cost,
            unit=unit,
            breakdown={
                "instance_hours": estimated_cost,
            },
            assumptions=[
                f"实例类型: {instance_type}",
                "假设实例持续运行",
                "不包含 EBS 卷成本",
            ]
        )
    
    def _estimate_s3_bucket(
        self, 
        config: Dict[str, Any], 
        resource_type: str, 
        resource_name: str,
        unit: CostUnit
    ) -> ResourceCost:
        """
        估算 S3 存储桶成本
        
        Args:
            config: 资源配置
            resource_type: 资源类型
            resource_name: 资源名称
            unit: 成本单位
            
        Returns:
            资源成本估算
        """
        pricing = self.PRICING_DATA.get('aws_s3_bucket', {})
        
        estimated_storage_gb = 100
        estimated_put_requests = 10000
        estimated_get_requests = 100000
        
        storage_cost = estimated_storage_gb * pricing.get('storage', {}).get('per_gb_monthly', 0.023)
        put_cost = estimated_put_requests * pricing.get('requests', {}).get('put', 0.000005)
        get_cost = estimated_get_requests * pricing.get('requests', {}).get('get', 0.0000004)
        
        monthly_cost = storage_cost + put_cost + get_cost
        hourly_cost = monthly_cost / 730
        
        estimated_cost = self._convert_cost(hourly_cost, monthly_cost, unit)
        
        return ResourceCost(
            resource_type=resource_type,
            resource_name=resource_name,
            estimated_cost=estimated_cost,
            unit=unit,
            breakdown={
                "storage": storage_cost if unit == CostUnit.MONTHLY else storage_cost / 730,
                "put_requests": put_cost if unit == CostUnit.MONTHLY else put_cost / 730,
                "get_requests": get_cost if unit == CostUnit.MONTHLY else get_cost / 730,
            },
            assumptions=[
                f"估算存储: {estimated_storage_gb} GB",
                f"估算 PUT 请求: {estimated_put_requests}/月",
                f"估算 GET 请求: {estimated_get_requests}/月",
                "不包含数据传输成本",
            ]
        )
    
    def _estimate_ebs_volume(
        self, 
        config: Dict[str, Any], 
        resource_type: str, 
        resource_name: str,
        unit: CostUnit
    ) -> ResourceCost:
        """
        估算 EBS 卷成本
        
        Args:
            config: 资源配置
            resource_type: 资源类型
            resource_name: 资源名称
            unit: 成本单位
            
        Returns:
            资源成本估算
        """
        volume_type = config.get('type', 'gp2')
        size = config.get('size', 50)
        iops = config.get('iops', 0)
        
        pricing = self.PRICING_DATA.get('aws_ebs_volume', {})
        volume_pricing = pricing.get(volume_type, pricing.get('gp2', {'per_gb_monthly': 0.10}))
        
        storage_cost = size * volume_pricing.get('per_gb_monthly', 0.10)
        iops_cost = 0
        
        if volume_type == 'io1' and iops > 0:
            iops_cost = iops * volume_pricing.get('per_iops_monthly', 0.065)
        
        monthly_cost = storage_cost + iops_cost
        hourly_cost = monthly_cost / 730
        
        estimated_cost = self._convert_cost(hourly_cost, monthly_cost, unit)
        
        return ResourceCost(
            resource_type=resource_type,
            resource_name=resource_name,
            estimated_cost=estimated_cost,
            unit=unit,
            breakdown={
                "storage": storage_cost if unit == CostUnit.MONTHLY else storage_cost / 730,
                "iops": iops_cost if unit == CostUnit.MONTHLY else iops_cost / 730,
            },
            assumptions=[
                f"卷类型: {volume_type}",
                f"卷大小: {size} GB",
                f"IOPS: {iops if iops > 0 else '默认'}",
            ]
        )
    
    def _estimate_rds(
        self, 
        config: Dict[str, Any], 
        resource_type: str, 
        resource_name: str,
        unit: CostUnit
    ) -> ResourceCost:
        """
        估算 RDS 成本
        
        Args:
            config: 资源配置
            resource_type: 资源类型
            resource_name: 资源名称
            unit: 成本单位
            
        Returns:
            资源成本估算
        """
        instance_class = config.get('instance_class', 'db.t2.micro')
        pricing_key = 'aws_rds_cluster' if 'cluster' in resource_type else 'aws_db_instance'
        
        pricing = self.PRICING_DATA.get(pricing_key, {})
        instance_pricing = pricing.get(instance_class, pricing.get('db.t2.micro', {'hourly': 0.022, 'monthly': 16.06}))
        
        hourly_cost = instance_pricing.get('hourly', 0.022)
        monthly_cost = instance_pricing.get('monthly', hourly_cost * 730)
        
        estimated_cost = self._convert_cost(hourly_cost, monthly_cost, unit)
        
        return ResourceCost(
            resource_type=resource_type,
            resource_name=resource_name,
            estimated_cost=estimated_cost,
            unit=unit,
            breakdown={
                "instance_hours": estimated_cost,
            },
            assumptions=[
                f"实例类型: {instance_class}",
                "假设实例持续运行",
                "不包含存储成本",
            ]
        )
    
    def _estimate_lambda(
        self, 
        config: Dict[str, Any], 
        resource_type: str, 
        resource_name: str,
        unit: CostUnit
    ) -> ResourceCost:
        """
        估算 Lambda 函数成本
        
        Args:
            config: 资源配置
            resource_type: 资源类型
            resource_name: 资源名称
            unit: 成本单位
            
        Returns:
            资源成本估算
        """
        pricing = self.PRICING_DATA.get('aws_lambda_function', {})
        
        memory_size = config.get('memory_size', 128)
        estimated_requests = 1000000
        estimated_duration_ms = 200
        
        request_cost = estimated_requests * pricing.get('request_cost', 0.0000002)
        
        gb_seconds = (memory_size / 1024) * (estimated_duration_ms / 1000) * estimated_requests
        duration_cost = gb_seconds * pricing.get('duration_cost_per_100ms', 0.0000002) * 10
        
        monthly_cost = request_cost + duration_cost
        hourly_cost = monthly_cost / 730
        
        estimated_cost = self._convert_cost(hourly_cost, monthly_cost, unit)
        
        return ResourceCost(
            resource_type=resource_type,
            resource_name=resource_name,
            estimated_cost=estimated_cost,
            unit=unit,
            breakdown={
                "requests": request_cost if unit == CostUnit.MONTHLY else request_cost / 730,
                "duration": duration_cost if unit == CostUnit.MONTHLY else duration_cost / 730,
            },
            assumptions=[
                f"内存大小: {memory_size} MB",
                f"估算请求: {estimated_requests}/月",
                f"估算平均执行时间: {estimated_duration_ms} ms",
                "免费额度已应用",
            ]
        )
    
    def _estimate_dynamodb(
        self, 
        config: Dict[str, Any], 
        resource_type: str, 
        resource_name: str,
        unit: CostUnit
    ) -> ResourceCost:
        """
        估算 DynamoDB 表成本
        
        Args:
            config: 资源配置
            resource_type: 资源类型
            resource_name: 资源名称
            unit: 成本单位
            
        Returns:
            资源成本估算
        """
        pricing = self.PRICING_DATA.get('aws_dynamodb_table', {})
        
        read_capacity = config.get('read_capacity', 5)
        write_capacity = config.get('write_capacity', 5)
        estimated_storage_gb = 10
        
        read_cost = read_capacity * pricing.get('read_capacity', {}).get('per_hourly', 0.00013) * 730
        write_cost = write_capacity * pricing.get('write_capacity', {}).get('per_hourly', 0.00065) * 730
        storage_cost = estimated_storage_gb * pricing.get('storage', {}).get('per_gb_monthly', 0.25)
        
        monthly_cost = read_cost + write_cost + storage_cost
        hourly_cost = monthly_cost / 730
        
        estimated_cost = self._convert_cost(hourly_cost, monthly_cost, unit)
        
        return ResourceCost(
            resource_type=resource_type,
            resource_name=resource_name,
            estimated_cost=estimated_cost,
            unit=unit,
            breakdown={
                "read_capacity": read_cost if unit == CostUnit.MONTHLY else read_cost / 730,
                "write_capacity": write_cost if unit == CostUnit.MONTHLY else write_cost / 730,
                "storage": storage_cost if unit == CostUnit.MONTHLY else storage_cost / 730,
            },
            assumptions=[
                f"读容量单位: {read_capacity}",
                f"写容量单位: {write_capacity}",
                f"估算存储: {estimated_storage_gb} GB",
                "使用预配置容量模式",
            ]
        )
    
    def _estimate_kubernetes_resource(
        self, 
        config: Dict[str, Any], 
        resource_type: str, 
        resource_name: str,
        unit: CostUnit
    ) -> ResourceCost:
        """
        估算 Kubernetes 资源成本
        
        Args:
            config: 资源配置
            resource_type: 资源类型
            resource_name: 资源名称
            unit: 成本单位
            
        Returns:
            资源成本估算
        """
        pricing = self.PRICING_DATA.get('kubernetes.Pod', {})
        
        if 'Service' in resource_type:
            service_pricing = self.PRICING_DATA.get('kubernetes.Service', {})
            monthly_cost = service_pricing.get('load_balancer_monthly', 22.50)
            hourly_cost = monthly_cost / 730
            
            estimated_cost = self._convert_cost(hourly_cost, monthly_cost, unit)
            
            return ResourceCost(
                resource_type=resource_type,
                resource_name=resource_name,
                estimated_cost=estimated_cost,
                unit=unit,
                breakdown={
                    "load_balancer": estimated_cost,
                },
                assumptions=[
                    "假设使用云提供商负载均衡器",
                    "不包含后端实例成本",
                ]
            )
        
        cpu_request = 1
        memory_request_gb = 2
        
        specs = config.get('spec', {})
        if isinstance(specs, dict):
            template = specs.get('template', {})
            if isinstance(template, dict):
                spec = template.get('spec', {})
                if isinstance(spec, dict):
                    containers = spec.get('containers', [])
                    if isinstance(containers, list) and len(containers) > 0:
                        resources = containers[0].get('resources', {})
                        if isinstance(resources, dict):
                            requests = resources.get('requests', {})
                            if isinstance(requests, dict):
                                cpu_str = requests.get('cpu', '1')
                                memory_str = requests.get('memory', '2Gi')
                                
                                if 'm' in str(cpu_str):
                                    cpu_request = float(str(cpu_str).replace('m', '')) / 1000
                                else:
                                    try:
                                        cpu_request = float(cpu_str)
                                    except:
                                        pass
                                
                                if 'Gi' in str(memory_str):
                                    memory_request_gb = float(str(memory_str).replace('Gi', ''))
                                elif 'Mi' in str(memory_str):
                                    memory_request_gb = float(str(memory_str).replace('Mi', '')) / 1024
        
        replicas = specs.get('replicas', 1)
        
        cpu_hourly = pricing.get('cpu_per_core_hourly', 0.04) * cpu_request
        memory_hourly = pricing.get('memory_per_gb_hourly', 0.004) * memory_request_gb
        
        hourly_cost = (cpu_hourly + memory_hourly) * replicas
        monthly_cost = hourly_cost * 730
        
        estimated_cost = self._convert_cost(hourly_cost, monthly_cost, unit)
        
        return ResourceCost(
            resource_type=resource_type,
            resource_name=resource_name,
            estimated_cost=estimated_cost,
            unit=unit,
            breakdown={
                "cpu": (cpu_hourly * replicas) if unit == CostUnit.HOURLY else (cpu_hourly * replicas * 730),
                "memory": (memory_hourly * replicas) if unit == CostUnit.HOURLY else (memory_hourly * replicas * 730),
            },
            assumptions=[
                f"CPU 请求: {cpu_request} 核",
                f"内存请求: {memory_request_gb} GB",
                f"副本数: {replicas}",
                "基于云提供商托管 Kubernetes 服务定价估算",
            ]
        )
    
    def _convert_cost(
        self, 
        hourly_cost: float, 
        monthly_cost: float, 
        target_unit: CostUnit
    ) -> float:
        """
        转换成本单位
        
        Args:
            hourly_cost: 每小时成本
            monthly_cost: 每月成本
            target_unit: 目标单位
            
        Returns:
            转换后的成本
        """
        if target_unit == CostUnit.HOURLY:
            return hourly_cost
        elif target_unit == CostUnit.DAILY:
            return hourly_cost * 24
        elif target_unit == CostUnit.MONTHLY:
            return monthly_cost
        elif target_unit == CostUnit.YEARLY:
            return monthly_cost * 12
        
        return monthly_cost
    
    def _identify_savings_opportunities(
        self, 
        resources: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        识别节省成本的机会
        
        Args:
            resources: 资源列表
            
        Returns:
            节省机会列表
        """
        opportunities = []
        
        for resource in resources:
            resource_type = resource.get('type', '')
            resource_name = resource.get('name', '')
            config = resource.get('config', {})
            
            if 'aws_ec2_instance' in resource_type:
                instance_type = config.get('instance_type', '')
                if instance_type.startswith('t2.'):
                    opportunities.append({
                        "resource": resource_name,
                        "type": "instance_upgrade",
                        "title": "考虑使用新一代实例类型",
                        "description": f"当前使用 {instance_type}，考虑升级到 t3 系列以获得更好的性价比",
                        "potential_savings": "约 10-20%",
                    })
                
                if not config.get('tenancy'):
                    opportunities.append({
                        "resource": resource_name,
                        "type": "reserved_instances",
                        "title": "考虑使用预留实例",
                        "description": "对于稳定运行的工作负载，预留实例可节省高达 75% 的成本",
                        "potential_savings": "高达 75%",
                    })
            
            if 'aws_s3_bucket' in resource_type:
                opportunities.append({
                    "resource": resource_name,
                    "type": "s3_lifecycle",
                    "title": "考虑使用 S3 生命周期策略",
                    "description": "自动将不常访问的数据迁移到更便宜的存储类（如 S3 Intelligent-Tiering、Glacier）",
                    "potential_savings": "高达 50%+",
                })
            
            if 'aws_ebs_volume' in resource_type:
                volume_type = config.get('type', '')
                if volume_type == 'gp2':
                    opportunities.append({
                        "resource": resource_name,
                        "type": "ebs_upgrade",
                        "title": "考虑升级到 gp3 卷",
                        "description": "gp3 提供与 gp2 相同的性能基准，但成本降低 20%",
                        "potential_savings": "约 20%",
                    })
            
            if 'aws_db_instance' in resource_type or 'aws_rds_cluster' in resource_type:
                opportunities.append({
                    "resource": resource_name,
                    "type": "rds_reserved",
                    "title": "考虑使用 RDS 预留实例",
                    "description": "对于稳定的数据库工作负载，预留实例可节省高达 75% 的成本",
                    "potential_savings": "高达 75%",
                })
        
        return opportunities
    
    def get_resource_types(self) -> List[str]:
        """
        获取支持的资源类型列表
        
        Returns:
            资源类型列表
        """
        return list(self.PRICING_DATA.keys())
