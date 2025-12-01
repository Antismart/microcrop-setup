"""
Celery application configuration for MicroCrop data processor.

Provides:
- Celery app initialization
- Task routing configuration
- Beat schedule for periodic tasks
- Result backend configuration
- Error handling and monitoring
"""

import logging
from celery import Celery
from celery.schedules import crontab
from kombu import Queue, Exchange

from src.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


# Initialize Celery app
celery_app = Celery(
    "microcrop-processor",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Task execution
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    
    # Concurrency
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    
    # Time limits
    task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    
    # Result backend
    result_expires=3600,  # 1 hour
    result_backend_transport_options={
        "master_name": "mymaster",
    },
    
    # Task routing
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",
    
    # Queues
    task_queues=(
        Queue("default", Exchange("default"), routing_key="default"),
        Queue("weather", Exchange("weather"), routing_key="weather.#"),
        Queue("planet", Exchange("planet"), routing_key="planet.#"),
        Queue("damage", Exchange("damage"), routing_key="damage.#"),
        Queue("priority", Exchange("priority"), routing_key="priority.#"),
    ),

    # Task routes
    task_routes={
        "src.workers.weather_tasks.*": {"queue": "weather"},
        "src.workers.planet_tasks.*": {"queue": "planet"},
        "src.workers.damage_tasks.*": {"queue": "damage"},
    },
    
    # Beat schedule for periodic tasks
    beat_schedule={
        # Fetch weather updates every 5 minutes
        "fetch-weather-updates": {
            "task": "src.workers.weather_tasks.fetch_all_weather_updates",
            "schedule": crontab(minute="*/5"),
            "options": {"queue": "weather"},
        },
        
        # Calculate daily weather indices at midnight
        "calculate-daily-weather-indices": {
            "task": "src.workers.weather_tasks.calculate_daily_indices",
            "schedule": crontab(hour=0, minute=0),
            "options": {"queue": "weather"},
        },
        
        # Check for weather triggers every 10 minutes
        "check-weather-triggers": {
            "task": "src.workers.weather_tasks.check_weather_triggers",
            "schedule": crontab(minute="*/10"),
            "options": {"queue": "weather"},
        },

        # Process pending damage assessments every 10 minutes
        "process-pending-assessments": {
            "task": "src.workers.damage_tasks.process_pending_assessments",
            "schedule": crontab(minute="*/10"),
            "options": {"queue": "damage"},
        },
        
        # Process pending payouts every 10 minutes
        "process-pending-payouts": {
            "task": "src.workers.damage_tasks.process_pending_payouts",
            "schedule": crontab(minute="*/10"),
            "options": {"queue": "damage"},
        },
        
        # Archive old assessments daily at 2 AM
        "archive-old-assessments": {
            "task": "src.workers.damage_tasks.archive_old_assessments",
            "schedule": crontab(hour=2, minute=30),
            "options": {"queue": "damage"},
        },
        
        # Health check every minute
        "health-check": {
            "task": "src.workers.health_tasks.health_check",
            "schedule": crontab(minute="*"),
            "options": {"queue": "default"},
        },
    },
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Error handling
    task_ignore_result=False,
    task_store_errors_even_if_ignored=True,
)

# Task annotations
celery_app.conf.task_annotations = {
    "*": {
        "rate_limit": "100/m",  # Default rate limit
    },
    "src.workers.weather_tasks.fetch_weather_updates": {
        "rate_limit": "60/m",  # WeatherXM API limit
    },
}

# Auto-discover tasks
celery_app.autodiscover_tasks([
    "src.workers.weather_tasks",
    "src.workers.planet_tasks",
    "src.workers.damage_tasks",
    "src.workers.health_tasks",
])


# Task error handler
@celery_app.task(bind=True)
def error_handler(self, uuid):
    """Handle task errors."""
    result = celery_app.AsyncResult(uuid)
    logger.error(
        f"Task {uuid} raised exception",
        extra={
            "task_id": uuid,
            "task_name": result.name,
            "exception": str(result.info),
        },
        exc_info=result.traceback,
    )


# Celery signals
from celery.signals import (
    task_prerun,
    task_postrun,
    task_failure,
    task_success,
    worker_ready,
    worker_shutdown,
)


@worker_ready.connect
def on_worker_ready(sender, **kwargs):
    """Log when worker is ready."""
    logger.info(f"Celery worker ready: {sender}")


@worker_shutdown.connect
def on_worker_shutdown(sender, **kwargs):
    """Log when worker shuts down."""
    logger.info(f"Celery worker shutting down: {sender}")


@task_prerun.connect
def on_task_prerun(task_id, task, args, kwargs, **extra):
    """Log before task execution."""
    logger.info(
        f"Task starting: {task.name}",
        extra={
            "task_id": task_id,
            "task_name": task.name,
            "args": args,
            "kwargs": kwargs,
        },
    )


@task_postrun.connect
def on_task_postrun(task_id, task, args, kwargs, retval, **extra):
    """Log after task execution."""
    logger.info(
        f"Task completed: {task.name}",
        extra={
            "task_id": task_id,
            "task_name": task.name,
            "return_value": str(retval)[:100],  # Truncate long return values
        },
    )


@task_success.connect
def on_task_success(sender, result, **kwargs):
    """Log successful task completion."""
    logger.info(
        f"Task succeeded: {sender.name}",
        extra={
            "task_name": sender.name,
            "result": str(result)[:100],
        },
    )


@task_failure.connect
def on_task_failure(task_id, exception, args, kwargs, traceback, einfo, **extra):
    """Log task failure."""
    logger.error(
        f"Task failed",
        extra={
            "task_id": task_id,
            "exception": str(exception),
            "args": args,
            "kwargs": kwargs,
        },
        exc_info=einfo,
    )


# Helper function to start celery worker
def start_worker():
    """Start Celery worker programmatically."""
    argv = [
        "worker",
        f"--loglevel={settings.LOG_LEVEL}",
        f"--concurrency={settings.CELERY_WORKER_CONCURRENCY}",
        "--pool=prefork",
        "--autoscale=10,3",
        "--max-tasks-per-child=1000",
    ]
    celery_app.worker_main(argv)


# Helper function to start celery beat
def start_beat():
    """Start Celery beat scheduler programmatically."""
    argv = [
        "beat",
        f"--loglevel={settings.LOG_LEVEL}",
        "--scheduler=celery.beat:PersistentScheduler",
    ]
    celery_app.start(argv)


if __name__ == "__main__":
    # Start worker if run directly
    start_worker()
