import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  downloadCampagneFacturXDocumentService,
  getCampagneFacturationPreviewService,
  getCampagneFacturationPaStatusService,
  issueCampagneFacturationThroughPaService,
  sendCampagneFacturationEmailService,
  testCampagneFacturationThroughPaService,
} from '../API/services/index.ts';
import {
  buildResolvedBillingProfile,
  computeFacturableHt,
  computeFacturableLeadHt,
  computePreviewTotals,
  computeAdjustedInvoiceTotals,
  computeTtcAmount,
  getCampaignBillingSettings,
  getLeadBillingSettings,
  usesEmployeeCountLeadPricing,
} from '../API/models/index.ts';
import type {
  Campagne,
  InvoiceAdjustment,
  BillingPreview,
  BillingSummaryCard,
  CampaignInvoicePaStatus,
  ClientAccountBillingMode,
  FacturationPeriodPreset,
  InvoiceEmailOption,
  LeadClient,
  Vente,
} from '../utils/types/index.ts';
import {
  CAMPAIGN_VARIANTS,
  buildInvoiceEmailOptions,
  campaignBillingDisplayName,
  formatBillingCurrency,
  formatBillingDate,
  getBillingMonthBounds,
  isValidEmail,
  normalizeCampaignVariant,
  sanitizeBillingFileSegment,
} from '../utils/scripts/index.ts';
import { triggerBlobDownload } from '../utils/services/index.ts';
import { useAlert } from './useAlert.ts';
import { useCampagnes } from './useCampagnes.ts';

const MAX_ACCOUNT_QUANTITY = 5000;


export function useFacturation() {
  const { showConfirm, showError, showNumberConfirm, showSuccess } = useAlert();
  const { campagnes, isLoading, error } = useCampagnes();
  const currentMonthBounds = useMemo(() => getBillingMonthBounds(0), []);
  const previousMonthBounds = useMemo(() => getBillingMonthBounds(-1), []);
  const [requestedCampagneId, setRequestedCampagneId] = useState<number | null>(null);
  const [periodPreset, setPeriodPreset] = useState<FacturationPeriodPreset>('current_month');
  const [customDateStart, setCustomDateStart] = useState(currentMonthBounds.start);
  const [customDateEnd, setCustomDateEnd] = useState(currentMonthBounds.end);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadedAccountPeriod, setLoadedAccountPeriod] = useState('');
  const [accountCount, setAccountCount] = useState<{ key: string; mode: ClientAccountBillingMode; value: string } | null>(null);
  const [preview, setPreview] = useState<BillingPreview | null>(null);
  const [isGeneratingFacturX, setIsGeneratingFacturX] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedRecipientEmail, setSelectedRecipientEmail] = useState('');
  const [isSendingInvoiceEmail, setIsSendingInvoiceEmail] = useState(false);
  const [paInvoice, setPaInvoice] = useState<CampaignInvoicePaStatus | null>(null);
  const [isLoadingPaInvoice, setIsLoadingPaInvoice] = useState(false);
  const [isIssuingPaInvoice, setIsIssuingPaInvoice] = useState(false);
  const [isTestingPaInvoice, setIsTestingPaInvoice] = useState(false);
  const [testPaInvoice, setTestPaInvoice] = useState<CampaignInvoicePaStatus | null>(null);

  const resolvedPeriod = useMemo(() => {
    if (periodPreset === 'previous_month') return previousMonthBounds;
    if (periodPreset === 'custom') return { start: customDateStart, end: customDateEnd };
    return currentMonthBounds;
  }, [currentMonthBounds, customDateEnd, customDateStart, periodPreset, previousMonthBounds]);

  const [billingSnapshot, setBillingSnapshot] = useState<{ key: string; campagne: Campagne } | null>(null);
  const activeCampagnes = campagnes;
  const liveCampagne = activeCampagnes.find((campagne) => campagne.id_campagne === requestedCampagneId)
    ?? activeCampagnes[0]
    ?? null;
  const snapshotKey = `${liveCampagne?.id_campagne}:${resolvedPeriod.start}:${resolvedPeriod.end}`;
  const selectedCampagne = billingSnapshot?.key === snapshotKey ? billingSnapshot.campagne : liveCampagne;
  const selectedCampagneId = selectedCampagne?.id_campagne ?? null;
  const selectedVariant = normalizeCampaignVariant(selectedCampagne?.type_campagne);
  const isClientAccountCampaign = selectedVariant === CAMPAIGN_VARIANTS.client_account;
  const configuredAccountPrice = selectedCampagne?.bon_commande_config?.client_account_billing?.unit_price_ht;
  const clientAccountUnitPriceHt = typeof configuredAccountPrice === 'number' && Number.isFinite(configuredAccountPrice) && configuredAccountPrice > 0
    ? configuredAccountPrice : null;
  const usesEmployeeCountPricing = usesEmployeeCountLeadPricing(selectedCampagneId);
  const billingSettings = useMemo(() => getCampaignBillingSettings(selectedCampagne), [selectedCampagne]);
  const leadBillingSettings = useMemo(() => getLeadBillingSettings(selectedCampagne), [selectedCampagne]);
  const resolvedBillingProfile = useMemo(() => buildResolvedBillingProfile(selectedCampagne), [selectedCampagne]);
  const missingRequiredFields = [
    ...(resolvedBillingProfile?.missingRequiredFields ?? []),
    ...(isClientAccountCampaign && clientAccountUnitPriceHt === null ? ['Tarif HT par compte client'] : []),
  ];

  const accountPeriod = `${selectedCampagneId}:${resolvedPeriod.start}:${resolvedPeriod.end}`;
  const eligibleAccountRows = useMemo(() => {
    if (!isClientAccountCampaign || loadedAccountPeriod !== accountPeriod || preview?.source !== 'ventes') return [];
    const validatedAt = (vente: Vente) => Date.parse(vente.date_acceptation ?? '') || 0;
    return preview.rows.filter((vente) => vente.statut_vente === 'validee')
      .sort((a, b) => validatedAt(a) - validatedAt(b) || a.id_vente - b.id_vente).slice(0, MAX_ACCOUNT_QUANTITY);
  }, [accountPeriod, isClientAccountCampaign, loadedAccountPeriod, preview]);
  const issuedAccountInvoice = paInvoice?.provider_invoice_id && paInvoice.campaign_id === selectedCampagneId
    && paInvoice.period_start === resolvedPeriod.start && paInvoice.period_end === resolvedPeriod.end ? paInvoice : null;
  const committedInvoice = paInvoice?.campaign_id === selectedCampagneId && paInvoice.period_start === resolvedPeriod.start && paInvoice.period_end === resolvedPeriod.end
    && (paInvoice.provider_invoice_id || paInvoice.source_claimed) ? paInvoice : null;
  const issuedAccountQuantity = committedInvoice?.account_quantity ?? null;
  const selectedAccountCount = accountCount?.key === accountPeriod ? accountCount : null;
  const accountBillingMode = committedInvoice?.account_mode ?? selectedAccountCount?.mode ?? 'validated';
  const isManualAccountBilling = isClientAccountCampaign && accountBillingMode === 'manual';
  const accountQuantityLimit = isManualAccountBilling ? MAX_ACCOUNT_QUANTITY : eligibleAccountRows.length;
  const accountCountValue = issuedAccountQuantity !== null ? String(issuedAccountQuantity)
    : selectedAccountCount?.value ?? (!isManualAccountBilling && eligibleAccountRows.length ? String(eligibleAccountRows.length) : '');
  const parsedAccountCount = Number(accountCountValue);
  const accountQuantity = isClientAccountCampaign && /^[0-9]+$/.test(accountCountValue)
    && Number.isSafeInteger(parsedAccountCount) && parsedAccountCount >= 1 && parsedAccountCount <= accountQuantityLimit
    ? parsedAccountCount : undefined;
  const accountSelectionLocked = isLoadingPaInvoice || Boolean(committedInvoice) || isIssuingPaInvoice
    || isTestingPaInvoice || isGeneratingFacturX || isSendingInvoiceEmail;
  const setAccountBillingMode = (mode: ClientAccountBillingMode): void => {
    setAccountCount({ key: accountPeriod, mode, value: mode === 'validated' && eligibleAccountRows.length ? String(eligibleAccountRows.length) : '' });
    setTestPaInvoice(null);
  };
  const setAccountCountValue = (value: string): void => {
    setAccountCount({ key: accountPeriod, mode: accountBillingMode, value });
    setTestPaInvoice(null);
  };
  const accountRows = useMemo(() => eligibleAccountRows.slice(0, isManualAccountBilling ? 0 : accountQuantity ?? 0), [eligibleAccountRows, isManualAccountBilling, accountQuantity]);
  const [adjustmentDraft, setAdjustmentDraft] = useState<{ key: string; rows: InvoiceAdjustment[] }>({ key: '', rows: [] });
  const currentInvoice = paInvoice?.campaign_id === selectedCampagneId && paInvoice.period_start === resolvedPeriod.start && paInvoice.period_end === resolvedPeriod.end ? paInvoice : null;
  const adjustments = useMemo(() => committedInvoice?.adjustments ?? (adjustmentDraft.key === accountPeriod ? adjustmentDraft.rows : currentInvoice?.adjustments ?? []), [committedInvoice, adjustmentDraft, accountPeriod, currentInvoice]);
  const updateAdjustment = (index: number, patch: Partial<InvoiceAdjustment>): void => {
    setAdjustmentDraft({ key: accountPeriod, rows: adjustments.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) });
    setTestPaInvoice(null);
  };
  const addAdjustment = (): void => {
    setAdjustmentDraft({ key: accountPeriod, rows: [...adjustments, { label: '', comment: '', direction: 'addition', unit: 'euro', value: 0, vat: 'campaign' }] });
    setTestPaInvoice(null);
  };
  const removeAdjustment = (index: number): void => {
    setAdjustmentDraft({ key: accountPeriod, rows: adjustments.filter((_, rowIndex) => rowIndex !== index) });
    setTestPaInvoice(null);
  };
  const computedBaseTotals = computePreviewTotals(preview, billingSettings, selectedCampagne?.taux_commission_facturation ?? null, leadBillingSettings,
    isClientAccountCampaign ? clientAccountUnitPriceHt : undefined, isClientAccountCampaign ? (accountQuantity ?? 0) : undefined);
  const baseTotals = committedInvoice ? { ...computedBaseTotals, totalHt: committedInvoice.base_total_ht ?? computedBaseTotals.totalHt } : computedBaseTotals;
  const adjustmentPreview = computeAdjustedInvoiceTotals(baseTotals, adjustments, billingSettings.vatRate);
  const adjustmentsLocked = accountSelectionLocked;
  const canGenerateInvoice = loadedAccountPeriod === accountPeriod && !previewLoading && !isLoadingPaInvoice && !adjustmentPreview.error && Boolean(selectedCampagne) && missingRequiredFields.length === 0
    && (!isClientAccountCampaign || (!isLoadingPaInvoice && (isManualAccountBilling || !previewLoading) && accountQuantity !== undefined));
  const previewTotals = committedInvoice ? { ...adjustmentPreview.totals, totalHt: committedInvoice.total_ht, totalTtc: committedInvoice.total_ttc } : adjustmentPreview.totals;
  const emailOptions = useMemo<InvoiceEmailOption[]>(
    () => buildInvoiceEmailOptions(selectedCampagne),
    [selectedCampagne],
  );
  const resolvedRecipientEmail = selectedRecipientEmail.trim();
  const canSendInvoiceEmail = canGenerateInvoice && !isSendingInvoiceEmail && isValidEmail(resolvedRecipientEmail);
  const canIssueInvoiceThroughPa = canGenerateInvoice
    && previewTotals.totalHt > 0
    && !isIssuingPaInvoice
    && !issuedAccountInvoice;
  const canTestInvoiceThroughPa = canGenerateInvoice
    && previewTotals.totalHt > 0
    && !isTestingPaInvoice;

  useEffect(() => {
    if (!selectedCampagneId || !resolvedPeriod.start || !resolvedPeriod.end) return;
    let isCancelled = false;
    const loadPreview = async (): Promise<void> => {
      try {
        setPreviewLoading(true);
        setPreviewError(null);
        const response = await getCampagneFacturationPreviewService(selectedCampagneId, { date_debut: resolvedPeriod.start, date_fin: resolvedPeriod.end });
        if (!isCancelled) {
          setPreview(response);
          setLoadedAccountPeriod(accountPeriod);
          setBillingSnapshot(response.billing_campaign ? { key: accountPeriod, campagne: response.billing_campaign } : null);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setPreview(null);
          setPreviewError(loadError instanceof Error ? loadError.message : 'Impossible de charger l’aperçu de la période');
        }
      } finally {
        if (!isCancelled) setPreviewLoading(false);
      }
    };
    void loadPreview();
    return () => { isCancelled = true; };
  }, [accountPeriod, resolvedPeriod.end, resolvedPeriod.start, selectedCampagneId]);

  useEffect(() => {
    if (!selectedCampagneId || !resolvedPeriod.start || !resolvedPeriod.end) {
      setPaInvoice(null);
      return;
    }

    let isCancelled = false;
    const loadPaInvoice = async (): Promise<void> => {
      try {
        setIsLoadingPaInvoice(true);
        const invoice = await getCampagneFacturationPaStatusService(selectedCampagneId, {
          date_debut: resolvedPeriod.start,
          date_fin: resolvedPeriod.end,
        });
        if (!isCancelled) setPaInvoice(invoice);
      } catch (loadError) {
        if (!isCancelled) {
          setPaInvoice(null);
          setPreviewError(loadError instanceof Error ? loadError.message : 'Impossible de récupérer le statut VosFactures.');
        }
      } finally {
        if (!isCancelled) setIsLoadingPaInvoice(false);
      }
    };

    void loadPaInvoice();
    return () => { isCancelled = true; };
  }, [resolvedPeriod.end, resolvedPeriod.start, selectedCampagneId]);

  const generateFacturX = useCallback(async (): Promise<void> => {
    if (!selectedCampagne || !canGenerateInvoice) return;
    try {
      setPreviewError(null);
      setIsGeneratingFacturX(true);
      const blob = await downloadCampagneFacturXDocumentService(selectedCampagne.id_campagne, {
        adjustments,
        date_debut: resolvedPeriod.start,
        date_fin: resolvedPeriod.end,
        ...(accountQuantity !== undefined ? { account_quantity: accountQuantity, account_mode: accountBillingMode } : {}),
      });
      triggerBlobDownload(blob, `factur-x_${sanitizeBillingFileSegment(selectedCampagne.nom_campagne)}_${resolvedPeriod.start}_${resolvedPeriod.end}.pdf`);
    } catch (generationError) {
      setPreviewError(generationError instanceof Error ? generationError.message : 'Impossible de générer le document Factur-X.');
    } finally {
      setIsGeneratingFacturX(false);
    }
  }, [adjustments, accountBillingMode, accountQuantity, canGenerateInvoice, resolvedPeriod, selectedCampagne]);

  const generateFacturXLot10Rdv = useCallback(async (): Promise<void> => {
    if (!selectedCampagne || !canGenerateInvoice) return;
    const lotQuantity = await showNumberConfirm({
      title: 'Facturer des lots de rendez-vous',
      message: `Le prix d’un lot est calculé depuis le tarif lead de la campagne : ${formatBillingCurrency(leadBillingSettings.unitPriceHt * 10)} HT par lot de 10 rendez-vous qualifiés.`,
      label: 'Nombre de lots de 10 rendez-vous qualifiés',
      initialValue: 1,
      min: 1,
      max: 1000,
      confirmText: 'Générer la facture',
      cancelText: 'Annuler',
    });
    if (lotQuantity === null) return;

    try {
      setPreviewError(null);
      setIsGeneratingFacturX(true);
      const blob = await downloadCampagneFacturXDocumentService(selectedCampagne.id_campagne, {
        adjustments,
        date_debut: resolvedPeriod.start,
        date_fin: resolvedPeriod.end,
        mode: 'lot_10_rdv',
        lot_quantity: lotQuantity,
      });
      triggerBlobDownload(blob, `factur-x_lots10rdv_${lotQuantity}lot${lotQuantity > 1 ? 's' : ''}_${sanitizeBillingFileSegment(selectedCampagne.nom_campagne)}_${resolvedPeriod.start}_${resolvedPeriod.end}.pdf`);
    } catch (generationError) {
      setPreviewError(generationError instanceof Error ? generationError.message : 'Impossible de générer le document Factur-X pour 1 lot de 10 rendez-vous.');
    } finally {
      setIsGeneratingFacturX(false);
    }
  }, [adjustments, canGenerateInvoice, leadBillingSettings.unitPriceHt, resolvedPeriod, selectedCampagne, showNumberConfirm]);

  const issueInvoiceThroughPa = useCallback(async (): Promise<void> => {
    if (!selectedCampagne || !canIssueInvoiceThroughPa) return;
    const confirmed = await showConfirm(
      `Émettre la facture réglementaire de ${formatBillingDate(resolvedPeriod.start)} au ${formatBillingDate(resolvedPeriod.end)} sur VosFactures pour ${formatBillingCurrency(previewTotals.totalHt)} HT ? Cette action créera ou reprendra l’unique facture de cette campagne pour cette période.`,
      'Confirmer l’émission via VosFactures',
      'Émettre la facture',
      'Annuler',
    );
    if (!confirmed) return;

    try {
      setPreviewError(null);
      setIsIssuingPaInvoice(true);
      const invoice = await issueCampagneFacturationThroughPaService(selectedCampagne.id_campagne, {
        adjustments,
        date_debut: resolvedPeriod.start,
        date_fin: resolvedPeriod.end,
        ...(accountQuantity !== undefined ? { account_quantity: accountQuantity, account_mode: accountBillingMode } : {}),
      });
      setPaInvoice(invoice);
      await showSuccess(
        `La facture ${invoice.invoice_number || invoice.internal_reference} est enregistrée sur VosFactures.`,
        'Facture émise',
      );
    } catch (issuanceError) {
      await showError(
        issuanceError instanceof Error ? issuanceError.message : 'Impossible d’émettre la facture via VosFactures.',
        'Échec de l’émission',
      );
    } finally {
      setIsIssuingPaInvoice(false);
    }
  }, [adjustments, accountBillingMode, accountQuantity, canIssueInvoiceThroughPa, previewTotals.totalHt, resolvedPeriod, selectedCampagne, showConfirm, showError, showSuccess]);

  const testInvoiceThroughPa = useCallback(async (): Promise<void> => {
    if (!selectedCampagne || !canTestInvoiceThroughPa) return;
    const confirmed = await showConfirm(
      `Créer une facture de test VosFactures pour ${formatBillingDate(resolvedPeriod.start)} au ${formatBillingDate(resolvedPeriod.end)} et ${formatBillingCurrency(previewTotals.totalHt)} HT ? Aucun enregistrement réglementaire ne sera créé dans ANTL.`,
      'Confirmer le test VosFactures',
      'Créer le test',
      'Annuler',
    );
    if (!confirmed) return;

    try {
      setPreviewError(null);
      setIsTestingPaInvoice(true);
      const invoice = await testCampagneFacturationThroughPaService(selectedCampagne.id_campagne, {
        adjustments,
        date_debut: resolvedPeriod.start,
        date_fin: resolvedPeriod.end,
        ...(accountQuantity !== undefined ? { account_quantity: accountQuantity, account_mode: accountBillingMode } : {}),
      });
      setTestPaInvoice(invoice);
      await showSuccess(
        `Document de test ${invoice.invoice_number || invoice.internal_reference} créé sur VosFactures avec notre Factur-X joint. La facture réelle portera le n° ${invoice.expected_invoice_number || invoice.internal_reference}.`,
        'Test réussi',
      );
    } catch (testError) {
      await showError(
        testError instanceof Error ? testError.message : 'Impossible de créer la facture de test VosFactures.',
        'Échec du test',
      );
    } finally {
      setIsTestingPaInvoice(false);
    }
  }, [adjustments, accountBillingMode, accountQuantity, canTestInvoiceThroughPa, previewTotals.totalHt, resolvedPeriod, selectedCampagne, showConfirm, showError, showSuccess]);

  const openEmailModal = useCallback((): void => {
    setPreviewError(null);
    setSelectedRecipientEmail('');
    setIsEmailModalOpen(true);
  }, []);
  const closeEmailModal = useCallback((): void => {
    if (!isSendingInvoiceEmail) {
      setIsEmailModalOpen(false);
      setSelectedRecipientEmail('');
    }
  }, [isSendingInvoiceEmail]);

  const sendInvoiceEmail = useCallback(async (): Promise<void> => {
    if (!selectedCampagne || !canSendInvoiceEmail) return;
    const confirmed = await showConfirm(
      `Vous êtes sur le point d'envoyer la facture de la période ${formatBillingDate(resolvedPeriod.start)} → ${formatBillingDate(resolvedPeriod.end)} pour un total CA HT de ${formatBillingCurrency(previewTotals.totalHt)} à ${resolvedRecipientEmail}.`,
      'Confirmer l’envoi de la facture',
      'Envoyer',
      'Annuler',
    );
    if (!confirmed) return;
    try {
      setPreviewError(null);
      setIsSendingInvoiceEmail(true);
      const response = await sendCampagneFacturationEmailService(selectedCampagne.id_campagne, {
        adjustments,
        date_debut: resolvedPeriod.start,
        date_fin: resolvedPeriod.end,
        ...(accountQuantity !== undefined ? { account_quantity: accountQuantity, account_mode: accountBillingMode } : {}),
        recipient_email: resolvedRecipientEmail,
      });
      setIsEmailModalOpen(false);
      setSelectedRecipientEmail('');
      await showSuccess(response.message || `La facture a bien été envoyée à ${resolvedRecipientEmail}.`, 'Envoi confirmé');
    } catch (sendError) {
      await showError(sendError instanceof Error ? sendError.message : 'Impossible d’envoyer la facture par email.', 'Échec de l’envoi');
    } finally {
      setIsSendingInvoiceEmail(false);
    }
  }, [adjustments, accountBillingMode, accountQuantity, canSendInvoiceEmail, previewTotals.totalHt, resolvedPeriod, resolvedRecipientEmail, selectedCampagne, showConfirm, showError, showSuccess]);

  const summaryCards = useMemo<BillingSummaryCard[]>(() => {
    if (!selectedCampagne) return [];
    const cards: BillingSummaryCard[] = [
      { label: 'Campagne active', value: campaignBillingDisplayName(selectedCampagne), tone: 'primary' },
      { label: 'Période', value: `${formatBillingDate(resolvedPeriod.start)} → ${formatBillingDate(resolvedPeriod.end)}`, tone: 'muted' },
      {
        label: 'Source de facturation',
        value: resolvedBillingProfile?.sourceLabel ?? '—',
        tone: resolvedBillingProfile?.source === 'invoice_recipient' ? 'primary' : 'muted',
      },
      {
        label: 'Configuration facture',
        value: missingRequiredFields.length === 0 ? 'Complète' : `${missingRequiredFields.length} champ(s) à compléter`,
        tone: missingRequiredFields.length === 0 ? 'success' : 'warning',
      },
    ];
    if (!preview) return cards;
    return preview.source === 'ventes'
      ? [...cards,
        { label: isClientAccountCampaign ? 'Comptes clients validés' : 'Commandes validées', value: String(preview.rows.length), tone: 'primary' },
        ...(isClientAccountCampaign ? [] : [{ label: 'Assiette ventes HT', value: formatBillingCurrency(previewTotals.assietteHt), tone: 'primary' as const }]),
        { label: 'Montant facturé HT', value: formatBillingCurrency(previewTotals.totalHt), tone: 'success' }]
      : [...cards,
        { label: 'RDV facturables', value: String(preview.rows.length), tone: 'primary' },
        { label: 'Montant facturé HT', value: formatBillingCurrency(previewTotals.totalHt), tone: 'success' }];
  }, [isClientAccountCampaign, missingRequiredFields.length, preview, previewTotals.assietteHt, previewTotals.totalHt, resolvedBillingProfile, resolvedPeriod, selectedCampagne]);

  const leadBillingSummary = useMemo(() => {
    const rows = preview?.source === 'leads' ? preview.rows : [];
    const smallCompanyCount = usesEmployeeCountPricing
      ? rows.filter((lead) => !lead.entreprise_plus_de_cinq_salaries).length
      : 0;
    return {
      campaignName: selectedCampagne?.nom_campagne ?? 'la campagne',
      defaultPriceHt: usesEmployeeCountPricing ? leadBillingSettings.smallCompanyPriceHt : leadBillingSettings.unitPriceHt,
      largeCompanyCount: usesEmployeeCountPricing ? rows.length - smallCompanyCount : 0,
      largeCompanyPriceHt: leadBillingSettings.largeCompanyPriceHt,
      smallCompanyCount,
      usesEmployeeCountPricing,
    };
  }, [leadBillingSettings, preview, selectedCampagne?.nom_campagne, usesEmployeeCountPricing]);

  const getVenteAmounts = useCallback((vente: Vente) => {
    if (isClientAccountCampaign) {
      const totalHt = clientAccountUnitPriceHt ?? 0;
      return { assietteHt: totalHt, totalHt, totalTtc: computeTtcAmount(totalHt, billingSettings.vatRate) };
    }
    const assietteHt = computeFacturableHt(vente);
    const rawCommissionRate = Number(selectedCampagne?.taux_commission_facturation ?? 0);
    const commissionMultiplier = Number.isFinite(rawCommissionRate) && rawCommissionRate > 0
      ? rawCommissionRate / 100
      : 1;
    const totalHt = assietteHt * commissionMultiplier;
    return { assietteHt, totalHt, totalTtc: computeTtcAmount(totalHt, billingSettings.vatRate) };
  }, [billingSettings, selectedCampagne?.taux_commission_facturation, isClientAccountCampaign, clientAccountUnitPriceHt]);
  const getLeadAmounts = useCallback((lead: LeadClient) => {
    const totalHt = computeFacturableLeadHt(lead, leadBillingSettings);
    return { assietteHt: totalHt, totalHt, totalTtc: computeTtcAmount(totalHt, billingSettings.vatRate) };
  }, [billingSettings.vatRate, leadBillingSettings]);

  const setDateStart = useCallback((value: string): void => {
    setPeriodPreset('custom');
    setCustomDateStart(value);
  }, []);
  const setDateEnd = useCallback((value: string): void => {
    setPeriodPreset('custom');
    setCustomDateEnd(value);
  }, []);

  const isSwissLifeCampaign = selectedCampagne?.id_campagne === 12 || selectedCampagne?.id_campagne === 14;

  return {
    adjustments, adjustmentsLocked, adjustmentPreview, baseTotals, addAdjustment, updateAdjustment, removeAdjustment,
    activeCampagnes,
    billingSettings,
    isClientAccountCampaign,
    clientAccountUnitPriceHt,
    accountRows,
    accountCountValue,
    accountBillingMode,
    isManualAccountBilling,
    accountQuantityLimit,
    accountSelectionLocked,
    setAccountBillingMode,
    accountQuantity,
    availableAccountCount: eligibleAccountRows.length,
    issuedAccountQuantity,
    setAccountCountValue,
    canGenerateInvoice,
    canIssueInvoiceThroughPa,
    canTestInvoiceThroughPa,
    canSendInvoiceEmail,
    closeEmailModal,
    emailOptions,
    error,
    generateFacturX,
    generateFacturXLot10Rdv,
    getLeadAmounts,
    getVenteAmounts,
    isEmailModalOpen,
    isGeneratingFacturX,
    isIssuingPaInvoice,
    isSwissLifeCampaign,
    isTestingPaInvoice,
    isLoadingPaInvoice,
    isLoading,
    isSendingInvoiceEmail,
    leadBillingSummary,
    missingRequiredFields,
    openEmailModal,
    issueInvoiceThroughPa,
    paInvoice,
    periodPreset,
    preview,
    previewError,
    previewLoading: previewLoading || loadedAccountPeriod !== accountPeriod,
    previewTotals,
    resolvedBillingProfile,
    resolvedPeriod,
    selectedCampagne,
    selectedCampagneId,
    selectedRecipientEmail,
    sendInvoiceEmail,
    setDateEnd,
    setDateStart,
    setPeriodPreset,
    setRequestedCampagneId,
    setSelectedRecipientEmail,
    summaryCards,
    testInvoiceThroughPa,
    testPaInvoice,
  };
}

export type FacturationState = ReturnType<typeof useFacturation>;
