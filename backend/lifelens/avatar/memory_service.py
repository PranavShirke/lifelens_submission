from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct, Filter, FieldCondition, MatchValue, MatchText
from lifelens.avatar.config import settings
import uuid

class MemoryService:
    def __init__(self):
        print("DEBUG: Initializing MemoryService (Qdrant)...", flush=True)
        if settings.QDRANT_MODE == "local":
            self.client = QdrantClient(path=settings.QDRANT_PATH)
        else:
            self.client = QdrantClient(
                url=settings.get_qdrant_url(),
                api_key=settings.QDRANT_API_KEY
            )

        self.faces_collection = settings.AVATAR_FACES_COLLECTION
        self.objects_collection = settings.AVATAR_OBJECTS_COLLECTION
        self.patients_collection = settings.AVATAR_PATIENTS_COLLECTION
            
        self._ensure_collections()

    def _ensure_collections(self):
        collections = [
            (self.faces_collection, 512),
            (self.objects_collection, 1280),
            (self.patients_collection, 512),
        ]

        for collection_name, vector_size in collections:
            try:
                self.client.get_collection(collection_name)
            except Exception:
                # Non-destructive: only create if missing, never recreate.
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
                )

    def store_face_memory(self, person_id: str, embedding: list, metadata: dict):
        from datetime import datetime
        point_id = str(uuid.uuid4())
        if "timestamp" not in metadata: metadata["timestamp"] = datetime.now().isoformat()
        self.client.upsert(
            collection_name=self.faces_collection,
            points=[PointStruct(id=point_id, vector=embedding, payload={"person_id": person_id, **metadata})],
            wait=True
        )
        return point_id

    def store_patient_memory(self, person_id: str, embedding: list, metadata: dict):
        """Store Caregiver-entered Patient info"""
        from datetime import datetime
        point_id = str(uuid.uuid4())
        if "timestamp" not in metadata: metadata["timestamp"] = datetime.now().isoformat()
        self.client.upsert(
            collection_name=self.patients_collection,
            points=[PointStruct(id=point_id, vector=embedding, payload={"person_id": person_id, **metadata})],
            wait=True
        )
        return point_id

    def search_face(self, embedding: list, limit=5):
        """Search face/patient collections and return best unique identities.

        We query with a wider candidate window and then deduplicate by person_id
        to avoid recency bias from near-duplicate points.
        """
        query_limit = max(int(limit), 5)

        res1 = self.client.query_points(
            collection_name=self.faces_collection,
            query=embedding,
            limit=query_limit,
        ).points
        res2 = self.client.query_points(
            collection_name=self.patients_collection,
            query=embedding,
            limit=query_limit,
        ).points

        all_res = list(res1) + list(res2)

        best_by_person = {}
        for pt in all_res:
            payload = pt.payload or {}
            person_id = payload.get("person_id") or payload.get("name") or str(pt.id)
            prev = best_by_person.get(person_id)
            if prev is None or float(pt.score) > float(prev.score):
                best_by_person[person_id] = pt

        deduped = list(best_by_person.values())
        deduped.sort(key=lambda x: float(x.score), reverse=True)
        return deduped[:limit]

    def store_object_memory(self, object_id: str, embedding: list, metadata: dict):
        from datetime import datetime
        point_id = str(uuid.uuid4())
        if "timestamp" not in metadata: metadata["timestamp"] = datetime.now().isoformat()
        self.client.upsert(
            collection_name=self.objects_collection,
            points=[PointStruct(id=point_id, vector=embedding, payload={"object_id": object_id, **metadata})],
            wait=True
        )
        return point_id

    def search_object(self, embedding: list, limit=1):
        response = self.client.query_points(
            collection_name=self.objects_collection,
            query=embedding,
            limit=limit
        )
        return response.points

    def search_by_text(self, text_query: str):
        import difflib
        try:
            points = []
            for col in [self.faces_collection, self.objects_collection, self.patients_collection]:
                try:
                    res = self.client.scroll(collection_name=col, limit=500, with_payload=True, with_vectors=False)
                    points.extend(res[0])
                except Exception: pass
            
            # ... Fuzzy Search Logic ...
            query = text_query.lower()
            candidates = []
            max_score = 0.0
            
            for p in points:
                if not p.payload: continue
                name = (p.payload.get("name") or "").lower()
                relation = (p.payload.get("relation") or "").lower()
                notes = (p.payload.get("notes") or "").lower()
                
                score = 0
                if name and name in query: score += 1.0
                if relation and relation in query: score += 0.8
                if notes and query in notes: score += 0.5
                
                query_words = query.split()
                for word in query_words:
                    if len(word) > 2:
                        matcher = difflib.SequenceMatcher(None, word, name)
                        if matcher.ratio() > 0.7: score += 0.8
                            
                full_sim = difflib.SequenceMatcher(None, query, name).ratio()
                if full_sim > 0.6: score += 1.0

                if score > max_score:
                    max_score = score
                    candidates = [p]
                elif score == max_score and score > 0.4:
                    candidates.append(p)
            
            if max_score > 0.4:
                candidates.sort(key=lambda x: x.payload.get("timestamp", ""), reverse=True)
                return candidates[:5]
            return []

        except Exception as e:
            print(f"Fuzzy search error: {e}")
            return []

memory_service = MemoryService()
