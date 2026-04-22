"""
Canonical Pokemon TCG Set Registry
===================================

Single source of truth for the set list used by the application.

Why this exists
---------------
Before this registry, the frontend had a hardcoded set list with names like
"SV10: Destined Rivals", while the database stored whatever name CardTrader
returned ("Destined Rivals", "Scarlet & Violet—Destined Rivals", etc.).
Detail pages failed because the two naming conventions did not match.

Each entry lists explicit `aliases` — every variant of the set name that has
been observed in deal_scores.product_set / raw_prices.card_set. Backend
endpoints resolve a slug to aliases and use ILIKE ANY(aliases) to look up
rows. Frontend consumes this registry through /api/v1/sets.

Adding a new set
----------------
1. Append an entry to SETS.
2. Seed aliases with the canonical name + any variants you see in the DB
   (run `SELECT DISTINCT product_set FROM deal_scores` to discover them).
3. Restart the API — no migration needed.
"""

from typing import List, Dict, Optional

# Each entry: slug, name (display), set_code, era, tcg_api_id, cardmarket_slug, aliases
SETS: List[Dict] = [
    # ───────── Modern era ─────────
    {"slug": "me-ascended-heroes",      "name": "ME: Ascended Heroes",      "set_code": "ME",   "era": "modern", "tcg_api_id": None,      "cardmarket_slug": "AscendedHeroes",    "aliases": ["Ascended Heroes", "ME: Ascended Heroes"]},
    {"slug": "me02-phantasmal-flames",  "name": "ME02: Phantasmal Flames",  "set_code": "ME02", "era": "modern", "tcg_api_id": None,      "cardmarket_slug": "PhantasmalFlames",  "aliases": ["Phantasmal Flames", "ME02: Phantasmal Flames"]},
    {"slug": "me01-mega-evolution",     "name": "ME01: Mega Evolution",     "set_code": "ME01", "era": "modern", "tcg_api_id": None,      "cardmarket_slug": "MegaEvolution",     "aliases": ["Mega Evolution", "ME01: Mega Evolution"]},

    # ───────── Scarlet & Violet ─────────
    {"slug": "sv-black-bolt",           "name": "SV: Black Bolt",           "set_code": "SV",   "era": "scarlet-violet", "tcg_api_id": None,       "cardmarket_slug": "BlackBolt",            "aliases": ["Black Bolt", "SV: Black Bolt"]},
    {"slug": "sv-white-flare",          "name": "SV: White Flare",          "set_code": "SV",   "era": "scarlet-violet", "tcg_api_id": None,       "cardmarket_slug": "WhiteFlare",           "aliases": ["White Flare", "SV: White Flare"]},
    {"slug": "sv10-destined-rivals",    "name": "SV10: Destined Rivals",    "set_code": "SV10", "era": "scarlet-violet", "tcg_api_id": "sv10",     "cardmarket_slug": "DestinedRivals",       "aliases": ["Destined Rivals", "SV10: Destined Rivals", "Scarlet & Violet—Destined Rivals"]},
    {"slug": "sv09-journey-together",   "name": "SV09: Journey Together",   "set_code": "SV09", "era": "scarlet-violet", "tcg_api_id": "sv9",      "cardmarket_slug": "JourneyTogether",      "aliases": ["Journey Together", "SV09: Journey Together", "Scarlet & Violet—Journey Together"]},
    {"slug": "sv-prismatic-evolutions", "name": "SV: Prismatic Evolutions", "set_code": "SV",   "era": "scarlet-violet", "tcg_api_id": "sv8pt5",   "cardmarket_slug": "PrismaticEvolutions",  "aliases": ["Prismatic Evolutions", "SV: Prismatic Evolutions", "Scarlet & Violet—Prismatic Evolutions"]},
    {"slug": "sv08-surging-sparks",     "name": "SV08: Surging Sparks",     "set_code": "SV08", "era": "scarlet-violet", "tcg_api_id": "sv8",      "cardmarket_slug": "SurgingSparks",        "aliases": ["Surging Sparks", "SV08: Surging Sparks", "Scarlet & Violet—Surging Sparks"]},
    {"slug": "sv07-stellar-crown",      "name": "SV07: Stellar Crown",      "set_code": "SV07", "era": "scarlet-violet", "tcg_api_id": "sv7",      "cardmarket_slug": "StellarCrown",         "aliases": ["Stellar Crown", "SV07: Stellar Crown", "Scarlet & Violet—Stellar Crown"]},
    {"slug": "sv-shrouded-fable",       "name": "SV: Shrouded Fable",       "set_code": "SV",   "era": "scarlet-violet", "tcg_api_id": "sv6pt5",   "cardmarket_slug": "ShroudedFable",        "aliases": ["Shrouded Fable", "SV: Shrouded Fable", "Scarlet & Violet—Shrouded Fable"]},
    {"slug": "sv06-twilight-masquerade","name": "SV06: Twilight Masquerade","set_code": "SV06", "era": "scarlet-violet", "tcg_api_id": "sv6",      "cardmarket_slug": "TwilightMasquerade",   "aliases": ["Twilight Masquerade", "SV06: Twilight Masquerade", "Scarlet & Violet—Twilight Masquerade"]},
    {"slug": "sv05-temporal-forces",    "name": "SV05: Temporal Forces",    "set_code": "SV05", "era": "scarlet-violet", "tcg_api_id": "sv5",      "cardmarket_slug": "TemporalForces",       "aliases": ["Temporal Forces", "SV05: Temporal Forces", "Scarlet & Violet—Temporal Forces"]},
    {"slug": "sv-paldean-fates",        "name": "SV: Paldean Fates",        "set_code": "SV",   "era": "scarlet-violet", "tcg_api_id": "sv4pt5",   "cardmarket_slug": "PaldeanFates",         "aliases": ["Paldean Fates", "SV: Paldean Fates", "Scarlet & Violet—Paldean Fates"]},
    {"slug": "sv04-paradox-rift",       "name": "SV04: Paradox Rift",       "set_code": "SV04", "era": "scarlet-violet", "tcg_api_id": "sv4",      "cardmarket_slug": "ParadoxRift",          "aliases": ["Paradox Rift", "SV04: Paradox Rift", "Scarlet & Violet—Paradox Rift"]},
    {"slug": "sv-151",                  "name": "SV: Scarlet & Violet 151", "set_code": "SV",   "era": "scarlet-violet", "tcg_api_id": "sv3pt5",   "cardmarket_slug": "ScarletViolet151",     "aliases": ["151", "Scarlet & Violet 151", "SV: 151", "SV: Scarlet & Violet 151", "Scarlet & Violet—151"]},
    {"slug": "sv03-obsidian-flames",    "name": "SV03: Obsidian Flames",    "set_code": "SV03", "era": "scarlet-violet", "tcg_api_id": "sv3",      "cardmarket_slug": "ObsidianFlames",       "aliases": ["Obsidian Flames", "SV03: Obsidian Flames", "Scarlet & Violet—Obsidian Flames"]},
    {"slug": "sv02-paldea-evolved",     "name": "SV02: Paldea Evolved",     "set_code": "SV02", "era": "scarlet-violet", "tcg_api_id": "sv2",      "cardmarket_slug": "PaldeaEvolved",        "aliases": ["Paldea Evolved", "SV02: Paldea Evolved", "Scarlet & Violet—Paldea Evolved"]},
    {"slug": "sv01-base",               "name": "SV01: Scarlet & Violet Base Set","set_code": "SV01","era": "scarlet-violet","tcg_api_id": "sv1","cardmarket_slug": "ScarletViolet",        "aliases": ["Scarlet & Violet Base Set", "Scarlet & Violet", "SV01: Scarlet & Violet", "SV01: Scarlet & Violet Base Set"]},

    # ───────── Sword & Shield ─────────
    {"slug": "crown-zenith-galarian",    "name": "Crown Zenith: Galarian Gallery",   "set_code": None,     "era": "sword-shield", "tcg_api_id": "swsh12pt5", "cardmarket_slug": "CrownZenithGalarianGallery",  "aliases": ["Crown Zenith: Galarian Gallery", "Crown Zenith Galarian Gallery"]},
    {"slug": "crown-zenith",             "name": "Crown Zenith",                     "set_code": None,     "era": "sword-shield", "tcg_api_id": "swsh12pt5", "cardmarket_slug": "CrownZenith",                  "aliases": ["Crown Zenith"]},
    {"slug": "swsh12-silver-tempest-tg", "name": "SWSH12: Silver Tempest TG",        "set_code": "SWSH12", "era": "sword-shield", "tcg_api_id": "swsh12tg",  "cardmarket_slug": "SilverTempestTrainerGallery","aliases": ["Silver Tempest Trainer Gallery", "Silver Tempest TG", "SWSH12: Silver Tempest TG"]},
    {"slug": "swsh12-silver-tempest",    "name": "SWSH12: Silver Tempest",           "set_code": "SWSH12", "era": "sword-shield", "tcg_api_id": "swsh12",    "cardmarket_slug": "SilverTempest",                "aliases": ["Silver Tempest", "SWSH12: Silver Tempest", "Sword & Shield—Silver Tempest"]},
    {"slug": "swsh11-lost-origin",       "name": "SWSH11: Lost Origin",              "set_code": "SWSH11", "era": "sword-shield", "tcg_api_id": "swsh11",    "cardmarket_slug": "LostOrigin",                   "aliases": ["Lost Origin", "SWSH11: Lost Origin", "Sword & Shield—Lost Origin"]},
    {"slug": "swsh11-lost-origin-tg",    "name": "SWSH11: Lost Origin TG",           "set_code": "SWSH11", "era": "sword-shield", "tcg_api_id": "swsh11tg",  "cardmarket_slug": "LostOriginTrainerGallery",     "aliases": ["Lost Origin Trainer Gallery", "Lost Origin TG", "SWSH11: Lost Origin TG"]},
    {"slug": "pokemon-go",               "name": "Pokemon GO",                       "set_code": None,     "era": "sword-shield", "tcg_api_id": "pgo",       "cardmarket_slug": "PokemonGO",                    "aliases": ["Pokemon GO", "Pokémon GO", "Pokemon Go"]},
    {"slug": "swsh10-astral-radiance",   "name": "SWSH10: Astral Radiance",          "set_code": "SWSH10", "era": "sword-shield", "tcg_api_id": "swsh10",    "cardmarket_slug": "AstralRadiance",               "aliases": ["Astral Radiance", "SWSH10: Astral Radiance", "Sword & Shield—Astral Radiance"]},
    {"slug": "swsh10-astral-radiance-tg","name": "SWSH10: Astral Radiance TG",       "set_code": "SWSH10", "era": "sword-shield", "tcg_api_id": "swsh10tg",  "cardmarket_slug": "AstralRadianceTrainerGallery","aliases": ["Astral Radiance Trainer Gallery", "Astral Radiance TG"]},
    {"slug": "swsh09-brilliant-stars",   "name": "SWSH09: Brilliant Stars",          "set_code": "SWSH09", "era": "sword-shield", "tcg_api_id": "swsh9",     "cardmarket_slug": "BrilliantStars",               "aliases": ["Brilliant Stars", "SWSH09: Brilliant Stars", "Sword & Shield—Brilliant Stars"]},
    {"slug": "swsh09-brilliant-stars-tg","name": "SWSH09: Brilliant Stars TG",       "set_code": "SWSH09", "era": "sword-shield", "tcg_api_id": "swsh9tg",   "cardmarket_slug": "BrilliantStarsTrainerGallery","aliases": ["Brilliant Stars Trainer Gallery", "Brilliant Stars TG"]},
    {"slug": "swsh08-fusion-strike",     "name": "SWSH08: Fusion Strike",            "set_code": "SWSH08", "era": "sword-shield", "tcg_api_id": "swsh8",     "cardmarket_slug": "FusionStrike",                 "aliases": ["Fusion Strike", "SWSH08: Fusion Strike", "Sword & Shield—Fusion Strike"]},
    {"slug": "celebrations-classic",     "name": "Celebrations: Classic Collection", "set_code": None,     "era": "sword-shield", "tcg_api_id": "cel25c",    "cardmarket_slug": "CelebrationsClassicCollection","aliases": ["Celebrations: Classic Collection", "Celebrations Classic Collection"]},
    {"slug": "celebrations",             "name": "Celebrations",                     "set_code": None,     "era": "sword-shield", "tcg_api_id": "cel25",     "cardmarket_slug": "Celebrations",                 "aliases": ["Celebrations"]},
    {"slug": "swsh07-evolving-skies",    "name": "SWSH07: Evolving Skies",           "set_code": "SWSH07", "era": "sword-shield", "tcg_api_id": "swsh7",     "cardmarket_slug": "EvolvingSkies",                "aliases": ["Evolving Skies", "SWSH07: Evolving Skies", "Sword & Shield—Evolving Skies"]},
    {"slug": "swsh06-chilling-reign",    "name": "SWSH06: Chilling Reign",           "set_code": "SWSH06", "era": "sword-shield", "tcg_api_id": "swsh6",     "cardmarket_slug": "ChillingReign",                "aliases": ["Chilling Reign", "SWSH06: Chilling Reign", "Sword & Shield—Chilling Reign"]},
    {"slug": "swsh05-battle-styles",     "name": "SWSH05: Battle Styles",            "set_code": "SWSH05", "era": "sword-shield", "tcg_api_id": "swsh5",     "cardmarket_slug": "BattleStyles",                 "aliases": ["Battle Styles", "SWSH05: Battle Styles", "Sword & Shield—Battle Styles"]},
    {"slug": "shining-fates",            "name": "Shining Fates",                    "set_code": None,     "era": "sword-shield", "tcg_api_id": "swsh4pt5",  "cardmarket_slug": "ShiningFates",                 "aliases": ["Shining Fates"]},
    {"slug": "shining-fates-sv",         "name": "Shining Fates: Shiny Vault",       "set_code": None,     "era": "sword-shield", "tcg_api_id": "swsh4pt5",  "cardmarket_slug": "ShiningFatesShinyVault",       "aliases": ["Shining Fates: Shiny Vault", "Shining Fates Shiny Vault"]},
    {"slug": "swsh04-vivid-voltage",     "name": "SWSH04: Vivid Voltage",            "set_code": "SWSH04", "era": "sword-shield", "tcg_api_id": "swsh4",     "cardmarket_slug": "VividVoltage",                 "aliases": ["Vivid Voltage", "SWSH04: Vivid Voltage", "Sword & Shield—Vivid Voltage"]},
    {"slug": "champions-path",           "name": "Champion's Path",                  "set_code": None,     "era": "sword-shield", "tcg_api_id": "swsh3pt5",  "cardmarket_slug": "ChampionsPath",                "aliases": ["Champion's Path", "Champions Path"]},
    {"slug": "swsh03-darkness-ablaze",   "name": "SWSH03: Darkness Ablaze",          "set_code": "SWSH03", "era": "sword-shield", "tcg_api_id": "swsh3",     "cardmarket_slug": "DarknessAblaze",               "aliases": ["Darkness Ablaze", "SWSH03: Darkness Ablaze", "Sword & Shield—Darkness Ablaze"]},
    {"slug": "swsh02-rebel-clash",       "name": "SWSH02: Rebel Clash",              "set_code": "SWSH02", "era": "sword-shield", "tcg_api_id": "swsh2",     "cardmarket_slug": "RebelClash",                   "aliases": ["Rebel Clash", "SWSH02: Rebel Clash", "Sword & Shield—Rebel Clash"]},
    {"slug": "swsh01-base",              "name": "SWSH01: Sword & Shield Base Set",  "set_code": "SWSH01", "era": "sword-shield", "tcg_api_id": "swsh1",     "cardmarket_slug": "SwordShield",                  "aliases": ["Sword & Shield Base Set", "Sword & Shield", "SWSH01: Sword & Shield", "SWSH01: Sword & Shield Base Set"]},

    # ───────── Sun & Moon ─────────
    {"slug": "sm-cosmic-eclipse",   "name": "SM - Cosmic Eclipse",   "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm12",    "cardmarket_slug": "CosmicEclipse",    "aliases": ["Cosmic Eclipse", "SM - Cosmic Eclipse", "Sun & Moon—Cosmic Eclipse"]},
    {"slug": "hidden-fates-sv",     "name": "Hidden Fates: Shiny Vault","set_code": None,"era": "sun-moon","tcg_api_id": "smp",     "cardmarket_slug": "HiddenFatesShinyVault","aliases": ["Hidden Fates: Shiny Vault", "Hidden Fates Shiny Vault"]},
    {"slug": "hidden-fates",        "name": "Hidden Fates",          "set_code": None,  "era": "sun-moon", "tcg_api_id": "sm11pt5", "cardmarket_slug": "HiddenFates",      "aliases": ["Hidden Fates"]},
    {"slug": "sm-unified-minds",    "name": "SM - Unified Minds",    "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm11",    "cardmarket_slug": "UnifiedMinds",     "aliases": ["Unified Minds", "SM - Unified Minds", "Sun & Moon—Unified Minds"]},
    {"slug": "sm-unbroken-bonds",   "name": "SM - Unbroken Bonds",   "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm10",    "cardmarket_slug": "UnbrokenBonds",    "aliases": ["Unbroken Bonds", "SM - Unbroken Bonds", "Sun & Moon—Unbroken Bonds"]},
    {"slug": "detective-pikachu",   "name": "Detective Pikachu",     "set_code": None,  "era": "sun-moon", "tcg_api_id": "det1",    "cardmarket_slug": "DetectivePikachu", "aliases": ["Detective Pikachu"]},
    {"slug": "sm-team-up",          "name": "SM - Team Up",          "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm9",     "cardmarket_slug": "TeamUp",           "aliases": ["Team Up", "SM - Team Up", "Sun & Moon—Team Up"]},
    {"slug": "sm-lost-thunder",     "name": "SM - Lost Thunder",     "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm8",     "cardmarket_slug": "LostThunder",      "aliases": ["Lost Thunder", "SM - Lost Thunder", "Sun & Moon—Lost Thunder"]},
    {"slug": "dragon-majesty",      "name": "Dragon Majesty",        "set_code": None,  "era": "sun-moon", "tcg_api_id": "sm7a",    "cardmarket_slug": "DragonMajesty",    "aliases": ["Dragon Majesty"]},
    {"slug": "sm-celestial-storm",  "name": "SM - Celestial Storm",  "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm7",     "cardmarket_slug": "CelestialStorm",   "aliases": ["Celestial Storm", "SM - Celestial Storm", "Sun & Moon—Celestial Storm"]},
    {"slug": "sm-forbidden-light",  "name": "SM - Forbidden Light",  "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm6",     "cardmarket_slug": "ForbiddenLight",   "aliases": ["Forbidden Light", "SM - Forbidden Light", "Sun & Moon—Forbidden Light"]},
    {"slug": "sm-ultra-prism",      "name": "SM - Ultra Prism",      "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm5",     "cardmarket_slug": "UltraPrism",       "aliases": ["Ultra Prism", "SM - Ultra Prism", "Sun & Moon—Ultra Prism"]},
    {"slug": "sm-crimson-invasion", "name": "SM - Crimson Invasion", "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm4",     "cardmarket_slug": "CrimsonInvasion",  "aliases": ["Crimson Invasion", "SM - Crimson Invasion", "Sun & Moon—Crimson Invasion"]},
    {"slug": "shining-legends",     "name": "Shining Legends",       "set_code": None,  "era": "sun-moon", "tcg_api_id": "sm35",    "cardmarket_slug": "ShiningLegends",   "aliases": ["Shining Legends"]},
    {"slug": "sm-burning-shadows",  "name": "SM - Burning Shadows",  "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm3",     "cardmarket_slug": "BurningShadows",   "aliases": ["Burning Shadows", "SM - Burning Shadows", "Sun & Moon—Burning Shadows"]},
    {"slug": "sm-guardians-rising", "name": "SM - Guardians Rising", "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm2",     "cardmarket_slug": "GuardiansRising",  "aliases": ["Guardians Rising", "SM - Guardians Rising", "Sun & Moon—Guardians Rising"]},
    {"slug": "sm-base",             "name": "SM Base Set",           "set_code": "SM",  "era": "sun-moon", "tcg_api_id": "sm1",     "cardmarket_slug": "SunMoon",          "aliases": ["Sun & Moon Base Set", "Sun & Moon", "SM Base Set"]},

    # ───────── XY ─────────
    {"slug": "xy-evolutions",       "name": "XY - Evolutions",       "set_code": "XY", "era": "xy", "tcg_api_id": "xy12", "cardmarket_slug": "Evolutions",       "aliases": ["Evolutions", "XY - Evolutions", "XY—Evolutions"]},
    {"slug": "xy-steam-siege",      "name": "XY - Steam Siege",      "set_code": "XY", "era": "xy", "tcg_api_id": "xy11", "cardmarket_slug": "SteamSiege",       "aliases": ["Steam Siege", "XY - Steam Siege"]},
    {"slug": "xy-fates-collide",    "name": "XY - Fates Collide",    "set_code": "XY", "era": "xy", "tcg_api_id": "xy10", "cardmarket_slug": "FatesCollide",     "aliases": ["Fates Collide", "XY - Fates Collide"]},
    {"slug": "generations-rc",      "name": "Generations: Radiant Collection","set_code": None,"era":"xy","tcg_api_id":"g1","cardmarket_slug":"GenerationsRadiantCollection","aliases":["Generations: Radiant Collection","Generations Radiant Collection"]},
    {"slug": "generations",         "name": "Generations",           "set_code": None, "era": "xy", "tcg_api_id": "g1",   "cardmarket_slug": "Generations",      "aliases": ["Generations"]},
    {"slug": "xy-breakpoint",       "name": "XY - BREAKpoint",       "set_code": "XY", "era": "xy", "tcg_api_id": "xy9",  "cardmarket_slug": "BREAKpoint",       "aliases": ["BREAKpoint", "XY - BREAKpoint", "Breakpoint"]},
    {"slug": "xy-breakthrough",     "name": "XY - BREAKthrough",     "set_code": "XY", "era": "xy", "tcg_api_id": "xy8",  "cardmarket_slug": "BREAKthrough",     "aliases": ["BREAKthrough", "XY - BREAKthrough", "Breakthrough"]},
    {"slug": "xy-ancient-origins",  "name": "XY - Ancient Origins",  "set_code": "XY", "era": "xy", "tcg_api_id": "xy7",  "cardmarket_slug": "AncientOrigins",   "aliases": ["Ancient Origins", "XY - Ancient Origins"]},
    {"slug": "xy-roaring-skies",    "name": "XY - Roaring Skies",    "set_code": "XY", "era": "xy", "tcg_api_id": "xy6",  "cardmarket_slug": "RoaringSkies",     "aliases": ["Roaring Skies", "XY - Roaring Skies"]},
    {"slug": "xy-primal-clash",     "name": "XY - Primal Clash",     "set_code": "XY", "era": "xy", "tcg_api_id": "xy5",  "cardmarket_slug": "PrimalClash",      "aliases": ["Primal Clash", "XY - Primal Clash"]},
    {"slug": "xy-phantom-forces",   "name": "XY - Phantom Forces",   "set_code": "XY", "era": "xy", "tcg_api_id": "xy4",  "cardmarket_slug": "PhantomForces",    "aliases": ["Phantom Forces", "XY - Phantom Forces"]},
    {"slug": "xy-furious-fists",    "name": "XY - Furious Fists",    "set_code": "XY", "era": "xy", "tcg_api_id": "xy3",  "cardmarket_slug": "FuriousFists",     "aliases": ["Furious Fists", "XY - Furious Fists"]},
    {"slug": "xy-flashfire",        "name": "XY - Flashfire",        "set_code": "XY", "era": "xy", "tcg_api_id": "xy2",  "cardmarket_slug": "Flashfire",        "aliases": ["Flashfire", "XY - Flashfire"]},
    {"slug": "xy-base",             "name": "XY Base Set",           "set_code": "XY", "era": "xy", "tcg_api_id": "xy1",  "cardmarket_slug": "XY",               "aliases": ["XY Base Set", "XY"]},

    # ───────── Black & White ─────────
    {"slug": "bw-legendary-treasures",   "name": "Legendary Treasures",     "set_code": "BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"LegendaryTreasures",     "aliases": ["Legendary Treasures"]},
    {"slug": "bw-legendary-treasures-rc","name": "Legendary Treasures: Radiant Collection","set_code":"BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"LegendaryTreasuresRadiantCollection","aliases":["Legendary Treasures: Radiant Collection","Legendary Treasures Radiant Collection"]},
    {"slug": "bw-plasma-blast",          "name": "Plasma Blast",            "set_code": "BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"PlasmaBlast",            "aliases": ["Plasma Blast"]},
    {"slug": "bw-plasma-freeze",         "name": "Plasma Freeze",           "set_code": "BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"PlasmaFreeze",           "aliases": ["Plasma Freeze"]},
    {"slug": "bw-plasma-storm",          "name": "Plasma Storm",            "set_code": "BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"PlasmaStorm",            "aliases": ["Plasma Storm"]},
    {"slug": "bw-boundaries-crossed",    "name": "Boundaries Crossed",      "set_code": "BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"BoundariesCrossed",      "aliases": ["Boundaries Crossed"]},
    {"slug": "bw-dragons-exalted",       "name": "Dragons Exalted",         "set_code": "BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"DragonsExalted",         "aliases": ["Dragons Exalted"]},
    {"slug": "bw-dark-explorers",        "name": "Dark Explorers",          "set_code": "BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"DarkExplorers",          "aliases": ["Dark Explorers"]},
    {"slug": "bw-next-destinies",        "name": "Next Destinies",          "set_code": "BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"NextDestinies",          "aliases": ["Next Destinies"]},
    {"slug": "bw-noble-victories",       "name": "Noble Victories",         "set_code": "BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"NobleVictories",         "aliases": ["Noble Victories"]},
    {"slug": "bw-emerging-powers",       "name": "Emerging Powers",         "set_code": "BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"EmergingPowers",         "aliases": ["Emerging Powers"]},
    {"slug": "bw-base",                  "name": "Black and White",         "set_code": "BW","era":"black-white","tcg_api_id":None,"cardmarket_slug":"BlackWhite",             "aliases": ["Black and White", "Black & White", "Black White"]},

    # ───────── HeartGold & SoulSilver ─────────
    {"slug": "hgss-call-of-legends", "name": "Call of Legends",    "set_code": "HGSS","era":"heartgold-soulsilver","tcg_api_id":None,"cardmarket_slug":"CallofLegends",        "aliases": ["Call of Legends"]},
    {"slug": "hgss-triumphant",      "name": "Triumphant",         "set_code": "HGSS","era":"heartgold-soulsilver","tcg_api_id":None,"cardmarket_slug":"Triumphant",           "aliases": ["Triumphant", "HGSS Triumphant"]},
    {"slug": "hgss-undaunted",       "name": "Undaunted",          "set_code": "HGSS","era":"heartgold-soulsilver","tcg_api_id":None,"cardmarket_slug":"Undaunted",            "aliases": ["Undaunted", "HGSS Undaunted"]},
    {"slug": "hgss-unleashed",       "name": "Unleashed",          "set_code": "HGSS","era":"heartgold-soulsilver","tcg_api_id":None,"cardmarket_slug":"Unleashed",            "aliases": ["Unleashed", "HGSS Unleashed"]},
    {"slug": "hgss-base",            "name": "HeartGold SoulSilver","set_code":"HGSS","era":"heartgold-soulsilver","tcg_api_id":None,"cardmarket_slug":"HeartGoldSoulSilver",   "aliases": ["HeartGold SoulSilver", "HeartGold & SoulSilver", "HGSS"]},

    # ───────── Platinum ─────────
    {"slug": "pl-arceus",           "name": "Arceus",            "set_code": "PL","era":"platinum","tcg_api_id":None,"cardmarket_slug":"Arceus",          "aliases": ["Arceus"]},
    {"slug": "pl-supreme-victors",  "name": "Supreme Victors",   "set_code": "PL","era":"platinum","tcg_api_id":None,"cardmarket_slug":"SupremeVictors",  "aliases": ["Supreme Victors"]},
    {"slug": "pl-rising-rivals",    "name": "Rising Rivals",     "set_code": "PL","era":"platinum","tcg_api_id":None,"cardmarket_slug":"RisingRivals",    "aliases": ["Rising Rivals"]},
    {"slug": "pl-base",             "name": "Platinum",          "set_code": "PL","era":"platinum","tcg_api_id":None,"cardmarket_slug":"Platinum",        "aliases": ["Platinum"]},

    # ───────── Diamond & Pearl ─────────
    {"slug": "dp-stormfront",           "name": "Stormfront",           "set_code": "DP","era":"diamond-pearl","tcg_api_id":None,"cardmarket_slug":"Stormfront",           "aliases": ["Stormfront"]},
    {"slug": "dp-legends-awakened",     "name": "Legends Awakened",     "set_code": "DP","era":"diamond-pearl","tcg_api_id":None,"cardmarket_slug":"LegendsAwakened",     "aliases": ["Legends Awakened"]},
    {"slug": "dp-majestic-dawn",        "name": "Majestic Dawn",        "set_code": "DP","era":"diamond-pearl","tcg_api_id":None,"cardmarket_slug":"MajesticDawn",        "aliases": ["Majestic Dawn"]},
    {"slug": "dp-great-encounters",     "name": "Great Encounters",     "set_code": "DP","era":"diamond-pearl","tcg_api_id":None,"cardmarket_slug":"GreatEncounters",     "aliases": ["Great Encounters"]},
    {"slug": "dp-secret-wonders",       "name": "Secret Wonders",       "set_code": "DP","era":"diamond-pearl","tcg_api_id":None,"cardmarket_slug":"SecretWonders",       "aliases": ["Secret Wonders"]},
    {"slug": "dp-mysterious-treasures", "name": "Mysterious Treasures", "set_code": "DP","era":"diamond-pearl","tcg_api_id":None,"cardmarket_slug":"MysteriousTreasures", "aliases": ["Mysterious Treasures"]},
    {"slug": "dp-base",                 "name": "Diamond and Pearl",    "set_code": "DP","era":"diamond-pearl","tcg_api_id":None,"cardmarket_slug":"DiamondPearl",        "aliases": ["Diamond and Pearl", "Diamond & Pearl"]},

    # ───────── EX Series ─────────
    {"slug": "ex-power-keepers",       "name": "Power Keepers",       "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"PowerKeepers",       "aliases": ["Power Keepers", "EX Power Keepers"]},
    {"slug": "ex-dragon-frontiers",    "name": "Dragon Frontiers",    "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"DragonFrontiers",    "aliases": ["Dragon Frontiers", "EX Dragon Frontiers"]},
    {"slug": "ex-crystal-guardians",   "name": "Crystal Guardians",   "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"CrystalGuardians",   "aliases": ["Crystal Guardians", "EX Crystal Guardians"]},
    {"slug": "ex-holon-phantoms",      "name": "Holon Phantoms",      "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"HolonPhantoms",      "aliases": ["Holon Phantoms", "EX Holon Phantoms"]},
    {"slug": "ex-legend-maker",        "name": "Legend Maker",        "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"LegendMaker",        "aliases": ["Legend Maker", "EX Legend Maker"]},
    {"slug": "ex-delta-species",       "name": "Delta Species",       "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"DeltaSpecies",       "aliases": ["Delta Species", "EX Delta Species"]},
    {"slug": "ex-unseen-forces",       "name": "Unseen Forces",       "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"UnseenForces",       "aliases": ["Unseen Forces", "EX Unseen Forces"]},
    {"slug": "ex-emerald",             "name": "Emerald",             "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"Emerald",            "aliases": ["Emerald", "EX Emerald"]},
    {"slug": "ex-deoxys",              "name": "Deoxys",              "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"Deoxys",             "aliases": ["Deoxys", "EX Deoxys"]},
    {"slug": "ex-team-rocket-returns", "name": "Team Rocket Returns", "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"TeamRocketReturns",  "aliases": ["Team Rocket Returns", "EX Team Rocket Returns"]},
    {"slug": "ex-firered-leafgreen",   "name": "FireRed & LeafGreen", "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"FireRedLeafGreen",   "aliases": ["FireRed & LeafGreen", "FireRed LeafGreen"]},
    {"slug": "ex-hidden-legends",      "name": "Hidden Legends",      "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"HiddenLegends",      "aliases": ["Hidden Legends", "EX Hidden Legends"]},
    {"slug": "ex-team-magma-aqua",     "name": "Team Magma vs Team Aqua","set_code":"EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"TeamMagmavsTeamAqua","aliases":["Team Magma vs Team Aqua"]},
    {"slug": "ex-dragon",              "name": "Dragon",              "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"Dragon",             "aliases": ["EX Dragon", "EX: Dragon"]},  # avoid ambiguity with Dragon Majesty etc.
    {"slug": "ex-sandstorm",           "name": "Sandstorm",           "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"Sandstorm",          "aliases": ["Sandstorm", "EX Sandstorm"]},
    {"slug": "ex-ruby-sapphire",       "name": "Ruby and Sapphire",   "set_code": "EX","era":"ex","tcg_api_id":None,"cardmarket_slug":"RubySapphire",       "aliases": ["Ruby and Sapphire", "Ruby & Sapphire"]},

    # ───────── Neo ─────────
    {"slug": "neo-destiny",    "name": "Neo Destiny",    "set_code": None, "era": "neo", "tcg_api_id": None, "cardmarket_slug": "NeoDestiny",    "aliases": ["Neo Destiny"]},
    {"slug": "neo-revelation", "name": "Neo Revelation", "set_code": None, "era": "neo", "tcg_api_id": None, "cardmarket_slug": "NeoRevelation", "aliases": ["Neo Revelation"]},
    {"slug": "neo-discovery",  "name": "Neo Discovery",  "set_code": None, "era": "neo", "tcg_api_id": None, "cardmarket_slug": "NeoDiscovery",  "aliases": ["Neo Discovery"]},
    {"slug": "neo-genesis",    "name": "Neo Genesis",    "set_code": None, "era": "neo", "tcg_api_id": None, "cardmarket_slug": "NeoGenesis",    "aliases": ["Neo Genesis"]},

    # ───────── Original ─────────
    {"slug": "gym-challenge",       "name": "Gym Challenge",        "set_code": None, "era": "original", "tcg_api_id": None, "cardmarket_slug": "GymChallenge",     "aliases": ["Gym Challenge"]},
    {"slug": "gym-heroes",          "name": "Gym Heroes",           "set_code": None, "era": "original", "tcg_api_id": None, "cardmarket_slug": "GymHeroes",        "aliases": ["Gym Heroes"]},
    {"slug": "team-rocket",         "name": "Team Rocket",          "set_code": None, "era": "original", "tcg_api_id": None, "cardmarket_slug": "TeamRocket",       "aliases": ["Team Rocket"]},
    {"slug": "base-set-2",          "name": "Base Set 2",           "set_code": None, "era": "original", "tcg_api_id": None, "cardmarket_slug": "BaseSet2",         "aliases": ["Base Set 2"]},
    {"slug": "fossil",              "name": "Fossil",               "set_code": None, "era": "original", "tcg_api_id": None, "cardmarket_slug": "Fossil",           "aliases": ["Fossil"]},
    {"slug": "jungle",              "name": "Jungle",               "set_code": None, "era": "original", "tcg_api_id": None, "cardmarket_slug": "Jungle",           "aliases": ["Jungle"]},
    {"slug": "base-set",            "name": "Base Set",             "set_code": None, "era": "original", "tcg_api_id": None, "cardmarket_slug": "BaseSet",          "aliases": ["Base Set"]},
    {"slug": "base-set-shadowless", "name": "Base Set (Shadowless)","set_code": None, "era": "original", "tcg_api_id": None, "cardmarket_slug": "BaseSetShadowless","aliases": ["Base Set (Shadowless)", "Base Set Shadowless"]},
]

# Era display labels (ordered)
ERAS: List[Dict] = [
    {"id": "modern",               "label": "Modern Era"},
    {"id": "scarlet-violet",       "label": "Scarlet & Violet"},
    {"id": "sword-shield",         "label": "Sword & Shield"},
    {"id": "sun-moon",             "label": "Sun & Moon"},
    {"id": "xy",                   "label": "XY"},
    {"id": "black-white",          "label": "Black & White"},
    {"id": "heartgold-soulsilver", "label": "HeartGold & SoulSilver"},
    {"id": "platinum",             "label": "Platinum"},
    {"id": "diamond-pearl",        "label": "Diamond & Pearl"},
    {"id": "ex",                   "label": "EX Series"},
    {"id": "neo",                  "label": "Neo"},
    {"id": "original",             "label": "Original"},
]

SET_BY_SLUG: Dict[str, Dict] = {s["slug"]: s for s in SETS}


def get_set(slug: str) -> Optional[Dict]:
    """Look up a set by its canonical slug."""
    return SET_BY_SLUG.get(slug)


def aliases_for(slug: str) -> List[str]:
    """Return the CardTrader/DB name aliases for a set slug. Empty if unknown."""
    s = SET_BY_SLUG.get(slug)
    return list(s["aliases"]) if s else []


def all_known_aliases_lowercase() -> List[str]:
    """Flat lowercase list of every known alias across all sets."""
    out = []
    for s in SETS:
        out.extend(a.lower() for a in s["aliases"])
    return out
