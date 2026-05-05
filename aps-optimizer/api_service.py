"""
APS 排程优化器 - API 服务
提供 REST API 接口用于排程优化和可视化
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from aiohttp import web
import logging
from genetic_algorithm_scheduler import (
    GeneticAlgorithmScheduler, Order, Product, ProcessStep, 
    WorkCenter, Resource, Mold, Employee, Material
)
from visualization import ScheduleVisualizer, GanttChartGenerator, ResourceLoadVisualizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class APSService:
    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.scheduler = GeneticAlgorithmScheduler(self.config.get('algorithm', {}))
        self.visualizer = ScheduleVisualizer()
        
        self._setup_sample_data()
        
    def _setup_sample_data(self):
        work_center1 = WorkCenter(
            work_center_id="WC-001",
            work_center_name="数控加工中心",
            capacity=2
        )
        
        work_center2 = WorkCenter(
            work_center_id="WC-002",
            work_center_name="装配中心",
            capacity=3
        )
        
        work_center3 = WorkCenter(
            work_center_id="WC-003",
            work_center_name="质量检测中心",
            capacity=1
        )
        
        self.scheduler.set_work_centers({
            "WC-001": work_center1,
            "WC-002": work_center2,
            "WC-003": work_center3
        })
        
        step1 = ProcessStep(
            step_number=1,
            step_name="粗加工",
            work_center_id="WC-001",
            cycle_time=5.0,
            setup_time=10.0,
            employee_count=1,
            required_mold=True
        )
        
        step2 = ProcessStep(
            step_number=2,
            step_name="精加工",
            work_center_id="WC-001",
            cycle_time=8.0,
            setup_time=5.0,
            employee_count=1,
            predecessors=[1]
        )
        
        step3 = ProcessStep(
            step_number=3,
            step_name="装配",
            work_center_id="WC-002",
            cycle_time=15.0,
            setup_time=5.0,
            employee_count=2,
            predecessors=[2]
        )
        
        step4 = ProcessStep(
            step_number=4,
            step_name="质量检测",
            work_center_id="WC-003",
            cycle_time=3.0,
            setup_time=2.0,
            employee_count=1,
            predecessors=[3]
        )
        
        product1 = Product(
            product_id="PROD-001",
            product_name="精密齿轮",
            standard_cycle_time=31.0,
            process_steps=[step1, step2, step3, step4],
            material_requirements={
                "MAT-001": 2.0,
                "MAT-002": 0.5
            }
        )
        
        step1_alt = ProcessStep(
            step_number=1,
            step_name="冲压成型",
            work_center_id="WC-001",
            cycle_time=3.0,
            setup_time=8.0,
            employee_count=1,
            required_mold=True
        )
        
        step2_alt = ProcessStep(
            step_number=2,
            step_name="表面处理",
            work_center_id="WC-002",
            cycle_time=10.0,
            setup_time=3.0,
            employee_count=1,
            predecessors=[1]
        )
        
        step3_alt = ProcessStep(
            step_number=3,
            step_name="检测包装",
            work_center_id="WC-003",
            cycle_time=2.0,
            setup_time=1.0,
            employee_count=1,
            predecessors=[2]
        )
        
        product2 = Product(
            product_id="PROD-002",
            product_name="金属外壳",
            standard_cycle_time=15.0,
            process_steps=[step1_alt, step2_alt, step3_alt],
            material_requirements={
                "MAT-001": 1.0,
                "MAT-003": 0.2
            }
        )
        
        self.scheduler.set_molds({
            "MOLD-001": Mold(
                resource_id="MOLD-001",
                resource_name="齿轮成型模具 A",
                resource_type="mold",
                product_id="PROD-001",
                remaining_life=8500,
                total_life=10000
            ),
            "MOLD-002": Mold(
                resource_id="MOLD-002",
                resource_name="外壳冲压模具 B",
                resource_type="mold",
                product_id="PROD-002",
                remaining_life=5200,
                total_life=8000
            )
        })
        
        self.scheduler.set_employees({
            "EMP-001": Employee(
                resource_id="EMP-001",
                resource_name="张师傅",
                resource_type="employee",
                skill_level=5,
                cost_per_hour=80.0
            ),
            "EMP-002": Employee(
                resource_id="EMP-002",
                resource_name="李师傅",
                resource_type="employee",
                skill_level=4,
                cost_per_hour=65.0
            ),
            "EMP-003": Employee(
                resource_id="EMP-003",
                resource_name="王师傅",
                resource_type="employee",
                skill_level=3,
                cost_per_hour=50.0
            )
        })
        
        self.scheduler.set_materials({
            "MAT-001": Material(
                material_id="MAT-001",
                material_name="钢材 45#",
                unit="kg",
                available_quantity=500.0,
                safety_stock=100.0
            ),
            "MAT-002": Material(
                material_id="MAT-002",
                material_name="润滑油",
                unit="L",
                available_quantity=100.0,
                safety_stock=20.0
            ),
            "MAT-003": Material(
                material_id="MAT-003",
                material_name="防锈剂",
                unit="L",
                available_quantity=50.0,
                safety_stock=10.0
            )
        })
        
        base_date = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
        
        orders = [
            Order(
                order_id="ORD-001",
                product=product1,
                quantity=100,
                priority=8,
                due_date=base_date + timedelta(hours=24)
            ),
            Order(
                order_id="ORD-002",
                product=product1,
                quantity=50,
                priority=5,
                due_date=base_date + timedelta(hours=36)
            ),
            Order(
                order_id="ORD-003",
                product=product2,
                quantity=200,
                priority=10,
                due_date=base_date + timedelta(hours=18)
            ),
            Order(
                order_id="ORD-004",
                product=product2,
                quantity=150,
                priority=3,
                due_date=base_date + timedelta(hours=48)
            )
        ]
        
        self.scheduler.set_orders(orders)
        
    async def run_schedule(self, request) -> web.Response:
        try:
            data = await request.json() if request.body_exists else {}
            
            if 'orders' in data:
                orders = []
                for order_data in data['orders']:
                    product_data = order_data.get('product', {})
                    product = Product(
                        product_id=product_data.get('product_id', ''),
                        product_name=product_data.get('product_name', '')
                    )
                    
                    order = Order(
                        order_id=order_data.get('order_id', ''),
                        product=product,
                        quantity=order_data.get('quantity', 1),
                        priority=order_data.get('priority', 5),
                        due_date=datetime.fromisoformat(order_data['due_date']) if order_data.get('due_date') else datetime.now()
                    )
                    orders.append(order)
                
                self.scheduler.set_orders(orders)
            
            if 'config' in data:
                self.scheduler.population_size = data['config'].get('population_size', 100)
                self.scheduler.generations = data['config'].get('generations', 50)
                self.scheduler.mutation_prob = data['config'].get('mutation_prob', 0.2)
                self.scheduler.crossover_prob = data['config'].get('crossover_prob', 0.7)
            
            logger.info("开始执行排程优化...")
            result = self.scheduler.run()
            
            if not result.get('success', False):
                return web.json_response({
                    'success': False,
                    'message': result.get('message', '排程失败')
                }, status=400)
            
            gantt_data = self.scheduler.get_gantt_data()
            load_data = self.scheduler.get_resource_load_data()
            metrics = self.scheduler.get_schedule_metrics()
            
            response = {
                'success': True,
                'schedule_id': f"SCH-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'metrics': metrics,
                'gantt_data': gantt_data,
                'load_data': load_data,
                'config': {
                    'population_size': self.scheduler.population_size,
                    'generations': self.scheduler.generations,
                    'mutation_prob': self.scheduler.mutation_prob,
                    'crossover_prob': self.scheduler.crossover_prob
                }
            }
            
            return web.json_response(response)
            
        except Exception as e:
            logger.error(f"排程执行错误: {str(e)}")
            return web.json_response({
                'success': False,
                'message': str(e)
            }, status=500)
    
    async def get_orders(self, request) -> web.Response:
        orders_data = []
        for order in self.scheduler.orders:
            orders_data.append({
                'order_id': order.order_id,
                'product_id': order.product.product_id,
                'product_name': order.product.product_name,
                'quantity': order.quantity,
                'priority': order.priority,
                'due_date': order.due_date.isoformat() if order.due_date else None,
                'status': order.status.value
            })
        
        return web.json_response({
            'success': True,
            'orders': orders_data,
            'total': len(orders_data)
        })
    
    async def get_work_centers(self, request) -> web.Response:
        wc_data = []
        for wc_id, wc in self.scheduler.work_centers.items():
            wc_data.append({
                'work_center_id': wc.work_center_id,
                'work_center_name': wc.work_center_name,
                'capacity': wc.capacity
            })
        
        return web.json_response({
            'success': True,
            'work_centers': wc_data,
            'total': len(wc_data)
        })
    
    async def get_resources(self, request) -> web.Response:
        resources_data = []
        
        for mold_id, mold in self.scheduler.molds.items():
            resources_data.append({
                'resource_id': mold.resource_id,
                'resource_name': mold.resource_name,
                'resource_type': 'mold',
                'product_id': mold.product_id,
                'life_percentage': mold.life_percentage,
                'status': mold.status
            })
        
        for emp_id, emp in self.scheduler.employees.items():
            resources_data.append({
                'resource_id': emp.resource_id,
                'resource_name': emp.resource_name,
                'resource_type': 'employee',
                'skill_level': emp.skill_level,
                'cost_per_hour': emp.cost_per_hour,
                'status': emp.status
            })
        
        return web.json_response({
            'success': True,
            'resources': resources_data,
            'total': len(resources_data)
        })
    
    async def get_materials(self, request) -> web.Response:
        materials_data = []
        for mat_id, mat in self.scheduler.materials.items():
            materials_data.append({
                'material_id': mat.material_id,
                'material_name': mat.material_name,
                'unit': mat.unit,
                'available_quantity': mat.available_quantity,
                'safety_stock': mat.safety_stock,
                'is_low_stock': mat.is_low_stock
            })
        
        return web.json_response({
            'success': True,
            'materials': materials_data,
            'total': len(materials_data)
        })
    
    async def generate_visualization(self, request) -> web.Response:
        try:
            if not self.scheduler.best_schedule:
                return web.json_response({
                    'success': False,
                    'message': '请先执行排程'
                }, status=400)
            
            gantt_data = self.scheduler.get_gantt_data()
            load_data = self.scheduler.get_resource_load_data()
            
            viz_result = self.visualizer.visualize_schedule(gantt_data, load_data)
            
            return web.json_response({
                'success': True,
                'gantt_data': viz_result['gantt_data'],
                'load_data': viz_result['load_data'],
                'gantt_html': viz_result.get('gantt_html'),
                'load_html': viz_result.get('load_html')
            })
            
        except Exception as e:
            logger.error(f"可视化生成错误: {str(e)}")
            return web.json_response({
                'success': False,
                'message': str(e)
            }, status=500)
    
    async def health_check(self, request) -> web.Response:
        return web.json_response({
            'success': True,
            'service': 'APS Scheduler',
            'status': 'healthy',
            'timestamp': datetime.now().isoformat()
        })


def create_app(config: Dict = None) -> web.Application:
    app = web.Application()
    service = APSService(config)
    
    app['service'] = service
    
    app.router.add_get('/health', service.health_check)
    app.router.add_post('/schedule', service.run_schedule)
    app.router.add_get('/orders', service.get_orders)
    app.router.add_get('/work-centers', service.get_work_centers)
    app.router.add_get('/resources', service.get_resources)
    app.router.add_get('/materials', service.get_materials)
    app.router.add_get('/visualization', service.generate_visualization)
    
    return app


async def start_server(host: str = 'localhost', port: int = 8080, config: Dict = None):
    app = create_app(config)
    
    runner = web.AppRunner(app)
    await runner.setup()
    
    site = web.TCPSite(runner, host, port)
    await site.start()
    
    logger.info(f"APS 排程服务已启动: http://{host}:{port}")
    logger.info(f"可用接口:")
    logger.info(f"  GET  /health - 健康检查")
    logger.info(f"  POST /schedule - 执行排程")
    logger.info(f"  GET  /orders - 获取订单列表")
    logger.info(f"  GET  /work-centers - 获取工作中心")
    logger.info(f"  GET  /resources - 获取资源列表")
    logger.info(f"  GET  /materials - 获取物料列表")
    logger.info(f"  GET  /visualization - 生成可视化")
    
    while True:
        await asyncio.sleep(3600)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='APS 排程优化器服务')
    parser.add_argument('--host', default='localhost', help='服务主机地址')
    parser.add_argument('--port', type=int, default=8080, help='服务端口')
    
    args = parser.parse_args()
    
    config = {
        'algorithm': {
            'population_size': 100,
            'generations': 50,
            'mutation_prob': 0.2,
            'crossover_prob': 0.7
        }
    }
    
    print("=" * 60)
    print("APS 排程优化器服务")
    print("=" * 60)
    
    asyncio.run(start_server(args.host, args.port, config))
