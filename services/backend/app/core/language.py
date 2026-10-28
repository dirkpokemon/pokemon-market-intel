"""
Listing languages. Each language is its own product line in the statistics
(the analysis service keys market_statistics / deal_scores / daily_prices by
language), because a Japanese print is priced very differently from the
English one while sharing the same CardTrader blueprint id.
"""

# Keep in sync with INCLUDED_LANGUAGES in services/analysis/app/config_analysis.py
SUPPORTED_LANGUAGES = ("EN", "JP", "IT")
LANGUAGE_PATTERN = "^(" + "|".join(SUPPORTED_LANGUAGES) + ")$"
LANGUAGE_OR_ALL_PATTERN = "^(" + "|".join(SUPPORTED_LANGUAGES) + "|all)$"

# "Engelstalig" etc., for explanations shown to users
LANGUAGE_ADJECTIVE = {"EN": "Engelstalig", "JP": "Japanstalig", "IT": "Italiaanstalig"}

# Words in a pasted listing that ask for a language ("Charizard ex japans")
LANGUAGE_WORDS = {
    "JP": {"jp", "jap", "japans", "japanse", "japanese", "jpn"},
    # not "it": too common in English listing text
    "IT": {"ita", "italiaans", "italiaanse", "italian", "italiano"},
}

# raw_prices.language normalised like the analysis service (LANG_EXPR there):
# upper-cased, empty = EN, CardTrader's 'JA' spelled 'JP'.
RAW_LANG_SQL = (
    "(CASE upper(COALESCE(NULLIF(btrim(language), ''), 'EN')) WHEN 'JA' THEN 'JP' "
    "ELSE upper(COALESCE(NULLIF(btrim(language), ''), 'EN')) END)"
)
