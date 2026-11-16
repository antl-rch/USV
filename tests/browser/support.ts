import type { Page, Route } from '@playwright/test';
import type { Employe } from '../../src/utils/types/index.ts';

export interface ApiRequestDescriptor {
  method: string;
  path: string;
  search: string;
}

export const ADMIN_USER = {
  id_employe: 1,
  identifiant: 'admin.test',
  nom: 'TEST',
  prenom: 'Sophie',
  email: 'sophie.test@antl.fr',
  actif: true,
  role: 'confirme' as const,
  couleur: '#7c3aed',
  poste: {
    id_poste: 1,
    libelle_poste: 'CEO',
    permissions: {
      'access-management': { enabled: true },
      booking: { enabled: true },
      commercial: {
        enabled: true,
        subsections: ['publications-reseaux-sociaux', 'facturation', 'devis', 'configuration-antl'],
      },
      commerciaux: {
        enabled: true,
        subsections: ['notes-direction', 'notes-direction-create', 'notes-direction-delete', 'mon_planning', 'agenda-travail'],
      },
      incidents: { enabled: true, subsections: ['declarer', 'qualifier', 'traiter', 'liste'] },
      mail: { enabled: true, subsections: ['mail_new', 'mail_list', 'mail_convert'] },
      operations: {
        enabled: true,
        subsections: [
          'supervision',
          'vigie',
          'suivi-mensuel-commercial',
          'commandes',
          'campagnes',
          'prospects',
          'produits',
          'qualite',
          'qualite-signalements',
          'qualite-ecoutes',
          'qualite-statistiques',
          'qualite-comparatif',
          'demandes-absence',
          'employes',
          'postes',
          'materiel',
          'telephonie',
        ],
      },
      projets: { enabled: true },
    },
  },
};

export const BOOKING_EMPLOYEE = {
  id_employe: 9,
  identifiant: 'agent.test',
  nom: 'AGENT',
  prenom: 'Alice',
  email: 'alice.agent@antl.fr',
  actif: true,
  role: 'confirme' as const,
  couleur: '#2563eb',
};

export const SALES_CAMPAIGN = {
  id_campagne: 7,
  nom_campagne: 'Les Cigales',
  type_campagne: 'vente' as const,
  date_debut: '2026-01-01',
  date_fin: null,
  statut: 'active' as const,
  objectifs: null,
  budget: null,
  code_postal_maison_mere: '33000',
  autoriser_mobile: false,
  siret: '12345678901234',
  tva: 'FR12123456789',
  email_contact: 'facturation@client.fr',
  email_bon_commande: 'commandes@client.fr',
  adresse: '1 rue du Client',
  ville: '33000 Bordeaux',
  telephone: '0555000000',
  pays: 'France',
  footer_text: 'Merci pour votre confiance.',
  taux_commission_facturation: 0.15,
  bon_commande_config: {
    invoice_recipient: {
      company_name: 'Client Facturé SAS',
      siret: '12345678901234',
      tva: 'FR12123456789',
      email: 'facturation@client.fr',
      address: '1 rue du Client',
      postal_code: '33000',
      city: 'Bordeaux',
      country: 'France',
      phone: '0555000000',
    },
  },
};

export function describeApiRequest(route: Route): ApiRequestDescriptor {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.startsWith('/api') ? url.pathname.slice(4) : url.pathname;
  return { method: request.method(), path, search: url.search };
}

export async function fulfillJson(route: Route, data: unknown, status = 200): Promise<void> {
  const requestOrigin = route.request().headers().origin;
  await route.fulfill({
    body: JSON.stringify(data),
    contentType: 'application/json',
    headers: requestOrigin ? {
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': requestOrigin,
    } : undefined,
    status,
  });
}

export function apiSuccess<T>(data: T, message = 'OK'): { success: true; message: string; data: T } {
  return { success: true, message, data };
}

export async function handleCommonApiRequest(
  route: Route,
  authenticatedUser: Employe = ADMIN_USER,
): Promise<boolean> {
  const { method, path } = describeApiRequest(route);

  if (method === 'GET' && path === '/csrf-token') {
    await fulfillJson(route, {
      success: true,
      csrfToken: 'playwright-csrf-token',
      headerName: 'x-csrf-token',
    });
    return true;
  }

  if (method === 'GET' && path === '/auth/me') {
    await fulfillJson(route, apiSuccess(authenticatedUser));
    return true;
  }

  if (method === 'GET' && path === '/employes') {
    await fulfillJson(route, apiSuccess({ employes: [ADMIN_USER, BOOKING_EMPLOYEE] }));
    return true;
  }

  if (method === 'GET' && path === '/employes/absence-requests/pending') {
    await fulfillJson(route, apiSuccess([]));
    return true;
  }

  if (method === 'GET' && path === '/incidents') {
    await fulfillJson(route, {
      ...apiSuccess([]),
      pagination: { page: 1, limit: 1, total: 0, totalPages: 0 },
    });
    return true;
  }

  if (method === 'GET' && path === '/ventes/frigo-alertes') {
    await fulfillJson(route, apiSuccess([]));
    return true;
  }

  return false;
}

export async function installApiRoute(
  page: Page,
  handler: (route: Route, request: ApiRequestDescriptor) => Promise<boolean>,
  unhandledRequests: string[],
  authenticatedUser: Employe = ADMIN_USER,
): Promise<void> {
  page.on('pageerror', (error) => console.error('[browser pageerror]', error.message));
  await page.route('**/api/**', async (route) => {
    if (await handleCommonApiRequest(route, authenticatedUser)) return;

    const request = describeApiRequest(route);
    if (await handler(route, request)) return;

    if (request.method === 'GET' && /^\/campagnes\/\d+\/documents-script$/.test(request.path)) {
      await fulfillJson(route, apiSuccess({
        mailbox: { sender_name: '', sender_email: '', has_password: false },
        documents: [],
      }));
      return;
    }

    const requestKey = `${request.method} ${request.path}${request.search}`;
    unhandledRequests.push(requestKey);
    await fulfillJson(route, { success: false, message: `Unhandled API request: ${requestKey}` }, 500);
  });
}
