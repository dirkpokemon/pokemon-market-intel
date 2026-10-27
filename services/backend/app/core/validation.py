"""
Dutch messages for request validation errors (FastAPI's 422 responses).

The frontend joins the `msg` of every error into one line, so each message is
a short, complete Dutch sentence. The response keeps FastAPI's shape
({"detail": [{"loc", "msg", "type"}]}), only `msg` changes.
"""
from typing import Any, Dict, List

# Field names users can run into, as they appear on the pages.
FIELD_LABELS: Dict[str, str] = {
    "email": "E-mailadres",
    "password": "Wachtwoord",
    "full_name": "Naam",
    "q": "Zoekterm",
    "name": "Kaartnaam",
    "price": "Prijs",
    "target_price": "Doelprijs",
    "text": "Lijst",
    "message": "Bericht",
    "card_name": "Kaartnaam",
    "card_set": "Set",
    "set": "Set",
    "country": "Land",
    "condition": "Conditie",
    "language": "Taal",
    "category": "Categorie",
    "days": "Aantal dagen",
    "limit": "Aantal",
    "min_score": "Minimale score",
    "token": "Link",
    "price_id": "Abonnement",
}


def _label(loc: Any) -> str:
    """Last field name in the location, e.g. ('body', 'email') -> 'E-mailadres'."""
    for part in reversed(list(loc or ())):
        if isinstance(part, str) and part not in ("body", "query", "path", "header"):
            return FIELD_LABELS.get(part, part)
    return ""


def _num(value: Any) -> str:
    """1000000 -> '1.000.000', 0.5 -> '0,5'."""
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    if isinstance(value, int):
        return f"{value:,}".replace(",", ".")
    return str(value).replace(".", ",")


def dutch_message(error: Dict[str, Any]) -> str:
    kind = error.get("type", "")
    ctx = error.get("ctx") or {}
    label = _label(error.get("loc"))
    field = label or "Dit veld"

    if kind == "missing":
        return f"{field} ontbreekt."
    if kind in ("string_too_short", "too_short"):
        n = ctx.get("min_length", 1)
        if n <= 1:
            return f"{field} mag niet leeg zijn."
        unit = "tekens" if kind == "string_too_short" else "regels"
        return f"{field} moet minstens {_num(n)} {unit} hebben."
    if kind in ("string_too_long", "too_long"):
        unit = "tekens" if kind == "string_too_long" else "regels"
        return f"{field} mag hoogstens {_num(ctx.get('max_length'))} {unit} hebben."
    if kind == "string_pattern_mismatch":
        return f"{field} heeft een ongeldige waarde."
    if kind in ("int_parsing", "int_type", "int_from_float"):
        return f"{field} moet een heel getal zijn."
    if kind in ("float_parsing", "float_type"):
        return f"{field} moet een getal zijn."
    if kind in ("bool_parsing", "bool_type"):
        return f"{field} moet ja of nee zijn."
    if kind == "greater_than":
        return f"{field} moet groter zijn dan {_num(ctx.get('gt'))}."
    if kind == "greater_than_equal":
        return f"{field} moet minstens {_num(ctx.get('ge'))} zijn."
    if kind == "less_than":
        return f"{field} moet kleiner zijn dan {_num(ctx.get('lt'))}."
    if kind == "less_than_equal":
        return f"{field} mag hoogstens {_num(ctx.get('le'))} zijn."
    if kind in ("literal_error", "enum"):
        return f"{field} heeft een ongeldige waarde."
    if kind in ("string_type", "list_type", "dict_type", "model_type", "model_attributes_type"):
        return f"{field} heeft het verkeerde formaat."
    if kind in ("json_invalid", "json_type"):
        return "Het verzoek kon niet worden gelezen."
    if kind == "value_error" and label == FIELD_LABELS["email"]:
        return "Vul een geldig e-mailadres in."
    return f"{field} is ongeldig."


def dutch_errors(errors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """FastAPI's error list with Dutch `msg`; drops `ctx`/`url`, which may not be JSON-safe."""
    return [
        {"loc": list(e.get("loc", ())), "msg": dutch_message(e), "type": e.get("type", "")}
        for e in errors
    ]
