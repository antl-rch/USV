export { UserModel } from './user.model.ts';
export { CampagneModel } from './campagne.model.ts';
export { ProduitModel } from './produit.model.ts';
export { courrierModel } from './courrier.model.ts';
export { MaterielModel } from './materiel.model.ts';
export { DocumentModel } from './document.model.ts';
export { BookingModel } from './booking.model.ts';
export {
  normalizeCommercialAgendaAgent,
  normalizeCommercialAgendaRendezVous,
} from './commercialAgenda.model.ts';
export { ProspectModel, mapProspectCampagneRowToProspect } from './prospect.model.ts';
export { NoteDirectionModel } from './noteDirection.model.ts';
export type { NoteDirectionData } from './noteDirection.model.ts';
export { DocumentationModel } from './documentation.model.ts';
export type { DocumentationData } from './documentation.model.ts';
export {
  buildFallbackVenteStats,
  buildResolvedBillingProfile,
  computeFacturableHt,
  computeFacturableLeadHt,
  computePreviewTotals,
  computeAdjustedInvoiceTotals,
  computeTtcAmount,
  DEFAULT_LEAD_PRICE_HT,
  getCampaignBillingSettings,
  getLeadBillingSettings,
  MMA_LARGE_COMPANY_LEAD_PRICE_HT,
  MMA_LEAD_BILLING_CAMPAIGN_ID,
  usesEmployeeCountLeadPricing,
} from './facturation.model.ts';
export { formatComparisonValue, comparisonDelta, comparisonMonthLabel, comparisonPeriodLabel, defaultComparisonMonths, defaultComparisonCampaign, comparisonDimension, comparisonGroups, comparisonCards, comparisonSignals, comparisonTableRows, comparisonDisplayRow, comparisonCsv } from './monthlyComparison.model.ts';

export { normalizeSiteProspection } from './siteProspection.model.ts';
export { isQuoteDraftSnapshot, parseLocalQuoteDrafts } from './quoteDraft.model.ts';
