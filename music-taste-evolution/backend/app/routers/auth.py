from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from jose import jwt, JWTError
from pydantic import BaseModel
from app.database import get_db
from app.models import User
from app.services.spotify_service import spotify_auth_service, spotify_data_service
from app.config import settings
from app.services.cache_service import cache_service

router = APIRouter(prefix="/auth", tags=["authentication"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    spotify_id: str
    display_name: Optional[str]
    email: Optional[str]
    image_url: Optional[str]


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> User:
    authorization: str = request.headers.get("Authorization")
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme"
            )
        
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return user
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.get("/login")
async def login():
    try:
        auth_url = spotify_auth_service.get_auth_url()
        return RedirectResponse(url=auth_url)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )


@router.get("/callback")
async def callback(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        token_info = spotify_auth_service.get_token_from_code(code)
        
        access_token = token_info.get("access_token")
        refresh_token = token_info.get("refresh_token")
        expires_in = token_info.get("expires_in", 3600)
        
        token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        
        user_profile = await spotify_data_service.get_user_profile(access_token)
        spotify_id = user_profile.get("id")
        
        result = await db.execute(select(User).where(User.spotify_id == spotify_id))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            stmt = (
                update(User)
                .where(User.id == existing_user.id)
                .values(
                    access_token=access_token,
                    refresh_token=refresh_token or existing_user.refresh_token,
                    token_expires_at=token_expires_at,
                    display_name=user_profile.get("display_name"),
                    email=user_profile.get("email"),
                    image_url=user_profile.get("image_url")
                )
            )
            await db.execute(stmt)
            await db.commit()
            
            user = existing_user
        else:
            user = User(
                id=f"user_{spotify_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                spotify_id=spotify_id,
                display_name=user_profile.get("display_name"),
                email=user_profile.get("email"),
                image_url=user_profile.get("image_url"),
                access_token=access_token,
                refresh_token=refresh_token,
                token_expires_at=token_expires_at
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        app_access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(hours=24)
        )
        
        frontend_url = "http://localhost:5173/auth/callback"
        redirect_url = f"{frontend_url}?token={app_access_token}"
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        spotify_id=current_user.spotify_id,
        display_name=current_user.display_name,
        email=current_user.email,
        image_url=current_user.image_url
    )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        update(User)
        .where(User.id == current_user.id)
        .values(
            access_token=None,
            token_expires_at=None
        )
    )
    await db.execute(stmt)
    await db.commit()
    
    return {"message": "Logged out successfully"}


@router.get("/check")
async def check_auth():
    return {
        "status": "ok",
        "spotify_configured": (
            settings.SPOTIFY_CLIENT_ID is not None and 
            settings.SPOTIFY_CLIENT_SECRET is not None
        )
    }
