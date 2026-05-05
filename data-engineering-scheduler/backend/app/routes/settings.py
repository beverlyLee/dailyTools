from flask import Blueprint, request, jsonify
from app import db
from app.models import SystemSetting
import json

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/settings', methods=['GET'])
def get_all_settings():
    settings = SystemSetting.query.all()
    return jsonify([setting.to_dict() for setting in settings])

@settings_bp.route('/settings/<key>', methods=['GET'])
def get_setting(key):
    setting = SystemSetting.query.filter_by(setting_key=key).first()
    if not setting:
        return jsonify({'error': 'Setting not found'}), 404
    return jsonify(setting.to_dict())

@settings_bp.route('/settings', methods=['POST'])
def create_or_update_setting():
    data = request.json
    key = data.get('key')
    value = data.get('value')
    setting_type = data.get('type', 'string')
    description = data.get('description')
    
    setting = SystemSetting.query.filter_by(setting_key=key).first()
    
    if setting:
        setting.setting_value = value
        setting.setting_type = setting_type
        if description:
            setting.description = description
    else:
        setting = SystemSetting(
            setting_key=key,
            setting_value=value,
            setting_type=setting_type,
            description=description,
        )
        db.session.add(setting)
    
    db.session.commit()
    return jsonify(setting.to_dict())

@settings_bp.route('/settings/<key>', methods=['DELETE'])
def delete_setting(key):
    setting = SystemSetting.query.filter_by(setting_key=key).first()
    if not setting:
        return jsonify({'error': 'Setting not found'}), 404
    
    db.session.delete(setting)
    db.session.commit()
    return jsonify({'message': 'Setting deleted successfully'}), 200

@settings_bp.route('/settings/alerts', methods=['GET'])
def get_alert_settings():
    settings = {
        'emailEnabled': get_setting_value('alert.email_enabled', True, bool),
        'smtpServer': get_setting_value('alert.smtp_server', 'smtp.example.com'),
        'smtpPort': get_setting_value('alert.smtp_port', 587, int),
        'senderEmail': get_setting_value('alert.sender_email', 'admin@example.com'),
        'senderPassword': get_setting_value('alert.sender_password', ''),
        'webhookEnabled': get_setting_value('alert.webhook_enabled', False, bool),
        'webhookUrl': get_setting_value('alert.webhook_url', ''),
        'webhookMethod': get_setting_value('alert.webhook_method', 'POST'),
    }
    return jsonify(settings)

@settings_bp.route('/settings/alerts', methods=['POST'])
def save_alert_settings():
    data = request.json
    
    set_setting_value('alert.email_enabled', data.get('emailEnabled', True))
    set_setting_value('alert.smtp_server', data.get('smtpServer', 'smtp.example.com'))
    set_setting_value('alert.smtp_port', data.get('smtpPort', 587))
    set_setting_value('alert.sender_email', data.get('senderEmail', 'admin@example.com'))
    set_setting_value('alert.sender_password', data.get('senderPassword', ''))
    set_setting_value('alert.webhook_enabled', data.get('webhookEnabled', False))
    set_setting_value('alert.webhook_url', data.get('webhookUrl', ''))
    set_setting_value('alert.webhook_method', data.get('webhookMethod', 'POST'))
    
    db.session.commit()
    return jsonify({'message': 'Alert settings saved successfully'})

@settings_bp.route('/settings/system', methods=['GET'])
def get_system_settings():
    settings = {
        'maxRetryCount': get_setting_value('system.max_retry_count', 3, int),
        'defaultRetryDelay': get_setting_value('system.default_retry_delay', 5, int),
        'taskTimeout': get_setting_value('system.task_timeout', 3600, int),
        'parallelTasks': get_setting_value('system.parallel_tasks', 10, int),
        'logRetentionDays': get_setting_value('system.log_retention_days', 30, int),
        'autoCleanup': get_setting_value('system.auto_cleanup', True, bool),
    }
    return jsonify(settings)

@settings_bp.route('/settings/system', methods=['POST'])
def save_system_settings():
    data = request.json
    
    set_setting_value('system.max_retry_count', data.get('maxRetryCount', 3))
    set_setting_value('system.default_retry_delay', data.get('defaultRetryDelay', 5))
    set_setting_value('system.task_timeout', data.get('taskTimeout', 3600))
    set_setting_value('system.parallel_tasks', data.get('parallelTasks', 10))
    set_setting_value('system.log_retention_days', data.get('logRetentionDays', 30))
    set_setting_value('system.auto_cleanup', data.get('autoCleanup', True))
    
    db.session.commit()
    return jsonify({'message': 'System settings saved successfully'})

@settings_bp.route('/settings/airflow', methods=['GET'])
def get_airflow_settings():
    settings = {
        'airflowUrl': get_setting_value('airflow.url', 'http://localhost:8080'),
        'airflowUsername': get_setting_value('airflow.username', 'admin'),
        'airflowPassword': get_setting_value('airflow.password', ''),
        'dagsFolder': get_setting_value('airflow.dags_folder', '/opt/airflow/dags'),
    }
    return jsonify(settings)

@settings_bp.route('/settings/airflow', methods=['POST'])
def save_airflow_settings():
    data = request.json
    
    set_setting_value('airflow.url', data.get('airflowUrl', 'http://localhost:8080'))
    set_setting_value('airflow.username', data.get('airflowUsername', 'admin'))
    set_setting_value('airflow.password', data.get('airflowPassword', ''))
    set_setting_value('airflow.dags_folder', data.get('dagsFolder', '/opt/airflow/dags'))
    
    db.session.commit()
    return jsonify({'message': 'Airflow settings saved successfully'})

def get_setting_value(key, default=None, value_type=str):
    setting = SystemSetting.query.filter_by(setting_key=key).first()
    if not setting:
        return default
    
    value = setting.setting_value
    
    if value_type == bool:
        return value.lower() in ('true', '1', 'yes') if isinstance(value, str) else bool(value)
    elif value_type == int:
        try:
            return int(value)
        except (ValueError, TypeError):
            return default
    elif value_type == float:
        try:
            return float(value)
        except (ValueError, TypeError):
            return default
    elif value_type == list or value_type == dict:
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return default
    
    return value

def set_setting_value(key, value):
    setting = SystemSetting.query.filter_by(setting_key=key).first()
    
    if isinstance(value, (list, dict)):
        value_str = json.dumps(value)
    else:
        value_str = str(value)
    
    if setting:
        setting.setting_value = value_str
    else:
        setting = SystemSetting(
            setting_key=key,
            setting_value=value_str,
            setting_type='string',
        )
        db.session.add(setting)
    
    return setting
