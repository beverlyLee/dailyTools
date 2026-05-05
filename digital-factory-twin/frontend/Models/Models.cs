using System;
using System.Collections.Generic;

namespace DigitalFactoryTwin.Models
{
    public class Device
    {
        public int Id { get; set; }
        public string DeviceId { get; set; }
        public string DeviceName { get; set; }
        public string DeviceType { get; set; }
        public string Location { get; set; }
        public string Status { get; set; }
        public string Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        public string StatusDisplayName
        {
            get
            {
                return Status switch
                {
                    "running" => "运行中",
                    "stopped" => "已停机",
                    "fault" => "故障",
                    "maintenance" => "维护中",
                    _ => Status
                };
            }
        }
        
        public string StatusColor
        {
            get
            {
                return Status switch
                {
                    "running" => "#4CAF50",
                    "stopped" => "#9E9E9E",
                    "fault" => "#F44336",
                    "maintenance" => "#FF9800",
                    _ => "#9E9E9E"
                };
            }
        }
    }

    public class PLCData
    {
        public int Id { get; set; }
        public int DeviceId { get; set; }
        public string DeviceName { get; set; }
        public DateTime Timestamp { get; set; }
        public string TagName { get; set; }
        public string TagValue { get; set; }
        public string DataType { get; set; }
        public bool Quality { get; set; }
    }

    public class Alert
    {
        public int Id { get; set; }
        public int? DeviceId { get; set; }
        public string DeviceName { get; set; }
        public string AlertCode { get; set; }
        public string AlertMessage { get; set; }
        public string AlertLevel { get; set; }
        public string Status { get; set; }
        public DateTime Timestamp { get; set; }
        public DateTime? AcknowledgedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string AcknowledgedBy { get; set; }
        public string ResolvedBy { get; set; }
        public string ResolutionNotes { get; set; }
        
        public string AlertLevelDisplayName
        {
            get
            {
                return AlertLevel switch
                {
                    "info" => "信息",
                    "warning" => "警告",
                    "error" => "错误",
                    "critical" => "严重",
                    _ => AlertLevel
                };
            }
        }
        
        public string AlertLevelColor
        {
            get
            {
                return AlertLevel switch
                {
                    "info" => "#2196F3",
                    "warning" => "#FF9800",
                    "error" => "#F44336",
                    "critical" => "#D32F2F",
                    _ => "#9E9E9E"
                };
            }
        }
        
        public string StatusDisplayName
        {
            get
            {
                return Status switch
                {
                    "active" => "活跃",
                    "acknowledged" => "已确认",
                    "resolved" => "已解决",
                    _ => Status
                };
            }
        }
    }

    public class ProductionLine
    {
        public int Id { get; set; }
        public string LineId { get; set; }
        public string LineName { get; set; }
        public string Description { get; set; }
        public List<Device> Devices { get; set; }
        public ProductionLineStatus CurrentStatus { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ProductionLineStatus
    {
        public int Id { get; set; }
        public string Status { get; set; }
        public double ProductionSpeed { get; set; }
        public int DailyOutput { get; set; }
        public int TargetOutput { get; set; }
        public double Efficiency { get; set; }
        public DateTime Timestamp { get; set; }
        
        public string StatusDisplayName
        {
            get
            {
                return Status switch
                {
                    "running" => "运行中",
                    "stopped" => "已停机",
                    "fault" => "故障",
                    "maintenance" => "维护中",
                    _ => Status
                };
            }
        }
        
        public string StatusColor
        {
            get
            {
                return Status switch
                {
                    "running" => "#4CAF50",
                    "stopped" => "#9E9E9E",
                    "fault" => "#F44336",
                    "maintenance" => "#FF9800",
                    _ => "#9E9E9E"
                };
            }
        }
    }

    public class Device3DModel
    {
        public int Id { get; set; }
        public int DeviceId { get; set; }
        public string ModelName { get; set; }
        public string ModelPath { get; set; }
        public string ModelFormat { get; set; }
        public double ScaleFactor { get; set; }
        public double DefaultPositionX { get; set; }
        public double DefaultPositionY { get; set; }
        public double DefaultPositionZ { get; set; }
        public double DefaultRotationX { get; set; }
        public double DefaultRotationY { get; set; }
        public double DefaultRotationZ { get; set; }
        public bool HasInternalStructure { get; set; }
        public string Description { get; set; }
        public List<DeviceComponent> Components { get; set; }
        public List<DisassemblyStep> DisassemblySteps { get; set; }
    }

    public class DeviceComponent
    {
        public int Id { get; set; }
        public int Device3DModelId { get; set; }
        public string ComponentName { get; set; }
        public string ComponentPath { get; set; }
        public string MeshName { get; set; }
        public double PositionX { get; set; }
        public double PositionY { get; set; }
        public double PositionZ { get; set; }
        public double RotationX { get; set; }
        public double RotationY { get; set; }
        public double RotationZ { get; set; }
        public bool CanDisassemble { get; set; }
        public int DisassembleOrder { get; set; }
        public string StatusTag { get; set; }
        public string Description { get; set; }
    }

    public class DisassemblyStep
    {
        public int Id { get; set; }
        public int Device3DModelId { get; set; }
        public int StepNumber { get; set; }
        public string StepName { get; set; }
        public string Description { get; set; }
        public List<DeviceComponent> Components { get; set; }
        public double AnimationDuration { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class Order
    {
        public int Id { get; set; }
        public string OrderId { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }
        public int Quantity { get; set; }
        public int Priority { get; set; }
        public DateTime DueDate { get; set; }
        public DateTime OrderDate { get; set; }
        public string Status { get; set; }
        public string Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        public string StatusDisplayName
        {
            get
            {
                return Status switch
                {
                    "pending" => "待排程",
                    "scheduled" => "已排程",
                    "in_progress" => "进行中",
                    "completed" => "已完成",
                    "cancelled" => "已取消",
                    _ => Status
                };
            }
        }
    }

    public class Product
    {
        public int Id { get; set; }
        public string ProductId { get; set; }
        public string ProductName { get; set; }
        public string Description { get; set; }
        public double StandardCycleTime { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class Resource
    {
        public int Id { get; set; }
        public string ResourceId { get; set; }
        public string ResourceName { get; set; }
        public string ResourceType { get; set; }
        public string Status { get; set; }
        public double Capacity { get; set; }
        public double CostPerHour { get; set; }
        public string Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        public string StatusDisplayName
        {
            get
            {
                return Status switch
                {
                    "available" => "可用",
                    "in_use" => "使用中",
                    "maintenance" => "维护中",
                    "unavailable" => "不可用",
                    _ => Status
                };
            }
        }
    }

    public class Mold
    {
        public int Id { get; set; }
        public string MoldId { get; set; }
        public string MoldName { get; set; }
        public int ProductId { get; set; }
        public string Status { get; set; }
        public double RemainingLife { get; set; }
        public double TotalLife { get; set; }
        public string Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        public string StatusDisplayName
        {
            get
            {
                return Status switch
                {
                    "available" => "可用",
                    "in_use" => "使用中",
                    "maintenance" => "维护中",
                    "unavailable" => "不可用",
                    _ => Status
                };
            }
        }
        
        public double LifePercentage => RemainingLife / TotalLife * 100;
    }

    public class Material
    {
        public int Id { get; set; }
        public string MaterialId { get; set; }
        public string MaterialName { get; set; }
        public string Description { get; set; }
        public string Unit { get; set; }
        public double SafetyStock { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class Employee
    {
        public int Id { get; set; }
        public string EmployeeId { get; set; }
        public string Name { get; set; }
        public int SkillLevel { get; set; }
        public string Status { get; set; }
        public double CostPerHour { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        public string StatusDisplayName
        {
            get
            {
                return Status switch
                {
                    "available" => "可用",
                    "on_shift" => "当班",
                    "on_leave" => "休假",
                    "unavailable" => "不可用",
                    _ => Status
                };
            }
        }
    }

    public class WorkCenter
    {
        public int Id { get; set; }
        public string WorkCenterId { get; set; }
        public string WorkCenterName { get; set; }
        public int? ProductionLineId { get; set; }
        public int Capacity { get; set; }
        public string Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ProcessRoute
    {
        public int Id { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }
        public string RouteName { get; set; }
        public bool IsPrimary { get; set; }
        public string Description { get; set; }
        public List<ProcessStep> Steps { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ProcessStep
    {
        public int Id { get; set; }
        public int ProcessRouteId { get; set; }
        public int StepNumber { get; set; }
        public string StepName { get; set; }
        public int WorkCenterId { get; set; }
        public WorkCenter WorkCenter { get; set; }
        public bool RequiredMold { get; set; }
        public double CycleTime { get; set; }
        public double SetupTime { get; set; }
        public int EmployeeCount { get; set; }
        public string ResourceType { get; set; }
        public int ResourceCount { get; set; }
        public string Description { get; set; }
    }

    public class ScheduleRun
    {
        public int Id { get; set; }
        public string RunId { get; set; }
        public string RunName { get; set; }
        public string Status { get; set; }
        public DateTime? StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string AlgorithmName { get; set; }
        public string Parameters { get; set; }
        public string ObjectiveFunction { get; set; }
        public double? ResultMakespan { get; set; }
        public double? ResultTotalCost { get; set; }
        public int? ResultLateOrders { get; set; }
        public double? ResultResourceUtilization { get; set; }
        public string Notes { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<ScheduleJob> Jobs { get; set; }
        
        public string StatusDisplayName
        {
            get
            {
                return Status switch
                {
                    "pending" => "待执行",
                    "running" => "执行中",
                    "completed" => "已完成",
                    "failed" => "失败",
                    _ => Status
                };
            }
        }
    }

    public class ScheduleJob
    {
        public int Id { get; set; }
        public int ScheduleRunId { get; set; }
        public int OrderId { get; set; }
        public Order Order { get; set; }
        public int ProcessStepId { get; set; }
        public ProcessStep ProcessStep { get; set; }
        public string JobId { get; set; }
        public int WorkCenterId { get; set; }
        public WorkCenter WorkCenter { get; set; }
        public int? MoldId { get; set; }
        public string Status { get; set; }
        public DateTime PlannedStartTime { get; set; }
        public DateTime PlannedEndTime { get; set; }
        public DateTime? ActualStartTime { get; set; }
        public DateTime? ActualEndTime { get; set; }
        public double SetupTimeUsed { get; set; }
        public double CycleTimeUsed { get; set; }
        public int Quantity { get; set; }
        public bool IsLate { get; set; }
        public int Priority { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        
        public string StatusDisplayName
        {
            get
            {
                return Status switch
                {
                    "scheduled" => "已排程",
                    "in_progress" => "进行中",
                    "completed" => "已完成",
                    "delayed" => "延期",
                    _ => Status
                };
            }
        }
    }
}
