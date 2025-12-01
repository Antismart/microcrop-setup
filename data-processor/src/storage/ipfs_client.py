"""
IPFS client for decentralized proof storage via Pinata.

Handles:
- Uploading damage proofs to IPFS
- Pinning to Pinata
- CID generation and verification
- Gateway URL generation
"""

import asyncio
import logging
from typing import Optional, Dict, Any
import json
import httpx

from src.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class IPFSClient:
    """Client for IPFS operations via Pinata."""
    
    def __init__(self):
        """Initialize IPFS client."""
        self.settings = settings
        self.logger = logger
        
        # Pinata configuration
        self.pinata_api_key = settings.PINATA_API_KEY
        self.pinata_secret = settings.PINATA_SECRET_KEY
        self.pinata_jwt = settings.PINATA_JWT
        self.pinata_api_url = "https://api.pinata.cloud"
        self.pinata_gateway = settings.PINATA_GATEWAY
        
        # HTTP client
        self.client: Optional[httpx.AsyncClient] = None
        
        self.logger.info("IPFSClient initialized")
    
    async def connect(self) -> None:
        """Initialize HTTP client."""
        try:
            self.logger.info("Initializing IPFS client")
            
            # Use JWT token if available, otherwise use API key/secret
            if self.pinata_jwt:
                headers = {
                    "Authorization": f"Bearer {self.pinata_jwt}",
                }
                self.logger.info("Using Pinata JWT authentication")
            else:
                headers = {
                    "pinata_api_key": self.pinata_api_key,
                    "pinata_secret_api_key": self.pinata_secret,
                }
                self.logger.info("Using Pinata API key authentication")
            
            self.client = httpx.AsyncClient(
                headers=headers,
                timeout=30.0,
            )
            
            # Test authentication
            response = await self.client.get(f"{self.pinata_api_url}/data/testAuthentication")
            response.raise_for_status()
            
            self.logger.info("IPFS client connected successfully to Pinata")
            
        except Exception as e:
            self.logger.error(f"Error connecting IPFS client: {e}", exc_info=True)
            raise
    
    async def disconnect(self) -> None:
        """Close HTTP client."""
        if self.client:
            await self.client.aclose()
            self.logger.info("IPFS client disconnected")
    
    async def upload_damage_proof(
        self,
        assessment_id: str,
        proof_data: Dict[str, Any],
        metadata: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Upload damage assessment proof to IPFS.
        
        Args:
            assessment_id: Assessment identifier
            proof_data: Damage proof data (will be JSON serialized)
            metadata: Optional metadata for Pinata
            
        Returns:
            IPFS CID (Content Identifier)
        """
        try:
            self.logger.info(
                f"Uploading damage proof to IPFS",
                extra={"assessment_id": assessment_id}
            )
            
            # Prepare JSON content
            json_content = json.dumps(proof_data, indent=2)
            
            # Prepare metadata
            pinata_metadata = {
                "name": f"damage_proof_{assessment_id}.json",
                "keyvalues": {
                    "assessment_id": assessment_id,
                    "type": "damage_proof",
                    **(metadata or {}),
                }
            }
            
            # Prepare multipart form data
            files = {
                "file": (f"damage_proof_{assessment_id}.json", json_content, "application/json"),
                "pinataMetadata": (None, json.dumps(pinata_metadata)),
            }
            
            # Upload to Pinata
            response = await self.client.post(
                f"{self.pinata_api_url}/pinning/pinFileToIPFS",
                files=files,
            )
            response.raise_for_status()
            
            result = response.json()
            cid = result["IpfsHash"]
            
            self.logger.info(
                f"Damage proof uploaded to IPFS",
                extra={
                    "assessment_id": assessment_id,
                    "cid": cid,
                    "size": result.get("PinSize"),
                }
            )
            
            return cid
            
        except Exception as e:
            self.logger.error(
                f"Error uploading damage proof to IPFS: {e}",
                extra={"assessment_id": assessment_id},
                exc_info=True
            )
            raise
    
    async def upload_json(
        self,
        data: Dict[str, Any],
        name: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Upload JSON data to IPFS.
        
        Args:
            data: JSON data dictionary
            name: File name
            metadata: Optional metadata
            
        Returns:
            IPFS CID
        """
        try:
            self.logger.info(f"Uploading JSON to IPFS: {name}")
            
            # Prepare JSON content
            json_content = json.dumps(data, indent=2)
            
            # Prepare metadata
            pinata_metadata = {
                "name": name,
                "keyvalues": metadata or {},
            }
            
            # Upload
            files = {
                "file": (name, json_content, "application/json"),
                "pinataMetadata": (None, json.dumps(pinata_metadata)),
            }
            
            response = await self.client.post(
                f"{self.pinata_api_url}/pinning/pinFileToIPFS",
                files=files,
            )
            response.raise_for_status()
            
            result = response.json()
            cid = result["IpfsHash"]
            
            self.logger.info(f"JSON uploaded to IPFS: {name}, CID: {cid}")
            
            return cid
            
        except Exception as e:
            self.logger.error(f"Error uploading JSON to IPFS: {e}", exc_info=True)
            raise
    
    async def get_content(self, cid: str) -> Dict[str, Any]:
        """
        Retrieve content from IPFS by CID.
        
        Args:
            cid: IPFS Content Identifier
            
        Returns:
            Content as dictionary
        """
        try:
            self.logger.info(f"Retrieving content from IPFS: {cid}")
            
            # Use custom Pinata gateway
            url = f"https://{self.pinata_gateway}/ipfs/{cid}"
            
            response = await self.client.get(url)
            response.raise_for_status()
            
            content = response.json()
            
            return content
            
        except Exception as e:
            self.logger.error(f"Error retrieving content from IPFS: {e}", exc_info=True)
            raise
    
    def get_gateway_url(self, cid: str) -> str:
        """
        Generate IPFS gateway URL for a CID using custom Pinata gateway.
        
        Args:
            cid: IPFS Content Identifier
            
        Returns:
            Gateway URL
        """
        return f"https://{self.pinata_gateway}/ipfs/{cid}"
    
    async def pin_hash(self, cid: str, name: Optional[str] = None) -> bool:
        """
        Pin an existing IPFS hash.
        
        Args:
            cid: IPFS Content Identifier
            name: Optional name for the pin
            
        Returns:
            True if successful
        """
        try:
            self.logger.info(f"Pinning hash to Pinata: {cid}")
            
            payload = {
                "hashToPin": cid,
                "pinataMetadata": {
                    "name": name or cid,
                }
            }
            
            response = await self.client.post(
                f"{self.pinata_api_url}/pinning/pinByHash",
                json=payload,
            )
            response.raise_for_status()
            
            self.logger.info(f"Hash pinned successfully: {cid}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error pinning hash: {e}", exc_info=True)
            return False
    
    async def unpin_hash(self, cid: str) -> bool:
        """
        Unpin a hash from Pinata.
        
        Args:
            cid: IPFS Content Identifier
            
        Returns:
            True if successful
        """
        try:
            self.logger.info(f"Unpinning hash from Pinata: {cid}")
            
            response = await self.client.delete(
                f"{self.pinata_api_url}/pinning/unpin/{cid}"
            )
            response.raise_for_status()
            
            self.logger.info(f"Hash unpinned successfully: {cid}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error unpinning hash: {e}", exc_info=True)
            return False
    
    async def get_pin_list(
        self,
        status: str = "pinned",
        limit: int = 10,
    ) -> list:
        """
        Get list of pinned items.
        
        Args:
            status: Pin status (pinned, unpinned, all)
            limit: Maximum number of results
            
        Returns:
            List of pinned items
        """
        try:
            params = {
                "status": status,
                "pageLimit": limit,
            }
            
            response = await self.client.get(
                f"{self.pinata_api_url}/data/pinList",
                params=params,
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get("rows", [])
            
        except Exception as e:
            self.logger.error(f"Error getting pin list: {e}", exc_info=True)
            return []
    
    async def verify_cid(self, cid: str) -> bool:
        """
        Verify that a CID exists and is accessible.
        
        Args:
            cid: IPFS Content Identifier
            
        Returns:
            True if CID is accessible
        """
        try:
            url = f"{self.pinata_gateway_url}/ipfs/{cid}"
            
            response = await self.client.head(url)
            
            return response.status_code == 200
            
        except Exception as e:
            self.logger.error(f"Error verifying CID: {e}", exc_info=True)
            return False
    
    async def get_pin_info(self, cid: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a pinned item.
        
        Args:
            cid: IPFS Content Identifier
            
        Returns:
            Pin information or None
        """
        try:
            params = {
                "hashContains": cid,
                "status": "pinned",
            }
            
            response = await self.client.get(
                f"{self.pinata_api_url}/data/pinList",
                params=params,
            )
            response.raise_for_status()
            
            result = response.json()
            rows = result.get("rows", [])
            
            if rows:
                return rows[0]
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting pin info: {e}", exc_info=True)
            return None
