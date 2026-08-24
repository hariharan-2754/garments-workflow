import json
import os
from datetime import datetime
from uuid import uuid4
from pymongo.errors import DuplicateKeyError

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db.json")

class MockCursor:
    def __init__(self, items):
        self.items = items

    def sort(self, key, direction=-1):
        reverse = True if direction == -1 else False
        # Handle cases where key might be missing
        self.items.sort(key=lambda x: x.get(key) or "", reverse=reverse)
        return self

    async def to_list(self, length):
        return [dict(x) for x in self.items[:length]]

class MockCollection:
    def __init__(self, db, name):
        self.db = db
        self.name = name

    def _get_items(self):
        return self.db.data.setdefault(self.name, [])

    async def create_index(self, *args, **kwargs):
        pass

    async def count_documents(self, query):
        items = self._get_items()
        if not query:
            return len(items)
        count = 0
        for item in items:
            match = True
            for k, v in query.items():
                if item.get(k) != v:
                    match = False
                    break
            if match:
                count += 1
        return count

    async def find_one(self, query):
        items = self._get_items()
        for item in items:
            match = True
            for k, v in query.items():
                if k == "_id":
                    v_str = str(v)
                    if str(item.get("_id")) != v_str:
                        match = False
                        break
                elif item.get(k) != v:
                    match = False
                    break
            if match:
                return dict(item)
        return None

    def find(self, query):
        items = self._get_items()
        matched = []
        for item in items:
            match = True
            for k, v in query.items():
                if k == "department" and isinstance(v, dict) and "$regex" in v:
                    # case-insensitive check
                    pattern = v["$regex"].replace("^", "").replace("$", "").lower()
                    if (item.get("department") or "").strip().lower() != pattern:
                        match = False
                        break
                elif k == "_id":
                    v_str = str(v)
                    if str(item.get("_id")) != v_str:
                        match = False
                        break
                elif item.get(k) != v:
                    match = False
                    break
            if match:
                matched.append(item)
        return MockCursor(matched)

    async def insert_one(self, doc):
        items = self._get_items()
        if "_id" not in doc:
            doc["_id"] = str(uuid4())
        
        # Enforce unique indexes locally
        if self.name == "users" and any(u.get("email") == doc.get("email") for u in items):
            raise DuplicateKeyError(f"Email {doc.get('email')} already exists")
        if self.name == "departments" and any(d.get("name") == doc.get("name") for d in items):
            raise DuplicateKeyError(f"Department {doc.get('name')} already exists")

        items.append(doc)
        self.db.save()
        
        class Result:
            inserted_id = doc["_id"]
        return Result()

    async def update_one(self, query, update):
        items = self._get_items()
        target = await self.find_one(query)
        if not target:
            class Result:
                modified_count = 0
            return Result()
        
        sets = update.get("$set", {})
        for item in items:
            if str(item.get("_id")) == str(target["_id"]):
                for k, v in sets.items():
                    item[k] = v
                break
        
        self.db.save()
        class Result:
            modified_count = 1
        return Result()

    async def delete_one(self, query):
        items = self._get_items()
        target = await self.find_one(query)
        if not target:
            class Result:
                deleted_count = 0
            return Result()
        
        for i, item in enumerate(items):
            if str(item.get("_id")) == str(target["_id"]):
                items.pop(i)
                break
        
        self.db.save()
        class Result:
            deleted_count = 1
        return Result()

    async def delete_many(self, query):
        items = self._get_items()
        to_delete = []
        for item in items:
            match = True
            for k, v in query.items():
                if isinstance(v, dict):
                    if "$ne" in v:
                        if item.get(k) == v["$ne"]:
                            match = False
                            break
                    elif "$nin" in v:
                        if item.get(k) in v["$nin"]:
                            match = False
                            break
                elif item.get(k) != v:
                    match = False
                    break
            if match:
                to_delete.append(item)
        
        count = 0
        for item in to_delete:
            items.remove(item)
            count += 1
        
        if count > 0:
            self.db.save()
            
        class Result:
            deleted_count = count
        return Result()

    def aggregate(self, pipeline):
        depts = self._get_items()
        users = self.db.data.setdefault("users", [])
        
        result = []
        for d in depts:
            count = sum(1 for u in users if u.get("role") == "WORKER" and str(u.get("department")).strip().lower() == str(d.get("name")).strip().lower())
            result.append({
                "id": str(d.get("_id")),
                "name": d["name"],
                "workerCount": count
            })
        return MockCursor(result)

class MockDatabase:
    def __init__(self):
        self.data = {}
        self.load()

    def load(self):
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, "r") as f:
                    self.data = json.load(f)
            except Exception:
                self.data = {}
        else:
            self.data = {}

    def save(self):
        def json_serial(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError ("Type %s not serializable" % type(obj))

        with open(DB_FILE, "w") as f:
            json.dump(self.data, f, default=json_serial, indent=2)

    def __getattr__(self, name):
        return MockCollection(self, name)

db_instance = MockDatabase()

def get_db():
    return db_instance

async def connect_db():
    db_instance.load()

async def disconnect_db():
    db_instance.save()
