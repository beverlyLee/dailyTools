from typing import List, Dict, Tuple
from dataclasses import dataclass


@dataclass
class BookGap:
    title: str
    author: str
    library_rank: int
    bookstore_rank: int
    rank_diff: int
    category: str
    is_classic_only: bool
    is_popular_only: bool


class GapFinder:
    def __init__(self, library_books: List[Dict], bookstore_books: List[Dict]):
        self.library_books = library_books
        self.bookstore_books = bookstore_books
        self.library_map = {b["title"]: b for b in library_books}
        self.bookstore_map = {b["title"]: b for b in bookstore_books}

    def find_classic_books(self) -> List[Dict]:
        classic_books = []
        for book in self.library_books:
            title = book["title"]
            if title not in self.bookstore_map:
                classic_books.append({
                    **book,
                    "type": "classic_only",
                    "description": "仅在图书馆借阅榜出现的经典长销书"
                })
            else:
                lib_rank = book["rank"]
                store_rank = self.bookstore_map[title]["rank"]
                if lib_rank < store_rank - 5:
                    classic_books.append({
                        **book,
                        "bookstore_rank": store_rank,
                        "rank_diff": store_rank - lib_rank,
                        "type": "classic_dominant",
                        "description": "借阅排名显著高于销售排名的经典书籍"
                    })
        return classic_books

    def find_popular_books(self) -> List[Dict]:
        popular_books = []
        for book in self.bookstore_books:
            title = book["title"]
            if title not in self.library_map:
                popular_books.append({
                    **book,
                    "type": "popular_only",
                    "description": "仅在电商销售榜出现的流行畅销书"
                })
            else:
                store_rank = book["rank"]
                lib_rank = self.library_map[title]["rank"]
                if store_rank < lib_rank - 5:
                    popular_books.append({
                        **book,
                        "library_rank": lib_rank,
                        "rank_diff": lib_rank - store_rank,
                        "type": "popular_dominant",
                        "description": "销售排名显著高于借阅排名的流行书籍"
                    })
        return popular_books

    def get_comparison_data(self) -> List[Dict]:
        comparison = []
        all_titles = set(self.library_map.keys()) | set(self.bookstore_map.keys())

        for title in all_titles:
            lib_book = self.library_map.get(title)
            store_book = self.bookstore_map.get(title)

            lib_rank = lib_book["rank"] if lib_book else None
            store_rank = store_book["rank"] if store_book else None
            author = lib_book["author"] if lib_book else store_book["author"]
            category = lib_book["category"] if lib_book else store_book["category"]

            rank_diff = 0
            if lib_rank and store_rank:
                rank_diff = store_rank - lib_rank

            comparison.append({
                "title": title,
                "author": author,
                "category": category,
                "library_rank": lib_rank,
                "bookstore_rank": store_rank,
                "rank_diff": rank_diff,
                "library_only": lib_rank is not None and store_rank is None,
                "bookstore_only": store_rank is not None and lib_rank is None,
                "both_listed": lib_rank is not None and store_rank is not None
            })

        return sorted(comparison, key=lambda x: abs(x["rank_diff"]), reverse=True)

    def get_statistics(self) -> Dict:
        library_titles = set(self.library_map.keys())
        bookstore_titles = set(self.bookstore_map.keys())

        common_titles = library_titles & bookstore_titles
        only_library = library_titles - bookstore_titles
        only_bookstore = bookstore_titles - library_titles

        classic_dominant = sum(
            1 for title in common_titles
            if self.library_map[title]["rank"] < self.bookstore_map[title]["rank"] - 5
        )

        popular_dominant = sum(
            1 for title in common_titles
            if self.bookstore_map[title]["rank"] < self.library_map[title]["rank"] - 5
        )

        return {
            "total_library": len(self.library_books),
            "total_bookstore": len(self.bookstore_books),
            "common_books": len(common_titles),
            "only_library": len(only_library),
            "only_bookstore": len(only_bookstore),
            "classic_dominant": classic_dominant,
            "popular_dominant": popular_dominant,
            "library_only_titles": list(only_library),
            "bookstore_only_titles": list(only_bookstore)
        }


if __name__ == "__main__":
    from src.crawler import LibraryCrawler, BookstoreCrawler

    lib_crawler = LibraryCrawler()
    store_crawler = BookstoreCrawler()

    lib_books = lib_crawler.get_borrow_ranking()
    store_books = store_crawler.get_sales_ranking()

    finder = GapFinder(lib_books, store_books)

    print("=== 经典长销书（借阅榜独有/排名显著靠前） ===")
    for book in finder.find_classic_books()[:5]:
        print(f"- {book['title']}: {book.get('description', '')}")

    print("\n=== 流行畅销书（销售榜独有/排名显著靠前） ===")
    for book in finder.find_popular_books()[:5]:
        print(f"- {book['title']}: {book.get('description', '')}")

    print("\n=== 统计信息 ===")
    stats = finder.get_statistics()
    for key, value in stats.items():
        if not key.endswith("_titles"):
            print(f"{key}: {value}")
