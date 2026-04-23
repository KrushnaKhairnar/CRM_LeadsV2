from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router
from app.db.mongo import get_db, ensure_indexes
from app.core.security import decode_token
from app.websockets.manager import ws_manager
from app.scheduler.followup_notifier import create_scheduler
from app.utils.seed import ensure_admin_from_env

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.on_event("startup")
async def on_startup():
    db = get_db()
    await ensure_indexes(db)
    await ensure_admin_from_env(db)
    # scheduler
    if settings.SCHEDULER_ENABLED:
        app.state.scheduler = create_scheduler(db)
        app.state.scheduler.start()

@app.on_event("shutdown")
async def on_shutdown():
    sched = getattr(app.state, "scheduler", None)
    if sched:
        sched.shutdown(wait=False)

@app.get("/health")
async def health():
    return {"ok": True, "env": settings.ENV}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    # auth via query token: ws://.../ws?token=...
    token = ws.query_params.get("token")
    if not token:
        await ws.close(code=4401)
        return
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await ws.close(code=4401)
            return
    except Exception:
        await ws.close(code=4401)
        return

    await ws_manager.connect(user_id, ws)
    try:
        while True:
            # keepalive / allow client pings
            msg = await ws.receive_text()
            if msg == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(user_id, ws)
    except Exception:
        await ws_manager.disconnect(user_id, ws)
