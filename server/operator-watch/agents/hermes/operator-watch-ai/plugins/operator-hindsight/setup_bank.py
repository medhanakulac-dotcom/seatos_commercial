"""Create/update the shared operator memory bank. Idempotent: re-run after editing the vocabulary or missions.

    HINDSIGHT_API_URL=http://localhost:8887 ~/.hermes/hermes-agent/venv/bin/python setup_bank.py
"""
from __future__ import annotations

import os

from hindsight_client import Hindsight

BANK = os.environ.get("OPERATOR_MEMORY_BANK", "operator-watch")

RETAIN_MISSION = (
    "Memory of SeatOS's commercial team working with transport operators (bus, van, ferry companies). "
    "Keep: what each operator wants, complains about or committed to; agreements and promised follow-ups; "
    "why outreach was recommended; human decisions on cases (approve, reject, hold, close) and their reasons; "
    "how humans edited the agent's emails and what that says about tone or content; what worked or failed. "
    "Ignore: live metrics that are re-read every time (booking counts, health status, deal stage, amounts), "
    "acknowledgements, small talk, and tool or connection errors."
)
OBSERVATIONS_MISSION = (
    "Stable facts and patterns about one operator, or recurring lessons about how the team prefers to handle "
    "operators (e.g. which recommendations get rejected and why). Never mix facts about different operators."
)
TOPICS = [
    ("pricing", "Prices, fares, commission, discounts"),
    ("onboarding", "Getting live on SeatOS, setup, training"),
    ("integration", "12go, OTA, API or agent channel connections"),
    ("bookings", "Booking volume changes, demand, seasonality"),
    ("churn_risk", "Signs the operator may leave or go dormant"),
    ("feature_request", "Features asked for or recommended"),
    ("support", "Problems, bugs, complaints, service issues"),
    ("billing", "Invoices, payments, balances, top-ups"),
    ("relationship", "Contacts, meetings, calls, tone of the relationship"),
    ("outreach", "Emails and outreach plays: drafts, edits, sends, outcomes"),
]
ENTITY_LABELS = [{
    "key": "topic",
    "description": "What the memory is about, from the commercial team's point of view.",
    "type": "multi-values",
    "tag": True,  # written as `topic:<value>` tags, filterable in recall
    "values": [{"value": v, "description": d} for v, d in TOPICS],
}]


def main() -> None:
    client = Hindsight(base_url=os.environ["HINDSIGHT_API_URL"], api_key=os.environ.get("HINDSIGHT_API_KEY") or None)
    # PUT: creates the bank or updates its identity in place.
    client.create_bank(BANK, name="Operator Watch", mission="Commercial team memory about SeatOS operators.")
    client.update_bank_config(
        BANK, retain_mission=RETAIN_MISSION, observations_mission=OBSERVATIONS_MISSION, entity_labels=ENTITY_LABELS,
    )
    print(f"configured bank {BANK}: {len(TOPICS)} topics")


if __name__ == "__main__":
    main()
