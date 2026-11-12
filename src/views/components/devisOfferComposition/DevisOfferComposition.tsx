import { useId, type ReactElement } from 'react';
import { MdAdd, MdClose, MdFactCheck } from 'react-icons/md';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';
import { QUOTE_CAMPAIGN_TYPE_LABELS, QUOTE_UNIT_PRICING_LABELS } from '../../../utils/scripts/index.ts';
import { devisSelectStyles } from '../../../utils/styles/index.ts';
import type {
  QuoteCampaignType,
  QuoteCustomClause,
  QuoteProjectLine,
  QuoteProjectSection,
  QuoteThirdPartyService,
} from '../../../utils/types/index.ts';
import { Button } from '../button/index.ts';
import { DevisSectionHeading } from '../devisSectionHeading/index.ts';

interface DevisOfferCompositionProps {
  conquestSectionTitle: string;
  conquestBaseLineLabel: string;
  commercialCommissionDescription: string;
  conquestLineCount: number;
  onConquestSectionTitleChange: (title: string) => void;
  onConquestLineLabelChange: (label: string) => void;
  onCommercialCommissionDescriptionChange: (description: string) => void;
  appointmentRate: number | undefined;
  appointmentDescription: string;
  campaignType: QuoteCampaignType;
  commercialCommissionRate: number | undefined;
  customClauses: QuoteCustomClause[];
  isProjectQuote: boolean;
  panelNumber: number;
  projectSections: QuoteProjectSection[];
  thirdPartyServices: QuoteThirdPartyService[];
  onAddCustomClause: () => void;
  onAddProjectLine: (sectionId: string) => void;
  onAddProjectSection: () => void;
  onAddThirdPartyService: () => void;
  onAppointmentRateChange: (amount: number | undefined) => void;
  onAppointmentDescriptionChange: (description: string) => void;
  onCampaignTypeChange: (campaignType: QuoteCampaignType) => void;
  onCommercialCommissionRateChange: (rate: number | undefined) => void;
  onRemoveCustomClause: (clauseId: string) => void;
  onRemoveProjectLine: (sectionId: string, lineId: string) => void;
  onRemoveThirdPartyService: (serviceId: string) => void;
  onUpdateCustomClause: (clauseId: string, changes: Partial<Omit<QuoteCustomClause, 'id'>>) => void;
  onUpdateProjectLine: (sectionId: string, lineId: string, changes: Partial<Omit<QuoteProjectLine, 'id'>>) => void;
  onUpdateProjectSectionTitle: (sectionId: string, title: string) => void;
  onUpdateThirdPartyService: <Field extends keyof Omit<QuoteThirdPartyService, 'id'>>(
    serviceId: string,
    field: Field,
    value: QuoteThirdPartyService[Field],
  ) => void;
}

type CampaignTypeOption = {
  label: string;
  value: QuoteCampaignType;
};

const campaignTypeOptions: CampaignTypeOption[] = Object.entries(QUOTE_CAMPAIGN_TYPE_LABELS).map(([value, label]) => ({
  value: value as QuoteCampaignType,
  label,
}));

const getOptionalAmount = (value: string): number | undefined => (value === '' ? undefined : Number(value));

const pricingOptions = [
  { label: 'Tarifé', included: false, offered: false },
  { label: 'Inclus', included: true, offered: false },
  { label: 'Offert', included: true, offered: true },
] as const;

type FreePricing = Pick<QuoteProjectLine, 'included' | 'offered'>;

function QuotePricingOptions({ included, offered, onChange }: FreePricing & {
  onChange: (pricing: FreePricing) => void;
}): ReactElement {
  const name = useId();

  return (
    <fieldset className="devisView__pricing-options" aria-label="Tarification">
      {pricingOptions.map((option) => (
        <label key={option.label}>
          <input
            type="radio"
            name={name}
            checked={included === option.included && Boolean(offered) === option.offered}
            onChange={() => onChange({ included: option.included, offered: option.offered })}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function DevisOfferComposition({
  conquestSectionTitle,
  conquestBaseLineLabel,
  commercialCommissionDescription,
  conquestLineCount,
  onConquestSectionTitleChange,
  onConquestLineLabelChange,
  onCommercialCommissionDescriptionChange,
  appointmentRate,
  appointmentDescription,
  campaignType,
  commercialCommissionRate,
  customClauses,
  isProjectQuote,
  panelNumber,
  projectSections,
  thirdPartyServices,
  onAddCustomClause,
  onAddProjectLine,
  onAddProjectSection,
  onAddThirdPartyService,
  onAppointmentRateChange,
  onAppointmentDescriptionChange,
  onCampaignTypeChange,
  onCommercialCommissionRateChange,
  onRemoveCustomClause,
  onRemoveProjectLine,
  onRemoveThirdPartyService,
  onUpdateCustomClause,
  onUpdateProjectLine,
  onUpdateProjectSectionTitle,
  onUpdateThirdPartyService,
}: DevisOfferCompositionProps): ReactElement {
  const unitPricing = QUOTE_UNIT_PRICING_LABELS[campaignType === 'client_account' ? 'client_account' : 'qualified_appointment'];

  if (isProjectQuote) {
    return (
      <article className="devisView__panel">
        <div className="devisView__panel-header">
          <MdFactCheck />
          <div>
            <h2>{panelNumber}. Composition du projet</h2>
            <p>Chiffrez chaque brique du projet. Les lignes renseignées seront reprises dans le devis détaillé.</p>
          </div>
        </div>

        <div className="devisView__project-sections">
          <p className="devisView__project-description-help">Dans chaque description, une ligne correspond à une puce dans le devis.</p>
          {projectSections.map((section) => (
            <section key={section.id} className="devisView__project-section">
              <DevisSectionHeading label="Intitulé de la phase" value={section.title}
                lineCount={section.lines.filter((line) => line.included || line.amount !== undefined).length}
                onChange={(title) => onUpdateProjectSectionTitle(section.id, title)} />

              <div className="devisView__project-lines">
                {section.lines.map((line) => (
                  <article key={line.id} className={`devisView__project-line ${line.included || line.amount !== undefined ? 'is-active' : ''}`}>
                    <div className="devisView__project-line-content">
                      <input
                        aria-label="Intitulé de la prestation"
                        placeholder={line.labelPlaceholder || 'Intitulé de la prestation'}
                        value={line.label}
                        onChange={(event) => onUpdateProjectLine(section.id, line.id, { label: event.target.value })}
                      />
                      <textarea
                        aria-label="Description de la prestation"
                        placeholder={line.descriptionPlaceholder || 'Description, livrables et périmètre'}
                        value={line.description}
                        onChange={(event) => onUpdateProjectLine(section.id, line.id, { description: event.target.value })}
                      />
                    </div>
                    <div className="devisView__project-line-controls">
                      <label>
                        <span>Montant HT</span>
                        <div>
                          <input
                            disabled={line.included}
                            min="0"
                            step="1"
                            type="number"
                            value={line.amount ?? ''}
                            onChange={(event) => onUpdateProjectLine(section.id, line.id, { amount: getOptionalAmount(event.target.value) })}
                          />
                          <small>€</small>
                        </div>
                      </label>
                      <QuotePricingOptions
                        included={line.included}
                        offered={line.offered}
                        onChange={(pricing) => onUpdateProjectLine(section.id, line.id, pricing)}
                      />
                      {line.isCustom && (
                        <button type="button" aria-label="Supprimer la prestation" onClick={() => onRemoveProjectLine(section.id, line.id)}>
                          <MdClose />
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <Button style="seaGreen" className="devisView__add-clause devisView__add-action" onClick={() => onAddProjectLine(section.id)}>
                <MdAdd />
                <span>Ajouter une prestation</span>
              </Button>
            </section>
          ))}
        </div>

        <div className="devisView__third-party-services">
          <strong>Services & abonnements tiers à la charge du client</strong>
          <span>Ils seront listés après le périmètre détaillé, avant le récapitulatif financier.</span>
          <div className="devisView__third-party-editor">
            {thirdPartyServices.map((service) => (
              <div key={service.id}>
                <input
                  aria-label="Nom du service tiers"
                  placeholder="Service tiers"
                  value={service.label}
                  onChange={(event) => onUpdateThirdPartyService(service.id, 'label', event.target.value)}
                />
                <input
                  aria-label="Description du service tiers"
                  placeholder="Description et prise en charge"
                  value={service.description}
                  onChange={(event) => onUpdateThirdPartyService(service.id, 'description', event.target.value)}
                />
                <button type="button" aria-label="Supprimer le service tiers" onClick={() => onRemoveThirdPartyService(service.id)}>
                  <MdClose />
                </button>
              </div>
            ))}
          </div>
          <Button style="seaGreen" className="devisView__add-clause devisView__add-action" onClick={onAddThirdPartyService}>
            <MdAdd />
            <span>Ajouter un service tiers</span>
          </Button>
        </div>
        <div className="devisView__section-actions devisView__section-actions--phase">
          <p>Structurez une autre partie de l’offre avec une nouvelle phase.</p>
          <Button style="seaGreen" className="devisView__add-action" onClick={onAddProjectSection}>
            <MdAdd aria-hidden="true" /><span>Ajouter une phase</span>
          </Button>
        </div>
      </article>
    );
  }

  return (
    <article className="devisView__panel">
      <div className="devisView__panel-header">
        <MdFactCheck />
        <div>
          <h2>{panelNumber}. Composition de l’offre</h2>
          <p>Définissez le modèle de rémunération adapté à la campagne.</p>
        </div>
      </div>

      <section className="devisView__project-section">
      <DevisSectionHeading label="Intitulé du bloc de prestations" value={conquestSectionTitle}
        lineCount={conquestLineCount} onChange={onConquestSectionTitleChange} />
      <p className="devisView__project-description-help">Le titre est libre. Seul un intitulé saisi sera repris dans le document.</p>
      <label className="devisView__field">
        <span>Intitulé de la prestation</span>
        <input aria-label="Intitulé de la prestation tarifée" maxLength={255} value={conquestBaseLineLabel}
          onChange={(event) => onConquestLineLabelChange(event.target.value)} />
      </label>
      <label className="devisView__field devisView__campaign-type">
        <span>Type de campagne</span>
        <Select<CampaignTypeOption, false>
          className="react-select-container"
          classNamePrefix="react-select"
          isSearchable={false}
          menuPlacement="top"
          menuPortalTarget={document.body}
          menuPosition="fixed"
          options={campaignTypeOptions}
          styles={devisSelectStyles as StylesConfig<CampaignTypeOption, false>}
          value={campaignTypeOptions.find((option) => option.value === campaignType) ?? null}
          onChange={(option) => option && onCampaignTypeChange(option.value)}
        />
      </label>

      {campaignType === 'commercial' ? (
        <div className="devisView__pricing-model">
          <div className="devisView__section-title">
            <strong>Commission commerciale</strong>
            <span>Le pourcentage est appliqué au montant HT de chaque vente conclue.</span>
          </div>
          <label className="devisView__pricing-line">
            <span>Commission par vente</span>
            <div>
              <input
                min="0"
                max="100"
                step="0.01"
                type="number"
                value={commercialCommissionRate ?? ''}
                onChange={(event) => onCommercialCommissionRateChange(getOptionalAmount(event.target.value))}
              />
              <small>%</small>
            </div>
          </label>
          <label className="devisView__field devisView__appointment-description">
            <span>Description de la prestation</span>
            <textarea aria-label="Description de la commission" rows={3} maxLength={2000} value={commercialCommissionDescription}
              onChange={(event) => onCommercialCommissionDescriptionChange(event.target.value)} />
          </label>
        </div>
      ) : (
        <div className="devisView__pricing-model">
          <div className="devisView__section-title">
            <strong>{unitPricing.title}</strong>
            <span>Définissez le tarif unitaire, puis ajoutez les conditions particulières nécessaires.</span>
          </div>
          <label className="devisView__pricing-line">
            <span>{unitPricing.label}</span>
            <div>
              <input
                min="0"
                step="1"
                type="number"
                value={appointmentRate ?? ''}
                onChange={(event) => onAppointmentRateChange(getOptionalAmount(event.target.value))}
              />
              <small>€ HT</small>
            </div>
          </label>
          <label className="devisView__field devisView__appointment-description">
            <span>Description</span>
            <textarea
              aria-label={unitPricing.descriptionLabel}
              rows={3}
              maxLength={2000}
              value={appointmentDescription}
              onChange={(event) => onAppointmentDescriptionChange(event.target.value)}
            />
          </label>

          <div className="devisView__custom-clauses">
            {customClauses.map((clause) => (
              <div key={clause.id} className={`devisView__custom-clause ${clause.included || clause.amount !== undefined ? 'is-active' : ''}`}>
                <input
                  aria-label="Intitulé de la clause"
                  placeholder="Clause tarifaire"
                  value={clause.label}
                  onChange={(event) => onUpdateCustomClause(clause.id, { label: event.target.value })}
                />
                <textarea
                  className="devisView__clause-description"
                  aria-label="Description de la clause"
                  placeholder="Description, livrables et conditions particulières"
                  rows={2}
                  maxLength={2000}
                  value={clause.description ?? ''}
                  onChange={(event) => onUpdateCustomClause(clause.id, { description: event.target.value })}
                />
                <input
                  aria-label="Montant de la clause"
                  disabled={clause.included}
                  min="0"
                  step="1"
                  type="number"
                  value={clause.amount ?? ''}
                  onChange={(event) => onUpdateCustomClause(clause.id, { amount: getOptionalAmount(event.target.value) })}
                />
                <QuotePricingOptions
                  included={clause.included}
                  offered={clause.offered}
                  onChange={(pricing) => onUpdateCustomClause(clause.id, pricing)}
                />
                <button type="button" aria-label="Supprimer la clause" onClick={() => onRemoveCustomClause(clause.id)}>
                  <MdClose />
                </button>
              </div>
            ))}
          </div>

          <Button style="seaGreen" className="devisView__add-clause devisView__add-action" onClick={onAddCustomClause}>
            <MdAdd />
            <span>Ajouter une clause</span>
          </Button>
        </div>
      )}
      </section>
    </article>
  );
}
