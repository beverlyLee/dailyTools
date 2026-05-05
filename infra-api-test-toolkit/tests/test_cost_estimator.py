"""
成本估算器单元测试
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infra_api_test_toolkit.iac_audit.cost_estimator import (
    CostEstimator,
    CostUnit,
    ResourceCost,
    CostEstimateResult
)


class TestCostUnit:
    """测试成本单位枚举"""
    
    def test_cost_unit_values(self):
        assert CostUnit.HOURLY.value == "hourly"
        assert CostUnit.DAILY.value == "daily"
        assert CostUnit.MONTHLY.value == "monthly"
        assert CostUnit.YEARLY.value == "yearly"


class TestResourceCost:
    """测试资源成本数据类"""
    
    def test_resource_cost_creation(self):
        cost = ResourceCost(
            resource_type="aws_ec2_instance",
            resource_name="web_server",
            estimated_cost=8.50,
            currency="USD",
            unit=CostUnit.MONTHLY
        )
        
        assert cost.resource_type == "aws_ec2_instance"
        assert cost.resource_name == "web_server"
        assert cost.estimated_cost == 8.50
        assert cost.currency == "USD"
        assert cost.unit == CostUnit.MONTHLY
        assert cost.breakdown == {}
        assert cost.assumptions == []


class TestCostEstimateResult:
    """测试成本估算结果数据类"""
    
    def test_estimate_result_creation(self):
        result = CostEstimateResult(
            total_estimated_cost=100.00,
            currency="USD",
            unit=CostUnit.MONTHLY
        )
        
        assert result.total_estimated_cost == 100.00
        assert result.currency == "USD"
        assert result.unit == CostUnit.MONTHLY
        assert result.resource_costs == []
        assert result.savings_opportunities == []
        assert result.assumptions == []


class TestCostEstimator:
    """测试成本估算器"""
    
    def setup_method(self):
        self.estimator = CostEstimator()
    
    def test_get_resource_types(self):
        """测试获取支持的资源类型"""
        resource_types = self.estimator.get_resource_types()
        
        assert isinstance(resource_types, list)
        assert "aws_ec2_instance" in resource_types
        assert "aws_s3_bucket" in resource_types
        assert "aws_ebs_volume" in resource_types
    
    def test_estimate_ec2_instance(self):
        """测试估算 EC2 实例成本"""
        resources = [{
            "type": "aws_ec2_instance",
            "name": "web_server",
            "config": {
                "instance_type": "t2.micro"
            }
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert result.total_estimated_cost > 0
        assert len(result.resource_costs) == 1
        assert result.resource_costs[0].resource_type == "aws_ec2_instance"
    
    def test_estimate_s3_bucket(self):
        """测试估算 S3 存储桶成本"""
        resources = [{
            "type": "aws_s3_bucket",
            "name": "data_bucket",
            "config": {}
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert result.total_estimated_cost > 0
        assert len(result.resource_costs) == 1
    
    def test_estimate_ebs_volume(self):
        """测试估算 EBS 卷成本"""
        resources = [{
            "type": "aws_ebs_volume",
            "name": "data_volume",
            "config": {
                "size": 100,
                "type": "gp2"
            }
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert result.total_estimated_cost > 0
        assert len(result.resource_costs) == 1
    
    def test_estimate_rds_instance(self):
        """测试估算 RDS 实例成本"""
        resources = [{
            "type": "aws_db_instance",
            "name": "mysql_db",
            "config": {
                "instance_class": "db.t2.micro"
            }
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert result.total_estimated_cost > 0
        assert len(result.resource_costs) == 1
    
    def test_estimate_lambda_function(self):
        """测试估算 Lambda 函数成本"""
        resources = [{
            "type": "aws_lambda_function",
            "name": "api_handler",
            "config": {
                "memory_size": 256
            }
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert result.total_estimated_cost >= 0
        assert len(result.resource_costs) == 1
    
    def test_estimate_dynamodb_table(self):
        """测试估算 DynamoDB 表成本"""
        resources = [{
            "type": "aws_dynamodb_table",
            "name": "user_table",
            "config": {
                "read_capacity": 5,
                "write_capacity": 5
            }
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert result.total_estimated_cost > 0
        assert len(result.resource_costs) == 1
    
    def test_estimate_kubernetes_deployment(self):
        """测试估算 Kubernetes 部署成本"""
        resources = [{
            "type": "kubernetes.Deployment",
            "name": "web_app",
            "config": {
                "spec": {
                    "replicas": 3,
                    "template": {
                        "spec": {
                            "containers": [{
                                "resources": {
                                    "requests": {
                                        "cpu": "500m",
                                        "memory": "256Mi"
                                    }
                                }
                            }]
                        }
                    }
                }
            }
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert result.total_estimated_cost > 0
        assert len(result.resource_costs) == 1
    
    def test_estimate_kubernetes_service(self):
        """测试估算 Kubernetes 服务成本"""
        resources = [{
            "type": "kubernetes.Service",
            "name": "web_service",
            "config": {
                "spec": {
                    "type": "LoadBalancer"
                }
            }
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert result.total_estimated_cost > 0
        assert len(result.resource_costs) == 1
    
    def test_estimate_multiple_resources(self):
        """测试估算多个资源"""
        resources = [
            {
                "type": "aws_ec2_instance",
                "name": "web_server",
                "config": {"instance_type": "t2.micro"}
            },
            {
                "type": "aws_s3_bucket",
                "name": "data_bucket",
                "config": {}
            },
            {
                "type": "aws_ebs_volume",
                "name": "data_volume",
                "config": {"size": 50, "type": "gp2"}
            }
        ]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert len(result.resource_costs) == 3
        assert result.total_estimated_cost == sum(
            rc.estimated_cost for rc in result.resource_costs
        )
    
    def test_estimate_hourly_unit(self):
        """测试每小时单位估算"""
        resources = [{
            "type": "aws_ec2_instance",
            "name": "web_server",
            "config": {"instance_type": "t2.micro"}
        }]
        
        result_hourly = self.estimator.estimate(resources, unit=CostUnit.HOURLY)
        result_monthly = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert result_hourly.total_estimated_cost < result_monthly.total_estimated_cost
        assert result_hourly.total_estimated_cost * 730 == pytest.approx(
            result_monthly.total_estimated_cost, rel=0.1
        )
    
    def test_estimate_yearly_unit(self):
        """测试每年单位估算"""
        resources = [{
            "type": "aws_ec2_instance",
            "name": "web_server",
            "config": {"instance_type": "t2.micro"}
        }]
        
        result_monthly = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        result_yearly = self.estimator.estimate(resources, unit=CostUnit.YEARLY)
        
        assert result_yearly.total_estimated_cost == pytest.approx(
            result_monthly.total_estimated_cost * 12, rel=0.1
        )
    
    def test_savings_opportunities_for_t2_instance(self):
        """测试 T2 实例的节省机会"""
        resources = [{
            "type": "aws_ec2_instance",
            "name": "old_server",
            "config": {"instance_type": "t2.micro"}
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        t2_opportunities = [
            o for o in result.savings_opportunities
            if o.get("type") == "instance_upgrade"
        ]
        assert len(t2_opportunities) > 0
    
    def test_savings_opportunities_for_gp2_volume(self):
        """测试 GP2 卷的节省机会"""
        resources = [{
            "type": "aws_ebs_volume",
            "name": "old_volume",
            "config": {"size": 100, "type": "gp2"}
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        ebs_opportunities = [
            o for o in result.savings_opportunities
            if o.get("type") == "ebs_upgrade"
        ]
        assert len(ebs_opportunities) > 0
    
    def test_estimate_unsupported_resource(self):
        """测试估算不支持的资源类型"""
        resources = [{
            "type": "unsupported_resource_type",
            "name": "unknown_resource",
            "config": {}
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert result.total_estimated_cost == 0
        assert len(result.resource_costs) == 0
    
    def test_estimate_empty_resources(self):
        """测试估算空资源列表"""
        resources = []
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert result.total_estimated_cost == 0
        assert len(result.resource_costs) == 0
        assert len(result.savings_opportunities) == 0
    
    def test_assumptions_in_result(self):
        """测试结果中的假设条件"""
        resources = [{
            "type": "aws_ec2_instance",
            "name": "web_server",
            "config": {"instance_type": "t2.micro"}
        }]
        
        result = self.estimator.estimate(resources, unit=CostUnit.MONTHLY)
        
        assert len(result.assumptions) > 0
        assert any("AWS" in a for a in result.assumptions)
        assert any("730" in a for a in result.assumptions)
