import json
import os
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class KnowledgeGraph:
    """A lightweight, JSON-backed Knowledge Graph for Entity & Relationship mapping (Graph RAG)."""
    
    def __init__(self, filepath="backend/data/knowledge_graph.json"):
        self.filepath = filepath
        self.nodes = {}  # name -> {name, type}
        self.edges = {}  # source -> list of {target, relation, memory_ids}
        self._load()

    def _load(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, 'r') as f:
                    data = json.load(f)
                    self.nodes = data.get("nodes", {})
                    self.edges = data.get("edges", {})
            except Exception as e:
                logger.error(f"Failed to load knowledge graph: {e}")
                
    def _save(self):
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        try:
            with open(self.filepath, 'w') as f:
                json.dump({"nodes": self.nodes, "edges": self.edges}, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save knowledge graph: {e}")

    def add_entity(self, name: str, entity_type: str = "unknown"):
        name_lower = name.lower()
        if name_lower not in self.nodes:
            self.nodes[name_lower] = {"name": name, "type": entity_type}
            self._save()

    def add_relationship(self, source: str, target: str, relation: str, memory_id: str):
        source_lower = source.lower()
        target_lower = target.lower()
        
        # Ensure nodes exist
        if source_lower not in self.nodes:
            self.add_entity(source)
        if target_lower not in self.nodes:
            self.add_entity(target)
            
        if source_lower not in self.edges:
            self.edges[source_lower] = []
            
        # Check if edge already exists
        exists = False
        for edge in self.edges[source_lower]:
            if edge["target"] == target_lower and edge["relation"] == relation:
                if memory_id not in edge.get("memory_ids", []):
                    edge.setdefault("memory_ids", []).append(memory_id)
                exists = True
                break
                
        if not exists:
            self.edges[source_lower].append({
                "target": target_lower,
                "relation": relation,
                "memory_ids": [memory_id]
            })
            
        # Add reverse relationship for undirected traversal
        if target_lower not in self.edges:
            self.edges[target_lower] = []
            
        rev_exists = False
        for edge in self.edges[target_lower]:
            if edge["target"] == source_lower and edge["relation"] == f"inverse_{relation}":
                if memory_id not in edge.get("memory_ids", []):
                    edge.setdefault("memory_ids", []).append(memory_id)
                rev_exists = True
                break
                
        if not rev_exists:
            self.edges[target_lower].append({
                "target": source_lower,
                "relation": f"inverse_{relation}",
                "memory_ids": [memory_id]
            })
            
        self._save()

    def get_connected_entities(self, entity: str, depth: int = 1) -> Dict[str, List[str]]:
        """Returns related memory IDs and a summary of connected entities based on BFS traversal."""
        entity_lower = entity.lower()
        if entity_lower not in self.nodes:
            return {"memory_ids": [], "context": []}
            
        visited = set()
        queue = [(entity_lower, 0)]
        memory_ids = set()
        context_lines = []
        
        while queue:
            curr, curr_depth = queue.pop(0)
            if curr in visited or curr_depth > depth:
                continue
                
            visited.add(curr)
            
            for edge in self.edges.get(curr, []):
                target = edge["target"]
                relation = edge["relation"]
                m_ids = edge.get("memory_ids", [])
                
                for m_id in m_ids:
                    memory_ids.add(m_id)
                    
                if not relation.startswith("inverse_"):
                    curr_name = self.nodes.get(curr, {}).get("name", curr)
                    target_name = self.nodes.get(target, {}).get("name", target)
                    context_lines.append(f"{curr_name} {relation} {target_name}")
                
                if target not in visited:
                    queue.append((target, curr_depth + 1))
                    
        return {
            "memory_ids": list(memory_ids),
            "context": list(set(context_lines))
        }

# Global singleton
_kg = None
def get_knowledge_graph():
    global _kg
    if _kg is None:
        _kg = KnowledgeGraph()
    return _kg
