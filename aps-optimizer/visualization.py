"""
APS 排程优化器 - 可视化模块
用于生成甘特图和资源负荷图
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class GanttTask:
    id: str
    name: str
    resource: str
    start: datetime
    end: datetime
    duration: float
    order_id: str
    product_name: str
    quantity: int
    priority: int
    is_late: bool
    mold: Optional[str]
    employees: List[str]
    progress: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'name': self.name,
            'resource': self.resource,
            'start': self.start.isoformat(),
            'end': self.end.isoformat(),
            'duration': self.duration,
            'order_id': self.order_id,
            'product_name': self.product_name,
            'quantity': self.quantity,
            'priority': self.priority,
            'is_late': self.is_late,
            'mold': self.mold,
            'employees': self.employees,
            'progress': self.progress
        }


@dataclass
class ResourceLoad:
    resource_id: str
    resource_name: str
    capacity: int
    load_percent: List[float]
    time_slots: List[str]
    
    def to_dict(self) -> Dict:
        return {
            'resource_id': self.resource_id,
            'resource_name': self.resource_name,
            'capacity': self.capacity,
            'load_percent': self.load_percent,
            'time_slots': self.time_slots
        }


class GanttChartGenerator:
    def __init__(self):
        self.tasks: List[GanttTask] = []
        self.resources: Dict[str, Dict] = {}
        self.colors = {
            'running': '#4CAF50',
            'scheduled': '#2196F3',
            'late': '#F44336',
            'maintenance': '#FF9800',
            'warning': '#FFC107'
        }
        
    def add_task(self, task: GanttTask):
        self.tasks.append(task)
        
        if task.resource not in self.resources:
            self.resources[task.resource] = {
                'name': task.resource,
                'jobs': [],
                'total_time': 0.0
            }
        self.resources[task.resource]['jobs'].append(task)
        self.resources[task.resource]['total_time'] += task.duration
        
    def add_tasks_from_schedule(self, schedule_data: Dict):
        jobs = schedule_data.get('jobs', [])
        
        for job in jobs:
            if hasattr(job, 'to_dict'):
                job_dict = job.to_dict() if hasattr(job, 'to_dict') else job
            else:
                job_dict = job
                
            if isinstance(job_dict, dict):
                task = GanttTask(
                    id=job_dict.get('job_id', ''),
                    name=job_dict.get('name', job_dict.get('step_name', '')),
                    resource=job_dict.get('resource', job_dict.get('work_center_id', '')),
                    start=job_dict.get('start', job_dict.get('time_slot', {}).get('start', datetime.now())),
                    end=job_dict.get('end', job_dict.get('time_slot', {}).get('end', datetime.now())),
                    duration=job_dict.get('duration', 0.0),
                    order_id=job_dict.get('order_id', ''),
                    product_name=job_dict.get('product_name', ''),
                    quantity=job_dict.get('quantity', 0),
                    priority=job_dict.get('priority', 5),
                    is_late=job_dict.get('is_late', False),
                    mold=job_dict.get('mold', None),
                    employees=job_dict.get('employees', [])
                )
                self.add_task(task)
                
    def generate_gantt_data(self) -> Dict:
        if not self.tasks:
            return {'tasks': [], 'resources': {}, 'timeline': {}}
        
        min_start = min(t.start for t in self.tasks)
        max_end = max(t.end for t in self.tasks)
        
        timeline = {
            'start': min_start.isoformat(),
            'end': max_end.isoformat(),
            'duration_minutes': (max_end - min_start).total_seconds() / 60
        }
        
        tasks_data = []
        for task in self.tasks:
            task_dict = task.to_dict()
            
            if task.is_late:
                task_dict['color'] = self.colors['late']
            elif task.priority >= 8:
                task_dict['color'] = self.colors['warning']
            else:
                task_dict['color'] = self.colors['scheduled']
            
            task_dict['width_percent'] = self._calculate_width_percent(task, min_start, max_end)
            task_dict['x_percent'] = self._calculate_x_percent(task, min_start, max_end)
            
            tasks_data.append(task_dict)
        
        tasks_data.sort(key=lambda x: x['resource'])
        
        resources_data = {}
        for res_id, res_info in self.resources.items():
            resources_data[res_id] = {
                'name': res_info['name'],
                'total_time': res_info['total_time'],
                'job_count': len(res_info['jobs'])
            }
        
        return {
            'tasks': tasks_data,
            'resources': resources_data,
            'timeline': timeline,
            'task_count': len(self.tasks),
            'resource_count': len(self.resources)
        }
    
    def _calculate_width_percent(self, task: GanttTask, min_start: datetime, max_end: datetime) -> float:
        total_duration = (max_end - min_start).total_seconds() / 60
        if total_duration <= 0:
            return 0.0
        return (task.duration / total_duration) * 100
    
    def _calculate_x_percent(self, task: GanttTask, min_start: datetime, max_end: datetime) -> float:
        total_duration = (max_end - min_start).total_seconds() / 60
        if total_duration <= 0:
            return 0.0
        offset = (task.start - min_start).total_seconds() / 60
        return (offset / total_duration) * 100
    
    def generate_html_gantt(self, output_path: str = None) -> str:
        data = self.generate_gantt_data()
        
        html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>APS 排程甘特图</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }}
        .container {{
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
        }}
        .header {{
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }}
        .header h1 {{
            color: #333;
            font-size: 24px;
            margin-bottom: 10px;
        }}
        .stats {{
            display: flex;
            gap: 30px;
        }}
        .stat-item {{
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .stat-value {{
            font-size: 18px;
            font-weight: bold;
            color: #2196F3;
        }}
        .stat-label {{
            font-size: 12px;
            color: #666;
        }}
        .legend {{
            display: flex;
            gap: 20px;
            margin-top: 15px;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
        }}
        .legend-color {{
            width: 16px;
            height: 16px;
            border-radius: 3px;
        }}
        .gantt-container {{
            display: flex;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
        }}
        .resource-list {{
            width: 200px;
            background: #fafafa;
            border-right: 1px solid #e0e0e0;
            flex-shrink: 0;
        }}
        .resource-header {{
            padding: 10px 15px;
            background: #f5f5f5;
            border-bottom: 1px solid #e0e0e0;
            font-weight: bold;
            color: #333;
        }}
        .resource-item {{
            padding: 10px 15px;
            border-bottom: 1px solid #eee;
            font-size: 13px;
            color: #333;
        }}
        .resource-item:hover {{
            background: #e3f2fd;
        }}
        .gantt-area {{
            flex: 1;
            overflow-x: auto;
            position: relative;
        }}
        .timeline-header {{
            position: sticky;
            top: 0;
            background: #fafafa;
            border-bottom: 1px solid #e0e0e0;
            z-index: 10;
        }}
        .timeline-scale {{
            height: 40px;
            position: relative;
            border-bottom: 1px solid #e0e0e0;
        }}
        .timeline-marks {{
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
        }}
        .timeline-mark {{
            flex: 1;
            border-right: 1px solid #eee;
            text-align: center;
            font-size: 11px;
            color: #666;
            padding-top: 5px;
        }}
        .gantt-rows {{
            position: relative;
        }}
        .gantt-row {{
            height: 50px;
            border-bottom: 1px solid #eee;
            position: relative;
        }}
        .gantt-row:hover {{
            background: #fafafa;
        }}
        .grid-lines {{
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            pointer-events: none;
        }}
        .grid-line {{
            flex: 1;
            border-right: 1px dashed #eee;
        }}
        .task-bar {{
            position: absolute;
            height: 30px;
            top: 10px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 0 8px;
            font-size: 11px;
            color: white;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        .task-bar:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }}
        .task-bar.late {{
            border: 2px solid #d32f2f;
        }}
        .tooltip {{
            position: absolute;
            background: #333;
            color: white;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
            max-width: 300px;
        }}
        .tooltip.visible {{
            opacity: 1;
        }}
        .tooltip-row {{
            margin: 4px 0;
        }}
        .tooltip-label {{
            color: #aaa;
            display: inline-block;
            width: 80px;
        }}
        .footer {{
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }}
        .metric-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            border-radius: 8px;
            color: white;
        }}
        .metric-card:nth-child(2) {{
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }}
        .metric-card:nth-child(3) {{
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }}
        .metric-card:nth-child(4) {{
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }}
        .metric-card-value {{
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        .metric-card-label {{
            font-size: 13px;
            opacity: 0.9;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 APS 排程甘特图</h1>
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value">{data['task_count']}</div>
                    <div class="stat-label">作业数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{data['resource_count']}</div>
                    <div class="stat-label">资源数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">{data['timeline']['duration_minutes']:.1f}</div>
                    <div class="stat-label">总工期(分钟)</div>
                </div>
            </div>
            <div class="legend">
                <div class="legend-item">
                    <div class="legend-color" style="background: {self.colors['scheduled']}"></div>
                    <span>计划作业</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: {self.colors['warning']}"></div>
                    <span>高优先级</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: {self.colors['late']}"></div>
                    <span>延期作业</span>
                </div>
            </div>
        </div>
        
        <div class="gantt-container">
            <div class="resource-list">
                <div class="resource-header">工作中心</div>
"""
        
        for res_id, res_info in data['resources'].items():
            html_content += f"""
                <div class="resource-item">
                    <div><strong>{res_info['name']}</strong></div>
                    <div style="font-size: 11px; color: #666; margin-top: 3px;">
                        {res_info['job_count']} 个作业 | {res_info['total_time']:.1f} 分钟
                    </div>
                </div>
"""
        
        html_content += f"""
            </div>
            <div class="gantt-area">
                <div class="timeline-header">
                    <div class="timeline-scale">
                        <div class="timeline-marks">
"""
        
        time_slots = 24
        for i in range(time_slots):
            html_content += f"""
                            <div class="timeline-mark">{i}</div>
"""
        
        html_content += f"""
                        </div>
                    </div>
                </div>
                <div class="gantt-rows">
                    <div class="grid-lines">
"""
        
        for i in range(time_slots):
            html_content += f"""
                        <div class="grid-line"></div>
"""
        
        html_content += f"""
                    </div>
"""
        
        resource_order = list(self.resources.keys())
        for task in data['tasks']:
            if task['resource'] in resource_order:
                row_index = resource_order.index(task['resource'])
                top = row_index * 50 + 10
                width = task['width_percent']
                left = task['x_percent']
                
                task_class = 'task-bar'
                if task.get('is_late', False):
                    task_class += ' late'
                
                tooltip_data = f"""
作业ID: {task['id']}
订单: {task['order_id']}
产品: {task['product_name']}
数量: {task['quantity']}
优先级: {task['priority']}
开始: {task['start']}
结束: {task['end']}
时长: {task['duration']:.1f} 分钟
延期: {'是' if task.get('is_late', False) else '否'}
"""
                
                html_content += f"""
                    <div class="gantt-row">
                        <div class="{task_class}" 
                             style="left: {left}%; width: {width}%; top: {top}px; background: {task['color']};"
                             data-tooltip="{json.dumps(task, ensure_ascii=False)}">
                            {task['name'][:15]}...
                        </div>
                    </div>
"""
        
        html_content += f"""
                </div>
            </div>
        </div>
        
        <div class="footer">
            生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | 
            开始时间: {data['timeline']['start']} | 
            结束时间: {data['timeline']['end']}
        </div>
    </div>
    
    <div class="tooltip" id="tooltip"></div>
    
    <script>
        const tooltip = document.getElementById('tooltip');
        const taskBars = document.querySelectorAll('.task-bar');
        
        taskBars.forEach(bar => {{
            bar.addEventListener('mouseenter', (e) => {{
                const data = JSON.parse(bar.dataset.tooltip);
                let content = '<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #555; padding-bottom: 5px;">' + data.name + '</div>';
                content += '<div class="tooltip-row"><span class="tooltip-label">订单:</span>' + data.order_id + '</div>';
                content += '<div class="tooltip-row"><span class="tooltip-label">产品:</span>' + data.product_name + '</div>';
                content += '<div class="tooltip-row"><span class="tooltip-label">数量:</span>' + data.quantity + '</div>';
                content += '<div class="tooltip-row"><span class="tooltip-label">优先级:</span>' + data.priority + '</div>';
                content += '<div class="tooltip-row"><span class="tooltip-label">开始:</span>' + new Date(data.start).toLocaleString('zh-CN') + '</div>';
                content += '<div class="tooltip-row"><span class="tooltip-label">结束:</span>' + new Date(data.end).toLocaleString('zh-CN') + '</div>';
                content += '<div class="tooltip-row"><span class="tooltip-label">时长:</span>' + data.duration.toFixed(1) + ' 分钟</div>';
                if (data.is_late) {{
                    content += '<div class="tooltip-row" style="color: #ff6b6b;"><span class="tooltip-label">状态:</span>延期</div>';
                }}
                if (data.mold) {{
                    content += '<div class="tooltip-row"><span class="tooltip-label">模具:</span>' + data.mold + '</div>';
                }}
                
                tooltip.innerHTML = content;
                tooltip.style.left = (e.pageX + 10) + 'px';
                tooltip.style.top = (e.pageY + 10) + 'px';
                tooltip.classList.add('visible');
            }});
            
            bar.addEventListener('mouseleave', () => {{
                tooltip.classList.remove('visible');
            }});
        }});
    </script>
</body>
</html>
"""
        
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            logger.info(f"甘特图已生成: {output_path}")
        
        return html_content


class ResourceLoadVisualizer:
    def __init__(self):
        self.resources: Dict[str, ResourceLoad] = {}
        
    def add_resource_load(self, resource_load: ResourceLoad):
        self.resources[resource_load.resource_id] = resource_load
        
    def add_load_from_data(self, load_data: Dict):
        time_slots = load_data.get('time_slots', [])
        
        for res_id, res_info in load_data.get('work_centers', {}).items():
            resource_load = ResourceLoad(
                resource_id=res_id,
                resource_name=res_info.get('name', res_id),
                capacity=res_info.get('capacity', 1),
                load_percent=res_info.get('load_percent', []),
                time_slots=time_slots
            )
            self.add_resource_load(resource_load)
            
    def generate_load_data(self) -> Dict:
        resources_data = []
        
        for res_id, res_load in self.resources.items():
            resources_data.append(res_load.to_dict())
        
        avg_load = 0.0
        if self.resources:
            total_load = sum(
                sum(res.load_percent) / len(res.load_percent)
                for res in self.resources.values()
                if res.load_percent
            )
            avg_load = total_load / len(self.resources) if self.resources else 0
        
        return {
            'resources': resources_data,
            'average_load_percent': avg_load,
            'resource_count': len(self.resources)
        }
    
    def generate_html_load_chart(self, output_path: str = None) -> str:
        data = self.generate_load_data()
        
        html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>资源负荷图</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Microsoft YaHei', Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
        }}
        h1 {{
            color: #333;
            font-size: 24px;
            margin-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 10px;
        }}
        .summary {{
            display: flex;
            gap: 30px;
            margin-bottom: 20px;
        }}
        .summary-item {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
        }}
        .summary-value {{
            font-size: 28px;
            font-weight: bold;
        }}
        .summary-label {{
            font-size: 13px;
            opacity: 0.9;
            margin-top: 5px;
        }}
        .chart-container {{
            margin-top: 20px;
        }}
        .resource-row {{
            margin-bottom: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
        }}
        .resource-header {{
            background: #fafafa;
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .resource-name {{
            font-weight: bold;
            font-size: 14px;
            color: #333;
        }}
        .resource-capacity {{
            font-size: 12px;
            color: #666;
        }}
        .load-bars {{
            display: flex;
            height: 80px;
            position: relative;
        }}
        .load-bar-container {{
            flex: 1;
            border-right: 1px solid #eee;
            display: flex;
            align-items: flex-end;
            padding: 5px;
        }}
        .load-bar {{
            width: 100%;
            border-radius: 3px 3px 0 0;
            transition: height 0.3s ease;
            position: relative;
        }}
        .load-bar.low {{ background: linear-gradient(180deg, #4CAF50 0%, #45a049 100%); }}
        .load-bar.medium {{ background: linear-gradient(180deg, #FFC107 0%, #ffb300 100%); }}
        .load-bar.high {{ background: linear-gradient(180deg, #FF9800 0%, #f57c00 100%); }}
        .load-bar.overload {{ background: linear-gradient(180deg, #F44336 0%, #d32f2f 100%); }}
        .load-bar:hover {{
            opacity: 0.8;
            cursor: pointer;
        }}
        .load-tooltip {{
            position: absolute;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
        }}
        .load-tooltip.visible {{
            opacity: 1;
        }}
        .time-axis {{
            display: flex;
            border-top: 1px solid #e0e0e0;
            background: #fafafa;
        }}
        .time-mark {{
            flex: 1;
            text-align: center;
            padding: 8px 0;
            font-size: 11px;
            color: #666;
            border-right: 1px solid #eee;
        }}
        .legend {{
            display: flex;
            gap: 20px;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: #666;
        }}
        .legend-color {{
            width: 20px;
            height: 12px;
            border-radius: 2px;
        }}
        .footer {{
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📈 资源负荷图</h1>
        
        <div class="summary">
            <div class="summary-item">
                <div class="summary-value">{data['resource_count']}</div>
                <div class="summary-label">资源数量</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">{data['average_load_percent']:.1f}%</div>
                <div class="summary-label">平均负荷</div>
            </div>
        </div>
        
        <div class="chart-container">
"""
        
        for resource in data['resources']:
            html_content += f"""
            <div class="resource-row">
                <div class="resource-header">
                    <span class="resource-name">{resource['resource_name']}</span>
                    <span class="resource-capacity">容量: {resource['capacity']}</span>
                </div>
                <div class="load-bars">
"""
            
            for i, load in enumerate(resource['load_percent']):
                if load <= 50:
                    bar_class = 'low'
                elif load <= 75:
                    bar_class = 'medium'
                elif load <= 100:
                    bar_class = 'high'
                else:
                    bar_class = 'overload'
                
                html_content += f"""
                    <div class="load-bar-container">
                        <div class="load-bar {bar_class}" 
                             style="height: {min(load, 100)}%;"
                             data-load="{load:.1f}"
                             data-slot="{resource['time_slots'][i] if i < len(resource['time_slots']) else ''}">
                        </div>
                    </div>
"""
            
            html_content += f"""
                </div>
                <div class="time-axis">
"""
            
            if resource['time_slots']:
                for slot in resource['time_slots']:
                    try:
                        time_str = slot.split('T')[1][:5]
                    except:
                        time_str = slot[:5]
                    html_content += f"""
                    <div class="time-mark">{time_str}</div>
"""
            
            html_content += f"""
                </div>
            </div>
"""
        
        html_content += f"""
        </div>
        
        <div class="legend">
            <div class="legend-item">
                <div class="legend-color" style="background: linear-gradient(180deg, #4CAF50 0%, #45a049 100%);"></div>
                <span>低负荷 (0-50%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: linear-gradient(180deg, #FFC107 0%, #ffb300 100%);"></div>
                <span>中负荷 (51-75%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: linear-gradient(180deg, #FF9800 0%, #f57c00 100%);"></div>
                <span>高负荷 (76-100%)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: linear-gradient(180deg, #F44336 0%, #d32f2f 100%);"></div>
                <span>超负荷 (100%+)</span>
            </div>
        </div>
        
        <div class="footer">
            生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        </div>
    </div>
    
    <div class="load-tooltip" id="loadTooltip"></div>
    
    <script>
        const tooltip = document.getElementById('loadTooltip');
        const loadBars = document.querySelectorAll('.load-bar');
        
        loadBars.forEach(bar => {{
            bar.addEventListener('mouseenter', (e) => {{
                const load = bar.dataset.load;
                const slot = bar.dataset.slot;
                tooltip.innerHTML = '<strong>负荷: ' + load + '%</strong><br>时间: ' + slot;
                tooltip.style.left = (e.pageX + 10) + 'px';
                tooltip.style.top = (e.pageY + 10) + 'px';
                tooltip.classList.add('visible');
            }});
            
            bar.addEventListener('mouseleave', () => {{
                tooltip.classList.remove('visible');
            }});
        }});
    </script>
</body>
</html>
"""
        
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            logger.info(f"资源负荷图已生成: {output_path}")
        
        return html_content


class ScheduleVisualizer:
    def __init__(self):
        self.gantt_generator = GanttChartGenerator()
        self.load_visualizer = ResourceLoadVisualizer()
        
    def visualize_schedule(self, schedule_data: Dict, load_data: Dict, 
                           output_dir: str = None) -> Dict:
        self.gantt_generator.add_tasks_from_schedule(schedule_data)
        self.load_visualizer.add_load_from_data(load_data)
        
        gantt_data = self.gantt_generator.generate_gantt_data()
        load_data_result = self.load_visualizer.generate_load_data()
        
        results = {
            'gantt_data': gantt_data,
            'load_data': load_data_result,
            'gantt_html': None,
            'load_html': None
        }
        
        if output_dir:
            import os
            os.makedirs(output_dir, exist_ok=True)
            
            gantt_path = os.path.join(output_dir, 'gantt_chart.html')
            results['gantt_html'] = self.gantt_generator.generate_html_gantt(gantt_path)
            
            load_path = os.path.join(output_dir, 'resource_load_chart.html')
            results['load_html'] = self.load_visualizer.generate_html_load_chart(load_path)
        
        return results
