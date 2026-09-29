from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..core.security import decode_access_token

security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not credentials:
        # Return fallback mock user so UI can still interact even if unauthenticated during development
        return {
            "id": 1,
            "name": "Shri Rajesh Kumar Sharma",
            "email": "mp@mplads.gov.in",
            "role": "MP",
            "state_id": 1,
            "district_id": 1,
            "constituency_id": 1
        }
    
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload
