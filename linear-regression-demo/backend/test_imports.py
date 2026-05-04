import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("测试后端导入...")

try:
    from app.database import init_db, ModelMetadata, FeatureImportance, ResidualData
    print("✅ 数据库模块导入成功")
except ImportError as e:
    print(f"❌ 数据库模块导入失败: {e}")
    sys.exit(1)

try:
    from app.services.data_service import DataService
    print("✅ 数据服务模块导入成功")
except ImportError as e:
    print(f"❌ 数据服务模块导入失败: {e}")
    sys.exit(1)

try:
    from app.services.model_service import ModelService
    print("✅ 模型服务模块导入成功")
except ImportError as e:
    print(f"❌ 模型服务模块导入失败: {e}")
    sys.exit(1)

try:
    from app.routers.housing import router
    print("✅ 路由模块导入成功")
except ImportError as e:
    print(f"❌ 路由模块导入失败: {e}")
    sys.exit(1)

print("\n测试数据服务功能...")
try:
    data_service = DataService()
    
    data_path = os.path.join(os.path.dirname(__file__), 'data', 'housing_data.csv')
    df = data_service.load_csv(data_path)
    print(f"✅ 成功加载CSV数据，共 {len(df)} 行")
    
    df_cleaned = data_service.clean_data(df)
    print(f"✅ 数据清洗完成，剩余 {len(df_cleaned)} 行")
    
    X, y = data_service.prepare_features(df_cleaned)
    print(f"✅ 特征准备完成，特征数: {len(data_service.feature_columns)}")
    
    X_normalized, scaler = data_service.normalize_data(X)
    print(f"✅ 数据归一化完成")
    
    X_train, X_test, y_train, y_test = data_service.split_data(X_normalized, y)
    print(f"✅ 数据分割完成: 训练集 {len(X_train)} 样本, 测试集 {len(X_test)} 样本")
    
except Exception as e:
    print(f"❌ 数据服务测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n测试模型服务功能...")
try:
    model_service = ModelService()
    
    model_service.train_model(X_train, y_train, data_service.feature_columns, 'price')
    print("✅ 模型训练完成")
    
    metrics = model_service.evaluate_model(X_test, y_test)
    print(f"✅ 模型评估完成: R² = {metrics['r2_score']:.4f}, MSE = {metrics['mse']:.2f}")
    
    feature_importance = model_service.get_feature_importance()
    print(f"✅ 特征重要性计算完成，共 {len(feature_importance)} 个特征")
    
    residuals = model_service.get_residuals(X_normalized, y)
    print(f"✅ 残差计算完成，共 {len(residuals)} 个样本")
    
except Exception as e:
    print(f"❌ 模型服务测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "="*50)
print("✅ 所有后端测试通过！")
print("="*50)
