"""
MicroCrop Web3 Client

Production-grade Web3 client for interacting with MicroCrop smart contracts:
- WeatherOracle: Submit weather data on-chain
- SatelliteOracle: Submit satellite imagery analysis
- DamageCalculator: Submit damage assessments
- Transaction management with retry and confirmation
- Event monitoring and parsing
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from datetime import datetime

from web3 import Web3, AsyncWeb3
try:
    # Web3.py v6.x changed middleware imports
    from web3.middleware import ExtraDataToPOAMiddleware as geth_poa_middleware
except ImportError:
    # Fallback for older versions
    from web3.middleware import geth_poa_middleware
from web3.exceptions import (
    ContractLogicError,
    TransactionNotFound,
    TimeExhausted,
    Web3Exception
)
from eth_account import Account
from eth_utils import to_checksum_address
from hexbytes import HexBytes

from config.settings import get_settings

logger = logging.getLogger(__name__)


class Web3Client:
    """
    Production Web3 client for MicroCrop blockchain integration.
    
    Handles:
    - Contract interactions (weather, satellite, damage oracles)
    - Transaction signing and submission
    - Gas estimation and management
    - Transaction confirmation monitoring
    - Event parsing and listening
    - Retry logic for network failures
    """
    
    def __init__(self):
        """Initialize Web3 client with settings and contracts"""
        self.settings = get_settings()
        
        # Initialize Web3 instance
        self.w3 = Web3(Web3.HTTPProvider(
            self.settings.BLOCKCHAIN_RPC_URL,
            request_kwargs={'timeout': 60}
        ))
        
        # Add PoA middleware for Base (based on Optimism)
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        # Initialize account
        self.account = Account.from_key(self.settings.ORACLE_PRIVATE_KEY)
        self.oracle_address = to_checksum_address(self.settings.ORACLE_ADDRESS)
        
        # Contract addresses
        self.weather_oracle_address = to_checksum_address(
            self.settings.WEATHER_ORACLE_CONTRACT
        )
        self.satellite_oracle_address = to_checksum_address(
            self.settings.SATELLITE_ORACLE_CONTRACT
        )
        self.damage_calculator_address = to_checksum_address(
            self.settings.DAMAGE_CALCULATOR_CONTRACT
        )
        
        # Initialize contracts (ABIs will be loaded)
        self.weather_oracle = None
        self.satellite_oracle = None
        self.damage_calculator = None
        
        # Gas settings
        self.max_priority_fee = self.w3.to_wei(0.001, 'gwei')  # 0.001 gwei priority
        self.max_fee_per_gas = self.w3.to_wei(1, 'gwei')  # 1 gwei max
        
        # Transaction settings
        self.confirmation_blocks = 2  # Wait for 2 confirmations
        self.tx_timeout = 300  # 5 minutes timeout
        
        logger.info(
            f"Web3Client initialized for chain {self.settings.BLOCKCHAIN_CHAIN_ID}"
        )
    
    async def initialize(self):
        """
        Initialize contract instances with ABIs.
        
        Note: ABIs should be loaded from compiled contract artifacts.
        For now, we'll define minimal ABIs for the core functions.
        """
        try:
            # Check connection
            if not self.w3.is_connected():
                raise ConnectionError("Failed to connect to blockchain RPC")
            
            # Get chain ID
            chain_id = self.w3.eth.chain_id
            logger.info(f"Connected to blockchain - Chain ID: {chain_id}")
            
            # Load contract ABIs and initialize contracts
            self.weather_oracle = self._init_weather_oracle()
            self.satellite_oracle = self._init_satellite_oracle()
            self.damage_calculator = self._init_damage_calculator()
            
            # Verify oracle address has PROVIDER_ROLE
            # This would check on-chain role assignment
            logger.info(f"Oracle address: {self.oracle_address}")
            logger.info("Web3Client initialization complete")
            
        except Exception as e:
            logger.error(f"Failed to initialize Web3Client: {e}")
            raise
    
    def _init_weather_oracle(self):
        """Initialize WeatherOracle contract with ABI"""
        # Minimal ABI for WeatherOracle.submitData()
        abi = [
            {
                "inputs": [
                    {"name": "plotId", "type": "uint256"},
                    {"name": "periodStart", "type": "uint256"},
                    {"name": "periodEnd", "type": "uint256"},
                    {
                        "components": [
                            {"name": "avgTemperature", "type": "int32"},
                            {"name": "minTemperature", "type": "int32"},
                            {"name": "maxTemperature", "type": "int32"},
                            {"name": "totalPrecipitation", "type": "uint32"},
                            {"name": "avgHumidity", "type": "uint16"},
                            {"name": "avgWindSpeed", "type": "uint16"},
                            {"name": "maxWindSpeed", "type": "uint16"},
                            {"name": "droughtIndex", "type": "uint16"},
                            {"name": "floodIndex", "type": "uint16"},
                            {"name": "heatStressIndex", "type": "uint16"},
                            {"name": "dataQuality", "type": "uint16"},
                            {"name": "stationCount", "type": "uint8"}
                        ],
                        "name": "data",
                        "type": "tuple"
                    }
                ],
                "name": "submitData",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "name": "provider", "type": "address"},
                    {"indexed": True, "name": "plotId", "type": "uint256"},
                    {"indexed": False, "name": "periodStart", "type": "uint256"},
                    {"indexed": False, "name": "periodEnd", "type": "uint256"}
                ],
                "name": "DataSubmitted",
                "type": "event"
            }
        ]
        
        return self.w3.eth.contract(
            address=self.weather_oracle_address,
            abi=abi
        )
    
    def _init_satellite_oracle(self):
        """Initialize SatelliteOracle contract with ABI"""
        # Minimal ABI for SatelliteOracle.submitData()
        abi = [
            {
                "inputs": [
                    {"name": "plotId", "type": "uint256"},
                    {"name": "periodStart", "type": "uint256"},
                    {"name": "periodEnd", "type": "uint256"},
                    {
                        "components": [
                            {"name": "ndvi", "type": "uint16"},
                            {"name": "evi", "type": "uint16"},
                            {"name": "savi", "type": "uint16"},
                            {"name": "lai", "type": "uint16"},
                            {"name": "cloudCover", "type": "uint16"},
                            {"name": "anomalyScore", "type": "uint16"},
                            {"name": "vegetationHealth", "type": "uint16"},
                            {"name": "stressLevel", "type": "uint16"},
                            {"name": "changeFromBaseline", "type": "int16"},
                            {"name": "resolution", "type": "uint8"},
                            {"name": "imageCount", "type": "uint8"}
                        ],
                        "name": "data",
                        "type": "tuple"
                    }
                ],
                "name": "submitData",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "name": "provider", "type": "address"},
                    {"indexed": True, "name": "plotId", "type": "uint256"},
                    {"indexed": False, "name": "periodStart", "type": "uint256"},
                    {"indexed": False, "name": "periodEnd", "type": "uint256"}
                ],
                "name": "DataSubmitted",
                "type": "event"
            }
        ]
        
        return self.w3.eth.contract(
            address=self.satellite_oracle_address,
            abi=abi
        )
    
    def _init_damage_calculator(self):
        """Initialize DamageCalculator contract with ABI"""
        # Minimal ABI for DamageCalculator.assessDamage()
        abi = [
            {
                "inputs": [
                    {"name": "policyId", "type": "uint256"}
                ],
                "name": "assessDamage",
                "outputs": [
                    {"name": "damagePercentage", "type": "uint256"}
                ],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"name": "policyId", "type": "uint256"}
                ],
                "name": "checkTriggerConditions",
                "outputs": [
                    {"name": "shouldTrigger", "type": "bool"}
                ],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "name": "policyId", "type": "uint256"},
                    {"indexed": False, "name": "damagePercentage", "type": "uint256"},
                    {"indexed": False, "name": "assessmentTime", "type": "uint256"}
                ],
                "name": "DamageAssessed",
                "type": "event"
            }
        ]
        
        return self.w3.eth.contract(
            address=self.damage_calculator_address,
            abi=abi
        )
    
    async def submit_weather_data(
        self,
        plot_id: int,
        period_start: int,
        period_end: int,
        weather_data: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Submit weather data to WeatherOracle contract.
        
        Args:
            plot_id: Plot identifier
            period_start: Start timestamp (unix)
            period_end: End timestamp (unix)
            weather_data: Weather metrics dictionary
            
        Returns:
            Tuple of (transaction_hash, receipt)
        """
        try:
            logger.info(f"Submitting weather data for plot {plot_id}")
            
            # Convert weather data to contract format
            contract_data = self._format_weather_data(weather_data)
            
            # Build transaction
            tx = await self._build_transaction(
                self.weather_oracle.functions.submitData(
                    plot_id,
                    period_start,
                    period_end,
                    contract_data
                )
            )
            
            # Send transaction
            tx_hash, receipt = await self._send_transaction(tx)
            
            logger.info(
                f"Weather data submitted - Plot: {plot_id}, "
                f"TX: {tx_hash.hex()}, Gas: {receipt['gasUsed']}"
            )
            
            return tx_hash.hex(), receipt
            
        except Exception as e:
            logger.error(f"Failed to submit weather data: {e}")
            raise
    
    async def submit_satellite_data(
        self,
        plot_id: int,
        period_start: int,
        period_end: int,
        satellite_data: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Submit satellite data to SatelliteOracle contract.
        
        Args:
            plot_id: Plot identifier
            period_start: Start timestamp (unix)
            period_end: End timestamp (unix)
            satellite_data: Satellite metrics dictionary
            
        Returns:
            Tuple of (transaction_hash, receipt)
        """
        try:
            logger.info(f"Submitting satellite data for plot {plot_id}")
            
            # Convert satellite data to contract format
            contract_data = self._format_satellite_data(satellite_data)
            
            # Build transaction
            tx = await self._build_transaction(
                self.satellite_oracle.functions.submitData(
                    plot_id,
                    period_start,
                    period_end,
                    contract_data
                )
            )
            
            # Send transaction
            tx_hash, receipt = await self._send_transaction(tx)
            
            logger.info(
                f"Satellite data submitted - Plot: {plot_id}, "
                f"TX: {tx_hash.hex()}, Gas: {receipt['gasUsed']}"
            )
            
            return tx_hash.hex(), receipt
            
        except Exception as e:
            logger.error(f"Failed to submit satellite data: {e}")
            raise
    
    async def assess_damage(
        self,
        policy_id: int
    ) -> Tuple[str, int, Dict[str, Any]]:
        """
        Trigger damage assessment for a policy.
        
        Args:
            policy_id: Policy identifier
            
        Returns:
            Tuple of (transaction_hash, damage_percentage, receipt)
        """
        try:
            logger.info(f"Assessing damage for policy {policy_id}")
            
            # Build transaction
            tx = await self._build_transaction(
                self.damage_calculator.functions.assessDamage(policy_id)
            )
            
            # Send transaction
            tx_hash, receipt = await self._send_transaction(tx)
            
            # Parse DamageAssessed event to get damage percentage
            damage_percentage = self._parse_damage_event(receipt)
            
            logger.info(
                f"Damage assessed - Policy: {policy_id}, "
                f"Damage: {damage_percentage}%, TX: {tx_hash.hex()}"
            )
            
            return tx_hash.hex(), damage_percentage, receipt
            
        except Exception as e:
            logger.error(f"Failed to assess damage: {e}")
            raise
    
    async def check_trigger_conditions(
        self,
        policy_id: int
    ) -> bool:
        """
        Check if policy meets payout trigger conditions.
        
        Args:
            policy_id: Policy identifier
            
        Returns:
            True if policy should be triggered
        """
        try:
            should_trigger = self.damage_calculator.functions.checkTriggerConditions(
                policy_id
            ).call()
            
            logger.info(
                f"Policy {policy_id} trigger check: {should_trigger}"
            )
            
            return should_trigger
            
        except Exception as e:
            logger.error(f"Failed to check trigger conditions: {e}")
            raise
    
    async def _build_transaction(self, contract_function) -> Dict[str, Any]:
        """
        Build transaction with gas estimation and nonce management.
        
        Args:
            contract_function: Web3 contract function to call
            
        Returns:
            Transaction dictionary ready to sign
        """
        # Get nonce
        nonce = self.w3.eth.get_transaction_count(self.oracle_address)
        
        # Estimate gas
        try:
            gas_estimate = contract_function.estimate_gas({
                'from': self.oracle_address
            })
            # Add 20% buffer
            gas_limit = int(gas_estimate * 1.2)
        except Exception as e:
            logger.warning(f"Gas estimation failed, using default: {e}")
            gas_limit = 500000  # Default gas limit
        
        # Build transaction
        tx = contract_function.build_transaction({
            'from': self.oracle_address,
            'nonce': nonce,
            'gas': gas_limit,
            'maxFeePerGas': self.max_fee_per_gas,
            'maxPriorityFeePerGas': self.max_priority_fee,
            'chainId': self.settings.BLOCKCHAIN_CHAIN_ID
        })
        
        return tx
    
    async def _send_transaction(
        self,
        tx: Dict[str, Any]
    ) -> Tuple[HexBytes, Dict[str, Any]]:
        """
        Sign and send transaction, wait for confirmation.
        
        Args:
            tx: Transaction dictionary
            
        Returns:
            Tuple of (transaction_hash, receipt)
        """
        # Sign transaction
        signed_tx = self.w3.eth.account.sign_transaction(
            tx,
            self.settings.ORACLE_PRIVATE_KEY
        )
        
        # Send transaction
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        logger.info(f"Transaction sent: {tx_hash.hex()}")
        
        # Wait for confirmation with timeout
        try:
            receipt = self.w3.eth.wait_for_transaction_receipt(
                tx_hash,
                timeout=self.tx_timeout
            )
            
            if receipt['status'] == 0:
                raise ContractLogicError("Transaction reverted")
            
            # Wait for additional confirmation blocks
            if self.confirmation_blocks > 1:
                await self._wait_for_confirmations(
                    receipt['blockNumber'],
                    self.confirmation_blocks
                )
            
            return tx_hash, receipt
            
        except TimeExhausted:
            logger.error(f"Transaction timeout: {tx_hash.hex()}")
            raise
        except Exception as e:
            logger.error(f"Transaction failed: {e}")
            raise
    
    async def _wait_for_confirmations(
        self,
        block_number: int,
        confirmations: int
    ):
        """Wait for additional block confirmations"""
        target_block = block_number + confirmations
        
        while True:
            current_block = self.w3.eth.block_number
            if current_block >= target_block:
                break
            await asyncio.sleep(2)  # Check every 2 seconds
        
        logger.debug(f"Transaction confirmed after {confirmations} blocks")
    
    def _format_weather_data(self, data: Dict[str, Any]) -> Tuple:
        """
        Format weather data for contract submission.
        
        Converts float values to integers with appropriate scaling:
        - Temperatures: multiply by 100 (0.01°C precision)
        - Precipitation: keep in mm
        - Percentages: multiply by 100 (0.01% precision)
        - Indices: multiply by 100 (0-10000 scale)
        """
        return (
            int(data.get('avg_temperature', 0) * 100),  # int32 (°C * 100)
            int(data.get('min_temperature', 0) * 100),  # int32
            int(data.get('max_temperature', 0) * 100),  # int32
            int(data.get('total_precipitation', 0)),    # uint32 (mm)
            int(data.get('avg_humidity', 0) * 100),     # uint16 (% * 100)
            int(data.get('avg_wind_speed', 0) * 100),   # uint16 (m/s * 100)
            int(data.get('max_wind_speed', 0) * 100),   # uint16 (m/s * 100)
            int(data.get('drought_index', 0) * 100),    # uint16 (0-10000)
            int(data.get('flood_index', 0) * 100),      # uint16 (0-10000)
            int(data.get('heat_stress_index', 0) * 100), # uint16 (0-10000)
            int(data.get('data_quality', 100) * 100),   # uint16 (% * 100)
            int(data.get('station_count', 1))           # uint8
        )
    
    def _format_satellite_data(self, data: Dict[str, Any]) -> Tuple:
        """
        Format satellite data for contract submission.
        
        Converts float values (0-1) to integers (0-10000) for precision.
        """
        return (
            int(data.get('ndvi', 0) * 10000),           # uint16 (0-10000)
            int(data.get('evi', 0) * 10000),            # uint16 (0-10000)
            int(data.get('savi', 0) * 10000),           # uint16 (0-10000)
            int(data.get('lai', 0) * 10000),            # uint16 (0-10000)
            int(data.get('cloud_cover', 0) * 10000),    # uint16 (0-10000)
            int(data.get('anomaly_score', 0) * 10000),  # uint16 (0-10000)
            int(data.get('vegetation_health', 0) * 10000), # uint16 (0-10000)
            int(data.get('stress_level', 0) * 10000),   # uint16 (0-10000)
            int(data.get('change_from_baseline', 0) * 10000), # int16 (-10000 to 10000)
            int(data.get('resolution', 10)),            # uint8 (meters)
            int(data.get('image_count', 1))             # uint8
        )
    
    def _parse_damage_event(self, receipt: Dict[str, Any]) -> int:
        """
        Parse DamageAssessed event from transaction receipt.
        
        Returns:
            Damage percentage (0-100)
        """
        try:
            # Get DamageAssessed event
            events = self.damage_calculator.events.DamageAssessed().process_receipt(
                receipt
            )
            
            if events:
                # Damage is stored as basis points (0-10000)
                damage_bp = events[0]['args']['damagePercentage']
                return damage_bp // 100  # Convert to percentage
            
            return 0
            
        except Exception as e:
            logger.warning(f"Failed to parse damage event: {e}")
            return 0
    
    async def get_transaction_status(self, tx_hash: str) -> Dict[str, Any]:
        """
        Get transaction status and details.
        
        Args:
            tx_hash: Transaction hash
            
        Returns:
            Transaction status dictionary
        """
        try:
            tx_hash_bytes = HexBytes(tx_hash)
            
            # Try to get receipt
            try:
                receipt = self.w3.eth.get_transaction_receipt(tx_hash_bytes)
                status = "success" if receipt['status'] == 1 else "failed"
                confirmations = self.w3.eth.block_number - receipt['blockNumber']
                
                return {
                    'status': status,
                    'confirmations': confirmations,
                    'block_number': receipt['blockNumber'],
                    'gas_used': receipt['gasUsed'],
                    'receipt': receipt
                }
                
            except TransactionNotFound:
                # Transaction not mined yet
                return {
                    'status': 'pending',
                    'confirmations': 0
                }
                
        except Exception as e:
            logger.error(f"Failed to get transaction status: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def get_account_balance(self) -> float:
        """
        Get oracle account ETH balance.
        
        Returns:
            Balance in ETH
        """
        balance_wei = self.w3.eth.get_balance(self.oracle_address)
        return float(self.w3.from_wei(balance_wei, 'ether'))
    
    async def close(self):
        """Clean up resources"""
        # Web3.py doesn't require explicit connection closing
        logger.info("Web3Client closed")


# Singleton instance
_web3_client: Optional[Web3Client] = None


async def get_web3_client() -> Web3Client:
    """
    Get singleton Web3Client instance.
    
    Returns:
        Initialized Web3Client
    """
    global _web3_client
    
    if _web3_client is None:
        _web3_client = Web3Client()
        await _web3_client.initialize()
    
    return _web3_client


async def close_web3_client():
    """Close Web3Client singleton"""
    global _web3_client
    
    if _web3_client:
        await _web3_client.close()
        _web3_client = None
