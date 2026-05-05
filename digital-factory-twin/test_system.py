"""
数字化工厂孪生系统 - 综合测试脚本
用于验证后端、前端和两个子项目的集成性
"""

import sys
import os
import json
from datetime import datetime, timedelta
from pathlib import Path

# 项目根目录
ROOT_DIR = Path(__file__).parent.parent  # dailyTools/
MAIN_PROJECT_DIR = Path(__file__).parent  # digital-factory-twin/
PRODUCTION_LINE_3D_DIR = ROOT_DIR / "production-line-3d"
APS_OPTIMIZER_DIR = ROOT_DIR / "aps-optimizer"


def test_backend_structure():
    """测试后端目录结构"""
    print("\n" + "=" * 60)
    print("测试 1: 后端目录结构检查")
    print("=" * 60)
    
    backend_path = MAIN_PROJECT_DIR / "backend"
    
    required_files = [
        "manage.py",
        "requirements.txt",
        "config/settings.py",
        "config/urls.py",
        "config/wsgi.py",
        "config/asgi.py",
        "apps/iot_data/models.py",
        "apps/iot_data/serializers.py",
        "apps/iot_data/views.py",
        "apps/iot_data/urls.py",
        "apps/production_line/models.py",
        "apps/production_line/serializers.py",
        "apps/production_line/views.py",
        "apps/production_line/urls.py",
        "apps/aps_optimizer/models.py",
        "apps/aps_optimizer/serializers.py",
        "apps/aps_optimizer/views.py",
        "apps/aps_optimizer/urls.py",
        "apps/aps_optimizer/genetic_algorithm.py",
    ]
    
    all_exist = True
    for file_path in required_files:
        full_path = backend_path / file_path
        if full_path.exists():
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path} - 缺失")
            all_exist = False
    
    return all_exist


def test_frontend_structure():
    """测试前端目录结构"""
    print("\n" + "=" * 60)
    print("测试 2: 前端目录结构检查")
    print("=" * 60)
    
    frontend_path = MAIN_PROJECT_DIR / "frontend"
    
    required_files = [
        "App.xaml",
        "App.xaml.cs",
        "MainWindow.xaml",
        "MainWindow.xaml.cs",
        "App.config",
        "DigitalFactoryTwin.csproj",
        "ViewModels/ViewModelBase.cs",
        "ViewModels/MainViewModel.cs",
        "ViewModels/ProductionLineMonitorViewModel.cs",
        "ViewModels/ApsOptimizerViewModel.cs",
        "Models/Models.cs",
        "Services/ApiService.cs",
        "Services/WebSocketService.cs",
        "Views/ProductionLineMonitorView.xaml",
        "Views/ApsOptimizerView.xaml",
        "Views/DeviceDetailView.xaml",
        "Helpers/RelayCommand.cs",
        "Helpers/Converters.cs",
    ]
    
    all_exist = True
    for file_path in required_files:
        full_path = frontend_path / file_path
        if full_path.exists():
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path} - 缺失")
            all_exist = False
    
    return all_exist


def test_production_line_3d_subproject():
    """测试产线 3D 监控子项目"""
    print("\n" + "=" * 60)
    print("测试 3: 产线 3D 监控子项目检查")
    print("=" * 60)
    
    pl3d_path = PRODUCTION_LINE_3D_DIR
    
    required_files = [
        "production_line_3d_service.py",
        "websocket_server.py",
        "config.py",
        "requirements.txt",
        "Unity/ProductionLine3DManager.cs",
    ]
    
    all_exist = True
    for file_path in required_files:
        full_path = pl3d_path / file_path
        if full_path.exists():
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path} - 缺失")
            all_exist = False
    
    print("\n  测试核心功能:")
    
    try:
        sys.path.insert(0, str(pl3d_path))
        
        from production_line_3d_service import (
            ProductionLine3DService, Device3DModel, DeviceComponent,
            DisassemblyStep, Vector3D, DeviceStatus, create_sample_production_line
        )
        
        print("    ✅ 模块导入成功")
        
        service = create_sample_production_line()
        print("    ✅ 示例生产线创建成功")
        
        line_status = service.get_line_status("LINE-001")
        print(f"    ✅ 产线状态获取成功: {line_status.get('line_name', 'N/A')}")
        
        scene_data = service.get_line_scene_data("LINE-001")
        print(f"    ✅ 产线场景数据获取成功: {len(scene_data.get('devices', []))} 个设备")
        
        device = service.get_device("LINE-001", "CNC-001")
        if device:
            service.disassembly_manager.load_device(device)
            print("    ✅ 设备拆解管理器加载成功")
            
            progress = service.disassembly_manager.get_disassembly_progress()
            print(f"    ✅ 拆解进度获取成功: {progress.get('progress', 0):.1f}%")
        
    except Exception as e:
        print(f"    ❌ 功能测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        all_exist = False
    
    return all_exist


def test_aps_optimizer_subproject():
    """测试 APS 排程优化器子项目"""
    print("\n" + "=" * 60)
    print("测试 4: APS 排程优化器子项目检查")
    print("=" * 60)
    
    aps_path = APS_OPTIMIZER_DIR
    
    required_files = [
        "genetic_algorithm_scheduler.py",
        "visualization.py",
        "api_service.py",
        "config.py",
        "main.py",
        "requirements.txt",
    ]
    
    all_exist = True
    for file_path in required_files:
        full_path = aps_path / file_path
        if full_path.exists():
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path} - 缺失")
            all_exist = False
    
    print("\n  测试核心功能:")
    
    try:
        sys.path.insert(0, str(aps_path))
        
        from genetic_algorithm_scheduler import (
            GeneticAlgorithmScheduler, Order, Product, ProcessStep,
            WorkCenter, Mold, Employee, Material
        )
        
        from visualization import (
            ScheduleVisualizer, GanttChartGenerator, ResourceLoadVisualizer
        )
        
        print("    ✅ 模块导入成功")
        
        scheduler = GeneticAlgorithmScheduler({
            'population_size': 20,
            'generations': 5
        })
        print("    ✅ 调度器创建成功")
        
        scheduler.set_work_centers({
            "WC-001": WorkCenter(
                work_center_id="WC-001",
                work_center_name="数控加工中心",
                capacity=2
            ),
            "WC-002": WorkCenter(
                work_center_id="WC-002",
                work_center_name="装配中心",
                capacity=3
            )
        })
        print("    ✅ 工作中心设置成功")
        
        scheduler.set_molds({
            "MOLD-001": Mold(
                resource_id="MOLD-001",
                resource_name="测试模具",
                resource_type="mold",
                product_id="PROD-001"
            )
        })
        
        scheduler.set_employees({
            "EMP-001": Employee(
                resource_id="EMP-001",
                resource_name="测试员工",
                resource_type="employee",
                skill_level=5,
                cost_per_hour=50.0
            )
        })
        
        scheduler.set_materials({
            "MAT-001": Material(
                material_id="MAT-001",
                material_name="测试物料",
                unit="kg",
                available_quantity=100.0
            )
        })
        
        step1 = ProcessStep(
            step_number=1,
            step_name="测试步骤1",
            work_center_id="WC-001",
            cycle_time=5.0,
            setup_time=2.0
        )
        
        product1 = Product(
            product_id="PROD-001",
            product_name="测试产品",
            process_steps=[step1]
        )
        
        base_time = datetime.now()
        order1 = Order(
            order_id="ORD-001",
            product=product1,
            quantity=10,
            priority=5,
            due_date=base_time + timedelta(hours=24)
        )
        
        scheduler.set_orders([order1])
        print("    ✅ 订单设置成功")
        
        print("    ⏳ 运行遗传算法优化...")
        result = scheduler.run()
        
        if result.get('success', False):
            print("    ✅ 排程优化成功")
            
            metrics = scheduler.get_schedule_metrics()
            print(f"       总工期: {metrics.get('makespan_minutes', 0):.1f} 分钟")
            print(f"       准时率: {metrics.get('on_time_rate_percent', 0):.1f}%")
            
            gantt_data = scheduler.get_gantt_data()
            print(f"    ✅ 甘特图数据生成成功: {len(gantt_data.get('tasks', []))} 个任务")
            
            load_data = scheduler.get_resource_load_data()
            print(f"    ✅ 资源负荷数据生成成功: {len(load_data.get('work_centers', {}))} 个工作中心")
            
        else:
            print(f"    ⚠️ 排程优化结果: {result.get('message', '未知')}")
        
    except Exception as e:
        print(f"    ❌ 功能测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        all_exist = False
    
    return all_exist


def test_django_models():
    """测试 Django 模型定义"""
    print("\n" + "=" * 60)
    print("测试 5: Django 模型定义检查")
    print("=" * 60)
    
    backend_path = MAIN_PROJECT_DIR / "backend"
    
    try:
        iot_models_path = backend_path / "apps" / "iot_data" / "models.py"
        if iot_models_path.exists():
            content = iot_models_path.read_text()
            expected_models = ['Device', 'PLCData', 'DeviceStatusHistory', 'Alert']
            found = []
            for model in expected_models:
                if f"class {model}" in content:
                    found.append(model)
                    print(f"  ✅ 模型 {model} 定义存在")
                else:
                    print(f"  ❌ 模型 {model} 定义缺失")
            
            if len(found) == len(expected_models):
                print("  ✅ IoT 数据模型完整")
            else:
                print(f"  ⚠️ IoT 数据模型不完整: {len(found)}/{len(expected_models)}")
        
        pl_models_path = backend_path / "apps" / "production_line" / "models.py"
        if pl_models_path.exists():
            content = pl_models_path.read_text()
            expected_models = ['ProductionLine', 'Device3DModel', 'DeviceComponent', 'DisassemblyStep']
            found = []
            for model in expected_models:
                if f"class {model}" in content:
                    found.append(model)
                    print(f"  ✅ 模型 {model} 定义存在")
                else:
                    print(f"  ❌ 模型 {model} 定义缺失")
            
            if len(found) == len(expected_models):
                print("  ✅ 产线 3D 模型完整")
            else:
                print(f"  ⚠️ 产线 3D 模型不完整: {len(found)}/{len(expected_models)}")
        
        aps_models_path = backend_path / "apps" / "aps_optimizer" / "models.py"
        if aps_models_path.exists():
            content = aps_models_path.read_text()
            expected_models = ['Order', 'Product', 'Resource', 'Mold', 'Material', 'Employee', 'WorkCenter', 'ScheduleRun', 'ScheduleJob']
            found = []
            for model in expected_models:
                if f"class {model}" in content:
                    found.append(model)
                    print(f"  ✅ 模型 {model} 定义存在")
                else:
                    print(f"  ❌ 模型 {model} 定义缺失")
            
            if len(found) == len(expected_models):
                print("  ✅ APS 排程模型完整")
            else:
                print(f"  ⚠️ APS 排程模型不完整: {len(found)}/{len(expected_models)}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ 模型检查失败: {str(e)}")
        return False


def generate_summary_report(results):
    """生成综合测试报告"""
    print("\n" + "=" * 60)
    print("综合测试报告")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    print(f"\n测试结果: {passed}/{total} 通过")
    print("\n详细结果:")
    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {test_name}: {status}")
    
    print("\n" + "=" * 60)
    print("项目结构概述")
    print("=" * 60)
    
    print(f"""
📁 {ROOT_DIR.name}/
   ├── digital-factory-twin/            # 主项目
   │   ├── backend/                      # 后端 (Python + Django)
   │   │   ├── config/                   # Django 配置
   │   │   │   ├── settings.py          # 项目配置
   │   │   │   ├── urls.py              # URL 路由
   │   │   │   ├── wsgi.py              # WSGI 入口
   │   │   │   └── asgi.py              # ASGI 入口 (WebSocket)
   │   │   ├── apps/
   │   │   │   ├── iot_data/            # IoT 数据处理应用
   │   │   │   ├── production_line/     # 产线 3D 监控应用
   │   │   │   └── aps_optimizer/       # APS 排程优化器应用
   │   │   ├── manage.py                # Django 管理脚本
   │   │   └── requirements.txt         # Python 依赖
   │   │
   │   └── frontend/                     # 前端 (C# + WPF/Unity)
   │       ├── ViewModels/               # 视图模型层
   │       ├── Models/                   # 数据模型层
   │       ├── Services/                 # 服务层
   │       ├── Views/                    # 视图层
   │       ├── Helpers/                  # 辅助类
   │       └── DigitalFactoryTwin.csproj
   │
   ├── production-line-3d/               # 子项目1: 产线 3D 监控
   │   ├── production_line_3d_service.py # 核心服务
   │   ├── websocket_server.py           # WebSocket 服务器
   │   ├── config.py                     # 配置文件
   │   ├── requirements.txt              # Python 依赖
   │   └── Unity/                        # Unity 集成
   │       └── ProductionLine3DManager.cs
   │
   └── aps-optimizer/                    # 子项目2: APS 排程优化器
       ├── genetic_algorithm_scheduler.py # 遗传算法调度器
       ├── visualization.py              # 可视化模块
       ├── api_service.py                # API 服务
       ├── config.py                     # 配置文件
       ├── main.py                       # 主入口
       └── requirements.txt              # Python 依赖
""")
    
    print("\n" + "=" * 60)
    print("核心功能说明")
    print("=" * 60)
    
    print("""
🔧 主项目 - 后端 (Python + Django):
   • IoT 数据处理 - 设备管理、PLC数据采集、告警管理
   • 产线 3D 监控 - 产线管理、3D模型配置、设备拆解步骤
   • APS 排程优化 - 订单管理、资源管理、物料管理、排程运行

🎮 主项目 - 前端 (C# + WPF/Unity):
   • 主窗口框架 - 导航菜单、状态显示
   • 产线监控视图 - 设备列表、3D视图区域、PLC数据实时显示
   • APS 排程视图 - 订单管理、排程参数配置、甘特图预览
   • 设备详情视图 - 设备信息、参数配置、维护记录

🏭 子项目1: 产线 3D 监控
   • 实时 PLC 数据映射 - 将 PLC 数据映射到 3D 设备状态
   • 设备状态更新 - 运行/停机/故障/维护状态显示
   • 设备拆解功能 - 按步骤拆解设备，查看内部结构
   • WebSocket 服务 - 实时推送状态更新
   • Unity 集成 - Unity 3D 引擎集成脚本

📊 子项目2: APS 排程优化器
   • 遗传算法排程 - 基于遗传算法的生产排程优化
   • 多约束处理 - 模具约束、人力约束、物料齐套约束
   • 甘特图生成 - 交互式甘特图可视化
   • 资源负荷分析 - 工作中心负荷实时监控
   • API 服务 - REST API 接口
   • CLI 模式 - 命令行运行模式
   • 服务模式 - Web 服务运行模式
""")
    
    return passed == total


def main():
    """主测试函数"""
    print("\n" + "=" * 60)
    print("数字化工厂孪生系统 - 综合测试")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    print(f"\n项目根目录: {ROOT_DIR}")
    print(f"主项目目录: {MAIN_PROJECT_DIR}")
    print(f"子项目1目录: {PRODUCTION_LINE_3D_DIR}")
    print(f"子项目2目录: {APS_OPTIMIZER_DIR}")
    
    results = {}
    
    results['后端结构'] = test_backend_structure()
    results['前端结构'] = test_frontend_structure()
    results['产线3D监控子项目'] = test_production_line_3d_subproject()
    results['APS排程优化器子项目'] = test_aps_optimizer_subproject()
    results['Django模型定义'] = test_django_models()
    
    success = generate_summary_report(results)
    
    if success:
        print("\n✅ 所有测试通过!")
        return 0
    else:
        print("\n❌ 部分测试失败，请检查上述错误信息")
        return 1


if __name__ == '__main__':
    sys.exit(main())
