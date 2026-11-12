export type TemplateFamily = 'cycle_client' | 'structuration' | 'marque';
export type TemplateStatus = 'socle' | 'a_structurer';
export type PriceMode = 'mensuel' | 'ponctuel';
export type BudgetBand = '<3k' | '3k_8k' | '8k_15k' | '15k+';
export type Timeline = 'urgent' | '30j' | '60j' | 'cadre';
export type BillingRhythm = 'mensuel' | '50_50' | 'acompte' | 'commande' | 'livraison' | 'ponctuel';
export type Engagement = '1_mois_reconduction' | '3_mois' | '6_mois' | 'mission_unique';
export type QuoteCampaignType = 'commercial' | 'qualified_appointment' | 'client_account';
export type QuotePricingModel = QuoteCampaignType | 'project_delivery';

export type QuoteFlexibleService = {
  id: string;
  label: string;
  description: string;
  pricing: 'fixed' | 'variable';
  amountKind: 'currency' | 'percentage';
  amount: number | undefined;
  condition: string;
};

export type QuoteCustomClause = {
  id: string;
  label: string;
  description?: string;
  amount: number | undefined;
  included: boolean;
  offered?: boolean;
};

export type QuoteProjectLine = {
  id: string;
  label: string;
  description: string;
  labelPlaceholder?: string;
  descriptionPlaceholder?: string;
  amount: number | undefined;
  included: boolean;
  offered?: boolean;
  isCustom?: boolean;
};

export type QuoteProjectSection = {
  id: string;
  title: string;
  titlePlaceholder?: string;
  lines: QuoteProjectLine[];
};

export type QuoteThirdPartyService = {
  id: string;
  label: string;
  description: string;
  isCustom?: boolean;
};

export type QuoteLine = {
  id: string;
  label: string;
  description: string;
  amount: number;
  mode: PriceMode;
  selectedByDefault?: boolean;
};

export type TemplateAssumption = {
  id: string;
  label: string;
};

export type QuoteTemplate = {
  id: string;
  title: string;
  description: string;
  family: TemplateFamily;
  status: TemplateStatus;
  promise: string;
  baseFee: number;
  setupFee: number;
  durationLabel: string;
  objectives: string[];
  includedLines: QuoteLine[];
  optionLines: QuoteLine[];
  assumptions: TemplateAssumption[];
};

export type QuoteFormState = {
  companyName: string;
  contactName: string;
  contactRole: string;
  email: string;
  phone: string;
  needSummary: string;
  objective: string;
  budgetBand: BudgetBand;
  timeline: string;
  billingRhythm: BillingRhythm;
  engagement: Engagement;
  commercialConditions: string;
};

export type QuoteFormChangeHandler = <Field extends keyof QuoteFormState>(
  field: Field,
  value: QuoteFormState[Field],
) => void;

export type QuotePdfPayload = {
  pricing_model: QuotePricingModel;
  client: {
    company_name: string;
    contact_name: string;
    contact_role: string;
    email: string;
    phone: string;
  };
  context: {
    need_summary: string;
    objective: string;
  };
  terms: {
    timeline_label: string;
    engagement_label: string;
    engagement_months: number;
    billing_label: string;
    conditions: string;
  };
  lines: Array<{
    id: string;
    label: string;
    description: string;
    mode: PriceMode;
    included: boolean;
    offered?: boolean;
    amount: number;
    amount_kind: 'currency' | 'percentage';
    pricing_basis?: 'fixed' | 'variable' | 'unit';
  }>;
  assumptions: string[];
  project_sections?: Array<{
    id: string;
    title: string;
    show_title?: boolean;
    lines: Array<{
      id: string;
      label: string;
      description: string;
      included: boolean;
      offered?: boolean;
      amount: number;
      amount_kind?: 'currency' | 'percentage';
      pricing_basis?: 'fixed' | 'variable' | 'unit';
    }>;
  }>;
  third_party_services?: QuoteThirdPartyService[];
};
