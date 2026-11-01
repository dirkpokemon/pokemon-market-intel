/**
 * "Loont graden?" arithmetic (roadmap #4). Selling a card raw earns its raw
 * value minus the marketplace fee; grading first costs the grading fee plus a
 * share of the shipping, and pays off only when the graded card sells for more.
 */

export interface GradingCosts {
  fee: number;            // grading fee per card
  shipping: number;       // shipping there and back, per shipment
  cardsInShipment: number;
  sellingFeePct: number;  // marketplace commission, raw or graded
}

export function costPerCard(c: GradingCosts): number {
  return c.fee + c.shipping / Math.max(1, Math.floor(c.cardsInShipment) || 1);
}

/** Graded sale price at which grading earns exactly what selling raw would. */
export function breakEvenPrice(rawValue: number, c: GradingCosts): number {
  const keep = 1 - c.sellingFeePct / 100;
  return rawValue + costPerCard(c) / keep;
}

export interface GradeScenario {
  chance10: number;  // 0..1, your estimate of a 10
  price10: number;
  chance9: number;   // 0..1, your estimate of a 9
  price9: number;
}

/**
 * Expected extra earnings from grading versus selling raw. A lower grade than 9
 * is assumed to sell for about the raw value, so it only costs the grading.
 */
export function expectedGain(rawValue: number, c: GradingCosts, s: GradeScenario): number {
  const keep = 1 - c.sellingFeePct / 100;
  const chance10 = clamp01(s.chance10);
  const chance9 = Math.min(clamp01(s.chance9), 1 - chance10);
  const rest = 1 - chance10 - chance9;
  const expectedSale = chance10 * s.price10 + chance9 * s.price9 + rest * rawValue;
  return expectedSale * keep - costPerCard(c) - rawValue * keep;
}

function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
}
