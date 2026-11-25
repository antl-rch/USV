import type {
  InvoiceAdjustment,
  BillingAmounts,
  BillingPreview,
  CampaignBillingSettings,
  Campagne,
  InvoiceRecipient,
  LeadBillingSettings,
  LeadClient,
  ResolvedBillingProfile,
  Vente,
  VenteStats,
} from '../../utils/types/index.ts';

const parseNumericAmount = (value: number | string): number => {
  const numericAmount = typeof value === 'string' ? Number.parseFloat(value) : value;
  return Number.isNaN(numericAmount) ? 0 : numericAmount;
};

const roundCurrency = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const DEFAULT_LEAD_PRICE_HT = 75;
export const MMA_LARGE_COMPANY_LEAD_PRICE_HT = 150;
export const MMA_LEAD_BILLING_CAMPAIGN_ID = 10;

const isFilled = (value: string | string[] | null | undefined): boolean => Array.isArray(value)
  ? value.length > 0
  : typeof value === 'string' && value.trim().length > 0;

const firstFilledString = (...values: Array<string | null | undefined>): string | null => {
  const value = values.find((candidate) => typeof candidate === 'string' && candidate.trim().length > 0);
  return value?.trim() ?? null;
};

const getInvoiceRecipient = (campagne: Campagne | null): InvoiceRecipient | null => campagne?.bon_commande_config?.invoice_recipient ?? null;

const hasInvoiceRecipientData = (invoiceRecipient: InvoiceRecipient | null): boolean => Boolean(invoiceRecipient && [
  invoiceRecipient.company_name,
  invoiceRecipient.siret,
  invoiceRecipient.tva,
  invoiceRecipient.email,
  invoiceRecipient.address,
  invoiceRecipient.postal_code,
  invoiceRecipient.city,
  invoiceRecipient.country,
  invoiceRecipient.phone,
].some((value) => isFilled(value)));

export function getCampaignBillingSettings(campagne: Campagne | null): CampaignBillingSettings {
  const rawConfig = campagne?.bon_commande_config;
  const rawVatRate = rawConfig && typeof rawConfig === 'object' && 'vat_rate' in rawConfig ? rawConfig.vat_rate : null;
  const rawShipping = rawConfig && typeof rawConfig === 'object' && 'shipping' in rawConfig ? rawConfig.shipping : null;
  const rawShippingFee = rawShipping && typeof rawShipping === 'object' && 'fee_ht' in rawShipping ? rawShipping.fee_ht : null;
  const rawFreeShippingThreshold = rawShipping && typeof rawShipping === 'object' && 'free_threshold_ht' in rawShipping
    ? rawShipping.free_threshold_ht
    : null;
  const accountVatRate = Number(rawVatRate);
  const vatRate = campagne?.type_campagne === 'client_account'
    ? (Number.isFinite(accountVatRate) && accountVatRate > 0 ? accountVatRate : 0.2)
    : (typeof rawVatRate === 'number' ? rawVatRate : Number.parseFloat(String(rawVatRate ?? '0.2')));
  const shippingFeeHt = typeof rawShippingFee === 'number' ? rawShippingFee : Number.parseFloat(String(rawShippingFee ?? '30'));
  const freeShippingThresholdHt = typeof rawFreeShippingThreshold === 'number'
    ? rawFreeShippingThreshold
    : Number.parseFloat(String(rawFreeShippingThreshold ?? '300'));

  return {
    vatRate: Number.isNaN(vatRate) ? 0.2 : vatRate,
    shippingFeeHt: Number.isNaN(shippingFeeHt) ? 30 : shippingFeeHt,
    freeShippingThresholdHt: Number.isNaN(freeShippingThresholdHt) ? 300 : freeShippingThresholdHt,
  };
}

export const computeTtcAmount = (htAmount: number | string, vatRate: number): number => parseNumericAmount(htAmount) * (1 + vatRate);

export function computeFacturableHt(vente: Vente): number {
  return parseNumericAmount(vente.montant_total);
}

export function usesEmployeeCountLeadPricing(campaignId: number | null | undefined): boolean {
  return campaignId === MMA_LEAD_BILLING_CAMPAIGN_ID;
}

const parsePositivePrice = (value: number | null | undefined, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
);

export function getLeadBillingSettings(campagne: Campagne | null): LeadBillingSettings {
  const config = campagne?.bon_commande_config?.lead_billing;
  return {
    unitPriceHt: parsePositivePrice(config?.unit_price_ht, DEFAULT_LEAD_PRICE_HT),
    smallCompanyPriceHt: parsePositivePrice(config?.small_company_price_ht, DEFAULT_LEAD_PRICE_HT),
    largeCompanyPriceHt: parsePositivePrice(config?.large_company_price_ht, MMA_LARGE_COMPANY_LEAD_PRICE_HT),
    usesEmployeeCountPricing: usesEmployeeCountLeadPricing(campagne?.id_campagne),
  };
}

export function computeFacturableLeadHt(lead: LeadClient, settings: LeadBillingSettings): number {
  if (!settings.usesEmployeeCountPricing) return settings.unitPriceHt;
  return lead.entreprise_plus_de_cinq_salaries
    ? settings.largeCompanyPriceHt
    : settings.smallCompanyPriceHt;
}

export function computePreviewTotals(
  preview: BillingPreview | null,
  settings: CampaignBillingSettings,
  commissionRate: number | null = null,
  leadBillingSettings: LeadBillingSettings | null = null,
  clientAccountUnitPriceHt?: number | null,
  clientAccountQuantity?: number,
): BillingAmounts {
  if (clientAccountUnitPriceHt !== undefined && (preview?.source === 'ventes' || clientAccountQuantity !== undefined)) {
    const quantity = clientAccountQuantity ?? (preview?.source === 'ventes'
      ? preview.rows.filter((vente) => vente.statut_vente === 'validee').length : 0);
    const totalHt = roundCurrency(quantity * (clientAccountUnitPriceHt ?? 0));
    const totalTva = roundCurrency(totalHt * settings.vatRate);
    return { assietteHt: totalHt, totalHt, totalTtc: roundCurrency(totalHt + totalTva) };
  }

  if (!preview) return { assietteHt: 0, totalHt: 0, totalTtc: 0 };

  const assietteHt = roundCurrency(preview.source === 'ventes'
    ? preview.rows.reduce((sum, vente) => sum + computeFacturableHt(vente), 0)
    : preview.rows.reduce((sum, lead) => sum + computeFacturableLeadHt(
      lead,
      leadBillingSettings ?? {
        unitPriceHt: DEFAULT_LEAD_PRICE_HT,
        smallCompanyPriceHt: DEFAULT_LEAD_PRICE_HT,
        largeCompanyPriceHt: MMA_LARGE_COMPANY_LEAD_PRICE_HT,
        usesEmployeeCountPricing: usesEmployeeCountLeadPricing(lead.id_campagne),
      },
    ), 0));
  const commissionMultiplier = preview.source === 'ventes' && commissionRate !== null && commissionRate > 0
    ? commissionRate / 100
    : 1;
  const unroundedTotalHt = assietteHt * commissionMultiplier;

  return {
    assietteHt,
    totalHt: roundCurrency(unroundedTotalHt),
    totalTtc: roundCurrency(unroundedTotalHt * (1 + settings.vatRate)),
  };
}

export function buildFallbackVenteStats(ventes: Vente[]): VenteStats {
  return ventes.reduce<VenteStats>((stats, vente) => {
    const amount = parseNumericAmount(vente.montant_total);
    stats.total.count += 1;
    stats.total.total_montant += amount;
    const target = vente.statut_vente === 'validee'
      ? stats.validees
      : vente.statut_vente === 'en_attente'
        ? stats.enAttente
        : vente.statut_vente === 'annulee'
          ? stats.annulees
          : stats.frigo;
    target.count += 1;
    target.total_montant += amount;
    return stats;
  }, {
    validees: { count: 0, total_montant: 0 },
    enAttente: { count: 0, total_montant: 0 },
    annulees: { count: 0, total_montant: 0 },
    frigo: { count: 0, total_montant: 0 },
    total: { count: 0, total_montant: 0 },
  });
}

export function buildResolvedBillingProfile(campagne: Campagne | null): ResolvedBillingProfile | null {
  if (!campagne) return null;
  const invoiceRecipient = getInvoiceRecipient(campagne);
  const preferInvoiceRecipient = hasInvoiceRecipientData(invoiceRecipient);
  const resolveField = (
    label: string,
    invoiceValue: string | null | undefined,
    campaignValue: string | null | undefined,
    required = false,
  ) => {
    const invoiceFilled = isFilled(invoiceValue);
    const campaignFilled = isFilled(campaignValue);
    return {
      label,
      value: firstFilledString(invoiceValue, campaignValue) ?? 'Non renseigné',
      required,
      source: preferInvoiceRecipient && invoiceFilled
        ? 'invoice_recipient' as const
        : campaignFilled ? 'campaign' as const : preferInvoiceRecipient ? 'invoice_recipient' as const : 'campaign' as const,
    };
  };
  const cityLine = [invoiceRecipient?.postal_code?.trim(), invoiceRecipient?.city?.trim()]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ');
  const fields = [
    resolveField('Société facturée', invoiceRecipient?.company_name, campagne.nom_campagne, true),
    resolveField('SIRET', invoiceRecipient?.siret, campagne.siret, true),
    resolveField('TVA intracom', invoiceRecipient?.tva, campagne.tva, true),
    resolveField('Email facturation', invoiceRecipient?.email, campagne.email_contact, true),
    resolveField('Email bons de commande', null, campagne.email_bon_commande),
    resolveField('Adresse', invoiceRecipient?.address, campagne.adresse, true),
    resolveField('Ville', cityLine, campagne.ville, true),
    resolveField('Téléphone', invoiceRecipient?.phone, campagne.telephone),
    resolveField('Pays', invoiceRecipient?.country, campagne.pays, true),
    resolveField('Pied de document', null, campagne.footer_text),
  ];
  return {
    source: preferInvoiceRecipient ? 'invoice_recipient' : 'campaign',
    sourceLabel: preferInvoiceRecipient ? 'Bloc facturation tierce' : 'Fiche campagne',
    fields,
    missingRequiredFields: fields
      .filter((field) => field.required && !isFilled(field.value === 'Non renseigné' ? '' : field.value))
      .map((field) => field.label),
  };
}

export function computeAdjustedInvoiceTotals(base: BillingAmounts, adjustments: InvoiceAdjustment[], vatRate: number) {
  const lines = adjustments.map((row) => {
    const totalHt = roundCurrency((row.unit === 'percent' ? base.totalHt * row.value / 100 : row.value) * (row.direction === 'deduction' ? -1 : 1));
    return { totalHt, totalTva: roundCurrency(totalHt * (row.vat === 'none' ? 0 : vatRate)) };
  });
  const totalHt = roundCurrency(base.totalHt + lines.reduce((sum, line) => sum + line.totalHt, 0));
  const taxableAdjustment = lines.reduce((sum, line, index) => sum + (adjustments[index].vat === 'none' ? 0 : line.totalHt), 0);
  const totalTva = roundCurrency((base.totalHt + taxableAdjustment) * vatRate);
  const error = adjustments.some((row) => !row.label.trim() || row.label.length > 200 || row.comment.length > 2000 || !Number.isFinite(row.value) || row.value <= 0 || row.value > 100000000)
    ? 'Complétez chaque libellé et saisissez un montant strictement positif.'
    : totalHt < 0 || totalHt + totalTva < 0 ? 'Les déductions ne peuvent pas rendre la facture négative.' : null;
  return { totals: { ...base, totalHt, totalTtc: roundCurrency(totalHt + totalTva) }, lines, error };
}
