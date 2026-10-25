"""
List price: the cheapest way to buy a whole want/deck list, shipping included.

Pure functions only (no DB), unit-tested in tests/test_list_price.py.

Shipping is charged per seller, so buying every card at its cheapest listing
is usually not the cheapest total: seven cards from seven sellers pay shipping
seven times. CardTrader Zero bundles listings of Zero sellers into one
shipment from CardTrader's hub, for one fee.

CardTrader's listing data has no shipping prices, so the fees below are
ESTIMATES (EU letter/tracked tariffs, a flat Zero fee); the frontend must
call them "geschatte verzendkosten".
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# ── Shipping estimates (EUR) ───────────────────────────────────────────────

EU_COUNTRIES = {
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
    "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
}


@dataclass(frozen=True)
class ShippingRates:
    domestic_letter: float = 1.50
    domestic_tracked: float = 5.00
    eu_letter: float = 2.50
    eu_tracked: float = 9.00
    non_eu: float = 15.00          # outside the EU: tracked + possible customs
    tracked_above: float = 25.0    # sellers ship tracked above this order value
    zero_fee: float = 7.00         # one CardTrader Zero shipment from the hub


DEFAULT_RATES = ShippingRates()


def seller_shipping(seller_country: Optional[str], buyer_country: str, subtotal: float,
                    rates: ShippingRates = DEFAULT_RATES) -> float:
    """Estimated shipping for one order from one seller."""
    if subtotal <= 0:
        return 0.0
    tracked = subtotal > rates.tracked_above
    if seller_country and seller_country == buyer_country:
        return rates.domestic_tracked if tracked else rates.domestic_letter
    if seller_country in EU_COUNTRIES:
        return rates.eu_tracked if tracked else rates.eu_letter
    return rates.non_eu


# ── Parsing a pasted list ──────────────────────────────────────────────────

# "4 Charizard ex OBF 125", "4x Pikachu", "Pikachu x2", "2 Rare Candy SVI 191"
_QTY_PREFIX = re.compile(r"^\s*(\d{1,3})\s*[x×]?\s+(.+)$", re.IGNORECASE)
_QTY_SUFFIX = re.compile(r"^(.+?)\s+[x×]\s*(\d{1,3})\s*$", re.IGNORECASE)
# Pokémon TCG Live / Limitless export: trailing set code and number ("OBF 125", "PR-SV 12")
_SET_CODE_SUFFIX = re.compile(r"\s+[A-Z][A-Z0-9]{1,4}(?:-[A-Z0-9]{1,4})?\s+\d{1,3}[a-z]?\s*$")
# Section headers of a decklist export
_HEADER = re.compile(r"^\s*(pok[eé]mon|trainers?|energy|energie|total cards)\b.*?:?\s*\d*\s*$", re.IGNORECASE)

MAX_QTY_PER_LINE = 20


@dataclass(frozen=True)
class WantLine:
    quantity: int
    query: str


def parse_wantlist(text: str) -> List[WantLine]:
    """One card per line; duplicates (case-insensitive) are merged."""
    merged: Dict[str, WantLine] = {}
    for raw in (text or "").splitlines():
        line = raw.strip().lstrip("-*•").strip()
        if not line or line.startswith("#") or line.startswith("//") or _HEADER.match(line):
            continue
        qty = 1
        m = _QTY_PREFIX.match(line)
        if m:
            qty, line = int(m.group(1)), m.group(2).strip()
        else:
            m = _QTY_SUFFIX.match(line)
            if m:
                line, qty = m.group(1).strip(), int(m.group(2))
        line = _SET_CODE_SUFFIX.sub("", line).strip()
        if len(line) < 2 or qty <= 0:
            continue
        qty = min(qty, MAX_QTY_PER_LINE)
        key = line.lower()
        if key in merged:
            qty = min(merged[key].quantity + qty, MAX_QTY_PER_LINE)
            line = merged[key].query
        merged[key] = WantLine(quantity=qty, query=line)
    return list(merged.values())


# ── Optimizer ──────────────────────────────────────────────────────────────

ZERO_BIN = ("zero", "")


@dataclass(frozen=True)
class Offer:
    line: int                 # index into the list of wanted lines
    price: float
    quantity: int             # copies available in this listing
    seller_key: str
    seller_country: Optional[str]
    ships_via_zero: bool
    ref: int = 0              # caller's id for the listing (for output)


@dataclass
class Shipment:
    bin: Tuple[str, str]               # ("seller", seller_key) or ZERO_BIN
    seller_country: Optional[str]
    items: List[Tuple[int, int]] = field(default_factory=list)   # (offer index, copies)
    subtotal: float = 0.0
    shipping: float = 0.0


@dataclass
class Plan:
    shipments: List[Shipment]
    cards_total: float
    shipping_total: float
    total: float
    missing: Dict[int, int]            # line -> copies we could not find
    naive_total: float                 # every copy at its cheapest listing, each seller ships separately


class _State:
    """Units assigned to (offer, bin), with running bin subtotals."""

    def __init__(self, offers: List[Offer], buyer: str, rates: ShippingRates):
        self.offers, self.buyer, self.rates = offers, buyer, rates
        self.left = [o.quantity for o in offers]
        self.sub: Dict[Tuple[str, str], float] = {}
        self.country: Dict[Tuple[str, str], Optional[str]] = {}
        self.units: List[Tuple[int, Tuple[str, str]]] = []

    def fee(self, b: Tuple[str, str], subtotal: float) -> float:
        if subtotal <= 0:
            return 0.0
        if b == ZERO_BIN:
            return self.rates.zero_fee
        return seller_shipping(self.country.get(b), self.buyer, subtotal, self.rates)

    def options(self, offer_idx: int):
        o = self.offers[offer_idx]
        yield ("seller", o.seller_key)
        if o.ships_via_zero:
            yield ZERO_BIN

    def marginal(self, offer_idx: int, b: Tuple[str, str]) -> float:
        o = self.offers[offer_idx]
        if b not in self.country:
            self.country[b] = None if b == ZERO_BIN else o.seller_country
        cur = self.sub.get(b, 0.0)
        return o.price + self.fee(b, cur + o.price) - self.fee(b, cur)

    def add(self, offer_idx: int, b: Tuple[str, str]) -> None:
        if b not in self.country:
            self.country[b] = None if b == ZERO_BIN else self.offers[offer_idx].seller_country
        self.left[offer_idx] -= 1
        self.sub[b] = self.sub.get(b, 0.0) + self.offers[offer_idx].price
        self.units.append((offer_idx, b))

    def remove(self, unit_pos: int) -> Tuple[int, int, Tuple[str, str]]:
        offer_idx, b = self.units.pop(unit_pos)
        self.left[offer_idx] += 1
        self.sub[b] -= self.offers[offer_idx].price
        if self.sub[b] <= 1e-9:
            del self.sub[b]
        return offer_idx, self.offers[offer_idx].line, b

    def total(self) -> float:
        cards = sum(self.offers[i].price for i, _ in self.units)
        return cards + sum(self.fee(b, s) for b, s in self.sub.items())

    def best_option(self, line: int, by_line: Dict[int, List[int]], allowed=None, exclude=None):
        best = None
        for idx in by_line.get(line, []):
            if self.left[idx] <= 0:
                continue
            for b in self.options(idx):
                if exclude is not None and b == exclude:
                    continue
                if allowed is not None and b not in allowed:
                    continue
                cost = self.marginal(idx, b)
                if best is None or cost < best[0] - 1e-9:
                    best = (cost, idx, b)
        return best

    def clone(self) -> "_State":
        c = _State(self.offers, self.buyer, self.rates)
        c.left, c.sub, c.country, c.units = list(self.left), dict(self.sub), dict(self.country), list(self.units)
        return c


def _greedy(state: _State, needs: List[int], by_line: Dict[int, List[int]], prefer_zero: bool) -> Dict[int, int]:
    """Assign units line by line (scarcest lines first). Returns missing copies per line."""
    missing: Dict[int, int] = {}
    if prefer_zero:
        # Act as if the Zero fee were already paid, so Zero listings win ties
        state.sub[ZERO_BIN] = state.sub.get(ZERO_BIN, 0.0) + 1e-6
        state.country[ZERO_BIN] = None
    order = sorted(range(len(needs)), key=lambda line: len(by_line.get(line, [])))
    for line in order:
        for _ in range(needs[line]):
            best = state.best_option(line, by_line)
            if best is None:
                missing[line] = missing.get(line, 0) + 1
                continue
            state.add(best[1], best[2])
    if prefer_zero:
        state.sub[ZERO_BIN] -= 1e-6
        if state.sub[ZERO_BIN] <= 1e-9:
            del state.sub[ZERO_BIN]
    return missing


def _candidate_bins(offers: List[Offer], limit: int = 40) -> List[Tuple[str, str]]:
    """Shipments worth trying to consolidate into: Zero, and sellers covering several lines."""
    lines_per_bin: Dict[Tuple[str, str], set] = {}
    for o in offers:
        lines_per_bin.setdefault(("seller", o.seller_key), set()).add(o.line)
        if o.ships_via_zero:
            lines_per_bin.setdefault(ZERO_BIN, set()).add(o.line)
    multi = [b for b, lines in lines_per_bin.items() if len(lines) > 1]
    multi.sort(key=lambda b: -len(lines_per_bin[b]))
    return multi[:limit]


def _improve(state: _State, by_line: Dict[int, List[int]], candidates: List[Tuple[str, str]],
             max_rounds: int = 30) -> _State:
    """
    Local search: consolidate copies into one (new or open) shipment, close
    whole shipments, and move single copies into open shipments.
    """
    best_total = state.total()
    for _ in range(max_rounds):
        improved = False
        # 0. Pull copies into one candidate shipment where that is cheaper
        for b in candidates:
            trial = state.clone()
            for pos in range(len(trial.units)):
                offer_idx, ub = trial.units[pos]
                if ub == b:
                    continue
                line = trial.offers[offer_idx].line
                trial.remove(pos)
                choice = trial.best_option(line, by_line, allowed=set(trial.sub.keys()) | {b})
                if choice is None:
                    choice = (0.0, offer_idx, ub)
                trial.left[choice[1]] -= 1
                trial.sub[choice[2]] = trial.sub.get(choice[2], 0.0) + trial.offers[choice[1]].price
                trial.units.insert(pos, (choice[1], choice[2]))
            if trial.total() < best_total - 0.005:
                state, best_total, improved = trial, trial.total(), True
        # 1. Try closing each shipment: its copies go to the best other option
        for b in list(state.sub.keys()):
            trial = state.clone()
            positions = [i for i, (_, ub) in enumerate(trial.units) if ub == b]
            lines = [trial.remove(pos)[1] for pos in reversed(positions)]
            ok = True
            for line in lines:
                choice = trial.best_option(line, by_line, exclude=b)
                if choice is None:
                    ok = False
                    break
                trial.add(choice[1], choice[2])
            if ok and trial.total() < best_total - 0.005:
                state, best_total, improved = trial, trial.total(), True
        # 2. Move single copies into shipments that are already paid for
        for pos in range(len(state.units)):
            trial = state.clone()
            _, line, b = trial.remove(pos)
            open_bins = set(trial.sub.keys())
            choice = trial.best_option(line, by_line, allowed=open_bins)
            if choice is None or choice[2] == b:
                continue
            trial.add(choice[1], choice[2])
            if trial.total() < best_total - 0.005:
                state, best_total, improved = trial, trial.total(), True
                break  # positions shifted; restart the scan next round
        if not improved:
            break
    return state


def optimize(needs: List[int], offers: List[Offer], buyer_country: str = "NL",
             rates: ShippingRates = DEFAULT_RATES) -> Plan:
    """
    Cheapest assignment of the wanted copies (needs[line]) to listings,
    including estimated shipping. Heuristic (greedy starts + local search):
    the exact problem is NP-hard, but lists are small.
    """
    buyer = (buyer_country or "NL").upper()
    by_line: Dict[int, List[int]] = {}
    for i, o in enumerate(offers):
        by_line.setdefault(o.line, []).append(i)
    for line in by_line:
        by_line[line].sort(key=lambda i: offers[i].price)

    candidates = _candidate_bins(offers)

    # Baseline: every copy at its cheapest listing, shipped by its own seller
    naive = _State(offers, buyer, rates)
    naive_missing: Dict[int, int] = {}
    for line, n in enumerate(needs):
        for _ in range(n):
            idx = next((i for i in by_line.get(line, []) if naive.left[i] > 0), None)
            if idx is None:
                naive_missing[line] = naive_missing.get(line, 0) + 1
            else:
                naive.add(idx, ("seller", offers[idx].seller_key))
    naive_total = naive.total()

    # Three starts (baseline, greedy, greedy preferring Zero), each improved by local search
    starts = [(naive.clone(), naive_missing)]
    for prefer_zero in (False, True):
        state = _State(offers, buyer, rates)
        starts.append((state, _greedy(state, needs, by_line, prefer_zero)))
    best_state, best_missing = None, {}
    for state, missing in starts:
        state = _improve(state, by_line, candidates)
        if best_state is None or state.total() < best_state.total() - 0.005:
            best_state, best_missing = state, missing

    shipments: Dict[Tuple[str, str], Shipment] = {}
    for idx, b in best_state.units:
        sh = shipments.setdefault(b, Shipment(bin=b, seller_country=best_state.country.get(b)))
        for k, (oi, n) in enumerate(sh.items):
            if oi == idx:
                sh.items[k] = (oi, n + 1)
                break
        else:
            sh.items.append((idx, 1))
        sh.subtotal += offers[idx].price
    for b, sh in shipments.items():
        sh.subtotal = round(sh.subtotal, 2)
        sh.shipping = round(best_state.fee(b, sh.subtotal), 2)

    ordered = sorted(shipments.values(), key=lambda s: (s.bin != ZERO_BIN, -s.subtotal))
    cards = round(sum(s.subtotal for s in ordered), 2)
    ship = round(sum(s.shipping for s in ordered), 2)
    return Plan(
        shipments=ordered,
        cards_total=cards,
        shipping_total=ship,
        total=round(cards + ship, 2),
        missing=best_missing,
        naive_total=round(naive_total, 2),
    )
