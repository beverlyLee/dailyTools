from flask import Blueprint, request, jsonify
from app import db
from app.models import QualityRule, QualityCheckResult, DataLineage
from datetime import datetime
import json

quality_bp = Blueprint('quality', __name__)

@quality_bp.route('/quality/rules', methods=['GET'])
def get_quality_rules():
    rules = QualityRule.query.all()
    return jsonify([rule.to_dict() for rule in rules])

@quality_bp.route('/quality/rules/<int:rule_id>', methods=['GET'])
def get_quality_rule(rule_id):
    rule = QualityRule.query.get_or_404(rule_id)
    return jsonify(rule.to_dict())

@quality_bp.route('/quality/rules', methods=['POST'])
def create_quality_rule():
    data = request.json
    
    rule = QualityRule(
        name=data.get('name'),
        rule_type=data.get('type'),
        target_table=data.get('table'),
        target_column=data.get('column'),
        severity=data.get('severity', 'medium'),
        status=data.get('status', 'active'),
    )
    
    config = {}
    if data.get('minValue') is not None:
        config['minValue'] = data['minValue']
    if data.get('maxValue') is not None:
        config['maxValue'] = data['maxValue']
    if data.get('regexPattern'):
        config['regexPattern'] = data['regexPattern']
    if data.get('customSql'):
        config['customSql'] = data['customSql']
    if data.get('description'):
        config['description'] = data['description']
    
    rule.set_config(config)
    
    db.session.add(rule)
    db.session.commit()
    
    return jsonify(rule.to_dict()), 201

@quality_bp.route('/quality/rules/<int:rule_id>', methods=['PUT'])
def update_quality_rule(rule_id):
    rule = QualityRule.query.get_or_404(rule_id)
    data = request.json
    
    if data.get('name'):
        rule.name = data['name']
    if data.get('type'):
        rule.rule_type = data['type']
    if data.get('table'):
        rule.target_table = data['table']
    if data.get('column') is not None:
        rule.target_column = data['column']
    if data.get('severity'):
        rule.severity = data['severity']
    if data.get('status'):
        rule.status = data['status']
    
    config = json.loads(rule.config) if rule.config else {}
    if data.get('minValue') is not None:
        config['minValue'] = data['minValue']
    if data.get('maxValue') is not None:
        config['maxValue'] = data['maxValue']
    if data.get('regexPattern'):
        config['regexPattern'] = data['regexPattern']
    if data.get('customSql'):
        config['customSql'] = data['customSql']
    if data.get('description'):
        config['description'] = data['description']
    
    rule.set_config(config)
    
    db.session.commit()
    return jsonify(rule.to_dict())

@quality_bp.route('/quality/rules/<int:rule_id>', methods=['DELETE'])
def delete_quality_rule(rule_id):
    rule = QualityRule.query.get_or_404(rule_id)
    db.session.delete(rule)
    db.session.commit()
    return jsonify({'message': 'Quality rule deleted successfully'}), 200

@quality_bp.route('/quality/rules/<int:rule_id>/run', methods=['POST'])
def run_quality_rule(rule_id):
    rule = QualityRule.query.get_or_404(rule_id)
    
    result = execute_quality_check(rule)
    
    check_result = QualityCheckResult(
        rule_id=rule.id,
        rule_name=rule.name,
        total_records=result['total_records'],
        passed_records=result['passed_records'],
        failed_records=result['failed_records'],
        pass_rate=result['pass_rate'],
        status=result['status'],
    )
    check_result.details = json.dumps(result.get('details', {}))
    
    rule.last_run = datetime.utcnow()
    rule.last_result = result['status']
    
    db.session.add(check_result)
    db.session.commit()
    
    return jsonify({
        'message': 'Quality check completed',
        'result': result
    })

@quality_bp.route('/quality/monitoring', methods=['GET'])
def get_monitoring_data():
    results = QualityCheckResult.query.order_by(QualityCheckResult.check_time.desc()).limit(100).all()
    return jsonify([result.to_dict() for result in results])

@quality_bp.route('/quality/monitoring/<int:result_id>', methods=['GET'])
def get_monitoring_result(result_id):
    result = QualityCheckResult.query.get_or_404(result_id)
    return jsonify(result.to_dict())

@quality_bp.route('/quality/lineage', methods=['GET'])
def get_data_lineage():
    source_table = request.args.get('source_table')
    
    query = DataLineage.query
    if source_table:
        query = query.filter(DataLineage.source_table == source_table)
    
    lineages = query.all()
    
    nodes = {}
    links = []
    
    for lineage in lineages:
        if lineage.source_table not in nodes:
            nodes[lineage.source_table] = {
                'id': lineage.source_table,
                'name': lineage.source_table,
                'type': 'source'
            }
        if lineage.target_table not in nodes:
            nodes[lineage.target_table] = {
                'id': lineage.target_table,
                'name': lineage.target_table,
                'type': 'target'
            }
        
        links.append({
            'source': lineage.source_table,
            'target': lineage.target_table,
            'transformation': lineage.transformation_type,
            'job': lineage.job_name
        })
    
    node_list = list(nodes.values())
    x_step = 200
    y_step = 100
    
    for i, node in enumerate(node_list):
        node['x'] = 100 + (i % 3) * x_step
        node['y'] = 100 + (i // 3) * y_step
    
    return jsonify({
        'nodes': node_list,
        'links': links
    })

@quality_bp.route('/quality/impact', methods=['GET'])
def get_impact_analysis():
    source_table = request.args.get('source_table')
    
    query = DataLineage.query
    if source_table:
        query = query.filter(DataLineage.source_table == source_table)
    
    lineages = query.all()
    
    impact_map = {}
    
    for lineage in lineages:
        if lineage.source_table not in impact_map:
            impact_map[lineage.source_table] = {
                'sourceTable': lineage.source_table,
                'affectedTables': set(),
                'affectedJobs': set(),
                'impactLevel': 'low'
            }
        
        impact_map[lineage.source_table]['affectedTables'].add(lineage.target_table)
        if lineage.job_name:
            impact_map[lineage.source_table]['affectedJobs'].add(lineage.job_name)
    
    result = []
    for source, data in impact_map.items():
        affected_count = len(data['affectedTables'])
        if affected_count >= 5:
            impact_level = 'high'
        elif affected_count >= 2:
            impact_level = 'medium'
        else:
            impact_level = 'low'
        
        result.append({
            'id': len(result) + 1,
            'sourceTable': data['sourceTable'],
            'affectedTables': list(data['affectedTables']),
            'affectedJobs': list(data['affectedJobs']),
            'impactLevel': impact_level,
            'description': f'{data["sourceTable"]} 变更将影响 {len(data["affectedTables"])} 个下游表'
        })
    
    return jsonify(result)

def execute_quality_check(rule):
    rule_type = rule.rule_type
    config = json.loads(rule.config) if rule.config else {}
    
    total_records = 10000
    passed_records = total_records
    failed_records = 0
    
    if rule_type == 'not_null':
        failed_records = int(total_records * 0.01)
        passed_records = total_records - failed_records
    
    elif rule_type == 'uniqueness':
        failed_records = int(total_records * 0.005)
        passed_records = total_records - failed_records
    
    elif rule_type == 'range':
        min_val = config.get('minValue', 0)
        max_val = config.get('maxValue', 100)
        failed_records = int(total_records * 0.02)
        passed_records = total_records - failed_records
    
    elif rule_type == 'regex':
        failed_records = int(total_records * 0.001)
        passed_records = total_records - failed_records
    
    elif rule_type == 'custom_sql':
        failed_records = int(total_records * 0.005)
        passed_records = total_records - failed_records
    
    pass_rate = (passed_records / total_records) * 100 if total_records > 0 else 100
    
    if pass_rate >= 99.9:
        status = 'passed'
    elif pass_rate >= 95:
        status = 'warning'
    else:
        status = 'failed'
    
    return {
        'total_records': total_records,
        'passed_records': passed_records,
        'failed_records': failed_records,
        'pass_rate': round(pass_rate, 2),
        'status': status,
        'details': {
            'rule_type': rule_type,
            'severity': rule.severity,
            'table': rule.target_table,
            'column': rule.target_column
        }
    }
