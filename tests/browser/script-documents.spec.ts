import { expect, test } from '@playwright/test';
import { apiSuccess, fulfillJson, installApiRoute, SALES_CAMPAIGN } from './support.ts';

test('la fiche campagne enregistre un expéditeur et ajoute un second PDF remplaçable', async ({ page }) => {
  const campaign = { ...SALES_CAMPAIGN, id_campagne: 19, nom_campagne: 'Maison Hemel' };
  const endpoint = '/campagnes/19/documents-script';
  const mailbox = { sender_name: 'Maison Hemel', sender_email: 'fixture@example.test', has_password: true };
  const brochure = {
    id: '19000000-0000-4000-8000-000000000001', label: 'Plaquette', position: 0,
    message: 'Bonjour', subject: 'Plaquette', enabled: true, attachment_filename: 'Maison Hemel.pdf', revision: 1,
  };
  const catalog = {
    ...brochure,
    id: '19000000-0000-4000-8000-000000000002',
    label: 'Catalogue',
    attachment_filename: 'catalogue.pdf',
    signature_text: '{{agent}} · Maison Hemel',
    signature_layout: 'side_by_side' as const,
    signature_image_filename: 'signature-hemel.png',
  };
  const unexpected: string[] = [];

  await installApiRoute(page, async (route, request) => {
    if (request.path === '/campagnes/19') { await fulfillJson(route, apiSuccess(campaign)); return true; }
    if (request.path === '/campagnes') { await fulfillJson(route, apiSuccess([campaign])); return true; }
    if (request.path === '/campagnes/19/agents') { await fulfillJson(route, apiSuccess([])); return true; }
    if (request.path === endpoint && request.method === 'GET') {
      await fulfillJson(route, apiSuccess({ mailbox, documents: [brochure] }));
      return true;
    }
    if (request.path === `${endpoint}/expediteur` && request.method === 'PUT') {
      expect(route.request().postDataJSON()).toEqual({ sender_name: 'Équipe Hemel', sender_email: mailbox.sender_email });
      await fulfillJson(route, apiSuccess({ ...mailbox, sender_name: 'Équipe Hemel' }));
      return true;
    }
    if (request.path === endpoint && request.method === 'POST') {
      expect(route.request().postData()).toContain('filename="catalogue.pdf"');
      expect(route.request().postData()).toContain('filename="signature-hemel.png"');
      expect(route.request().postData()).toMatch(/name="signature_layout"\r\n\r\nside_by_side/);
      expect(route.request().postData()).toContain('{{agent}} · Maison Hemel');
      expect(route.request().postData()).toContain('Catalogue');
      await fulfillJson(route, apiSuccess(catalog), 201);
      return true;
    }
    if (request.path === `${endpoint}/${catalog.id}` && request.method === 'POST') {
      expect(route.request().postData()).toContain('filename="nouveau.pdf"');
      expect(route.request().postData()).toMatch(/name="revision"\r\n\r\n1/);
      expect(route.request().postData()).toMatch(/name="enabled"\r\n\r\nfalse/);
      expect(route.request().postData()).toMatch(/name="remove_signature_image"\r\n\r\ntrue/);
      await fulfillJson(route, apiSuccess({
        ...catalog,
        attachment_filename: 'nouveau.pdf',
        signature_image_filename: null,
        enabled: false,
        revision: 2,
      }));
      return true;
    }
    return false;
  }, unexpected);
  await page.route('**/api/employes', async (route) => fulfillJson(route, apiSuccess({ employes: [] })));
  await page.goto('/campagnes/19');
  const section = page.getByRole('region', { name: 'Documents à envoyer depuis Script' });
  await expect(section.getByLabel('Mot de passe SMTP')).toHaveValue('');
  await section.getByLabel('Nom affiché').fill('Équipe Hemel');
  await section.getByRole('button', { name: 'Enregistrer l’expéditeur' }).click();
  await expect(section.getByRole('status')).toHaveText('Expéditeur enregistré.');

  await section.getByLabel('Libellé dans Script').fill('Catalogue');
  await section.getByLabel('Objet du mail').fill('Votre catalogue');
  await section.getByLabel('Texte du mail').fill('Bonjour, voici votre catalogue.');
  await section.getByLabel('Texte de la signature').fill('{{agent}} · Maison Hemel');
  await section.getByLabel('Côte à côte (image à gauche, texte à droite)').check();
  const signatureImage = {
    mimeType: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  };
  await section.getByLabel('Image de signature').setInputFiles({ ...signatureImage, name: 'signature-hemel.png' });
  const file = { mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7') };
  await section.getByLabel('Fichier PDF').setInputFiles({ ...file, name: 'catalogue.pdf' });
  await section.getByLabel('Afficher le bouton dans Script').check();
  await section.getByRole('button', { name: 'Enregistrer le bouton' }).click();
  await expect(section.getByText('catalogue.pdf · Version 1')).toBeVisible();
  await expect(section.getByText('Image de signature : signature-hemel.png')).toBeVisible();
  const selector = section.getByRole('combobox', { name: 'Document à modifier' });
  await selector.click();
  await expect(section.getByRole('option')).toHaveText(['Nouveau bouton', 'Plaquette · Visible', 'Catalogue · Visible']);
  await section.getByRole('option', { name: 'Catalogue · Visible', exact: true }).click();

  await section.getByLabel('Remplacer le PDF').setInputFiles({ ...file, name: 'nouveau.pdf' });
  await section.getByLabel('Retirer l’image de signature').check();
  await section.getByLabel('Afficher le bouton dans Script').uncheck();
  await section.getByRole('button', { name: 'Enregistrer le bouton' }).click();
  await expect(section.getByText('nouveau.pdf · Version 2')).toBeVisible();
  await expect(section.getByText('Image de signature : signature-hemel.png')).not.toBeVisible();
  await selector.click();
  await expect(section.getByRole('option')).toHaveText(['Nouveau bouton', 'Plaquette · Visible', 'Catalogue · Masqué']);
  await section.getByRole('option', { name: 'Plaquette · Visible', exact: true }).click();
  await expect(section.getByLabel('Libellé dans Script')).toHaveValue('Plaquette');
  expect(unexpected).toEqual([]);
});

test('les documents suivent la colonne du formulaire et tous les agents restent accessibles', async ({ page }, testInfo) => {
  const campaign = { ...SALES_CAMPAIGN, id_campagne: 19, nom_campagne: 'Maison Hemel' };
  const agents = Array.from({ length: 18 }, (_, index) => {
    const id = index + 1;
    return {
      id_affectation: id, id_campagne: 19, id_employe: id,
      agent: { nom: 'Martin', prenom: 'Camille', identifiant: `agent${id}` },
    };
  });
  const unexpected: string[] = [];
  await installApiRoute(page, async (route, request) => {
    if (request.path === '/campagnes/19') { await fulfillJson(route, apiSuccess(campaign)); return true; }
    if (request.path === '/campagnes') { await fulfillJson(route, apiSuccess([campaign])); return true; }
    if (request.path === '/campagnes/19/agents') { await fulfillJson(route, apiSuccess(agents)); return true; }
    return false;
  }, unexpected);

  await page.setViewportSize({ width: 1536, height: 850 });
  await page.goto('/campagnes/19');
  const documents = page.getByRole('region', { name: 'Documents à envoyer depuis Script' });
  const sidebar = page.getByRole('complementary').filter({ hasText: 'Agents affectés' });
  const editCampaign = page.getByRole('button', { name: 'Mettre à jour' });
  await expect(documents.getByLabel('Nom affiché')).toBeVisible();
  await expect(sidebar.getByRole('listitem')).toHaveCount(agents.length);

  const variant = page.getByRole('combobox', { name: 'Variante du script' });
  const campaignName = page.getByRole('textbox', { name: 'Nom de la campagne' });
  const variantControl = variant.locator('xpath=ancestor::div[contains(@class, "reactSelect__control")][1]');
  const height = async (field: typeof campaignName) => field.evaluate((input) => input.getBoundingClientRect().height);
  expect(await height(variantControl)).toBeCloseTo(await height(campaignName), 0);
  await variant.press('ArrowDown');
  await page.getByRole('option', { name: 'Lead B2B', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choisir les créneaux ouverts aux rendez-vous' })).toBeVisible();
  await variant.press('ArrowDown');
  await page.getByRole('option', { name: 'Vente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choisir les créneaux ouverts aux rendez-vous' })).not.toBeVisible();

  const campaignWidth = await editCampaign.locator('xpath=ancestor::form').evaluate((form) => form.clientWidth);
  expect(await documents.evaluate((element) => element.clientWidth)).toBe(campaignWidth);
  await documents.getByRole('heading').scrollIntoViewIfNeeded();
  await expect(sidebar).toHaveCSS('position', 'sticky');
  expect(await sidebar.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(93.5, 0);
  const lastAgentAction = sidebar.getByRole('button', { name: 'Retirer' }).last();
  await lastAgentAction.scrollIntoViewIfNeeded();
  await expect(lastAgentAction).toBeInViewport();
  expect(await sidebar.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await sidebar.evaluate((element) => { element.scrollTop = 0; });
  await page.screenshot({ path: testInfo.outputPath('campagne-desktop.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(sidebar).toHaveCSS('position', 'static');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await documents.getByRole('heading').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('campagne-mobile.png') });
  expect(unexpected).toEqual([]);
});
