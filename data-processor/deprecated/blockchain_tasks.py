"""
MicroCrop Blockchain Tasks

Celery tasks for blockchain operations:
- submit_weather_to_blockchain: Submit weather data on-chain
- submit_satellite_to_blockchain: Submit satellite data on-chain
- assess_damage_on_chain: Trigger damage assessment
- batch_submit_oracle_data: Batch submission for efficiency
- monitor_blockchain_transactions: Monitor pending transactions
- sync_blockchain_state: Sync on-chain state with database
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from celery import Task
from workers.celery_app import celery_app
from processors.oracle_processor import get_oracle_processor
from storage.timescale_client import get_timescale_client
from storage.redis_cache import get_redis_cache

logger = logging.getLogger(__name__)


class BlockchainTask(Task):
    """Base task with blockchain processor caching"""
    
    _oracle_processor = None
    
    @property
    def oracle_processor(self):
        """Lazy-load oracle processor"""
        if self._oracle_processor is None:
            self._oracle_processor = asyncio.run(get_oracle_processor())
        return self._oracle_processor


@celery_app.task(
    name="blockchain.submit_weather",
    bind=True,
    base=BlockchainTask,
    max_retries=3,
    default_retry_delay=60
)
def submit_weather_to_blockchain(
    self,
    plot_id: int,
    period_start: str,
    period_end: str
) -> Dict[str, Any]:
    """
    Submit aggregated weather data to blockchain.
    
    Args:
        plot_id: Plot identifier
        period_start: ISO format datetime string
        period_end: ISO format datetime string
        
    Returns:
        Submission result with transaction hash
    """
    try:
        logger.info(f"[Blockchain Task] Submitting weather data for plot {plot_id}")
        
        # Parse datetimes
        start_dt = datetime.fromisoformat(period_start)
        end_dt = datetime.fromisoformat(period_end)
        
        # Submit to blockchain
        result = asyncio.run(
            self.oracle_processor.submit_weather_data(
                plot_id=plot_id,
                period_start=start_dt,
                period_end=end_dt
            )
        )
        
        if not result['success']:
            # Retry on failure
            raise self.retry(exc=Exception(result.get('error', 'Unknown error')))
        
        logger.info(
            f"Weather data submitted to blockchain - "
            f"Plot: {plot_id}, TX: {result.get('tx_hash')}"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to submit weather data to blockchain: {e}")
        raise self.retry(exc=e)


@celery_app.task(
    name="blockchain.submit_satellite",
    bind=True,
    base=BlockchainTask,
    max_retries=3,
    default_retry_delay=60
)
def submit_satellite_to_blockchain(
    self,
    plot_id: int,
    period_start: str,
    period_end: str
) -> Dict[str, Any]:
    """
    Submit aggregated satellite data to blockchain.
    
    Args:
        plot_id: Plot identifier
        period_start: ISO format datetime string
        period_end: ISO format datetime string
        
    Returns:
        Submission result with transaction hash
    """
    try:
        logger.info(f"[Blockchain Task] Submitting satellite data for plot {plot_id}")
        
        # Parse datetimes
        start_dt = datetime.fromisoformat(period_start)
        end_dt = datetime.fromisoformat(period_end)
        
        # Submit to blockchain
        result = asyncio.run(
            self.oracle_processor.submit_satellite_data(
                plot_id=plot_id,
                period_start=start_dt,
                period_end=end_dt
            )
        )
        
        if not result['success']:
            # Retry on failure
            raise self.retry(exc=Exception(result.get('error', 'Unknown error')))
        
        logger.info(
            f"Satellite data submitted to blockchain - "
            f"Plot: {plot_id}, TX: {result.get('tx_hash')}"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to submit satellite data to blockchain: {e}")
        raise self.retry(exc=e)


@celery_app.task(
    name="blockchain.assess_damage",
    bind=True,
    base=BlockchainTask,
    max_retries=3,
    default_retry_delay=60
)
def assess_damage_on_chain(
    self,
    policy_id: int
) -> Dict[str, Any]:
    """
    Assess damage and trigger payout on blockchain.
    
    Args:
        policy_id: Policy identifier
        
    Returns:
        Assessment result with damage percentage
    """
    try:
        logger.info(f"[Blockchain Task] Assessing damage for policy {policy_id}")
        
        # Assess damage on blockchain
        result = asyncio.run(
            self.oracle_processor.assess_and_trigger_payout(policy_id)
        )
        
        if not result['success']:
            # Retry on failure
            raise self.retry(exc=Exception(result.get('error', 'Unknown error')))
        
        if result['triggered']:
            logger.info(
                f"Damage assessment completed - "
                f"Policy: {policy_id}, "
                f"Damage: {result['damage_percentage']}%, "
                f"TX: {result.get('tx_hash')}"
            )
        else:
            logger.info(
                f"Policy {policy_id} not triggered - {result.get('reason')}"
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to assess damage on chain: {e}")
        raise self.retry(exc=e)


@celery_app.task(
    name="blockchain.batch_submit_oracle_data",
    bind=True,
    base=BlockchainTask
)
def batch_submit_oracle_data(
    self,
    data_type: str,
    submissions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Batch submit oracle data to blockchain.
    
    Args:
        data_type: Type of data ('weather' or 'satellite')
        submissions: List of submission dictionaries
        
    Returns:
        Batch submission results
    """
    try:
        logger.info(
            f"[Blockchain Task] Batch submitting {len(submissions)} "
            f"{data_type} records"
        )
        
        if data_type == 'weather':
            result = asyncio.run(
                self.oracle_processor.batch_submit_weather_data(submissions)
            )
        else:
            # Satellite batch submission would be implemented similarly
            result = {'error': 'Not implemented for satellite yet'}
        
        logger.info(
            f"Batch submission completed - "
            f"Total: {result.get('total', 0)}, "
            f"Successful: {result.get('successful', 0)}, "
            f"Failed: {result.get('failed', 0)}"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Batch submission failed: {e}")
        raise


@celery_app.task(
    name="blockchain.monitor_transactions",
    bind=True,
    base=BlockchainTask
)
def monitor_blockchain_transactions(self) -> Dict[str, Any]:
    """
    Monitor pending blockchain transactions and update status.
    
    Returns:
        Monitoring results with transaction statuses
    """
    try:
        logger.info("[Blockchain Task] Monitoring pending transactions")
        
        # Get pending transactions
        pending = asyncio.run(
            self.oracle_processor.monitor_pending_transactions()
        )
        
        logger.info(f"Monitored {len(pending)} pending transactions")
        
        return {
            'pending_count': len(pending),
            'transactions': pending
        }
        
    except Exception as e:
        logger.error(f"Failed to monitor transactions: {e}")
        raise


@celery_app.task(
    name="blockchain.schedule_weather_submissions",
    bind=True,
    base=BlockchainTask
)
def schedule_weather_submissions(
    self,
    hours_back: int = 1
) -> Dict[str, Any]:
    """
    Schedule weather data submissions for plots with new data.
    
    Args:
        hours_back: Look back this many hours for new data
        
    Returns:
        Scheduling results
    """
    try:
        logger.info("[Blockchain Task] Scheduling weather submissions")
        
        async def _schedule():
            timescale = await get_timescale_client()
            
            # Find plots with new weather data
            cutoff = datetime.utcnow() - timedelta(hours=hours_back)
            
            query = """
                SELECT DISTINCT plot_id
                FROM weather_data
                WHERE timestamp >= $1
                    AND plot_id NOT IN (
                        SELECT plot_id
                        FROM oracle_submissions
                        WHERE data_type = 'weather'
                            AND submitted_at >= $1
                    )
            """
            
            plots = await timescale.fetch_all(query, cutoff)
            
            # Schedule submissions
            scheduled = 0
            for row in plots:
                plot_id = row['plot_id']
                
                # Calculate aggregation period (last hour)
                period_end = datetime.utcnow()
                period_start = period_end - timedelta(hours=1)
                
                # Queue submission task
                submit_weather_to_blockchain.delay(
                    plot_id=plot_id,
                    period_start=period_start.isoformat(),
                    period_end=period_end.isoformat()
                )
                
                scheduled += 1
            
            return {'scheduled': scheduled, 'plots': [r['plot_id'] for r in plots]}
        
        result = asyncio.run(_schedule())
        
        logger.info(f"Scheduled {result['scheduled']} weather submissions")
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to schedule submissions: {e}")
        raise


@celery_app.task(
    name="blockchain.schedule_satellite_submissions",
    bind=True,
    base=BlockchainTask
)
def schedule_satellite_submissions(
    self,
    days_back: int = 1
) -> Dict[str, Any]:
    """
    Schedule satellite data submissions for plots with new imagery.
    
    Args:
        days_back: Look back this many days for new data
        
    Returns:
        Scheduling results
    """
    try:
        logger.info("[Blockchain Task] Scheduling satellite submissions")
        
        async def _schedule():
            timescale = await get_timescale_client()
            
            # Find plots with new satellite data
            cutoff = datetime.utcnow() - timedelta(days=days_back)
            
            query = """
                SELECT DISTINCT plot_id
                FROM satellite_data
                WHERE acquisition_date >= $1
                    AND cloud_cover < 0.3
                    AND plot_id NOT IN (
                        SELECT plot_id
                        FROM oracle_submissions
                        WHERE data_type = 'satellite'
                            AND submitted_at >= $1
                    )
            """
            
            plots = await timescale.fetch_all(query, cutoff)
            
            # Schedule submissions
            scheduled = 0
            for row in plots:
                plot_id = row['plot_id']
                
                # Calculate aggregation period (last 7 days)
                period_end = datetime.utcnow()
                period_start = period_end - timedelta(days=7)
                
                # Queue submission task
                submit_satellite_to_blockchain.delay(
                    plot_id=plot_id,
                    period_start=period_start.isoformat(),
                    period_end=period_end.isoformat()
                )
                
                scheduled += 1
            
            return {'scheduled': scheduled, 'plots': [r['plot_id'] for r in plots]}
        
        result = asyncio.run(_schedule())
        
        logger.info(f"Scheduled {result['scheduled']} satellite submissions")
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to schedule submissions: {e}")
        raise


@celery_app.task(
    name="blockchain.check_policies_for_trigger",
    bind=True,
    base=BlockchainTask
)
def check_policies_for_trigger(
    self
) -> Dict[str, Any]:
    """
    Check active policies for damage trigger conditions.
    
    Returns:
        Check results with triggered policies
    """
    try:
        logger.info("[Blockchain Task] Checking policies for trigger")
        
        async def _check():
            timescale = await get_timescale_client()
            
            # Get active policies with sufficient data
            query = """
                SELECT DISTINCT p.policy_id
                FROM policies p
                WHERE p.status = 'active'
                    AND p.end_time > NOW()
                    AND EXISTS (
                        SELECT 1 FROM weather_data w
                        WHERE w.plot_id = p.plot_id
                            AND w.timestamp >= NOW() - INTERVAL '7 days'
                    )
                    AND EXISTS (
                        SELECT 1 FROM satellite_data s
                        WHERE s.plot_id = p.plot_id
                            AND s.acquisition_date >= NOW() - INTERVAL '14 days'
                    )
                    AND NOT EXISTS (
                        SELECT 1 FROM damage_assessments_blockchain d
                        WHERE d.policy_id = p.policy_id
                            AND d.assessed_at >= NOW() - INTERVAL '24 hours'
                    )
            """
            
            policies = await timescale.fetch_all(query)
            
            # Check each policy
            triggered = 0
            for row in policies:
                policy_id = row['policy_id']
                
                # Queue assessment task
                assess_damage_on_chain.delay(policy_id=policy_id)
                triggered += 1
            
            return {'checked': triggered, 'policies': [r['policy_id'] for r in policies]}
        
        result = asyncio.run(_check())
        
        logger.info(f"Checked {result['checked']} policies for trigger")
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to check policies: {e}")
        raise


@celery_app.task(
    name="blockchain.get_oracle_stats",
    bind=True,
    base=BlockchainTask
)
def get_oracle_stats(
    self,
    hours: int = 24
) -> Dict[str, Any]:
    """
    Get oracle submission statistics.
    
    Args:
        hours: Number of hours to look back
        
    Returns:
        Statistics dictionary
    """
    try:
        logger.info(f"[Blockchain Task] Getting oracle stats for last {hours} hours")
        
        stats = asyncio.run(
            self.oracle_processor.get_submission_stats(hours=hours)
        )
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get oracle stats: {e}")
        raise


@celery_app.task(
    name="blockchain.health_check"
)
def blockchain_health_check() -> Dict[str, Any]:
    """
    Health check for blockchain integration.
    
    Returns:
        Health status
    """
    try:
        async def _check():
            oracle = await get_oracle_processor()
            
            # Check Web3 connection
            balance = oracle.web3_client.get_account_balance()
            
            # Check recent submissions
            stats = await oracle.get_submission_stats(hours=1)
            
            return {
                'healthy': True,
                'oracle_balance_eth': balance,
                'recent_submissions': stats.get('total_submissions', 0),
                'timestamp': datetime.utcnow().isoformat()
            }
        
        result = asyncio.run(_check())
        return result
        
    except Exception as e:
        logger.error(f"Blockchain health check failed: {e}")
        return {
            'healthy': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


# Periodic tasks configuration
@celery_app.on_after_configure.connect
def setup_periodic_blockchain_tasks(sender, **kwargs):
    """Configure periodic blockchain tasks"""
    
    # Schedule weather submissions every hour
    sender.add_periodic_task(
        3600.0,  # 1 hour
        schedule_weather_submissions.s(),
        name='schedule-weather-submissions-hourly'
    )
    
    # Schedule satellite submissions every 6 hours
    sender.add_periodic_task(
        21600.0,  # 6 hours
        schedule_satellite_submissions.s(),
        name='schedule-satellite-submissions-6hourly'
    )
    
    # Check policies for trigger every 4 hours
    sender.add_periodic_task(
        14400.0,  # 4 hours
        check_policies_for_trigger.s(),
        name='check-policies-for-trigger-4hourly'
    )
    
    # Monitor transactions every 5 minutes
    sender.add_periodic_task(
        300.0,  # 5 minutes
        monitor_blockchain_transactions.s(),
        name='monitor-transactions-5min'
    )
    
    # Health check every 10 minutes
    sender.add_periodic_task(
        600.0,  # 10 minutes
        blockchain_health_check.s(),
        name='blockchain-health-check-10min'
    )
    
    logger.info("Blockchain periodic tasks configured")
