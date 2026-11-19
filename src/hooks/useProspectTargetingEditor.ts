import { useProspectTargetingValues } from "./useProspectTargetingValues.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAlert } from "../context/alert/index.ts";
import type {
  GuidedTargetingRow,
  GuidedTargetingSelection,
  TargetingCatalog,
  TargetingCriterion,
  TargetingGroup,
  TargetingNode,
} from "../utils/types/index.ts";
import {
  decodeGuidedTargeting,
  describeGuidedTargeting,
  describeTargetingChoice,
  encodeGuidedTargeting,
  guidedTargetingCriterion,
  guidedTargetingFieldGroups,
  guidedTargetingOperators,
  targetingValueChoices,
  targetingSectionTitle,
  selectedTargetingValues,
  incompleteTargetingChoice,
} from "../utils/scripts/index.ts";
export function useProspectTargetingEditor(
  criteria: TargetingGroup,
  catalog: TargetingCatalog,
  onChange: (criteria: TargetingGroup) => void,
  campaign: number | null,
) {
  const { showConfirm } = useAlert();
  const values = useProspectTargetingValues(campaign);
  const resolveActivityLabels = values.resolveActivityLabels;
  useEffect(() => {
    const ids = new Set<string>();
    const collect = (node: TargetingNode): void => {
      if ("rules" in node) {
        node.rules.forEach(collect);
      } else if (node.field === "activite" && Array.isArray(node.value)) {
        node.value.filter((value) => value.startsWith("@activity/")).forEach((value) => ids.add(value));
      }
    };
    collect(criteria);
    const controller = new AbortController();
    void resolveActivityLabels(ids, controller.signal);
    return () => controller.abort();
  }, [criteria, resolveActivityLabels]);
  const [selection, setSelection] = useState<GuidedTargetingSelection | null>(
    () => decodeGuidedTargeting(criteria),
  );
  const current = useRef(selection);
  const published = useRef(criteria);
  useEffect(() => {
    if (published.current === criteria) return;
    const decoded = decodeGuidedTargeting(criteria);
    current.current = decoded;
    published.current = criteria;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setSelection(decoded);
    });
    return () => {
      cancelled = true;
    };
  }, [criteria]);
  const fields = useMemo(() => guidedTargetingFieldGroups(catalog), [catalog]);
  const exclusionFields = useMemo(
    () => guidedTargetingFieldGroups(catalog, true),
    [catalog],
  );
  function commit(next: GuidedTargetingSelection): void {
    const root = encodeGuidedTargeting(next);
    current.current = next;
    published.current = root;
    setSelection(next);
    onChange(root);
  }
  function update(
    profile: number | null,
    index: number,
    change: (rule: TargetingCriterion) => TargetingCriterion | null,
  ): void {
    const source = current.current;
    if (!source) return;
    const replace = (rules: TargetingCriterion[]): TargetingCriterion[] =>
      rules.flatMap((rule, i) => {
        if (i !== index) return [rule];
        const result = change(rule);
        return result ? [result] : [];
      });
    commit(
      profile === null
        ? { ...source, exclusions: replace(source.exclusions) }
        : {
            ...source,
            profiles: source.profiles.map((rules, i) =>
              i === profile ? replace(rules) : rules,
            ),
          },
    );
  }
  function add(profile: number | null, field: string): void {
    const source = current.current;
    if (!source || !field) return;
    const rule = guidedTargetingCriterion(field, catalog, profile === null);
    commit(
      profile === null
        ? { ...source, exclusions: [...source.exclusions, rule] }
        : {
            ...source,
            profiles: source.profiles.map((rules, i) =>
              i === profile ? [...rules, rule] : rules,
            ),
          },
    );
  }
  function buildRow(
    rule: TargetingCriterion,
    profile: number | null,
    index: number,
  ): GuidedTargetingRow {
    const definition = catalog.fields.find(
      (field) => field.field === rule.field,
    );
    const options = definition?.lookup
      ? [...(values.choices[rule.field] ?? []), ...(rule.field === 'activite' ? values.choices.activite_brute ?? [] : [])]
      : targetingValueChoices(rule.field, catalog);
    const selected = Array.isArray(rule.value) ? rule.value : [];
    const operators = guidedTargetingOperators(rule, catalog, profile === null);
    const workforce =
      typeof rule.value === "object" &&
      rule.value &&
      "include_unknown" in rule.value
        ? rule.value
        : null;
    const radius =
      typeof rule.value === "object" && rule.value && "postcode" in rule.value
        ? rule.value
        : null;
    const change = (
      fn: (criterion: TargetingCriterion) => TargetingCriterion,
    ): void => update(profile, index, fn);
    const text =
      typeof rule.value === "string" || typeof rule.value === "number"
        ? String(rule.value)
        : "";
    return {
      lookup: definition?.lookup ?? false,
      lookupError: values.errors[rule.field] ?? (rule.field === 'activite' ? values.errors.activite_brute : undefined) ?? "",
      loadOptions: (search) => values.load(rule.field, search),
      loadRawActivities: (search) => values.load('activite_brute', search),
      key: `${profile ?? "excluded"}-${index}`,
      label: definition?.label ?? "Choix à compléter",
      type: definition?.type ?? "text",
      value: text,
      selectedField: definition
        ? { value: definition.field, label: definition.label }
        : null,
      operators,
      selectedOperator:
        operators.find((option) => option.value === rule.operator) ?? null,
      options,
      selectedOptions: selected.map(
        (value) =>
          options.find((option) => option.value === value) ?? {
            value,
            label: value,
          },
      ),
      selectedOption:
        options.find((option) => option.value === String(rule.value)) ?? null,
      needsList:
        ["in", "not_in"].includes(rule.operator) &&
        definition?.type !== "radius",
      noValue: ["exists", "missing"].includes(rule.operator),
      minimum: workforce?.min?.toString() ?? "",
      maximum: workforce?.max?.toString() ?? "",
      includeUnknown: workforce?.include_unknown ?? false,
      postcode: radius?.postcode ?? "",
      km: radius?.km ?? 50,
      hint: definition?.lookup
        ? "Choisissez une valeur de la liste. Tapez pour rechercher parmi les valeurs de la base."
        : rule.field === "categorie"
          ? (catalog.categories.find((option) => option.value === rule.value)
              ?.definition ?? "")
          : rule.field === "departement"
            ? "Choisissez un ou plusieurs départements."
            : rule.field === "ville"
              ? "Saisissez un nom de commune puis validez avec Entrée."
              : rule.field === "code_postal"
                ? "Saisissez un code postal puis validez avec Entrée."
                : rule.field === "source"
                  ? "Ajoutez les sources souhaitées."
                  : "",
      changeField: (field) =>
        change(() =>
          guidedTargetingCriterion(field, catalog, profile === null),
        ),
      changeOperator: (operator) =>
        change((criterion) => ({
          ...criterion,
          operator,
          value: ["radius", "workforce"].includes(definition?.type ?? "")
            ? criterion.value
            : ["in", "not_in"].includes(operator)
              ? Array.isArray(criterion.value)
                ? criterion.value
                : []
              : Array.isArray(criterion.value)
                ? ""
                : criterion.value,
        })),
      changeText: (value) =>
        change((criterion) => ({
          ...criterion,
          value:
            definition?.type === "number"
              ? value === ""
                ? ""
                : Number(value)
              : value,
        })),
      changeChoice: (value) =>
        change((criterion) => ({
          ...criterion,
          value: definition?.type === "boolean" ? value === "true" : value,
        })),
      changeList: (values) =>
        change((criterion) => ({
          ...criterion,
          value: selectedTargetingValues(values),
        })),
      createValues: (value) =>
        change((criterion) => ({
          ...criterion,
          value: [
            ...new Set([
              ...(Array.isArray(criterion.value) ? criterion.value : []),
              ...value
                .split(/[,;\n]/)
                .map((item) => item.trim())
                .filter(Boolean),
            ]),
          ],
        })),
      changeWorkforce: (key, value) =>
        change((criterion) => ({
          ...criterion,
          value: {
            ...(workforce ?? { min: null, max: null, include_unknown: true }),
            [key]:
              typeof value === "boolean"
                ? value
                : value === ""
                  ? null
                  : Number(value),
          },
        })),
      changeRadius: (key, value) =>
        change((criterion) => ({
          ...criterion,
          value: {
            ...(radius ?? { postcode: "", km: 50 }),
            [key]: key === "km" ? Number(value) : value,
          },
        })),
      remove: () => update(profile, index, () => null),
    };
  }
  const profiles = (selection?.profiles ?? []).map((rules, index) => {
    const rows = rules.map((rule, i) => buildRow(rule, index, i));
    return {
      key: index,
      title:
        (selection?.profiles.length ?? 0) > 1
          ? `Sélection ${index + 1}`
          : "Les fiches à retenir",
      empty: rules.length === 0,
      sections: [...new Set(catalog.fields.map((field) => field.group))]
        .map((group) => ({
          label: targetingSectionTitle(group),
          rows: rows.filter(
            (row) =>
              catalog.fields.find(
                (field) => field.field === row.selectedField?.value,
              )?.group === group,
          ),
        }))
        .filter((section) => section.rows.length),
      sentence: rules
        .map((rule) => describeTargetingChoice(rule, catalog, values.choices[rule.field]))
        .join(" ; "),
      add: (field: string) => add(index, field),
      remove: () => {
        if (current.current && current.current.profiles.length > 1)
          commit({
            ...current.current,
            profiles: current.current.profiles.filter((_, i) => i !== index),
          });
      },
    };
  });
  return {
    profiles,
    exclusions: (selection?.exclusions ?? []).map((rule, index) =>
      buildRow(rule, null, index),
    ),
    fields,
    exclusionFields,
    editable: selection !== null,
    summary: selection
      ? describeGuidedTargeting(selection, catalog, values.choices)
      : "Cette sélection enregistrée conserve ses critères et ses exclusions.",
    hasIncomplete: selection
      ? [...selection.profiles.flat(), ...selection.exclusions].some((rule) =>
          incompleteTargetingChoice(rule, catalog),
        ) ||
        selection.profiles.some(
          (profile) => selection.profiles.length > 1 && !profile.length,
        )
      : false,
    canAddProfile: (selection?.profiles.length ?? 0) < 12,
    addProfile: () => {
      if (current.current && current.current.profiles.length < 12)
        commit({
          ...current.current,
          profiles: [...current.current.profiles, []],
        });
    },
    addExclusion: (field: string) => add(null, field),
    reset: async () => {
      if (
        await showConfirm(
          "Repartir d’une sélection vide ? Les choix actuels seront remplacés.",
          "Nouvelle sélection",
        )
      )
        commit({ profiles: [[]], exclusions: [] });
    },
  };
}
