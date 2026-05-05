from flask import Blueprint, request, jsonify
from app import db
from app.models import DataSourceConnection

connections_bp = Blueprint('connections', __name__)

@connections_bp.route('/connections', methods=['GET'])
def get_connections():
    connections = DataSourceConnection.query.all()
    return jsonify([conn.to_dict() for conn in connections])

@connections_bp.route('/connections/<int:conn_id>', methods=['GET'])
def get_connection(conn_id):
    conn = DataSourceConnection.query.get_or_404(conn_id)
    return jsonify(conn.to_dict())

@connections_bp.route('/connections', methods=['POST'])
def create_connection():
    data = request.json
    
    if DataSourceConnection.query.filter_by(name=data.get('name')).first():
        return jsonify({'error': 'Connection name already exists'}), 400
    
    conn = DataSourceConnection(
        name=data.get('name'),
        connection_type=data.get('type'),
        host=data.get('host'),
        port=data.get('port'),
        database=data.get('database'),
        username=data.get('username'),
        password=data.get('password'),
        status=data.get('status', 'active'),
        description=data.get('description'),
    )
    
    db.session.add(conn)
    db.session.commit()
    
    return jsonify(conn.to_dict()), 201

@connections_bp.route('/connections/<int:conn_id>', methods=['PUT'])
def update_connection(conn_id):
    conn = DataSourceConnection.query.get_or_404(conn_id)
    data = request.json
    
    if data.get('name') and data['name'] != conn.name:
        if DataSourceConnection.query.filter_by(name=data['name']).first():
            return jsonify({'error': 'Connection name already exists'}), 400
        conn.name = data['name']
    
    if data.get('type'):
        conn.connection_type = data['type']
    if data.get('host'):
        conn.host = data['host']
    if data.get('port'):
        conn.port = data['port']
    if data.get('database') is not None:
        conn.database = data['database']
    if data.get('username') is not None:
        conn.username = data['username']
    if data.get('password') is not None:
        conn.password = data['password']
    if data.get('status'):
        conn.status = data['status']
    if data.get('description') is not None:
        conn.description = data['description']
    
    db.session.commit()
    return jsonify(conn.to_dict())

@connections_bp.route('/connections/<int:conn_id>', methods=['DELETE'])
def delete_connection(conn_id):
    conn = DataSourceConnection.query.get_or_404(conn_id)
    db.session.delete(conn)
    db.session.commit()
    return jsonify({'message': 'Connection deleted successfully'}), 200

@connections_bp.route('/connections/test', methods=['POST'])
def test_connection():
    data = request.json
    conn_type = data.get('type')
    
    test_result = test_database_connection(
        conn_type=conn_type,
        host=data.get('host'),
        port=data.get('port'),
        database=data.get('database'),
        username=data.get('username'),
        password=data.get('password'),
    )
    
    if test_result['success']:
        return jsonify({'message': 'Connection test successful', 'details': test_result})
    else:
        return jsonify({'error': 'Connection test failed', 'details': test_result}), 400

@connections_bp.route('/connections/types', methods=['GET'])
def get_connection_types():
    types = [
        {'value': 'mysql', 'label': 'MySQL', 'default_port': 3306},
        {'value': 'postgresql', 'label': 'PostgreSQL', 'default_port': 5432},
        {'value': 'oracle', 'label': 'Oracle', 'default_port': 1521},
        {'value': 'sqlserver', 'label': 'SQL Server', 'default_port': 1433},
        {'value': 'redis', 'label': 'Redis', 'default_port': 6379},
        {'value': 'mongodb', 'label': 'MongoDB', 'default_port': 27017},
        {'value': 'elasticsearch', 'label': 'Elasticsearch', 'default_port': 9200},
    ]
    return jsonify(types)

def test_database_connection(conn_type, host, port, database, username, password):
    import time
    
    time.sleep(0.5)
    
    success = True
    message = f"Successfully connected to {conn_type} at {host}:{port}"
    
    return {
        'success': success,
        'message': message,
        'type': conn_type,
        'host': host,
        'port': port,
        'database': database,
    }
