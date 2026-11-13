import type { ReactElement } from 'react';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';
import { devisSelectStyles } from '../../../utils/styles/index.ts';
import { MdAdd, MdDeleteOutline, MdFactCheck } from 'react-icons/md';
import type { QuoteFlexibleService } from '../../../utils/types/index.ts';
import { Button } from '../button/index.ts';
import { DevisSectionHeading } from '../devisSectionHeading/index.ts';

type PricingOption = { value: QuoteFlexibleService['pricing']; label: string };
type AmountKindOption = { value: QuoteFlexibleService['amountKind']; label: string };
type ServiceKindOption = { value: QuoteFlexibleService['kind']; label: string };
const serviceKindOptions: ServiceKindOption[] = [
  { value: 'prestation', label: 'Prestation' },
  { value: 'prime', label: 'Prime' },
];
const pricingOptions: PricingOption[] = [
  { value: 'fixed', label: 'Coût fixe' },
  { value: 'variable', label: 'Prime variable / au résultat' },
];
const currencyOptions: AmountKindOption[] = [{ value: 'currency', label: 'Euros HT (€)' }];
const amountKindOptions: AmountKindOption[] = [...currencyOptions, { value: 'percentage', label: 'Pourcentage (%)' }];

interface DevisFlexibleServicesProps {
  sectionTitle: string;
  lineCount: number;
  onSectionTitleChange: (title: string) => void;
  services: QuoteFlexibleService[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: <Field extends keyof Omit<QuoteFlexibleService, 'id'>>(
    id: string, field: Field, value: QuoteFlexibleService[Field],
  ) => void;
}

export function DevisFlexibleServices({ sectionTitle, lineCount, onSectionTitleChange, services, onAdd, onRemove, onUpdate }: DevisFlexibleServicesProps): ReactElement {
  return <article className="devisView__panel">
    <div className="devisView__panel-header">
      <MdFactCheck />
      <div>
        <h2>2. Prestations libres et primes</h2>
        <p>Composez vos forfaits et vos rémunérations au résultat.</p>
      </div>
    </div>
    <section className="devisView__project-section devisView__flexible-services">
    <DevisSectionHeading label="Intitulé de la section prestations libres" value={sectionTitle} lineCount={lineCount} onChange={onSectionTitleChange} />
    <p className="devisView__project-description-help">Le titre est libre. Seul un intitulé saisi sera repris dans le document.</p>
    <p className="devisView__section-description">Les prestations entrent dans le total fixe. Les primes et tarifs unitaires sont indiqués à part sur le devis.</p>
    {services.map((service) => <fieldset key={service.id} className="devisView__flexible-service">
      <legend>Prestation ou prime</legend>
      <div className="devisView__form-grid">
        <label className="devisView__field"><span>Type de ligne</span>
          <Select<ServiceKindOption, false>
            aria-label="Type de ligne"
            className="react-select-container"
            classNamePrefix="react-select"
            isSearchable={false}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={serviceKindOptions}
            styles={devisSelectStyles as StylesConfig<ServiceKindOption, false>}
            value={serviceKindOptions.find((option) => option.value === service.kind)}
            onChange={(option) => option && onUpdate(service.id, 'kind', option.value)}
          />
        </label>
        <label className="devisView__field"><span>Intitulé</span><input aria-label="Intitulé de la prestation libre" value={service.label}
          onChange={(event) => onUpdate(service.id, 'label', event.target.value)} placeholder="Ex. Action commerciale / Prime par client apporté" /></label>
        <label className="devisView__field"><span>Rémunération</span>
          <Select<PricingOption, false>
            aria-label="Type de rémunération"
            className="react-select-container devisView__service-pricing-select"
            classNamePrefix="react-select"
            isSearchable={false}
            isDisabled={service.kind === 'prestation'}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={pricingOptions}
            styles={devisSelectStyles as StylesConfig<PricingOption, false>}
            value={pricingOptions.find((option) => option.value === service.pricing) ?? null}
            onChange={(option) => option && onUpdate(service.id, 'pricing', option.value)}
          />
        </label>
        <label className="devisView__field"><span>Montant</span><input aria-label="Montant de la prestation libre" type="number" min="0" step="0.01"
          max={service.amountKind === 'percentage' ? 100 : undefined} value={service.amount ?? ''}
          onChange={(event) => onUpdate(service.id, 'amount', event.target.value === '' ? undefined : Number(event.target.value))} /></label>
        <label className="devisView__field"><span>Unité</span>
          <Select<AmountKindOption, false>
            aria-label="Unité de la prestation libre"
            className="react-select-container devisView__service-unit-select"
            classNamePrefix="react-select"
            isSearchable={false}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            options={service.pricing === 'fixed' ? currencyOptions : amountKindOptions}
            styles={devisSelectStyles as StylesConfig<AmountKindOption, false>}
            value={amountKindOptions.find((option) => option.value === service.amountKind) ?? null}
            onChange={(option) => option && onUpdate(service.id, 'amountKind', option.value)}
          />
          {service.kind === 'prime' && service.pricing === 'fixed' && <small className="devisView__project-description-help">Le pourcentage est disponible pour une prime variable.</small>}
        </label>
        <label className="devisView__field devisView__field--full"><span>Description</span><textarea aria-label="Description de la prestation libre" rows={2} value={service.description}
          onChange={(event) => onUpdate(service.id, 'description', event.target.value)} /></label>
        {service.pricing === 'variable' && <label className="devisView__field devisView__field--full"><span>Déclenchement et base de calcul</span><textarea
          aria-label="Déclenchement et base de calcul" rows={2} value={service.condition} placeholder="Ex. Par nouveau client signé ; 5 % du chiffre d’affaires HT de sa première commande."
          onChange={(event) => onUpdate(service.id, 'condition', event.target.value)} /></label>}
      </div>
      <div className="devisView__service-actions">
        <Button style="white" className="devisView__remove-service" onClick={() => onRemove(service.id)}>
          <MdDeleteOutline aria-hidden="true" /><span>{service.kind === 'prime' ? 'Supprimer cette prime' : 'Supprimer cette prestation'}</span>
        </Button>
      </div>
    </fieldset>)}
    <div className="devisView__section-actions">
      <Button style="seaGreen" className="devisView__add-action" onClick={onAdd}>
        <MdAdd aria-hidden="true" /><span>Ajouter une prestation ou une prime</span>
      </Button>
    </div>
    </section>
  </article>;
}
