import { useCallback, useMemo, useState } from 'react';
import { buildQuotePricingLines, DEFAULT_COMMISSION_DESCRIPTION, getQuoteBaseLineLabel, QUOTE_UNIT_PRICING_LABELS } from '../utils/scripts/index.ts';
import type { QuoteCustomClause, QuoteServiceBlock } from '../utils/types/index.ts';

export function useQuoteServiceBlocks() {
  const [blocks, setBlocks] = useState<QuoteServiceBlock[]>([]);
  const update = <Field extends keyof Omit<QuoteServiceBlock, 'id'>>(id: string, field: Field, value: QuoteServiceBlock[Field]): void => {
    setBlocks(previous => previous.map(block => block.id === id ? { ...block, [field]: value } : block));
  };
  const updateClause = (id: string, clauseId: string, changes: Partial<Omit<QuoteCustomClause, 'id'>>): void => {
    setBlocks(previous => previous.map(block => block.id === id ? { ...block,
      customClauses: block.customClauses.map(clause => clause.id === clauseId ? { ...clause, ...changes } : clause),
    } : block));
  };
  const groups = useMemo(() => blocks.map(block => ({
    id: block.id,
    title: block.conquestSectionTitle.trim() || 'Prestations',
    show_title: Boolean(block.conquestSectionTitle.trim()),
    lines: buildQuotePricingLines(block.campaignType, block.commercialCommissionRate ?? undefined,
      block.appointmentRate ?? undefined, block.customClauses, block.appointmentDescription,
      block.conquestLineLabel, block.commercialCommissionDescription)
      .map(line => ({ ...line, id: `${block.id}:${line.id}`, pricing_basis: 'unit' as const })),
  })), [blocks]);
  const presentations = blocks.map((block, index) => ({
    id: block.id,
    conquestSectionTitle: block.conquestSectionTitle,
    conquestBaseLineLabel: block.conquestLineLabel ?? getQuoteBaseLineLabel(block.campaignType),
    conquestLineCount: groups[index].lines.length,
    campaignType: block.campaignType,
    commercialCommissionDescription: block.commercialCommissionDescription,
    commercialCommissionRate: block.commercialCommissionRate ?? undefined,
    appointmentRate: block.appointmentRate ?? undefined,
    appointmentDescription: block.appointmentDescription,
    customClauses: block.customClauses,
    onConquestSectionTitleChange: (value: string) => update(block.id, 'conquestSectionTitle', value),
    onConquestLineLabelChange: (value: string) => update(block.id, 'conquestLineLabel', value),
    onCommercialCommissionDescriptionChange: (value: string) => update(block.id, 'commercialCommissionDescription', value),
    onCommercialCommissionRateChange: (value: number | undefined) => update(block.id, 'commercialCommissionRate', value ?? null),
    onAppointmentRateChange: (value: number | undefined) => update(block.id, 'appointmentRate', value ?? null),
    onAppointmentDescriptionChange: (value: string) => update(block.id, 'appointmentDescription', value),
    onCampaignTypeChange: (value: QuoteServiceBlock['campaignType']) => {
      setBlocks(previous => previous.map(current => current.id === block.id ? { ...current, campaignType: value,
        appointmentDescription: value !== 'commercial' && Object.values(QUOTE_UNIT_PRICING_LABELS).some(labels => labels.defaultDescription === current.appointmentDescription)
          ? QUOTE_UNIT_PRICING_LABELS[value].defaultDescription : current.appointmentDescription,
      } : current));
    },
    onAddCustomClause: () => update(block.id, 'customClauses', [...block.customClauses, {
      id: `clause-${crypto.randomUUID()}`, label: '', description: '', amount: undefined, included: false,
    }]),
    onRemoveCustomClause: (id: string) => update(block.id, 'customClauses', block.customClauses.filter(clause => clause.id !== id)),
    onUpdateCustomClause: (id: string, changes: Partial<Omit<QuoteCustomClause, 'id'>>) => updateClause(block.id, id, changes),
    onRemove: () => setBlocks(previous => previous.filter(current => current.id !== block.id)),
  }));
  const add = (): void => setBlocks(previous => [...previous, {
    id: `prestation-${crypto.randomUUID()}`, conquestSectionTitle: '', campaignType: 'qualified_appointment',
    commercialCommissionDescription: DEFAULT_COMMISSION_DESCRIPTION, commercialCommissionRate: null,
    appointmentRate: null, appointmentDescription: QUOTE_UNIT_PRICING_LABELS.qualified_appointment.defaultDescription,
    customClauses: [],
  }]);
  const restore = useCallback((saved: QuoteServiceBlock[]): void => setBlocks(saved.map(block => ({ ...block,
    customClauses: block.customClauses.map(clause => ({ ...clause, amount: clause.amount ?? undefined })),
  }))), []);
  return { blocks, groups, presentations, add, restore };
}
