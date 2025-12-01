"""
Authentication and authorization module for MicroCrop Backend API.

Provides:
- JWT token generation and validation
- Role-based access control (RBAC)
- Internal API authentication for CRE workflow
- User authentication for dashboard
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from src.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token security
security = HTTPBearer()


class TokenData(BaseModel):
    """JWT token payload data."""
    user_id: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    roles: list[str] = []
    token_type: str = "access"  # or "internal"


class User(BaseModel):
    """User model for authentication."""
    user_id: str
    username: str
    email: str
    roles: list[str]
    is_active: bool = True


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    
    Args:
        plain_password: Plain text password
        hashed_password: Bcrypt hashed password
        
    Returns:
        True if password matches
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password
    """
    return pwd_context.hash(password)


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
    token_type: str = "access",
) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Token payload data (user_id, username, roles, etc.)
        expires_delta: Token expiration time
        token_type: "access" for user tokens, "internal" for CRE workflow
        
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.BACKEND_API_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "token_type": token_type,
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.BACKEND_API_TOKEN_SECRET,
        algorithm=settings.BACKEND_API_TOKEN_ALGORITHM,
    )
    
    return encoded_jwt


def create_internal_token(
    service_name: str = "cre-workflow",
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create an internal API token for service-to-service communication.
    
    Used by CRE workflow to authenticate with backend API.
    
    Args:
        service_name: Name of the calling service
        expires_delta: Token expiration (default: 60 minutes)
        
    Returns:
        Internal JWT token
    """
    data = {
        "service": service_name,
        "roles": ["internal_service"],
        "token_type": "internal",
    }
    
    if expires_delta is None:
        expires_delta = timedelta(minutes=60)
    
    return create_access_token(data, expires_delta, token_type="internal")


def decode_token(token: str) -> TokenData:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        TokenData with decoded payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.BACKEND_API_TOKEN_SECRET,
            algorithms=[settings.BACKEND_API_TOKEN_ALGORITHM],
        )
        
        user_id = payload.get("user_id")
        username = payload.get("username")
        email = payload.get("email")
        roles = payload.get("roles", [])
        token_type = payload.get("token_type", "access")
        
        if token_type == "internal":
            # Internal service token
            service = payload.get("service")
            return TokenData(
                user_id=service,
                username=service,
                roles=roles,
                token_type=token_type,
            )
        else:
            # User access token
            if username is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return TokenData(
                user_id=user_id,
                username=username,
                email=email,
                roles=roles,
                token_type=token_type,
            )
        
    except JWTError as e:
        logger.error(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> Dict[str, Any]:
    """
    Get current authenticated user from JWT token.
    
    Use as FastAPI dependency:
    ```python
    @router.get("/protected")
    async def protected_route(user = Depends(get_current_user)):
        return {"user_id": user["user_id"]}
    ```
    
    Args:
        credentials: HTTP Bearer token from request
        
    Returns:
        User data dictionary
        
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    token_data = decode_token(token)
    
    # For internal service tokens
    if token_data.token_type == "internal":
        return {
            "user_id": token_data.user_id,
            "username": token_data.username,
            "roles": token_data.roles,
            "is_internal": True,
        }
    
    # For user tokens, you would typically fetch user from database here
    # For now, returning token data
    return {
        "user_id": token_data.user_id,
        "username": token_data.username,
        "email": token_data.email,
        "roles": token_data.roles,
        "is_internal": False,
    }


async def require_internal_api(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> Dict[str, Any]:
    """
    Require internal API authentication (for CRE workflow).
    
    Use as FastAPI dependency for endpoints that should only be
    accessible by internal services like the CRE workflow.
    
    ```python
    @router.get("/api/planet/biomass/{plot_id}")
    async def get_biomass(plot_id: int, user = Depends(require_internal_api)):
        # Only CRE workflow can access this
        return biomass_data
    ```
    
    Args:
        credentials: HTTP Bearer token from request
        
    Returns:
        Service data dictionary
        
    Raises:
        HTTPException: If not an internal service token
    """
    token = credentials.credentials
    token_data = decode_token(token)
    
    if token_data.token_type != "internal":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint requires internal service authentication",
        )
    
    if "internal_service" not in token_data.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for internal API",
        )
    
    return {
        "service": token_data.user_id,
        "roles": token_data.roles,
        "is_internal": True,
    }


async def require_role(
    required_role: str,
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> Dict[str, Any]:
    """
    Require specific role for access.
    
    Args:
        required_role: Role name (e.g., "admin", "farmer", "underwriter")
        credentials: HTTP Bearer token
        
    Returns:
        User data dictionary
        
    Raises:
        HTTPException: If user doesn't have required role
    """
    user = await get_current_user(credentials)
    
    if required_role not in user.get("roles", []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{required_role}' required for this operation",
        )
    
    return user


async def require_admin(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> Dict[str, Any]:
    """
    Require admin role.
    
    Use for admin-only endpoints like subscription management.
    """
    return await require_role("admin", credentials)


# Helper function to generate tokens for testing/setup
def generate_cre_token(expires_hours: int = 24) -> str:
    """
    Generate a CRE workflow authentication token.
    
    Use this to generate tokens for the CRE workflow during setup.
    
    Args:
        expires_hours: Token expiration in hours
        
    Returns:
        JWT token string for BACKEND_API_TOKEN in CRE .env
    """
    token = create_internal_token(
        service_name="cre-workflow",
        expires_delta=timedelta(hours=expires_hours),
    )
    
    logger.info(
        f"Generated CRE workflow token (expires in {expires_hours} hours)",
        extra={"expires_hours": expires_hours},
    )
    
    return token


# CLI utility for token generation
if __name__ == "__main__":
    """
    Generate tokens from command line:
    
    python src/api/auth.py
    """
    import sys
    
    print("=" * 60)
    print("MicroCrop Backend API - Token Generator")
    print("=" * 60)
    print()
    
    # Generate CRE workflow token
    print("🔐 Generating CRE Workflow Token...")
    cre_token = generate_cre_token(expires_hours=8760)  # 1 year
    print(f"\n✅ CRE Workflow Token (valid for 1 year):")
    print(f"\n{cre_token}\n")
    print("Add this to cre-workflow/.env:")
    print(f"BACKEND_API_TOKEN={cre_token}\n")
    
    # Generate admin token (example)
    print("🔐 Generating Admin Token (example)...")
    admin_token = create_access_token(
        data={
            "user_id": "admin-001",
            "username": "admin",
            "email": "admin@microcrop.io",
            "roles": ["admin", "user"],
        },
        expires_delta=timedelta(hours=8760),  # 1 year
    )
    print(f"\n✅ Admin Token (valid for 1 year):")
    print(f"\n{admin_token}\n")
    
    print("=" * 60)
    print("⚠️  Store these tokens securely!")
    print("=" * 60)
