import { useCallback, useMemo, useState } from 'react';
import { useQuoteServiceBlocks } from './useQuoteServiceBlocks.ts';
import {
  DEFAULT_FORM,
  DEFAULT_COMMISSION_DESCRIPTION,
  getQuoteBaseLineLabel,
  QUOTE_UNIT_PRICING_LABELS,
  PROJECT_QUOTE_SECTIONS,
  PROJECT_THIRD_PARTY_SERVICES,
  buildProjectQuotePricingLines,
  buildQuotePricingLines,
  QUOTE_TEMPLATES,
  buildFlexibleQuoteLines,
  getQuoteFixedTotals,
  isQuoteFixedLine,
  getQuoteChecklistProgress,
  getSelectedQuoteTemplates,
} from '../utils/scripts/index.ts';
import type {
  QuoteDraftSnapshot,
  QuoteCampaignType,
  QuoteCustomClause,
  QuoteFormChangeHandler,
  QuoteFormState,
  QuoteProjectLine,
  QuoteProjectSection,
  QuoteThirdPartyService,
  QuoteFlexibleService,
} from '../utils/types/index.ts';

export function useDevisView() {
  const serviceBlocks = useQuoteServiceBlocks();
  const restoreServiceBlocks = serviceBlocks.restore;
  const [conquestSectionTitle, setConquestSectionTitle] = useState('');
  const [flexibleSectionTitle, setFlexibleSectionTitle] = useState('');
  const [conquestLineLabel, setConquestLineLabel] = useState<string | undefined>();
  const [commercialCommissionDescription, setCommercialCommissionDescription] = useState(DEFAULT_COMMISSION_DESCRIPTION);
  const [flexibleServices, setFlexibleServices] = useState<QuoteFlexibleService[]>([]);
  const [formState, setFormState] = useState<QuoteFormState>(DEFAULT_FORM);
  const [campaignType, setCampaignType] = useState<QuoteCampaignType>('qualified_appointment');
  const [commercialCommissionRate, setCommercialCommissionRate] = useState<number | undefined>();
  const [appointmentRate, setAppointmentRate] = useState<number | undefined>();
  const [appointmentDescription, setAppointmentDescription] = useState(QUOTE_UNIT_PRICING_LABELS.qualified_appointment.defaultDescription);
  const [customClauses, setCustomClauses] = useState<QuoteCustomClause[]>([]);
  const [projectSections, setProjectSections] = useState<QuoteProjectSection[]>(() => (
    PROJECT_QUOTE_SECTIONS.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({ ...line })),
    }))
  ));
  const [thirdPartyServices, setThirdPartyServices] = useState<QuoteThirdPartyService[]>(() => (
    PROJECT_THIRD_PARTY_SERVICES.map((service) => ({ ...service }))
  ));

  const conquestQuoteLines = useMemo(
    () => buildQuotePricingLines(campaignType, commercialCommissionRate, appointmentRate, customClauses, appointmentDescription, conquestLineLabel, commercialCommissionDescription)
      .map((line) => ({ ...line, pricing_basis: 'unit' as const })),
    [appointmentRate, appointmentDescription, campaignType, commercialCommissionRate, customClauses, conquestLineLabel, commercialCommissionDescription],
  );
  const projectQuoteLines = useMemo(() => buildProjectQuotePricingLines(projectSections), [projectSections]);
  const flexibleQuoteLines = useMemo(() => buildFlexibleQuoteLines(flexibleServices), [flexibleServices]);
  const isProjectQuote = projectQuoteLines.length > 0;
  const allConquestQuoteLines = useMemo(() => [...conquestQuoteLines, ...serviceBlocks.groups.flatMap(group => group.lines)], [conquestQuoteLines, serviceBlocks.groups]);
  const isConquestQuote = allConquestQuoteLines.length > 0;
  const selectedTemplateIds = useMemo(() => [
    ...(isConquestQuote ? ['conquete'] : []), ...(isProjectQuote ? ['conception'] : []),
  ], [isConquestQuote, isProjectQuote]);
  const selectedTemplates = useMemo(() => getSelectedQuoteTemplates(QUOTE_TEMPLATES, selectedTemplateIds), [selectedTemplateIds]);
  const quoteLines = useMemo(() => [...allConquestQuoteLines, ...flexibleQuoteLines, ...projectQuoteLines],
    [allConquestQuoteLines, projectQuoteLines, flexibleQuoteLines]);
  const fixedTotals = useMemo(() => getQuoteFixedTotals(quoteLines), [quoteLines]);
  const hasFixedLines = quoteLines.some(isQuoteFixedLine);
  const hasConditionalLines = quoteLines.some((line) => !line.included
    && (line.line_type === 'prime' || line.pricing_basis === 'variable' || line.pricing_basis === 'unit'));
  const checklist = getQuoteChecklistProgress(formState, quoteLines.length);
  const selectedAssumptions = selectedTemplates.flatMap((template) => template.assumptions);
  const selectedTemplateTitle = [...selectedTemplates.map((template) => template.title), ...(flexibleQuoteLines.length ? ['Prestations libres et primes'] : [])].join(' + ');
  const selectedTemplatePromise = 'Les prestations renseignées ci-dessous composent votre proposition.';

  const snapshot = useMemo<QuoteDraftSnapshot>(() => ({
    version: 1, selectedTemplateIds, formState, campaignType,
    ...(serviceBlocks.blocks.length ? { additionalServiceBlocks: serviceBlocks.blocks } : {}),
    conquestSectionTitle, flexibleSectionTitle, conquestLineLabel, commercialCommissionDescription,
    commercialCommissionRate: commercialCommissionRate ?? null,
    appointmentRate: appointmentRate ?? null, appointmentDescription,
    customClauses, projectSections, thirdPartyServices, flexibleServices,
  }), [serviceBlocks.blocks, selectedTemplateIds, formState, campaignType, commercialCommissionRate, appointmentRate,
    appointmentDescription, customClauses, projectSections, thirdPartyServices, flexibleServices, conquestSectionTitle, flexibleSectionTitle, conquestLineLabel, commercialCommissionDescription]);
  const restoreSnapshot = useCallback((saved: QuoteDraftSnapshot): void => {
    restoreServiceBlocks(saved.additionalServiceBlocks ?? []);
    setConquestSectionTitle(saved.conquestSectionTitle ?? '');
    setFlexibleSectionTitle(saved.flexibleSectionTitle ?? '');
    setConquestLineLabel(saved.conquestLineLabel);
    setCommercialCommissionDescription(saved.commercialCommissionDescription ?? DEFAULT_COMMISSION_DESCRIPTION);
    setFormState({ ...saved.formState });
    setCampaignType(saved.campaignType);
    setCommercialCommissionRate(saved.commercialCommissionRate ?? undefined);
    setAppointmentRate(saved.appointmentRate ?? undefined);
    setAppointmentDescription(saved.appointmentDescription);
    setCustomClauses(saved.customClauses.map(clause => ({ ...clause, amount: clause.amount ?? undefined })));
    setProjectSections(saved.projectSections.map(section => ({ ...section, lines: section.lines.map(line => ({ ...line, amount: line.amount ?? undefined })) })));
    setThirdPartyServices(saved.thirdPartyServices.map(service => ({ ...service })));
    setFlexibleServices((saved.flexibleServices ?? []).map(service => ({
      ...service,
      kind: service.kind ?? (service.pricing === 'variable' ? 'prime' : 'prestation'),
      amount: service.amount ?? undefined,
    })));
  }, [restoreServiceBlocks]);

  const addFlexibleService = (): void => {
    setFlexibleServices((previous) => [...previous, {
      id: `service-${Date.now()}-${previous.length}`, label: '', description: '', pricing: 'fixed',
      kind: 'prestation', amountKind: 'currency', amount: undefined, condition: '',
    }]);
  };
  const updateFlexibleService = <Field extends keyof Omit<QuoteFlexibleService, 'id'>>(
    id: string, field: Field, value: QuoteFlexibleService[Field],
  ): void => {
    setFlexibleServices((previous) => previous.map((service) => {
      if (service.id !== id) return service;
      const updated = { ...service, [field]: value };
      if (updated.kind === 'prestation') updated.pricing = 'fixed';
      if (updated.pricing === 'fixed' && updated.amountKind === 'percentage') {
        updated.amountKind = 'currency';
        updated.amount = undefined;
      }
      return updated;
    }));
  };
  const removeFlexibleService = (id: string): void => setFlexibleServices((previous) => previous.filter((service) => service.id !== id));
  const addProjectSection = (): void => setProjectSections((previous) => [...previous, {
    id: `phase-${Date.now()}`, title: '', lines: [{ id: `line-${Date.now()}`, label: '', description: '', amount: undefined, included: false, isCustom: true }],
  }]);

  const handleFormChange: QuoteFormChangeHandler = <Field extends keyof QuoteFormState>(
    field: Field,
    value: QuoteFormState[Field],
  ): void => {
    setFormState((previous) => ({ ...previous, [field]: value }));
  };

  const handleCampaignTypeChange = (nextType: QuoteCampaignType): void => {
    setAppointmentDescription((description) => {
      const isDefaultDescription = Object.values(QUOTE_UNIT_PRICING_LABELS)
        .some((labels) => labels.defaultDescription === description);
      return nextType !== 'commercial' && isDefaultDescription
        ? QUOTE_UNIT_PRICING_LABELS[nextType].defaultDescription
        : description;
    });
    setCampaignType(nextType);
  };

  const addCustomClause = (): void => {
    setCustomClauses((previous) => [...previous, {
      id: `custom-clause-${Date.now()}-${previous.length}`,
      label: '',
      description: '',
      amount: undefined,
      included: false,
    }]);
  };

  const updateCustomClause = (
    clauseId: string,
    changes: Partial<Omit<QuoteCustomClause, 'id'>>,
  ): void => {
    setCustomClauses((previous) => previous.map((clause) => (
      clause.id === clauseId ? { ...clause, ...changes } : clause
    )));
  };

  const removeCustomClause = (clauseId: string): void => {
    setCustomClauses((previous) => previous.filter((clause) => clause.id !== clauseId));
  };

  const addProjectLine = (sectionId: string): void => {
    setProjectSections((previous) => previous.map((section) => {
      if (section.id !== sectionId) return section;

      return {
        ...section,
        lines: [...section.lines, {
          id: `project-line-${Date.now()}-${section.lines.length}`,
          label: '',
          description: '',
          amount: undefined,
          included: false,
          isCustom: true,
        }],
      };
    }));
  };

  const updateProjectLine = (
    sectionId: string,
    lineId: string,
    changes: Partial<Omit<QuoteProjectLine, 'id'>>,
  ): void => {
    setProjectSections((previous) => previous.map((section) => {
      if (section.id !== sectionId) return section;

      return {
        ...section,
        lines: section.lines.map((line) => (
          line.id === lineId ? { ...line, ...changes } : line
        )),
      };
    }));
  };

  const removeProjectLine = (sectionId: string, lineId: string): void => {
    setProjectSections((previous) => previous.map((section) => (
      section.id === sectionId
        ? { ...section, lines: section.lines.filter((line) => line.id !== lineId) }
        : section
    )));
  };

  const updateProjectSectionTitle = (sectionId: string, title: string): void => {
    setProjectSections((previous) => previous.map((section) => (
      section.id === sectionId ? { ...section, title } : section
    )));
  };

  const addThirdPartyService = (): void => {
    setThirdPartyServices((previous) => [...previous, {
      id: `third-party-${Date.now()}-${previous.length}`,
      label: '',
      description: '',
      isCustom: true,
    }]);
  };

  const updateThirdPartyService = <Field extends keyof Omit<QuoteThirdPartyService, 'id'>>(
    serviceId: string,
    field: Field,
    value: QuoteThirdPartyService[Field],
  ): void => {
    setThirdPartyServices((previous) => previous.map((service) => (
      service.id === serviceId ? { ...service, [field]: value } : service
    )));
  };

  const removeThirdPartyService = (serviceId: string): void => {
    setThirdPartyServices((previous) => previous.filter((service) => service.id !== serviceId));
  };

  return {
    additionalServiceBlocks: serviceBlocks.presentations,
    additionalServiceGroups: serviceBlocks.groups,
    addServiceBlock: serviceBlocks.add,
    allConquestQuoteLines,
    snapshot,
    restoreSnapshot,
    conquestSectionTitle,
    flexibleSectionTitle,
    conquestBaseLineLabel: conquestLineLabel ?? getQuoteBaseLineLabel(campaignType),
    commercialCommissionDescription,
    setConquestSectionTitle,
    setFlexibleSectionTitle,
    setConquestLineLabel,
    setCommercialCommissionDescription,
    addCustomClause,
    addProjectLine,
    addThirdPartyService,
    appointmentRate,
    appointmentDescription,
    campaignType,
    commercialCommissionRate,
    conquestQuoteLines,
    customClauses,
    formState,
    handleFormChange,
    progressPercent: checklist.percent,
    projectSections,
    quoteLines,
    removeCustomClause,
    removeProjectLine,
    removeThirdPartyService,
    selectedAssumptions,
    selectedTemplateIds,
    selectedTemplatePromise,
    selectedTemplateTitle,
    selectedTemplates,
    setAppointmentRate,
    setAppointmentDescription,
    setCampaignType: handleCampaignTypeChange,
    setCommercialCommissionRate,
    thirdPartyServices,
    isProjectQuote,
    isConquestQuote,
    updateCustomClause,
    updateProjectLine,
    updateProjectSectionTitle,
    updateThirdPartyService,
    flexibleServices,
    flexibleQuoteLines,
    addFlexibleService,
    updateFlexibleService,
    removeFlexibleService,
    addProjectSection,
    fixedTotals,
    hasFixedLines,
    hasConditionalLines,
  };
}

export type DevisViewModel = ReturnType<typeof useDevisView>;
