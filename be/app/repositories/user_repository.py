from sqlalchemy import func

from app.models.reservation import Reservation
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    def get(self, user_id: int):
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str):
        return self.db.query(User).filter(User.email.ilike(email)).first()

    def get_by_phone(self, phone: str):
        return self.db.query(User).filter(User.phone.isnot(None), User.phone == phone).first()

    def list_clients(self):
        return (
            self.db.query(User)
            .filter(User.role == "CLIENT")
            .order_by(User.id.asc())
            .all()
        )

    def reservation_counts(self):
        rows = (
            self.db.query(Reservation.user_id, func.count(Reservation.id))
            .group_by(Reservation.user_id)
            .all()
        )
        return {user_id: total for user_id, total in rows}

    def email_exists(self, email: str, exclude_id=None):
        query = self.db.query(User).filter(User.email.ilike(email))
        if exclude_id is not None:
            query = query.filter(User.id != exclude_id)
        return query.first() is not None

    def create(self, data: dict):
        user = User(**data)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def save(self, user):
        self.db.commit()
        self.db.refresh(user)
        return user

    def count_clients(self):
        return self.db.query(func.count(User.id)).filter(User.role == "CLIENT").scalar() or 0
