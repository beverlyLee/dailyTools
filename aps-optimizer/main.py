"""
APS 排程优化器 - 主入口
支持命令行和服务模式运行
"""

import asyncio
import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

from genetic_algorithm_scheduler import (
    GeneticAlgorithmScheduler, Order, Product, ProcessStep, 
    WorkCenter, Resource, Mold, Employee, Material
)
from visualization import ScheduleVisualizer
from api_service import create_app, start_server
from config import Config


def create_sample_scheduler() -> GeneticAlgorithmScheduler:
    scheduler = GeneticAlgorithmScheduler(Config.ALGORITHM_CONFIG)
    
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
    
    scheduler.set_work_centers({
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
    
    scheduler.set_molds({
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
    
    scheduler.set_employees({
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
    
    scheduler.set_materials({
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
    
    scheduler.set_orders(orders)
    
    return scheduler


def run_cli_schedule(args):
    print("=" * 60)
    print("APS 排程优化器 - 命令行模式")
    print("=" * 60)
    
    print("\n[1/4] 初始化排程器...")
    scheduler = create_sample_scheduler()
    print(f"    订单数量: {len(scheduler.orders)}")
    print(f"    工作中心数量: {len(scheduler.work_centers)}")
    
    print("\n[2/4] 配置算法参数...")
    if args.population:
        scheduler.population_size = args.population
    if args.generations:
        scheduler.generations = args.generations
    if args.mutation:
        scheduler.mutation_prob = args.mutation
    if args.crossover:
        scheduler.crossover_prob = args.crossover
    
    print(f"    种群大小: {scheduler.population_size}")
    print(f"    迭代次数: {scheduler.generations}")
    print(f"    变异概率: {scheduler.mutation_prob}")
    print(f"    交叉概率: {scheduler.crossover_prob}")
    
    print("\n[3/4] 执行遗传算法优化...")
    result = scheduler.run()
    
    if not result.get('success', False):
        print(f"    错误: {result.get('message', '排程失败')}")
        return 1
    
    print(f"    优化完成!")
    print(f"    最佳适应度: {result.get('best_fitness')}")
    
    print("\n[4/4] 生成排程结果...")
    metrics = scheduler.get_schedule_metrics()
    
    print("\n" + "-" * 60)
    print("排程指标")
    print("-" * 60)
    print(f"  总工期: {metrics['makespan_minutes']:.1f} 分钟 ({metrics['makespan_hours']:.2f} 小时)")
    print(f"  总订单数: {metrics['total_orders']}")
    print(f"  延期订单: {metrics['late_orders']}")
    print(f"  准时订单: {metrics['on_time_orders']}")
    print(f"  准时率: {metrics['on_time_rate_percent']:.1f}%")
    print(f"  资源利用率: {metrics['resource_utilization_percent']:.1f}%")
    print(f"  总成本: ¥{metrics['total_cost']:.2f}")
    print(f"  总作业数: {metrics['total_jobs']}")
    
    gantt_data = scheduler.get_gantt_data()
    load_data = scheduler.get_resource_load_data()
    
    if args.output:
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\n[5/5] 导出可视化文件到: {output_dir}")
        
        visualizer = ScheduleVisualizer()
        viz_result = visualizer.visualize_schedule(gantt_data, load_data, str(output_dir))
        
        print(f"    甘特图: {output_dir / 'gantt_chart.html'}")
        print(f"    资源负荷图: {output_dir / 'resource_load_chart.html'}")
        
        results_file = output_dir / 'schedule_results.json'
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump({
                'metrics': metrics,
                'gantt_tasks': gantt_data.get('tasks', [])[:10],
                'generated_at': datetime.now().isoformat()
            }, f, ensure_ascii=False, indent=2, default=str)
        print(f"    结果数据: {results_file}")
    
    print("\n" + "=" * 60)
    print("排程完成!")
    print("=" * 60)
    
    return 0


def run_server_mode(args):
    print("=" * 60)
    print("APS 排程优化器 - 服务模式")
    print("=" * 60)
    print(f"服务地址: http://{args.host}:{args.port}")
    print("=" * 60)
    
    config = {
        'algorithm': {
            'population_size': args.population or Config.ALGORITHM_CONFIG['population_size'],
            'generations': args.generations or Config.ALGORITHM_CONFIG['generations'],
            'mutation_prob': args.mutation or Config.ALGORITHM_CONFIG['mutation_prob'],
            'crossover_prob': args.crossover or Config.ALGORITHM_CONFIG['crossover_prob']
        }
    }
    
    asyncio.run(start_server(args.host, args.port, config))


def main():
    parser = argparse.ArgumentParser(
        description='APS 排程优化器 - 基于遗传算法的生产排程系统',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
示例:
  # 命令行模式运行排程
  python main.py --cli --population 100 --generations 50 --output ./results
  
  # 服务模式启动
  python main.py --server --host 0.0.0.0 --port 8080
        '''
    )
    
    parser.add_argument('--cli', action='store_true', help='命令行模式')
    parser.add_argument('--server', action='store_true', help='服务模式')
    
    parser.add_argument('--population', type=int, help='种群大小')
    parser.add_argument('--generations', type=int, help='迭代次数')
    parser.add_argument('--mutation', type=float, help='变异概率')
    parser.add_argument('--crossover', type=float, help='交叉概率')
    
    parser.add_argument('--output', type=str, help='输出目录')
    parser.add_argument('--host', type=str, default='localhost', help='服务主机地址')
    parser.add_argument('--port', type=int, default=8080, help='服务端口')
    
    args = parser.parse_args()
    
    if args.server:
        run_server_mode(args)
    elif args.cli:
        sys.exit(run_cli_schedule(args))
    else:
        parser.print_help()
        print("\n请指定运行模式: --cli 或 --server")
        sys.exit(1)


if __name__ == '__main__':
    main()
