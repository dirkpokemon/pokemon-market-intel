export interface PokemonSet {
  id: string;           // slug voor URL
  name: string;         // weergavenaam
  era: string;          // groepering
  cardmarketSlug?: string; // voor sealed link
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
      { id: 'sv10-destined-rivals',    name: 'SV10: Destined Rivals',         era: 'scarlet-violet', cardmarketSlug: 'DestinedRivals' },
      { id: 'sv09-journey-together',   name: 'SV09: Journey Together',        era: 'scarlet-violet', cardmarketSlug: 'JourneyTogether' },
      { id: 'sv-prismatic-evolutions', name: 'SV: Prismatic Evolutions',      era: 'scarlet-violet', cardmarketSlug: 'PrismaticEvolutions' },
      { id: 'sv08-surging-sparks',     name: 'SV08: Surging Sparks',          era: 'scarlet-violet', cardmarketSlug: 'SurgingSparks' },
      { id: 'sv07-stellar-crown',      name: 'SV07: Stellar Crown',           era: 'scarlet-violet', cardmarketSlug: 'StellarCrown' },
      { id: 'sv-shrouded-fable',       name: 'SV: Shrouded Fable',            era: 'scarlet-violet', cardmarketSlug: 'ShroudedFable' },
      { id: 'sv06-twilight-masquerade',name: 'SV06: Twilight Masquerade',     era: 'scarlet-violet', cardmarketSlug: 'TwilightMasquerade' },
      { id: 'sv05-temporal-forces',    name: 'SV05: Temporal Forces',         era: 'scarlet-violet', cardmarketSlug: 'TemporalForces' },
      { id: 'sv-paldean-fates',        name: 'SV: Paldean Fates',             era: 'scarlet-violet', cardmarketSlug: 'PaldeanFates' },
      { id: 'sv04-paradox-rift',       name: 'SV04: Paradox Rift',            era: 'scarlet-violet', cardmarketSlug: 'ParadoxRift' },
      { id: 'sv-151',                  name: 'SV: Scarlet & Violet 151',      era: 'scarlet-violet', cardmarketSlug: 'ScarletViolet151' },
      { id: 'sv03-obsidian-flames',    name: 'SV03: Obsidian Flames',         era: 'scarlet-violet', cardmarketSlug: 'ObsidianFlames' },
      { id: 'sv02-paldea-evolved',     name: 'SV02: Paldea Evolved',          era: 'scarlet-violet', cardmarketSlug: 'PaldeaEvolved' },
      { id: 'sv01-base',               name: 'SV01: Scarlet & Violet Base Set',era: 'scarlet-violet', cardmarketSlug: 'ScarletViolet' },
    ],
  },
  {
    id: 'sword-shield',
    label: 'Sword & Shield',
    sets: [
      { id: 'crown-zenith-galarian',   name: 'Crown Zenith: Galarian Gallery',era: 'sword-shield', cardmarketSlug: 'CrownZenithGalarianGallery' },
      { id: 'crown-zenith',            name: 'Crown Zenith',                  era: 'sword-shield', cardmarketSlug: 'CrownZenith' },
      { id: 'swsh12-silver-tempest-tg',name: 'SWSH12: Silver Tempest Trainer Gallery', era: 'sword-shield', cardmarketSlug: 'SilverTempestTrainerGallery' },
      { id: 'swsh12-silver-tempest',   name: 'SWSH12: Silver Tempest',        era: 'sword-shield', cardmarketSlug: 'SilverTempest' },
      { id: 'swsh11-lost-origin',      name: 'SWSH11: Lost Origin',           era: 'sword-shield', cardmarketSlug: 'LostOrigin' },
      { id: 'swsh11-lost-origin-tg',   name: 'SWSH11: Lost Origin Trainer Gallery', era: 'sword-shield', cardmarketSlug: 'LostOriginTrainerGallery' },
      { id: 'pokemon-go',              name: 'Pokemon GO',                    era: 'sword-shield', cardmarketSlug: 'PokemonGO' },
      { id: 'swsh10-astral-radiance',  name: 'SWSH10: Astral Radiance',       era: 'sword-shield', cardmarketSlug: 'AstralRadiance' },
      { id: 'swsh10-astral-radiance-tg',name:'SWSH10: Astral Radiance Trainer Gallery',era: 'sword-shield', cardmarketSlug: 'AstralRadianceTrainerGallery' },
      { id: 'swsh09-brilliant-stars',  name: 'SWSH09: Brilliant Stars',       era: 'sword-shield', cardmarketSlug: 'BrilliantStars' },
      { id: 'swsh09-brilliant-stars-tg',name:'SWSH09: Brilliant Stars Trainer Gallery',era: 'sword-shield', cardmarketSlug: 'BrilliantStarsTrainerGallery' },
      { id: 'swsh08-fusion-strike',    name: 'SWSH08: Fusion Strike',         era: 'sword-shield', cardmarketSlug: 'FusionStrike' },
      { id: 'celebrations-classic',    name: 'Celebrations: Classic Collection',era: 'sword-shield', cardmarketSlug: 'CelebrationsClassicCollection' },
      { id: 'celebrations',            name: 'Celebrations',                  era: 'sword-shield', cardmarketSlug: 'Celebrations' },
      { id: 'swsh07-evolving-skies',   name: 'SWSH07: Evolving Skies',        era: 'sword-shield', cardmarketSlug: 'EvolvingSkies' },
      { id: 'swsh06-chilling-reign',   name: 'SWSH06: Chilling Reign',        era: 'sword-shield', cardmarketSlug: 'ChillingReign' },
      { id: 'swsh05-battle-styles',    name: 'SWSH05: Battle Styles',         era: 'sword-shield', cardmarketSlug: 'BattleStyles' },
      { id: 'shining-fates',           name: 'Shining Fates',                 era: 'sword-shield', cardmarketSlug: 'ShiningFates' },
      { id: 'shining-fates-sv',        name: 'Shining Fates: Shiny Vault',    era: 'sword-shield', cardmarketSlug: 'ShiningFatesShinyVault' },
      { id: 'swsh04-vivid-voltage',    name: 'SWSH04: Vivid Voltage',         era: 'sword-shield', cardmarketSlug: 'VividVoltage' },
      { id: 'champions-path',          name: "Champion's Path",               era: 'sword-shield', cardmarketSlug: 'ChampionsPath' },
      { id: 'swsh03-darkness-ablaze',  name: 'SWSH03: Darkness Ablaze',       era: 'sword-shield', cardmarketSlug: 'DarknessAblaze' },
      { id: 'swsh02-rebel-clash',      name: 'SWSH02: Rebel Clash',           era: 'sword-shield', cardmarketSlug: 'RebelClash' },
      { id: 'swsh01-base',             name: 'SWSH01: Sword & Shield Base Set',era: 'sword-shield', cardmarketSlug: 'SwordShield' },
    ],
  },
  {
    id: 'sun-moon',
    label: 'Sun & Moon',
    sets: [
      { id: 'sm-cosmic-eclipse',       name: 'SM - Cosmic Eclipse',           era: 'sun-moon', cardmarketSlug: 'CosmicEclipse' },
      { id: 'hidden-fates-sv',         name: 'Hidden Fates: Shiny Vault',     era: 'sun-moon', cardmarketSlug: 'HiddenFatesShinyVault' },
      { id: 'hidden-fates',            name: 'Hidden Fates',                  era: 'sun-moon', cardmarketSlug: 'HiddenFates' },
      { id: 'sm-unified-minds',        name: 'SM - Unified Minds',            era: 'sun-moon', cardmarketSlug: 'UnifiedMinds' },
      { id: 'sm-unbroken-bonds',       name: 'SM - Unbroken Bonds',           era: 'sun-moon', cardmarketSlug: 'UnbrokenBonds' },
      { id: 'detective-pikachu',       name: 'Detective Pikachu',             era: 'sun-moon', cardmarketSlug: 'DetectivePikachu' },
      { id: 'sm-team-up',              name: 'SM - Team Up',                  era: 'sun-moon', cardmarketSlug: 'TeamUp' },
      { id: 'sm-lost-thunder',         name: 'SM - Lost Thunder',             era: 'sun-moon', cardmarketSlug: 'LostThunder' },
      { id: 'dragon-majesty',          name: 'Dragon Majesty',                era: 'sun-moon', cardmarketSlug: 'DragonMajesty' },
      { id: 'sm-celestial-storm',      name: 'SM - Celestial Storm',          era: 'sun-moon', cardmarketSlug: 'CelestialStorm' },
      { id: 'sm-forbidden-light',      name: 'SM - Forbidden Light',          era: 'sun-moon', cardmarketSlug: 'ForbiddenLight' },
      { id: 'sm-ultra-prism',          name: 'SM - Ultra Prism',              era: 'sun-moon', cardmarketSlug: 'UltraPrism' },
      { id: 'sm-crimson-invasion',     name: 'SM - Crimson Invasion',         era: 'sun-moon', cardmarketSlug: 'CrimsonInvasion' },
      { id: 'shining-legends',         name: 'Shining Legends',               era: 'sun-moon', cardmarketSlug: 'ShiningLegends' },
      { id: 'sm-burning-shadows',      name: 'SM - Burning Shadows',          era: 'sun-moon', cardmarketSlug: 'BurningShadows' },
      { id: 'sm-guardians-rising',     name: 'SM - Guardians Rising',         era: 'sun-moon', cardmarketSlug: 'GuardiansRising' },
      { id: 'sm-base',                 name: 'SM Base Set',                   era: 'sun-moon', cardmarketSlug: 'SunMoon' },
    ],
  },
  {
    id: 'xy',
    label: 'XY',
    sets: [
      { id: 'xy-evolutions',           name: 'XY - Evolutions',               era: 'xy', cardmarketSlug: 'Evolutions' },
      { id: 'xy-steam-siege',          name: 'XY - Steam Siege',              era: 'xy', cardmarketSlug: 'SteamSiege' },
      { id: 'xy-fates-collide',        name: 'XY - Fates Collide',            era: 'xy', cardmarketSlug: 'FatesCollide' },
      { id: 'generations-rc',          name: 'Generations: Radiant Collection',era: 'xy', cardmarketSlug: 'GenerationsRadiantCollection' },
      { id: 'generations',             name: 'Generations',                   era: 'xy', cardmarketSlug: 'Generations' },
      { id: 'xy-breakpoint',           name: 'XY - BREAKpoint',               era: 'xy', cardmarketSlug: 'BREAKpoint' },
      { id: 'xy-breakthrough',         name: 'XY - BREAKthrough',             era: 'xy', cardmarketSlug: 'BREAKthrough' },
      { id: 'xy-ancient-origins',      name: 'XY - Ancient Origins',          era: 'xy', cardmarketSlug: 'AncientOrigins' },
      { id: 'xy-roaring-skies',        name: 'XY - Roaring Skies',            era: 'xy', cardmarketSlug: 'RoaringSkies' },
      { id: 'xy-primal-clash',         name: 'XY - Primal Clash',             era: 'xy', cardmarketSlug: 'PrimalClash' },
      { id: 'xy-phantom-forces',       name: 'XY - Phantom Forces',           era: 'xy', cardmarketSlug: 'PhantomForces' },
      { id: 'xy-furious-fists',        name: 'XY - Furious Fists',            era: 'xy', cardmarketSlug: 'FuriousFists' },
      { id: 'xy-flashfire',            name: 'XY - Flashfire',                era: 'xy', cardmarketSlug: 'Flashfire' },
      { id: 'xy-base',                 name: 'XY Base Set',                   era: 'xy', cardmarketSlug: 'XY' },
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
