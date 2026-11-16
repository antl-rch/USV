import { expect, test } from '@playwright/test';
import { apiSuccess, fulfillJson, installApiRoute, SALES_CAMPAIGN } from './support.ts';

test('la grille hebdomadaire conserve les heures hors du pas et enregistre les fermetures', async ({ page }) => {
  const unhandled: string[] = [];
  const campaign = { ...SALES_CAMPAIGN, id_campagne: 15, nom_campagne: 'Creantl', type_campagne: 'lead_b2b', bon_commande_config: {
    lead_booking: { open_weekdays: [1, 2, 3, 4, 5], interval_minutes: 60, weekly_slots: { 1: ['11:00', '11:15'], 5: ['14:00'] }, allow_manual_time: false },
  } };
  let saved: Record<string, unknown> | null = null;
  await installApiRoute(page, async (route, request) => {
    if (request.method === 'GET' && request.path === '/campagnes/15') {
      await fulfillJson(route, apiSuccess(campaign)); return true;
    }
    if (request.method === 'GET' && request.path === '/campagnes') {
      await fulfillJson(route, apiSuccess([campaign])); return true;
    }
    if (request.method === 'GET' && request.path === '/campagnes/15/agents') {
      await fulfillJson(route, apiSuccess([])); return true;
    }
    if (request.method === 'PUT' && request.path === '/campagnes/15') {
      saved = route.request().postDataJSON() as Record<string, unknown>;
      await fulfillJson(route, apiSuccess(campaign)); return true;
    }
    return false;
  }, unhandled);
  await page.goto('/campagnes/15');
  await page.getByRole('button', { name: 'Choisir les créneaux ouverts aux rendez-vous' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const monday = dialog.getByRole('button', { name: 'Lundi 11:00', exact: true });
  await expect(monday).toHaveAttribute('aria-pressed', 'true');
  await monday.click();
  await expect(monday).toHaveAttribute('aria-pressed', 'false');
  await dialog.getByRole('combobox', { name: 'Pas de la grille' }).press('ArrowDown');
  await dialog.getByRole('option', { name: 'Demi-heure', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Lundi 11:15', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Vendredi 18:00', exact: true }).click();
  await page.screenshot({ path: '/tmp/antl-lead-schedule.png' });
  await dialog.getByRole('button', { name: 'Appliquer à la campagne' }).click();
  await expect(dialog).not.toBeVisible();
  const externalConfirmation = page.getByLabel('Envoyer également la confirmation au prospect');
  await expect(externalConfirmation).not.toBeChecked();
  await externalConfirmation.check();
  await page.getByRole('button', { name: 'Mettre à jour', exact: true }).click();
  await expect.poll(() => saved).not.toBeNull();
  expect(saved).toMatchObject({ bon_commande_config: { creantl_booking: { notify_external: true }, lead_booking: { interval_minutes: 30, allow_manual_time: false, weekly_slots: { 1: ['11:15'], 5: ['14:00', '18:00'] } } } });
  expect(unhandled).toEqual([]);
});
