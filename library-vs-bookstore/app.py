import os
import socket
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from src.crawler import LibraryCrawler, BookstoreCrawler
from src.analysis import GapFinder

load_dotenv()

app = Flask(__name__)
CORS(app)

lib_crawler = LibraryCrawler()
bookstore_crawler = BookstoreCrawler()


@app.route("/api/library-ranking")
def get_library_ranking():
    books = lib_crawler.get_borrow_ranking()
    return jsonify({
        "success": True,
        "data": books,
        "source": "图书馆借阅榜",
        "total": len(books)
    })


@app.route("/api/bookstore-ranking")
def get_bookstore_ranking():
    books = bookstore_crawler.get_sales_ranking()
    return jsonify({
        "success": True,
        "data": books,
        "source": "电商销售榜",
        "total": len(books)
    })


@app.route("/api/comparison")
def get_comparison():
    lib_books = lib_crawler.get_borrow_ranking()
    store_books = bookstore_crawler.get_sales_ranking()

    finder = GapFinder(lib_books, store_books)
    comparison_data = finder.get_comparison_data()
    statistics = finder.get_statistics()

    return jsonify({
        "success": True,
        "comparison": comparison_data,
        "statistics": statistics
    })


@app.route("/api/classic-books")
def get_classic_books():
    lib_books = lib_crawler.get_borrow_ranking()
    store_books = bookstore_crawler.get_sales_ranking()

    finder = GapFinder(lib_books, store_books)
    classic_books = finder.find_classic_books()

    return jsonify({
        "success": True,
        "data": classic_books,
        "description": "经典长销书：借阅榜独有或排名显著高于销售榜的书籍"
    })


@app.route("/api/popular-books")
def get_popular_books():
    lib_books = lib_crawler.get_borrow_ranking()
    store_books = bookstore_crawler.get_sales_ranking()

    finder = GapFinder(lib_books, store_books)
    popular_books = finder.find_popular_books()

    return jsonify({
        "success": True,
        "data": popular_books,
        "description": "流行畅销书：销售榜独有或排名显著高于借阅榜的书籍"
    })


@app.route("/api/statistics")
def get_statistics():
    lib_books = lib_crawler.get_borrow_ranking()
    store_books = bookstore_crawler.get_sales_ranking()

    finder = GapFinder(lib_books, store_books)
    stats = finder.get_statistics()

    return jsonify({
        "success": True,
        "data": stats
    })


@app.route("/api/health")
def health_check():
    return jsonify({
        "success": True,
        "status": "healthy",
        "message": "图书榜单对比分析服务运行正常"
    })


def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("0.0.0.0", port))
            return False
        except OSError:
            return True


def find_available_port(start_port: int = 5050, max_attempts: int = 10) -> int:
    port = start_port
    for _ in range(max_attempts):
        if not is_port_in_use(port):
            return port
        port += 1
    return start_port


if __name__ == "__main__":
    default_port = int(os.getenv("SERVER_PORT", 5050))
    port = find_available_port(default_port)
    if port != default_port:
        print(f"⚠️  端口 {default_port} 被占用，自动切换到端口 {port}")
    print(f"🚀 后端服务启动中: http://localhost:{port}")
    app.run(debug=True, host="0.0.0.0", port=port)
