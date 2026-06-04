# backend/app/core/websocket_manager.py
from fastapi import WebSocket
from typing import Dict, List
import json


class WebSocketManager:
    """Manages active WebSocket connections per user."""

    def __init__(self):
        # user_id (str) -> list of active websocket connections
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.connections:
            self.connections[user_id] = []
        self.connections[user_id].append(websocket)
        print(f"[WS] User {user_id} connected. Total connections: {len(self.connections[user_id])}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.connections:
            self.connections[user_id].discard(websocket) if hasattr(self.connections[user_id], 'discard') else None
            try:
                self.connections[user_id].remove(websocket)
            except ValueError:
                pass
            if not self.connections[user_id]:
                del self.connections[user_id]
        print(f"[WS] User {user_id} disconnected.")

    async def send_to_user(self, user_id: str, data: dict):
        """Send a notification to all connections for a user."""
        if user_id in self.connections:
            dead = []
            for ws in self.connections[user_id]:
                try:
                    await ws.send_text(json.dumps(data))
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.disconnect(user_id, ws)

    async def broadcast_to_users(self, user_ids: List[str], data: dict):
        """Send a notification to multiple users at once."""
        for uid in user_ids:
            await self.send_to_user(uid, data)


# Singleton — import this everywhere
ws_manager = WebSocketManager()
