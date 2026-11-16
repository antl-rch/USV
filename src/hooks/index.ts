export { useEmployeeDetails } from './useEmployeeDetails.ts';
export type { EmployeeDetailsState } from './useEmployeeDetails.ts';
export { useEmployeeDetailsView } from './useEmployeeDetailsView.ts';
export type { EmployeeDetailsViewModel } from './useEmployeeDetailsView.ts';
export { useAgentsListView } from './useAgentsListView.ts';
export type { AgentsListViewModel } from './useAgentsListView.ts';
export { useUserContext } from './useUserContext.ts';
export { useSignInForm } from './useSignInForm.ts';
export type { SignInFormViewModel } from './useSignInForm.ts';
export { useEmployes } from './useEmployes.ts';
export { usePostes } from './usePostes.ts';
export { useDocumentationPage } from './useDocumentationPage.ts';
export type { DocumentationPageViewModel } from './useDocumentationPage.ts';
export { usePostesListView } from './usePostesListView.ts';
export type { PostesListViewModel } from './usePostesListView.ts';
export { usePosteForm } from './usePosteForm.ts';
export type { PosteFormViewModel } from './usePosteForm.ts';
export { useAgentForm } from './useAgentForm.ts';
export type { AgentFormViewModel } from './useAgentForm.ts';
export { useCampagnes, useCampagneAgents, useCampagneProduits } from './useCampagnes.ts';
export { useCampagneForm } from './useCampagneForm.ts';
export { useCampagneFormView } from './useCampagneFormView.ts';
export type { CampagneFormViewModel } from './useCampagneFormView.ts';
export { useCategories, createCategorieIfNotExists } from './useProduits.ts';
export { useProduitForm } from './useProduitForm.ts';
export { useProduitFormView } from './useProduitFormView.ts';
export type { ProduitFormViewModel } from './useProduitFormView.ts';
export { useProduitImport } from './useProduitImport.ts';
export { useProduitsListView } from './useProduitsListView.ts';
export type { ProduitsImportModalViewModel, ProduitsListViewModel } from './useProduitsListView.ts';
export { useCampagneProduitsPaginated } from './useCampagneProduitsPaginated.ts';
export { useCategoriesAndTypes } from './useCategoriesAndTypes.ts';
export { useTypesProduits } from './useTypesProduits.ts';
export { usePaniers } from './usePaniers.ts';
export { usePaniersListView } from './usePaniersListView.ts';
export type { PaniersListViewModel } from './usePaniersListView.ts';
export { usePanierProduits } from './usePanierProduits.ts';
export { usePanierProduitsListView } from './usePanierProduitsListView.ts';
export type { PanierProduitsListViewModel } from './usePanierProduitsListView.ts';
export { useProduitPaniers } from './useProduitPaniers.ts';
export { useVentes } from './useVentes.ts';
export { useCourrierSelection } from './useCourrierSelection.ts';
export { useCourrierActions } from './useCourrierActions.ts';
export { useCourrier } from './useCourrier.ts';
export { useCourriersHubView } from './useCourriersHubView.ts';
export type { CourriersHubViewModel } from './useCourriersHubView.ts';
export { useCourrierFieldOptions } from './useCourrierFieldOptions.ts';
export { useMateriel, useMarques } from './useMateriel.ts';
export { useMaterielListView } from './useMaterielListView.ts';
export type { MaterielListViewModel } from './useMaterielListView.ts';
export { useTelephonyProviderConfiguration } from './useTelephonyProviderConfiguration.ts';
export type { TelephonyProviderConfigurationViewModel } from './useTelephonyProviderConfiguration.ts';
export { useTelephonyTrunkConfiguration } from './useTelephonyTrunkConfiguration.ts';
export type { TelephonyTrunkConfigurationViewModel } from './useTelephonyTrunkConfiguration.ts';
export { useTelephonyManagementView } from './useTelephonyManagementView.ts';
export type { TelephonyManagementViewModel } from './useTelephonyManagementView.ts';
export { useBookingContext } from './useBookingContext.ts';
export { useHeaderView } from './useHeaderView.ts';
export type { HeaderViewModel } from './useHeaderView.ts';
export { useDynamicGreeting } from './useDynamicGreeting.ts';
export { useSubNavView } from './useSubNavView.ts';
export type { SubNavViewModel } from './useSubNavView.ts';
export { useEmailComposer } from './useEmailComposer.ts';
export type { EmailComposerViewModel, UseEmailComposerOptions } from './useEmailComposer.ts';
export { useBookingCalendarView } from './useBookingCalendarView.ts';
export type {
  BookingCalendarViewModel,
  BookingDetailViewModel,
  BookingFormViewModel,
  BookingMonthCalendarViewModel,
  BookingMoveViewModel,
  BookingWeekCalendarViewModel,
} from './useBookingCalendarView.ts';
export { useProspectImport } from './useProspectImport.ts';
export { useProspectImportPage } from './useProspectImportPage.ts';
export type { ProspectImportPageViewModel } from './useProspectImportPage.ts';
export { useProspects } from './useProspects.ts';
export { useProspectsViewPage } from './useProspectsViewPage.ts';
export type { ProspectsViewPageViewModel } from './useProspectsViewPage.ts';
export { useInjection } from './useInjection.ts';
export { useSupervision } from './useSupervision.ts';
export { useSupervisionView } from './useSupervisionView.ts';
export type { SupervisionViewModel } from './useSupervisionView.ts';
export { useTooltip } from './useTooltip.ts';
export { useGraphiques, useAppelsParHeure, useTauxAbouti, useDureeMoyenne, useTopRaisons } from './useGraphiques.ts';
export { useAlertesConfig, useAlertesHistory } from './useAlertes.ts';
export { useAlerteConfigCard } from './useAlerteConfigCard.ts';
export type { AlerteConfigCardViewModel } from './useAlerteConfigCard.ts';
export { useAlertesConfigPage } from './useAlertesConfigPage.ts';
export type { AlertesConfigPageViewModel } from './useAlertesConfigPage.ts';
export { useAlerteHistoryRow } from './useAlerteHistoryRow.ts';
export type { AlerteHistoryRowViewModel } from './useAlerteHistoryRow.ts';
export { useAlertesHistoryPage } from './useAlertesHistoryPage.ts';
export type { AlertesHistoryPageViewModel } from './useAlertesHistoryPage.ts';
export { useSupervisionAgents, useEmployeGraphiques } from './useSupervisionFilters.ts';
export { useCommandeDetails } from './useCommandeDetails.ts';
export { useCommercialDocuments } from './useCommercialDocuments.ts';
export { useCommandeDetailsRoute } from './useCommandeDetailsRoute.ts';
export { useCommandesList } from './useCommandesList.ts';
export type { CommandesListState, CommandesSelectOption } from './useCommandesList.ts';
export { useCommandesListView } from './useCommandesListView.ts';
export type { CommandesListViewModel } from './useCommandesListView.ts';
export { useQualiteEcoutes } from './useQualiteEcoutes.ts';
export { useQualiteEcoutesPage } from './useQualiteEcoutesPage.ts';
export type { QualiteEcoutesPageViewModel } from './useQualiteEcoutesPage.ts';
export { usePartenaireEcoutesPage } from './usePartenaireEcoutesPage.ts';
export type { PartenaireEcoutesPageViewModel } from './usePartenaireEcoutesPage.ts';
export { usePartenaireProspectsPage } from './usePartenaireProspectsPage.ts';
export type { PartenaireProspectsPageViewModel } from './usePartenaireProspectsPage.ts';
export { usePartenairesExternesPage } from './usePartenairesExternesPage.ts';
export type { PartenairesExternesPageViewModel } from './usePartenairesExternesPage.ts';
export { useImageConverter } from './useImageConverter.ts';
export { usePlanningCalendar } from './usePlanningCalendar.ts';
export { useAbsenceRequests } from './useAbsenceRequests.ts';
export { useProspectInjection } from './useProspectInjection.ts';
export { useSupervisionExport } from './useSupervisionExport.ts';
export { usePWAStatus } from './usePWAStatus.ts';
export { useAlert } from './useAlert.ts';
export { useAbsenceManagement } from './useAbsenceManagement.ts';
export type { AbsenceManagementState } from './useAbsenceManagement.ts';
export { useAbsenceManagementView } from './useAbsenceManagementView.ts';
export type { AbsenceManagementViewModel } from './useAbsenceManagementView.ts';
export { useLeadClientDetails } from './useLeadClientDetails.ts';
export { useLeadClientDetailsPage } from './useLeadClientDetailsPage.ts';
export type { LeadClientDetailsPageViewModel } from './useLeadClientDetailsPage.ts';
export { useProspectEnrichment } from './useProspectEnrichment.ts';
export type { ProspectEnrichmentState } from './useProspectEnrichment.ts';
export { useProspectEnrichmentView } from './useProspectEnrichmentView.ts';
export type { ProspectEnrichmentViewModel } from './useProspectEnrichmentView.ts';
export { useVigie } from './useVigie.ts';
export { useVigieView } from './useVigieView.ts';
export type { VigieViewState } from './useVigieView.ts';
export { useVigiePage } from './useVigiePage.ts';
export type { VigiePageViewModel } from './useVigiePage.ts';
export { useFacturation } from './useFacturation.ts';
export type { FacturationState } from './useFacturation.ts';
export { useFacturationView } from './useFacturationView.ts';
export { useSocialPublication } from './useSocialPublication.ts';
export type { SocialPublicationState } from './useSocialPublication.ts';
export { useSocialPublicationView } from './useSocialPublicationView.ts';
export { useSocialPublicationHistory } from './useSocialPublicationHistory.ts';
export type { SocialPublicationHistoryState } from './useSocialPublicationHistory.ts';
export { useSocialPublicationHistoryView } from './useSocialPublicationHistoryView.ts';
export type { FacturationViewModel } from './useFacturationView.ts';
export { useProjetEditor } from './useProjetEditor.ts';
export type { ProjetEditorViewModel } from './useProjetEditor.ts';
export { useTacheEditor } from './useTacheEditor.ts';
export type { TacheEditorViewModel } from './useTacheEditor.ts';
export { useAntlConfigurationForm } from './useAntlConfigurationForm.ts';
export type { AntlConfigurationFormViewModel } from './useAntlConfigurationForm.ts';
export { useAntlConfigurationView } from './useAntlConfigurationView.ts';
export type { AntlConfigurationViewModel } from './useAntlConfigurationView.ts';
export { useConfigurationFileUpload } from './useConfigurationFileUpload.ts';
export type { ConfigurationFileUploadState } from './useConfigurationFileUpload.ts';
export { usePlanningAdmin } from './usePlanningAdmin.ts';
export { useWhisper } from './useWhisper.ts';
export { useQualiteProgpaStats } from './useQualiteProgpaStats.ts';
export { useQualiteStatsView } from './useQualiteStatsView.ts';
export { useQualiteStatsPage } from './useQualiteStatsPage.ts';
export type { QualiteStatsPageViewModel } from './useQualiteStatsPage.ts';
export { useDevisView } from './useDevisView.ts';
export type { DevisViewModel } from './useDevisView.ts';
export { useDevisPage } from './useDevisPage.ts';
export type { DevisPageViewModel } from './useDevisPage.ts';
export { useListeCourriersView } from './useListeCourriersView.ts';
export type { CourrierTooltipState, ListeCourriersViewModel } from './useListeCourriersView.ts';
export { useUpdateCourrierView } from './useUpdateCourrierView.ts';
export type { UpdateCourrierViewModel } from './useUpdateCourrierView.ts';
export { useNouveauCourrierView } from './useNouveauCourrierView.ts';
export type { NouveauCourrierViewModel } from './useNouveauCourrierView.ts';
export { useNotifications, useOptionalNotifications } from './useNotifications.ts';
export { useIncident, useIncidents } from './useIncidents.ts';
export { useIncidentTreatmentView } from './useIncidentTreatmentView.ts';
export type { IncidentTreatmentViewModel } from './useIncidentTreatmentView.ts';
export { useIncidentQualificationView } from './useIncidentQualificationView.ts';
export type { IncidentQualificationViewModel } from './useIncidentQualificationView.ts';
export { useIncidentDeclarationView } from './useIncidentDeclarationView.ts';
export type { IncidentDeclarationViewModel } from './useIncidentDeclarationView.ts';
export { useIncidentListView } from './useIncidentListView.ts';
export type { IncidentListViewModel } from './useIncidentListView.ts';
export { useKanban, useMesTachesKanban, useTache } from './useTache.ts';
export { useTachesKanbanView } from './useTachesKanbanView.ts';
export type { TachesKanbanViewModel } from './useTachesKanbanView.ts';
export { useMesTachesView } from './useMesTachesView.ts';
export type { MesTachesViewModel } from './useMesTachesView.ts';
export { useProjet, useProjetDashboard, useProjetMembres, useProjets } from './useProjet.ts';
export { useProjetDetailsView } from './useProjetDetailsView.ts';
export type { ProjetDetailsViewModel } from './useProjetDetailsView.ts';
export { useProjetsListView } from './useProjetsListView.ts';
export type { ProjetsListViewModel } from './useProjetsListView.ts';
export { useProspectsSignales } from './useProspectsSignales.ts';
export { useCourrierEditPreview } from './useCourrierEditPreview.ts';
export { useNotesDirection } from './useNotesDirection.ts';
export { usePWAInstall } from './usePWA.ts';
export type {
  AbsenceManagementStatusFilter,
  AbsenceManagementTab,
} from './useAbsenceManagement.ts';
export { useQueuePreview } from './useQueuePreview.ts';
export { usePartenaireStatistics } from './usePartenaireStatistics.ts';
export type { PartenaireStatisticsViewModel } from './usePartenaireStatistics.ts';
export { usePartenaireDocuments } from './usePartenaireDocuments.ts';
export type { PartenaireDocumentsViewModel } from './usePartenaireDocuments.ts';
export { usePartenairePortal } from './usePartenairePortal.ts';
export type { PartenairePortalViewModel } from './usePartenairePortal.ts';
export { useProspectEditor } from './useProspectEditor.ts';
export { useProspectDetailView } from './useProspectDetailView.ts';
export type { ProspectDetailViewModel } from './useProspectDetailView.ts';
export { useHomePage } from './useHomePage.ts';
export type { HomePageViewModel } from './useHomePage.ts';
export { useHomeKpis } from './useHomeKpis.ts';
export type { HomeKpisState } from './useHomeKpis.ts';
export { useCampagnesListPage } from './useCampagnesListPage.ts';
export type { CampagnesListPageViewModel } from './useCampagnesListPage.ts';
export { useMonPlanningPage } from './useMonPlanningPage.ts';
export type { MonPlanningPageViewModel } from './useMonPlanningPage.ts';
export { useCommercialAgenda } from './useCommercialAgenda.ts';
export type { CommercialAgendaViewModel } from './useCommercialAgenda.ts';
export { useNotesDirectionPage } from './useNotesDirectionPage.ts';
export type { NotesDirectionPageViewModel } from './useNotesDirectionPage.ts';
export { useImageConverterPage } from './useImageConverterPage.ts';
export type { ImageConverterPageViewModel } from './useImageConverterPage.ts';
export { useProspectInjectionPage } from './useProspectInjectionPage.ts';
export type { ProspectInjectionPageViewModel } from './useProspectInjectionPage.ts';
export { useProspectsSignalesPage } from './useProspectsSignalesPage.ts';
export type { ProspectsSignalesPageViewModel } from './useProspectsSignalesPage.ts';
export {
  useBookingPage,
  useCentreAppelsPage,
  useCommercialPage,
  useCommerciauxPage,
  useIncidentsHubPage,
  useQualitePage,
} from './useHubPages.ts';
export type {
  BookingPageViewModel,
  CentreAppelsPageViewModel,
  CommercialPageViewModel,
  CommerciauxPageViewModel,
  IncidentsHubPageViewModel,
  QualitePageViewModel,
} from './useHubPages.ts';
export { useMonthlyComparison } from './useMonthlyComparison.ts';
export { useComparisonSection } from './useComparisonSection.ts';
export * from './useAddressAutocomplete.ts';
export * from './useEditableAddress.ts';
export { useLeadContactEditor } from './useLeadContactEditor.ts';

export * from './useLeadBookingSchedule.ts';
export * from './useBookingCreantlLead.ts';

export { useSitesProspection } from './useSitesProspection.ts';
export type { SitesProspectionViewModel } from './useSitesProspection.ts';
export { useQuoteServiceBlocks } from './useQuoteServiceBlocks.ts';
export { useQuoteDrafts } from './useQuoteDrafts.ts';
export type { QuoteDraftsViewModel } from './useQuoteDrafts.ts';
export * from './useCommandesCalendar.ts';

export { useProspectTargetingEditor } from './useProspectTargetingEditor.ts';

export * from "./useProspectTargetingValues.ts";

export { useScriptSupportEditor } from './useScriptSupportEditor.ts';
export type { ScriptSupportEditorModel } from './useScriptSupportEditor.ts';

export { useLeadScheduleEditor } from './useLeadScheduleEditor.ts';

export { useStatistiquesPage, type StatistiquesPageViewModel } from './useStatistiquesPage.ts';

export { useMonthlyCommercial, type MonthlyCommercialViewModel } from './useMonthlyCommercial.ts';

export { useProspectTransfer } from './useProspectTransfer.ts';
export type { ProspectTransferViewModel } from './useProspectTransfer.ts';
export { useProspectTransferHistory } from './useProspectTransferHistory.ts';

export { useMonthlyPrimeAdjustments } from './useMonthlyPrimeAdjustments.ts';

export { useScriptDocuments } from './useScriptDocuments.ts';
