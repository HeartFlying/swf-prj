"""Authentication schemas for request/response validation."""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    """Login request schema."""

    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class TokenResponse(BaseModel):
    """Token response schema."""

    access_token: str = Field(..., description="访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")


class TokenRefreshResponse(BaseModel):
    """Token refresh response schema - matches frontend expected format."""

    model_config = ConfigDict(populate_by_name=True)

    accessToken: str = Field(..., description="访问令牌")
    refreshToken: str = Field(..., description="刷新令牌")
    tokenType: str = Field(default="bearer", description="令牌类型")
    expiresIn: int = Field(default=3600, description="过期时间（秒）")
    user: UserResponse = Field(..., description="用户信息")


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""

    refresh_token: str = Field(..., description="刷新令牌")


class LogoutRequest(BaseModel):
    """Logout request schema."""

    refresh_token: str | None = Field(None, description="刷新令牌（可选）")


class LogoutResponse(BaseModel):
    """Logout response schema."""

    message: str = Field(default="Successfully logged out", description="退出消息")
