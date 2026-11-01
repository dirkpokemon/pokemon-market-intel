"""
Grading calculator ("loont graden?", roadmap #4).

There is no reliable market price per grade in our data (CardTrader has few
graded listings), so the calculator turns the question around: given the
card's raw price and the cost of grading from Europe, which graded sale price
makes grading worth it? The frontend does the arithmetic live; this module
holds the cost presets it starts from.

Fees change often and sources disagree, so every amount is a starting point
the user can edit, shown as "indicatief" with the date we checked it.
"""

PRESETS_CHECKED = "november 2026"

# fee: per card; shipping: per shipment (there and back, insured), split over
# the cards in it. Shipping amounts are our estimates, not published prices.
GRADING_SERVICES = [
    {
        "id": "psa_frankfurt",
        "label": "PSA (Frankfurt, Standard)",
        "fee": 49.99,
        "shipping": 25.0,
        "turnaround": "enkele weken",
        "note": "PSA ontvangt kaarten uit de EU sinds september 2026 in Frankfurt: geen douane of invoer-btw.",
    },
    {
        "id": "ap_grading",
        "label": "AP Grading",
        "fee": 19.90,
        "shipping": 15.0,
        "turnaround": "enkele weken",
        "note": "Europees gradeerbedrijf; slabs brengen meestal minder op dan PSA.",
    },
]

# Marketplace commission when selling the card, raw or graded (percentage)
DEFAULT_SELLING_FEE_PCT = 5.0
