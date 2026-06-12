from lifelens.avatar.memory_service import memory_service

try:
    for col in [memory_service.faces_collection, memory_service.patients_collection]:
        res = memory_service.client.scroll(collection_name=col, limit=10, with_payload=True)
        print(f"Collection: {col}")
        for pt in res[0]:
            p = pt.payload
            print(f"  person_id: {p.get('person_id')}, name: {p.get('name')}, timestamp: {p.get('timestamp')}")
except Exception as e:
    print(e)
