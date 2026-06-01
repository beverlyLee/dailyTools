import ast
import os


def check_file_syntax(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        ast.parse(content)
        return True, None
    except Exception as e:
        return False, str(e)


def main():
    print("=" * 60)
    print("检查Python文件语法...")
    print("=" * 60)
    
    files_to_check = [
        'app.py',
        'db/database.py',
        'importer/excel_importer.py',
        'calculator/trend_calculator.py',
        'init_data.py'
    ]
    
    all_ok = True
    for filepath in files_to_check:
        full_path = os.path.join(os.path.dirname(__file__), filepath)
        if os.path.exists(full_path):
            ok, error = check_file_syntax(full_path)
            status = "✓ OK" if ok else f"✗ 错误: {error}"
            print(f"{filepath}: {status}")
            if not ok:
                all_ok = False
        else:
            print(f"{filepath}: ✗ 文件不存在")
            all_ok = False
    
    print("\n" + "=" * 60)
    if all_ok:
        print("所有文件语法检查通过！")
    else:
        print("部分文件存在语法错误！")
    print("=" * 60)


if __name__ == '__main__':
    main()
