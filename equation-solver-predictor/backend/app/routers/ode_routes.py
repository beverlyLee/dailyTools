from flask import Blueprint, request, jsonify
from ..services.ode_solver import ode_solver
from ..database import db
from ..models import ODESolution
import json
import numpy as np

ode_bp = Blueprint('ode', __name__)

@ode_bp.route('/models', methods=['GET'])
def get_classical_models():
    """获取所有经典 ODE 模型列表"""
    models_info = {
        'lorenz': {
            'name': '洛伦兹吸引子',
            'description': '混沌系统的经典示例，展现蝴蝶效应',
            'equations': [
                'dx/dt = σ(y - x)',
                'dy/dt = x(ρ - z) - y',
                'dz/dt = xy - βz'
            ],
            'default_params': {'sigma': 10.0, 'rho': 28.0, 'beta': 8.0/3.0},
            'default_initial': [1.0, 1.0, 1.0],
            'dimensions': 3
        },
        'predator_prey': {
            'name': '捕食者-猎物模型',
            'description': 'Lotka-Volterra 方程，描述生态系统中物种相互作用',
            'equations': [
                'dprey/dt = α·prey - β·prey·predator',
                'dpredator/dt = δ·prey·predator - γ·predator'
            ],
            'default_params': {'alpha': 1.0, 'beta': 0.1, 'delta': 0.075, 'gamma': 1.5},
            'default_initial': [10.0, 5.0],
            'dimensions': 2
        },
        'van_der_pol': {
            'name': 'Van der Pol 振荡器',
            'description': '具有极限环的非线性振荡器',
            'equations': [
                'dx/dt = v',
                'dv/dt = μ(1 - x²)v - x'
            ],
            'default_params': {'mu': 1.0},
            'default_initial': [1.0, 0.0],
            'dimensions': 2
        },
        'harmonic': {
            'name': '简谐振荡器',
            'description': '基础的线性振荡器系统',
            'equations': [
                'dx/dt = v',
                'dv/dt = -ω²x - ξv'
            ],
            'default_params': {'omega': 1.0, 'damping': 0.0},
            'default_initial': [1.0, 0.0],
            'dimensions': 2
        }
    }
    return jsonify(models_info)

@ode_bp.route('/methods', methods=['GET'])
def get_solution_methods():
    """获取所有数值求解方法"""
    methods = {
        'euler': {
            'name': '欧拉法',
            'description': '最简单的数值方法，一阶精度',
            'order': 1,
            'stability': '条件稳定'
        },
        'rk4': {
            'name': '四阶龙格-库塔法',
            'description': '经典的四阶精度方法，精度高',
            'order': 4,
            'stability': '条件稳定'
        },
        'scipy': {
            'name': 'SciPy 自适应求解器',
            'description': '使用 SciPy 的自适应步长求解器',
            'order': '自适应',
            'stability': '自适应'
        }
    }
    return jsonify(methods)

@ode_bp.route('/solve', methods=['POST'])
def solve_ode():
    """求解 ODE"""
    try:
        data = request.get_json()
        
        model_name = data.get('model_name')
        initial_conditions = data.get('initial_conditions', [])
        time_span = data.get('time_span', [0.0, 100.0])
        dt = data.get('dt', 0.01)
        method = data.get('method', 'rk4')
        parameters = data.get('parameters', {})
        save_to_db = data.get('save_to_db', False)
        
        if not model_name:
            return jsonify({'error': '缺少 model_name 参数'}), 400
        
        # 转换为 numpy 数组
        y0 = np.array(initial_conditions, dtype=float)
        t_span = (float(time_span[0]), float(time_span[1]))
        
        # 求解
        solution = ode_solver.solve_classical_model(
            model_name, y0, t_span, float(dt), method, parameters
        )
        
        # 计算庞加莱截面（如果是 3D 系统）
        poincare_points = None
        if len(initial_conditions) == 3:
            try:
                poincare_points = ode_solver.poincare_section(
                    solution, plane='z', value=0.0, direction=1
                )
            except Exception as e:
                poincare_points = []
        
        result = {
            'success': True,
            'solution': solution,
            'poincare_section': poincare_points
        }
        
        # 保存到数据库
        if save_to_db:
            try:
                ode_sol = ODESolution(
                    equation_type=model_name,
                    equation_form=json.dumps(solution.get('model', model_name)),
                    initial_conditions=json.dumps(initial_conditions),
                    parameters=json.dumps(parameters),
                    method=method,
                    time_span=json.dumps(time_span),
                    solution_data=json.dumps(solution)
                )
                db.session.add(ode_sol)
                db.session.commit()
                result['saved_id'] = ode_sol.id
            except Exception as e:
                db.session.rollback()
                result['save_error'] = str(e)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@ode_bp.route('/parameter-scan', methods=['POST'])
def parameter_scan():
    """参数扫描"""
    try:
        data = request.get_json()
        
        model_name = data.get('model_name')
        initial_conditions = data.get('initial_conditions', [])
        time_span = data.get('time_span', [0.0, 100.0])
        dt = data.get('dt', 0.01)
        method = data.get('method', 'rk4')
        param_name = data.get('param_name')
        param_range = data.get('param_range', [0.0, 10.0])
        n_steps = data.get('n_steps', 10)
        
        if not model_name or not param_name:
            return jsonify({'error': '缺少必需参数'}), 400
        
        y0 = np.array(initial_conditions, dtype=float)
        t_span_tuple = (float(time_span[0]), float(time_span[1]))
        param_range_tuple = (float(param_range[0]), float(param_range[1]))
        
        scan_results = ode_solver.parameter_scan(
            model_name, y0, t_span_tuple, float(dt),
            param_name, param_range_tuple, int(n_steps), method
        )
        
        # 为每个结果提取关键指标（用于可视化）
        summary = []
        for result in scan_results['results']:
            if 'error' not in result:
                sol = result['solution']
                y = np.array(sol['solution'])
                # 计算一些统计特征
                summary.append({
                    'parameter': result['parameter'],
                    'mean': y.mean(axis=0).tolist(),
                    'std': y.std(axis=0).tolist(),
                    'min': y.min(axis=0).tolist(),
                    'max': y.max(axis=0).tolist()
                })
            else:
                summary.append({
                    'parameter': result['parameter'],
                    'error': result['error']
                })
        
        return jsonify({
            'success': True,
            'scan': scan_results,
            'summary': summary
        })
    
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@ode_bp.route('/history', methods=['GET'])
def get_solution_history():
    """获取历史求解记录"""
    try:
        solutions = ODESolution.query.order_by(ODESolution.created_at.desc()).limit(20).all()
        return jsonify({
            'success': True,
            'solutions': [sol.to_dict() for sol in solutions]
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@ode_bp.route('/history/<int:sol_id>', methods=['GET'])
def get_solution_by_id(sol_id):
    """根据 ID 获取求解结果"""
    try:
        solution = ODESolution.query.get_or_404(sol_id)
        return jsonify({
            'success': True,
            'solution': solution.to_dict()
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500
