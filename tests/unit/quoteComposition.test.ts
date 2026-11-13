import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFlexibleQuoteLines, buildProjectQuoteSections, getQuoteFixedTotals, validateQuoteComposition } from '../../src/utils/scripts/index.ts';
import type { QuoteFlexibleService } from '../../src/utils/types/index.ts';

const service = (changes: Partial<QuoteFlexibleService> = {}): QuoteFlexibleService => ({
  id: 'action', label: 'Action commerciale', description: 'Prospection de nouveaux clients.',
  kind: 'prestation', pricing: 'fixed', amountKind: 'currency', amount: 1200, condition: '', ...changes,
});

test('seules les prestations fixes entrent dans le total, même avec une prime fixe', () => {
  const lines = buildFlexibleQuoteLines([
    service(),
    service({ id: 'prime', label: 'Prime client signé', kind: 'prime', amount: 200 }),
    service({ id: 'commission', label: 'Commission', kind: 'prime', pricing: 'variable', amount: 5, amountKind: 'percentage', condition: 'Sur le CA HT de la première commande.' }),
    service({ id: 'vide', label: '', description: '', amount: undefined }),
  ]);
  assert.equal(lines.length, 3);
  assert.equal(lines[1].pricing_basis, 'fixed');
  assert.equal(lines[1].line_type, 'prime');
  assert.match(lines[2].description, /CA HT de la première commande/);
  assert.equal(lines[2].amount_kind, 'percentage');
  assert.deepEqual(getQuoteFixedTotals([...lines, { ...lines[0], id: 'rdv', amount: 75, pricing_basis: 'unit' }]), { ht: 1200, ttc: 1440 });
});

test('les sections vides sont ignorées et les informations tarifaires incomplètes empêchent la génération', () => {
  assert.deepEqual(buildFlexibleQuoteLines([]), []);
  assert.deepEqual(buildProjectQuoteSections([{ id: 'empty', title: '', lines: [] }]), []);
  assert.equal(validateQuoteComposition([], []), null);
  assert.match(validateQuoteComposition([], [service({ amount: undefined })]) ?? '', /montant/);
  assert.match(validateQuoteComposition([], [service({ kind: 'prime', pricing: 'variable' })]) ?? '', /déclenchement/);
  assert.match(validateQuoteComposition([], [service({ kind: 'prime', pricing: 'variable', amountKind: 'percentage', amount: 101, condition: 'CA HT' })]) ?? '', /100/);
  assert.match(validateQuoteComposition([{ id: 'phase', title: '', lines: [{ id: 'line', label: 'Site', description: '', included: false, amount: 100 }] }], []) ?? '', /phase/);
  assert.equal(validateQuoteComposition([], [service({ amount: 0 })]), null);
});
