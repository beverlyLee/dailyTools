"""
产线 3D 监控服务 (Production Line 3D Monitoring Service)
独立模块，用于实时映射 PLC 数据到 3D 设备状态，支持设备拆解查看内部结构。
"""

import asyncio
import json
import websockets
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DeviceStatus(Enum):
    RUNNING = "running"
    STOPPED = "stopped"
    FAULT = "fault"
    MAINTENANCE = "maintenance"


class ComponentStatus(Enum):
    NORMAL = "normal"
    WARNING = "warning"
    FAULT = "fault"


@dataclass
class Vector3D:
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


@dataclass
class DeviceComponent:
    component_id: str
    component_name: str
    mesh_name: str
    position: Vector3D = field(default_factory=Vector3D)
    rotation: Vector3D = field(default_factory=Vector3D)
    scale: float = 1.0
    can_disassemble: bool = True
    disassemble_order: int = 0
    status_tag: Optional[str] = None
    status: ComponentStatus = ComponentStatus.NORMAL
    is_hidden: bool = False
    is_animated: bool = False


@dataclass
class DisassemblyStep:
    step_number: int
    step_name: str
    description: str
    components: List[str] = field(default_factory=list)
    animation_duration: float = 1.0
    target_position: Vector3D = field(default_factory=Vector3D)
    target_rotation: Vector3D = field(default_factory=Vector3D)


@dataclass
class Device3DModel:
    device_id: str
    device_name: str
    model_path: str
    model_format: str = "glb"
    scale_factor: float = 1.0
    position: Vector3D = field(default_factory=Vector3D)
    rotation: Vector3D = field(default_factory=Vector3D)
    status: DeviceStatus = DeviceStatus.STOPPED
    components: Dict[str, DeviceComponent] = field(default_factory=dict)
    disassembly_steps: List[DisassemblyStep] = field(default_factory=list)
    current_disassembly_step: int = -1
    is_disassembling: bool = False
    plc_tags: Dict[str, str] = field(default_factory=dict)
    last_updated: datetime = field(default_factory=datetime.now)


@dataclass
class ProductionLine3D:
    line_id: str
    line_name: str
    devices: Dict[str, Device3DModel] = field(default_factory=dict)
    floor_plan: str = ""
    background_color: str = "#1A1A2E"
    ambient_light: float = 0.5


class PLCDataMapper:
    def __init__(self):
        self.tag_mappings: Dict[str, Dict] = {}
        self.device_status_map: Dict[str, DeviceStatus] = {}
        
    def add_mapping(self, device_id: str, tag_name: str, mapping_type: str, rules: Dict):
        if device_id not in self.tag_mappings:
            self.tag_mappings[device_id] = {}
        self.tag_mappings[device_id][tag_name] = {
            "type": mapping_type,
            "rules": rules
        }
        
    def map_plc_data(self, device_id: str, tag_name: str, tag_value: str) -> Optional[Dict]:
        if device_id not in self.tag_mappings:
            return None
        if tag_name not in self.tag_mappings[device_id]:
            return None
            
        mapping = self.tag_mappings[device_id][tag_name]
        mapping_type = mapping["type"]
        rules = mapping["rules"]
        
        if mapping_type == "device_status":
            return self._map_device_status(tag_value, rules)
        elif mapping_type == "component_status":
            return self._map_component_status(tag_value, rules)
        elif mapping_type == "numeric_value":
            return self._map_numeric_value(tag_value, rules)
        else:
            return None
            
    def _map_device_status(self, value: str, rules: Dict) -> Dict:
        status = DeviceStatus.STOPPED
        status_str = value.strip().lower()
        
        status_mapping = {
            "running": DeviceStatus.RUNNING,
            "run": DeviceStatus.RUNNING,
            "1": DeviceStatus.RUNNING,
            "stopped": DeviceStatus.STOPPED,
            "stop": DeviceStatus.STOPPED,
            "0": DeviceStatus.STOPPED,
            "fault": DeviceStatus.FAULT,
            "error": DeviceStatus.FAULT,
            "alarm": DeviceStatus.FAULT,
            "maintenance": DeviceStatus.MAINTENANCE,
            "maint": DeviceStatus.MAINTENANCE,
        }
        
        status = status_mapping.get(status_str, DeviceStatus.STOPPED)
        
        return {
            "type": "device_status",
            "value": status.value,
            "status_enum": status
        }
        
    def _map_component_status(self, value: str, rules: Dict) -> Dict:
        status = ComponentStatus.NORMAL
        
        try:
            num_value = float(value)
            warning_threshold = rules.get("warning_threshold", 50)
            fault_threshold = rules.get("fault_threshold", 100)
            
            if num_value >= fault_threshold:
                status = ComponentStatus.FAULT
            elif num_value >= warning_threshold:
                status = ComponentStatus.WARNING
        except ValueError:
            status_str = value.strip().lower()
            if status_str in ["fault", "error", "fail"]:
                status = ComponentStatus.FAULT
            elif status_str in ["warning", "alarm"]:
                status = ComponentStatus.WARNING
                
        return {
            "type": "component_status",
            "value": status.value,
            "status_enum": status
        }
        
    def _map_numeric_value(self, value: str, rules: Dict) -> Dict:
        try:
            num_value = float(value)
            unit = rules.get("unit", "")
            scale = rules.get("scale", 1.0)
            scaled_value = num_value * scale
            
            return {
                "type": "numeric_value",
                "value": scaled_value,
                "unit": unit,
                "original_value": num_value
            }
        except ValueError:
            return {
                "type": "numeric_value",
                "value": 0,
                "unit": "",
                "error": f"无法转换数值: {value}"
            }


class DeviceDisassemblyManager:
    def __init__(self):
        self.device: Optional[Device3DModel] = None
        self.animation_callbacks = []
        
    def load_device(self, device: Device3DModel):
        self.device = device
        self._reset_components()
        
    def _reset_components(self):
        if not self.device:
            return
        for comp in self.device.components.values():
            comp.is_hidden = False
            comp.is_animated = False
            comp.position = Vector3D()
            
    def get_current_step(self) -> Optional[DisassemblyStep]:
        if not self.device or self.device.current_disassembly_step < 0:
            return None
        if self.device.current_disassembly_step >= len(self.device.disassembly_steps):
            return None
        return self.device.disassembly_steps[self.device.current_disassembly_step]
        
    def can_go_next(self) -> bool:
        if not self.device:
            return False
        return self.device.current_disassembly_step < len(self.device.disassembly_steps) - 1
        
    def can_go_previous(self) -> bool:
        if not self.device:
            return False
        return self.device.current_disassembly_step > 0
        
    async def next_step(self) -> Dict:
        if not self.can_go_next():
            return {"success": False, "message": "已到达最后一步"}
            
        self.device.is_disassembling = True
        self.device.current_disassembly_step += 1
        
        step = self.get_current_step()
        if not step:
            return {"success": False, "message": "步骤无效"}
            
        await self._animate_step(step, forward=True)
        
        return {
            "success": True,
            "step_number": step.step_number,
            "step_name": step.step_name,
            "description": step.description,
            "components": step.components
        }
        
    async def previous_step(self) -> Dict:
        if not self.can_go_previous():
            return {"success": False, "message": "已到达第一步"}
            
        self.device.is_disassembling = True
        step = self.get_current_step()
        
        if step:
            await self._animate_step(step, forward=False)
            
        self.device.current_disassembly_step -= 1
        
        return {
            "success": True,
            "step_number": self.device.current_disassembly_step + 1,
            "message": "已返回上一步"
        }
        
    async def _animate_step(self, step: DisassemblyStep, forward: bool):
        for comp_id in step.components:
            if comp_id not in self.device.components:
                continue
                
            comp = self.device.components[comp_id]
            comp.is_animated = True
            
            if forward:
                comp.position = step.target_position
                comp.is_hidden = False
            else:
                comp.position = Vector3D()
                comp.is_hidden = False
                
            await asyncio.sleep(step.animation_duration / len(step.components))
            comp.is_animated = False
            
    async def reset(self) -> Dict:
        if not self.device:
            return {"success": False, "message": "没有加载设备"}
            
        self.device.current_disassembly_step = -1
        self.device.is_disassembling = False
        self._reset_components()
        
        return {
            "success": True,
            "message": "已重置到初始状态"
        }
        
    def get_disassembly_progress(self) -> Dict:
        if not self.device:
            return {"progress": 0, "total_steps": 0, "current_step": -1}
            
        total_steps = len(self.device.disassembly_steps)
        current_step = self.device.current_disassembly_step + 1
        
        return {
            "progress": current_step / total_steps * 100 if total_steps > 0 else 0,
            "total_steps": total_steps,
            "current_step": current_step,
            "is_disassembling": self.device.is_disassembling
        }


class ProductionLine3DService:
    def __init__(self):
        self.production_lines: Dict[str, ProductionLine3D] = {}
        self.plc_mapper = PLCDataMapper()
        self.disassembly_manager = DeviceDisassemblyManager()
        self.websocket_clients: set = set()
        self.update_callbacks = []
        
    def create_production_line(self, line_id: str, line_name: str) -> ProductionLine3D:
        line = ProductionLine3D(
            line_id=line_id,
            line_name=line_name
        )
        self.production_lines[line_id] = line
        return line
        
    def add_device_to_line(self, line_id: str, device: Device3DModel) -> bool:
        if line_id not in self.production_lines:
            return False
        self.production_lines[line_id].devices[device.device_id] = device
        return True
        
    def remove_device_from_line(self, line_id: str, device_id: str) -> bool:
        if line_id not in self.production_lines:
            return False
        if device_id not in self.production_lines[line_id].devices:
            return False
        del self.production_lines[line_id].devices[device_id]
        return True
        
    def get_device(self, line_id: str, device_id: str) -> Optional[Device3DModel]:
        if line_id not in self.production_lines:
            return None
        return self.production_lines[line_id].devices.get(device_id)
        
    def update_device_from_plc(self, line_id: str, device_id: str, 
                           tag_name: str, tag_value: str, timestamp: datetime = None) -> Dict:
        device = self.get_device(line_id, device_id)
        if not device:
            return {"success": False, "message": f"设备 {device_id} 不存在"}
            
        mapping_result = self.plc_mapper.map_plc_data(device_id, tag_name, tag_value)
        
        if mapping_result:
            if mapping_result["type"] == "device_status":
                old_status = device.status
                new_status = mapping_result["status_enum"]
                if old_status != new_status:
                    device.status = new_status
                    device.last_updated = timestamp or datetime.now()
                    
                    self._broadcast_status_change(device, old_status, new_status)
                    
                    return {
                        "success": True,
                        "type": "device_status",
                        "device_id": device_id,
                        "old_status": old_status.value,
                        "new_status": new_status.value,
                        "timestamp": device.last_updated.isoformat()
                    }
                    
            elif mapping_result["type"] == "component_status":
                for comp in device.components.values():
                    if comp.status_tag == tag_name:
                        old_status = comp.status
                        new_status = mapping_result["status_enum"]
                        if old_status != new_status:
                            comp.status = new_status
                            device.last_updated = timestamp or datetime.now()
                            
                            return {
                                "success": True,
                                "type": "component_status",
                                "device_id": device_id,
                                "component_id": comp.component_id,
                                "component_name": comp.component_name,
                                "old_status": old_status.value,
                                "new_status": new_status.value,
                                "timestamp": device.last_updated.isoformat()
                            }
                            
        device.plc_tags[tag_name] = tag_value
        device.last_updated = timestamp or datetime.now()
        
        return {
            "success": True,
            "type": "plc_data",
            "device_id": device_id,
            "tag_name": tag_name,
            "tag_value": tag_value,
            "timestamp": device.last_updated.isoformat()
        }
        
    def _broadcast_status_change(self, device: Device3DModel, 
                                    old_status: DeviceStatus, new_status: DeviceStatus):
        message = json.dumps({
            "type": "device_status_change",
            "device_id": device.device_id,
            "device_name": device.device_name,
            "old_status": old_status.value,
            "new_status": new_status.value,
            "timestamp": datetime.now().isoformat()
        })
        
        for callback in self.update_callbacks:
            try:
                callback(message)
            except Exception as e:
                logger.error(f"Callback error: {e}")
                
    def get_line_status(self, line_id: str) -> Dict:
        if line_id not in self.production_lines:
            return {"success": False, "message": f"产线 {line_id} 不存在"}
            
        line = self.production_lines[line_id]
        
        status_counts = {
            "running": 0,
            "stopped": 0,
            "fault": 0,
            "maintenance": 0
        }
        
        for device in line.devices.values():
            status_counts[device.status.value] += 1
            
        total_devices = len(line.devices)
        efficiency = (status_counts["running"] / total_devices * 100) if total_devices > 0 else 0
        
        return {
            "success": True,
            "line_id": line.line_id,
            "line_name": line.line_name,
            "total_devices": total_devices,
            "status_counts": status_counts,
            "efficiency_percent": efficiency,
            "last_updated": datetime.now().isoformat()
        }
        
    def get_device_scene_data(self, line_id: str, device_id: str) -> Dict:
        device = self.get_device(line_id, device_id)
        if not device:
            return {"success": False, "message": f"设备 {device_id} 不存在"}
            
        components_data = []
        for comp_id, comp in device.components.items():
            components_data.append({
                "component_id": comp.component_id,
                "component_name": comp.component_name,
                "mesh_name": comp.mesh_name,
                "position": {"x": comp.position.x, "y": comp.position.y, "z": comp.position.z},
                "rotation": {"x": comp.rotation.x, "y": comp.rotation.y, "z": comp.rotation.z},
                "scale": comp.scale,
                "can_disassemble": comp.can_disassemble,
                "disassemble_order": comp.disassemble_order,
                "status": comp.status.value,
                "is_hidden": comp.is_hidden,
                "is_animated": comp.is_animated
            })
            
        disassembly_steps_data = []
        for step in device.disassembly_steps:
            disassembly_steps_data.append({
                "step_number": step.step_number,
                "step_name": step.step_name,
                "description": step.description,
                "components": step.components,
                "animation_duration": step.animation_duration,
                "target_position": {"x": step.target_position.x, "y": step.target_position.y, "z": step.target_position.z}
            })
            
        return {
            "success": True,
            "device_id": device.device_id,
            "device_name": device.device_name,
            "model_path": device.model_path,
            "model_format": device.model_format,
            "scale_factor": device.scale_factor,
            "position": {"x": device.position.x, "y": device.position.y, "z": device.position.z},
            "rotation": {"x": device.rotation.x, "y": device.rotation.y, "z": device.rotation.z},
            "status": device.status.value,
            "components": components_data,
            "disassembly_steps": disassembly_steps_data,
            "current_disassembly_step": device.current_disassembly_step,
            "is_disassembling": device.is_disassembling,
            "plc_tags": device.plc_tags,
            "last_updated": device.last_updated.isoformat()
        }
        
    def get_line_scene_data(self, line_id: str) -> Dict:
        if line_id not in self.production_lines:
            return {"success": False, "message": f"产线 {line_id} 不存在"}
            
        line = self.production_lines[line_id]
        
        devices_data = []
        for device_id, device in line.devices.items():
            devices_data.append({
                "device_id": device.device_id,
                "device_name": device.device_name,
                "model_path": device.model_path,
                "position": {"x": device.position.x, "y": device.position.y, "z": device.position.z},
                "rotation": {"x": device.rotation.x, "y": device.rotation.y, "z": device.rotation.z},
                "scale": device.scale_factor,
                "status": device.status.value,
                "has_internal_structure": len(device.disassembly_steps) > 0
            })
            
        return {
            "success": True,
            "line_id": line.line_id,
            "line_name": line.line_name,
            "devices": devices_data,
            "floor_plan": line.floor_plan,
            "background_color": line.background_color,
            "ambient_light": line.ambient_light
        }
        
    def register_update_callback(self, callback):
        self.update_callbacks.append(callback)
        
    def unregister_update_callback(self, callback):
        if callback in self.update_callbacks:
            self.update_callbacks.remove(callback)


def create_sample_production_line() -> ProductionLine3DService:
    service = ProductionLine3DService()
    
    line = service.create_production_line("LINE-001", "智能加工生产线")
    line.background_color = "#0A0A1A"
    line.ambient_light = 0.6
    
    device1 = Device3DModel(
        device_id="CNC-001",
        device_name="数控铣床 #1",
        model_path="models/cnc_mill.glb",
        position=Vector3D(-5, 0, 0),
        status=DeviceStatus.RUNNING
    )
    
    comp1_1 = DeviceComponent(
        component_id="SPINDLE-001",
        component_name="主轴",
        mesh_name="spindle",
        position=Vector3D(0, 0.5, 0),
        can_disassemble=True,
        disassemble_order=1,
        status_tag="SPINDLE_TEMP"
    )
    
    comp1_2 = DeviceComponent(
        component_id="TOOL_CHUCK-001",
        component_name="刀库",
        mesh_name="tool_changer",
        position=Vector3D(1, 0, 0),
        can_disassemble=True,
        disassemble_order=2,
        status_tag="TOOL_COUNT"
    )
    
    comp1_3 = DeviceComponent(
        component_id="COVER-001",
        component_name="护罩",
        mesh_name="protective_cover",
        position=Vector3D(0, 0, 0),
        can_disassemble=True,
        disassemble_order=0
    )
    
    device1.components = {
        "SPINDLE-001": comp1_1,
        "TOOL_CHUCK-001": comp1_2,
        "COVER-001": comp1_3
    }
    
    step1_1 = DisassemblyStep(
        step_number=1,
        step_name="拆卸护罩",
        description="使用内六角扳手拧下护罩固定螺丝，然后轻轻取下护罩。",
        components=["COVER-001"],
        animation_duration=2.0,
        target_position=Vector3D(0, 2, 0)
    )
    
    step1_2 = DisassemblyStep(
        step_number=2,
        step_name="拆卸主轴",
        description="关闭主轴电源，使用专用工具拆卸主轴固定螺栓。",
        components=["SPINDLE-001"],
        animation_duration=3.0,
        target_position=Vector3D(0, 3, 0)
    )
    
    step1_3 = DisassemblyStep(
        step_number=3,
        step_name="拆卸刀库",
        description="先将刀库中的刀具全部取出，然后拆卸刀库固定架。",
        components=["TOOL_CHUCK-001"],
        animation_duration=2.5,
        target_position=Vector3D(2, 1, 0)
    )
    
    device1.disassembly_steps = [step1_1, step1_2, step1_3]
    
    device2 = Device3DModel(
        device_id="CNC-002",
        device_name="数控车床 #1",
        model_path="models/cnc_lathe.glb",
        position=Vector3D(0, 0, 0),
        status=DeviceStatus.RUNNING
    )
    
    device3 = Device3DModel(
        device_id="ROBOT-001",
        device_name="工业机器人 #1",
        model_path="models/industrial_robot.glb",
        position=Vector3D(5, 0, 0),
        status=DeviceStatus.STOPPED
    )
    
    device4 = Device3DModel(
        device_id="INSPECTION-001",
        device_name="质量检测站",
        model_path="models/inspection_station.glb",
        position=Vector3D(10, 0, 0),
        status=DeviceStatus.MAINTENANCE
    )
    
    service.add_device_to_line("LINE-001", device1)
    service.add_device_to_line("LINE-001", device2)
    service.add_device_to_line("LINE-001", device3)
    service.add_device_to_line("LINE-001", device4)
    
    service.plc_mapper.add_mapping(
        "CNC-001",
        "MACHINE_STATUS",
        "device_status",
        {"running_values": ["1", "running", "RUN"],
         "stopped_values": ["0", "stopped", "STOP"],
         "fault_values": ["2", "fault", "ERROR", "ALARM"]}
    )
    
    service.plc_mapper.add_mapping(
        "CNC-001",
        "SPINDLE_TEMP",
        "component_status",
        {"warning_threshold": 60,
         "fault_threshold": 85}
    )
    
    service.plc_mapper.add_mapping(
        "CNC-001",
        "FEED_RATE",
        "numeric_value",
        {"unit": "mm/min",
         "scale": 1.0}
    )
    
    return service


if __name__ == "__main__":
    service = create_sample_production_line()
    
    print("=" * 60)
    print("产线 3D 监控服务 - 示例")
    print("=" * 60)
    
    line_status = service.get_line_status("LINE-001")
    print(f"\n产线状态:")
    print(f"  产线ID: {line_status['line_id']}")
    print(f"  产线名称: {line_status['line_name']}")
    print(f"  设备总数: {line_status['total_devices']}")
    print(f"  运行中: {line_status['status_counts']['running']}")
    print(f"  已停机: {line_status['status_counts']['stopped']}")
    print(f"  故障: {line_status['status_counts']['fault']}")
    print(f"  维护中: {line_status['status_counts']['maintenance']}")
    print(f"  效率: {line_status['efficiency_percent']:.1f}%")
    
    scene_data = service.get_line_scene_data("LINE-001")
    print(f"\n产线 3D 场景数据:")
    print(f"  设备数量: {len(scene_data['devices'])}")
    print(f"  背景颜色: {scene_data['background_color']}")
    print(f"  环境光: {scene_data['ambient_light']}")
    
    device_data = service.get_device_scene_data("LINE-001", "CNC-001")
    print(f"\n设备 3D 场景数据 (CNC-001):")
    print(f"  设备名称: {device_data['device_name']}")
    print(f"  模型路径: {device_data['model_path']}")
    print(f"  当前状态: {device_data['status']}")
    print(f"  组件数量: {len(device_data['components'])}")
    print(f"  拆解步骤: {len(device_data['disassembly_steps'])}")
    
    print(f"\n" + "=" * 60)
    print("模拟 PLC 数据更新")
    print("=" * 60)
    
    result1 = service.update_device_from_plc(
        "LINE-001",
        "CNC-001",
        "MACHINE_STATUS",
        "1"
    )
    print(f"\n设备状态更新结果: {result1['success']}")
    if result1['success']:
        print(f"  类型: {result1['type']}")
        print(f"  旧状态: {result1.get('old_status', 'N/A')}")
        print(f"  新状态: {result1.get('new_status', 'N/A')}")
    
    result2 = service.update_device_from_plc(
        "LINE-001",
        "CNC-001",
        "SPINDLE_TEMP",
        "75.5"
    )
    print(f"\n组件状态更新结果: {result2['success']}")
    
    result3 = service.update_device_from_plc(
        "LINE-001",
        "CNC-001",
        "FEED_RATE",
        "2500"
    )
    print(f"\n数值数据更新结果: {result3['success']}")
    
    print(f"\n" + "=" * 60)
    print("设备拆解功能演示")
    print("=" * 60)
    
    device = service.get_device("LINE-001", "CNC-001")
    service.disassembly_manager.load_device(device)
    
    progress = service.disassembly_manager.get_disassembly_progress()
    print(f"\n初始拆解进度:")
    print(f"  总步骤: {progress['total_steps']}")
    print(f"  当前步骤: {progress['current_step']}")
    print(f"  进度: {progress['progress']:.1f}%")
    
    import asyncio
    
    async def demo_disassembly():
        print(f"\n开始拆解...")
        
        step1 = await service.disassembly_manager.next_step()
        print(f"\n步骤1结果: {step1['success']}")
        if step1['success']:
            print(f"  步骤名称: {step1['step_name']}")
            print(f"  描述: {step1['description']}")
        
        progress = service.disassembly_manager.get_disassembly_progress()
        print(f"\n拆解进度: {progress['progress']:.1f}%")
        
        step2 = await service.disassembly_manager.next_step()
        print(f"\n步骤2结果: {step2['success']}")
        
        progress = service.disassembly_manager.get_disassembly_progress()
        print(f"\n拆解进度: {progress['progress']:.1f}%")
        
        step3 = await service.disassembly_manager.next_step()
        print(f"\n步骤3结果: {step3['success']}")
        
        progress = service.disassembly_manager.get_disassembly_progress()
        print(f"\n最终拆解进度: {progress['progress']:.1f}%")
        
        reset_result = await service.disassembly_manager.reset()
        print(f"\n重置结果: {reset_result['success']}")
        
    asyncio.run(demo_disassembly())
    
    print(f"\n" + "=" * 60)
    print("演示完成")
    print("=" * 60)
