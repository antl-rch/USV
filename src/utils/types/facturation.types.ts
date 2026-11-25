import type { Campagne } from './campagne.types.ts';
import type { LeadClient, LeadClientStats } from './rendezVous.types.ts';
import type { Vente, VenteStats } from './vente.types.ts';

export type FacturationPeriodPreset = 'current_month' | 'previous_month' | 'custom';
export type InvoiceRecipient = NonNullable<Campagne['bon_commande_config']>['invoice_recipient'];

export interface BillingField {
  label: string;
  value: string;
  required?: boolean;
  source: 'invoice_recipient' | 'campaign';
}

export interface ResolvedBillingProfile {
  source: 'invoice_recipient' | 'campaign';
  sourceLabel: string;
  fields: BillingField[];
  missingRequiredFields: string[];
}

export interface CampaignBillingSettings {
  vatRate: number;
  shippingFeeHt: number;
  freeShippingThresholdHt: number;
}

export interface LeadBillingSettings {
  unitPriceHt: number;
  smallCompanyPriceHt: number;
  largeCompanyPriceHt: number;
  usesEmployeeCountPricing: boolean;
}

export interface BillingPreviewMetadata {
  excluded_count?: number;
  is_reissue?: boolean;
  is_locked?: boolean;
  billing_campaign?: Campagne;
}

export type BillingPreview = BillingPreviewMetadata & (
  | { source: 'ventes'; rows: Vente[]; stats: VenteStats }
  | { source: 'leads'; rows: LeadClient[]; stats: LeadClientStats });

export interface BillingSummaryCard {
  label: string;
  value: string;
  tone: 'primary' | 'success' | 'warning' | 'muted';
}

export interface InvoiceEmailOption {
  value: string;
  label: string;
}

export interface BillingPeriod {
  start: string;
  end: string;
}

export interface BillingAmounts {
  assietteHt: number;
  totalHt: number;
  totalTtc: number;
}

export type ClientAccountBillingMode = 'validated' | 'manual';

export interface CampaignInvoicePaStatus {
  adjustments?: InvoiceAdjustment[];
  base_total_ht?: number;
  source_claimed?: boolean;
  account_mode?: ClientAccountBillingMode | null;
  account_quantity?: number | null;
  id_campaign_invoice: number | null;
  campaign_id: number;
  period_start: string;
  period_end: string;
  billing_mode?: 'standard' | 'lot_10_rdv';
  internal_reference: string;
  invoice_number: string | null;
  expected_invoice_number?: string;
  issued_at: string | null;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  currency: string;
  provider: string;
  provider_invoice_id: string | null;
  provider_status: string | null;
  provider_last_synced_at: string | null;
  status: 'draft' | 'creating' | 'issued' | 'failed';
  last_error: string | null;
  is_test?: boolean;
}

export interface InvoiceAdjustment {
  label: string;
  comment: string;
  direction: 'addition' | 'deduction';
  unit: 'euro' | 'percent';
  value: number;
  vat: 'campaign' | 'none';
}
