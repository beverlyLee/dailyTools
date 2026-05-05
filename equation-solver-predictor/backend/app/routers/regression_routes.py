from flask import Blueprint, request, jsonify
from ..services.regression_trainer import regression_trainer
from ..database import db
from ..models import HousingModel, PredictionHistory
import json
import os
import pandas as pd
import numpy as np

regression_bp = Blueprint('regression', __name__)

# 默认数据路径
DEFAULT_DATA_PATH = os.path.join(os.path.dirname(__file__), '../../data/housing_data.csv')

@regression_bp.route('/train', methods=['POST'])
def train_model():
    """训练房价预测模型"""
    try:
        data = request.get_json()
        
        # 检查是否有上传的文件路径，或者使用默认路径
        file_path = data.get('file_path', DEFAULT_DATA_PATH)
        target_col = data.get('target_col', 'price')
        feature_cols = data.get('feature_cols')  # 可选，不指定则自动选择
        scaling_method = data.get('scaling_method', 'standard')
        test_size = data.get('test_size', 0.2)
        save_to_db = data.get('save_to_db', True)
        
        if not os.path.exists(file_path):
            return jsonify({'error': f'数据文件不存在: {file_path}'}), 400
        
        # 训练模型
        result = regression_trainer.train_from_file(
            file_path, target_col, feature_cols, scaling_method, test_size
        )
        
        response = {
            'success': True,
            'model_info': result
        }
        
        # 保存到数据库
        if save_to_db:
            try:
                model_info = regression_trainer.save_model_info()
                housing_model = HousingModel(**model_info)
                db.session.add(housing_model)
                db.session.commit()
                response['saved_model_id'] = housing_model.id
            except Exception as e:
                db.session.rollback()
                response['save_error'] = str(e)
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@regression_bp.route('/predict', methods=['POST'])
def predict():
    """预测房价"""
    try:
        data = request.get_json()
        
        features = data.get('features', {})
        model_id = data.get('model_id')  # 可选，不指定则使用当前训练的模型
        save_history = data.get('save_history', True)
        
        if not features:
            return jsonify({'error': '缺少特征参数'}), 400
        
        # 如果指定了 model_id，从数据库加载模型
        if model_id:
            try:
                db_model = HousingModel.query.get(model_id)
                if db_model:
                    regression_trainer.load_model_from_db(db_model)
                else:
                    return jsonify({'error': f'未找到模型 ID: {model_id}'}), 404
            except Exception as e:
                return jsonify({'error': f'加载模型失败: {str(e)}'}), 500
        
        # 检查模型是否已训练
        if not regression_trainer.trained:
            # 尝试使用默认数据训练
            if os.path.exists(DEFAULT_DATA_PATH):
                regression_trainer.train_from_file(DEFAULT_DATA_PATH)
            else:
                return jsonify({'error': '模型尚未训练，且找不到默认数据'}), 400
        
        # 预测
        predicted_price = regression_trainer.predict(features)
        
        response = {
            'success': True,
            'predicted_price': predicted_price,
            'features': features
        }
        
        # 保存预测历史
        if save_history and model_id:
            try:
                pred_history = PredictionHistory(
                    model_id=model_id,
                    input_features=json.dumps(features),
                    predicted_price=predicted_price
                )
                db.session.add(pred_history)
                db.session.commit()
            except Exception as e:
                db.session.rollback()
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@regression_bp.route('/predict-batch', methods=['POST'])
def predict_batch():
    """批量预测"""
    try:
        data = request.get_json()
        
        features_list = data.get('features_list', [])
        model_id = data.get('model_id')
        
        if not features_list:
            return jsonify({'error': '缺少特征列表'}), 400
        
        # 加载模型
        if model_id:
            try:
                db_model = HousingModel.query.get(model_id)
                if db_model:
                    regression_trainer.load_model_from_db(db_model)
                else:
                    return jsonify({'error': f'未找到模型 ID: {model_id}'}), 404
            except Exception as e:
                return jsonify({'error': f'加载模型失败: {str(e)}'}), 500
        
        if not regression_trainer.trained:
            return jsonify({'error': '模型尚未训练'}), 400
        
        predictions = regression_trainer.predict_batch(features_list)
        
        return jsonify({
            'success': True,
            'predictions': [
                {'features': f, 'predicted_price': p}
                for f, p in zip(features_list, predictions)
            ]
        })
    
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@regression_bp.route('/models', methods=['GET'])
def get_saved_models():
    """获取所有保存的模型"""
    try:
        models = HousingModel.query.order_by(HousingModel.created_at.desc()).all()
        return jsonify({
            'success': True,
            'models': [m.to_dict() for m in models]
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@regression_bp.route('/models/<int:model_id>', methods=['GET'])
def get_model_by_id(model_id):
    """获取指定模型详情"""
    try:
        model = HousingModel.query.get_or_404(model_id)
        return jsonify({
            'success': True,
            'model': model.to_dict()
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@regression_bp.route('/feature-importance', methods=['GET'])
def get_feature_importance():
    """获取当前模型的特征重要性"""
    try:
        if not regression_trainer.trained:
            # 尝试使用默认数据训练
            if os.path.exists(DEFAULT_DATA_PATH):
                regression_trainer.train_from_file(DEFAULT_DATA_PATH)
            else:
                return jsonify({'error': '模型尚未训练'}), 400
        
        return jsonify({
            'success': True,
            'feature_importance': regression_trainer.get_feature_importance()
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@regression_bp.route('/residuals', methods=['GET'])
def get_residuals():
    """获取残差数据"""
    try:
        if not regression_trainer.trained or not regression_trainer.model_info:
            return jsonify({'error': '模型尚未训练或没有残差数据'}), 400
        
        residuals = regression_trainer.model_info.get('residuals', {})
        return jsonify({
            'success': True,
            'residuals': residuals
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@regression_bp.route('/data-info', methods=['GET'])
def get_data_info():
    """获取默认数据的信息"""
    try:
        if not os.path.exists(DEFAULT_DATA_PATH):
            return jsonify({'error': '默认数据文件不存在'}), 404
        
        df = pd.read_csv(DEFAULT_DATA_PATH)
        
        # 统计信息
        stats = {}
        for col in df.select_dtypes(include=[np.number]).columns:
            stats[col] = {
                'mean': float(df[col].mean()),
                'std': float(df[col].std()),
                'min': float(df[col].min()),
                'max': float(df[col].max()),
                'median': float(df[col].median())
            }
        
        return jsonify({
            'success': True,
            'data_info': {
                'columns': df.columns.tolist(),
                'dtypes': df.dtypes.astype(str).to_dict(),
                'row_count': len(df),
                'column_count': len(df.columns),
                'statistics': stats,
                'sample_data': df.head(5).to_dict(orient='records')
            }
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@regression_bp.route('/prediction-history', methods=['GET'])
def get_prediction_history():
    """获取预测历史"""
    try:
        model_id = request.args.get('model_id', type=int)
        limit = request.args.get('limit', 20, type=int)
        
        query = PredictionHistory.query
        if model_id:
            query = query.filter_by(model_id=model_id)
        
        history = query.order_by(PredictionHistory.created_at.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'history': [h.to_dict() for h in history]
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500
