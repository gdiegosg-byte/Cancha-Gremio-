"""Allow partial payment status for reservations

Agrega el estado de pago 'partial' (abono) al check constraint
ck_reservations_payment_status para soportar abonos y pagos completos.

Revision ID: 10
Revises: 9
Create Date: 2026-09-17
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "10"
down_revision: Union[str, None] = "9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_reservations_payment_status", "reservations", type_="check")
    op.create_check_constraint(
        "ck_reservations_payment_status",
        "reservations",
        "payment_status IN ('pending', 'partial', 'paid', 'cancelled', 'refunded')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_reservations_payment_status", "reservations", type_="check")
    op.create_check_constraint(
        "ck_reservations_payment_status",
        "reservations",
        "payment_status IN ('pending', 'paid', 'cancelled', 'refunded')",
    )