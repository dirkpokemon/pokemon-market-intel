"""
Listing languages. Each language is its own product line in the statistics
(the analysis service keys market_statistics / deal_scores / daily_prices by
language), because a Japanese print is priced very differently from the
English one while sharing the same CardTrader blueprint id.
"""

SUPPORTED_LANGUAGES = ("EN", "JP")

# raw_prices.language normalised like the analysis service (LANG_EXPR there):
# upper-cased, empty = EN, CardTrader's 'JA' spelled 'JP'.
RAW_LANG_SQL = (
    "(CASE upper(COALESCE(NULLIF(btrim(language), ''), 'EN')) WHEN 'JA' THEN 'JP' "
    "ELSE upper(COALESCE(NULLIF(btrim(language), ''), 'EN')) END)"
)
