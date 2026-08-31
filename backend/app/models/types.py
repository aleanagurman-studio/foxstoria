"""String enums stored as VARCHAR values (SQLite-friendly)."""

from sqlalchemy import Enum


def str_enum(enum_cls):
    return Enum(
        enum_cls,
        native_enum=False,
        values_callable=lambda items: [item.value for item in items],
    )
