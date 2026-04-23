import os, asyncio
import pytest
from httpx import AsyncClient
from app.main import app
from app.db.mongo import get_db
from app.utils.seed import seed

@pytest.mark.asyncio
async def test_auth_and_lead_access():
    # seed demo users
    await seed()

    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.post("/auth/login", json={"username":"manager1","password":"password"})
        assert r.status_code == 200
        mtoken = r.json()["access_token"]

        r = await ac.post("/auth/login", json={"username":"sales1","password":"password"})
        assert r.status_code == 200
        s1token = r.json()["access_token"]

        # manager can list leads
        r = await ac.get("/leads", headers={"Authorization": f"Bearer {mtoken}"})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 1
        lead_id = items[0]["_id"]

        # sales1 can GET lead if assigned or created by them - sample lead assigned to sales1 exists, so should pass for at least one
        # find one visible to sales1
        r = await ac.get("/leads", headers={"Authorization": f"Bearer {s1token}"})
        assert r.status_code == 200
        sitems = r.json()["items"]
        assert len(sitems) >= 1
        s_lead_id = sitems[0]["_id"]

        # sales1 cannot access a lead that is not theirs (create one assigned to sales2)
        db = get_db()
        from app.repositories.users import UsersRepository
        repo = UsersRepository(db)
        manager = await repo.get_by_username("manager1")
        sales2 = await repo.get_by_username("sales2")
        from app.models.common import now_utc
        res = await db.leads.insert_one({
            "name":"Hidden Lead",
            "phone":"7777777777",
            "email":"hidden@example.com",
            "company":"HiddenCo",
            "source":"facebook",
            "purpose":"hidden",
            "status":"OPEN",
            "temperature":"COLD",
            "tags":[],
            "expected_value":1,
            "pipeline_stage":"NEW",
            "created_by": str(manager["_id"]),
            "assigned_to": str(sales2["_id"]),
            "assigned_by": str(manager["_id"]),
            "assigned_at": now_utc(),
            "created_at": now_utc(),
            "updated_at": now_utc(),
        })
        hidden_id = str(res.inserted_id)

        r = await ac.get(f"/leads/{hidden_id}", headers={"Authorization": f"Bearer {s1token}"})
        assert r.status_code == 403
