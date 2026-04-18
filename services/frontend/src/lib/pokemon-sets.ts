export interface PokemonSet {
  id: string;           // slug voor URL
  name: string;         // weergavenaam
  era: string;          // groepering
  cardmarketSlug?: string; // voor sealed link
  tcgApiId?: string;    // Pokémon TCG API set ID → logo + symbol
}

/** Logo URL from the Pokémon TCG CDN (no API key needed) */
export function setLogoUrl(set: PokemonSet): string | null {
  if (!set.tcgApiId) return null;
  return `https://images.pokemontcg.io/${set.tcgApiId}/logo.png`;
}

/** Symbol icon URL from the Pokémon TCG CDN */
export function setSymbolUrl(set: PokemonSet): string | null {
  if (!set.tcgApiId) return null;
  return `https://images.pokemontcg.io/${set.tcgApiId}/symbol.png`;
}

export interface Era {
  id: string;
  label: string;
  sets: PokemonSet[];
}

export const ERAS: Era[] = [
  {
    id: 'modern',
    label: 'Modern Era',
    sets: [
      { id: 'me-ascended-heroes',      name: 'ME: Ascended Heroes',           era: 'modern', cardmarketSlug: 'AscendedHeroes' },
      { id: 'me02-phantasmal-flames',  name: 'ME02: Phantasmal Flames',       era: 'modern', cardmarketSlug: 'PhantasmalFlames' },
      { id: 'me01-mega-evolution',     name: 'ME01: Mega Evolution',          era: 'modern', cardmarketSlug: 'MegaEvolution' },
    ],
  },
  {
    id: 'scarlet-violet',
    label: 'Scarlet & Violet',
    sets: [
      { id: 'sv-black-bolt',           name: 'SV: Black Bolt',                era: 'scarlet-violet', cardmarketSlug: 'BlackBolt' },
      { id: 'sv-white-flare',          name: 'SV: White Flare',               era: 'scarlet-violet', cardmarketSlug: 'WhiteFlare' },
      { id: 'sv10-destined-rivals',    name: 'SV10: Destined Rivals',         era: 'scarlet-violet', cardmarketSlug: 'DestinedRivals',       tcgApiId: 'sv10' },
      { id: 'sv09-journey-together',   name: 'SV09: Journey Together',        era: 'scarlet-violet', cardmarketSlug: 'JourneyTogether',      tcgApiId: 'sv9' },
      { id: 'sv-prismatic-evolutions', name: 'SV: Prismatic Evolutions',      era: 'scarlet-violet', cardmarketSlug: 'PrismaticEvolutions',  tcgApiId: 'sv8pt5' },
      { id: 'sv08-surging-sparks',     name: 'SV08: Surging Sparks',          era: 'scarlet-violet', cardmarketSlug: 'SurgingSparks',        tcgApiId: 'sv8' },
      { id: 'sv07-stellar-crown',      name: 'SV07: Stellar Crown',           era: 'scarlet-violet', cardmarketSlug: 'StellarCrown',         tcgApiId: 'sv7' },
      { id: 'sv-shrouded-fable',       name: 'SV: Shrouded Fable',            era: 'scarlet-violet', cardmarketSlug: 'ShroudedFable',        tcgApiId: 'sv6pt5' },
      { id: 'sv06-twilight-masquerade',name: 'SV06: Twilight Masquerade',     era: 'scarlet-violet', cardmarketSlug: 'TwilightMasquerade',   tcgApiId: 'sv6' },
      { id: 'sv05-temporal-forces',    name: 'SV05: Temporal Forces',         era: 'scarlet-violet', cardmarketSlug: 'TemporalForces',       tcgApiId: 'sv5' },
      { id: 'sv-paldean-fates',        name: 'SV: Paldean Fates',             era: 'scarlet-violet', cardmarketSlug: 'PaldeanFates',         tcgApiId: 'sv4pt5' },
      { id: 'sv04-paradox-rift',       name: 'SV04: Paradox Rift',            era: 'scarlet-violet', cardmarketSlug: 'ParadoxRift',          tcgApiId: 'sv4' },
      { id: 'sv-151',                  name: 'SV: Scarlet & Violet 151',      era: 'scarlet-violet', cardmarketSlug: 'ScarletViolet151',     tcgApiId: 'sv3pt5' },
      { id: 'sv03-obsidian-flames',    name: 'SV03: Obsidian Flames',         era: 'scarlet-violet', cardmarketSlug: 'ObsidianFlames',       tcgApiId: 'sv3' },
      { id: 'sv02-paldea-evolved',     name: 'SV02: Paldea Evolved',          era: 'scarlet-violet', cardmarketSlug: 'PaldeaEvolved',        tcgApiId: 'sv2' },
      { id: 'sv01-base',               name: 'SV01: Scarlet & Violet Base Set',era: 'scarlet-violet', cardmarketSlug: 'ScarletViolet',       tcgApiId: 'sv1' },
    ],
  },
  {
    id: 'sword-shield',
    label: 'Sword & Shield',
    sets: [
      { id: 'crown-zenith-galarian',    name: 'Crown Zenith: Galarian Gallery', era: 'sword-shield', cardmarketSlug: 'CrownZenithGalarianGallery', tcgApiId: 'swsh12pt5' },
      { id: 'crown-zenith',             name: 'Crown Zenith',                   era: 'sword-shield', cardmarketSlug: 'CrownZenith',               tcgApiId: 'swsh12pt5' },
      { id: 'swsh12-silver-tempest-tg', name: 'SWSH12: Silver Tempest TG',      era: 'sword-shield', cardmarketSlug: 'SilverTempestTrainerGallery',tcgApiId: 'swsh12tg' },
      { id: 'swsh12-silver-tempest',    name: 'SWSH12: Silver Tempest',         era: 'sword-shield', cardmarketSlug: 'SilverTempest',             tcgApiId: 'swsh12' },
      { id: 'swsh11-lost-origin',       name: 'SWSH11: Lost Origin',            era: 'sword-shield', cardmarketSlug: 'LostOrigin',                tcgApiId: 'swsh11' },
      { id: 'swsh11-lost-origin-tg',    name: 'SWSH11: Lost Origin TG',         era: 'sword-shield', cardmarketSlug: 'LostOriginTrainerGallery',  tcgApiId: 'swsh11tg' },
      { id: 'pokemon-go',               name: 'Pokemon GO',                     era: 'sword-shield', cardmarketSlug: 'PokemonGO',                 tcgApiId: 'pgo' },
      { id: 'swsh10-astral-radiance',   name: 'SWSH10: Astral Radiance',        era: 'sword-shield', cardmarketSlug: 'AstralRadiance',            tcgApiId: 'swsh10' },
      { id: 'swsh10-astral-radiance-tg',name: 'SWSH10: Astral Radiance TG',    era: 'sword-shield', cardmarketSlug: 'AstralRadianceTrainerGallery',tcgApiId: 'swsh10tg' },
      { id: 'swsh09-brilliant-stars',   name: 'SWSH09: Brilliant Stars',        era: 'sword-shield', cardmarketSlug: 'BrilliantStars',            tcgApiId: 'swsh9' },
      { id: 'swsh09-brilliant-stars-tg',name: 'SWSH09: Brilliant Stars TG',    era: 'sword-shield', cardmarketSlug: 'BrilliantStarsTrainerGallery',tcgApiId: 'swsh9tg' },
      { id: 'swsh08-fusion-strike',     name: 'SWSH08: Fusion Strike',          era: 'sword-shield', cardmarketSlug: 'FusionStrike',              tcgApiId: 'swsh8' },
      { id: 'celebrations-classic',     name: 'Celebrations: Classic Collection',era: 'sword-shield', cardmarketSlug: 'CelebrationsClassicCollection', tcgApiId: 'cel25c' },
      { id: 'celebrations',             name: 'Celebrations',                   era: 'sword-shield', cardmarketSlug: 'Celebrations',              tcgApiId: 'cel25' },
      { id: 'swsh07-evolving-skies',    name: 'SWSH07: Evolving Skies',         era: 'sword-shield', cardmarketSlug: 'EvolvingSkies',             tcgApiId: 'swsh7' },
      { id: 'swsh06-chilling-reign',    name: 'SWSH06: Chilling Reign',         era: 'sword-shield', cardmarketSlug: 'ChillingReign',             tcgApiId: 'swsh6' },
      { id: 'swsh05-battle-styles',     name: 'SWSH05: Battle Styles',          era: 'sword-shield', cardmarketSlug: 'BattleStyles',              tcgApiId: 'swsh5' },
      { id: 'shining-fates',            name: 'Shining Fates',                  era: 'sword-shield', cardmarketSlug: 'ShiningFates',              tcgApiId: 'swsh4pt5' },
      { id: 'shining-fates-sv',         name: 'Shining Fates: Shiny Vault',     era: 'sword-shield', cardmarketSlug: 'ShiningFatesShinyVault',     tcgApiId: 'swsh4pt5' },
      { id: 'swsh04-vivid-voltage',     name: 'SWSH04: Vivid Voltage',          era: 'sword-shield', cardmarketSlug: 'VividVoltage',              tcgApiId: 'swsh4' },
      { id: 'champions-path',           name: "Champion's Path",                era: 'sword-shield', cardmarketSlug: 'ChampionsPath',             tcgApiId: 'swsh3pt5' },
      { id: 'swsh03-darkness-ablaze',   name: 'SWSH03: Darkness Ablaze',        era: 'sword-shield', cardmarketSlug: 'DarknessAblaze',            tcgApiId: 'swsh3' },
      { id: 'swsh02-rebel-clash',       name: 'SWSH02: Rebel Clash',            era: 'sword-shield', cardmarketSlug: 'RebelClash',                tcgApiId: 'swsh2' },
      { id: 'swsh01-base',              name: 'SWSH01: Sword & Shield Base Set', era: 'sword-shield', cardmarketSlug: 'SwordShield',              tcgApiId: 'swsh1' },
    ],
  },
  {
    id: 'sun-moon',
    label: 'Sun & Moon',
    sets: [
      { id: 'sm-cosmic-eclipse',       name: 'SM - Cosmic Eclipse',           era: 'sun-moon', cardmarketSlug: 'CosmicEclipse',    tcgApiId: 'sm12' },
      { id: 'hidden-fates-sv',         name: 'Hidden Fates: Shiny Vault',     era: 'sun-moon', cardmarketSlug: 'HiddenFatesShinyVault', tcgApiId: 'smp' },
      { id: 'hidden-fates',            name: 'Hidden Fates',                  era: 'sun-moon', cardmarketSlug: 'HiddenFates',       tcgApiId: 'sm11pt5' },
      { id: 'sm-unified-minds',        name: 'SM - Unified Minds',            era: 'sun-moon', cardmarketSlug: 'UnifiedMinds',      tcgApiId: 'sm11' },
      { id: 'sm-unbroken-bonds',       name: 'SM - Unbroken Bonds',           era: 'sun-moon', cardmarketSlug: 'UnbrokenBonds',     tcgApiId: 'sm10' },
      { id: 'detective-pikachu',       name: 'Detective Pikachu',             era: 'sun-moon', cardmarketSlug: 'DetectivePikachu',  tcgApiId: 'det1' },
      { id: 'sm-team-up',              name: 'SM - Team Up',                  era: 'sun-moon', cardmarketSlug: 'TeamUp',            tcgApiId: 'sm9' },
      { id: 'sm-lost-thunder',         name: 'SM - Lost Thunder',             era: 'sun-moon', cardmarketSlug: 'LostThunder',       tcgApiId: 'sm8' },
      { id: 'dragon-majesty',          name: 'Dragon Majesty',                era: 'sun-moon', cardmarketSlug: 'DragonMajesty',     tcgApiId: 'sm7a' },
      { id: 'sm-celestial-storm',      name: 'SM - Celestial Storm',          era: 'sun-moon', cardmarketSlug: 'CelestialStorm',    tcgApiId: 'sm7' },
      { id: 'sm-forbidden-light',      name: 'SM - Forbidden Light',          era: 'sun-moon', cardmarketSlug: 'ForbiddenLight',    tcgApiId: 'sm6' },
      { id: 'sm-ultra-prism',          name: 'SM - Ultra Prism',              era: 'sun-moon', cardmarketSlug: 'UltraPrism',        tcgApiId: 'sm5' },
      { id: 'sm-crimson-invasion',     name: 'SM - Crimson Invasion',         era: 'sun-moon', cardmarketSlug: 'CrimsonInvasion',   tcgApiId: 'sm4' },
      { id: 'shining-legends',         name: 'Shining Legends',               era: 'sun-moon', cardmarketSlug: 'ShiningLegends',    tcgApiId: 'sm35' },
      { id: 'sm-burning-shadows',      name: 'SM - Burning Shadows',          era: 'sun-moon', cardmarketSlug: 'BurningShadows',    tcgApiId: 'sm3' },
      { id: 'sm-guardians-rising',     name: 'SM - Guardians Rising',         era: 'sun-moon', cardmarketSlug: 'GuardiansRising',   tcgApiId: 'sm2' },
      { id: 'sm-base',                 name: 'SM Base Set',                   era: 'sun-moon', cardmarketSlug: 'SunMoon',           tcgApiId: 'sm1' },
    ],
  },
  {
    id: 'xy',
    label: 'XY',
    sets: [
      { id: 'xy-evolutions',           name: 'XY - Evolutions',               era: 'xy', cardmarketSlug: 'Evolutions',   tcgApiId: 'xy12' },
      { id: 'xy-steam-siege',          name: 'XY - Steam Siege',              era: 'xy', cardmarketSlug: 'SteamSiege',   tcgApiId: 'xy11' },
      { id: 'xy-fates-collide',        name: 'XY - Fates Collide',            era: 'xy', cardmarketSlug: 'FatesCollide', tcgApiId: 'xy10' },
      { id: 'generations-rc',          name: 'Generations: Radiant Collection',era: 'xy', cardmarketSlug: 'GenerationsRadiantCollection', tcgApiId: 'g1' },
      { id: 'generations',             name: 'Generations',                   era: 'xy', cardmarketSlug: 'Generations',  tcgApiId: 'g1' },
      { id: 'xy-breakpoint',           name: 'XY - BREAKpoint',               era: 'xy', cardmarketSlug: 'BREAKpoint',  tcgApiId: 'xy9' },
      { id: 'xy-breakthrough',         name: 'XY - BREAKthrough',             era: 'xy', cardmarketSlug: 'BREAKthrough',tcgApiId: 'xy8' },
      { id: 'xy-ancient-origins',      name: 'XY - Ancient Origins',          era: 'xy', cardmarketSlug: 'AncientOrigins', tcgApiId: 'xy7' },
      { id: 'xy-roaring-skies',        name: 'XY - Roaring Skies',            era: 'xy', cardmarketSlug: 'RoaringSkies', tcgApiId: 'xy6' },
      { id: 'xy-primal-clash',         name: 'XY - Primal Clash',             era: 'xy', cardmarketSlug: 'PrimalClash', tcgApiId: 'xy5' },
      { id: 'xy-phantom-forces',       name: 'XY - Phantom Forces',           era: 'xy', cardmarketSlug: 'PhantomForces', tcgApiId: 'xy4' },
      { id: 'xy-furious-fists',        name: 'XY - Furious Fists',            era: 'xy', cardmarketSlug: 'FuriousFists', tcgApiId: 'xy3' },
      { id: 'xy-flashfire',            name: 'XY - Flashfire',                era: 'xy', cardmarketSlug: 'Flashfire',   tcgApiId: 'xy2' },
      { id: 'xy-base',                 name: 'XY Base Set',                   era: 'xy', cardmarketSlug: 'XY',          tcgApiId: 'xy1' },
    ],
  },
  {
    id: 'black-white',
    label: 'Black & White',
    sets: [
      { id: 'bw-legendary-treasures',  name: 'Legendary Treasures',           era: 'black-white', cardmarketSlug: 'LegendaryTreasures' },
      { id: 'bw-legendary-treasures-rc',name:'Legendary Treasures: Radiant Collection',era: 'black-white', cardmarketSlug: 'LegendaryTreasuresRadiantCollection' },
      { id: 'bw-plasma-blast',         name: 'Plasma Blast',                  era: 'black-white', cardmarketSlug: 'PlasmaBlast' },
      { id: 'bw-plasma-freeze',        name: 'Plasma Freeze',                 era: 'black-white', cardmarketSlug: 'PlasmaFreeze' },
      { id: 'bw-plasma-storm',         name: 'Plasma Storm',                  era: 'black-white', cardmarketSlug: 'PlasmaStorm' },
      { id: 'bw-boundaries-crossed',   name: 'Boundaries Crossed',            era: 'black-white', cardmarketSlug: 'BoundariesCrossed' },
      { id: 'bw-dragons-exalted',      name: 'Dragons Exalted',               era: 'black-white', cardmarketSlug: 'DragonsExalted' },
      { id: 'bw-dark-explorers',       name: 'Dark Explorers',                era: 'black-white', cardmarketSlug: 'DarkExplorers' },
      { id: 'bw-next-destinies',       name: 'Next Destinies',                era: 'black-white', cardmarketSlug: 'NextDestinies' },
      { id: 'bw-noble-victories',      name: 'Noble Victories',               era: 'black-white', cardmarketSlug: 'NobleVictories' },
      { id: 'bw-emerging-powers',      name: 'Emerging Powers',               era: 'black-white', cardmarketSlug: 'EmergingPowers' },
      { id: 'bw-base',                 name: 'Black and White',               era: 'black-white', cardmarketSlug: 'BlackWhite' },
    ],
  },
  {
    id: 'heartgold-soulsilver',
    label: 'HeartGold & SoulSilver',
    sets: [
      { id: 'hgss-call-of-legends',    name: 'Call of Legends',               era: 'heartgold-soulsilver', cardmarketSlug: 'CallofLegends' },
      { id: 'hgss-triumphant',         name: 'Triumphant',                    era: 'heartgold-soulsilver', cardmarketSlug: 'Triumphant' },
      { id: 'hgss-undaunted',          name: 'Undaunted',                     era: 'heartgold-soulsilver', cardmarketSlug: 'Undaunted' },
      { id: 'hgss-unleashed',          name: 'Unleashed',                     era: 'heartgold-soulsilver', cardmarketSlug: 'Unleashed' },
      { id: 'hgss-base',               name: 'HeartGold SoulSilver',          era: 'heartgold-soulsilver', cardmarketSlug: 'HeartGoldSoulSilver' },
    ],
  },
  {
    id: 'platinum',
    label: 'Platinum',
    sets: [
      { id: 'pl-arceus',               name: 'Arceus',                        era: 'platinum', cardmarketSlug: 'Arceus' },
      { id: 'pl-supreme-victors',      name: 'Supreme Victors',               era: 'platinum', cardmarketSlug: 'SupremeVictors' },
      { id: 'pl-rising-rivals',        name: 'Rising Rivals',                 era: 'platinum', cardmarketSlug: 'RisingRivals' },
      { id: 'pl-base',                 name: 'Platinum',                      era: 'platinum', cardmarketSlug: 'Platinum' },
    ],
  },
  {
    id: 'diamond-pearl',
    label: 'Diamond & Pearl',
    sets: [
      { id: 'dp-stormfront',           name: 'Stormfront',                    era: 'diamond-pearl', cardmarketSlug: 'Stormfront' },
      { id: 'dp-legends-awakened',     name: 'Legends Awakened',              era: 'diamond-pearl', cardmarketSlug: 'LegendsAwakened' },
      { id: 'dp-majestic-dawn',        name: 'Majestic Dawn',                 era: 'diamond-pearl', cardmarketSlug: 'MajesticDawn' },
      { id: 'dp-great-encounters',     name: 'Great Encounters',              era: 'diamond-pearl', cardmarketSlug: 'GreatEncounters' },
      { id: 'dp-secret-wonders',       name: 'Secret Wonders',                era: 'diamond-pearl', cardmarketSlug: 'SecretWonders' },
      { id: 'dp-mysterious-treasures', name: 'Mysterious Treasures',          era: 'diamond-pearl', cardmarketSlug: 'MysteriousTreasures' },
      { id: 'dp-base',                 name: 'Diamond and Pearl',             era: 'diamond-pearl', cardmarketSlug: 'DiamondPearl' },
    ],
  },
  {
    id: 'ex',
    label: 'EX Series',
    sets: [
      { id: 'ex-power-keepers',        name: 'Power Keepers',                 era: 'ex', cardmarketSlug: 'PowerKeepers' },
      { id: 'ex-dragon-frontiers',     name: 'Dragon Frontiers',              era: 'ex', cardmarketSlug: 'DragonFrontiers' },
      { id: 'ex-crystal-guardians',    name: 'Crystal Guardians',             era: 'ex', cardmarketSlug: 'CrystalGuardians' },
      { id: 'ex-holon-phantoms',       name: 'Holon Phantoms',                era: 'ex', cardmarketSlug: 'HolonPhantoms' },
      { id: 'ex-legend-maker',         name: 'Legend Maker',                  era: 'ex', cardmarketSlug: 'LegendMaker' },
      { id: 'ex-delta-species',        name: 'Delta Species',                 era: 'ex', cardmarketSlug: 'DeltaSpecies' },
      { id: 'ex-unseen-forces',        name: 'Unseen Forces',                 era: 'ex', cardmarketSlug: 'UnseenForces' },
      { id: 'ex-emerald',              name: 'Emerald',                       era: 'ex', cardmarketSlug: 'Emerald' },
      { id: 'ex-deoxys',               name: 'Deoxys',                        era: 'ex', cardmarketSlug: 'Deoxys' },
      { id: 'ex-team-rocket-returns',  name: 'Team Rocket Returns',           era: 'ex', cardmarketSlug: 'TeamRocketReturns' },
      { id: 'ex-firered-leafgreen',    name: 'FireRed & LeafGreen',           era: 'ex', cardmarketSlug: 'FireRedLeafGreen' },
      { id: 'ex-hidden-legends',       name: 'Hidden Legends',                era: 'ex', cardmarketSlug: 'HiddenLegends' },
      { id: 'ex-team-magma-aqua',      name: 'Team Magma vs Team Aqua',       era: 'ex', cardmarketSlug: 'TeamMagmavsTeamAqua' },
      { id: 'ex-dragon',               name: 'Dragon',                        era: 'ex', cardmarketSlug: 'Dragon' },
      { id: 'ex-sandstorm',            name: 'Sandstorm',                     era: 'ex', cardmarketSlug: 'Sandstorm' },
      { id: 'ex-ruby-sapphire',        name: 'Ruby and Sapphire',             era: 'ex', cardmarketSlug: 'RubySapphire' },
    ],
  },
  {
    id: 'neo',
    label: 'Neo',
    sets: [
      { id: 'neo-destiny',             name: 'Neo Destiny',                   era: 'neo', cardmarketSlug: 'NeoDestiny' },
      { id: 'neo-revelation',          name: 'Neo Revelation',                era: 'neo', cardmarketSlug: 'NeoRevelation' },
      { id: 'neo-discovery',           name: 'Neo Discovery',                 era: 'neo', cardmarketSlug: 'NeoDiscovery' },
      { id: 'neo-genesis',             name: 'Neo Genesis',                   era: 'neo', cardmarketSlug: 'NeoGenesis' },
    ],
  },
  {
    id: 'original',
    label: 'Original',
    sets: [
      { id: 'gym-challenge',           name: 'Gym Challenge',                 era: 'original', cardmarketSlug: 'GymChallenge' },
      { id: 'gym-heroes',              name: 'Gym Heroes',                    era: 'original', cardmarketSlug: 'GymHeroes' },
      { id: 'team-rocket',             name: 'Team Rocket',                   era: 'original', cardmarketSlug: 'TeamRocket' },
      { id: 'base-set-2',              name: 'Base Set 2',                    era: 'original', cardmarketSlug: 'BaseSet2' },
      { id: 'fossil',                  name: 'Fossil',                        era: 'original', cardmarketSlug: 'Fossil' },
      { id: 'jungle',                  name: 'Jungle',                        era: 'original', cardmarketSlug: 'Jungle' },
      { id: 'base-set',                name: 'Base Set',                      era: 'original', cardmarketSlug: 'BaseSet' },
      { id: 'base-set-shadowless',     name: 'Base Set (Shadowless)',         era: 'original', cardmarketSlug: 'BaseSetShadowless' },
    ],
  },
];

// Flat lijst van alle sets
export const ALL_SETS: PokemonSet[] = ERAS.flatMap(e => e.sets);

// Zoek set op id
export function findSetById(id: string): PokemonSet | undefined {
  return ALL_SETS.find(s => s.id === id);
}

// Zoek set op naam (fuzzy match voor DB-namen)
export function findSetByName(name: string): PokemonSet | undefined {
  const lower = name.toLowerCase();
  return ALL_SETS.find(s => s.name.toLowerCase() === lower || s.name.toLowerCase().includes(lower));
}

// CardMarket sealed product URL
export function cardmarketSealedUrl(set: PokemonSet): string {
  const slug = set.cardmarketSlug || encodeURIComponent(set.name);
  return `https://www.cardmarket.com/en/Pokemon/Products/Booster-Boxes?searchString=${encodeURIComponent(set.name)}&sortBy=price_asc`;
}

// CardMarket singles URL voor een set
export function cardmarketSinglesUrl(set: PokemonSet): string {
  return `https://www.cardmarket.com/en/Pokemon/Products/Singles?searchString=${encodeURIComponent(set.name)}&sortBy=price_asc`;
}
