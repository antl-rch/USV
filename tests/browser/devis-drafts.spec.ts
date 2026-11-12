import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ADMIN_USER, apiSuccess, fulfillJson, installApiRoute } from './support.ts';
import { completeQuoteSnapshot, quoteDraftFixture } from './fixtures/completeQuoteDraft.ts';
import type { QuoteDraft, QuoteDraftSnapshot } from '../../src/utils/types/index.ts';

async function installDraftApi(page: Page, options: { offline?: boolean; conflict?: boolean; delay?: number } = {}) {
  const drafts = new Map<string, QuoteDraft>();
  const saves: QuoteDraftSnapshot[] = [];
  const generated: unknown[] = [];
  await installApiRoute(page, async (route, request) => {
    if (request.path === '/devis/brouillons' && request.method === 'GET') {
      if (options.offline) { await fulfillJson(route, { success: false, message: 'Serveur indisponible' }, 503); return true; }
      await fulfillJson(route, apiSuccess([...drafts.values()].map(({ id, title, revision, created_at, updated_at }) => ({ id, title, revision, created_at, updated_at })))); return true;
    }
    if (request.path.startsWith('/devis/brouillons/')) {
      const id = request.path.split('/').at(-1)!;
      if (options.offline) { await fulfillJson(route, { success: false, message: 'Serveur indisponible' }, 503); return true; }
      if (request.method === 'PUT') {
        const payload = route.request().postDataJSON() as { revision: number; snapshot: QuoteDraftSnapshot };
        saves.push(payload.snapshot);
        if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
        if (options.conflict && payload.revision > 0) { await fulfillJson(route, { success: false, message: 'Modifié dans une autre fenêtre' }, 409); return true; }
        const now = new Date().toISOString();
        const draft = { id, title: payload.snapshot.draftName?.trim() || payload.snapshot.formState.companyName || 'Devis sans nom', revision: payload.revision + 1, snapshot: payload.snapshot, created_at: drafts.get(id)?.created_at || now, updated_at: now };
        drafts.set(id, draft); await fulfillJson(route, apiSuccess(draft)); return true;
      }
      if (request.method === 'GET') { await fulfillJson(route, apiSuccess(drafts.get(id))); return true; }
      if (request.method === 'DELETE') { drafts.delete(id); await fulfillJson(route, apiSuccess(null)); return true; }
    }
    if (request.path === '/devis/document') {
      generated.push(route.request().postDataJSON());
      await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' }); return true;
    }
    return false;
  });
  return { drafts, saves, generated, options };
}

test('un devis incomplet survit au rechargement, se reprend, conserve ses tarifs et génère le même payload', async ({ page }) => {
  const api = await installDraftApi(page);
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await page.getByLabel('Entreprise', { exact: true }).fill('Zoenoe');
  await page.getByLabel('Besoin exprimé').fill('Prospection\nPériode test');
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.formState.needSummary).toBe('Prospection\nPériode test');
  expect([...api.drafts.values()][0].snapshot.formState.contactName).toBe('');
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Entreprise', { exact: true })).toHaveValue('Zoenoe');
  await expect(page.getByLabel('Besoin exprimé')).toHaveValue('Prospection\nPériode test');
  await page.getByRole('spinbutton', { name: /Rendez-vous/ }).fill('150');
  await page.getByLabel('Description du rendez-vous').fill('Tarif personnalisé');
  await page.getByRole('button', { name: 'Ajouter une clause' }).click();
  await page.getByLabel('Intitulé de la clause').fill('Option');
  await page.getByLabel('Montant de la clause').fill('20');
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.customClauses[0]?.amount).toBe(20);
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: /Rendez-vous/ })).toHaveValue('150');
  await expect(page.getByLabel('Intitulé de la clause')).toHaveValue('Option');
  await expect(page.getByLabel('Description du rendez-vous')).toHaveValue('Tarif personnalisé');
  await page.getByRole('button', { name: 'Éditer le devis', exact: true }).click();
  await expect.poll(() => api.generated.length).toBe(1);
  expect(api.generated[0]).toMatchObject({ client: { company_name: 'Zoenoe' }, context: { need_summary: 'Prospection\nPériode test' }, lines: expect.arrayContaining([expect.objectContaining({ amount: 150, description: 'Tarif personnalisé' }), expect.objectContaining({ label: 'Option', amount: 20 })]) });
  await page.getByRole('button', { name: 'Changer de devis', exact: true }).click();
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await expect(page.getByLabel('Entreprise', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Reprendre le devis', exact: true })).toHaveCount(0);
});

test('Offert et Inclus sont exclusifs et la mention offerte est conservée dans le brouillon et le PDF', async ({ page }) => {
  const api = await installDraftApi(page);
  const draft = quoteDraftFixture(completeQuoteSnapshot());
  api.drafts.set(draft.id, draft);
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();

  const clause = page.locator('.devisView__custom-clause').filter({ has: page.locator('input[value="Qualification du fichier"]') });
  const line = page.locator('.devisView__project-line').filter({ has: page.locator('input[value="Formation des équipes"]') });
  await expect(clause.getByRole('radio', { name: 'Inclus' })).toBeChecked();
  await line.getByRole('radio', { name: 'Inclus' }).check();
  await line.getByRole('radio', { name: 'Offert' }).check();
  await expect(line.getByRole('radio', { name: 'Inclus' })).not.toBeChecked();
  await expect(line.getByRole('spinbutton')).toBeDisabled();
  await expect.poll(() => api.drafts.get(draft.id)?.snapshot.projectSections.at(-1)?.lines[0].offered).toBe(true);

  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(line.getByRole('radio', { name: 'Offert' })).toBeChecked();
  await line.getByRole('radio', { name: 'Tarifé' }).check();
  await expect(line.getByRole('spinbutton')).toHaveValue('850.75');
  await line.getByRole('radio', { name: 'Offert' }).check();
  await page.getByRole('button', { name: 'Éditer le devis', exact: true }).click();
  await expect.poll(() => api.generated.length).toBe(1);
  const offered = expect.objectContaining({ id: 'prestation-ajoutee', included: true, offered: true, amount: 0 });
  expect(api.generated[0]).toMatchObject({
    lines: expect.arrayContaining([offered]),
    project_sections: expect.arrayContaining([expect.objectContaining({ lines: [offered] })]),
  });
});

test('une panne réseau conserve la saisie locale pour la reprise', async ({ page }) => {
  const api = await installDraftApi(page, { offline: true });
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await page.getByLabel('Entreprise', { exact: true }).fill('Sans réseau');
  await page.getByLabel('Besoin exprimé').fill('Besoin à conserver');
  await expect(page.getByRole('status')).toContainText('Saisie conservée sur ce navigateur');
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Besoin exprimé')).toHaveValue('Besoin à conserver');
  api.options.offline = false;
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.formState.needSummary).toBe('Besoin à conserver');
});

test('les modifications pendant la sauvegarde sont envoyées avec la nouvelle révision', async ({ page }) => {
  const api = await installDraftApi(page, { delay: 1400 });
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await page.getByLabel('Entreprise', { exact: true }).fill('Première saisie');
  await expect.poll(() => api.saves.length).toBe(1);
  await page.getByLabel('Besoin exprimé').fill('Ajout pendant la sauvegarde');
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.formState.needSummary, { timeout: 12000 }).toBe('Ajout pendant la sauvegarde');
  expect([...api.drafts.values()][0].revision).toBe(2);
});

test('un conflit conserve la saisie et permet une copie sans écraser le serveur', async ({ page }) => {
  const api = await installDraftApi(page, { conflict: true });
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await page.getByLabel('Entreprise', { exact: true }).fill('Concurrent');
  await expect.poll(() => api.drafts.size).toBe(1);
  await page.getByLabel('Besoin exprimé').fill('Dernières modifications');
  await expect(page.getByRole('alert')).toContainText('Modifié dans une autre fenêtre');
  await expect(page.getByLabel('Besoin exprimé')).toHaveValue('Dernières modifications');
  expect([...api.drafts.values()][0].snapshot.formState.needSummary).toBe('');
  await page.getByRole('button', { name: 'Enregistrer une copie', exact: true }).click();
  await expect.poll(() => api.drafts.size).toBe(2);
  expect([...api.drafts.values()][1].snapshot.formState.needSummary).toBe('Dernières modifications');
});

test('un utilisateur sans droit devis ne charge ni la page ni les brouillons', async ({ page }) => {
  let calls = 0;
  const user = { ...ADMIN_USER, poste: { ...ADMIN_USER.poste, permissions: { ...ADMIN_USER.poste.permissions, commercial: { enabled: true, subsections: ['facturation'] } } } };
  await installApiRoute(page, async (_route, request) => { if (request.path.startsWith('/devis')) calls++; return false; }, [], user);
  await page.goto('/commercial/devis');
  await expect(page.getByRole('heading', { name: 'Devis à reprendre' })).toHaveCount(0);
  expect(calls).toBe(0);
});

test('les phases, prestations et services tiers se restaurent intégralement', async ({ page }) => {
  const api = await installDraftApi(page);
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await page.getByLabel('Entreprise', { exact: true }).fill('Projet sauvegardé');
  await page.locator('summary').filter({ hasText: 'Conception' }).click();
  await page.getByLabel('Intitulé de la phase', { exact: true }).first().fill('Phase personnalisée');
  await page.getByLabel('Intitulé de la prestation', { exact: true }).first().fill('API sur mesure');
  await page.getByLabel('Description de la prestation', { exact: true }).first().fill('Livrable 1\nLivrable 2');
  await page.getByRole('spinbutton', { name: /Montant HT/ }).first().fill('1800');
  await page.getByLabel('Nom du service tiers').first().fill('Hébergement personnalisé');
  await page.getByLabel('Description du service tiers').first().fill('À dimensionner');
  await page.locator('.devisView__section-actions--phase').screenshot({ path: 'test-results/devis-ajouter-phase-layout.png' });
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.thirdPartyServices[0]?.description).toBe('À dimensionner');
  const saved = [...api.drafts.values()][0].snapshot;
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Intitulé de la phase').first()).toHaveValue('Phase personnalisée');
  await expect(page.getByLabel('Description de la prestation').first()).toHaveValue('Livrable 1\nLivrable 2');
  await expect(page.getByRole('spinbutton', { name: /Montant HT/ }).first()).toHaveValue('1800');
  await expect(page.getByLabel('Nom du service tiers').first()).toHaveValue('Hébergement personnalisé');
  await expect(page.getByLabel('Description du service tiers').first()).toHaveValue('À dimensionner');
  await page.getByLabel('Objectif principal').fill('Objectif complété après reprise');
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.formState.objective).toBe('Objectif complété après reprise');
  const updated = [...api.drafts.values()][0].snapshot;
  expect(updated.projectSections).toEqual(saved.projectSections);
  expect(updated.thirdPartyServices).toEqual(saved.thirdPartyServices);
  expect(updated.selectedTemplateIds).toEqual(saved.selectedTemplateIds);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('region', { name: 'Brouillons de devis' }).screenshot({ path: 'test-results/usv-devis-drafts-ux.png', animations: 'disabled' });
});

test('une saisie interrompue avant la temporisation reste récupérable, puis supprimable', async ({ page }) => {
  const api = await installDraftApi(page, { offline: true });
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await page.getByLabel('Entreprise', { exact: true }).fill('Interruption immédiate');
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Entreprise', { exact: true })).toHaveValue('Interruption immédiate');
  api.options.offline = false;
  await page.getByRole('button', { name: 'Sauvegarder maintenant', exact: true }).click();
  await expect.poll(() => api.drafts.size).toBe(1);
  await page.getByText('Autres actions', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Supprimer ce brouillon', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Supprimer ce brouillon', exact: true }).click();
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect.poll(() => api.drafts.size).toBe(0);
  await expect(page.getByLabel('Entreprise', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Reprendre le devis', exact: true })).toBeDisabled();
});

test('le sélecteur recherche un ancien devis et la reprise reste une action explicite', async ({ page }) => {
  const api = await installDraftApi(page);
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await page.getByLabel('Entreprise', { exact: true }).fill('Premier client');
  await page.getByLabel('Besoin exprimé').fill('Premier besoin');
  await expect.poll(() => api.drafts.size).toBe(1);
  await page.getByRole('button', { name: 'Changer de devis', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Nouveau devis', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await page.getByLabel('Entreprise', { exact: true }).fill('Deuxième client');
  await expect.poll(() => api.drafts.size).toBe(2);
  await page.getByRole('button', { name: 'Changer de devis', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reprendre le devis', exact: true })).toBeEnabled();
  const select = page.getByRole('combobox', { name: 'Quel devis souhaitez-vous reprendre ?' });
  await select.fill('Premier');
  await page.getByRole('option', { name: /Premier client/ }).click();
  await expect(page.getByLabel('Entreprise', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Entreprise', { exact: true })).toHaveValue('Premier client');
  await expect(page.getByLabel('Besoin exprimé')).toHaveValue('Premier besoin');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('region', { name: 'Brouillons de devis' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Changer de devis', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('region', { name: 'Brouillons de devis' }).screenshot({ path: 'test-results/usv-devis-drafts-mobile.png', animations: 'disabled' });
});

test('créer, nommer et reprendre sont trois étapes explicites, sans mélange des devis', async ({ page }) => {
  const api = await installDraftApi(page);
  await page.goto('/commercial/devis');
  await expect(page.getByLabel('Entreprise', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Quel devis souhaitez-vous reprendre ?' })).toHaveCount(0);
  await expect(page.getByLabel('Nom du devis', { exact: true })).toBeFocused();
  await page.getByLabel('Nom du devis', { exact: true }).fill('Zoenoe — Test octobre');
  await page.getByLabel('Entreprise', { exact: true }).fill('Zoenoe');
  await page.getByLabel('Besoin exprimé').fill('Besoin à reprendre');
  await expect.poll(() => [...api.drafts.values()][0]?.title).toBe('Zoenoe — Test octobre');
  await page.getByRole('button', { name: 'Changer de devis', exact: true }).click();
  await expect(page.getByLabel('Nom du devis', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await expect(page.getByLabel('Nom du devis', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Entreprise', { exact: true })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Quel devis souhaitez-vous reprendre ?' })).toHaveCount(0);
  expect(api.drafts.size).toBe(1);
  await page.getByRole('button', { name: 'Changer de devis', exact: true }).click();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Nom du devis', { exact: true })).toHaveValue('Zoenoe — Test octobre');
  await expect(page.getByLabel('Besoin exprimé')).toHaveValue('Besoin à reprendre');
  await page.getByLabel('Nom du devis', { exact: true }).fill('Zoenoe — Version corrigée');
  await expect.poll(() => [...api.drafts.values()][0]?.title).toBe('Zoenoe — Version corrigée');
  expect(api.drafts.size).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Nom du devis', { exact: true })).toHaveValue('Zoenoe — Version corrigée');
  await page.getByRole('region', { name: 'Brouillons de devis' }).screenshot({ path: 'test-results/usv-devis-workflow-edit.png', animations: 'disabled' });
});


test('le compte client conserve les tarifs et clauses, se restaure et génère les bons libellés', async ({ page }) => {
  const api = await installDraftApi(page);
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await page.getByLabel('Entreprise', { exact: true }).fill('Comptes clients');
  await page.getByRole('spinbutton', { name: /Rendez-vous/ }).fill('150');
  await page.locator('.devisView__campaign-type .react-select__control').click();
  await page.getByRole('option', { name: 'Compte client', exact: true }).click();
  await expect(page.getByText('Tarification au compte client', { exact: true })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /Compte client/ })).toHaveValue('150');
  await expect(page.getByLabel('Description du compte client')).toHaveValue('Tarif unitaire facturé pour chaque compte client.');
  await page.getByLabel('Description du compte client').fill('Compte validé par le client');
  await page.getByRole('button', { name: 'Ajouter une clause' }).click();
  await page.getByLabel('Intitulé de la clause').fill('Compte premium');
  await page.getByLabel('Montant de la clause').fill('250');
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.customClauses[0]?.amount).toBe(250);
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: /Compte client/ })).toHaveValue('150');
  await expect(page.getByLabel('Description du compte client')).toHaveValue('Compte validé par le client');
  await page.locator('.devisView__campaign-type .react-select__control').click();
  await page.getByRole('option', { name: 'Rendez-vous qualifié', exact: true }).click();
  await expect(page.getByLabel('Description du rendez-vous')).toHaveValue('Compte validé par le client');
  await page.locator('.devisView__campaign-type .react-select__control').click();
  await page.getByRole('option', { name: 'Compte client', exact: true }).click();
  await page.getByRole('button', { name: 'Éditer le devis', exact: true }).click();
  await expect.poll(() => api.generated.length).toBe(1);
  expect(api.generated[0]).toMatchObject({ pricing_model: 'client_account', lines: [
    expect.objectContaining({ label: 'Compte client', amount: 150, amount_kind: 'currency', description: 'Compte validé par le client' }),
    expect.objectContaining({ label: 'Compte premium', amount: 250, amount_kind: 'currency' }),
  ] });
});


test('le devis libre combine forfait primes et conception sans famille et conserve la reprise', async ({ page }) => {
  const api = await installDraftApi(page);
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await expect(page.getByText('Famille d’expertise', { exact: true })).toHaveCount(0);
  await page.getByLabel('Entreprise', { exact: true }).fill('Offre libre');
  await page.locator('summary').filter({ hasText: 'Prestations libres et primes' }).click();
  await page.getByRole('button', { name: 'Ajouter une prestation ou une prime' }).click();
  await page.getByLabel('Intitulé de la prestation libre').fill('Action commerciale');
  await page.getByLabel('Montant de la prestation libre').fill('1200');
  await page.locator('.devisView__service-unit-select .react-select__control').first().click();
  await expect(page.getByRole('option', { name: 'Euros HT (€)', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Pourcentage (%)', exact: true })).toHaveCount(0);
  await page.getByRole('option', { name: 'Euros HT (€)', exact: true }).click();
  await page.locator('.devisView__accordion').filter({ has: page.locator('summary').filter({ hasText: /^Prestations libres et primes/ }) }).screenshot({ path: 'test-results/devis-prestations-layout-desktop.png' });
  await page.getByRole('button', { name: 'Ajouter une prestation ou une prime' }).click();
  await page.getByLabel('Intitulé de la prestation libre').nth(1).fill('Prime par client signé');
  await page.locator('.devisView__service-pricing-select .react-select__control').nth(1).click();
  await page.getByRole('option', { name: 'Prime variable / au résultat', exact: true }).click();
  await page.getByLabel('Montant de la prestation libre').nth(1).fill('200');
  await page.getByLabel('Déclenchement et base de calcul').fill('Par nouveau client signé');
  await page.getByRole('button', { name: 'Ajouter une prestation ou une prime' }).click();
  await page.getByLabel('Intitulé de la prestation libre').nth(2).fill('Prime sur CA');
  await page.locator('.devisView__service-pricing-select .react-select__control').nth(2).click();
  await page.getByRole('option', { name: 'Prime variable / au résultat', exact: true }).click();
  await page.locator('.devisView__service-unit-select .react-select__control').nth(2).click();
  await expect(page.getByRole('option', { name: 'Euros HT (€)', exact: true })).toBeVisible();
  await page.getByRole('option', { name: 'Pourcentage (%)', exact: true }).click();
  await page.getByLabel('Montant de la prestation libre').nth(2).fill('5');
  await page.getByLabel('Déclenchement et base de calcul').nth(1).fill('CA HT de la première commande');
  await page.getByRole('button', { name: 'Éditer le devis', exact: true }).click();
  await expect.poll(() => api.generated.length).toBe(1);
  expect(api.generated[0]).toMatchObject({ pricing_model: 'qualified_appointment', project_sections: [expect.objectContaining({ id: 'flexible-services' })], lines: [
    expect.objectContaining({ amount: 1200, pricing_basis: 'fixed' }),
    expect.objectContaining({ amount: 200, pricing_basis: 'variable' }),
    expect.objectContaining({ amount: 5, amount_kind: 'percentage', pricing_basis: 'variable' }),
  ] });
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.flexibleServices?.[2]?.condition).toBe('CA HT de la première commande');
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Montant de la prestation libre').nth(2)).toHaveValue('5');
  await page.locator('summary').filter({ hasText: 'Conception' }).click();
  await page.getByLabel('Intitulé de la phase').first().fill('Site web');
  await page.getByLabel('Intitulé de la prestation', { exact: true }).first().fill('Création du site');
  await page.getByRole('spinbutton', { name: /Montant HT/ }).first().fill('1800');
  await page.getByRole('spinbutton', { name: /Rendez-vous/ }).fill('75');
  await page.locator('summary').filter({ hasText: 'Conception' }).click();
  await page.getByRole('button', { name: 'Éditer le devis', exact: true }).click();
  await expect.poll(() => api.generated.length).toBe(2);
  expect(api.generated[1]).toMatchObject({ project_sections: [
    expect.objectContaining({ id: 'conquete' }), expect.objectContaining({ id: 'flexible-services' }), expect.objectContaining({ title: 'Site web' }),
  ] });
  const total = page.locator('.devisView__pricing > div').filter({ has: page.getByText('Total fixe HT', { exact: true }) });
  await expect(total).toContainText(/3[\s\u202f]000/);
  await page.locator('.devisView__flexible-service').first().screenshot({ path: 'test-results/devis-prestation-libre.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.devisView__flexible-service').last().screenshot({ path: 'test-results/devis-prime-mobile.png' });
  await page.locator('.devisView__service-pricing-select .react-select__control').nth(2).click();
  await page.getByRole('option', { name: 'Coût fixe', exact: true }).click();
  await expect(page.locator('.devisView__service-unit-select').nth(2)).toContainText('Euros HT (€)');
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.flexibleServices?.[2]?.amountKind).toBe('currency');
  expect([...api.drafts.values()][0].snapshot.flexibleServices?.[2]?.pricing).toBe('fixed');
});

test('les titres libres structurent Conquête et les prestations avec les mêmes suggestions que les phases', async ({ page }) => {
  const api = await installDraftApi(page);
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await page.getByLabel('Entreprise', { exact: true }).fill('Offre structurée');
  const title = page.getByLabel('Intitulé du bloc de prestations', { exact: true });
  await expect(title).toHaveValue('');
  await expect(title).toHaveAttribute('placeholder', /Conquête, Fidélisation, Rétention, Conception, Visibilité online, Branding/);
  const listId = await title.getAttribute('list');
  await expect(page.locator('datalist').filter({ has: page.locator('option[value="Conquête"]') })).toHaveCount(7);
  expect(listId).toBeTruthy();
  await title.fill('Développement des comptes professionnels');
  await page.getByLabel('Intitulé de la prestation tarifée', { exact: true }).fill('Compte professionnel validé');
  await page.getByRole('spinbutton', { name: /Rendez-vous/ }).fill('185');
  await page.getByLabel('Description du rendez-vous').fill('Qualification du décideur.\nRemise du compte rendu.');
  await page.getByRole('button', { name: 'Ajouter une clause', exact: true }).click();
  await page.getByLabel('Intitulé de la clause').fill('Ciblage complémentaire');
  await page.getByLabel('Description de la clause').fill('Analyse de la base transmise.\nValidation des critères de ciblage.');
  await page.getByLabel('Montant de la clause').fill('65');
  await page.locator('summary').filter({ hasText: /^Prestations libres et primes/ }).click();
  await page.getByLabel('Intitulé de la section prestations libres', { exact: true }).fill('Animation et fidélisation du portefeuille');
  await page.getByRole('button', { name: 'Ajouter une prestation ou une prime', exact: true }).click();
  await page.getByLabel('Intitulé de la prestation libre').fill('Suivi du portefeuille');
  await page.getByLabel('Description de la prestation libre').fill('Suivi hebdomadaire et compte rendu mensuel.');
  await page.getByLabel('Montant de la prestation libre').fill('1200');
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.flexibleSectionTitle).toBe('Animation et fidélisation du portefeuille');
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Intitulé du bloc de prestations', { exact: true })).toHaveValue('Développement des comptes professionnels');
  await expect(page.getByLabel('Intitulé de la prestation tarifée', { exact: true })).toHaveValue('Compte professionnel validé');
  await expect(page.getByLabel('Description de la clause')).toHaveValue('Analyse de la base transmise.\nValidation des critères de ciblage.');
  await page.getByRole('button', { name: 'Éditer le devis', exact: true }).click();
  await expect.poll(() => api.generated.length).toBe(1);
  expect(api.generated[0]).toMatchObject({ project_sections: [
    expect.objectContaining({ title: 'Développement des comptes professionnels', show_title: true, lines: [
      expect.objectContaining({ label: 'Compte professionnel validé', description: 'Qualification du décideur.\nRemise du compte rendu.', amount: 185 }),
      expect.objectContaining({ label: 'Ciblage complémentaire', description: 'Analyse de la base transmise.\nValidation des critères de ciblage.', amount: 65 }),
    ] }),
    expect.objectContaining({ title: 'Animation et fidélisation du portefeuille', show_title: true }),
  ] });
  await page.locator('.devisView__campaign-type .react-select__control').click();
  await page.getByRole('option', { name: 'Commercial', exact: true }).click();
  await page.getByLabel('Intitulé de la prestation tarifée', { exact: true }).fill('Apport commercial');
  await page.getByLabel('Description de la commission').fill('Commission appliquée au chiffre d’affaires HT encaissé.');
  await page.getByRole('spinbutton', { name: /Commission par vente/ }).fill('7.5');
  await page.getByRole('button', { name: 'Éditer le devis', exact: true }).click();
  await expect.poll(() => api.generated.length).toBe(2);
  expect(api.generated[1]).toMatchObject({ lines: expect.arrayContaining([
    expect.objectContaining({ label: 'Apport commercial', description: 'Commission appliquée au chiffre d’affaires HT encaissé.', amount: 7.5, amount_kind: 'percentage' }),
  ]) });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.devisView__accordion').first().screenshot({ path: 'test-results/devis-conquete-structure-mobile.png' });
});


test('tous les champs du devis complet et le payload PDF survivent à une reprise exclusivement serveur', async ({ page }) => {
  const api = await installDraftApi(page);
  const original = quoteDraftFixture(completeQuoteSnapshot());
  api.drafts.set(original.id, original);
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Nom du devis', { exact: true })).toHaveValue(original.snapshot.draftName!);
  await expect(page.getByLabel('Description de la clause').first()).toHaveValue(original.snapshot.customClauses[0].description!);
  await expect(page.getByLabel('Montant de la prestation libre').nth(2)).toHaveValue('5.25');
  await page.getByLabel('Intitulé du bloc de prestations', { exact: true }).fill('Acquisition — version finale');
  await page.getByLabel('Description de la clause').first().fill('Analyse du besoin complétée.\nNouvelle restitution.');
  await page.getByLabel('Montant de la prestation libre').nth(2).fill('6.75');
  await page.getByLabel('Condition commerciale').fill('Conditions finales.\nPrimes après encaissement effectif.');
  await page.getByRole('button', { name: 'Sauvegarder maintenant', exact: true }).click();
  await expect.poll(() => api.drafts.get(original.id)?.snapshot.flexibleServices?.[2]?.amount).toBe(6.75);
  const saved = structuredClone(api.drafts.get(original.id)!);
  const expected = { ...original.snapshot, conquestSectionTitle: 'Acquisition — version finale',
    customClauses: original.snapshot.customClauses.map((clause, index) => index === 0 ? { ...clause, description: 'Analyse du besoin complétée.\nNouvelle restitution.' } : clause),
    flexibleServices: original.snapshot.flexibleServices!.map((service, index) => index === 2 ? { ...service, amount: 6.75 } : service),
    formState: { ...original.snapshot.formState, commercialConditions: 'Conditions finales.\nPrimes après encaissement effectif.' } };
  expect(JSON.parse(JSON.stringify(saved.snapshot))).toEqual(JSON.parse(JSON.stringify(expected)));
  await page.getByRole('button', { name: 'Éditer le devis', exact: true }).click();
  await expect.poll(() => api.generated.length).toBe(1);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Intitulé du bloc de prestations', { exact: true })).toHaveValue('Acquisition — version finale');
  await expect(page.getByLabel('Intitulé de la phase').last()).toHaveValue('Accompagnement du lancement');
  await expect(page.getByLabel('Nom du service tiers').last()).toHaveValue('Service complémentaire');
  await expect(page.getByLabel('Montant de la prestation libre').nth(2)).toHaveValue('6.75');
  await page.getByRole('button', { name: 'Éditer le devis', exact: true }).click();
  await expect.poll(() => api.generated.length).toBe(2);
  expect(api.generated[1]).toEqual(api.generated[0]);
  await page.getByText('Autres actions', { exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer une copie', exact: true }).click();
  await expect.poll(() => api.drafts.size).toBe(2);
  const copied = [...api.drafts.values()].find(draft => draft.id !== original.id)!;
  expect({ ...copied.snapshot, draftName: expected.draftName }).toEqual(JSON.parse(JSON.stringify(expected)));
  expect(api.drafts.get(original.id)?.snapshot).toEqual(saved.snapshot);
  await page.getByRole('button', { name: 'Changer de devis', exact: true }).click();
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await expect(page.getByLabel('Nom du devis', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Intitulé du bloc de prestations', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Intitulé de la section prestations libres', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Montant de la prestation libre')).toHaveCount(0);
});

test('le devis complet modifié hors ligne est repris puis synchronisé sans perte des nouveaux champs', async ({ page }) => {
  const api = await installDraftApi(page);
  const original = quoteDraftFixture(completeQuoteSnapshot());
  api.drafts.set(original.id, original);
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Entreprise', { exact: true })).toHaveValue('Entreprise exemple');
  api.options.offline = true;
  await page.getByLabel('Intitulé de la section prestations libres', { exact: true }).fill('Fidélisation — correction hors ligne');
  await page.getByLabel('Déclenchement et base de calcul').nth(1).fill('Sur le CA HT encaissé, après validation du relevé.');
  await expect(page.getByRole('status')).toContainText('Saisie conservée sur ce navigateur');
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Intitulé de la section prestations libres', { exact: true })).toHaveValue('Fidélisation — correction hors ligne');
  await expect(page.getByLabel('Déclenchement et base de calcul').nth(1)).toHaveValue('Sur le CA HT encaissé, après validation du relevé.');
  await expect(page.getByLabel('Description de la clause').first()).toHaveValue(original.snapshot.customClauses[0].description!);
  api.options.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect.poll(() => api.drafts.get(original.id)?.snapshot.flexibleSectionTitle).toBe('Fidélisation — correction hors ligne');
  const saved = api.drafts.get(original.id)!.snapshot;
  expect(saved.projectSections).toEqual(JSON.parse(JSON.stringify(original.snapshot.projectSections)));
  expect(saved.thirdPartyServices).toEqual(original.snapshot.thirdPartyServices);
  expect(saved.flexibleServices?.[2].condition).toBe('Sur le CA HT encaissé, après validation du relevé.');
});

test('un ancien brouillon sans les nouveaux champs se reprend et se sauvegarde sans effacer ses prestations', async ({ page }) => {
  const api = await installDraftApi(page);
  const legacy = completeQuoteSnapshot();
  delete legacy.conquestSectionTitle;
  delete legacy.flexibleSectionTitle;
  delete legacy.conquestLineLabel;
  delete legacy.commercialCommissionDescription;
  delete legacy.flexibleServices;
  legacy.campaignType = 'qualified_appointment';
  legacy.customClauses = legacy.customClauses.map(clause => {
    const withoutDescription = { ...clause };
    delete withoutDescription.description;
    return withoutDescription;
  });
  const original = quoteDraftFixture(legacy);
  api.drafts.set(original.id, original);
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(page.getByLabel('Intitulé du bloc de prestations', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Intitulé de la prestation tarifée', { exact: true })).toHaveValue('Rendez-vous');
  await expect(page.getByLabel('Description de la clause').first()).toHaveValue('');
  await page.getByLabel('Entreprise', { exact: true }).fill('Entreprise historique corrigée');
  await expect.poll(() => api.drafts.get(original.id)?.snapshot.formState.companyName).toBe('Entreprise historique corrigée');
  const saved = api.drafts.get(original.id)!.snapshot;
  expect(saved.projectSections).toEqual(JSON.parse(JSON.stringify(legacy.projectSections)));
  expect(saved.thirdPartyServices).toEqual(legacy.thirdPartyServices);
  expect(saved.customClauses).toEqual(JSON.parse(JSON.stringify(legacy.customClauses)));
  expect(saved.appointmentRate).toBe(legacy.appointmentRate);
  expect(saved.appointmentDescription).toBe(legacy.appointmentDescription);
});

test('plusieurs blocs de prestations indépendants se sauvegardent et composent le document dans le nouvel ordre', async ({ page }) => {
  const api = await installDraftApi(page);
  await page.goto('/commercial/devis');
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await expect(page.locator('.devisView__accordion > summary')).toHaveText([
    /Prestations\s+0 ligne/, /Prestations libres et primes/, /Conception/,
  ]);
  await page.getByLabel('Entreprise', { exact: true }).fill('Prestations combinées');
  await page.getByLabel('Intitulé du bloc de prestations').fill('Rendez-vous partenaires');
  await page.getByRole('spinbutton', { name: /Rendez-vous/ }).fill('125');
  await page.getByRole('button', { name: 'Ajouter un bloc de prestations', exact: true }).click();
  const account = page.locator('.devisView__service-block').nth(0);
  await account.getByLabel('Intitulé du bloc de prestations').fill('Comptes professionnels');
  await account.locator('.react-select__control').click();
  await page.getByRole('option', { name: 'Compte client', exact: true }).click();
  await expect(account.getByLabel('Intitulé de la prestation tarifée')).toHaveValue('Compte client');
  await account.getByRole('spinbutton', { name: /Compte client/ }).fill('275');
  await account.getByLabel('Description du compte client').fill('Compte validé et première commande encaissée.');
  await account.getByRole('button', { name: 'Ajouter une clause', exact: true }).click();
  await account.getByLabel('Intitulé de la clause').fill('Vérification complémentaire');
  await account.getByLabel('Description de la clause').fill('Contrôle du dossier professionnel.');
  await account.getByLabel('Montant de la clause').fill('35');
  await page.getByRole('button', { name: 'Ajouter un bloc de prestations', exact: true }).click();
  const commercial = page.locator('.devisView__service-block').nth(1);
  await commercial.getByLabel('Intitulé du bloc de prestations').fill('Ventes partenaires');
  await commercial.locator('.react-select__control').click();
  await page.getByRole('option', { name: 'Commercial', exact: true }).click();
  await commercial.getByRole('spinbutton', { name: 'Commission par vente' }).fill('7.5');
  await commercial.getByLabel('Description de la commission').fill('Sur le CA HT encaissé.');
  await page.getByRole('button', { name: 'Ajouter un bloc de prestations', exact: true }).click();
  await expect(page.locator('.devisView__service-block')).toHaveCount(3);
  // A deliberately empty block is saved, but omitted from the document.
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.additionalServiceBlocks?.length).toBe(3);
  const savedBlocks = [...api.drafts.values()][0].snapshot.additionalServiceBlocks;
  await page.reload();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre le devis', exact: true }).click();
  await expect(account.getByRole('spinbutton', { name: /Compte client/ })).toHaveValue('275');
  await expect(account.getByLabel('Montant de la clause')).toHaveValue('35');
  await expect(commercial.getByRole('spinbutton', { name: 'Commission par vente' })).toHaveValue('7.5');
  await expect(page.getByRole('spinbutton', { name: /Rendez-vous/ }).first()).toHaveValue('125');
  await page.locator('summary').filter({ hasText: /^Prestations libres et primes/ }).click();
  await page.getByRole('button', { name: 'Ajouter une prestation ou une prime' }).click();
  await page.getByLabel('Intitulé de la prestation libre').fill('Lancement');
  await page.getByLabel('Montant de la prestation libre').fill('950');
  await page.locator('summary').filter({ hasText: /^Conception/ }).click();
  await page.getByLabel('Intitulé de la phase').first().fill('Supports commerciaux');
  await page.getByLabel('Intitulé de la prestation', { exact: true }).first().fill('Création des supports');
  await page.getByRole('spinbutton', { name: /Montant HT/ }).first().fill('450');
  await page.getByRole('button', { name: 'Éditer le devis', exact: true }).click();
  await expect.poll(() => api.generated.length).toBe(1);
  expect(api.generated[0]).toMatchObject({ project_sections: [
    expect.objectContaining({ id: 'conquete', title: 'Rendez-vous partenaires', lines: [expect.objectContaining({ amount: 125, pricing_basis: 'unit' })] }),
    expect.objectContaining({ title: 'Comptes professionnels', lines: [
      expect.objectContaining({ amount: 275, description: 'Compte validé et première commande encaissée.' }),
      expect.objectContaining({ amount: 35, description: 'Contrôle du dossier professionnel.' }),
    ] }),
    expect.objectContaining({ title: 'Ventes partenaires', lines: [expect.objectContaining({ amount: 7.5, amount_kind: 'percentage' })] }),
    expect.objectContaining({ id: 'flexible-services' }),
    expect.objectContaining({ title: 'Supports commerciaux' }),
  ] });
  const documentPayload = api.generated[0] as { lines: Array<{ id: string }> };
  expect(new Set(documentPayload.lines.map(line => line.id)).size).toBe(documentPayload.lines.length);
  expect([...api.drafts.values()][0].snapshot.additionalServiceBlocks).toEqual(savedBlocks);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await account.screenshot({ path: 'test-results/devis-blocs-prestations-mobile.png' });
  await account.getByRole('button', { name: 'Supprimer ce bloc de prestations' }).click();
  await expect(page.locator('.devisView__service-block')).toHaveCount(2);
  await expect.poll(() => [...api.drafts.values()][0]?.snapshot.additionalServiceBlocks?.length).toBe(2);
  await page.getByRole('button', { name: 'Changer de devis', exact: true }).click();
  await page.getByRole('button', { name: 'Nouveau devis', exact: true }).click();
  await expect(page.locator('.devisView__service-block')).toHaveCount(0);
});
