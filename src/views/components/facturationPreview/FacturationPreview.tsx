import type { ReactElement } from 'react';
import { MdOutlineInsights } from 'react-icons/md';

import type { FacturationState } from '../../../hooks/index.ts';
import {
  formatBillingCurrency,
  formatBillingDate,
  formatBillingDateTime,
  leadBillingProspectLabel,
  venteBillingDateLabel,
  venteBillingProspectLabel,
} from '../../../utils/scripts/index.ts';
import { STATUT_VENTE_LABELS } from '../../../utils/types/index.ts';
import { Loader } from '../index.ts';

interface FacturationPreviewProps {
  state: FacturationState;
}

export function FacturationPreview({ state }: FacturationPreviewProps): ReactElement {
  const { preview } = state;
  let content: ReactElement;
  if (state.isManualAccountBilling) content = (
    <div className="facturationView__kpis">
      <div className="facturationView__kpi"><span>Comptes clients à réaliser</span><strong>{state.accountQuantity ?? '—'}</strong></div>
      <div className="facturationView__kpi"><span>Tarif HT par compte</span><strong>{state.clientAccountUnitPriceHt === null ? 'Non renseigné' : formatBillingCurrency(state.clientAccountUnitPriceHt)}</strong></div>
      <div className="facturationView__kpi"><span>Montant facturé</span><strong>{formatBillingCurrency(state.previewTotals.totalHt)} HT<br />{formatBillingCurrency(state.previewTotals.totalTtc)} TTC</strong></div>
    </div>
  );
  else if (state.previewLoading) content = <Loader />;
  else if (!preview) content = <div className="facturationView__empty facturationView__empty--inline">Aucun aperçu disponible pour cette période.</div>;
  else if (preview.source === 'ventes') {
    const visibleRows = state.isClientAccountCampaign ? state.accountRows : preview.rows;
    content = (
      <>
        <div className="facturationView__warning facturationView__warning--spaced-bottom"><strong>{state.isClientAccountCampaign ? 'Facturation par compte client :' : 'Facturation des ventes :'}</strong> seuls les dossiers validés sur la période sont retenus.</div>
        <div className="facturationView__kpis">
          <div className="facturationView__kpi"><span>{state.isClientAccountCampaign ? 'Comptes clients validés' : 'Commandes validées'}</span><strong>{state.isClientAccountCampaign ? state.availableAccountCount : preview.rows.length}</strong></div>
          {state.isClientAccountCampaign ? <div className="facturationView__kpi"><span>Tarif HT par compte</span><strong>{state.clientAccountUnitPriceHt === null ? 'Non renseigné' : formatBillingCurrency(state.clientAccountUnitPriceHt)}</strong></div> : <>
          <div className="facturationView__kpi"><span>Assiette des ventes</span><strong>{formatBillingCurrency(state.previewTotals.assietteHt)} HT</strong></div>
          <div className="facturationView__kpi"><span>Taux de commission</span><strong>{state.selectedCampagne?.taux_commission_facturation && state.selectedCampagne.taux_commission_facturation > 0 ? state.selectedCampagne.taux_commission_facturation : 100} %</strong></div></>}
          <div className="facturationView__kpi"><span>Montant facturé</span><strong>{formatBillingCurrency(state.previewTotals.totalHt)} HT<br />{formatBillingCurrency(state.previewTotals.totalTtc)} TTC</strong></div>
          <div className="facturationView__kpi"><span>Période de validation</span><strong>{formatBillingDate(state.resolvedPeriod.start)} → {formatBillingDate(state.resolvedPeriod.end)}</strong></div>
          <div className="facturationView__kpi"><span>TVA appliquée</span><strong>{(state.billingSettings.vatRate * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %</strong></div>
        </div>
        <div className="facturationView__table-wrapper">
          <table><thead><tr><th>Référence</th><th>Client</th><th>Date validation</th><th>Date création</th><th>Montant</th><th>Statut</th></tr></thead>
            <tbody>{visibleRows.length === 0 ? <tr><td colSpan={6} className="facturationView__table-empty">{state.isClientAccountCampaign && state.availableAccountCount > 0 ? 'Saisissez une quantité valide pour afficher les dossiers facturés.' : 'Aucune commande validée sur la période.'}</td></tr> : visibleRows.map((vente) => {
              const amounts = state.getVenteAmounts(vente);
              return <tr key={vente.id_vente}><td>{vente.reference_doc ?? `#${vente.id_vente}`}</td><td>{venteBillingProspectLabel(vente)}</td><td>{venteBillingDateLabel(vente)}</td><td>{formatBillingDateTime(vente.date_vente)}</td><td>{!state.isClientAccountCampaign && <>Assiette : {formatBillingCurrency(amounts.assietteHt)} HT<br /></>}Facturé : {formatBillingCurrency(amounts.totalHt)} HT<br />{formatBillingCurrency(amounts.totalTtc)} TTC</td><td>{STATUT_VENTE_LABELS[vente.statut_vente]}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </>
    );
  } else {
    const { leadBillingSummary } = state;
    content = (
      <>
        <div className="facturationView__warning facturationView__warning--spaced-bottom"><strong>Règle de facturation {leadBillingSummary.campaignName} :</strong> seuls les rendez-vous au statut effectué, dont la date de passage au statut effectué est comprise dans la période, sont retenus.</div>
        <div className="facturationView__kpis">
          <div className="facturationView__kpi"><span>Rendez-vous facturables</span><strong>{preview.rows.length}</strong></div>
          {leadBillingSummary.usesEmployeeCountPricing ? <>
            <div className="facturationView__kpi"><span>Entreprises de 5 salariés ou moins</span><strong>{leadBillingSummary.smallCompanyCount} × {leadBillingSummary.defaultPriceHt} € HT</strong></div>
            <div className="facturationView__kpi"><span>Entreprises de plus de 5 salariés</span><strong>{leadBillingSummary.largeCompanyCount} × {leadBillingSummary.largeCompanyPriceHt} € HT</strong></div>
          </> : <div className="facturationView__kpi"><span>Tarif par rendez-vous effectué</span><strong>{leadBillingSummary.defaultPriceHt} € HT</strong></div>}
          <div className="facturationView__kpi"><span>CA facturable</span><strong>{formatBillingCurrency(state.previewTotals.totalHt)} HT<br />{formatBillingCurrency(state.previewTotals.totalTtc)} TTC</strong></div>
        </div>
        <div className="facturationView__table-wrapper">
          <table><thead><tr><th>Lead</th><th>Client</th><th>Date effectuée</th>{leadBillingSummary.usesEmployeeCountPricing && <th>Catégorie</th>}<th>Montant</th></tr></thead>
            <tbody>{preview.rows.length === 0 ? <tr><td colSpan={leadBillingSummary.usesEmployeeCountPricing ? 5 : 4} className="facturationView__table-empty">Aucun rendez-vous effectué sur la période.</td></tr> : preview.rows.map((lead) => {
              const amounts = state.getLeadAmounts(lead);
              return <tr key={lead.id_lead}><td>Lead #{lead.id_lead}</td><td>{leadBillingProspectLabel(lead)}</td><td>{formatBillingDateTime(lead.date_effectue)}</td>{leadBillingSummary.usesEmployeeCountPricing && <td>{lead.entreprise_plus_de_cinq_salaries ? 'Plus de 5 salariés' : '5 salariés ou moins'}</td>}<td>{formatBillingCurrency(amounts.totalHt)} HT<br />{formatBillingCurrency(amounts.totalTtc)} TTC</td></tr>;
            })}</tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <section className="facturationView__panel">
      <div className="facturationView__panel-header"><MdOutlineInsights /><div><h2>Aperçu de période</h2><p>Lecture directe des éléments facturables sur la période sélectionnée.</p></div></div>
      {state.previewError && <div className="facturationView__error facturationView__error--inline">{state.previewError}</div>}
      {state.isClientAccountCampaign && (
        <div className="facturationView__kpis">
          <label className="facturationView__kpi">
            <span>Mode de facturation des comptes clients</span>
            <select value={state.accountBillingMode} disabled={state.accountSelectionLocked}
              onChange={(event) => state.setAccountBillingMode(event.target.value === 'manual' ? 'manual' : 'validated')}>
              <option value="validated">Comptes validés dans USV</option>
              <option value="manual">Quantité manuelle · comptes à réaliser</option>
            </select>
          </label>
          <label className="facturationView__kpi">
            <span>Nombre de comptes clients à facturer</span>
            <input type="number" min={1} max={state.accountQuantityLimit || undefined} step={1} value={state.accountCountValue}
              disabled={state.accountSelectionLocked || state.accountQuantityLimit === 0}
              aria-invalid={state.accountCountValue !== '' && state.accountQuantity === undefined}
              onChange={(event) => state.setAccountCountValue(event.target.value)} />
            <small>{state.issuedAccountQuantity !== null ? 'Quantité conservée pour cette facture.'
              : state.isManualAccountBilling ? 'Saisissez la quantité vendue de comptes à réaliser.'
                : state.availableAccountCount > 0 ? `De 1 à ${state.availableAccountCount}. Les dossiers les plus anciens sont retenus en premier.`
                  : 'Aucun dossier validé sur la période.'}</small>
          </label>
        </div>
      )}
      {preview?.is_reissue && <p className="facturationView__warning">Facture déjà émise : réédition du document original, avec ses lignes et ajustements conservés.</p>}
      {preview?.is_locked && !preview.is_reissue && <p className="facturationView__warning">Émission à reprendre : les éléments et ajustements sont conservés pour cette facture.</p>}
      {Boolean(preview?.excluded_count) && <p className="facturationView__warning">{preview?.excluded_count} élément(s) déjà facturé(s) ou réservé(s) exclus de cette nouvelle facture.</p>}
      {content}
    </section>
  );
}
