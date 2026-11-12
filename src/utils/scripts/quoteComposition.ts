import type { QuoteFlexibleService, QuotePdfPayload, QuoteProjectSection } from '../types/index.ts';

const isFlexibleServiceStarted = (service: QuoteFlexibleService): boolean => Boolean(
  service.label.trim() || service.description.trim() || service.amount !== undefined || service.condition.trim(),
);

export const buildFlexibleQuoteLines = (services: QuoteFlexibleService[]): QuotePdfPayload['lines'] => services
  .filter((service) => service.label.trim() && service.amount !== undefined)
  .map((service) => ({
    id: service.id,
    label: service.label.trim(),
    description: [service.description.trim(), service.pricing === 'variable' ? `Prime variable : ${service.condition.trim()}` : ''].filter(Boolean).join('\n'),
    mode: 'ponctuel',
    included: false,
    amount: service.amount ?? 0,
    amount_kind: service.amountKind,
    pricing_basis: service.pricing,
  }));

export const getQuoteFixedTotals = (lines: QuotePdfPayload['lines']): { ht: number; ttc: number } => {
  const ht = lines.filter((line) => !line.included && line.amount_kind === 'currency'
    && (!line.pricing_basis || line.pricing_basis === 'fixed')).reduce((sum, line) => sum + line.amount, 0);
  return { ht, ttc: ht * 1.2 };
};

export const validateQuoteComposition = (sections: QuoteProjectSection[], services: QuoteFlexibleService[]): string | null => {
  for (const section of sections) {
    if (section.lines.some((line) => line.included || line.amount !== undefined) && !section.title.trim()) {
      return 'Renseignez l’intitulé de chaque phase contenant une prestation tarifée, incluse ou offerte.';
    }
    for (const line of section.lines) {
      if ((line.included || line.amount !== undefined) && !line.label.trim()) return 'Renseignez l’intitulé de chaque prestation tarifée, incluse ou offerte.';
      if (line.amount !== undefined && (!Number.isFinite(line.amount) || line.amount < 0)) return 'Les montants doivent être positifs ou nuls.';
    }
  }
  for (const service of services.filter(isFlexibleServiceStarted)) {
    if (!service.label.trim() || service.amount === undefined) return 'Renseignez un intitulé et un montant pour chaque prestation libre ou prime.';
    if (!Number.isFinite(service.amount) || service.amount < 0) return 'Les montants doivent être positifs ou nuls.';
    if (service.pricing === 'variable' && !service.condition.trim()) return 'Précisez le déclenchement et, pour un pourcentage, la base de calcul de chaque prime.';
    if (service.amountKind === 'percentage' && service.amount > 100) return 'Un pourcentage doit être compris entre 0 et 100.';
  }
  return null;
};
