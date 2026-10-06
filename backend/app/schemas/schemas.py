from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: int | None = None


class AnalyzeIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class TitleUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class ReviewAction(BaseModel):
    action: str = Field(pattern="^(approve|modify|reject)$")
    comment: str = Field(default="", max_length=2000)
    final_response: str | None = Field(default=None, max_length=8000)


class UserAdminUpdate(BaseModel):
    role: str | None = Field(default=None, pattern="^(USER|REVIEWER|ADMIN)$")
    is_active: bool | None = None


class KnowledgeIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    doc_type: str = Field(default="Guide", max_length=30)
    description: str = Field(default="", max_length=1000)
    content: str = Field(default="", max_length=200_000)
    version: str = Field(default="1.0.0", max_length=20)
    status: str = Field(default="Published", pattern="^(Published|Draft|Archived)$")
