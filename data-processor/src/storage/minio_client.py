"""
MinIO client for object storage.

Handles storage of:
- Raw satellite images
- Processed satellite images
- NDVI rasters
- Damage proof documents
"""

import asyncio
import logging
from typing import Optional, Dict, Any, BinaryIO
from datetime import timedelta
import io
from minio import Minio
from minio.error import S3Error

from config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class MinIOClient:
    """Client for MinIO object storage operations."""
    
    def __init__(self):
        """Initialize MinIO client."""
        self.settings = settings
        self.logger = logger
        
        # MinIO configuration
        self.endpoint = settings.MINIO_ENDPOINT
        self.access_key = settings.MINIO_ACCESS_KEY
        self.secret_key = settings.MINIO_SECRET_KEY
        self.secure = settings.MINIO_SECURE
        
        # Bucket names
        self.raw_images_bucket = settings.MINIO_BUCKET_RAW_IMAGES
        self.processed_images_bucket = settings.MINIO_BUCKET_PROCESSED_IMAGES
        self.ndvi_bucket = settings.MINIO_BUCKET_NDVI
        self.proofs_bucket = settings.MINIO_BUCKET_PROOFS
        
        self.client: Optional[Minio] = None
        
        self.logger.info("MinIOClient initialized")
    
    def connect(self) -> None:
        """Initialize MinIO client and create buckets."""
        try:
            self.logger.info(f"Connecting to MinIO at {self.endpoint}")
            
            self.client = Minio(
                self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.secure,
            )
            
            # Create buckets if they don't exist
            self._create_buckets()
            
            self.logger.info("Connected to MinIO successfully")
            
        except Exception as e:
            self.logger.error(f"Error connecting to MinIO: {e}", exc_info=True)
            raise
    
    def _create_buckets(self) -> None:
        """Create storage buckets if they don't exist."""
        buckets = [
            self.raw_images_bucket,
            self.processed_images_bucket,
            self.ndvi_bucket,
            self.proofs_bucket,
        ]
        
        for bucket_name in buckets:
            try:
                if not self.client.bucket_exists(bucket_name):
                    self.client.make_bucket(bucket_name)
                    self.logger.info(f"Created bucket: {bucket_name}")
                else:
                    self.logger.debug(f"Bucket already exists: {bucket_name}")
            except S3Error as e:
                self.logger.error(f"Error creating bucket {bucket_name}: {e}", exc_info=True)
                raise
    
    async def upload_raw_image(
        self,
        image_id: str,
        image_data: bytes,
        metadata: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Upload raw satellite image.
        
        Args:
            image_id: Unique image identifier
            image_data: Raw image bytes
            metadata: Optional metadata dictionary
            
        Returns:
            Object URL
        """
        try:
            object_name = f"raw/{image_id}.tif"
            
            self.logger.info(
                f"Uploading raw image to MinIO",
                extra={"image_id": image_id, "size": len(image_data)}
            )
            
            # Upload to MinIO
            data_stream = io.BytesIO(image_data)
            self.client.put_object(
                self.raw_images_bucket,
                object_name,
                data_stream,
                length=len(image_data),
                content_type="image/tiff",
                metadata=metadata or {},
            )
            
            # Generate URL
            url = f"minio://{self.raw_images_bucket}/{object_name}"
            
            self.logger.info(
                f"Raw image uploaded successfully",
                extra={"image_id": image_id, "url": url}
            )
            
            return url
            
        except S3Error as e:
            self.logger.error(f"Error uploading raw image: {e}", exc_info=True)
            raise
    
    async def upload_processed_image(
        self,
        image_id: str,
        image_data: bytes,
        metadata: Optional[Dict[str, str]] = None,
    ) -> str:
        """Upload processed satellite image."""
        try:
            object_name = f"processed/{image_id}.tif"
            
            data_stream = io.BytesIO(image_data)
            self.client.put_object(
                self.processed_images_bucket,
                object_name,
                data_stream,
                length=len(image_data),
                content_type="image/tiff",
                metadata=metadata or {},
            )
            
            url = f"minio://{self.processed_images_bucket}/{object_name}"
            
            self.logger.info(
                f"Processed image uploaded",
                extra={"image_id": image_id, "url": url}
            )
            
            return url
            
        except S3Error as e:
            self.logger.error(f"Error uploading processed image: {e}", exc_info=True)
            raise
    
    async def upload_ndvi_raster(
        self,
        image_id: str,
        ndvi_data: bytes,
        metadata: Optional[Dict[str, str]] = None,
    ) -> str:
        """Upload NDVI raster."""
        try:
            object_name = f"ndvi/{image_id}_ndvi.tif"
            
            data_stream = io.BytesIO(ndvi_data)
            self.client.put_object(
                self.ndvi_bucket,
                object_name,
                data_stream,
                length=len(ndvi_data),
                content_type="image/tiff",
                metadata=metadata or {},
            )
            
            url = f"minio://{self.ndvi_bucket}/{object_name}"
            
            self.logger.info(
                f"NDVI raster uploaded",
                extra={"image_id": image_id, "url": url}
            )
            
            return url
            
        except S3Error as e:
            self.logger.error(f"Error uploading NDVI raster: {e}", exc_info=True)
            raise
    
    async def upload_damage_proof(
        self,
        assessment_id: str,
        proof_data: bytes,
        content_type: str = "application/json",
        metadata: Optional[Dict[str, str]] = None,
    ) -> str:
        """Upload damage assessment proof document."""
        try:
            object_name = f"proofs/{assessment_id}.json"
            
            data_stream = io.BytesIO(proof_data)
            self.client.put_object(
                self.proofs_bucket,
                object_name,
                data_stream,
                length=len(proof_data),
                content_type=content_type,
                metadata=metadata or {},
            )
            
            url = f"minio://{self.proofs_bucket}/{object_name}"
            
            self.logger.info(
                f"Damage proof uploaded",
                extra={"assessment_id": assessment_id, "url": url}
            )
            
            return url
            
        except S3Error as e:
            self.logger.error(f"Error uploading damage proof: {e}", exc_info=True)
            raise
    
    async def download_object(
        self,
        bucket_name: str,
        object_name: str,
    ) -> bytes:
        """Download object from MinIO."""
        try:
            self.logger.info(
                f"Downloading object from MinIO",
                extra={"bucket": bucket_name, "object": object_name}
            )
            
            response = self.client.get_object(bucket_name, object_name)
            data = response.read()
            response.close()
            response.release_conn()
            
            return data
            
        except S3Error as e:
            self.logger.error(f"Error downloading object: {e}", exc_info=True)
            raise
    
    def get_presigned_url(
        self,
        bucket_name: str,
        object_name: str,
        expires: timedelta = timedelta(hours=1),
    ) -> str:
        """Generate presigned URL for object access."""
        try:
            url = self.client.presigned_get_object(
                bucket_name,
                object_name,
                expires=expires,
            )
            
            return url
            
        except S3Error as e:
            self.logger.error(f"Error generating presigned URL: {e}", exc_info=True)
            raise
    
    async def delete_object(
        self,
        bucket_name: str,
        object_name: str,
    ) -> None:
        """Delete object from MinIO."""
        try:
            self.client.remove_object(bucket_name, object_name)
            
            self.logger.info(
                f"Object deleted",
                extra={"bucket": bucket_name, "object": object_name}
            )
            
        except S3Error as e:
            self.logger.error(f"Error deleting object: {e}", exc_info=True)
            raise
    
    def list_objects(
        self,
        bucket_name: str,
        prefix: Optional[str] = None,
    ) -> list:
        """List objects in bucket."""
        try:
            objects = self.client.list_objects(
                bucket_name,
                prefix=prefix,
                recursive=True,
            )
            
            return [obj.object_name for obj in objects]
            
        except S3Error as e:
            self.logger.error(f"Error listing objects: {e}", exc_info=True)
            raise
    
    def get_object_stat(
        self,
        bucket_name: str,
        object_name: str,
    ) -> Dict[str, Any]:
        """Get object metadata."""
        try:
            stat = self.client.stat_object(bucket_name, object_name)
            
            return {
                "size": stat.size,
                "etag": stat.etag,
                "last_modified": stat.last_modified,
                "content_type": stat.content_type,
                "metadata": stat.metadata,
            }
            
        except S3Error as e:
            self.logger.error(f"Error getting object stat: {e}", exc_info=True)
            raise
