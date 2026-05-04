#!/usr/bin/env python3
"""
依赖验证脚本
用于验证后端所有依赖是否正确安装
"""

import sys
import traceback


def verify_faiss():
    """验证 FAISS"""
    print("🔍 验证 FAISS...")
    try:
        import faiss
        import numpy as np
        
        print(f"   FAISS 版本: {faiss.__version__}")
        
        index = faiss.IndexFlatL2(384)
        print("   ✓ IndexFlatL2 索引创建成功")
        
        test_vector = np.random.rand(1, 384).astype('float32')
        index.add(test_vector)
        print(f"   ✓ 向量添加成功，总向量数: {index.ntotal}")
        
        distances, indices = index.search(test_vector, 1)
        print("   ✓ 向量搜索功能正常")
        
        return True
    except Exception as e:
        print(f"   ✗ FAISS 验证失败: {e}")
        traceback.print_exc()
        return False


def verify_whoosh():
    """验证 Whoosh"""
    print("\n🔍 验证 Whoosh...")
    try:
        import whoosh
        from whoosh import index
        from whoosh.fields import Schema, TEXT, ID
        from whoosh.qparser import QueryParser
        import tempfile
        import os
        
        print(f"   Whoosh 版本: {whoosh.__version__}")
        
        schema = Schema(
            id=ID(stored=True),
            title=TEXT(stored=True),
            content=TEXT(stored=True)
        )
        
        with tempfile.TemporaryDirectory() as tmpdir:
            ix = index.create_in(tmpdir, schema)
            print("   ✓ 索引创建成功")
            
            writer = ix.writer()
            writer.add_document(
                id="1",
                title="Test Document",
                content="This is a test document for verifying Whoosh installation."
            )
            writer.commit()
            print("   ✓ 文档添加成功")
            
            with ix.searcher() as searcher:
                query = QueryParser("content", schema).parse("test document")
                results = searcher.search(query)
                print(f"   ✓ 搜索功能正常，找到 {len(results)} 个结果")
        
        return True
    except Exception as e:
        print(f"   ✗ Whoosh 验证失败: {e}")
        traceback.print_exc()
        return False


def verify_sentence_transformers():
    """验证 Sentence-Transformers (轻量检查)"""
    print("\n🔍 验证 Sentence-Transformers...")
    try:
        import sentence_transformers
        print(f"   Sentence-Transformers 版本: {sentence_transformers.__version__}")
        
        print("   ⚠️  注意: 首次使用时会下载模型，可能需要一些时间")
        print("   ✓ Sentence-Transformers 模块可导入")
        
        return True
    except Exception as e:
        print(f"   ✗ Sentence-Transformers 验证失败: {e}")
        traceback.print_exc()
        return False


def verify_fastapi():
    """验证 FastAPI 和其他依赖"""
    print("\n🔍 验证 FastAPI 和其他依赖...")
    
    dependencies = [
        ("fastapi", "FastAPI"),
        ("uvicorn", "Uvicorn"),
        ("pydantic", "Pydantic"),
        ("networkx", "NetworkX"),
        ("PIL", "Pillow"),
        ("numpy", "NumPy"),
    ]
    
    all_ok = True
    
    for module_name, display_name in dependencies:
        try:
            if module_name == "PIL":
                from PIL import Image
                print(f"   ✓ {display_name} 已安装")
            else:
                module = __import__(module_name)
                version = getattr(module, "__version__", "未知")
                print(f"   ✓ {display_name} 已安装 (版本: {version})")
        except ImportError as e:
            print(f"   ✗ {display_name} 未安装: {e}")
            all_ok = False
    
    return all_ok


def verify_app_imports():
    """验证应用模块导入"""
    print("\n🔍 验证应用模块导入...")
    
    try:
        import sys
        import os
        
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        from app.config import settings
        print("   ✓ app.config 导入成功")
        
        from app.models import DocumentResponse, CardResponse
        print("   ✓ app.models 导入成功")
        
        from app.services.index_service import index_service
        print("   ✓ app.services.index_service 导入成功")
        
        from app.services.vector_store import vector_store
        print("   ✓ app.services.vector_store 导入成功")
        
        from app.services.graph_service import graph_service
        print("   ✓ app.services.graph_service 导入成功")
        
        from app.services.sm2_service import sm2_service
        print("   ✓ app.services.sm2_service 导入成功")
        
        from app.routers.documents import router as documents_router
        print("   ✓ app.routers.documents 导入成功")
        
        from app.main import app
        print("   ✓ app.main (FastAPI应用) 导入成功")
        
        return True
    except Exception as e:
        print(f"   ✗ 应用模块导入失败: {e}")
        traceback.print_exc()
        return False


def main():
    print("=" * 60)
    print("  个人知识搜索系统 - 依赖验证脚本")
    print("=" * 60)
    
    results = {}
    
    results["FastAPI & 其他"] = verify_fastapi()
    results["FAISS"] = verify_faiss()
    results["Whoosh"] = verify_whoosh()
    results["Sentence-Transformers"] = verify_sentence_transformers()
    results["应用模块"] = verify_app_imports()
    
    print("\n" + "=" * 60)
    print("  验证结果汇总")
    print("=" * 60)
    
    all_passed = True
    for component, passed in results.items():
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"  {component}: {status}")
        if not passed:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("\n🎉 所有验证通过! 系统已准备就绪。")
        print("\n启动命令:")
        print("  后端: python run.py")
        print("  前端: cd frontend && npm run dev")
        return 0
    else:
        print("\n❌ 部分验证失败。请检查错误信息并修复。")
        return 1


if __name__ == "__main__":
    sys.exit(main())
