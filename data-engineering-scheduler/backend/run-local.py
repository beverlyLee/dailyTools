#!/usr/bin/env python3
"""
本地开发环境启动脚本
使用 SQLite 数据库，不依赖 Docker
"""

import os
import sys

# 添加当前目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 设置环境变量
os.environ.setdefault('FLASK_ENV', 'development')
os.environ.setdefault('USE_SQLITE', 'true')

from app import create_app
from app.models import DAG, QualityRule, QualityCheckResult, DataSourceConnection, SystemSetting, DataLineage
from app import db
from datetime import datetime

app = create_app()

def init_sample_data():
    """初始化示例数据"""
    with app.app_context():
        # 检查是否已有数据
        if DAG.query.first():
            print("示例数据已存在，跳过初始化")
            return
        
        print("正在初始化示例数据...")
        
        # 创建示例 DAG
        sample_dag = DAG(
            name='示例数据管道',
            description='从用户表抽取数据，转换后加载到数据仓库',
            schedule_interval='@daily',
            status='draft'
        )
        sample_nodes = [
            {
                'id': 'node_1',
                'type': 'extract',
                'name': '抽取用户数据',
                'x': 100,
                'y': 200,
                'status': 'idle',
                'config': {'retryCount': 3, 'retryDelay': 5, 'alertOnFailure': True, 'alertEmail': ''}
            },
            {
                'id': 'node_2',
                'type': 'transform',
                'name': '清洗用户数据',
                'x': 350,
                'y': 200,
                'status': 'idle',
                'config': {'retryCount': 3, 'retryDelay': 5, 'alertOnFailure': True, 'alertEmail': ''}
            },
            {
                'id': 'node_3',
                'type': 'quality_check',
                'name': '质量检查',
                'x': 600,
                'y': 200,
                'status': 'idle',
                'config': {'retryCount': 2, 'retryDelay': 10, 'alertOnFailure': True, 'alertEmail': ''}
            },
            {
                'id': 'node_4',
                'type': 'load',
                'name': '加载到数仓',
                'x': 850,
                'y': 200,
                'status': 'idle',
                'config': {'retryCount': 3, 'retryDelay': 5, 'alertOnFailure': True, 'alertEmail': ''}
            }
        ]
        sample_connections = [
            {'id': 'conn_1', 'from': 'node_1', 'to': 'node_2'},
            {'id': 'conn_2', 'from': 'node_2', 'to': 'node_3'},
            {'id': 'conn_3', 'from': 'node_3', 'to': 'node_4'}
        ]
        sample_dag.set_nodes(sample_nodes)
        sample_dag.set_connections(sample_connections)
        db.session.add(sample_dag)
        
        # 创建示例质量规则
        rule1 = QualityRule(
            name='用户ID非空检查',
            rule_type='not_null',
            target_table='users',
            target_column='user_id',
            severity='high',
            status='active',
            last_run=datetime.utcnow(),
            last_result='passed'
        )
        rule1.set_config({'description': '检查用户表的 user_id 字段是否为空'})
        
        rule2 = QualityRule(
            name='邮箱唯一性检查',
            rule_type='uniqueness',
            target_table='users',
            target_column='email',
            severity='medium',
            status='active',
            last_run=datetime.utcnow(),
            last_result='passed'
        )
        rule2.set_config({'description': '检查邮箱字段是否唯一'})
        
        rule3 = QualityRule(
            name='金额值域检查',
            rule_type='range',
            target_table='transactions',
            target_column='amount',
            severity='high',
            status='active',
            last_run=datetime.utcnow(),
            last_result='failed'
        )
        rule3.set_config({
            'minValue': 0,
            'maxValue': 1000000,
            'description': '检查交易金额是否在有效范围内'
        })
        
        db.session.add_all([rule1, rule2, rule3])
        
        # 创建示例数据源连接
        conn1 = DataSourceConnection(
            name='生产数据库',
            connection_type='mysql',
            host='localhost',
            port=3306,
            database='production',
            username='root',
            status='active',
            description='生产环境 MySQL 数据库'
        )
        
        conn2 = DataSourceConnection(
            name='数据仓库',
            connection_type='postgresql',
            host='localhost',
            port=5432,
            database='warehouse',
            username='postgres',
            status='active',
            description='数据仓库 PostgreSQL'
        )
        
        conn3 = DataSourceConnection(
            name='Redis缓存',
            connection_type='redis',
            host='localhost',
            port=6379,
            database=0,
            status='inactive',
            description='缓存层 Redis'
        )
        
        db.session.add_all([conn1, conn2, conn3])
        
        # 创建示例数据血缘
        lineage1 = DataLineage(
            source_table='users',
            target_table='user_orders_join',
            transformation_type='join',
            job_name='job_user_aggregation'
        )
        
        lineage2 = DataLineage(
            source_table='orders',
            target_table='user_orders_join',
            transformation_type='join',
            job_name='job_user_aggregation'
        )
        
        lineage3 = DataLineage(
            source_table='user_orders_join',
            target_table='user_summary',
            transformation_type='aggregate',
            job_name='job_user_aggregation'
        )
        
        lineage4 = DataLineage(
            source_table='user_summary',
            target_table='daily_sales_report',
            transformation_type='report',
            job_name='job_daily_report'
        )
        
        db.session.add_all([lineage1, lineage2, lineage3, lineage4])
        
        # 创建示例系统设置
        settings = [
            ('system.max_retry_count', '3', 'int', '默认最大重试次数'),
            ('system.default_retry_delay', '5', 'int', '默认重试间隔（秒）'),
            ('system.task_timeout', '3600', 'int', '任务超时时间（秒）'),
            ('system.parallel_tasks', '10', 'int', '最大并行任务数'),
            ('system.log_retention_days', '30', 'int', '日志保留天数'),
            ('system.auto_cleanup', 'true', 'bool', '自动清理过期日志'),
            ('alert.email_enabled', 'false', 'bool', '启用邮件告警'),
            ('alert.webhook_enabled', 'false', 'bool', '启用 Webhook 告警'),
        ]
        
        for key, value, value_type, description in settings:
            setting = SystemSetting(
                setting_key=key,
                setting_value=value,
                setting_type=value_type,
                description=description
            )
            db.session.add(setting)
        
        db.session.commit()
        print("示例数据初始化完成！")

if __name__ == '__main__':
    # 从环境变量获取端口配置，支持自定义端口
    DEFAULT_PORT = 5000
    
    # 检查端口是否可用，如果不可用则尝试其他端口
    def find_available_port(start_port):
        import socket
        port = start_port
        while port < start_port + 10:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('0.0.0.0', port))
                    return port
            except OSError:
                print(f"端口 {port} 已被占用，尝试端口 {port + 1}...")
                port += 1
        return None
    
    # 优先使用环境变量中的端口
    env_port = os.getenv('PORT')
    if env_port:
        try:
            port = int(env_port)
        except ValueError:
            port = DEFAULT_PORT
    else:
        # 自动查找可用端口
        port = find_available_port(DEFAULT_PORT)
        if port is None:
            print("错误: 没有找到可用的端口")
            sys.exit(1)
    
    print("=" * 60)
    print("数据工程调度平台 - 本地开发环境")
    print("=" * 60)
    print(f"Python 版本: {sys.version}")
    print(f"工作目录: {os.getcwd()}")
    print("=" * 60)
    
    # 初始化示例数据
    init_sample_data()
    
    print("\n" + "=" * 60)
    print("服务即将启动...")
    print("=" * 60)
    print(f"后端 API 端口: {port}")
    print("访问地址:")
    print(f"  - 后端 API: http://localhost:{port}")
    print("=" * 60)
    print("\n提示: 请同时启动前端服务 (npm start)")
    print(f"\n注意: 前端需要配置 REACT_APP_API_URL=http://localhost:{port}")
    print("\n")
    
    # 将端口保存到文件，供前端配置使用
    config_dir = os.path.dirname(os.path.abspath(__file__))
    port_file = os.path.join(config_dir, '.port')
    with open(port_file, 'w') as f:
        f.write(str(port))
    
    # 启动 Flask 服务
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True,
        use_reloader=True
    )
