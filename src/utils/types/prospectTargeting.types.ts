export type TargetingValue =
  | string
  | number
  | boolean
  | string[]
  | { postcode: string; km: number }
  | { min: number | null; max: number | null; include_unknown: boolean };
export interface TargetingCriterion {
  field: string;
  operator: string;
  value?: TargetingValue;
}
export interface TargetingGroup {
  logic: "and" | "or";
  rules: TargetingNode[];
}
export type TargetingNode = TargetingCriterion | TargetingGroup;
export type TargetingAction = "inject" | "withdraw" | "exclude" | "restore";
export interface TargetingField {
  field: string;
  label: string;
  group: string;
  type: string;
  operators: string[];
  lookup?: boolean;
}
export interface TargetingCatalog {
  fields: TargetingField[];
  categories: { value: string; label: string; definition: string }[];
}
export interface TargetingSaved {
  id: string;
  nom: string;
  criteria: TargetingGroup;
  exclusion: boolean;
  active: boolean;
}
export interface TargetingRow {
  id_prospect: number;
  applied: boolean;
  snapshot: {
    raison_sociale: string;
    code_postal: string | null;
    ville: string | null;
    activite: string | null;
    telephone: string;
    source: string | null;
    workforce: {
      min: number | null;
      max: number | null;
      known: boolean;
      origine: string;
    };
  };
}
export interface TargetingSummary {
  scope?: "candidate_pool";
  candidate_limit?: number;
  capped?: boolean;
  departments?: { departement: string; count: number }[];
  matched: number;
  already_present: number;
  eligible: number;
  blocked: number;
  duplicates: number;
  selected: number;
  limit: number;
  reminders: number;
}
export interface TargetingPreview {
  id: string;
  action: TargetingAction;
  summary: TargetingSummary;
  rows: TargetingRow[];
}
export interface TargetingResult {
  id: string;
  action: TargetingAction;
  affected: number;
  skipped: number;
  cancelled_reminders: number;
}
export interface TargetingHistory {
  auteur?: string;
  id: string;
  nom: string;
  action: TargetingAction;
  statut: string;
  summary: TargetingSummary;
  result: TargetingResult | null;
  created_at: string;
}
export interface TargetingRequest {
  action: TargetingAction;
  criteria: TargetingGroup;
  limit: number;
  nom: string;
  allow_all: boolean;
}
export interface TargetingJob<T> {
  id: string;
  kind: "preview" | "execute";
  status: "queued" | "completed" | "failed";
  result: T | null;
  error: { message: string; statusCode: number } | null;
}
export interface GuidedTargetingSelection {
  profiles: TargetingCriterion[][];
  exclusions: TargetingCriterion[];
}
export interface TargetingChoice {
  value: string;
  label: string;
}
export interface TargetingChoiceGroup {
  label: string;
  options: TargetingChoice[];
}
export interface GuidedTargetingRow {
  lookup: boolean;
  lookupError: string;
  loadOptions: (search: string) => Promise<TargetingChoice[]>;
  loadRawActivities: (search: string) => Promise<TargetingChoice[]>;
  key: string;
  label: string;
  type: string;
  value: string;
  selectedField: TargetingChoice | null;
  operators: TargetingChoice[];
  selectedOperator: TargetingChoice | null;
  options: TargetingChoice[];
  selectedOptions: TargetingChoice[];
  selectedOption: TargetingChoice | null;
  needsList: boolean;
  noValue: boolean;
  minimum: string;
  maximum: string;
  includeUnknown: boolean;
  postcode: string;
  km: number;
  hint: string;
  changeField: (value: string) => void;
  changeOperator: (value: string) => void;
  changeText: (value: string) => void;
  changeChoice: (value: string) => void;
  changeList: (options: readonly TargetingChoice[]) => void;
  createValues: (value: string) => void;
  changeWorkforce: (
    key: "min" | "max" | "include_unknown",
    value: string | boolean,
  ) => void;
  changeRadius: (key: "postcode" | "km", value: string) => void;
  remove: () => void;
}
