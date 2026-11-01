"""
Grading company and grade from a graded listing's seller description.

CardTrader marks slabbed listings with `graded: true` but sends no company or
grade; sellers usually write them in the free-text description ("PSA 10",
"BGS 9.5 Black Label", "CGC Pristine 10"). Only the parsed pair is stored,
never the description itself (free text may contain anything).
"""

import re
from typing import Optional, Tuple

# Spelling in the text -> stored code
COMPANIES = {
    "PSA": "PSA",
    "BGS": "BGS",
    "BECKETT": "BGS",
    "CGC": "CGC",
    "SGC": "SGC",
    "ACE": "ACE",
    "TAG": "TAG",
    "PCA": "PCA",
    "AP": "AP",
    "AP GRADING": "AP",
    "GMG": "GMG",
}

_COMPANY_RE = "|".join(sorted((re.escape(k) for k in COMPANIES), key=len, reverse=True))
# Company, then at most a few label words ("Gem Mint", "Pristine", "Black Label",
# "grade"), then the grade: 1-10 with an optional half (9.5 / 9,5)
_GRADE_RE = re.compile(
    rf"\b({_COMPANY_RE})(?![a-z])[\s:#\-]*(?:(?:gem|mint|pristine|black|gold|label|perfect|grade|graded|nm|mt)[\s:#\-]*){{0,3}}"
    r"(10|[1-9](?:[.,]5)?)(?![\d.,]*\d)",
    re.IGNORECASE,
)


def parse_grade(text: Optional[str]) -> Tuple[Optional[str], Optional[float]]:
    """("PSA", 10.0) from "Charizard PSA 10 gem mint"; (None, None) when unclear."""
    if not text:
        return None, None
    found = {(COMPANIES[m.group(1).upper()], float(m.group(2).replace(",", "."))) for m in _GRADE_RE.finditer(text)}
    if len(found) != 1:  # none, or conflicting grades ("PSA 9, BGS 9.5 also available")
        return None, None
    return found.pop()
