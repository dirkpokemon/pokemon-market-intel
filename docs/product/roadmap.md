# Productrichting & roadmap — TCG Pulse

*Vastgelegd: 25 oktober 2026, op basis van marktonderzoek (zie onderaan voor bronnen en beperkingen). De propositie (voor wie, waarom, wat is uniek) staat in [`propositie.md`](propositie.md).*

## Positionering

> **De eerlijke prijscheck voor Pokémon in Europa: weet wat een kaart écht kost — inclusief verzending — en of een deal te mooi is om waar te zijn.**

- **Neutraal**: we zijn geen opkoper of winkel, dus we hebben geen belang bij een lage of hoge prijs.
- **EU-first en Nederlandstalig**: euro-prijzen, Europese verkopers, Europese verzending.
- **Unieke data**: elke dag élke CardTrader-listing (~340.000 per run, met conditie en taal). Concurrenten tonen vooral één trendgetal uit de Cardmarket-prijsgids; wij zien ook het **aanbod**: hoeveel listings er zijn, wat de goedkoopste is en hoe dat verschuift.

## Problemen van Europese verzamelaars (onderzoek oktober 2026)

| # | Probleem | Bewijs | Grootte |
|---|---|---|---|
| 1 | Oplichting bij kopen buiten Cardmarket | Politie NL: >3.500 aangiften in 5 jaar, 95% Pokémon, gemiddeld €415 schade; 80% via marktplaatsen/sociale media. Grootste waarschuwingssignaal: onrealistisch lage prijs. Vinted "overspoeld" met proxies. | Zeer groot, groeit |
| 2 | Verzendkosten maken kleine aankopen absurd | Voorbeeld: 7 kaarten €0,77 + €13,70 verzending. Elke verkoper rekent apart verzendkosten; geen tool optimaliseert een hele lijst over verkopers. | Groot, dagelijks |
| 3 | "Wat is dit waard?" voor leken/ouders | Taxaties €5/kaart tot €29,95; opkopers bieden 70–90% van marktwaarde. Geen neutraal referentiepunt. | Groot, slecht bediend |
| 4 | Onzekerheid door de daling van 2026 | Modern −20–45%, sealed −15–25% t.o.v. eind 2025; "crash"-paniek op Reddit/YouTube/TikTok. | Actueel |
| 5 | US-prijzen kloppen niet voor de EU | Collectr e.d. leunen op TCGplayer; EU wijkt 20–40% af. | Deels opgelost door concurrenten |
| 6 | Graden is ingewikkeld | PSA $18–50/kaart + douane + 2–3 maanden; EU-alternatieven (AP Grading €19,90). Niemand rekent het rendement uit. | Middel |
| 7 | Scalpers en restocks | Uitverkocht in minuten, doorverkoop voor 2–3× de winkelprijs. | Groot, maar **TCGRadar** bedient dit al (290+ winkels) |

## Roadmap (volgorde = impact)

### 1. Gratis "Is dit een eerlijke prijs?"-check — *gebouwd (oktober 2026)*

Live als `/prijscheck`. Daarbij ook opgelost: varianten met dezelfde naam in één set (gewone vs. SIR) worden niet meer samengevoegd.
Probleem 1 en 3. Gebruiker plakt een prijs (of advertentietekst) van Marktplaats/Vinted/Facebook en ziet direct:
- de gebruikelijke laagste prijs en de normale prijs in de EU (uit `market_statistics`: `floor_price_30d`, `avg_price_30d`, `current_price`);
- een rode vlag bij "veel te goedkoop" (fraudesignaal) of "duur";
- wat een eerlijk inkoopbod is (70–90% van de marktwaarde) — voor ouders die een collectie verkopen.

Gratis, zonder account, deelbaar. Instap voor nieuwe gebruikers. Technisch het eenvoudigst: de data bestaat al.

### 2. Lijst-/deckprijs inclusief verzending
Probleem 2. Plak een wantlist of decklist → goedkoopste combinatie over CardTrader (incl. gebundelde verzending via CardTrader Zero) en Cardmarket. Geen bestaande tool rekent een decklist in euro's mét verzending.
- Stap 1 (oktober 2026): de scraper slaat per listing een **pseudonieme verkoper-sleutel** (`seller_key`, HMAC van het CardTrader-user-id met `SELLER_KEY_SECRET`; nooit de naam), het **land** (`seller_country`) en **Zero-geschiktheid** (`ships_via_zero`) op. Listings van verkopers op vakantie worden overgeslagen.
- Nog te doen: de optimizer en de pagina `/lijstprijs`. CardTrader levert geen verzendtarieven in de listing-data, dus die beginnen als schatting per land en een vast Zero-tarief. Cardmarket heeft alleen de prijsgids, dus eerst alleen CardTrader.

### 3. Koop-/wachtsignaal op basis van aanbod
Probleem 4. Stijgt het aantal listings terwijl de laagste prijs zakt → wachten is waarschijnlijk slim. Die data hebben we al (`volume_*`, `volume_trend_7d`, daily aggregates). Past beter bij een correctiejaar dan alleen "deal scores".

### 4. Graden: wel of niet?
Probleem 6. Rekenhulp met EU-kosten (PSA Frankfurt, AP Grading, douane, verzending) tegenover de meerprijs van een graded kaart. Vereist graded-prijsdata (nog te bepalen welke bron).

### 5. Japanse kaarten als aparte lijn
Snelst groeiende segment in Europa. Let op: de analyse filtert nu op `INCLUDED_LANGUAGES = ['EN']`. Taal moet dan een **dimensie** worden (aparte statistieken per taal), geen filter.

### Niet doen
- **Geen eigen restock-tracker**: TCGRadar is daar sterk. Wél: bij sealed tonen of de winkelprijs een goede koop is t.o.v. de doorverkoopmarkt.

## Prijsstrategie

Plus kost nu **€19/maand**. Concurrenten: PokéCardex ~€3,99, Pokedata $7,99, Collectr freemium.
- Prijscheck (#1) gratis houden.
- Plus richting **€5–8/maand** of een jaarabonnement.
- Betaald: lijst-optimizer (#2), onbeperkt alerts, prijsgeschiedenis, graden-advies (#4).

## Beperkingen van het onderzoek & vervolg

- Reddit, YouTube, Instagram en Facebook konden **niet rechtstreeks** gelezen worden (netwerkbeperking van de cloud-omgeving; Reddit weert bovendien zoekbots). Het bewijs komt uit webzoeken: politiecijfers, nieuws, fora (gutefrage), app-reviews, Trustpilot-samenvattingen, gidsen en blogs — veel daarvan commercieel.
- **Vervolg**: zodra `reddit.com` en `youtube.com` in de netwerktoegang staan, het onderzoek herhalen met echte threads (r/PokemonTCG, r/PokemonTCGDeals, r/pkmntcgcollections) en YouTube-ondertitels van EU-creators, en de probleemtabel hierboven bijwerken.

## Bronnen (selectie)

- [AVROTROS Opgelicht – fraude met Pokémonkaarten](https://opgelicht.avrotros.nl/nieuws/fraude-met-pokemonkaarten-rond-30-jarig-jubileum-gemiddeld-415-euro-schade-per-aangifte-rond-ruilkaarten-20534)
- [Pokemon Bank – waarschuwingslijst](https://www.pokemonbank.nl/waarschuwingslijst-verdachte-tcg-accounts/)
- [gutefrage – Cardmarket verzendkosten](https://www.gutefrage.net/frage/cardmarket-mehr-karten-von-selben-haendler)
- [Trustpilot – Cardmarket](https://au.trustpilot.com/review/cardmarket.com) · [Trustpilot – CardTrader](https://ca.trustpilot.com/review/cardtrader.com?page=2)
- [CardTrader FAQ (Zero)](https://static.cardtrader.com/en/pages/faq)
- [kaartenverzamelen.nl – waarde bepalen](https://kaartenverzamelen.nl/blogs/pokemon-kaarten/waarde-pokemon-kaarten-bepalen-tips-gratis-taxatie)
- [slabfol.io – market 2026](https://slabfol.io/blog/pokemon-card-market-crash-2026) · [TCGplayer – prices dropping](https://seller.tcgplayer.com/blog/price-trends-pok%C3%A9mon-cards-dropping-in-price-07-29-2026)
- [MonZap – TCGplayer vs Cardmarket](https://www.monzaptcg.com/guides/tcgplayer-vs-cardmarket-pokemon-card-prices/)
- [TCGinvest – Collectr alternatives](https://tcginvest.io/blog/collectr-alternatives) · [CollectHolo – trackers](https://www.collectholo.com/best-pokemon-card-trackers)
- [TCGRadar](https://tcgradar.eu/)
- [La Maison du TCG – PSA vanuit Europa](https://lamaisondutcg.com/en/guides/combien-coute-gradation-psa-france) · [AP Grading](https://www.apgrading.net/psa-grading-europe/)
- [TCG Bestia – Europese markt 2026](https://www.tcgbestia.com/en/blog/european-tcg-market-2026-what-stores-buy/)
