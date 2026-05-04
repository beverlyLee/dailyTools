from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import config
from modules.rag_engine import RAGEngine
from modules.llm_service import LLMService
from modules.git_service import GitService
from modules.feedback_service import FeedbackService

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

rag_engine = RAGEngine()
llm_service = LLMService(rag_engine)
git_service = GitService()
feedback_service = FeedbackService()


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'status': 'healthy',
        'version': '1.0.0',
        'model': config.OPENAI_MODEL,
        'vector_store': config.CHROMA_PERSIST_DIRECTORY
    })


@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': '请求体不能为空'
            }), 400
        
        context = data.get('context', {})
        include_sections = data.get('includeSections', ['work_done', 'issues', 'plans'])
        format = data.get('format', 'markdown')
        
        result = llm_service.generate_report(
            context=context,
            include_sections=include_sections,
            format=format
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/git-commits', methods=['POST'])
def get_git_commits():
    try:
        data = request.get_json() or {}
        
        repo_path = data.get('repoPath')
        since = data.get('since')
        until = data.get('until')
        author = data.get('author')
        branch = data.get('branch')
        max_count = data.get('maxCount', 100)
        
        if repo_path:
            result = git_service.set_repo_path(repo_path)
            if not result.get('success'):
                return jsonify(result), 400
        
        if not git_service.repo and not repo_path:
            current_dir = os.getcwd()
            result = git_service.set_repo_path(current_dir)
            if not result.get('success'):
                return jsonify({
                    'success': False,
                    'error': '未提供Git仓库路径，且当前目录不是Git仓库'
                }), 400
        
        result = git_service.get_commits(
            since=since,
            until=until,
            author=author,
            branch=branch,
            max_count=max_count
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/git/branches', methods=['GET'])
def get_branches():
    try:
        repo_path = request.args.get('repoPath')
        
        if repo_path:
            result = git_service.set_repo_path(repo_path)
            if not result.get('success'):
                return jsonify(result), 400
        
        if not git_service.repo:
            return jsonify({
                'success': False,
                'error': '未初始化Git仓库'
            }), 400
        
        result = git_service.get_branches()
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/documents', methods=['POST'])
def add_documents():
    try:
        data = request.get_json()
        
        if not data or 'documents' not in data:
            return jsonify({
                'success': False,
                'error': '缺少documents参数'
            }), 400
        
        documents = data['documents']
        result = rag_engine.add_documents(documents)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/search', methods=['POST'])
def search_documents():
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                'success': False,
                'error': '缺少query参数'
            }), 400
        
        query = data['query']
        top_k = data.get('topK', 5)
        include_scores = data.get('includeScores', False)
        
        if include_scores:
            results = rag_engine.search_with_scores(query, top_k=top_k)
        else:
            results = rag_engine.search(query, top_k=top_k)
        
        return jsonify({
            'success': True,
            'query': query,
            'results': results,
            'count': len(results)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/embeddings', methods=['POST'])
def get_embeddings():
    try:
        data = request.get_json()
        
        if not data or 'texts' not in data:
            return jsonify({
                'success': False,
                'error': '缺少texts参数'
            }), 400
        
        texts = data['texts']
        result = llm_service.generate_embeddings(texts)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    try:
        data = request.get_json()
        
        report_id = data.get('reportId')
        original_report = data.get('originalReport')
        modified_report = data.get('modifiedReport')
        feedback = data.get('feedback')
        
        if not original_report:
            return jsonify({
                'success': False,
                'error': 'originalReport是必填项'
            }), 400
        
        result = feedback_service.submit_feedback(
            report_id=report_id,
            original_report=original_report,
            modified_report=modified_report,
            feedback=feedback,
            metadata={
                'source': 'chrome_extension',
                'submitted_at': data.get('submittedAt')
            }
        )
        
        if modified_report and result.get('success'):
            improvement = llm_service.improve_prompt(
                original_report=original_report,
                modified_report=modified_report,
                feedback=feedback or ''
            )
            
            if improvement.get('success'):
                feedback_service.save_prompt_improvement(
                    original_report=original_report,
                    modified_report=modified_report,
                    feedback=feedback or '',
                    analysis=improvement.get('analysis', ''),
                    optimized_prompt=improvement.get('optimized_prompt', '')
                )
                
                result['prompt_improved'] = True
                result['analysis'] = improvement.get('analysis')
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/feedbacks', methods=['GET'])
def get_feedbacks():
    try:
        processed = request.args.get('processed')
        if processed is not None:
            processed = processed.lower() == 'true'
        
        limit = int(request.args.get('limit', 50))
        
        result = feedback_service.get_feedbacks(
            processed=processed,
            limit=limit
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    try:
        feedback_stats = feedback_service.get_statistics()
        vector_stats = rag_engine.get_collection_stats()
        
        return jsonify({
            'success': True,
            'feedback_statistics': feedback_stats,
            'vector_store_statistics': vector_stats
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        
        if not data or 'messages' not in data:
            return jsonify({
                'success': False,
                'error': '缺少messages参数'
            }), 400
        
        messages = data['messages']
        result = llm_service.chat(messages)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/clear-vector-store', methods=['POST'])
def clear_vector_store():
    try:
        result = rag_engine.clear_collection()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': '接口不存在'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': '服务器内部错误'
    }), 500


def find_available_port(start_port: int, max_attempts: int = 10) -> int:
    import socket
    
    for i in range(max_attempts):
        port = start_port + i
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                s.bind(('', port))
                return port
        except OSError:
            continue
    
    raise RuntimeError(f"无法找到可用端口 (尝试了 {start_port} 到 {start_port + max_attempts - 1})")


if __name__ == '__main__':
    import sys
    
    try:
        port = find_available_port(config.PORT)
        
        if port != config.PORT:
            print(f"⚠️  端口 {config.PORT} 被占用，已自动切换到端口 {port}")
            print(f"ℹ️  在 macOS 上，端口 5000 通常被 'AirPlay Receiver' 占用")
            print(f"ℹ️  可以在 '系统设置 → 通用 → AirDrop & Handoff' 中禁用 AirPlay Receiver")
            print()
        
        print(f"🚀 智能周报生成器后端服务启动")
        print(f"   服务地址: http://localhost:{port}")
        print(f"   健康检查: http://localhost:{port}/api/health")
        print(f"   API文档: 请参考代码中的路由定义")
        print()
        print("按 Ctrl+C 停止服务")
        print("=" * 50)
        print()
        
        app.run(
            host=config.HOST,
            port=port,
            debug=config.FLASK_DEBUG,
            use_reloader=config.FLASK_DEBUG
        )
        
    except RuntimeError as e:
        print(f"❌ 启动失败: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print()
        print("👋 服务已停止")
        sys.exit(0)
