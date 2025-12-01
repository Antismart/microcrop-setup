"""
WebSocket endpoints for real-time updates.

Provides:
- Real-time plot monitoring
- Damage assessment notifications
- Weather alert streaming
- Task progress updates
"""

import logging
import json
from typing import Dict, Set
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.routing import APIRouter

from config import get_settings
from storage.redis_cache import RedisCache

settings = get_settings()
logger = logging.getLogger(__name__)

# Create WebSocket router
ws_router = APIRouter()

# Redis client for pub/sub
redis_cache = RedisCache()


class ConnectionManager:
    """
    Manages WebSocket connections and broadcasting.
    """
    
    def __init__(self):
        # Active connections by plot_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # All connections
        self.all_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket, plot_id: str = None):
        """
        Accept and register a WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            plot_id: Optional plot ID for filtered updates
        """
        await websocket.accept()
        
        self.all_connections.add(websocket)
        
        if plot_id:
            if plot_id not in self.active_connections:
                self.active_connections[plot_id] = set()
            self.active_connections[plot_id].add(websocket)
            
        logger.info(
            f"WebSocket connected: plot_id={plot_id}, "
            f"total_connections={len(self.all_connections)}"
        )
    
    def disconnect(self, websocket: WebSocket, plot_id: str = None):
        """
        Unregister a WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            plot_id: Optional plot ID
        """
        self.all_connections.discard(websocket)
        
        if plot_id and plot_id in self.active_connections:
            self.active_connections[plot_id].discard(websocket)
            if not self.active_connections[plot_id]:
                del self.active_connections[plot_id]
        
        logger.info(
            f"WebSocket disconnected: plot_id={plot_id}, "
            f"remaining_connections={len(self.all_connections)}"
        )
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """
        Send message to specific connection.
        
        Args:
            message: Message to send
            websocket: Target WebSocket connection
        """
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
    
    async def broadcast_to_plot(self, message: str, plot_id: str):
        """
        Broadcast message to all connections for a plot.
        
        Args:
            message: Message to broadcast
            plot_id: Target plot ID
        """
        if plot_id not in self.active_connections:
            return
        
        disconnected = set()
        
        for connection in self.active_connections[plot_id]:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to plot {plot_id}: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected sockets
        for connection in disconnected:
            self.disconnect(connection, plot_id)
    
    async def broadcast_all(self, message: str):
        """
        Broadcast message to all connections.
        
        Args:
            message: Message to broadcast
        """
        disconnected = set()
        
        for connection in self.all_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to broadcast: {e}")
                disconnected.add(connection)
        
        # Clean up disconnected sockets
        for connection in disconnected:
            self.disconnect(connection)


# Initialize connection manager
manager = ConnectionManager()


@ws_router.websocket("/ws/plot/{plot_id}")
async def websocket_plot_updates(websocket: WebSocket, plot_id: str):
    """
    WebSocket endpoint for real-time plot updates.
    
    Streams:
    - Weather data updates
    - Satellite image processing
    - Damage assessment results
    - Alert notifications
    
    Args:
        websocket: WebSocket connection
        plot_id: Plot identifier to monitor
    """
    await manager.connect(websocket, plot_id)
    
    try:
        # Send initial connection confirmation
        await manager.send_personal_message(
            json.dumps({
                "type": "connection",
                "status": "connected",
                "plot_id": plot_id,
                "timestamp": datetime.now().isoformat(),
                "message": f"Connected to plot {plot_id} updates",
            }),
            websocket,
        )
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            
            # Parse incoming message
            try:
                message = json.loads(data)
                message_type = message.get("type")
                
                if message_type == "ping":
                    # Respond to ping
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "pong",
                            "timestamp": datetime.now().isoformat(),
                        }),
                        websocket,
                    )
                
                elif message_type == "subscribe":
                    # Subscribe to specific event types
                    event_types = message.get("events", [])
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "subscribed",
                            "events": event_types,
                            "timestamp": datetime.now().isoformat(),
                        }),
                        websocket,
                    )
                
                else:
                    # Echo unknown messages
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "echo",
                            "received": message,
                            "timestamp": datetime.now().isoformat(),
                        }),
                        websocket,
                    )
                    
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    json.dumps({
                        "type": "error",
                        "message": "Invalid JSON",
                        "timestamp": datetime.now().isoformat(),
                    }),
                    websocket,
                )
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, plot_id)
        logger.info(f"Client disconnected from plot {plot_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error for plot {plot_id}: {e}", exc_info=True)
        manager.disconnect(websocket, plot_id)


@ws_router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    WebSocket endpoint for system-wide alerts.
    
    Streams:
    - Critical weather alerts
    - System health alerts
    - High-value damage assessments
    
    Args:
        websocket: WebSocket connection
    """
    await manager.connect(websocket)
    
    try:
        # Send initial connection confirmation
        await manager.send_personal_message(
            json.dumps({
                "type": "connection",
                "status": "connected",
                "stream": "alerts",
                "timestamp": datetime.now().isoformat(),
                "message": "Connected to system alerts",
            }),
            websocket,
        )
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            
            # Handle ping/pong
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "pong",
                            "timestamp": datetime.now().isoformat(),
                        }),
                        websocket,
                    )
            except json.JSONDecodeError:
                pass
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Client disconnected from alerts")
    
    except Exception as e:
        logger.error(f"WebSocket error for alerts: {e}", exc_info=True)
        manager.disconnect(websocket)


# Helper functions for broadcasting events

async def broadcast_weather_update(plot_id: str, weather_data: dict):
    """
    Broadcast weather update to plot subscribers.
    
    Args:
        plot_id: Plot identifier
        weather_data: Weather data dictionary
    """
    message = json.dumps({
        "type": "weather_update",
        "plot_id": plot_id,
        "data": weather_data,
        "timestamp": datetime.now().isoformat(),
    })
    
    await manager.broadcast_to_plot(message, plot_id)
    logger.debug(f"Broadcasted weather update for plot {plot_id}")


async def broadcast_satellite_update(plot_id: str, satellite_data: dict):
    """
    Broadcast satellite image update to plot subscribers.
    
    Args:
        plot_id: Plot identifier
        satellite_data: Satellite image data dictionary
    """
    message = json.dumps({
        "type": "satellite_update",
        "plot_id": plot_id,
        "data": satellite_data,
        "timestamp": datetime.now().isoformat(),
    })
    
    await manager.broadcast_to_plot(message, plot_id)
    logger.debug(f"Broadcasted satellite update for plot {plot_id}")


async def broadcast_damage_assessment(plot_id: str, assessment_data: dict):
    """
    Broadcast damage assessment to plot subscribers.
    
    Args:
        plot_id: Plot identifier
        assessment_data: Assessment data dictionary
    """
    message = json.dumps({
        "type": "damage_assessment",
        "plot_id": plot_id,
        "data": assessment_data,
        "timestamp": datetime.now().isoformat(),
    })
    
    await manager.broadcast_to_plot(message, plot_id)
    logger.info(f"Broadcasted damage assessment for plot {plot_id}")
    
    # Also broadcast to alerts if payout triggered
    if assessment_data.get("payout_triggered"):
        await broadcast_alert({
            "level": "info",
            "title": "Payout Triggered",
            "message": f"Damage assessment for plot {plot_id} triggered payout",
            "plot_id": plot_id,
            "payout_amount": assessment_data.get("payout_amount_usdc"),
        })


async def broadcast_alert(alert_data: dict):
    """
    Broadcast system alert to all subscribers.
    
    Args:
        alert_data: Alert data dictionary with level, title, message
    """
    message = json.dumps({
        "type": "alert",
        "data": alert_data,
        "timestamp": datetime.now().isoformat(),
    })
    
    await manager.broadcast_all(message)
    logger.info(f"Broadcasted alert: {alert_data.get('title')}")


async def broadcast_task_progress(task_id: str, progress: int, message: str):
    """
    Broadcast task progress update.
    
    Args:
        task_id: Task identifier
        progress: Progress percentage (0-100)
        message: Progress message
    """
    update = json.dumps({
        "type": "task_progress",
        "task_id": task_id,
        "progress": progress,
        "message": message,
        "timestamp": datetime.now().isoformat(),
    })
    
    await manager.broadcast_all(update)
    logger.debug(f"Broadcasted task progress: {task_id} - {progress}%")
