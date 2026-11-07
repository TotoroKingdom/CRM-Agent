from enum import StrEnum


class Channel(StrEnum):
    WEBSITE = "WEBSITE"
    SHOPIFY = "SHOPIFY"
    AMAZON = "AMAZON"
    TIKTOK = "TIKTOK"
    REFERRAL = "REFERRAL"
    OTHER = "OTHER"


class LeadStatus(StrEnum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    DISQUALIFIED = "DISQUALIFIED"


class Priority(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class DealStage(StrEnum):
    DISCOVERY = "DISCOVERY"
    QUALIFICATION = "QUALIFICATION"
    PROPOSAL = "PROPOSAL"
    NEGOTIATION = "NEGOTIATION"
    WON = "WON"
    LOST = "LOST"


class ActivityType(StrEnum):
    CALL = "CALL"
    EMAIL = "EMAIL"
    MESSAGE = "MESSAGE"
    MEETING = "MEETING"
    NOTE = "NOTE"


class TaskFilter(StrEnum):
    OPEN = "open"
    DONE = "done"
    OVERDUE = "overdue"
    ALL = "all"
