from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from uuid import uuid4

_client: AsyncIOMotorClient | None = None

def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGO_URI)
    return _client

def get_db():
    client = get_client()
    return client[settings.MONGO_DB]

async def _backfill_uuid_ids(db):
    # Populate missing UUID ids in legacy documents before unique index creation.
    id_mappings = [
        ("users", "user_id"),
        ("leads", "lead_id"),
        ("followups", "followup_id"),
        ("invoices", "invoice_id"),
        ("notifications", "notification_id"),
        ("audit_logs", "audit_id"),
        ("saved_views", "view_id"),
        ("achievements", "achievement_id"),
        ("products", "project_id"),
    ]
    for collection_name, id_field in id_mappings:
        collection = getattr(db, collection_name)
        query = {"$or": [{id_field: {"$exists": False}}, {id_field: None}, {id_field: ""}]}
        cursor = collection.find(query, {"_id": 1})
        async for doc in cursor:
            new_id = str(uuid4())
            await collection.update_one({"_id": doc["_id"]}, {"$set": {id_field: new_id}})

async def ensure_indexes(db):
    await _backfill_uuid_ids(db)

    await db.users.create_index("username", unique=True)
    await db.users.create_index("user_id", unique=True, partialFilterExpression={"user_id": {"$type": "string"}})
    await db.users.create_index("role")
    await db.leads.create_index("lead_id", unique=True, partialFilterExpression={"lead_id": {"$type": "string"}})
    await db.leads.create_index("assigned_to")
    await db.leads.create_index("created_by")
    await db.leads.create_index("status")
    await db.leads.create_index("temperature")
    await db.leads.create_index("next_followup_at")
    await db.leads.create_index("updated_at")
    await db.leads.create_index([("phone", 1)], unique=False)
    await db.leads.create_index([("email", 1)], unique=False)
    await db.followups.create_index("lead_id")
    await db.followups.create_index("followup_id", unique=True, partialFilterExpression={"followup_id": {"$type": "string"}})
    await db.followups.create_index("created_by")
    await db.followups.create_index("done_at")
    await db.invoices.create_index("invoice_id", unique=True, partialFilterExpression={"invoice_id": {"$type": "string"}})
    await db.invoices.create_index("sales_user_id")
    await db.invoices.create_index("created_at")
    await db.notifications.create_index("notification_id", unique=True, partialFilterExpression={"notification_id": {"$type": "string"}})
    await db.notifications.create_index("user_id")
    await db.notifications.create_index("read")
    await db.notifications.create_index("created_at")
    await db.audit_logs.create_index("audit_id", unique=True, partialFilterExpression={"audit_id": {"$type": "string"}})
    await db.audit_logs.create_index("lead_id")
    await db.audit_logs.create_index("created_at")
    await db.saved_views.create_index("view_id", unique=True, partialFilterExpression={"view_id": {"$type": "string"}})
    await db.saved_views.create_index("user_id")
    await db.saved_views.create_index("created_at")
    await db.achievements.create_index("achievement_id", unique=True, partialFilterExpression={"achievement_id": {"$type": "string"}})
    await db.achievements.create_index("user_id")
    await db.achievements.create_index("created_at")
    await db.products.create_index("project_id", unique=True, partialFilterExpression={"project_id": {"$type": "string"}})
