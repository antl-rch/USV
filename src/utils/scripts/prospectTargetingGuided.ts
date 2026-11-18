import type {
  GuidedTargetingSelection,
  TargetingCatalog,
  TargetingChoice,
  TargetingChoiceGroup,
  TargetingCriterion,
  TargetingGroup,
  TargetingNode,
} from "../types/index.ts";
import {
  newTargetingCriterion,
  TARGETING_OPERATORS,
} from "./prospectTargeting.ts";
export function targetingSectionTitle(group: string): string {
  const titles: Record<string, string> = {
    Localisation: "Où chercher ?",
    Entreprise: "Quelles entreprises ?",
    Effectif: "Taille des entreprises",
    Coordonnées: "Coordonnées et contacts",
    Numérique: "Présence sur internet",
    Données: "Origine et qualité des fiches",
    Historique: "Contacts et résultats précédents",
    Campagne: "Situation dans les campagnes",
  };
  return titles[group] ?? group;
}
const NEGATIVE_OPERATORS = ["ne", "not_in", "not_contains"];
export const isTargetingExclusion = (criterion: TargetingCriterion): boolean =>
  NEGATIVE_OPERATORS.includes(criterion.operator);
/** Expand legacy expressions without changing their meaning. Bound expansion to keep the editor manageable. */
export function decodeGuidedTargeting(
  root: TargetingNode,
): GuidedTargetingSelection | null {
  let visited = 0;
  function expand(
    node: TargetingNode,
    depth = 0,
  ): TargetingCriterion[][] | null {
    if (++visited > 100 || depth > 4) return null;
    if (!("rules" in node)) return [[node]];
    if (!node.rules.length) return [[]];
    let profiles: TargetingCriterion[][] = node.logic === "and" ? [[]] : [];
    for (const child of node.rules) {
      const alternatives = expand(child, depth + 1);
      if (!alternatives) return null;
      profiles =
        node.logic === "or"
          ? [...profiles, ...alternatives]
          : profiles.flatMap((profile) =>
              alternatives.map((other) => [...profile, ...other]),
            );
      if (
        profiles.length > 12 ||
        profiles.reduce((count, profile) => count + profile.length, 0) > 80
      )
        return null;
    }
    return profiles;
  }
  const profiles = expand(root);
  if (!profiles) return null;
  const exclusions = (profiles[0] ?? []).filter(
    (rule) =>
      isTargetingExclusion(rule) &&
      profiles.every((profile) =>
        profile.some((other) => JSON.stringify(other) === JSON.stringify(rule)),
      ),
  );
  const common = new Set(exclusions.map((rule) => JSON.stringify(rule)));
  return {
    // An unrestricted branch already covers every other alternative. Keep its
    // shared exclusions instead of silently narrowing the saved selection.
    profiles: profiles.some((profile) =>
      profile.every((rule) => common.has(JSON.stringify(rule))),
    )
      ? [[]]
      : profiles.map((profile) =>
          profile.filter((rule) => !common.has(JSON.stringify(rule))),
        ),
    exclusions,
  };
}
export function encodeGuidedTargeting(
  selection: GuidedTargetingSelection,
): TargetingGroup {
  const profiles = selection.profiles
    .filter((profile) => profile.length)
    .map((rules) => ({ logic: "and" as const, rules }));
  const included: TargetingNode[] =
    profiles.length > 1
      ? [{ logic: "or", rules: profiles }]
      : (profiles[0]?.rules ?? []);
  return { logic: "and", rules: [...included, ...selection.exclusions] };
}
export function guidedTargetingCriterion(
  field: string,
  catalog: TargetingCatalog,
  exclusion: boolean,
): TargetingCriterion {
  const rule = newTargetingCriterion(field, catalog);
  if (!exclusion) return rule;
  const definition = catalog.fields.find((item) => item.field === field);
  const operator = ["not_in", "not_contains", "ne"].find((value) =>
    definition?.operators.includes(value),
  );
  return { ...rule, operator: operator ?? rule.operator };
}
export function guidedTargetingFieldGroups(
  catalog: TargetingCatalog,
  exclusion = false,
): TargetingChoiceGroup[] {
  return [...new Set(catalog.fields.map((field) => field.group))]
    .map((group) => ({
      label: targetingSectionTitle(group),
      options: catalog.fields
        .filter(
          (field) =>
            field.group === group &&
            (!exclusion ||
              field.operators.some((operator) =>
                NEGATIVE_OPERATORS.includes(operator),
              )),
        )
        .map((field) => ({ value: field.field, label: field.label })),
    }))
    .filter((group) => group.options.length);
}
const CHOICES: Record<string, TargetingChoice[]> = {
  type_prospect: [
    { value: "Entreprise", label: "Entreprises" },
    { value: "Particulier", label: "Particuliers" },
  ],
  effectif_origine: [
    { value: "utilisateur", label: "Renseigné par un utilisateur" },
    { value: "import", label: "Importé" },
    { value: "historique", label: "Origine ancienne non vérifiée" },
    { value: "enrichissement", label: "Enrichi automatiquement" },
  ],
  relation: [
    { value: "prospect", label: "Prospects" },
    { value: "client", label: "Clients" },
    { value: "lead_genere", label: "Avec un lead généré" },
  ],
  type_telephone: [
    { value: "fixe", label: "Fixe" },
    { value: "mobile", label: "Mobile" },
    { value: "voip", label: "VoIP" },
    { value: "inconnu", label: "Inconnu" },
  ],
  effectif_connu: [
    { value: "true", label: "Renseigné" },
    { value: "false", label: "Inconnu" },
  ],
};
export function targetingValueChoices(
  field: string,
  catalog: TargetingCatalog,
): TargetingChoice[] {
  if (field === "categorie")
    return catalog.categories.map(({ value, label }) => ({ value, label }));
  if (field === "departement")
    return [
      ...Array.from({ length: 95 }, (_, index) =>
        String(index + 1).padStart(2, "0"),
      ).filter((code) => code !== "20"),
      "2A",
      "2B",
      "971",
      "972",
      "973",
      "974",
      "976",
    ].map((value) => ({ value, label: value }));
  return CHOICES[field] ?? [];
}
export function guidedTargetingOperators(
  rule: TargetingCriterion,
  catalog: TargetingCatalog,
  exclusion: boolean,
): TargetingChoice[] {
  const field = catalog.fields.find((item) => item.field === rule.field);
  return (field?.operators ?? [])
    .filter((operator) =>
      exclusion
        ? NEGATIVE_OPERATORS.includes(operator)
        : !NEGATIVE_OPERATORS.includes(operator) || operator === rule.operator,
    )
    .map((value) => ({
      value,
      label: exclusion
        ? ({
            not_in: "Une de ces valeurs",
            not_contains: "Contient ces mots",
            ne: "Cette valeur",
          }[value] ?? value)
        : ({
            in: "Une de ces valeurs",
            eq: "Cette valeur",
            contains: "Contient ces mots",
            gte: "À partir de",
            lte: "Jusqu’à",
            exists: "Information présente",
            missing: "Information manquante",
            range: "Taille souhaitée",
          }[value] ??
          TARGETING_OPERATORS[value] ??
          value),
    }));
}
export function describeTargetingChoice(
  rule: TargetingCriterion,
  catalog: TargetingCatalog,
  lookupChoices: readonly TargetingChoice[] = [],
): string {
  const label =
    catalog.fields.find((field) => field.field === rule.field)?.label ??
    "Choix à compléter";
  const value = rule.value;
  if (typeof value === "object" && value && "include_unknown" in value) {
    const range =
      value.min !== null && value.max !== null
        ? `de ${value.min} à ${value.max} salariés`
        : value.min !== null
          ? `${value.min} salariés et plus`
          : value.max !== null
            ? `jusqu’à ${value.max} salariés`
            : "toutes les tailles";
    return `${range}${value.include_unknown ? ", effectif inconnu accepté" : ", effectif connu uniquement"}`;
  }
  if (typeof value === "object" && value && "postcode" in value)
    return `${rule.operator === "not_in" ? "hors" : "dans"} un rayon de ${value.km} km autour de ${value.postcode || "…"}`;
  const choices = lookupChoices.length
    ? lookupChoices
    : targetingValueChoices(rule.field, catalog);
  const display = (raw: unknown): string =>
    choices.find((choice) => choice.value === String(raw))?.label ??
    String(raw ?? "…");
  if (rule.operator === "exists") return `${label} renseigné`;
  if (rule.operator === "missing") return `${label} manquant`;
  const text = Array.isArray(value)
    ? value.map(display).join(", ") || "à préciser"
    : display(value);
  if (rule.operator === "gte") return `${label} : à partir de ${text}`;
  if (rule.operator === "lte") return `${label} : jusqu’à ${text}`;
  if (isTargetingExclusion(rule)) return `${label} à écarter : ${text}`;
  return `${label} : ${text}`;
}
export function describeGuidedTargeting(
  selection: GuidedTargetingSelection,
  catalog: TargetingCatalog,
  lookupChoices: Record<string, TargetingChoice[]> = {},
): string {
  const describe = (rule: TargetingCriterion): string =>
    describeTargetingChoice(rule, catalog, lookupChoices[rule.field]);
  const profiles = selection.profiles.filter((profile) => profile.length);
  const sentences = profiles.length
    ? profiles.map(
        (profile, index) =>
          `${profiles.length > 1 ? `Sélection ${index + 1} : ` : ""}${profile.map(describe).join(" ; ")}.`,
      )
    : ["Aucun filtre : toutes les fiches du périmètre peuvent être retenues."];
  if (profiles.length > 1)
    sentences.push(
      "Une fiche peut appartenir à l’une ou l’autre de ces sélections.",
    );
  if (selection.exclusions.length)
    sentences.push(
      `Dans tous les cas, écarter ${selection.exclusions.map((rule) => describe(rule).replace(" à écarter", "")).join(" ; ")}.`,
    );
  return sentences.join(" ");
}

export function incompleteTargetingChoice(
  rule: TargetingCriterion,
  catalog: TargetingCatalog,
): boolean {
  if (["exists", "missing"].includes(rule.operator)) return false;
  const type = catalog.fields.find((field) => field.field === rule.field)?.type;
  const value = rule.value;
  if (["in", "not_in"].includes(rule.operator) && type !== "radius")
    return !Array.isArray(value) || value.length === 0;
  if (type === "radius")
    return (
      !value ||
      typeof value !== "object" ||
      !("postcode" in value) ||
      !/^\d{5}$/.test(value.postcode) ||
      !Number.isInteger(value.km) ||
      value.km < 1 ||
      value.km > 500
    );
  if (type === "workforce") {
    if (!value || typeof value !== "object" || !("include_unknown" in value))
      return true;
    return (
      [value.min, value.max].some(
        (v) => v !== null && (!Number.isInteger(v) || v < 0 || v > 1000000),
      ) ||
      (value.min !== null && value.max !== null && value.min > value.max)
    );
  }
  if (type === "number")
    return typeof value !== "number" || !Number.isFinite(value) || value < 0;
  if (type === "boolean") return typeof value !== "boolean";
  return typeof value !== "string" || value.trim() === "";
}
