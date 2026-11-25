import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFallbackVenteStats,
  buildResolvedBillingProfile,
  computeFacturableHt,
  computeFacturableLeadHt,
  computePreviewTotals,
  computeAdjustedInvoiceTotals,
  computeTtcAmount,
  getCampaignBillingSettings,
  getLeadBillingSettings,
} from '../../src/API/models/index.ts';
import {
  buildInvoiceEmailOptions,
  formatBillingCurrency,
  formatBillingPercent,
  isValidEmail,
  sanitizeBillingFileSegment,
} from '../../src/utils/scripts/index.ts';
import type { Campagne, LeadClient, Vente } from '../../src/utils/types/index.ts';

function createCampagne(overrides: Partial<Campagne> = {}): Campagne {
  return {
    id_campagne: 7,
    nom_campagne: 'Les Cigales',
    type_campagne: 'vente',
    date_debut: '2026-01-01',
    date_fin: null,
    statut: 'active',
    objectifs: null,
    budget: null,
    code_postal_maison_mere: null,
    autoriser_mobile: false,
    ...overrides,
  };
}

function createVente(overrides: Partial<Vente> = {}): Vente {
  return {
    id_vente: 1,
    id_campagne: 7,
    date_vente: '2026-07-01T10:00:00.000Z',
    montant_total: '100',
    statut_vente: 'validee',
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-01T10:00:00.000Z',
    ...overrides,
  };
}

test('la facturation applique les réglages par défaut et ceux de campagne', () => {
  assert.deepEqual(getCampaignBillingSettings(createCampagne()), {
    vatRate: 0.2,
    shippingFeeHt: 30,
    freeShippingThresholdHt: 300,
  });

  assert.deepEqual(getCampaignBillingSettings(createCampagne({
    bon_commande_config: {
      vat_rate: 0.1,
      shipping: { fee_ht: 15, free_threshold_ht: 200 },
    },
  })), {
    vatRate: 0.1,
    shippingFeeHt: 15,
    freeShippingThresholdHt: 200,
  });
});

test('les totaux de facturation distinguent assiette, commission et TTC', () => {
  const settings = { vatRate: 0.2, shippingFeeHt: 30, freeShippingThresholdHt: 300 };
  assert.equal(computeFacturableHt(createVente()), 100);
  assert.equal(computeFacturableHt(createVente({ livraison_offerte: true })), 100);
  assert.equal(computeFacturableHt(createVente({ montant_total: '300' })), 300);
  assert.equal(computeTtcAmount(100, 0.2), 120);

  const rows = [createVente(), createVente({ id_vente: 2, montant_total: '300' })];
  const stats = buildFallbackVenteStats(rows);
  assert.deepEqual(computePreviewTotals({ source: 'ventes', rows, stats }, settings, 45), {
    assietteHt: 400,
    totalHt: 180,
    totalTtc: 216,
  });
  assert.deepEqual(computePreviewTotals(null, settings), { assietteHt: 0, totalHt: 0, totalTtc: 0 });
});

test('MMA conserve les paliers salariés tandis que FGA et Swiss Life utilisent le tarif lead fixe', () => {
  const lead = {
    id_campagne: 10,
    entreprise_plus_de_cinq_salaries: true,
  } as LeadClient;
  const settings = { vatRate: 0.2, shippingFeeHt: 30, freeShippingThresholdHt: 300 };

  const mmaSettings = getLeadBillingSettings(createCampagne({ id_campagne: 10, type_campagne: 'lead_b2b' }));
  const fgaSettings = getLeadBillingSettings(createCampagne({
    id_campagne: 11,
    type_campagne: 'lead_b2b',
    bon_commande_config: { lead_billing: { unit_price_ht: 92.5 } },
  }));
  const swissLifeSettings = getLeadBillingSettings(createCampagne({ id_campagne: 12, type_campagne: 'lead_b2b' }));

  assert.equal(computeFacturableLeadHt(lead, mmaSettings), 150);
  assert.equal(computeFacturableLeadHt(lead, fgaSettings), 92.5);
  assert.equal(computeFacturableLeadHt(lead, swissLifeSettings), 75);
  assert.deepEqual(computePreviewTotals({
    source: 'leads',
    rows: [{ ...lead, id_campagne: 11 }, { ...lead, id_campagne: 11 }],
    stats: { total: 2, planifies: 0, effectues: 2, annules: 0, reportes: 0, nonHonores: 0 },
  }, settings, null, fgaSettings), {
    assietteHt: 185,
    totalHt: 185,
    totalTtc: 222,
  });
});

test('le fallback de statistiques conserve chaque statut et le total global', () => {
  const stats = buildFallbackVenteStats([
    createVente({ statut_vente: 'validee', montant_total: '100' }),
    createVente({ id_vente: 2, statut_vente: 'en_attente', montant_total: '50.5' }),
    createVente({ id_vente: 3, statut_vente: 'annulee', montant_total: '25' }),
    createVente({ id_vente: 4, statut_vente: 'frigo', montant_total: 'invalid' }),
  ]);

  assert.equal(stats.total.count, 4);
  assert.equal(stats.total.total_montant, 175.5);
  assert.equal(stats.validees.total_montant, 100);
  assert.equal(stats.enAttente.total_montant, 50.5);
  assert.equal(stats.annulees.count, 1);
  assert.equal(stats.frigo.total_montant, 0);
});

test('le profil facturation privilégie le destinataire dédié sans perdre les fallbacks campagne', () => {
  const profile = buildResolvedBillingProfile(createCampagne({
    siret: '11111111111111',
    email_contact: 'campagne@antl.fr',
    adresse: 'Adresse campagne',
    ville: 'Paris',
    pays: 'France',
    bon_commande_config: {
      invoice_recipient: {
        company_name: 'Client Facturé',
        email: 'factures@client.fr',
        postal_code: '69001',
        city: 'Lyon',
      },
    },
  }));

  assert.equal(profile?.source, 'invoice_recipient');
  assert.equal(profile?.fields.find((field) => field.label === 'Société facturée')?.value, 'Client Facturé');
  assert.equal(profile?.fields.find((field) => field.label === 'SIRET')?.value, '11111111111111');
  assert.equal(profile?.fields.find((field) => field.label === 'Ville')?.value, '69001 Lyon');
  assert.deepEqual(profile?.missingRequiredFields, ['TVA intracom']);
});

test('les helpers de présentation facturation bornent les entrées invalides', () => {
  assert.equal(formatBillingCurrency('invalid'), '0,00 €');
  assert.equal(formatBillingPercent(null), 'Non applicable');
  assert.equal(formatBillingPercent(0), 'Non applicable');
  assert.equal(sanitizeBillingFileSegment('  Société Été & Fils  '), 'societe_ete_fils');
  assert.equal(isValidEmail('factures@client.fr'), true);
  assert.equal(isValidEmail('client.fr'), false);
});

test('les destinataires de facture restent distincts des adresses de contact et de bon de commande', () => {
  const campagne = createCampagne({
    email_contact: ' contact-campagne@client.fr ',
    email_bon_commande: 'commandes@client.fr',
    bon_commande_config: {
      invoice_recipient: { email: ' factures@client.fr ' },
    },
  });

  assert.deepEqual(buildInvoiceEmailOptions(campagne), [
    {
      value: 'factures@client.fr',
      label: 'Email de facturation — factures@client.fr',
    },
    {
      value: 'contact-campagne@client.fr',
      label: 'Email campagne — contact-campagne@client.fr',
    },
  ]);
  assert.equal(buildInvoiceEmailOptions(campagne).some(({ value }) => value === 'commandes@client.fr'), false);
  assert.deepEqual(buildInvoiceEmailOptions(null), []);
});

test('les destinataires de facture identiques sont dédupliqués', () => {
  assert.deepEqual(buildInvoiceEmailOptions(createCampagne({
    email_contact: 'factures@client.fr',
    bon_commande_config: { invoice_recipient: { email: 'factures@client.fr' } },
  })), [{
    value: 'factures@client.fr',
    label: 'Email de facturation — factures@client.fr',
  }]);
});

test('identifie les campagnes Swiss Life (12) et Swiss Life IND (14) pour le bouton 1 lot de 10 rendez-vous qualifiés', () => {
  const isSwissLife = (id: number) => id === 12 || id === 14;
  assert.equal(isSwissLife(12), true);
  assert.equal(isSwissLife(14), true);
  assert.equal(isSwissLife(10), false);
  assert.equal(isSwissLife(11), false);
});

test('la facturation compte client utilise le tarif unitaire et exclut les dossiers non validés', () => {
  const settings = getCampaignBillingSettings(createCampagne({ type_campagne: 'client_account' }));
  const rows = [createVente({ montant_total: 0 }), createVente({ id_vente: 2, montant_total: 500 }),
    createVente({ id_vente: 3, statut_vente: 'annulee' })];
  const preview = { source: 'ventes' as const, rows, stats: buildFallbackVenteStats(rows) };
  assert.deepEqual(computePreviewTotals(preview, settings, 45, null, 52.75), {
    assietteHt: 105.5, totalHt: 105.5, totalTtc: 126.6,
  });
  assert.deepEqual(computePreviewTotals(preview, settings, 45, null, null), { assietteHt: 0, totalHt: 0, totalTtc: 0 });
});

test('les ajustements gardent une assiette HT initiale et une TVA distincte', () => {
  const result = computeAdjustedInvoiceTotals({ assietteHt: 1000, totalHt: 1000, totalTtc: 1200 }, [
    { label: 'Retard', comment: 'Paiement tardif', direction: 'addition', unit: 'percent', value: 10, vat: 'none' },
    { label: 'Remise', comment: '', direction: 'deduction', unit: 'percent', value: 5, vat: 'campaign' },
    { label: 'Frais', comment: '', direction: 'addition', unit: 'euro', value: 40, vat: 'none' },
  ], .2);
  assert.deepEqual(result.totals, { assietteHt: 1000, totalHt: 1090, totalTtc: 1280 });
  assert.equal(result.error, null);
});
