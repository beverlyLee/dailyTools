import re
import json
from collections import defaultdict
from typing import List, Dict, Set, Tuple, Optional
from pathlib import Path
from ..models.document import Entity, Relation, DocumentResponse


class GraphService:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.graph_file = data_dir / "knowledge_graph.json"
        self.entities: Dict[str, Dict] = {}
        self.relations: List[Dict] = []
        self.entity_counts: defaultdict = defaultdict(int)
        self.relation_counts: defaultdict = defaultdict(int)
        
        self._load_graph()
        
        self.common_entity_types = {
            "person": r"\b[A-Z][a-z]+ (?:[A-Z][a-z]+ )?[A-Z][a-z]+\b",
            "organization": r"\b(?:[A-Z][a-z]+ ){1,3}(?:Inc|Corp|Company|University|Institute|Association|Foundation)\b",
            "location": r"\b(?:[A-Z][a-z]+ ){1,2}(?:City|State|Country|Region|Province|District)\b",
            "technology": r"\b(?:Python|JavaScript|TypeScript|Java|C\+\+|Go|Rust|Swift|Kotlin|React|Vue|Angular|Node\.js|FastAPI|Django|Flask|TensorFlow|PyTorch|Keras|Scikit-learn|FAISS|Elasticsearch|Whoosh|Docker|Kubernetes|AWS|Azure|GCP|API|REST|GraphQL|WebSocket|HTTP|HTTPS|TCP|UDP|IP|DNS|VPN|SSH|SSL|TLS|OAuth|JWT|SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis|SQLite)\b",
            "concept": r"\b(?:Machine Learning|Artificial Intelligence|Deep Learning|Neural Network|Natural Language Processing|Computer Vision|Reinforcement Learning|Semantic Search|Vector Embedding|Knowledge Graph|Second Brain|Personal Knowledge Management)\b",
        }
        
        self.relation_patterns = [
            (r"(\w+) (?:is|was|are|were) (?:a|an|the) (\w+)", "is_a"),
            (r"(\w+) (?:uses|using|used) (\w+)", "uses"),
            (r"(\w+) (?:creates|created|creating) (\w+)", "creates"),
            (r"(\w+) (?:includes|included|including) (\w+)", "includes"),
            (r"(\w+) (?:requires|required|requiring) (\w+)", "requires"),
            (r"(\w+) (?:depends on|dependent on) (\w+)", "depends_on"),
            (r"(\w+) (?:relates to|related to) (\w+)", "relates_to"),
            (r"(\w+) (?:is part of|part of) (\w+)", "part_of"),
            (r"(\w+) (?:is similar to|similar to) (\w+)", "similar_to"),
            (r"(\w+) (?:contains|contained|containing) (\w+)", "contains"),
        ]
    
    def _load_graph(self):
        if self.graph_file.exists():
            with open(self.graph_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.entities = data.get("entities", {})
                self.relations = data.get("relations", [])
                
                self.entity_counts = defaultdict(int)
                for entity in self.entities.values():
                    self.entity_counts[(entity["name"], entity["type"])] = entity.get("count", 1)
                
                self.relation_counts = defaultdict(int)
                for rel in self.relations:
                    self.relation_counts[(rel["source"], rel["target"], rel["relation_type"])] = rel.get("count", 1)
        else:
            self.entities = {}
            self.relations = []
            self.entity_counts = defaultdict(int)
            self.relation_counts = defaultdict(int)
    
    def _save_graph(self):
        with open(self.graph_file, "w", encoding="utf-8") as f:
            json.dump(
                {"entities": self.entities, "relations": self.relations},
                f,
                ensure_ascii=False,
                indent=2,
            )
    
    def extract_entities(self, text: str, document_id: str) -> List[Tuple[str, str]]:
        found_entities: List[Tuple[str, str]] = []
        
        for entity_type, pattern in self.common_entity_types.items():
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                entity_name = match.group(0).strip()
                if len(entity_name) > 2:
                    found_entities.append((entity_name, entity_type))
        
        noun_pattern = r"\b[A-Z][a-z]+(?: [A-Z][a-z]+)*\b"
        matches = re.finditer(noun_pattern, text)
        for match in matches:
            entity_name = match.group(0).strip()
            if len(entity_name) > 3 and entity_name not in [e[0] for e in found_entities]:
                found_entities.append((entity_name, "concept"))
        
        return found_entities
    
    def extract_relations(self, text: str, entities: List[Tuple[str, str]]) -> List[Tuple[str, str, str]]:
        found_relations: List[Tuple[str, str, str]] = []
        entity_names = [e[0].lower() for e in entities]
        
        for pattern, rel_type in self.relation_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    source = match.group(1).strip().lower()
                    target = match.group(2).strip().lower()
                    
                    if source in entity_names and target in entity_names:
                        for orig_name, _ in entities:
                            if orig_name.lower() == source:
                                source = orig_name
                            if orig_name.lower() == target:
                                target = orig_name
                        
                        found_relations.append((source, target, rel_type))
                except (IndexError, AttributeError):
                    continue
        
        return found_relations
    
    def process_document(self, document: DocumentResponse):
        text = f"{document.title} {document.content}"
        
        entities = self.extract_entities(text, document.id)
        relations = self.extract_relations(text, entities)
        
        for entity_name, entity_type in entities:
            key = (entity_name, entity_type)
            self.entity_counts[key] += 1
            
            entity_id = f"{entity_name}_{entity_type}"
            if entity_id not in self.entities:
                self.entities[entity_id] = {
                    "name": entity_name,
                    "type": entity_type,
                    "count": 0,
                    "document_ids": [],
                }
            
            self.entities[entity_id]["count"] = self.entity_counts[key]
            if document.id not in self.entities[entity_id]["document_ids"]:
                self.entities[entity_id]["document_ids"].append(document.id)
        
        for source, target, rel_type in relations:
            key = (source, target, rel_type)
            self.relation_counts[key] += 1
        
        self._update_relations_list()
        self._save_graph()
    
    def _update_relations_list(self):
        self.relations = []
        for (source, target, rel_type), count in self.relation_counts.items():
            self.relations.append({
                "source": source,
                "target": target,
                "relation_type": rel_type,
                "count": count,
            })
    
    def get_all_entities(self, limit: int = 100) -> List[Entity]:
        sorted_entities = sorted(
            self.entities.values(),
            key=lambda x: x.get("count", 0),
            reverse=True,
        )
        
        return [
            Entity(name=e["name"], type=e["type"], count=e.get("count", 1))
            for e in sorted_entities[:limit]
        ]
    
    def get_all_relations(self, limit: int = 100) -> List[Relation]:
        sorted_relations = sorted(
            self.relations,
            key=lambda x: x.get("count", 0),
            reverse=True,
        )
        
        return [
            Relation(
                source=r["source"],
                target=r["target"],
                relation_type=r["relation_type"],
                count=r.get("count", 1),
            )
            for r in sorted_relations[:limit]
        ]
    
    def get_graph_data(self) -> Dict:
        nodes = []
        edges = []
        
        for entity_id, entity in self.entities.items():
            nodes.append({
                "id": entity_id,
                "label": entity["name"],
                "title": f"{entity['name']} ({entity['type']})",
                "group": entity["type"],
                "value": entity.get("count", 1),
            })
        
        for i, rel in enumerate(self.relations):
            source_id = None
            target_id = None
            
            for eid, entity in self.entities.items():
                if entity["name"] == rel["source"]:
                    source_id = eid
                if entity["name"] == rel["target"]:
                    target_id = eid
            
            if source_id and target_id:
                edges.append({
                    "id": f"edge_{i}",
                    "from": source_id,
                    "to": target_id,
                    "label": rel["relation_type"],
                    "value": rel.get("count", 1),
                    "arrows": "to",
                })
        
        return {"nodes": nodes, "edges": edges}
    
    def search_related(self, entity_name: str, limit: int = 20) -> Dict:
        related_entities = set()
        related_relations = []
        
        for rel in self.relations:
            if rel["source"] == entity_name or rel["target"] == entity_name:
                related_relations.append(rel)
                related_entities.add(rel["source"])
                related_entities.add(rel["target"])
        
        nodes = []
        edges = []
        
        for entity_id, entity in self.entities.items():
            if entity["name"] in related_entities:
                nodes.append({
                    "id": entity_id,
                    "label": entity["name"],
                    "title": f"{entity['name']} ({entity['type']})",
                    "group": entity["type"],
                    "value": entity.get("count", 1),
                })
        
        for i, rel in enumerate(related_relations[:limit]):
            source_id = None
            target_id = None
            
            for eid, entity in self.entities.items():
                if entity["name"] == rel["source"]:
                    source_id = eid
                if entity["name"] == rel["target"]:
                    target_id = eid
            
            if source_id and target_id:
                edges.append({
                    "id": f"edge_{i}",
                    "from": source_id,
                    "to": target_id,
                    "label": rel["relation_type"],
                    "value": rel.get("count", 1),
                    "arrows": "to",
                })
        
        return {"nodes": nodes, "edges": edges}
    
    def clear(self):
        self.entities = {}
        self.relations = []
        self.entity_counts = defaultdict(int)
        self.relation_counts = defaultdict(int)
        if self.graph_file.exists():
            self.graph_file.unlink()


graph_service = GraphService(settings.DATA_DIR)
