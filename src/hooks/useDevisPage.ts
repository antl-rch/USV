import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadQuoteDocumentService } from '../API/services/index.ts';
import {
  BILLING_LABELS,
  ENGAGEMENT_LABELS,
  buildProjectQuoteSections,
  validateQuoteComposition,
  getQuoteEngagementMonths,
  getQuoteTimelineLabel,
} from '../utils/scripts/index.ts';
import { triggerBlobDownload } from '../utils/services/index.ts';
import type { QuotePdfPayload } from '../utils/types/index.ts';
import { useAlert } from './useAlert.ts';
import { useQuoteDrafts } from './useQuoteDrafts.ts';
import { useDevisView } from './useDevisView.ts';

export function useDevisPage() {
  const navigate = useNavigate();
  const { showError } = useAlert();
  const devis = useDevisView();
  const drafts = useQuoteDrafts(devis.snapshot, devis.restoreSnapshot);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const navigateBack = useCallback((): void => {
    void navigate('/commercial');
  }, [navigate]);
  const generateQuote = useCallback(async (): Promise<void> => {
    const companyName = devis.formState.companyName.trim();
    const quoteLines = devis.quoteLines;
    const projectSections = buildProjectQuoteSections(devis.projectSections);
    const conquestSections = devis.conquestQuoteLines.length ? [{
      id: 'conquete',
      title: devis.conquestSectionTitle.trim() || 'Prestations',
      show_title: Boolean(devis.conquestSectionTitle.trim()),
      lines: devis.conquestQuoteLines
        .map(({ id, label, description, included, offered, amount, amount_kind, pricing_basis }) => ({
          id,
          label,
          description,
          included,
          ...(offered ? { offered: true } : {}),
          amount,
          amount_kind,
          ...(devis.flexibleQuoteLines.length || devis.additionalServiceGroups.some(group => group.lines.length > 0) ? { pricing_basis } : {}),
        })),
    }] : [];

    if (!companyName || quoteLines.length === 0) {
      await showError('Renseignez l’entreprise et au moins une prestation tarifée, incluse ou offerte avant de générer le devis.', 'Devis incomplet');
      return;
    }

    if (devis.allConquestQuoteLines.some((line) => !line.label.trim())) {
      await showError('Renseignez l’intitulé de chaque prestation chiffrée.', 'Devis incomplet');
      return;
    }
    const compositionError = validateQuoteComposition(devis.projectSections, devis.flexibleServices);
    if (compositionError) {
      await showError(compositionError, 'Devis incomplet');
      return;
    }
    const flexibleSections = devis.flexibleQuoteLines.length ? [{
      id: 'flexible-services', title: devis.flexibleSectionTitle.trim() || 'Prestations libres et primes',
      show_title: Boolean(devis.flexibleSectionTitle.trim()), lines: devis.flexibleQuoteLines,
    }] : [];
    const documentLines = quoteLines.map(({ pricing_basis, ...line }) => (
      devis.flexibleQuoteLines.length || devis.additionalServiceGroups.some(group => group.lines.length > 0) ? { ...line, pricing_basis } : line
    ));
    const payload: QuotePdfPayload = {
      pricing_model: devis.isProjectQuote ? 'project_delivery' : devis.campaignType,
      client: {
        company_name: companyName,
        contact_name: devis.formState.contactName.trim(),
        contact_role: devis.formState.contactRole.trim(),
        email: devis.formState.email.trim(),
        phone: devis.formState.phone.trim(),
      },
      context: {
        need_summary: devis.formState.needSummary.trim(),
        objective: devis.formState.objective.trim(),
      },
      terms: {
        timeline_label: getQuoteTimelineLabel(devis.formState.timeline.trim()),
        engagement_label: ENGAGEMENT_LABELS[devis.formState.engagement],
        engagement_months: getQuoteEngagementMonths(devis.formState.engagement),
        billing_label: BILLING_LABELS[devis.formState.billingRhythm],
        conditions: devis.formState.commercialConditions.trim(),
      },
      lines: documentLines,
      assumptions: devis.isProjectQuote ? [] : devis.selectedAssumptions.map((assumption) => assumption.label),
      project_sections: [...conquestSections, ...devis.additionalServiceGroups.filter(group => group.lines.length), ...flexibleSections, ...projectSections],
      third_party_services: devis.isProjectQuote ? devis.thirdPartyServices
        .filter((service) => service.label.trim() && service.description.trim())
        .map(({ id, label, description }) => ({ id, label: label.trim(), description: description.trim() }))
        : undefined,
    };

    try {
      setIsGeneratingQuote(true);
      const blob = await downloadQuoteDocumentService(payload);
      triggerBlobDownload(blob, `devis_${companyName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    } catch (error) {
      await showError(error instanceof Error ? error.message : 'Impossible de générer le devis.', 'Erreur de génération');
    } finally {
      setIsGeneratingQuote(false);
    }
  }, [devis, showError]);

  return {
    ...devis,
    drafts,
    navigateBack,
    generateQuote,
    isGeneratingQuote,
  };
}

export type DevisPageViewModel = ReturnType<typeof useDevisPage>;
