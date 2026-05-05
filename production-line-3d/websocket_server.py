"""
产线 3D 监控服务 - WebSocket 服务器
用于实时推送 PLC 数据和设备状态更新到 3D 视图
"""

import asyncio
import json
import websockets
from typing import Set
import logging
from datetime import datetime
from production_line_3d_service import ProductionLine3DService, create_sample_production_line

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ProductionLine3DWebSocketServer:
    def __init__(self, service: ProductionLine3DService, host: str = "localhost", port: int = 8765):
        self.service = service
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.running = False
        
        self.service.register_update_callback(self._on_device_update)
        
    def _on_device_update(self, message: str):
        asyncio.create_task(self._broadcast(message))
        
    async def _broadcast(self, message: str):
        if not self.clients:
            return
            
        disconnected = set()
        for websocket in self.clients:
            try:
                await websocket.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(websocket)
                
        self.clients -= disconnected
        
    async def handle_client(self, websocket: websockets.WebSocketServerProtocol, path: str):
        self.clients.add(websocket)
        client_id = id(websocket)
        logger.info(f"Client {client_id} connected from {websocket.remote_address}")
        
        try:
            async for message in websocket:
                try:
                    data = json.loads(message)
                    response = await self._handle_message(data)
                    if response:
                        await websocket.send(json.dumps(response))
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        "success": False,
                        "error": "Invalid JSON format"
                    }))
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client {client_id} disconnected")
        finally:
            self.clients.remove(websocket)
            
    async def _handle_message(self, data: dict) -> dict:
        message_type = data.get("type")
        
        if message_type == "get_line_status":
            line_id = data.get("line_id")
            if not line_id:
                return {"success": False, "error": "line_id is required"}
            return self.service.get_line_status(line_id)
            
        elif message_type == "get_line_scene":
            line_id = data.get("line_id")
            if not line_id:
                return {"success": False, "error": "line_id is required"}
            return self.service.get_line_scene_data(line_id)
            
        elif message_type == "get_device_scene":
            line_id = data.get("line_id")
            device_id = data.get("device_id")
            if not line_id or not device_id:
                return {"success": False, "error": "line_id and device_id are required"}
            return self.service.get_device_scene_data(line_id, device_id)
            
        elif message_type == "update_plc_data":
            line_id = data.get("line_id")
            device_id = data.get("device_id")
            tag_name = data.get("tag_name")
            tag_value = data.get("tag_value")
            timestamp = data.get("timestamp")
            
            if not all([line_id, device_id, tag_name, tag_value]):
                return {"success": False, "error": "line_id, device_id, tag_name, tag_value are required"}
                
            try:
                ts = datetime.fromisoformat(timestamp) if timestamp else None
            except ValueError:
                ts = None
                
            result = self.service.update_device_from_plc(
                line_id, device_id, tag_name, tag_value, ts
            )
            
            if result.get("type") in ["device_status", "component_status"]:
                pass
                
            return result
            
        elif message_type == "disassembly_next_step":
            line_id = data.get("line_id")
            device_id = data.get("device_id")
            
            if not line_id or not device_id:
                return {"success": False, "error": "line_id and device_id are required"}
                
            device = self.service.get_device(line_id, device_id)
            if not device:
                return {"success": False, "error": f"Device {device_id} not found"}
                
            self.service.disassembly_manager.load_device(device)
            result = await self.service.disassembly_manager.next_step()
            
            if result.get("success"):
                progress = self.service.disassembly_manager.get_disassembly_progress()
                result["progress"] = progress
                
                scene_data = self.service.get_device_scene_data(line_id, device_id)
                result["device_scene"] = scene_data
                
            return result
            
        elif message_type == "disassembly_previous_step":
            line_id = data.get("line_id")
            device_id = data.get("device_id")
            
            if not line_id or not device_id:
                return {"success": False, "error": "line_id and device_id are required"}
                
            device = self.service.get_device(line_id, device_id)
            if not device:
                return {"success": False, "error": f"Device {device_id} not found"}
                
            self.service.disassembly_manager.load_device(device)
            result = await self.service.disassembly_manager.previous_step()
            
            if result.get("success"):
                progress = self.service.disassembly_manager.get_disassembly_progress()
                result["progress"] = progress
                
                scene_data = self.service.get_device_scene_data(line_id, device_id)
                result["device_scene"] = scene_data
                
            return result
            
        elif message_type == "disassembly_reset":
            line_id = data.get("line_id")
            device_id = data.get("device_id")
            
            if not line_id or not device_id:
                return {"success": False, "error": "line_id and device_id are required"}
                
            device = self.service.get_device(line_id, device_id)
            if not device:
                return {"success": False, "error": f"Device {device_id} not found"}
                
            self.service.disassembly_manager.load_device(device)
            result = await self.service.disassembly_manager.reset()
            
            if result.get("success"):
                scene_data = self.service.get_device_scene_data(line_id, device_id)
                result["device_scene"] = scene_data
                
            return result
            
        elif message_type == "disassembly_progress":
            line_id = data.get("line_id")
            device_id = data.get("device_id")
            
            if not line_id or not device_id:
                return {"success": False, "error": "line_id and device_id are required"}
                
            device = self.service.get_device(line_id, device_id)
            if not device:
                return {"success": False, "error": f"Device {device_id} not found"}
                
            self.service.disassembly_manager.load_device(device)
            progress = self.service.disassembly_manager.get_disassembly_progress()
            
            return {
                "success": True,
                "progress": progress
            }
            
        else:
            return {
                "success": False,
                "error": f"Unknown message type: {message_type}"
            }
            
    async def start(self):
        self.running = True
        logger.info(f"Starting WebSocket server on ws://{self.host}:{self.port}")
        
        async with websockets.serve(self.handle_client, self.host, self.port):
            while self.running:
                await asyncio.sleep(1)
                
    async def stop(self):
        self.running = False
        logger.info("Stopping WebSocket server...")


async def main():
    service = create_sample_production_line()
    
    server = ProductionLine3DWebSocketServer(service, host="localhost", port=8765)
    
    print("=" * 60)
    print("产线 3D 监控 WebSocket 服务器")
    print("=" * 60)
    print(f"服务器地址: ws://localhost:8765")
    print("可用命令:")
    print("  - get_line_status: 获取产线状态")
    print("  - get_line_scene: 获取产线3D场景数据")
    print("  - get_device_scene: 获取设备3D场景数据")
    print("  - update_plc_data: 更新PLC数据")
    print("  - disassembly_next_step: 下一步拆解")
    print("  - disassembly_previous_step: 上一步拆解")
    print("  - disassembly_reset: 重置拆解")
    print("  - disassembly_progress: 获取拆解进度")
    print("=" * 60)
    print("按 Ctrl+C 停止服务器")
    print("=" * 60)
    
    try:
        await server.start()
    except KeyboardInterrupt:
        await server.stop()


if __name__ == "__main__":
    asyncio.run(main())
