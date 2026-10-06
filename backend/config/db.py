import json
import os
from datetime import datetime
from uuid import uuid4
from pymongo.errors import DuplicateKeyError
from config.settings import settings

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

    def _match_field(self, val, criterion):
        if isinstance(criterion, dict):
            for op, target in criterion.items():
                if op == "$regex":
                    flags = criterion.get("$options", "")
                    import re
                    reg_flags = re.IGNORECASE if "i" in flags else 0
                    if not re.search(str(target), str(val or ""), reg_flags):
                        return False
                elif op == "$options":
                    continue
                elif op == "$in":
                    if val not in target:
                        return False
                elif op == "$nin":
                    if val in target:
                        return False
                elif op == "$ne":
                    if val == target:
                        return False
                elif op == "$gt":
                    if val is None or val <= target:
                        return False
                elif op == "$gte":
                    if val is None or val < target:
                        return False
                elif op == "$lt":
                    if val is None or val >= target:
                        return False
                elif op == "$lte":
                    if val is None or val > target:
                        return False
                elif op == "$exists":
                    if bool(val is not None) != bool(target):
                        return False
            return True
        return val == criterion

    def _matches(self, doc, query):
        if not query:
            return True
        if "$or" in query:
            or_matched = False
            for sub_q in query["$or"]:
                if self._matches(doc, sub_q):
                    or_matched = True
                    break
            if not or_matched:
                return False

        for k, v in query.items():
            if k == "$or":
                continue
            if k == "_id":
                doc_id = str(doc.get("_id"))
                if isinstance(v, dict):
                    if not self._match_field(doc_id, v):
                        return False
                elif isinstance(v, (list, tuple)):
                    if doc_id not in [str(x) for x in v]:
                        return False
                else:
                    if doc_id != str(v):
                        return False
            else:
                doc_val = doc.get(k)
                if not self._match_field(doc_val, v):
                    return False
        return True

    async def create_index(self, *args, **kwargs):
        pass

    async def count_documents(self, query):
        items = self._get_items()
        return sum(1 for item in items if self._matches(item, query))

    async def find_one(self, query):
        items = self._get_items()
        for item in items:
            if self._matches(item, query):
                return dict(item)
        return None

    def find(self, query=None):
        items = self._get_items()
        matched = [dict(item) for item in items if self._matches(item, query)]
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
        
        for item in items:
            if str(item.get("_id")) == str(target["_id"]):
                if "$set" in update:
                    for k, v in update["$set"].items():
                        item[k] = v
                if "$inc" in update:
                    for k, v in update["$inc"].items():
                        item[k] = (item.get(k) or 0) + v
                if "$push" in update:
                    for k, v in update["$push"].items():
                        item.setdefault(k, []).append(v)
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
        to_delete = [item for item in items if self._matches(item, query)]
        count = 0
        for item in to_delete:
            if item in items:
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

client = None
db_instance = None

def get_db():
    global db_instance
    if db_instance is None:
        mock = MockDatabase()
        mock.load()
        db_instance = mock
    return db_instance

async def connect_db():
    global client, db_instance
    mongo_url = settings.get_mongo_url or os.getenv("MONGO_URL", "") or os.getenv("MONGODB_URI", "")
    if mongo_url and ("mongodb://" in mongo_url or "mongodb+srv://" in mongo_url):
        try:
            import motor.motor_asyncio
            import logging
            log = logging.getLogger(__name__)
            log.info("Connecting to MongoDB Atlas...")
            client = motor.motor_asyncio.AsyncIOMotorClient(
                mongo_url,
                serverSelectionTimeoutMS=5000
            )
            # Test ping
            await client.admin.command('ping')
            db_name = settings.mongo_db_name or "garmentflow"
            db_instance = client[db_name]
            log.info(f"Successfully connected to MongoDB Atlas: {db_name}")
            return
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to connect to MongoDB ({e}). Falling back to local mock DB.")
    
    mock = MockDatabase()
    mock.load()
    db_instance = mock
    import logging
    logging.getLogger(__name__).info("Using local JSON Mock Database.")

async def disconnect_db():
    global client, db_instance
    if client:
        client.close()
    elif isinstance(db_instance, MockDatabase):
        db_instance.save()

