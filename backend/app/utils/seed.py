import asyncio
from uuid import uuid4
from app.db.mongo import get_db, ensure_indexes
from app.core.security import hash_password
from app.models.common import now_utc
from app.core.config import settings

async def ensure_admin_from_env(db=None):
    if db is None:
        db = get_db()
    admin = await db.users.find_one({"role": "ADMIN"})
    if admin:
        return admin.get("user_id")

    uid = str(uuid4())
    await db.users.insert_one({
        "_id": uid,
        "user_id": uid,
        "username": settings.ADMIN_USERNAME,
        "password_hash": hash_password(settings.ADMIN_PASSWORD),
        "role": "ADMIN",
        "created_at": now_utc(),
    })
    return uid

async def seed():
    db = get_db()
    await ensure_indexes(db)
    await ensure_admin_from_env(db)

if __name__ == "__main__":
    asyncio.run(seed())
