"""Wallet: one balance, one list of methods, a ledger of operations.

Пополнить / Вывести use any saved method. Kinds: topup, buy, refund, payout.
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.types import str_enum


class PaymentKind(str, enum.Enum):
    CARD = "card"
    SBP = "sbp"


class LedgerKind(str, enum.Enum):
    TOPUP = "topup"
    BUY = "buy"
    REFUND = "refund"
    PAYOUT = "payout"


class Wallet(Base):
    __tablename__ = "wallets"

    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), primary_key=True)
    balance_cents: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PaymentMethod(Base):
    """Cards and SBP accounts — same list for top-up and cash-out."""

    __tablename__ = "payment_methods"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    kind: Mapped[PaymentKind] = mapped_column(str_enum(PaymentKind))
    title: Mapped[str] = mapped_column(String(64))
    hint: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"), index=True)
    kind: Mapped[LedgerKind] = mapped_column(str_enum(LedgerKind), index=True)
    title: Mapped[str] = mapped_column(String(256))
    amount_cents: Mapped[int] = mapped_column(Integer)
    story_id: Mapped[int | None] = mapped_column(ForeignKey("stories.id", ondelete="SET NULL"), nullable=True)
    method_id: Mapped[int | None] = mapped_column(ForeignKey("payment_methods.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
