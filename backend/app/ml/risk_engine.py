"""
Risk Decision Engine for TECLEOLLAVE-ADAPT.
Implements the 3-Zone Risk-Based Authentication Logic:
- ACCEPT / ALLOW (score >= threshold_high): Direct access granted.
- CHALLENGE (threshold_low <= score < threshold_high): Step-up 2FA / TOTP verification.
- REJECT (score < threshold_low): Impostor detected, access denied.
"""

from enum import Enum
from typing import Dict, Any, Tuple


class RiskZone(str, Enum):
    ACCEPT = "allow"
    CHALLENGE = "challenge"
    REJECT = "reject"


class RiskDecisionEngine:
    """
    Motor de decisión determinista basado en riesgo.
    """

    DEFAULT_THRESHOLD_LOW = 0.45
    DEFAULT_THRESHOLD_HIGH = 0.75

    @classmethod
    def validate_thresholds(cls, threshold_low: float, threshold_high: float) -> bool:
        """
        Valida que 0 < threshold_low < threshold_high < 1.
        """
        return 0.0 < threshold_low < threshold_high < 1.0

    @classmethod
    def evaluate(
        cls,
        score: float,
        threshold_low: float = DEFAULT_THRESHOLD_LOW,
        threshold_high: float = DEFAULT_THRESHOLD_HIGH
    ) -> Dict[str, Any]:
        """
        Evalúa el score biométrico contra los umbrales configurados.

        Returns:
            dict con:
            - decision: 'allow' | 'challenge' | 'reject'
            - zone: RiskZone
            - score: float
            - threshold_low: float
            - threshold_high: float
            - requires_2fa: bool
            - is_authorized: bool
            - message: str
        """
        score = float(score)
        th_low = float(threshold_low)
        th_high = float(threshold_high)

        if score >= th_high:
            decision = RiskZone.ACCEPT.value
            requires_2fa = False
            is_authorized = True
            msg = f"Acceso concedido directamente (Score {score:.3f} >= {th_high:.2f})."
        elif score >= th_low:
            decision = RiskZone.CHALLENGE.value
            requires_2fa = True
            is_authorized = False
            msg = f"Desafío 2FA requerido (Score {score:.3f} en zona intermedia [{th_low:.2f}, {th_high:.2f}])."
        else:
            decision = RiskZone.REJECT.value
            requires_2fa = False
            is_authorized = False
            msg = f"Acceso bloqueado (Score {score:.3f} < {th_low:.2f}). Impostor o anomalía detectada."

        return {
            "decision": decision,
            "zone": decision,
            "score": round(score, 4),
            "threshold_low": round(th_low, 4),
            "threshold_high": round(th_high, 4),
            "requires_2fa": requires_2fa,
            "is_authorized": is_authorized,
            "message": msg
        }
