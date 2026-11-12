import type {
  BillingRhythm,
  BudgetBand,
  Engagement,
  QuoteCustomClause,
  QuotePdfPayload,
  QuoteFormState,
  QuoteCampaignType,
  QuoteProjectSection,
  QuoteThirdPartyService,
  QuoteTemplate,
  TemplateFamily,
  TemplateStatus,
  Timeline,
} from '../types/index.ts';

export const FAMILY_LABELS: Record<TemplateFamily, string> = {
  cycle_client: 'Cycle client',
  structuration: 'Structuration',
  marque: 'Marque & acquisition',
};

export const STATUS_LABELS: Record<TemplateStatus, string> = {
  socle: 'Socle prioritaire',
  a_structurer: 'À structurer',
};

export const BUDGET_LABELS: Record<BudgetBand, string> = {
  '<3k': 'Moins de 3 000 €',
  '3k_8k': '3 000 € à 8 000 €',
  '8k_15k': '8 000 € à 15 000 €',
  '15k+': 'Plus de 15 000 €',
};

export const TIMELINE_LABELS: Record<Timeline, string> = {
  urgent: 'Démarrage immédiat',
  '30j': 'Dans 30 jours',
  '60j': 'Dans 60 jours',
  cadre: 'Pas encore calé',
};

export const BILLING_LABELS: Record<BillingRhythm, string> = {
  mensuel: 'Facturation mensuelle',
  '50_50': '50% lancement / 50% livraison',
  acompte: 'Acompte puis échéancier',
  commande: 'À la commande',
  livraison: 'À la livraison',
  ponctuel: 'Ponctuel',
};

export const getQuoteTimelineLabel = (timeline: string): string => (
  Object.entries(TIMELINE_LABELS).find(([value]) => value === timeline)?.[1] ?? timeline
);

export const QUOTE_CAMPAIGN_TYPE_LABELS: Record<QuoteCampaignType, string> = {
  commercial: 'Commercial',
  qualified_appointment: 'Rendez-vous qualifié',
  client_account: 'Compte client',
};

export const QUOTE_UNIT_PRICING_LABELS = {
  qualified_appointment: {
    title: 'Tarification au rendez-vous qualifié',
    label: 'Rendez-vous',
    descriptionLabel: 'Description du rendez-vous',
    defaultDescription: 'Tarif unitaire facturé pour chaque rendez-vous qualifié réalisé.',
  },
  client_account: {
    title: 'Tarification au compte client',
    label: 'Compte client',
    descriptionLabel: 'Description du compte client',
    defaultDescription: 'Tarif unitaire facturé pour chaque compte client.',
  },
};

export const ENGAGEMENT_LABELS: Record<Engagement, string> = {
  '1_mois_reconduction': '1 mois, reconduction tacite',
  '3_mois': '3 mois',
  '6_mois': '6 mois',
  mission_unique: 'Mission ponctuelle',
};

export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    id: 'conquete',
    title: 'Conquête',
    description: 'Prospection, qualification et prise de rendez-vous pour ouvrir un pipe commercial propre.',
    family: 'cycle_client',
    status: 'socle',
    promise: 'Déployer une mécanique d’acquisition claire, pilotée au volume et à la qualité des leads générés.',
    baseFee: 1850,
    setupFee: 950,
    durationLabel: 'Sprint initial de 3 mois',
    objectives: ['Générer des rendez-vous qualifiés', 'Structurer le discours', 'Mesurer le taux de transformation'],
    includedLines: [
      {
        id: 'conquete-ciblage',
        label: 'Ciblage et segmentation',
        description: 'Travail des cibles, qualification des typologies et messages d’approche.',
        amount: 350,
        mode: 'mensuel',
        selectedByDefault: true,
      },
      {
        id: 'conquete-production',
        label: 'Production commerciale',
        description: 'Campagnes d’appels, traitement des objections et remontées de terrain.',
        amount: 1100,
        mode: 'mensuel',
        selectedByDefault: true,
      },
      {
        id: 'conquete-reporting',
        label: 'Pilotage et reporting',
        description: 'Rythme de suivi, lecture des résultats et ajustements du dispositif.',
        amount: 400,
        mode: 'mensuel',
        selectedByDefault: true,
      },
    ],
    optionLines: [
      {
        id: 'conquete-linkedin',
        label: 'Relais LinkedIn',
        description: 'Appui messages et séquences complémentaires sur LinkedIn.',
        amount: 420,
        mode: 'mensuel',
      },
      {
        id: 'conquete-landing',
        label: 'Mini landing de conversion',
        description: 'Page d’atterrissage légère pour consolider la prise de contact.',
        amount: 850,
        mode: 'ponctuel',
      },
    ],
    assumptions: [],
  },
  {
    id: 'fidelisation',
    title: 'Fidélisation',
    description: 'Programme de suivi client pour animer le portefeuille et réduire l’érosion relationnelle.',
    family: 'cycle_client',
    status: 'socle',
    promise: 'Installer une cadence relationnelle qui augmente la satisfaction, la récurrence et les opportunités d’upsell.',
    baseFee: 1650,
    setupFee: 700,
    durationLabel: 'Déploiement continu sur 6 mois',
    objectives: ['Réactiver le portefeuille', 'Améliorer la satisfaction', 'Détecter les opportunités commerciales'],
    includedLines: [
      {
        id: 'fidelisation-animation',
        label: 'Animation portefeuille',
        description: 'Campagnes de suivi, rappels, points de contact et remontées clients.',
        amount: 980,
        mode: 'mensuel',
        selectedByDefault: true,
      },
      {
        id: 'fidelisation-discours',
        label: 'Trame relationnelle',
        description: 'Conception des séquences et harmonisation du ton de relation client.',
        amount: 320,
        mode: 'mensuel',
        selectedByDefault: true,
      },
      {
        id: 'fidelisation-lecture',
        label: 'Tableau de bord fidélité',
        description: 'Lecture des retours, irritants et signaux d’attrition.',
        amount: 350,
        mode: 'mensuel',
        selectedByDefault: true,
      },
    ],
    optionLines: [
      {
        id: 'fidelisation-enquete',
        label: 'Enquête satisfaction',
        description: 'Collecte et synthèse d’un baromètre simple post-interaction.',
        amount: 480,
        mode: 'mensuel',
      },
      {
        id: 'fidelisation-atelier',
        label: 'Atelier expérience client',
        description: 'Session de restitution et plan d’action avec les équipes internes.',
        amount: 980,
        mode: 'ponctuel',
      },
    ],
    assumptions: [
      { id: 'fidelisation-ass-1', label: 'Base clients active et historique d’échanges exploitables.' },
      { id: 'fidelisation-ass-2', label: 'Un canal de suivi validé par la marque et les équipes internes.' },
    ],
  },
  {
    id: 'retention',
    title: 'Rétention',
    description: 'Dispositif de récupération client et d’anti-churn avec priorisation des dossiers sensibles.',
    family: 'cycle_client',
    status: 'socle',
    promise: 'Traiter les points de friction avant rupture et redonner une trajectoire aux comptes à risque.',
    baseFee: 2100,
    setupFee: 1100,
    durationLabel: 'Mission intensive sur 3 mois',
    objectives: ['Réduire le churn', 'Récupérer les comptes chauds', 'Qualifier les causes de départ'],
    includedLines: [
      {
        id: 'retention-priorisation',
        label: 'Priorisation des comptes',
        description: 'Classement des cas sensibles et définition des motifs de traitement.',
        amount: 500,
        mode: 'mensuel',
        selectedByDefault: true,
      },
      {
        id: 'retention-traitement',
        label: 'Traitement relationnel',
        description: 'Actions de rappel, négociation et résolution des cas de friction.',
        amount: 1200,
        mode: 'mensuel',
        selectedByDefault: true,
      },
      {
        id: 'retention-analyses',
        label: 'Analyses churn',
        description: 'Lecture des motifs, verbatims et recommandations correctives.',
        amount: 400,
        mode: 'mensuel',
        selectedByDefault: true,
      },
    ],
    optionLines: [
      {
        id: 'retention-scripts',
        label: 'Scripts de rétention avancés',
        description: 'Bibliothèque d’arguments et scénarios de sortie de crise.',
        amount: 650,
        mode: 'ponctuel',
      },
      {
        id: 'retention-comex',
        label: 'Restitution direction',
        description: 'Synthèse exécutive et plan correctif priorisé.',
        amount: 720,
        mode: 'ponctuel',
      },
    ],
    assumptions: [
      { id: 'retention-ass-1', label: 'Le client partage les motifs de résiliation et segments prioritaires.' },
      { id: 'retention-ass-2', label: 'Des marges de manœuvre commerciales sont définies en amont.' },
    ],
  },
  {
    id: 'conception',
    title: 'Conception',
    description: 'Conception d’outils commerciaux, de process et d’appuis opérationnels.',
    family: 'structuration',
    status: 'a_structurer',
    promise: 'Créer un cadre de travail plus lisible, plus automatisé et plus exploitable par les équipes.',
    baseFee: 2400,
    setupFee: 1400,
    durationLabel: 'Mission ponctuelle de 6 à 10 semaines',
    objectives: ['Clarifier les process', 'Outiller les équipes', 'Gagner en efficacité opérationnelle'],
    includedLines: [
      {
        id: 'conception-audit',
        label: 'Audit fonctionnel',
        description: 'Cartographie des besoins, irritants et usages métier.',
        amount: 850,
        mode: 'ponctuel',
        selectedByDefault: true,
      },
      {
        id: 'conception-cadrage',
        label: 'Cadrage de solution',
        description: 'Définition des parcours, flux et livrables attendus.',
        amount: 900,
        mode: 'ponctuel',
        selectedByDefault: true,
      },
      {
        id: 'conception-recette',
        label: 'Recette et appropriation',
        description: 'Validation métier et accompagnement à la prise en main.',
        amount: 650,
        mode: 'ponctuel',
        selectedByDefault: true,
      },
    ],
    optionLines: [
      {
        id: 'conception-ia',
        label: 'Brique IA métier',
        description: 'Exploration d’automatisations assistées par IA sur un périmètre ciblé.',
        amount: 1200,
        mode: 'ponctuel',
      },
      {
        id: 'conception-doc',
        label: 'Documentation d’exploitation',
        description: 'Guide d’usage et base de reprise pour les équipes.',
        amount: 540,
        mode: 'ponctuel',
      },
    ],
    assumptions: [
      { id: 'conception-ass-1', label: 'Un référent métier disponible pour les arbitrages hebdomadaires.' },
      { id: 'conception-ass-2', label: 'Accès aux outils et process existants pendant la phase d’audit.' },
    ],
  },
  {
    id: 'visibilite-online',
    title: 'Visibilité online',
    description: 'Dispositif de présence digitale, site et animation de canaux pour soutenir l’acquisition.',
    family: 'marque',
    status: 'a_structurer',
    promise: 'Rendre l’offre plus visible et plus compréhensible pour capter l’attention au bon endroit.',
    baseFee: 1900,
    setupFee: 1200,
    durationLabel: 'Lancement sur 4 mois',
    objectives: ['Rendre l’offre visible', 'Améliorer la crédibilité', 'Créer des points d’entrée commerciaux'],
    includedLines: [
      {
        id: 'visibilite-audit',
        label: 'Audit présence digitale',
        description: 'Lecture de l’existant et recommandations prioritaires.',
        amount: 450,
        mode: 'mensuel',
        selectedByDefault: true,
      },
      {
        id: 'visibilite-animation',
        label: 'Animation de contenus',
        description: 'Production et pilotage d’un calendrier éditorial simple.',
        amount: 980,
        mode: 'mensuel',
        selectedByDefault: true,
      },
      {
        id: 'visibilite-site',
        label: 'Optimisation pages clés',
        description: 'Travail sur les pages d’entrée, messages et conversions.',
        amount: 470,
        mode: 'mensuel',
        selectedByDefault: true,
      },
    ],
    optionLines: [
      {
        id: 'visibilite-shooting',
        label: 'Pack visuels',
        description: 'Création d’un petit socle visuel pour les supports digitaux.',
        amount: 780,
        mode: 'ponctuel',
      },
      {
        id: 'visibilite-campagne',
        label: 'Micro campagne sponsorisée',
        description: 'Pilotage d’un test d’acquisition sur un canal donné.',
        amount: 520,
        mode: 'mensuel',
      },
    ],
    assumptions: [
      { id: 'visibilite-ass-1', label: 'Le client valide les contenus et visuels dans des délais courts.' },
      { id: 'visibilite-ass-2', label: 'Les accès aux canaux et outils de publication sont disponibles.' },
    ],
  },
  {
    id: 'branding',
    title: 'Branding',
    description: 'Travail de positionnement, discours et cohérence de marque pour soutenir la vente.',
    family: 'marque',
    status: 'a_structurer',
    promise: 'Clarifier ce que la marque raconte, à qui elle parle et comment elle se différencie.',
    baseFee: 2200,
    setupFee: 1300,
    durationLabel: 'Mission de cadrage sur 8 semaines',
    objectives: ['Clarifier le positionnement', 'Harmoniser le discours', 'Renforcer la perception de valeur'],
    includedLines: [
      {
        id: 'branding-diagnostic',
        label: 'Diagnostic de marque',
        description: 'Analyse du positionnement, messages et cohérence perçue.',
        amount: 760,
        mode: 'ponctuel',
        selectedByDefault: true,
      },
      {
        id: 'branding-plateforme',
        label: 'Plateforme de discours',
        description: 'Messages clés, promesse et angles de prise de parole.',
        amount: 920,
        mode: 'ponctuel',
        selectedByDefault: true,
      },
      {
        id: 'branding-declinaison',
        label: 'Déclinaisons commerciales',
        description: 'Adaptation du discours sur les principaux supports de vente.',
        amount: 520,
        mode: 'ponctuel',
        selectedByDefault: true,
      },
    ],
    optionLines: [
      {
        id: 'branding-atelier',
        label: 'Atelier direction',
        description: 'Session de validation collective et arbitrage du territoire.',
        amount: 860,
        mode: 'ponctuel',
      },
      {
        id: 'branding-kit',
        label: 'Kit de messages',
        description: 'Trames prêtes à l’emploi pour site, mail et commercial.',
        amount: 620,
        mode: 'ponctuel',
      },
    ],
    assumptions: [
      { id: 'branding-ass-1', label: 'Disponibilité des dirigeants ou parties prenantes pour les ateliers.' },
      { id: 'branding-ass-2', label: 'Partage des supports existants et éléments de concurrence.' },
    ],
  },
];

export const DEFAULT_FORM: QuoteFormState = {
  companyName: '',
  contactName: '',
  contactRole: '',
  email: '',
  phone: '',
  needSummary: '',
  objective: '',
  budgetBand: '3k_8k',
  timeline: '30j',
  billingRhythm: 'mensuel',
  engagement: '1_mois_reconduction',
  commercialConditions: '',
};

export const QUOTE_SECTION_TITLE_SUGGESTIONS = QUOTE_TEMPLATES.map((template) => template.title);
export const QUOTE_SECTION_TITLE_PLACEHOLDER = `Ex. ${QUOTE_SECTION_TITLE_SUGGESTIONS.join(', ')}`;
export const DEFAULT_COMMISSION_DESCRIPTION = 'Commission appliquée au montant HT de chaque vente conclue.';
export const getQuoteBaseLineLabel = (campaignType: QuoteCampaignType): string => (
  campaignType === 'commercial' ? 'Commission par vente' : QUOTE_UNIT_PRICING_LABELS[campaignType].label
);

export const PROJECT_QUOTE_SECTIONS: QuoteProjectSection[] = [
  {
    id: 'architecture',
    title: '',
    titlePlaceholder: 'Conception & Architecture Technique',
    lines: [
      {
        id: 'architecture-cadrage',
        label: '',
        description: '',
        labelPlaceholder: 'Cadrage, Architecture & Authentification Centralisée',
        descriptionPlaceholder: 'Modélisation de la base PostgreSQL, authentification centralisée et architecture de l’API.',
        amount: undefined,
        included: false,
      },
    ],
  },
  {
    id: 'mobile',
    title: '',
    titlePlaceholder: 'Application Mobile - iOS & Android',
    lines: [
      {
        id: 'mobile-socle',
        label: '',
        description: '',
        labelPlaceholder: 'Socle Application Mobile & Parcours Utilisateur',
        descriptionPlaceholder: 'Configuration React Native / Expo, profils, navigation et notifications push.',
        amount: undefined,
        included: false,
      },
      {
        id: 'mobile-reservation',
        label: '',
        description: '',
        labelPlaceholder: 'Catalogue, Recherche & Prise de Rendez-vous',
        descriptionPlaceholder: 'Exploration des prestataires, filtres, sélection des prestations et calendrier dynamique.',
        amount: undefined,
        included: false,
      },
      {
        id: 'mobile-geolocation',
        label: '',
        description: '',
        labelPlaceholder: 'Rendez-vous immédiat & Géolocalisation',
        descriptionPlaceholder: 'Demande immédiate, cartographie, estimation du trajet et notifications temps réel.',
        amount: undefined,
        included: false,
      },
    ],
  },
  {
    id: 'backend',
    title: '',
    titlePlaceholder: 'Back-End, Paiements & Sécurité',
    lines: [
      {
        id: 'backend-metier',
        label: '',
        description: '',
        labelPlaceholder: 'Développement Back-End & Logique Métier',
        descriptionPlaceholder: 'API REST Node.js, règles de disponibilité, gestion des créneaux et notifications.',
        amount: undefined,
        included: false,
      },
      {
        id: 'backend-stripe',
        label: '',
        description: '',
        labelPlaceholder: 'Intégration Paiement Sécurisé & Séquestre',
        descriptionPlaceholder: 'Verrouillage des fonds, libération après validation, annulations et remboursements.',
        amount: undefined,
        included: false,
      },
    ],
  },
  {
    id: 'backoffice',
    title: '',
    titlePlaceholder: 'Back-Office Administrateur',
    lines: [
      {
        id: 'backoffice-gestion',
        label: '',
        description: '',
        labelPlaceholder: 'Interface Web de Gestion & Configuration',
        descriptionPlaceholder: 'Tableau de bord, gestion des paramètres, modération et suivi des transactions.',
        amount: undefined,
        included: false,
      },
    ],
  },
  {
    id: 'web-deployment',
    title: '',
    titlePlaceholder: 'Web, Branding & Déploiement',
    lines: [
      {
        id: 'web-vitrine',
        label: '',
        description: '',
        labelPlaceholder: 'Site Vitrine & Redirection App Stores',
        descriptionPlaceholder: 'Landing page responsive, liens vers les stores, SEO de base et formulaires de contact.',
        amount: undefined,
        included: false,
      },
      {
        id: 'deployment-devops',
        label: '',
        description: '',
        labelPlaceholder: 'Mise en Service, DevOps & Déploiement',
        descriptionPlaceholder: 'Infrastructure, domaine, emails, certificats SSL et publication initiale sur les stores.',
        amount: undefined,
        included: false,
      },
    ],
  },
];

export const PROJECT_THIRD_PARTY_SERVICES: QuoteThirdPartyService[] = [
  {
    id: 'infomaniak',
    label: 'Infomaniak',
    description: 'Nom de domaine et adresse email professionnelle : environ 10 à 20 € par an.',
  },
  {
    id: 'supabase',
    label: 'Supabase - PostgreSQL',
    description: 'Plan professionnel ou supérieur, dimensionné selon la charge et le volume de données.',
  },
  {
    id: 'hetzner',
    label: 'Hetzner',
    description: 'Hébergement du back-end et des services d’authentification, dimensionné selon la charge.',
  },
  {
    id: 'developer-accounts',
    label: 'Comptes développeurs',
    description: 'Apple Developer : 99 $ par an. Google Play Console : 25 $ en paiement unique.',
  },
  {
    id: 'stripe',
    label: 'Stripe',
    description: 'Frais de transaction prélevés directement par Stripe sur les flux de paiement.',
  },
];

export function formatCurrency(value: number): string {
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });
}

export function getStatusTone(status: TemplateStatus): 'primary' | 'warning' {
  if (status === 'socle') {
    return 'primary';
  }

  return 'warning';
}

export const filterQuoteTemplates = (
  templates: QuoteTemplate[],
  family: TemplateFamily | 'all',
): QuoteTemplate[] => (family === 'all' ? templates : templates.filter((template) => template.family === family));

export const getSelectedQuoteTemplates = (
  templates: QuoteTemplate[],
  selectedIds: string[],
): QuoteTemplate[] => templates.filter((template) => selectedIds.includes(template.id));

export const getQuoteEngagementMonths = (engagement: QuoteFormState['engagement']): number => {
  if (engagement === '1_mois_reconduction') return 1;
  if (engagement === '6_mois') return 6;
  if (engagement === 'mission_unique') return 1;
  return 3;
};

export const buildQuotePricingLines = (
  campaignType: QuoteCampaignType,
  commercialCommissionRate: number | undefined,
  appointmentRate: number | undefined,
  customClauses: QuoteCustomClause[],
  appointmentDescription?: string,
  baseLineLabel?: string,
  commissionDescription = DEFAULT_COMMISSION_DESCRIPTION,
): QuotePdfPayload['lines'] => {
  if (campaignType === 'commercial') {
    if (commercialCommissionRate === undefined) return [];
    return [{
      id: 'commercial-commission',
      label: baseLineLabel ?? getQuoteBaseLineLabel(campaignType),
      description: commissionDescription,
      mode: 'ponctuel',
      included: false,
      amount: commercialCommissionRate,
      amount_kind: 'percentage',
    }];
  }

  const unitPricing = QUOTE_UNIT_PRICING_LABELS[campaignType];
  const appointmentLine = appointmentRate === undefined ? [] : [{
    id: campaignType === 'client_account' ? 'client-account-base' : 'qualified-appointment-base',
    label: baseLineLabel ?? getQuoteBaseLineLabel(campaignType),
    description: appointmentDescription ?? unitPricing.defaultDescription,
    mode: 'ponctuel' as const,
    included: false,
    amount: appointmentRate,
    amount_kind: 'currency' as const,
  }];
  const clauseLines = customClauses
    .filter((clause) => clause.label.trim() && (clause.amount !== undefined || clause.included))
    .map((clause) => ({
      id: clause.id,
      label: clause.label.trim(),
      description: clause.description?.trim() || 'Clause tarifaire personnalisée.',
      mode: 'ponctuel' as const,
      included: clause.included,
      ...(clause.offered ? { offered: true } : {}),
      amount: clause.included ? 0 : clause.amount ?? 0,
      amount_kind: 'currency' as const,
    }));

  return [...appointmentLine, ...clauseLines];
};

export const buildProjectQuotePricingLines = (
  sections: QuoteProjectSection[],
): QuotePdfPayload['lines'] => sections.flatMap((section) => section.lines
  .filter((line) => line.label.trim() && (line.included || line.amount !== undefined))
  .map((line) => ({
    id: line.id,
    label: line.label.trim(),
    description: line.description.trim(),
    mode: 'ponctuel' as const,
    included: line.included,
    ...(line.offered ? { offered: true } : {}),
    amount: line.included ? 0 : line.amount ?? 0,
    amount_kind: 'currency' as const,
  })));

export const buildProjectQuoteSections = (
  sections: QuoteProjectSection[],
): NonNullable<QuotePdfPayload['project_sections']> => sections
  .map((section) => ({
    id: section.id,
    title: section.title.trim(),
    lines: section.lines
      .filter((line) => line.label.trim() && (line.included || line.amount !== undefined))
      .map((line) => ({
        id: line.id,
        label: line.label.trim(),
        description: line.description.trim(),
        included: line.included,
        ...(line.offered ? { offered: true } : {}),
        amount: line.included ? 0 : line.amount ?? 0,
      })),
  }))
  .filter((section) => section.title && section.lines.length > 0);

export const getProjectQuoteTotals = (sections: QuoteProjectSection[]): { ht: number; ttc: number } => {
  const ht = sections.flatMap((section) => section.lines)
    .filter((line) => !line.included)
    .reduce((total, line) => total + (line.amount ?? 0), 0);

  return { ht, ttc: ht * 1.2 };
};

export const getQuoteChecklistProgress = (
  form: QuoteFormState,
  quoteLineCount: number,
): { completed: number; total: number; percent: number } => {
  const checklist = [
    form.companyName.trim(),
    form.contactName.trim(),
    form.needSummary.trim(),
    form.objective.trim(),
    quoteLineCount > 0,
  ];
  const completed = checklist.filter(Boolean).length;
  const total = checklist.length;
  return { completed, total, percent: Math.round((completed / total) * 100) };
};

export const toggleQuoteTemplateId = (selectedIds: string[], templateId: string): string[] => (
  selectedIds.includes(templateId)
    ? selectedIds.filter((selectedId) => selectedId !== templateId)
    : [...selectedIds, templateId]
);
