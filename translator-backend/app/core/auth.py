import jwt
import httpx
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from app.core.config import settings

security = HTTPBearer()

class SupabaseAuth:
    def __init__(self):
        self.jwt_secret = settings.SUPABASE_JWT_SECRET
        self.supabase_url = settings.SUPABASE_URL
        
    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify Supabase JWT token"""
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                audience="authenticated"
            )

            import time
            if payload.get('exp', 0) < time.time():
                raise HTTPException(status_code=401, detail="Token expired")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        except Exception as e:
            raise HTTPException(status_code=401, detail="Authentication failed")

supabase_auth = SupabaseAuth()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Dependency to get current authenticated user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = credentials.credentials
    user_data = await supabase_auth.verify_token(token)
    
    return user_data

async def get_current_user_with_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> tuple[Dict[str, Any], str]:
    """Dependency to get current authenticated user and access token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    token = credentials.credentials
    user_data = await supabase_auth.verify_token(token)
    
    return user_data, token

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[Dict[str, Any]]:
    """Optional dependency to get current authenticated user"""
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        user_data = await supabase_auth.verify_token(token)
        return user_data
    except HTTPException:
        return None