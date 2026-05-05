from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    # 确保数据目录存在
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    # 运行应用
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
