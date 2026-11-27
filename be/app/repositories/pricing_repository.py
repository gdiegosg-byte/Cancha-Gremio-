from app.models.pricing_tier import PricingTier
from app.repositories.base import BaseRepository


class PricingRepository(BaseRepository):
    def list_active(self):
        return (
            self.db.query(PricingTier)
            .filter(PricingTier.is_active.is_(True))
            .order_by(PricingTier.id.asc())
            .all()
        )

    def list_by_day_type(self, day_type: str):
        return (
            self.db.query(PricingTier)
            .filter(
                PricingTier.is_active.is_(True),
                PricingTier.day_type == day_type,
            )
            .order_by(PricingTier.id.asc())
            .all()
        )
