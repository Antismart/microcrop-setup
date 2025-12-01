"""
Damage assessment and payout processing tasks for Celery workers.

Tasks:
- calculate_damage_assessment: Calculate damage for plot
- process_pending_assessments: Process queued assessments
- process_pending_payouts: Submit triggered payouts to blockchain
- archive_old_assessments: Archive completed assessments
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, List
import asyncio

from celery import Task

from .celery_app import celery_app
from src.config import get_settings
from src.storage.timescale_client import TimescaleClient
from src.storage.redis_cache import RedisCache
from src.storage.ipfs_client import IPFSClient
from src.models.damage import DamageAssessment, PayoutStatus

settings = get_settings()
logger = logging.getLogger(__name__)


# Initialize clients
# NOTE: DamageCalculator deprecated - damage calculation moved to Chainlink CRE workflow
timescale_client = TimescaleClient()
redis_cache = RedisCache()
ipfs_client = IPFSClient()


class DamageTask(Task):
    """Base task class with connection management."""
    
    _connections_initialized = False
    
    def before_start(self, task_id, args, kwargs):
        """Initialize connections before task starts."""
        if not self._connections_initialized:
            asyncio.run(self._init_connections())
            self._connections_initialized = True
    
    async def _init_connections(self):
        """Initialize all client connections."""
        await timescale_client.connect()
        await redis_cache.connect()
        await ipfs_client.connect()
        logger.info("Damage task connections initialized")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure."""
        logger.error(
            f"Damage task failed: {self.name}",
            extra={
                "task_id": task_id,
                "exception": str(exc),
                "args": args,
                "kwargs": kwargs,
            },
            exc_info=einfo,
        )


@celery_app.task(
    name="src.workers.damage_tasks.calculate_damage_assessment",
    base=DamageTask,
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def calculate_damage_assessment(
    self,
    plot_id: str,
    policy_id: str,
    farmer_address: str,
    assessment_period_days: int = 7,
    sum_insured_usdc: Optional[float] = None,
    max_payout_usdc: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Calculate damage assessment for plot.
    
    Args:
        plot_id: Plot identifier
        policy_id: Policy identifier
        farmer_address: Farmer's wallet address
        assessment_period_days: Assessment period in days
        sum_insured_usdc: Sum insured in USDC
        max_payout_usdc: Maximum payout in USDC
    
    Returns:
        Dict with assessment results
    """
    logger.info(f"Calculating damage assessment for plot {plot_id}")
    
    try:
        result = asyncio.run(
            _calculate_damage_assessment(
                plot_id,
                policy_id,
                farmer_address,
                assessment_period_days,
                sum_insured_usdc,
                max_payout_usdc,
            )
        )
        return result
    except Exception as exc:
        logger.error(
            f"Failed to calculate damage assessment for plot {plot_id}: {exc}",
            exc_info=True,
        )
        raise self.retry(exc=exc)


async def _calculate_damage_assessment(
    plot_id: str,
    policy_id: str,
    farmer_address: str,
    assessment_period_days: int,
    sum_insured_usdc: Optional[float],
    max_payout_usdc: Optional[float],
) -> Dict[str, Any]:
    """Internal async implementation."""
    # Generate assessment ID
    assessment_id = f"DA_{plot_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Calculate assessment period
    end_date = datetime.now()
    start_date = end_date - timedelta(days=assessment_period_days)
    
    # Get policy details if amounts not provided
    if sum_insured_usdc is None or max_payout_usdc is None:
        policy_query = """
            SELECT sum_insured_usdc, max_payout_usdc, farmer_address
            FROM policies
            WHERE policy_id = $1
        """
        policy = await timescale_client.execute_query(policy_query, policy_id)
        
        if policy:
            policy = policy[0]
            sum_insured_usdc = sum_insured_usdc or policy["sum_insured_usdc"]
            max_payout_usdc = max_payout_usdc or policy["max_payout_usdc"]
            farmer_address = farmer_address or policy["farmer_address"]
        else:
            # Use defaults
            sum_insured_usdc = sum_insured_usdc or 10000.0
            max_payout_usdc = max_payout_usdc or 7000.0
    
    logger.info(
        f"Assessment parameters: period={assessment_period_days}d, "
        f"sum_insured=${sum_insured_usdc}, max_payout=${max_payout_usdc}"
    )
    
    # Get weather indices
    weather_query = """
        SELECT data
        FROM weather_indices
        WHERE plot_id = $1
        AND timestamp BETWEEN $2 AND $3
        ORDER BY timestamp DESC
        LIMIT 1
    """
    weather_results = await timescale_client.execute_query(
        weather_query, plot_id, start_date, end_date
    )
    
    if not weather_results:
        raise ValueError(f"No weather indices available for plot {plot_id}")
    
    weather_indices = weather_results[0]["data"]
    
    # Get satellite images
    satellite_images = await timescale_client.get_satellite_images(
        plot_id=plot_id,
        start_date=start_date,
        end_date=end_date,
    )
    
    if not satellite_images:
        logger.warning(f"No satellite images available for plot {plot_id}")
    
    logger.info(
        f"Found {len(satellite_images)} satellite images for assessment"
    )

    # NOTE: Damage calculation has been moved to Chainlink CRE workflow
    # This endpoint now returns data for CRE to process
    logger.info("Damage calculation moved to Chainlink CRE workflow")

    return {
        "status": "data_prepared",
        "message": "Damage calculation moved to Chainlink CRE workflow",
        "assessment_id": assessment_id,
        "plot_id": plot_id,
        "policy_id": policy_id,
        "farmer_address": farmer_address,
        "assessment_period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "days": assessment_period_days,
        },
        "data": {
            "weather_indices": weather_indices,
            "satellite_image_count": len(satellite_images),
            "sum_insured_usdc": sum_insured_usdc,
            "max_payout_usdc": max_payout_usdc,
        },
    }

    # ============ OLD DAMAGE CALCULATION LOGIC - MOVED TO CRE ============
    # The following code has been deprecated and moved to Chainlink CRE workflow
    # Kept for reference only
    #
    # assessment = await damage_calculator.calculate_damage(...)
    # await timescale_client.store_damage_assessment(assessment)
    # ipfs_cid = await ipfs_client.upload_damage_proof(...)
    # await redis_cache.set(cache_key, assessment.model_dump_json(), ttl=86400)
    # process_pending_payouts.apply_async(countdown=60)
    # ======================================================================


@celery_app.task(
    name="src.workers.damage_tasks.process_pending_assessments",
    base=DamageTask,
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def process_pending_assessments(self) -> Dict[str, int]:
    """
    Process pending damage assessments.
    
    Scheduled: Every 10 minutes
    
    Returns:
        Dict with processing counts
    """
    logger.info("Processing pending damage assessments")
    
    try:
        result = asyncio.run(_process_pending_assessments())
        logger.info(
            f"Pending assessments processed: {result['processed']} completed"
        )
        return result
    except Exception as exc:
        logger.error(f"Failed to process pending assessments: {exc}", exc_info=True)
        raise self.retry(exc=exc)


async def _process_pending_assessments() -> Dict[str, int]:
    """Internal async implementation."""
    # Get plots that need assessment
    query = """
        SELECT DISTINCT p.plot_id, p.policy_id, p.farmer_address
        FROM plots p
        INNER JOIN policies pol ON p.policy_id = pol.policy_id
        WHERE pol.status = 'active'
        AND NOT EXISTS (
            SELECT 1 FROM damage_assessments da
            WHERE da.plot_id = p.plot_id
            AND da.assessment_end_date > NOW() - INTERVAL '1 day'
        )
        AND EXISTS (
            SELECT 1 FROM weather_indices wi
            WHERE wi.plot_id = p.plot_id
            AND wi.composite_stress_score >= $1
            AND wi.timestamp > NOW() - INTERVAL '2 hours'
        )
        LIMIT 10
    """
    
    plots = await timescale_client.execute_query(
        query,
        settings.WEATHER_DAMAGE_THRESHOLD,
    )
    
    processed_count = 0
    
    for plot in plots:
        try:
            # Trigger assessment
            calculate_damage_assessment.delay(
                plot_id=plot["plot_id"],
                policy_id=plot["policy_id"],
                farmer_address=plot["farmer_address"],
                assessment_period_days=7,
            )
            processed_count += 1
            
        except Exception as e:
            logger.error(
                f"Failed to queue assessment for plot {plot['plot_id']}: {e}",
                exc_info=True,
            )
    
    return {
        "processed": processed_count,
        "total": len(plots),
    }


@celery_app.task(
    name="src.workers.damage_tasks.process_pending_payouts",
    base=DamageTask,
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def process_pending_payouts(self) -> Dict[str, int]:
    """
    Process pending payout submissions to blockchain.
    
    Scheduled: Every 10 minutes
    
    Returns:
        Dict with submission counts
    """
    logger.info("Processing pending payouts for blockchain submission")
    
    try:
        result = asyncio.run(_process_pending_payouts())
        logger.info(f"Payouts processed: {result['submitted']} submitted to blockchain")
        return result
    except Exception as exc:
        logger.error(f"Failed to process pending payouts: {exc}", exc_info=True)
        raise self.retry(exc=exc)


async def _process_pending_payouts() -> Dict[str, int]:
    """Internal async implementation."""
    # Get triggered assessments pending submission
    query = """
        SELECT assessment_id, plot_id, policy_id, farmer_address,
               data->>'net_payout_usdc' as payout_amount,
               ipfs_cid
        FROM damage_assessments
        WHERE (data->'payout_trigger'->>'is_triggered')::boolean = true
        AND payout_status = $1
        AND NOT (data->>'requires_manual_review')::boolean
        AND ipfs_cid IS NOT NULL
        ORDER BY assessment_end_date DESC
        LIMIT 20
    """
    
    pending_payouts = await timescale_client.execute_query(
        query,
        PayoutStatus.PENDING.value,
    )
    
    submitted_count = 0
    
    for payout in pending_payouts:
        try:
            # Submit damage assessment to blockchain
            logger.info(
                f"Submitting payout to blockchain: "
                f"assessment={payout['assessment_id']}, "
                f"policy={payout['policy_id']}, "
                f"farmer={payout['farmer_address']}, "
                f"amount=${payout['payout_amount']}, "
                f"proof=ipfs://{payout['ipfs_cid']}"
            )
            
            # Import blockchain task (avoid circular import)
            from workers.blockchain_tasks import assess_damage_on_chain
            
            # Queue blockchain assessment task
            # This will check trigger conditions and assess damage on-chain
            task_result = assess_damage_on_chain.delay(
                policy_id=payout['policy_id']
            )
            
            # Mark as pending blockchain confirmation
            update_query = """
                UPDATE damage_assessments
                SET payout_status = $1,
                    blockchain_tx_hash = $2,
                    updated_at = $3
                WHERE assessment_id = $4
            """
            await timescale_client.execute_query(
                update_query,
                PayoutStatus.PENDING_BLOCKCHAIN.value,  # Pending until confirmed
                f"celery_task_{task_result.id}",  # Store Celery task ID
                datetime.now(),
                payout["assessment_id"],
            )
            
            submitted_count += 1
            
        except Exception as e:
            logger.error(
                f"Failed to submit payout for assessment {payout['assessment_id']}: {e}",
                exc_info=True,
            )
    
    return {
        "submitted": submitted_count,
        "total": len(pending_payouts),
    }


@celery_app.task(
    name="src.workers.damage_tasks.archive_old_assessments",
    base=DamageTask,
    bind=True,
    max_retries=3,
    default_retry_delay=600,
)
def archive_old_assessments(self) -> Dict[str, int]:
    """
    Archive old completed damage assessments.
    
    Scheduled: Daily at 2:30 AM
    
    Returns:
        Dict with archive counts
    """
    logger.info("Archiving old damage assessments")
    
    try:
        result = asyncio.run(_archive_old_assessments())
        logger.info(f"Old assessments archived: {result['archived']} assessments")
        return result
    except Exception as exc:
        logger.error(f"Failed to archive old assessments: {exc}", exc_info=True)
        raise self.retry(exc=exc)


async def _archive_old_assessments() -> Dict[str, int]:
    """Internal async implementation."""
    # Archive assessments older than 90 days that are completed
    cutoff_date = datetime.now() - timedelta(days=90)
    
    query = """
        SELECT assessment_id, data
        FROM damage_assessments
        WHERE payout_status IN ($1, $2, $3)
        AND assessment_end_date < $4
        AND NOT archived
        LIMIT 100
    """
    
    old_assessments = await timescale_client.execute_query(
        query,
        PayoutStatus.COMPLETED.value,
        PayoutStatus.REJECTED.value,
        PayoutStatus.APPROVED.value,
        cutoff_date,
    )
    
    archived_count = 0
    
    for assessment in old_assessments:
        try:
            # Mark as archived
            update_query = """
                UPDATE damage_assessments
                SET archived = true, updated_at = $1
                WHERE assessment_id = $2
            """
            await timescale_client.execute_query(
                update_query,
                datetime.now(),
                assessment["assessment_id"],
            )

            archived_count += 1

        except Exception as e:
            logger.error(
                f"Failed to archive assessment {assessment['assessment_id']}: {e}",
                exc_info=True,
            )
    
    return {
        "archived": archived_count,
        "total": len(old_assessments),
        "cutoff_date": cutoff_date.date().isoformat(),
    }
