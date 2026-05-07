"""initial

Revision ID: 001
Revises:
Create Date: 2026-05-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trips",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("destination", sa.String(200)),
        sa.Column("start_date", sa.DateTime()),
        sa.Column("end_date", sa.DateTime()),
        sa.Column("status", sa.String(20), default="ongoing"),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now()),
    )
    op.create_table(
        "fragments",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("trip_id", sa.Integer(), sa.ForeignKey("trips.id"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("raw_text", sa.Text()),
        sa.Column("audio_url", sa.String(500)),
        sa.Column("photos", sa.JSON(), default=list),
        sa.Column("latitude", sa.Float()),
        sa.Column("longitude", sa.Float()),
        sa.Column("recorded_at", sa.DateTime(), default=sa.func.now()),
        sa.Column("tags", sa.JSON(), default=list),
        sa.Column("mood", sa.String(10)),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now()),
    )
    op.create_table(
        "scenes",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("trip_id", sa.Integer(), sa.ForeignKey("trips.id"), nullable=False),
        sa.Column("name", sa.String(200)),
        sa.Column("fragment_ids", sa.JSON(), default=list),
        sa.Column("center_lat", sa.Float()),
        sa.Column("center_lng", sa.Float()),
        sa.Column("start_time", sa.DateTime()),
        sa.Column("end_time", sa.DateTime()),
        sa.Column("summary", sa.Text()),
        sa.Column("tags", sa.JSON(), default=list),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now()),
    )
    op.create_table(
        "essays",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("trip_id", sa.Integer(), sa.ForeignKey("trips.id"), nullable=False),
        sa.Column("title", sa.String(300)),
        sa.Column("content", sa.Text()),
        sa.Column("style", sa.String(50), default="casual"),
        sa.Column("fragment_ids", sa.JSON(), default=list),
        sa.Column("scene_ids", sa.JSON(), default=list),
        sa.Column("status", sa.String(20), default="draft"),
        sa.Column("created_at", sa.DateTime(), default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("essays")
    op.drop_table("scenes")
    op.drop_table("fragments")
    op.drop_table("trips")
