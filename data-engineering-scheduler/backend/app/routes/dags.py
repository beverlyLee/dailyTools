from flask import Blueprint, request, jsonify
from app import db
from app.models import DAG
from datetime import datetime
import json

dags_bp = Blueprint('dags', __name__)

@dags_bp.route('/dags', methods=['GET'])
def get_dags():
    dags = DAG.query.all()
    return jsonify([dag.to_dict() for dag in dags])

@dags_bp.route('/dags/<int:dag_id>', methods=['GET'])
def get_dag(dag_id):
    dag = DAG.query.get_or_404(dag_id)
    return jsonify(dag.to_dict())

@dags_bp.route('/dags', methods=['POST'])
def create_dag():
    data = request.json
    
    if DAG.query.filter_by(name=data.get('name')).first():
        return jsonify({'error': 'DAG name already exists'}), 400
    
    dag = DAG(
        name=data.get('name'),
        description=data.get('description'),
        schedule_interval=data.get('schedule_interval', '@daily'),
        status='draft'
    )
    dag.set_nodes(data.get('nodes', []))
    dag.set_connections(data.get('connections', []))
    
    db.session.add(dag)
    db.session.commit()
    
    generate_airflow_dag(dag)
    
    return jsonify(dag.to_dict()), 201

@dags_bp.route('/dags/<int:dag_id>', methods=['PUT'])
def update_dag(dag_id):
    dag = DAG.query.get_or_404(dag_id)
    data = request.json
    
    if data.get('name') and data['name'] != dag.name:
        if DAG.query.filter_by(name=data['name']).first():
            return jsonify({'error': 'DAG name already exists'}), 400
        dag.name = data['name']
    
    if data.get('description') is not None:
        dag.description = data['description']
    if data.get('schedule_interval') is not None:
        dag.schedule_interval = data['schedule_interval']
    if data.get('status') is not None:
        dag.status = data['status']
    if data.get('nodes') is not None:
        dag.set_nodes(data['nodes'])
    if data.get('connections') is not None:
        dag.set_connections(data['connections'])
    
    db.session.commit()
    
    if dag.status == 'active':
        generate_airflow_dag(dag)
    
    return jsonify(dag.to_dict())

@dags_bp.route('/dags/<int:dag_id>', methods=['DELETE'])
def delete_dag(dag_id):
    dag = DAG.query.get_or_404(dag_id)
    db.session.delete(dag)
    db.session.commit()
    return jsonify({'message': 'DAG deleted successfully'}), 200

@dags_bp.route('/dags/run', methods=['POST'])
def run_dag():
    data = request.json
    nodes = data.get('nodes', [])
    connections = data.get('connections', [])
    
    execution_order = topological_sort(nodes, connections)
    
    for node_id in execution_order:
        node = next((n for n in nodes if n['id'] == node_id), None)
        if node:
            execute_node(node)
    
    return jsonify({
        'message': 'DAG execution started',
        'execution_order': execution_order
    })

@dags_bp.route('/dags/<int:dag_id>/run', methods=['POST'])
def run_saved_dag(dag_id):
    dag = DAG.query.get_or_404(dag_id)
    nodes = json.loads(dag.nodes) if dag.nodes else []
    connections = json.loads(dag.connections) if dag.connections else []
    
    execution_order = topological_sort(nodes, connections)
    
    for node_id in execution_order:
        node = next((n for n in nodes if n['id'] == node_id), None)
        if node:
            execute_node(node)
    
    return jsonify({
        'message': f'DAG {dag.name} execution started',
        'execution_order': execution_order
    })

def topological_sort(nodes, connections):
    if not nodes:
        return []
    
    in_degree = {node['id']: 0 for node in nodes}
    adjacency = {node['id']: [] for node in nodes}
    
    for conn in connections:
        if conn['from'] in adjacency and conn['to'] in in_degree:
            adjacency[conn['from']].append(conn['to'])
            in_degree[conn['to']] += 1
    
    queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
    result = []
    
    while queue:
        node_id = queue.pop(0)
        result.append(node_id)
        
        for neighbor in adjacency[node_id]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    return result

def execute_node(node):
    node_type = node.get('type')
    config = node.get('config', {})
    
    print(f"Executing node: {node['name']} (type: {node_type})")
    
    if node_type == 'extract':
        pass
    elif node_type == 'transform':
        pass
    elif node_type == 'load':
        pass
    elif node_type == 'quality_check':
        pass
    
    return True

def generate_airflow_dag(dag):
    dag_name = dag.name.replace(' ', '_').lower()
    nodes = json.loads(dag.nodes) if dag.nodes else []
    connections = json.loads(dag.connections) if dag.connections else []
    
    node_map = {node['id']: node for node in nodes}
    execution_order = topological_sort(nodes, connections)
    
    dag_code = f"""from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from airflow.utils.dates import days_ago

default_args = {{
    'owner': 'data_engineering',
    'depends_on_past': False,
    'start_date': days_ago(1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}}

dag = DAG(
    '{dag_name}',
    default_args=default_args,
    description='{dag.description or ''}',
    schedule_interval='{dag.schedule_interval}',
    catchup=False,
    tags=['data_engineering'],
)

"""
    
    for node_id in execution_order:
        node = node_map[node_id]
        node_name = node['name'].replace(' ', '_').lower()
        config = node.get('config', {})
        
        dag_code += f"""def execute_{node_name}():
    print("Executing {node['name']} ({node['type']})")
    
"""
    
    dag_code += "\n"
    
    task_vars = []
    for node_id in execution_order:
        node = node_map[node_id]
        node_name = node['name'].replace(' ', '_').lower()
        config = node.get('config', {})
        retries = config.get('retryCount', 3)
        retry_delay = config.get('retryDelay', 5)
        
        task_var = f"task_{node_name}"
        task_vars.append(task_var)
        
        dag_code += f"""{task_var} = PythonOperator(
    task_id='{node['name']}',
    python_callable=execute_{node_name},
    retries={retries},
    retry_delay=timedelta(seconds={retry_delay}),
    dag=dag,
)

"""
    
    if connections:
        dag_code += "\n"
        for conn in connections:
            from_node = node_map.get(conn['from'])
            to_node = node_map.get(conn['to'])
            if from_node and to_node:
                from_name = from_node['name'].replace(' ', '_').lower()
                to_name = to_node['name'].replace(' ', '_').lower()
                dag_code += f"task_{from_name} >> task_{to_name}\n"
    
    dag_file_path = f"/app/airflow/dags/{dag_name}.py"
    try:
        with open(dag_file_path, 'w') as f:
            f.write(dag_code)
        print(f"Generated Airflow DAG: {dag_file_path}")
    except Exception as e:
        print(f"Error generating DAG file: {e}")
    
    return dag_code
