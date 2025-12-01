"""
MicroCrop Oracle Processor

Production-grade oracle service for submitting data to blockchain:
- Aggregates weather, satellite, and damage data
- Submits data to smart contracts via Web3 client
- Manages submission queue and retry logic
- Monitors transaction confirmations
- Handles errors and rate limiting
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal

from src.integrations.web3_client import get_web3_client, Web3Client
from src.storage.timescale_client import get_timescale_client
from src.storage.redis_cache import get_redis_cache
from src.config.settings import get_settings

logger = logging.getLogger(__name__)


class OracleProcessor:
    """
    Oracle processor for submitting verified data to blockchain.
    
    Responsibilities:
    - Fetch aggregated data from TimescaleDB
    - Format data for smart contract submission
    - Submit weather, satellite, and damage data on-chain
    - Track submission status and handle retries
    - Monitor gas costs and transaction confirmations
    """
    
    def __init__(self):
        """Initialize oracle processor"""
        self.settings = get_settings()
        self.web3_client: Optional[Web3Client] = None
        self.timescale_client = None
        self.redis_cache = None
        
        # Submission tracking
        self.submission_batch_size = 10
        self.submission_interval = 60  # seconds between batches
        self.max_retries = 3
        
        # Rate limiting (to manage gas costs)
        self.max_submissions_per_minute = 10
        
        logger.info("OracleProcessor initialized")
    
    async def initialize(self):
        """Initialize dependencies"""
        try:
            self.web3_client = await get_web3_client()
            self.timescale_client = await get_timescale_client()
            self.redis_cache = await get_redis_cache()
            
            logger.info("OracleProcessor dependencies initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize OracleProcessor: {e}")
            raise
    
    async def submit_weather_data(
        self,
        plot_id: int,
        period_start: datetime,
        period_end: datetime
    ) -> Dict[str, Any]:
        """
        Submit aggregated weather data to blockchain.
        
        Args:
            plot_id: Plot identifier
            period_start: Start of aggregation period
            period_end: End of aggregation period
            
        Returns:
            Submission result with transaction hash
        """
        try:
            logger.info(
                f"Submitting weather data for plot {plot_id}: "
                f"{period_start} to {period_end}"
            )
            
            # Fetch aggregated weather data from database
            weather_data = await self._fetch_weather_data(
                plot_id,
                period_start,
                period_end
            )
            
            if not weather_data:
                logger.warning(f"No weather data found for plot {plot_id}")
                return {
                    'success': False,
                    'error': 'No data available'
                }
            
            # Check if already submitted
            cache_key = f"weather_submitted:{plot_id}:{period_start.timestamp()}"
            if await self.redis_cache.get(cache_key):
                logger.info(f"Weather data already submitted for plot {plot_id}")
                return {
                    'success': True,
                    'cached': True
                }
            
            # Submit to blockchain
            tx_hash, receipt = await self.web3_client.submit_weather_data(
                plot_id=plot_id,
                period_start=int(period_start.timestamp()),
                period_end=int(period_end.timestamp()),
                weather_data=weather_data
            )
            
            # Store submission record
            await self._record_submission(
                data_type='weather',
                plot_id=plot_id,
                period_start=period_start,
                period_end=period_end,
                tx_hash=tx_hash,
                gas_used=receipt['gasUsed'],
                block_number=receipt['blockNumber']
            )
            
            # Cache to prevent duplicate submissions
            await self.redis_cache.set(
                cache_key,
                tx_hash,
                ttl=86400  # 24 hours
            )
            
            logger.info(
                f"Weather data submitted successfully - "
                f"Plot: {plot_id}, TX: {tx_hash}"
            )
            
            return {
                'success': True,
                'tx_hash': tx_hash,
                'gas_used': receipt['gasUsed'],
                'block_number': receipt['blockNumber']
            }
            
        except Exception as e:
            logger.error(f"Failed to submit weather data: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def submit_satellite_data(
        self,
        plot_id: int,
        period_start: datetime,
        period_end: datetime
    ) -> Dict[str, Any]:
        """
        Submit aggregated satellite data to blockchain.
        
        Args:
            plot_id: Plot identifier
            period_start: Start of observation period
            period_end: End of observation period
            
        Returns:
            Submission result with transaction hash
        """
        try:
            logger.info(
                f"Submitting satellite data for plot {plot_id}: "
                f"{period_start} to {period_end}"
            )
            
            # Fetch aggregated satellite data
            satellite_data = await self._fetch_satellite_data(
                plot_id,
                period_start,
                period_end
            )
            
            if not satellite_data:
                logger.warning(f"No satellite data found for plot {plot_id}")
                return {
                    'success': False,
                    'error': 'No data available'
                }
            
            # Check if already submitted
            cache_key = f"satellite_submitted:{plot_id}:{period_start.timestamp()}"
            if await self.redis_cache.get(cache_key):
                logger.info(f"Satellite data already submitted for plot {plot_id}")
                return {
                    'success': True,
                    'cached': True
                }
            
            # Submit to blockchain
            tx_hash, receipt = await self.web3_client.submit_satellite_data(
                plot_id=plot_id,
                period_start=int(period_start.timestamp()),
                period_end=int(period_end.timestamp()),
                satellite_data=satellite_data
            )
            
            # Store submission record
            await self._record_submission(
                data_type='satellite',
                plot_id=plot_id,
                period_start=period_start,
                period_end=period_end,
                tx_hash=tx_hash,
                gas_used=receipt['gasUsed'],
                block_number=receipt['blockNumber']
            )
            
            # Cache to prevent duplicate submissions
            await self.redis_cache.set(
                cache_key,
                tx_hash,
                ttl=86400  # 24 hours
            )
            
            logger.info(
                f"Satellite data submitted successfully - "
                f"Plot: {plot_id}, TX: {tx_hash}"
            )
            
            return {
                'success': True,
                'tx_hash': tx_hash,
                'gas_used': receipt['gasUsed'],
                'block_number': receipt['blockNumber']
            }
            
        except Exception as e:
            logger.error(f"Failed to submit satellite data: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def assess_and_trigger_payout(
        self,
        policy_id: int
    ) -> Dict[str, Any]:
        """
        Assess damage and potentially trigger payout for a policy.
        
        Args:
            policy_id: Policy identifier
            
        Returns:
            Assessment result with damage percentage and payout status
        """
        try:
            logger.info(f"Assessing damage for policy {policy_id}")
            
            # Check if trigger conditions are met (read-only call)
            should_trigger = await self.web3_client.check_trigger_conditions(
                policy_id
            )
            
            if not should_trigger:
                logger.info(f"Policy {policy_id} does not meet trigger conditions")
                return {
                    'success': True,
                    'triggered': False,
                    'reason': 'Trigger conditions not met'
                }
            
            # Assess damage (writes to blockchain)
            tx_hash, damage_percentage, receipt = await self.web3_client.assess_damage(
                policy_id
            )
            
            # Record assessment
            await self._record_damage_assessment(
                policy_id=policy_id,
                damage_percentage=damage_percentage,
                tx_hash=tx_hash,
                gas_used=receipt['gasUsed'],
                block_number=receipt['blockNumber']
            )
            
            logger.info(
                f"Damage assessed for policy {policy_id} - "
                f"Damage: {damage_percentage}%, TX: {tx_hash}"
            )
            
            return {
                'success': True,
                'triggered': True,
                'damage_percentage': damage_percentage,
                'tx_hash': tx_hash,
                'gas_used': receipt['gasUsed'],
                'block_number': receipt['blockNumber']
            }
            
        except Exception as e:
            logger.error(f"Failed to assess damage: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def batch_submit_weather_data(
        self,
        submissions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Submit multiple weather data records in batch.
        
        Args:
            submissions: List of submission requests
            
        Returns:
            Batch submission results
        """
        results = {
            'total': len(submissions),
            'successful': 0,
            'failed': 0,
            'details': []
        }
        
        for submission in submissions:
            try:
                result = await self.submit_weather_data(
                    plot_id=submission['plot_id'],
                    period_start=submission['period_start'],
                    period_end=submission['period_end']
                )
                
                if result['success']:
                    results['successful'] += 1
                else:
                    results['failed'] += 1
                
                results['details'].append({
                    'plot_id': submission['plot_id'],
                    'result': result
                })
                
                # Rate limiting
                await asyncio.sleep(60 / self.max_submissions_per_minute)
                
            except Exception as e:
                logger.error(f"Batch submission failed: {e}")
                results['failed'] += 1
                results['details'].append({
                    'plot_id': submission['plot_id'],
                    'error': str(e)
                })
        
        return results
    
    async def _fetch_weather_data(
        self,
        plot_id: int,
        period_start: datetime,
        period_end: datetime
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch aggregated weather data from database.
        
        Returns:
            Aggregated weather metrics or None
        """
        try:
            query = """
                SELECT 
                    AVG(temperature)::FLOAT as avg_temperature,
                    MIN(temperature)::FLOAT as min_temperature,
                    MAX(temperature)::FLOAT as max_temperature,
                    SUM(precipitation)::FLOAT as total_precipitation,
                    AVG(humidity)::FLOAT as avg_humidity,
                    AVG(wind_speed)::FLOAT as avg_wind_speed,
                    MAX(wind_speed)::FLOAT as max_wind_speed,
                    AVG(drought_index)::FLOAT as drought_index,
                    AVG(flood_index)::FLOAT as flood_index,
                    AVG(heat_stress_index)::FLOAT as heat_stress_index,
                    AVG(data_quality)::FLOAT as data_quality,
                    COUNT(DISTINCT station_id)::INT as station_count
                FROM weather_data
                WHERE plot_id = $1
                    AND timestamp >= $2
                    AND timestamp <= $3
            """
            
            result = await self.timescale_client.fetch_one(
                query,
                plot_id,
                period_start,
                period_end
            )
            
            if result and result['avg_temperature'] is not None:
                return dict(result)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to fetch weather data: {e}")
            return None
    
    async def _fetch_satellite_data(
        self,
        plot_id: int,
        period_start: datetime,
        period_end: datetime
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch aggregated satellite data from database.
        
        Returns:
            Aggregated satellite metrics or None
        """
        try:
            query = """
                SELECT 
                    AVG(ndvi)::FLOAT as ndvi,
                    AVG(evi)::FLOAT as evi,
                    AVG(savi)::FLOAT as savi,
                    AVG(lai)::FLOAT as lai,
                    AVG(cloud_cover)::FLOAT as cloud_cover,
                    AVG(anomaly_score)::FLOAT as anomaly_score,
                    AVG(vegetation_health)::FLOAT as vegetation_health,
                    AVG(stress_level)::FLOAT as stress_level,
                    AVG(change_from_baseline)::FLOAT as change_from_baseline,
                    MAX(resolution)::INT as resolution,
                    COUNT(*)::INT as image_count
                FROM satellite_data
                WHERE plot_id = $1
                    AND acquisition_date >= $2
                    AND acquisition_date <= $3
                    AND cloud_cover < 0.3
            """
            
            result = await self.timescale_client.fetch_one(
                query,
                plot_id,
                period_start,
                period_end
            )
            
            if result and result['ndvi'] is not None:
                return dict(result)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to fetch satellite data: {e}")
            return None
    
    async def _record_submission(
        self,
        data_type: str,
        plot_id: int,
        period_start: datetime,
        period_end: datetime,
        tx_hash: str,
        gas_used: int,
        block_number: int
    ):
        """Record blockchain submission in database"""
        try:
            query = """
                INSERT INTO oracle_submissions (
                    data_type, plot_id, period_start, period_end,
                    tx_hash, gas_used, block_number, submitted_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            """
            
            await self.timescale_client.execute(
                query,
                data_type,
                plot_id,
                period_start,
                period_end,
                tx_hash,
                gas_used,
                block_number
            )
            
        except Exception as e:
            logger.error(f"Failed to record submission: {e}")
    
    async def _record_damage_assessment(
        self,
        policy_id: int,
        damage_percentage: int,
        tx_hash: str,
        gas_used: int,
        block_number: int
    ):
        """Record damage assessment in database"""
        try:
            query = """
                INSERT INTO damage_assessments_blockchain (
                    policy_id, damage_percentage, tx_hash,
                    gas_used, block_number, assessed_at
                ) VALUES ($1, $2, $3, $4, $5, NOW())
            """
            
            await self.timescale_client.execute(
                query,
                policy_id,
                damage_percentage,
                tx_hash,
                gas_used,
                block_number
            )
            
        except Exception as e:
            logger.error(f"Failed to record damage assessment: {e}")
    
    async def get_submission_stats(
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
            cutoff = datetime.utcnow() - timedelta(hours=hours)
            
            query = """
                SELECT 
                    data_type,
                    COUNT(*) as submission_count,
                    SUM(gas_used)::BIGINT as total_gas,
                    AVG(gas_used)::INT as avg_gas,
                    COUNT(DISTINCT plot_id) as unique_plots
                FROM oracle_submissions
                WHERE submitted_at >= $1
                GROUP BY data_type
            """
            
            results = await self.timescale_client.fetch_all(query, cutoff)
            
            stats = {
                'period_hours': hours,
                'by_type': {},
                'total_submissions': 0,
                'total_gas': 0
            }
            
            for row in results:
                stats['by_type'][row['data_type']] = dict(row)
                stats['total_submissions'] += row['submission_count']
                stats['total_gas'] += row['total_gas']
            
            # Get account balance
            balance = self.web3_client.get_account_balance()
            stats['oracle_balance_eth'] = balance
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get submission stats: {e}")
            return {}
    
    async def monitor_pending_transactions(self) -> List[Dict[str, Any]]:
        """
        Monitor status of pending transactions.
        
        Returns:
            List of pending transaction statuses
        """
        try:
            # Get recent unconfirmed submissions
            query = """
                SELECT tx_hash, data_type, plot_id, submitted_at
                FROM oracle_submissions
                WHERE submitted_at >= NOW() - INTERVAL '1 hour'
                    AND confirmed_at IS NULL
                ORDER BY submitted_at DESC
            """
            
            pending = await self.timescale_client.fetch_all(query)
            
            statuses = []
            for record in pending:
                status = await self.web3_client.get_transaction_status(
                    record['tx_hash']
                )
                
                statuses.append({
                    'tx_hash': record['tx_hash'],
                    'data_type': record['data_type'],
                    'plot_id': record['plot_id'],
                    'submitted_at': record['submitted_at'],
                    'status': status
                })
                
                # Update if confirmed
                if status['status'] in ['success', 'failed']:
                    await self._update_confirmation(
                        record['tx_hash'],
                        status['status']
                    )
            
            return statuses
            
        except Exception as e:
            logger.error(f"Failed to monitor transactions: {e}")
            return []
    
    async def _update_confirmation(self, tx_hash: str, status: str):
        """Update transaction confirmation status"""
        try:
            query = """
                UPDATE oracle_submissions
                SET confirmed_at = NOW(),
                    confirmation_status = $2
                WHERE tx_hash = $1
            """
            
            await self.timescale_client.execute(query, tx_hash, status)
            
        except Exception as e:
            logger.error(f"Failed to update confirmation: {e}")
    
    async def close(self):
        """Clean up resources"""
        logger.info("OracleProcessor closing")


# Singleton instance
_oracle_processor: Optional[OracleProcessor] = None


async def get_oracle_processor() -> OracleProcessor:
    """
    Get singleton OracleProcessor instance.
    
    Returns:
        Initialized OracleProcessor
    """
    global _oracle_processor
    
    if _oracle_processor is None:
        _oracle_processor = OracleProcessor()
        await _oracle_processor.initialize()
    
    return _oracle_processor
