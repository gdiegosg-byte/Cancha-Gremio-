from sqlalchemy.orm import Session


class BaseRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, entity):
        self.db.add(entity)
        return entity

    def flush(self):
        self.db.flush()

    def commit(self):
        self.db.commit()

    def refresh(self, entity):
        self.db.refresh(entity)

    def delete(self, entity):
        self.db.delete(entity)

    def rollback(self):
        self.db.rollback()
