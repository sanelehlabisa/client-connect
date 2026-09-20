"""Mock financial-provider integration used by the development demo."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ClaimAcknowledgement:
    """The reference and handler returned after a provider accepts a claim."""

    claim_number: str
    claims_handler: str


CLAIMS_HANDLERS = (
    "Lerato Nkosi",
    "Megan Jacobs",
    "Sipho Dlamini",
)


def submit_claim(provider: str, request_id: str) -> ClaimAcknowledgement:
    """Return a deterministic acknowledgement from the mock provider API."""

    provider_code = "".join(character for character in provider if character.isalnum())
    provider_code = (provider_code[:4] or "CC").upper()
    handler_index = sum(ord(character) for character in provider) % len(
        CLAIMS_HANDLERS
    )
    return ClaimAcknowledgement(
        claim_number=f"{provider_code}-{request_id[:8].upper()}",
        claims_handler=CLAIMS_HANDLERS[handler_index],
    )
