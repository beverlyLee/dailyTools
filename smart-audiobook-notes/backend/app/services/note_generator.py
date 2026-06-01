import json
from typing import List, Dict, Any

class NoteGenerator:
    def generate_notes(self, full_transcript: str) -> Dict[str, Any]:
        return {
            "topic": "智能音频分析主题",
            "summary": "这是一段技术播客的摘要，涵盖了多个重要的技术话题和最佳实践。",
            "chapters": [
                {
                    "title": "引言与背景介绍",
                    "timestamp": 0.0,
                    "content": "介绍了本期播客的主题和讨论方向，概述了将要涉及的核心内容。"
                },
                {
                    "title": "核心技术分析",
                    "timestamp": 120.0,
                    "content": "深入分析了关键技术实现细节，包括架构设计、性能优化等方面。"
                },
                {
                    "title": "实战案例与最佳实践",
                    "timestamp": 300.0,
                    "content": "通过实际案例展示了技术应用的具体方法和注意事项。"
                }
            ],
            "key_points": [
                {
                    "content": "模块化设计是提升系统可维护性的关键",
                    "timestamp": 150.0
                },
                {
                    "content": "性能优化需要从多个维度进行综合考量",
                    "timestamp": 350.0
                },
                {
                    "content": "持续学习和实践是技术成长的核心路径",
                    "timestamp": 500.0
                }
            ]
        }
    
    def generate_mind_map(self, notes: Dict[str, Any]) -> Dict[str, Any]:
        nodes = [
            {
                "id": "root",
                "type": "input",
                "data": {"label": notes.get("topic", "音频主题")},
                "position": {"x": 400, "y": 25}
            }
        ]
        
        chapters = notes.get("chapters", [])
        for i, chapter in enumerate(chapters):
            node_id = f"chapter_{i}"
            x_pos = 200 + (i % 3) * 250
            y_pos = 150 + (i // 3) * 120
            nodes.append({
                "id": node_id,
                "data": {"label": chapter.get("title", f"章节 {i+1}")},
                "position": {"x": x_pos, "y": y_pos}
            })
        
        key_points = notes.get("key_points", [])
        for i, kp in enumerate(key_points):
            node_id = f"point_{i}"
            x_pos = 100 + (i % 4) * 220
            y_pos = 300 + (i // 4) * 100
            nodes.append({
                "id": node_id,
                "data": {"label": kp.get("content", f"要点 {i+1}")[:30] + "..."},
                "position": {"x": x_pos, "y": y_pos}
            })
        
        edges = []
        chapter_count = len(chapters)
        point_count = len(key_points)
        
        for i in range(chapter_count):
            edges.append({
                "id": f"edge_root_chapter_{i}",
                "source": "root",
                "target": f"chapter_{i}"
            })
        
        for i in range(point_count):
            chapter_idx = min(i, chapter_count - 1) if chapter_count > 0 else 0
            edges.append({
                "id": f"edge_chapter_point_{i}",
                "source": f"chapter_{chapter_idx}" if chapter_count > 0 else "root",
                "target": f"point_{i}"
            })
        
        return {"nodes": nodes, "edges": edges}

note_generator = NoteGenerator()
