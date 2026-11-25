import { expect, test } from '@playwright/test';

import {
  apiSuccess,
  BOOKING_EMPLOYEE,
  fulfillJson,
  installApiRoute,
  SALES_CAMPAIGN,
} from './support.ts';

interface InvoiceEmailRequest {
  date_debut: string;
  date_fin: string;
  recipient_email: string;
}

const lead = {
  id_lead: 501,
  id_agent: 9,
  id_prospect: 42,
  id_campagne: 8,
  id_appel: 901,
  date_rdv: '2026-07-21',
  heure_rdv: '10:30:00',
  motif: 'Prise de rendez-vous client',
  interlocuteur_nom: 'Claire Durand',
  interlocuteur_role: 'Directrice générale',
  telephone_contact_snapshot: '0555443323',
  email_contact_snapshot: 'direction@durand-conseil.fr',
  notes: 'Qualification MMA confirmée.',
  derniere_note_closing: 'Décisionnaire disponible.',
  statut: 'planifie' as const,
  created_at: '2026-07-18T09:00:00.000Z',
  updated_at: '2026-07-18T09:00:00.000Z',
  prospect: {
    id_prospect: 42,
    nom: 'Durand',
    prenom: 'Claire',
    raison_sociale: 'Durand Conseil',
    telephone: '0555443322',
    telephone_contact: '0555443323',
    email: 'contact@durand-conseil.fr',
    adresse_facturation: '10 rue de la République',
    code_postal: '33000',
    ville: 'Bordeaux',
    pays: 'France',
  },
  agent: { id_employe: 9, nom: 'Agent', prenom: 'Alice', email: 'alice.agent@antl.fr' },
  campagne: { id_campagne: 8, nom_campagne: 'MMA', type_campagne: 'lead_b2b' as const },
  appelsSource: [],
};

const sale = {
  id_vente: 701,
  id_prospect: 42,
  id_agent: 9,
  id_campagne: SALES_CAMPAIGN.id_campagne,
  date_vente: '2026-07-10T10:00:00.000Z',
  date_acceptation: '2026-07-12T10:00:00.000Z',
  montant_total: '500.00',
  statut_vente: 'validee' as const,
  mode_paiement: 'Virement' as const,
  livraison_offerte: true,
  created_at: '2026-07-10T10:00:00.000Z',
  updated_at: '2026-07-12T10:00:00.000Z',
  prospect: { id_prospect: 42, nom: 'Durand', raison_sociale: 'Durand Conseil' },
};

const MMA_CAMPAIGN = {
  ...SALES_CAMPAIGN,
  id_campagne: 8,
  nom_campagne: 'MMA',
  type_campagne: 'lead_b2b' as const,
};

test('les commandes vente signalent séparément les envois prospect et client', async ({ page }) => {
  const unhandledRequests: string[] = [];
  const sales = [
    { ...sale, id_vente: 701, reference_doc: '0600701', email_envoye_at: null, bon_commande_signe_envoye_at: null },
    { ...sale, id_vente: 702, reference_doc: '0600702', email_envoye_at: '2026-09-24T10:00:00.000Z', bon_commande_signe_envoye_at: null },
    { ...sale, id_vente: 703, reference_doc: '0600703', email_envoye_at: '2026-09-24T10:00:00.000Z', bon_commande_signe_envoye_at: '2026-09-25T10:00:00.000Z' },
    { ...sale, id_vente: 704, reference_doc: '0600704', statut_vente: 'annulee' as const, email_envoye_at: null, bon_commande_signe_envoye_at: null },
  ];

  await installApiRoute(page, async (route, request) => {
    if (request.method === 'GET' && request.path === '/campagnes') {
      await fulfillJson(route, apiSuccess([SALES_CAMPAIGN]));
      return true;
    }
    if (request.method === 'GET' && request.path === '/ventes') {
      await fulfillJson(route, {
        ...apiSuccess(sales),
        pagination: { page: 1, limit: 20, total: sales.length, totalPages: 1 },
        stats: {
          validees: { count: 3, total_montant: 1500 }, enAttente: { count: 0, total_montant: 0 },
          annulees: { count: 1, total_montant: 500 }, frigo: { count: 0, total_montant: 0 }, total: { count: 4, total_montant: 2000 },
        },
      });
      return true;
    }
    return false;
  }, unhandledRequests);

  await page.goto('/operations/commandes');
  const saleLegend = page.getByLabel('Légende des couleurs d’envoi');
  await expect(saleLegend).toContainText('Bon de commande à envoyer au prospect');
  await expect(saleLegend).toContainText('Bon de commande signé à envoyer au client');
  await expect(saleLegend).toContainText('Envois terminés ou commande annulée');
  const prospectPending = page.getByRole('row', { name: /0600701/ });
  const clientPending = page.getByRole('row', { name: /0600702/ });
  const completed = page.getByRole('row', { name: /0600703/ });
  const cancelled = page.getByRole('row', { name: /0600704/ });
  await expect(prospectPending).toHaveClass(/commandesList__row--prospect-email-pending/);
  await expect(prospectPending).toHaveCSS('background-color', 'rgb(240, 233, 255)');
  await expect(clientPending).toHaveClass(/commandesList__row--client-email-pending/);
  await expect(clientPending).toHaveCSS('background-color', 'rgb(255, 243, 191)');
  await expect(completed).not.toHaveClass(/commandesList__row--(?:prospect|client)-email-pending/);
  await expect(cancelled).not.toHaveClass(/commandesList__row--(?:prospect|client)-email-pending/);
  expect(unhandledRequests).toEqual([]);
});

test('le détail lead et la facturation gardent leurs workflows navigateur', async ({ page }) => {
  const unhandledRequests: string[] = [];
  let leadStatusPayload: { statut: string } | null = null;
  let invoiceEmailPayload: InvoiceEmailRequest | null = null;

  await installApiRoute(page, async (route, request) => {
    if (request.method === 'GET' && request.path === `/leads/${lead.id_lead}`) {
      await fulfillJson(route, apiSuccess(lead));
      return true;
    }

    if (request.method === 'GET' && request.path === `/documents-commerciaux/leads/${lead.id_lead}`) {
      await fulfillJson(route, apiSuccess([]));
      return true;
    }

    if (request.method === 'GET' && request.path === `/prospects/${lead.id_prospect}/appels`) {
      await fulfillJson(route, {
        ...apiSuccess([]),
        pagination: { page: 1, limit: 5, total: 0, totalPages: 1 },
      });
      return true;
    }

    if (request.method === 'GET' && request.path === `/leads/prospect/${lead.id_prospect}`) {
      await fulfillJson(route, apiSuccess([lead]));
      return true;
    }

    if (request.method === 'PATCH' && request.path === `/leads/${lead.id_lead}/statut`) {
      leadStatusPayload = route.request().postDataJSON() as { statut: string };
      await fulfillJson(route, apiSuccess({ ...lead, statut: leadStatusPayload.statut }));
      return true;
    }

    if (request.method === 'GET' && request.path === '/campagnes') {
      await fulfillJson(route, apiSuccess([SALES_CAMPAIGN]));
      return true;
    }

    if (request.method === 'GET' && request.path === '/ventes') {
      await fulfillJson(route, {
        ...apiSuccess([sale]),
        pagination: { page: 1, limit: 6, total: 1, totalPages: 1 },
        stats: {
          validees: { count: 1, total_montant: 500 },
          enAttente: { count: 0, total_montant: 0 },
          annulees: { count: 0, total_montant: 0 },
          frigo: { count: 0, total_montant: 0 },
          total: { count: 1, total_montant: 500 },
        },
      });
      return true;
    }

    if (request.method === 'POST' && request.path === `/campagnes/${SALES_CAMPAIGN.id_campagne}/facturation/email`) {
      invoiceEmailPayload = route.request().postDataJSON() as InvoiceEmailRequest;
      await fulfillJson(route, { success: true, message: 'Facture envoyée' });
      return true;
    }

    if (request.method === 'GET' && request.path === `/campagnes/${SALES_CAMPAIGN.id_campagne}/facturation/preview`) {
      await fulfillJson(route, apiSuccess({ source: 'ventes', rows: [sale], stats: { total: { count: 1, total_montant: 500 }, validees: { count: 1, total_montant: 500 }, enAttente: { count: 0, total_montant: 0 }, annulees: { count: 0, total_montant: 0 }, frigo: { count: 0, total_montant: 0 } }, is_reissue: false, excluded_count: 0 }));
      return true;
    }

    if (request.method === 'GET' && request.path === `/campagnes/${SALES_CAMPAIGN.id_campagne}/facturation/pa`) {
      await fulfillJson(route, apiSuccess(null));
      return true;
    }

    return false;
  }, unhandledRequests);

  await page.goto(`/operations/commandes/details/${lead.id_lead}?mode=lead`);
  await expect(page.getByRole('heading', { name: 'Rendez-vous client L-00501' })).toBeVisible();
  await expect(page.getByText('Durand Conseil', { exact: true })).toBeVisible();
  await expect(page.getByText('direction@durand-conseil.fr', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Effectué' }).click();
  await expect.poll(() => leadStatusPayload).toEqual({ statut: 'effectue' });
  await expect(page.locator('.commandeDetails__header')).toContainText('Effectué');

  await page.goto('/commercial/facturation');
  await expect(page.getByRole('heading', { name: 'Facturation campagnes' })).toBeVisible();
  await expect(page.getByText('Configuration facture')).toBeVisible();
  await expect(page.getByText('Complète', { exact: true })).toBeVisible();
  await expect(page.getByText('Assiette ventes HT', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter un ajustement' }).click();
  await expect(page.getByRole('button', { name: 'Envoyer la facture par email' })).toBeDisabled();
  await page.getByLabel('Libellé 1', { exact: true }).fill('Pénalités de retard');
  await page.getByLabel('Commentaire 1', { exact: true }).fill('Retard de paiement de la facture précédente.');
  await page.getByLabel('Valeur 1', { exact: true }).fill('10');
  await page.getByLabel('Unité 1', { exact: true }).selectOption('percent');
  await page.getByLabel('TVA 1', { exact: true }).selectOption('none');
  await page.getByRole('button', { name: 'Ajouter un ajustement' }).click();
  await page.getByLabel('Libellé 2', { exact: true }).fill('Remise commerciale');
  await page.getByLabel('Sens 2', { exact: true }).selectOption('deduction');
  await page.getByLabel('Valeur 2', { exact: true }).fill('0.10');
  await page.getByLabel('Ajustements de facture').screenshot({ path: '/tmp/billing-adjustments-ui.png' });
  await page.getByRole('button', { name: 'Envoyer la facture par email' }).click();

  const invoiceModal = page.locator('.facturationView__modal');
  await expect(invoiceModal.getByRole('heading', { name: 'Envoyer la facture' })).toBeVisible();
  await invoiceModal.locator('#facturationEmailRecipient').fill('facturation@client.fr');
  await page.getByRole('option', { name: /Email de facturation.*facturation@client\.fr/ }).click();
  await invoiceModal.getByRole('button', { name: 'Envoyer la facture' }).click();

  const confirmation = page.locator('.alert--confirm');
  await expect(confirmation.getByRole('heading', { name: 'Confirmer l’envoi de la facture' })).toBeVisible();
  await confirmation.getByRole('button', { name: 'Envoyer', exact: true }).click();

  await expect.poll(() => invoiceEmailPayload).not.toBeNull();
  expect(invoiceEmailPayload).toMatchObject({ recipient_email: 'facturation@client.fr', adjustments: [
    { label: 'Pénalités de retard', comment: 'Retard de paiement de la facture précédente.', direction: 'addition', unit: 'percent', value: 10, vat: 'none' },
    { label: 'Remise commerciale', direction: 'deduction', unit: 'euro', value: .1, vat: 'campaign' },
  ] });
  expect(invoiceEmailPayload?.date_debut).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(invoiceEmailPayload?.date_fin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await expect(invoiceModal).toBeHidden();
  expect(unhandledRequests).toEqual([]);
});

test('la liste lead surligne uniquement les fiches dont le mail reste à envoyer', async ({ page }) => {
  const unhandledRequests: string[] = [];

  await installApiRoute(page, async (route, request) => {
    if (request.method === 'GET' && request.path === '/campagnes') {
      await fulfillJson(route, apiSuccess([MMA_CAMPAIGN]));
      return true;
    }

    if (request.method === 'GET' && request.path === '/leads/operations') {
      await fulfillJson(route, {
        ...apiSuccess([
          lead,
          { ...lead, id_lead: 502, fiche_envoyee_at: '2026-07-19T08:00:00.000Z' },
        ]),
        agents: [BOOKING_EMPLOYEE],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
        stats: {
          total: 2,
          planifies: 2,
          effectues: 0,
          annules: 0,
          reportes: 0,
          nonHonores: 0,
          montants: {
            valides: { count: 0, total_montant: 0 },
            enAttente: { count: 2, total_montant: 150 },
          },
        },
      });
      return true;
    }

    return false;
  }, unhandledRequests);

  await page.goto('/operations/commandes');
  await expect(page.getByRole('tab', { name: 'Commandes', exact: true })).toBeVisible();
  const leadLegend = page.getByLabel('Légende des couleurs d’envoi');
  await expect(leadLegend).toContainText('Fiche de rendez-vous à envoyer au client');
  await expect(leadLegend).toContainText('Fiche de rendez-vous envoyée au client');
  await expect(leadLegend).not.toContainText('Bon de commande à envoyer au prospect');

  const pendingEmailRow = page.getByRole('row', { name: /L-00501/ });
  const sentEmailRow = page.getByRole('row', { name: /L-00502/ });
  await expect(pendingEmailRow).toHaveClass(/commandesList__row--email-pending/);
  await expect(pendingEmailRow).toHaveCSS('background-color', 'rgb(255, 243, 191)');
  await expect(sentEmailRow).not.toHaveClass(/commandesList__row--email-pending/);
  expect(unhandledRequests).toEqual([]);
});

test('le retour des détails restaure filtres et pagination des commandes vente et MMA', async ({ page }) => {
  const unhandledRequests: string[] = [];
  let latestLeadListSearch = '';
  let latestSaleListSearch = '';

  await installApiRoute(page, async (route, request) => {
    if (request.method === 'GET' && request.path === '/campagnes') {
      await fulfillJson(route, apiSuccess([SALES_CAMPAIGN, MMA_CAMPAIGN]));
      return true;
    }

    if (request.method === 'GET' && request.path === '/leads/operations') {
      latestLeadListSearch = request.search;
      const currentPage = Number(new URLSearchParams(request.search).get('page') ?? 1);
      await fulfillJson(route, {
        ...apiSuccess([{ ...lead, statut: 'effectue' as const }]),
        agents: [BOOKING_EMPLOYEE],
        pagination: { page: currentPage, limit: 20, total: 41, totalPages: 3 },
        stats: { total: 41, planifies: 10, effectues: 20, annules: 3, reportes: 5, nonHonores: 3, montants: { valides: { count: 20, total_montant: 2000 }, enAttente: { count: 10, total_montant: 1000 } } },
      });
      return true;
    }

    if (request.method === 'GET' && request.path === '/ventes') {
      latestSaleListSearch = request.search;
      const currentPage = Number(new URLSearchParams(request.search).get('page') ?? 1);
      await fulfillJson(route, {
        ...apiSuccess([sale]),
        agents: [BOOKING_EMPLOYEE],
        pagination: { page: currentPage, limit: 20, total: 41, totalPages: 3 },
        stats: {
          validees: { count: 41, total_montant: 20500 },
          enAttente: { count: 0, total_montant: 0 },
          annulees: { count: 0, total_montant: 0 },
          frigo: { count: 0, total_montant: 0 },
          total: { count: 41, total_montant: 20500 },
        },
      });
      return true;
    }

    if (request.method === 'GET' && request.path === `/leads/${lead.id_lead}`) {
      await fulfillJson(route, apiSuccess({ ...lead, statut: 'effectue' as const }));
      return true;
    }

    if (request.method === 'GET' && request.path === `/ventes/${sale.id_vente}`) {
      await fulfillJson(route, apiSuccess({ ...sale, details: [] }));
      return true;
    }

    if (request.method === 'GET' && request.path === `/prospects/${lead.id_prospect}/appels`) {
      await fulfillJson(route, {
        ...apiSuccess([]),
        pagination: { page: 1, limit: 5, total: 0, totalPages: 1 },
      });
      return true;
    }

    if (request.method === 'GET' && request.path === `/leads/prospect/${lead.id_prospect}`) {
      await fulfillJson(route, apiSuccess([{ ...lead, statut: 'effectue' as const }]));
      return true;
    }

    if (request.method === 'GET' && request.path === `/prospects/${sale.id_prospect}/ventes`) {
      await fulfillJson(route, {
        ...apiSuccess([{ ...sale, details: [] }]),
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      });
      return true;
    }

    if (
      request.method === 'GET'
      && (request.path === `/documents-commerciaux/leads/${lead.id_lead}`
        || request.path === `/documents-commerciaux/ventes/${sale.id_vente}`)
    ) {
      await fulfillJson(route, apiSuccess([]));
      return true;
    }

    return false;
  }, unhandledRequests);

  const selectFilterOption = async (filterLabel: string, optionLabel: string): Promise<void> => {
    const filter = page.locator('.commandesList__filter-group').filter({ has: page.locator('label').filter({ hasText: new RegExp(`^${filterLabel}$`) }) }).first();
    await filter.getByRole('combobox').locator('..').click();
    await page.getByRole('option', { name: optionLabel, exact: true }).click();
  };

  await page.goto('/operations/commandes');
  await expect(page.getByRole('tab', { name: 'Commandes', exact: true })).toBeVisible();

  await selectFilterOption('Campagne', 'MMA');
  await expect(page.getByRole('tab', { name: 'Commandes', exact: true })).toBeVisible();
  await selectFilterOption('Statut', 'Effectué');
  await selectFilterOption('Commercial', 'Alice AGENT');
  await selectFilterOption('Période', 'Mois précédent');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.getByText('Page 2 / 3', { exact: true })).toBeVisible();
  await page.getByText('L-00501', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Rendez-vous client L-00501' })).toBeVisible();
  await page.getByRole('button', { name: 'Retour', exact: true }).click();

  await expect(page.getByRole('tab', { name: 'Commandes', exact: true })).toBeVisible();
  await expect(page.locator('.commandesList__filter-group--campaign')).toContainText('MMA');
  await expect(page.locator('.commandesList__filter-group').filter({ hasText: 'Statut' }).first()).toContainText('Effectué');
  await expect(page.locator('.commandesList__filter-group').filter({ hasText: 'Commercial' }).first()).toContainText('Alice AGENT');
  await expect(page.locator('.commandesList__filter-group').filter({ hasText: 'Période' }).first()).toContainText('Mois précédent');
  await expect(page.getByText('Page 2 / 3', { exact: true })).toBeVisible();
  await expect.poll(() => new URLSearchParams(latestLeadListSearch).get('page')).toBe('2');
  await expect.poll(() => new URLSearchParams(latestLeadListSearch).get('statut')).toBe('effectue');
  await expect.poll(() => new URLSearchParams(latestLeadListSearch).get('agent')).toBe('9');

  await selectFilterOption('Campagne', 'Les Cigales');
  await expect(page.getByRole('tab', { name: 'Commandes', exact: true })).toBeVisible();
  await selectFilterOption('Statut', 'Validée');
  await selectFilterOption('Commercial', 'Alice AGENT');
  await selectFilterOption('Période', 'Mois précédent');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await expect(page.getByText('Page 2 / 3', { exact: true })).toBeVisible();
  await page.getByText('#701', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Commande #701' })).toBeVisible();
  await page.getByRole('button', { name: 'Retour', exact: true }).click();

  await expect(page.getByRole('tab', { name: 'Commandes', exact: true })).toBeVisible();
  await expect(page.locator('.commandesList__filter-group--campaign')).toContainText('Les Cigales');
  await expect(page.locator('.commandesList__filter-group').filter({ hasText: 'Statut' }).first()).toContainText('Validée');
  await expect(page.locator('.commandesList__filter-group').filter({ hasText: 'Commercial' }).first()).toContainText('Alice AGENT');
  await expect(page.locator('.commandesList__filter-group').filter({ hasText: 'Période' }).first()).toContainText('Mois précédent');
  await expect(page.getByText('Page 2 / 3', { exact: true })).toBeVisible();
  await expect.poll(() => new URLSearchParams(latestSaleListSearch).get('page')).toBe('2');
  await expect.poll(() => new URLSearchParams(latestSaleListSearch).get('statut')).toBe('validee');
  await expect.poll(() => new URLSearchParams(latestSaleListSearch).get('agent')).toBe('9');
  expect(unhandledRequests).toEqual([]);
});

test('une campagne compte client enregistre le prix unitaire et facture les dossiers validés', async ({ page }) => {
  const campaign = {
    ...SALES_CAMPAIGN,
    id_campagne: 18,
    nom_campagne: 'Comptes clients démo',
    type_campagne: 'client_account' as const,
    taux_commission_facturation: 45,
    bon_commande_config: { ...SALES_CAMPAIGN.bon_commande_config, client_account_billing: { unit_price_ht: 52.75 } },
  };
  let update: unknown = null;
  let facturXRequest: unknown = null;
  let sales = [
    { ...sale, id_campagne: 18, montant_total: '0.00' },
    { ...sale, id_vente: 702, id_campagne: 18 },
  ];
  const unhandledRequests: string[] = [];
  await installApiRoute(page, async (route, request) => {
    if (request.path === '/campagnes/18' && request.method === 'PUT') {
      update = route.request().postDataJSON();
      campaign.bon_commande_config.client_account_billing.unit_price_ht = 61.25;
      await fulfillJson(route, apiSuccess(campaign));
    } else if (request.path === '/campagnes/18') {
      await fulfillJson(route, apiSuccess(campaign));
    } else if (request.path === '/campagnes') {
      await fulfillJson(route, apiSuccess([campaign]));
    } else if (request.path === '/ventes') {
      await fulfillJson(route, { ...apiSuccess(sales), pagination: { page: 1, limit: 20, total: 2, totalPages: 1 } });
    } else if (request.path === '/campagnes/18/facturation/factur-x' && request.method === 'POST') {
      facturXRequest = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' });
    } else if (request.path === '/campagnes/18/facturation/preview') {
      await fulfillJson(route, apiSuccess({ source: 'ventes', rows: sales, stats: { total: { count: sales.length, total_montant: 0 }, validees: { count: sales.length, total_montant: 0 }, enAttente: { count: 0, total_montant: 0 }, annulees: { count: 0, total_montant: 0 }, frigo: { count: 0, total_montant: 0 } }, is_reissue: false, excluded_count: 0 }));
    } else if (request.path === '/campagnes/18/facturation/pa') {
      await fulfillJson(route, apiSuccess(null));
    } else return false;
    return true;
  }, unhandledRequests);

  await page.goto('/campagnes/18');
  const price = page.getByRole('spinbutton', { name: /Tarif HT par compte client/ });
  await expect(price).toHaveValue('52.75');
  await expect(page.getByText('Commission de facturation')).toHaveCount(0);
  await price.fill('61.25');
  await page.getByRole('button', { name: 'Mettre à jour' }).click();
  await expect.poll(() => update).toMatchObject({ bon_commande_config: { client_account_billing: { unit_price_ht: 61.25 } } });

  await page.goto('/commercial/facturation');
  await expect(page.getByText('Comptes clients validés', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('122,50 €', { exact: true })).toBeVisible();
  await expect(page.getByText('Taux de commission', { exact: true })).toHaveCount(0);
  const quantity = page.getByRole('spinbutton', { name: /Nombre de comptes clients à facturer/ });
  const download = page.getByRole('button', { name: /Télécharger la facture/ });
  await expect(quantity).toHaveValue('2');
  await quantity.fill('3');
  await expect(download).toBeDisabled();
  await quantity.fill('1');
  await expect(page.getByText('61,25 €', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('122,50 €', { exact: true })).toHaveCount(0);
  await download.click();
  await expect.poll(() => facturXRequest).toMatchObject({ account_quantity: 1, account_mode: 'validated' });

  sales = [];
  facturXRequest = null;
  await page.reload();
  await expect(page.getByText('Aucun dossier validé sur la période.')).toBeVisible();
  await expect(quantity).toBeDisabled();
  await page.getByRole('combobox', { name: 'Mode de facturation des comptes clients' }).selectOption('manual');
  await quantity.fill('5');
  await expect(page.getByText('306,25 €', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Comptes clients à réaliser', { exact: true })).toBeVisible();
  await download.click();
  await expect.poll(() => facturXRequest).toMatchObject({ account_quantity: 5, account_mode: 'manual' });
});


test('en décembre une campagne arrêtée permet de ressortir novembre avec ses anciens détails', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-05T12:00:00Z'));
  const currentCampaign = { ...MMA_CAMPAIGN, statut: 'terminee', bon_commande_config: { ...MMA_CAMPAIGN.bon_commande_config, lead_billing: { unit_price_ht: 999 } } };
  const frozenCampaign = { ...MMA_CAMPAIGN, bon_commande_config: { ...MMA_CAMPAIGN.bon_commande_config, lead_billing: { unit_price_ht: 75 } } };
  const oldLead = { ...lead, statut: 'effectue', date_rdv: '2026-08-15', date_effectue: '2026-11-25T14:00:00Z' };
  const stats = { total: 1, effectues: 1, planifies: 0, annules: 0, reportes: 0, nonHonores: 0 };
  const adjustments = [{ label: 'Pénalité novembre', comment: 'Commentaire original', direction: 'addition', unit: 'euro', value: 40, vat: 'none' }];
  let downloaded: unknown = null;
  const unhandled: string[] = [];
  await installApiRoute(page, async (route, request) => {
    const url = new URL(route.request().url());
    const november = url.searchParams.get('date_debut') === '2026-11-01';
    if (request.path === '/campagnes') await fulfillJson(route, apiSuccess([currentCampaign]));
    else if (request.path === '/campagnes/8/facturation/preview') await fulfillJson(route, apiSuccess(november ? { source: 'leads', rows: [oldLead], stats, is_reissue: true, billing_campaign: frozenCampaign } : { source: 'leads', rows: [], stats: { ...stats, total: 0, effectues: 0 }, is_reissue: false, excluded_count: 1 }));
    else if (request.path === '/campagnes/8/facturation/pa') await fulfillJson(route, apiSuccess(november ? { campaign_id: 8, period_start: '2026-11-01', period_end: '2026-11-30', provider_invoice_id: '123', invoice_number: 'ANTL-MMA-2026-0001', status: 'issued', base_total_ht: 75, total_ht: 115, total_tva: 15, total_ttc: 130, adjustments } : null));
    else if (request.path === '/campagnes/8/facturation/factur-x') { downloaded = route.request().postDataJSON(); await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-original-November' }); }
    else return false;
    return true;
  }, unhandled);
  await page.goto('/commercial/facturation');
  await expect(page.getByText(/élément.*déjà facturé.*exclus/)).toBeVisible();
  await page.getByRole('combobox', { name: 'Période', exact: true }).selectOption('previous_month');
  await expect(page.getByText(/réédition du document original/)).toBeVisible();
  await expect(page.getByText('75,00 € HT', { exact: false }).first()).toBeVisible();
  await expect(page.getByLabel('Libellé 1', { exact: true })).toHaveValue('Pénalité novembre');
  await expect(page.getByLabel('Commentaire 1', { exact: true })).toHaveValue('Commentaire original');
  await expect(page.getByRole('button', { name: 'Ajouter un ajustement' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Facture réelle émise' })).toBeDisabled();
  await page.getByRole('button', { name: /Télécharger la facture/ }).click();
  await expect.poll(() => downloaded).toMatchObject({ date_debut: '2026-11-01', date_fin: '2026-11-30', adjustments });
  expect(unhandled).toEqual([]);
});
