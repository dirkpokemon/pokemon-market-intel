"""
Unit tests for the list-price parser and optimizer (no database needed).

Run from services/backend:
DATABASE_URL=postgresql+asyncpg://x/y SECRET_KEY=x python -m pytest tests
"""
from app.core.list_price import (
    DEFAULT_RATES,
    ZERO_BIN,
    Offer,
    WantLine,
    optimize,
    parse_wantlist,
    seller_shipping,
)


def test_parse_decklist_export():
    text = """Pokémon: 3
4 Charizard ex OBF 125
2x Pikachu
Trainer: 2
Rare Candy x3
4 charizard ex
"""
    assert parse_wantlist(text) == [
        WantLine(quantity=8, query="Charizard ex"),
        WantLine(quantity=2, query="Pikachu"),
        WantLine(quantity=3, query="Rare Candy"),
    ]


def test_parse_plain_names_and_caps_quantity():
    assert parse_wantlist("Umbreon VMAX\n\n999 Mew") == [
        WantLine(quantity=1, query="Umbreon VMAX"),
        WantLine(quantity=20, query="Mew"),
    ]


def test_seller_shipping_tiers():
    r = DEFAULT_RATES
    assert seller_shipping("NL", "NL", 5, r) == r.domestic_letter
    assert seller_shipping("NL", "NL", 30, r) == r.domestic_tracked
    assert seller_shipping("DE", "NL", 5, r) == r.eu_letter
    assert seller_shipping("DE", "NL", 30, r) == r.eu_tracked
    assert seller_shipping("US", "NL", 5, r) == r.non_eu
    assert seller_shipping("DE", "NL", 0, r) == 0


def _o(line, price, seller, country="DE", zero=False, qty=4):
    return Offer(line=line, price=price, quantity=qty, seller_key=seller,
                 seller_country=country, ships_via_zero=zero)


def test_bundles_at_one_seller_when_shipping_outweighs_price_difference():
    # Cheapest per card: A for line 0, B for line 1 (two shipments, 2 x 2.50).
    # Seller C has both for 0.30 more in total: one shipment wins.
    offers = [
        _o(0, 1.00, "A"), _o(1, 1.00, "B"),
        _o(0, 1.20, "C"), _o(1, 1.10, "C"),
    ]
    plan = optimize([1, 1], offers, "NL")
    assert len(plan.shipments) == 1
    assert plan.shipments[0].bin == ("seller", "C")
    assert plan.total == round(2.30 + DEFAULT_RATES.eu_letter, 2)
    assert plan.naive_total == round(2.00 + 2 * DEFAULT_RATES.eu_letter, 2)
    assert not plan.missing


def test_keeps_separate_sellers_when_price_gap_is_large():
    offers = [_o(0, 1.00, "A"), _o(1, 1.00, "B"), _o(0, 20.0, "C"), _o(1, 20.0, "C")]
    plan = optimize([1, 1], offers, "NL")
    assert {s.bin for s in plan.shipments} == {("seller", "A"), ("seller", "B")}


def test_zero_bundles_many_sellers_into_one_fee():
    # Five cards from five different Zero sellers: one Zero fee beats five letters.
    offers = [_o(i, 1.00, f"S{i}", zero=True) for i in range(5)]
    plan = optimize([1] * 5, offers, "NL")
    assert [s.bin for s in plan.shipments] == [ZERO_BIN]
    assert plan.shipping_total == DEFAULT_RATES.zero_fee


def test_respects_listing_quantity_and_reports_missing():
    offers = [_o(0, 1.00, "A", qty=1), _o(0, 2.00, "B", qty=1)]
    plan = optimize([3], offers, "NL")
    assert plan.missing == {0: 1}
    assert plan.cards_total == 3.00


def test_line_without_offers_is_missing():
    plan = optimize([2, 1], [_o(1, 1.0, "A")], "NL")
    assert plan.missing == {0: 2}
    assert plan.total == round(1.0 + DEFAULT_RATES.eu_letter, 2)


def test_never_worse_than_naive():
    import random
    rnd = random.Random(7)
    for _ in range(30):
        lines = rnd.randint(1, 8)
        offers = []
        for line in range(lines):
            for _ in range(rnd.randint(1, 6)):
                offers.append(_o(line, round(rnd.uniform(0.1, 30), 2), f"S{rnd.randint(0, 9)}",
                                 country=rnd.choice(["NL", "DE", "FR", "US"]),
                                 zero=rnd.random() < 0.5, qty=rnd.randint(1, 3)))
        needs = [rnd.randint(1, 3) for _ in range(lines)]
        plan = optimize(needs, offers, "NL")
        assert plan.total <= plan.naive_total + 0.01
        assigned = sum(n for s in plan.shipments for _, n in s.items)
        assert assigned + sum(plan.missing.values()) == sum(needs)
