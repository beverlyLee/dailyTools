from app import db
from datetime import datetime
import json

class DAG(db.Model):
    __tablename__ = 'data_engineering_dags'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    description = db.Column(db.Text)
    schedule_interval = db.Column(db.String(50), default='@daily')
    nodes = db.Column(db.Text)
    connections = db.Column(db.Text)
    status = db.Column(db.String(50), default='draft')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'schedule_interval': self.schedule_interval,
            'nodes': json.loads(self.nodes) if self.nodes else [],
            'connections': json.loads(self.connections) if self.connections else [],
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def set_nodes(self, nodes_list):
        self.nodes = json.dumps(nodes_list)
    
    def set_connections(self, connections_list):
        self.connections = json.dumps(connections_list)


class QualityRule(db.Model):
    __tablename__ = 'quality_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    rule_type = db.Column(db.String(50), nullable=False)
    target_table = db.Column(db.String(255), nullable=False)
    target_column = db.Column(db.String(255))
    severity = db.Column(db.String(20), default='medium')
    status = db.Column(db.String(20), default='active')
    config = db.Column(db.Text)
    last_run = db.Column(db.DateTime)
    last_result = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.rule_type,
            'table': self.target_table,
            'column': self.target_column,
            'severity': self.severity,
            'status': self.status,
            'config': json.loads(self.config) if self.config else {},
            'lastRun': self.last_run.strftime('%Y-%m-%d %H:%M:%S') if self.last_run else None,
            'lastResult': self.last_result,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
    
    def set_config(self, config_dict):
        self.config = json.dumps(config_dict)


class QualityCheckResult(db.Model):
    __tablename__ = 'quality_check_results'
    
    id = db.Column(db.Integer, primary_key=True)
    rule_id = db.Column(db.Integer, db.ForeignKey('quality_rules.id'))
    rule_name = db.Column(db.String(255))
    check_time = db.Column(db.DateTime, default=datetime.utcnow)
    total_records = db.Column(db.Integer, default=0)
    passed_records = db.Column(db.Integer, default=0)
    failed_records = db.Column(db.Integer, default=0)
    pass_rate = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20))
    details = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'ruleName': self.rule_name,
            'checkTime': self.check_time.strftime('%Y-%m-%d %H:%M:%S') if self.check_time else None,
            'totalRecords': self.total_records,
            'passedRecords': self.passed_records,
            'failedRecords': self.failed_records,
            'passRate': self.pass_rate,
            'status': self.status,
            'details': json.loads(self.details) if self.details else {},
        }


class DataSourceConnection(db.Model):
    __tablename__ = 'data_source_connections'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    connection_type = db.Column(db.String(50), nullable=False)
    host = db.Column(db.String(255), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    database = db.Column(db.String(255))
    username = db.Column(db.String(255))
    password = db.Column(db.String(255))
    status = db.Column(db.String(20), default='active')
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.connection_type,
            'host': self.host,
            'port': self.port,
            'database': self.database,
            'username': self.username,
            'status': self.status,
            'description': self.description,
        }


class SystemSetting(db.Model):
    __tablename__ = 'system_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(255), unique=True, nullable=False)
    setting_value = db.Column(db.Text)
    setting_type = db.Column(db.String(50), default='string')
    description = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'key': self.setting_key,
            'value': self.setting_value,
            'type': self.setting_type,
            'description': self.description,
        }


class DataLineage(db.Model):
    __tablename__ = 'data_lineage'
    
    id = db.Column(db.Integer, primary_key=True)
    source_table = db.Column(db.String(255), nullable=False)
    target_table = db.Column(db.String(255), nullable=False)
    transformation_type = db.Column(db.String(50))
    job_name = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'sourceTable': self.source_table,
            'targetTable': self.target_table,
            'transformationType': self.transformation_type,
            'jobName': self.job_name,
        }
