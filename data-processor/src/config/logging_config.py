"""
Logging Configuration for MicroCrop Data Processor

Production-ready structured logging with:
- JSON formatting for machine readability
- Rotating file handlers
- Console output for development
- Error tracking
- Performance monitoring
"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from pythonjsonlogger import jsonlogger
from typing import Optional


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter with additional context"""
    
    def add_fields(self, log_record, record, message_dict):
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        
        # Add custom fields
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        log_record['module'] = record.module
        log_record['function'] = record.funcName
        log_record['line'] = record.lineno
        
        # Add exception info if present
        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)


def setup_logging(
    log_level: str = "INFO",
    log_dir: str = "logs",
    app_name: str = "microcrop-processor",
    enable_console: bool = True,
    enable_file: bool = True,
    enable_error_file: bool = True,
    json_format: bool = True
) -> None:
    """
    Configure structured logging for the application.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory to store log files
        app_name: Application name for log files
        enable_console: Enable console output
        enable_file: Enable file logging
        enable_error_file: Enable separate error log file
        json_format: Use JSON formatting (True) or standard formatting (False)
    """
    
    # Create logs directory if it doesn't exist
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)
    
    # Configure formatters
    if json_format:
        formatter = CustomJsonFormatter(
            fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    else:
        formatter = logging.Formatter(
            fmt="%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level))
    
    # Remove existing handlers
    root_logger.handlers = []
    
    # Console handler
    if enable_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        console_handler.setLevel(getattr(logging, log_level))
        root_logger.addHandler(console_handler)
    
    # Main file handler with rotation
    if enable_file:
        file_handler = RotatingFileHandler(
            filename=log_path / f"{app_name}.log",
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=10,
            encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(getattr(logging, log_level))
        root_logger.addHandler(file_handler)
    
    # Error file handler with daily rotation
    if enable_error_file:
        error_handler = TimedRotatingFileHandler(
            filename=log_path / f"{app_name}-errors.log",
            when="midnight",
            interval=1,
            backupCount=30,
            encoding="utf-8"
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        root_logger.addHandler(error_handler)
    
    # Performance log handler
    performance_handler = RotatingFileHandler(
        filename=log_path / f"{app_name}-performance.log",
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=5,
        encoding="utf-8"
    )
    performance_handler.setFormatter(formatter)
    performance_handler.addFilter(lambda record: "performance" in record.getMessage().lower())
    root_logger.addHandler(performance_handler)
    
    # Set third-party loggers to WARNING to reduce noise
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("kafka").setLevel(logging.WARNING)
    logging.getLogger("aiokafka").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("aiohttp").setLevel(logging.WARNING)
    logging.getLogger("celery").setLevel(logging.INFO)
    logging.getLogger("redis").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("s3transfer").setLevel(logging.WARNING)
    
    # Log startup message
    root_logger.info(
        f"Logging configured: level={log_level}, json_format={json_format}, "
        f"console={enable_console}, file={enable_file}"
    )


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module.
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        logging.Logger: Configured logger instance
    """
    return logging.getLogger(name)


class LoggerContextFilter(logging.Filter):
    """Add context information to log records"""
    
    def __init__(self, **context):
        super().__init__()
        self.context = context
    
    def filter(self, record):
        for key, value in self.context.items():
            setattr(record, key, value)
        return True


def add_context_to_logger(logger: logging.Logger, **context) -> None:
    """
    Add context information to all logs from this logger.
    
    Args:
        logger: Logger instance
        **context: Context key-value pairs to add
    """
    logger.addFilter(LoggerContextFilter(**context))
