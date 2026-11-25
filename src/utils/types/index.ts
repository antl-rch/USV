export type {
  CommercialAgendaAgent,
  CommercialAgendaAgentOption,
  CommercialAgendaCalendarState,
  CommercialAgendaEditForm,
  CommercialAgendaEvent,
  CommercialAgendaPresentation,
  CommercialAgendaUpdatePayload,
} from './commercialAgenda.types.ts';

export type {
  SocialPlatform,
  SocialDraftStatus,
  SocialEditorialDraft,
  SocialVisual,
  SocialPlatformStatus,
  SocialDraftInput,
  SocialPlatformState,
  SocialReadinessCheck,
  SocialReadinessSnapshot,
  SocialPublicationPackage,
  SocialPublicationHistoryEntry,
  SocialPublicationDetail,
  SocialPublicationHistoryPage,
  SocialPublicationHistoryStatus,
  SocialWorkflowStage,
  SocialPublicationStatus,
} from './socialPublication.types.ts';

export type {
  TypePoste,
  PermissionSection,
  PermissionRecord,
  Poste,
  Departement,
  NiveauPrime,
  SeuilPrimeStats,
  PrimeStats,
  EmployeStats,
  EmployeCampaignProgpaStats,
  EmployeCampagneAssignment,
  Employe,
  EmployeFilter,
  LoginCredentials,
  LoginResponse,
  ApiResponse,
  CreateEmployeData,
  CreateEmployeResponse,
  PartenaireExterne,
  PartenaireExternePayload,
  ScriptCallBlockMode,
  UpdateEmployeScriptCallAccessPayload,
} from './user.types.ts';

export type {
  PartenaireStatistics,
  PartenaireStatisticsCampaign,
  PartenaireStatisticsContactabilityPoint,
  PartenaireStatisticsDailyPoint,
  PartenaireStatisticsFilters,
  PartenaireStatisticsHourlyPoint,
  PartenaireStatisticsPeriod,
  PartenaireStatisticsPoint,
  PartenaireStatisticsWeekdayPoint,
} from './partenaireStatistics.types.ts';

export type {
  CommercialDocument,
  CommercialDocumentTarget,
} from './commercialDocument.types.ts';

export type {
  PartenaireDocumentCampaign,
  PartenaireDocumentDossier,
  PartenaireDocumentDossierType,
  PartenaireDocumentFile,
  PartenaireDocumentsFilters,
  PartenaireDocumentsPagination,
  PartenaireDocumentsPeriod,
  PartenaireDocumentsResponse,
} from './partenaireDocuments.types.ts';

export type {
  PartenaireProspectCampaign,
  PartenaireProspectRow,
  PartenaireProspectsFilters,
  PartenaireProspectsResponse,
} from './partenaireProspects.types.ts';

export type {
  StatutCampagne,
  Campagne,
  CreateCampagneData,
  UpdateCampagneData,
  AgentAffecte,
  AddAgentCampagneData,
  TransfertAgentData,
  BonCommandeConfig,
  BonCommandeInvoiceRecipient,
  LeadBookingConfig,
  LeadBookingWeekday,
  CampagneLogoDeleteResult,
  CampagneLogoUploadResult,
} from './campagne.types.ts';

export type {
  Categorie,
  CategorieOption,
  TypeProduit,
  TypeOption,
  Produit,
  CreateProduitData,
  UpdateProduitData,
  CreateCategorieData,
  UpdateCategorieData,
  CampagneProduit,
  AddProduitCampagneData,
  UpdateProduitCampagneData,
  ImportProduitRow,
  ImportProduitResult,
} from './produit.types.ts';

export type {
  Panier,
  PanierFormState,
  PanierOrigin,
  PanierOriginOption,
  CreatePanierData,
  UpdatePanierData,
  ProduitInPanier,
  PanierProduit,
  AddProduitToPanierData,
  PanierProduitAssociation,
  UpdatePanierProduitData,
} from './panier.types.ts';

export type {
  TypeMateriel,
  EtatMateriel,
} from './materiel.types.ts';

export type {
  IncidentSecteur,
  IncidentSource,
  IncidentImpact,
  IncidentImpactUtilisateurs,
  IncidentCriticite,
  IncidentPriorite,
  IncidentUrgence,
  IncidentStatut,
  IncidentEnvironnement,
  IncidentTypeCommentaire,
  IncidentEmploye,
  IncidentCommentaire,
  Incident,
  IncidentPagination,
  ApiIncidentCommentaireResponse,
  ApiIncidentResponse,
  IncidentListResult,
  IncidentFilters,
  CreateIncidentPayload,
  QualifierIncidentPayload,
  TraiterIncidentPayload,
  AddIncidentCommentairePayload,
  CreateIncidentResult,
} from './incident.types.ts';

export {
  INCIDENT_SECTEUR_LABELS,
  INCIDENT_SOURCE_LABELS,
  INCIDENT_IMPACT_LABELS,
  INCIDENT_CRITICITE_LABELS,
  INCIDENT_PRIORITE_LABELS,
  INCIDENT_URGENCE_LABELS,
  INCIDENT_STATUT_LABELS,
  INCIDENT_ENVIRONNEMENT_LABELS,
  INCIDENT_SECTEUR_OPTIONS,
  INCIDENT_SOURCE_OPTIONS,
  INCIDENT_IMPACT_OPTIONS,
  INCIDENT_IMPACT_UTILISATEURS_OPTIONS,
  INCIDENT_CRITICITE_OPTIONS,
  INCIDENT_PRIORITE_OPTIONS,
  INCIDENT_URGENCE_OPTIONS,
  INCIDENT_STATUT_OPTIONS,
  INCIDENT_ENVIRONNEMENT_OPTIONS,
  INCIDENT_CLASSIFICATION_OPTIONS,
  formatIncidentEmploye,
  formatIncidentUtilisateursImpactes,
} from './incident.types.ts';

export type {
  EmployeMaterielBasic,
  MaterielAffectation,
  Materiel,
  CreateMaterielPayload,
  UpdateMaterielPayload,
  AffecterMaterielPayload,
  RestituerMaterielPayload,
  ApiMaterielResponse,
  ApiAffectationResponse,
} from './materiel.types.ts';

export {
  ETAT_MATERIEL_LABELS,
  ETAT_MATERIEL_OPTIONS,
  TYPE_MATERIEL_LABELS,
  TYPE_MATERIEL_OPTIONS,
} from './materiel.types.ts';

export type {
  EmployeBasic,
  EmployeOption,
  Booking,
  BookingFormState,
  BookingMoveFormState,
  BookingPayloadResult,
  BookingTimeOption,
  BookingViewMode,
  CalendarEvent,
  CreateBookingPayload,
  UpdateBookingPayload,
  BookingFilters,
  BookingConfig,
  ApiBookingResponse,
  ApiBookingConfigResponse,
} from './booking.types.ts';

export type {
  ICourrier,
  EmailComposerCopy,
  EmailComposerForm,
  EmailData,
  IUserBasic,
  ICourrierFormData,
  ICourrierUploadData,
  IPagination,
  IApiResponse,
  ICourrierSearchParams,
  ICourrierStats,
  CourrierSortColumn,
  SortOrder,
  ICourrierListParams,
  IColumnFilters,
  IConvertCropData,
  ICourrierSelectSuggestion,
  ICourrierAnalysisResult,
} from './courrier.types.ts';

export type {
  EmployeeDocument,
  EmployeeDocumentFormData,
  UploadDocumentRequest,
  DocumentUploadResult,
  DocumentsListResult,
  DocumentDeleteResult,
  UploadModalState,
  PdfModalState,
} from './document.types.ts';

export {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from './document.types.ts';

export type {
  TypeProspect,
  StatutProspect,
  QueueBlockReason,
  ImportProspectRow,
  ImportError,
  ImportResult,
  ImportApiResponse,
  Prospect,
  ProspectsApiResponse,
  ProspectFilters,
  ProspectUpdateData,
  SignalementType,
  ProspectSignale,
  EnrichissementStatut,
  ProspectEnrichmentSnapshot,
  ProspectEnrichmentPreview,
  ProspectEnrichmentRun,
  ProspectEnrichmentRunStatus,
} from './prospect.types.ts';

export type {
  StatutVente,
  ModePaiement,
  VenteProspect,
  VenteAgent,
  VenteCampagne,
  Vente,
  VenteDetailProduit,
  VenteDetail,
  VenteComplete,
  VenteListParams,
  VenteStats,
  FrigoAlertCampaign,
} from './vente.types.ts';

export type {
  InvoiceAdjustment,
  BillingAmounts,
  BillingField,
  BillingPeriod,
  BillingPreview,
  BillingPreviewMetadata,
  BillingSummaryCard,
  CampaignInvoicePaStatus,
  CampaignBillingSettings,
  FacturationPeriodPreset,
  InvoiceEmailOption,
  InvoiceRecipient,
  LeadBillingSettings,
  ResolvedBillingProfile,
  ClientAccountBillingMode,
} from './facturation.types.ts';

export type {
  AddMembreData,
  CreateDependanceData,
  CreateCommentaireData,
  CreateProjetData,
  CreateTacheData,
  CreateTagData,
  CreateTempsData,
  ListTachesFilters,
  Priorite,
  Projet,
  ProjetDashboard,
  ProjetStats,
  ProjetMembre,
  StatutProjet,
  StatutTache,
  Tache,
  TacheCommentaire,
  TacheDependance,
  TacheTag,
  TacheTemps,
  TypeProjet,
  UpdateProjetData,
  UpdateTacheData,
  ListProjetsFilters,
  ListProjetsResponse,
  ListTachesResponse,
  EmployeMini,
} from './projet.types.ts';

export type {
  ProgpaEtape,
  ProgpaNiveaux,
  ProgpaParCommercial,
  ProgpaParCommercialJour,
  ProgpaParJour,
  ProgpaSynthese,
  ProgpaSuiviEnCours,
  QualiteProgpaStatsResponse,
} from './qualite.types.ts';

export {
  STATUT_VENTE_LABELS,
  STATUT_VENTE_COLORS,
  MODE_PAIEMENT_LABELS,
  STATUT_VENTE_OPTIONS,
} from './vente.types.ts';

export type {
  StatutProspection,
  QueueCount,
  AgentState,
  CallInProgress,
  QueueState,
  InjectionResult,
  InjectionFilters,
  ProspectSourceCount,
  ProspectNafCount,
  ProspectCampagneRow,
  ProspectsCount,
  CampaignAgentStats,
  GlobalStats,
  SupervisionAgentOption,
  CampaignPurgeResult,
} from './queue.types.ts';

export type {
  AppelsParHeure,
  TauxAbouti,
  DureeMoyenneParJour,
  RaisonEchec,
  AllGraphiquesStats,
  SupervisionExportData,
  DateFilters,
  AmdStats,
  AppelsParOrigine,
  StatutAppelCount,
  StatutAppelParHeure,
} from './graphiques.types.ts';

export { STATUT_LABELS, STATUT_COLORS } from './graphiques.types.ts';

export type {
  AlerteType,
  AlerteStatut,
  AlerteDestinataire,
  AlerteConfig,
  CreateAlerteConfigPayload,
  UpdateAlerteConfigPayload,
  AlerteHistory,
  AlerteHistoryFilters,
  AlerteTypeMetadata,
} from './alerte.types.ts';

export type {
  CreateVigieActionData,
  CreateVigieManualPriorityData,
  CreateVigiePriorityBatchData,
  VigieAction,
  VigieDateRange,
  VigieHourlyPerformance,
  VigieRecommendation,
  VigieSegmentDimension,
  VigieSnapshot,
  VigieWeekdayPerformance,
} from './vigie.types.ts';

export {
  ALERTE_TYPES,
  ALERTE_TYPE_LABELS,
  ALERTE_TYPE_COLORS,
  ALERTE_STATUT_LABELS,
  ALERTE_STATUT_COLORS,
} from './alerte.types.ts';

export type {
  StatutAppel,
  OrigineAppel,
  CommercialFollowupType,
  Appel,
} from './appel.types.ts';

export type {
  Enregistrement,
  EnregistrementFilters,
  EnregistrementsApiResponse,
  PartnerRecordingOptions,
  RecordingOperationsConfiguration,
  RecordingFilterOption,
  RecordingStorageStatus,
  UpdateRecordingOperationsConfiguration,
} from './enregistrement.types.ts';

export type {
  CalendarPlanningEvent,
  Planning,
  PlanningAssignation,
  PlanningCalendarEvent,
  PlanningCreneau,
  PlanningDisplayEvent,
  PlanningPayload,
} from './planning.types.ts';

export type {
  AbsenceMotifOption,
  AbsenceRequest,
  AbsenceRequestStatus,
  AbsenceRequestType,
  CreateAbsenceRequestPayload,
} from './absence.types.ts';

export type {
  StatutRendezVous,
  RendezVousAgent,
  RendezVousProspect,
  RendezVousCampagne,
  RendezVousAppelSource,
  RendezVousItem,
  LeadClient,
  LeadClientListParams,
  LeadClientStats,
} from './rendezVous.types.ts';

export {
  STATUT_RENDEZ_VOUS_LABELS,
  STATUT_RENDEZ_VOUS_COLORS,
  STATUT_RENDEZ_VOUS_OPTIONS,
} from './rendezVous.types.ts';

export type {
  NotificationContextType,
  NotificationItem,
  NotificationType,
} from './notification.types.ts';

export type {
  AntlConfiguration,
  AntlConfigurationLogoDeleteResult,
  AntlConfigurationLogoUploadResult,
  AntlConfigurationRibDeleteResult,
  AntlConfigurationRibUploadResult,
  UpdateAntlConfigurationData,
} from './antlConfiguration.types.ts';

export type {
  BillingRhythm,
  BudgetBand,
  Engagement,
  PriceMode,
  QuoteCampaignType,
  QuotePricingModel,
  QuoteCustomClause,
  QuoteFlexibleService,
  QuoteFormChangeHandler,
  QuoteFormState,
  QuoteLine,
  QuotePdfPayload,
  QuoteProjectLine,
  QuoteProjectSection,
  QuoteThirdPartyService,
  QuoteTemplate,
  TemplateAssumption,
  TemplateFamily,
  TemplateStatus,
  Timeline,
} from './devis.types.ts';

export type {
  AsteriskIceServer,
  AsteriskSipSession,
  AsteriskTelephonySession,
  AsteriskWhisperSession,
  TelephonyConfiguration,
  TelephonyOperationsConfiguration,
  TelephonyProvider,
  TelephonyProviderReadiness,
  UpdateTelephonyProvider,
  SaveTelephonyTrunkAccount,
  SaveTelephonyTrunkConfiguration,
  TelephonyTrunkAccount,
  TelephonyTrunkApplyStatus,
  TelephonyTrunkAuthMode,
  TelephonyTrunkConfiguration,
  TelephonyTrunkDistributionMode,
  TelephonyTrunkEvent,
  TelephonyTrunkForm,
  TelephonyTrunkProvider,
  TelephonyTrunkRuntime,
  TelephonyTrunkRuntimeAccount,
  TwilioWhisperSession,
  WhisperSession,
} from './telephony.types.ts';

export type {
  SparklinePoint,
  KpiMetric,
  HomeKpiData,
  HomeKpiResponse,
} from './homeKpi.types.ts';
export type { ComparisonUnit, ComparisonMode, ComparisonValues, ComparisonMetric, ComparisonRow, ComparisonSection, ComparisonPeriod, ComparisonCampaign, ComparisonOptions, ComparisonFilters, MonthlyComparison } from './monthlyComparison.types.ts';
export * from './address.types.ts';
export * from './editableAddress.types.ts';

export * from './bookingLead.types.ts';

export type { SiteProof, SitePhoneProof, SiteProspection, SiteProspectionList, SiteProspectionQuery, SiteEditField, SiteEditForm, SiteEditPatch } from './siteProspection.types.ts';
export type { QuoteServiceBlock, QuoteDraftSnapshot, QuoteDraftSummary, QuoteDraft, LocalQuoteDraft } from './quoteDraft.types.ts';
export * from './commandesCalendar.types.ts';

export * from './prospectTargeting.types.ts';

export type { ScriptSupportKind, ScriptSupportItem, ScriptSupport } from './scriptSupport.types.ts';

export type { MonthlyCommercial, CommercialActivityFilter, MonthlyCommercialPeriodPreset, MonthlyCommercialCampaign, MonthlyCommercialStats, MonthlyPrimeClosure, MonthlyPrimeAdjustment } from './monthlyCommercial.types.ts';

export type { TransferCommercial, TransferCampaign, TransferOptions, TransferCriteria, TransferPreviewRequest, TransferCounts, TransferSummary, TransferPreview, TransferResult, TransferHistory } from './prospectTransfer.types.ts';

export type * from './scriptDocument.types.ts';
