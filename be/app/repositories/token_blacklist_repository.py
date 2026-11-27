from app.models.token_blacklist import TokenBlacklist
from app.repositories.base import BaseRepository


class TokenBlacklistRepository(BaseRepository):
    def is_blacklisted(self, jti: str) -> bool:
        return self.db.query(TokenBlacklist).filter(TokenBlacklist.jti == jti).first() is not None

    def add(self, jti: str, expires_at, user_id=None):
        self.db.add(TokenBlacklist(jti=jti, user_id=user_id, expires_at=expires_at))
        self.db.commit()
