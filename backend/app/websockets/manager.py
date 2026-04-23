from typing import Dict, Set
from fastapi import WebSocket
import asyncio

class WSManager:
    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._connections.setdefault(user_id, set()).add(ws)

    async def disconnect(self, user_id: str, ws: WebSocket):
        async with self._lock:
            if user_id in self._connections and ws in self._connections[user_id]:
                self._connections[user_id].remove(ws)
                if not self._connections[user_id]:
                    self._connections.pop(user_id, None)

    async def send_json(self, user_id: str, payload: dict):
        async with self._lock:
            conns = list(self._connections.get(user_id, set()))
        for ws in conns:
            try:
                await ws.send_json(payload)
            except Exception:
                # drop on errors
                await self.disconnect(user_id, ws)

ws_manager = WSManager()
