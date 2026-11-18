import { expect, test, type Route } from "@playwright/test";
import {
  apiSuccess,
  fulfillJson as fulfillApiJson,
  installApiRoute as installBaseRoute,
  SALES_CAMPAIGN,
} from "./support.ts";
const asyncResults = new Map<string, { kind: string; result: unknown }>();
async function fulfillJson(route: Route, body: ReturnType<typeof apiSuccess>): Promise<void> {
  if (route.request().method() === "POST" && route.request().url().includes("/jobs/")) {
    const id = "22222222-2222-4222-8222-222222222222";
    const kind = route.request().url().endsWith("preview") ? "preview" : "execute";
    asyncResults.set(id, { kind, result: body.data });
    await fulfillApiJson(route, apiSuccess({ id, kind, status: "queued", result: null, error: null }), 202);
    return;
  }
  await fulfillApiJson(route, body);
}
async function installApiRoute(...args: Parameters<typeof installBaseRoute>): Promise<void> {
  const [page, handler, unhandled, user] = args;
  await installBaseRoute(page, async (route, request) => {
    if (request.method === "GET" && /\/targeting\/jobs\/[^/]+$/.test(request.path)) {
      const id = request.path.split("/").at(-1) || "";
      const stored = asyncResults.get(id);
      if (stored) {
        await fulfillApiJson(route, apiSuccess({ id, ...stored, status: "completed", error: null }));
        return true;
      }
    }
    return handler(route, request);
  }, unhandled, user);
}
const fields = [
  {
    field: "departement",
    label: "Départements",
    group: "Localisation",
    type: "list",
    operators: ["in", "not_in"],
  },
  {
    field: "effectif",
    label: "Taille de l’entreprise",
    group: "Effectif",
    type: "workforce",
    operators: ["range"],
  },
  {
    field: "source",
    label: "Sources",
    group: "Données",
    type: "list",
    operators: ["in", "not_in"],
  },
];
test("Hôtel se sélectionne dans Activités pour l’aperçu d’injection", async ({ page }) => {
  let submitted: unknown;
  await installApiRoute(page, async (route, request) => {
    if (request.path === "/campagnes/7") {
      await fulfillJson(route, apiSuccess(SALES_CAMPAIGN));
      return true;
    }
    if (request.path.endsWith("/targeting/catalog")) {
      await fulfillJson(route, apiSuccess({
        fields: [...fields, {
          field: "activite",
          label: "Activités",
          group: "Entreprise",
          type: "list",
          lookup: true,
          operators: ["in", "not_in", "exists", "missing"],
        }],
        categories: [],
      }));
      return true;
    }
    if (request.path.includes("/targeting/options/activite")) {
      await fulfillJson(route, apiSuccess([{ value: "@activity/hotels", label: "Hôtel" }]));
      return true;
    }
    if (request.path.endsWith("/targeting/saved") || request.path.endsWith("/targeting/operations")) {
      await fulfillJson(route, apiSuccess([]));
      return true;
    }
    if (request.path.endsWith("/targeting/jobs/preview")) {
      submitted = route.request().postDataJSON();
      await fulfillJson(route, apiSuccess({
        id: "11111111-1111-4111-8111-111111111111",
        action: "inject",
        summary: {
          matched: 1, eligible: 1, selected: 1, limit: 100,
          already_present: 0, blocked: 0, duplicates: 0, reminders: 0,
        },
        rows: [{
          id_prospect: 42,
          snapshot: {
            raison_sociale: "Grand Hôtel Test",
            activite: "Hôtels avec restaurant",
            workforce: { min: null, max: null, known: false, origine: "import" },
          },
        }],
      }));
      return true;
    }
    return false;
  });
  await page.goto("/operations/prospect/7/inject");
  await page.getByRole("button", { name: "Choisir une activité" }).click();
  const values = page.getByRole("combobox", { name: "Valeurs 0-0", exact: true });
  await values.fill("hotel");
  await page.getByRole("option", { name: "Hôtel", exact: true }).click();
  await values.press("Escape");
  await expect(page.getByText("Activités : Hôtel.", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Nombre maximum de fiches").fill("100");
  await page.getByRole("button", { name: "Voir les fiches correspondantes" }).click();
  await expect(page.getByRole("row", { name: /Grand Hôtel Test/ })).toBeVisible();
  expect(submitted).toMatchObject({
    action: "inject",
    criteria: { logic: "and", rules: [{ field: "activite", operator: "in", value: ["@activity/hotels"] }] },
  });
});

test("un ciblage enregistré restitue le libellé NAF même hors des options initiales", async ({ page }) => {
  const id = "@activity/naf-4511z";
  const label = "Commerce de voitures et de véhicules automobiles légers · NAF 45.11Z";
  const searches: string[] = [];
  await installApiRoute(page, async (route, request) => {
    if (request.path === "/campagnes/7") {
      await fulfillJson(route, apiSuccess(SALES_CAMPAIGN));
      return true;
    }
    if (request.path.endsWith("/targeting/catalog")) {
      await fulfillJson(route, apiSuccess({
        fields: [{ field: "activite", label: "Activités", group: "Entreprise", type: "list", lookup: true, operators: ["in", "not_in"] }],
        categories: [],
      }));
      return true;
    }
    if (request.path.endsWith("/targeting/saved")) {
      await fulfillJson(route, apiSuccess([{
        id: "11111111-1111-4111-8111-111111111111",
        nom: "Commerce automobile", active: true, exclusion: false,
        criteria: { logic: "and", rules: [{ field: "activite", operator: "in", value: [id] }] },
      }]));
      return true;
    }
    if (request.path.endsWith("/targeting/operations")) {
      await fulfillJson(route, apiSuccess([]));
      return true;
    }
    if (request.path.endsWith("/targeting/options/activite")) {
      const search = new URL(route.request().url()).searchParams.get("search") || "";
      searches.push(search);
      await fulfillJson(route, apiSuccess(search === id ? [{ value: id, label }] : []));
      return true;
    }
    return false;
  });
  await page.goto("/operations/prospect/7/inject");
  await page.getByRole("button", { name: "Charger les critères" }).click();
  await expect(page.getByText(`Activités : ${label}.`, { exact: true }).first()).toBeVisible();
  expect(searches.filter((term) => term === id)).toHaveLength(1);
});

test("ciblage multi-départements, inconnus, invalidation de l’analyse et retrait avec rappels", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  await installApiRoute(page, async (route, request) => {
    if (request.path === "/campagnes/7") {
      await fulfillJson(route, apiSuccess(SALES_CAMPAIGN));
      return true;
    }
    if (request.path.endsWith("/targeting/catalog")) {
      await fulfillJson(route, apiSuccess({ fields, categories: [] }));
      return true;
    }
    if (
      request.path.endsWith("/targeting/saved") ||
      request.path.endsWith("/targeting/operations")
    ) {
      await fulfillJson(route, apiSuccess([]));
      return true;
    }
    if (request.path.endsWith("/targeting/jobs/preview")) {
      requests.push(route.request().postDataJSON() as Record<string, unknown>);
      await fulfillJson(
        route,
        apiSuccess({
          id: "11111111-1111-4111-8111-111111111111",
          action: "withdraw",
          summary: {
            matched: 120,
            eligible: 120,
            selected: 100,
            limit: 100,
            already_present: 120,
            blocked: 0,
            duplicates: 0,
            reminders: 8,
          },
          rows: [
            {
              id_prospect: 42,
              snapshot: {
                raison_sociale: "Entreprise exemple",
                code_postal: "75012",
                ville: "Paris",
                activite: "Services",
                telephone: "0100000000",
                source: "import",
                workforce: {
                  min: null,
                  max: null,
                  known: false,
                  origine: "import",
                },
              },
            },
          ],
        }),
      );
      return true;
    }
    if (request.path.endsWith("/execute")) {
      await fulfillJson(
        route,
        apiSuccess({
          id: "11111111-1111-4111-8111-111111111111",
          action: "withdraw",
          affected: 99,
          skipped: 1,
          cancelled_reminders: 8,
        }),
      );
      return true;
    }
    return false;
  });
  await page.goto("/operations/prospect/7/inject?action=withdraw");
  await page
    .getByLabel("Nom du ciblage / de l’opération")
    .fill("Campagne nationale");
  await page.getByLabel("Nombre maximum de fiches").fill("100");
  await expect(
    page.getByRole("button", { name: "Ajouter un groupe", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Quelles fiches souhaitez-vous retenir ?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Choisir une zone", exact: true })
    .click();
  const departments = page.getByRole("combobox", {
    name: "Valeurs 0-0",
    exact: true,
  });
  for (const code of ["75", "83", "06"]) {
    await departments.fill(code);
    await page.getByRole("option", { name: code, exact: true }).click();
  }
  await departments.press("Escape");
  await page
    .getByRole("combobox", { name: "Ajouter un filtre 0", exact: true })
    .fill("Taille");
  await page
    .getByRole("option", { name: "Taille de l’entreprise", exact: true })
    .click();
  await expect(
    page.getByLabel("Accepter aussi les effectifs inconnus"),
  ).toBeChecked();
  await expect(
    page.getByLabel("Effectif minimum 0-1", { exact: true }),
  ).toHaveValue("20");
  await expect(
    page.getByRole("region", { name: "Résumé de la sélection" }),
  ).toContainText("20 salariés et plus");
  await page
    .getByRole("button", { name: "Voir les fiches correspondantes" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Prévisualisation du lot" }),
  ).toBeVisible();
  await expect(
    page.getByText("Entreprise exemple", { exact: false }),
  ).toBeVisible();
  expect(requests[0]).toMatchObject({
    action: "withdraw",
    limit: 100,
    criteria: {
      logic: "and",
      rules: [
        { field: "departement", value: ["75", "83", "06"] },
        { field: "effectif", value: { min: 20, include_unknown: true } },
      ],
    },
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/prospect-targeting-preview.png",
    fullPage: true,
  });
  await page.getByLabel("Effectif minimum 0-1", { exact: true }).fill("50");
  await expect(
    page.getByRole("button", { name: "Confirmer l’opération" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Voir les fiches correspondantes" })
    .click();
  await page.getByRole("button", { name: "Confirmer l’opération" }).click();
  await expect(
    page.getByText("8 rappels commerciaux seront annulés", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Confirmer$/ }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "99 fiches traitées" }),
  ).toBeVisible();
});

test("une autre sélection reste facultative et les exclusions s’appliquent à toutes les sélections", async ({
  page,
}) => {
  let submitted: Record<string, unknown> | null = null;
  await installApiRoute(page, async (route, request) => {
    if (request.path === "/campagnes/7") {
      await fulfillJson(route, apiSuccess(SALES_CAMPAIGN));
      return true;
    }
    if (request.path.endsWith("/targeting/catalog")) {
      await fulfillJson(route, apiSuccess({ fields, categories: [] }));
      return true;
    }
    if (
      request.path.endsWith("/targeting/saved") ||
      request.path.endsWith("/targeting/operations")
    ) {
      await fulfillJson(route, apiSuccess([]));
      return true;
    }
    if (request.path.endsWith("/targeting/jobs/preview")) {
      submitted = route.request().postDataJSON() as Record<string, unknown>;
      await fulfillJson(
        route,
        apiSuccess({
          id: "11111111-1111-4111-8111-111111111111",
          action: "withdraw",
          summary: {
            matched: 0,
            eligible: 0,
            selected: 0,
            limit: 5000,
            already_present: 0,
            blocked: 0,
            duplicates: 0,
            reminders: 0,
          },
          rows: [],
        }),
      );
      return true;
    }
    return false;
  });
  await page.goto("/operations/prospect/7/inject?action=withdraw");
  await page
    .getByLabel("Nom du ciblage / de l’opération")
    .fill("Deux sélections avec exclusion");
  await page
    .getByRole("button", { name: "Choisir une zone", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Valeurs 0-0", exact: true })
    .fill("75");
  await page.getByRole("option", { name: "75", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Valeurs 0-0", exact: true })
    .press("Escape");
  await page
    .getByRole("button", { name: "Accepter aussi une autre sélection" })
    .click();
  await expect(
    page.getByRole("button", { name: "Voir les fiches correspondantes" }),
  ).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Ajouter un filtre 1", exact: true })
    .fill("Sources");
  await page.getByRole("option", { name: "Sources", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Valeurs 1-0", exact: true })
    .fill("fichier_client");
  await page
    .getByRole("combobox", { name: "Valeurs 1-0", exact: true })
    .press("Enter");
  await page
    .getByRole("combobox", { name: "Ajouter une exclusion", exact: true })
    .fill("Départements");
  await page.getByRole("option", { name: "Départements", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Valeurs excluded-0", exact: true })
    .fill("06");
  await page.getByRole("option", { name: "06", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Valeurs excluded-0", exact: true })
    .press("Escape");
  await expect(
    page.getByRole("region", { name: "Résumé de la sélection" }),
  ).toContainText("Dans tous les cas, écarter");
  await page
    .getByRole("button", { name: "Voir les fiches correspondantes" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Prévisualisation du lot" }),
  ).toBeVisible();
  expect(submitted).toMatchObject({
    criteria: {
      logic: "and",
      rules: [
        {
          logic: "or",
          rules: [
            {
              logic: "and",
              rules: [{ field: "departement", operator: "in", value: ["75"] }],
            },
            {
              logic: "and",
              rules: [
                { field: "source", operator: "in", value: ["fichier_client"] },
              ],
            },
          ],
        },
        { field: "departement", operator: "not_in", value: ["06"] },
      ],
    },
  });
});

test("les activités à écarter se choisissent dans la base et le motif d’une erreur API est affiché", async ({
  page,
}) => {
  let submitted: Record<string, unknown> | undefined;
  let attempts = 0;
  const searches: string[] = [];
  await installApiRoute(page, async (route, request) => {
    if (request.path === "/campagnes/7") {
      await fulfillJson(route, apiSuccess(SALES_CAMPAIGN));
      return true;
    }
    if (request.path.endsWith("/targeting/catalog")) {
      await fulfillJson(
        route,
        apiSuccess({
          fields: [
            ...fields,
            {
              field: "activite",
              label: "Activités",
              group: "Entreprise",
              type: "list",
              lookup: true,
              operators: ["in", "not_in", "exists", "missing"],
            },
          ],
          categories: [],
        }),
      );
      return true;
    }
    if (request.path.includes("/targeting/options/activite")) {
      searches.push(route.request().url());
      await fulfillJson(
        route,
        apiSuccess([
          { value: "ENSEIGNEMENT PRIMAIRE", label: "Enseignement primaire" },
          { value: "COLLEGE", label: "Collège" },
        ]),
      );
      return true;
    }
    if (
      request.path.endsWith("/targeting/saved") ||
      request.path.endsWith("/targeting/operations")
    ) {
      await fulfillJson(route, apiSuccess([]));
      return true;
    }
    if (request.path.endsWith("/targeting/jobs/preview")) {
      submitted = route.request().postDataJSON() as Record<string, unknown>;
      if (attempts++ === 0) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "Le code postal de référence est introuvable.",
          }),
        });
        return true;
      }
      await fulfillJson(
        route,
        apiSuccess({
          id: "11111111-1111-4111-8111-111111111111",
          action: "inject",
          summary: {
            scope: "candidate_pool",
            capped: true,
            candidate_limit: 100,
            matched: 100,
            eligible: 98,
            selected: 98,
            limit: 100,
            already_present: 0,
            blocked: 0,
            duplicates: 2,
            reminders: 0,
          },
          rows: [],
        }),
      );
      return true;
    }
    return false;
  });
  await page.goto("/operations/prospect/7/inject");
  await page
    .getByRole("combobox", { name: "Ajouter une exclusion", exact: true })
    .fill("Activités");
  await page.getByRole("option", { name: "Activités", exact: true }).click();
  const input = page.getByRole("combobox", {
    name: "Valeurs excluded-0",
    exact: true,
  });
  await expect(
    page.getByRole("button", { name: "Voir les fiches correspondantes" }),
  ).toBeDisabled();
  await input.click();
  await page
    .getByRole("option", { name: "Enseignement primaire", exact: true })
    .click();
  await input.press("Escape");
  await expect(
    page.getByText("Enseignement primaire", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Voir les fiches correspondantes" })
    .click();
  await expect(
    page
      .getByText("Le code postal de référence est introuvable.", {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  const dismiss = page.getByRole("button", {
    name: /Fermer|Compris|OK|D’accord/,
  });
  if (await dismiss.count()) await dismiss.first().click();
  await page.keyboard.press("Escape");
  // Retry after closing the alert, preserving the criteria and an optional operation name.
  await page
    .getByRole("button", { name: "Voir les fiches correspondantes" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Prévisualisation du lot" }),
  ).toBeVisible();
  await expect(
    page.getByText("Le total de la base n’est pas calculé.", { exact: false }),
  ).toBeVisible();
  expect(submitted?.criteria).toEqual({
    logic: "and",
    rules: [
      {
        field: "activite",
        operator: "not_in",
        value: ["ENSEIGNEMENT PRIMAIRE"],
      },
    ],
  });
  expect(submitted?.nom).toBe("");
  expect(searches.length).toBeGreaterThan(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/prospect-targeting-activities.png",
    fullPage: true,
  });
});
