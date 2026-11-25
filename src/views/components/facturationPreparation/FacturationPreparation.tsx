import type { ReactElement } from 'react';
import { MdOutlineInsights } from 'react-icons/md';

import type { FacturationState } from '../../../hooks/index.ts';
import { formatBillingCurrency, formatBillingDate } from '../../../utils/scripts/index.ts';
import { Button } from '../index.ts';

interface FacturationPreparationProps {
  state: FacturationState;
}

export function FacturationPreparation({ state }: FacturationPreparationProps): ReactElement {
  return (
    <article className="facturationView__panel">
      <div className="facturationView__panel-header"><MdOutlineInsights /><div><h2>Préparation de facture</h2><p>Zone prête pour brancher les règles de calcul, la numérotation et l’export.</p></div></div>
      <div className="facturationView__todo">
        <div><span>Campagne ciblée</span><strong>{state.selectedCampagne?.nom_campagne ?? '—'}</strong></div>
        <div><span>Période retenue</span><strong>{formatBillingDate(state.resolvedPeriod.start)} → {formatBillingDate(state.resolvedPeriod.end)}</strong></div>
        <div><span>Facturé à</span><strong>{state.resolvedBillingProfile?.fields.find((field) => field.label === 'Société facturée')?.value ?? '—'}</strong></div>
        <div><span>Source identité</span><strong>{state.resolvedBillingProfile?.sourceLabel ?? '—'}</strong></div>
        <div><span>Statut VosFactures</span><strong>{state.isLoadingPaInvoice ? 'Chargement...' : state.paInvoice ? (state.paInvoice.invoice_number || state.paInvoice.internal_reference) : 'Non émise'}</strong></div>
        <div><span>Document test VosFactures</span><strong>{state.testPaInvoice ? (state.testPaInvoice.invoice_number || state.testPaInvoice.internal_reference) : 'Aucun test effectué'}</strong></div>
        <div><span>N° réel prévu</span><strong>{state.testPaInvoice?.expected_invoice_number || 'Calculé lors du test ou de l’émission'}</strong></div>
      </div>
      <section className="facturationView__adjustments" aria-label="Ajustements de facture">
        <h3>Ajustements de facture</h3>
        <p>Ajouts et déductions HT. Chaque pourcentage porte sur le sous-total HT initial de {formatBillingCurrency(state.baseTotals.totalHt)}, sans cumul entre les lignes.</p>
        {state.adjustments.map((row, index) => (
          <fieldset key={index} disabled={state.adjustmentsLocked}>
            <legend>Ajustement {index + 1}</legend>
            <label>Libellé<input aria-label={`Libellé ${index + 1}`} maxLength={200} value={row.label} onChange={(event) => state.updateAdjustment(index, { label: event.target.value })} /></label>
            <label>Commentaire<textarea aria-label={`Commentaire ${index + 1}`} maxLength={2000} value={row.comment} onChange={(event) => state.updateAdjustment(index, { comment: event.target.value })} /></label>
            <div className="facturationView__adjustment-fields">
              <label>Sens<select aria-label={`Sens ${index + 1}`} value={row.direction} onChange={(event) => state.updateAdjustment(index, { direction: event.target.value === 'deduction' ? 'deduction' : 'addition' })}><option value="addition">Ajouter (+)</option><option value="deduction">Retirer (-)</option></select></label>
              <label>Unité<select aria-label={`Unité ${index + 1}`} value={row.unit} onChange={(event) => state.updateAdjustment(index, { unit: event.target.value === 'percent' ? 'percent' : 'euro' })}><option value="euro">Euros HT</option><option value="percent">Pourcentage</option></select></label>
              <label>Valeur<input aria-label={`Valeur ${index + 1}`} type="number" min="0.01" step="0.01" value={row.value || ''} onChange={(event) => state.updateAdjustment(index, { value: Number(event.target.value) })} /></label>
              <label>TVA<select aria-label={`TVA ${index + 1}`} value={row.vat} onChange={(event) => state.updateAdjustment(index, { vat: event.target.value === 'none' ? 'none' : 'campaign' })}><option value="campaign">TVA campagne</option><option value="none">Hors champ TVA</option></select></label>
            </div>
            <p>Montant HT : <strong>{formatBillingCurrency(state.adjustmentPreview.lines[index]?.totalHt ?? 0)}</strong></p>
            <Button style="grey" onClick={() => state.removeAdjustment(index)} disabled={state.adjustmentsLocked}>Supprimer l’ajustement {index + 1}</Button>
          </fieldset>
        ))}
        <Button style="seaGreen" onClick={state.addAdjustment} disabled={state.adjustmentsLocked || state.adjustments.length >= 50}>Ajouter un ajustement</Button>
        {state.adjustmentPreview.error && <p role="alert">{state.adjustmentPreview.error}</p>}
        <p>Total final : <strong>{formatBillingCurrency(state.previewTotals.totalHt)} HT / {formatBillingCurrency(state.previewTotals.totalTtc)} TTC</strong></p>
        {(state.paInvoice?.provider_invoice_id || state.paInvoice?.source_claimed) && <p>Les ajustements sont conservés pour cette facture.</p>}
      </section>
      <div className="facturationView__placeholder">
        <p>Le PDF s’appuie sur la campagne active, le type de campagne et la période affichée. L’export Factur-X bêta conserve le rendu ANTL et embarque les données structurées de la facture; il reste à valider avant toute émission réglementaire. Le document test VosFactures utilise obligatoirement une numérotation isolée avec le suffixe <code>_TEST</code>; l’émission réelle applique la nomenclature campagne.</p>
        <div className="facturationView__placeholder-actions">
          <Button style={state.canTestInvoiceThroughPa ? 'seaGreen' : 'grey'} onClick={() => { void state.testInvoiceThroughPa(); }} disabled={!state.canTestInvoiceThroughPa}>{state.isTestingPaInvoice ? 'Test...' : 'Créer un document test'}</Button>
          <Button style={state.canIssueInvoiceThroughPa ? 'gradient' : 'grey'} onClick={() => { void state.issueInvoiceThroughPa(); }} disabled={!state.canIssueInvoiceThroughPa}>{state.isIssuingPaInvoice ? 'Émission...' : state.paInvoice?.provider_invoice_id ? 'Facture réelle émise' : state.paInvoice?.source_claimed ? 'Reprendre l’émission' : 'Émettre la facture réelle'}</Button>
          <Button style={state.canGenerateInvoice ? 'seaGreen' : 'grey'} onClick={() => { void state.generateFacturX(); }} disabled={!state.canGenerateInvoice || state.isGeneratingFacturX}>{state.isGeneratingFacturX ? 'Génération...' : 'Télécharger la facture (pdf format Factur-X)'}</Button>
          {state.isSwissLifeCampaign && (
            <Button style={state.canGenerateInvoice ? 'seaGreen' : 'grey'} onClick={() => { void state.generateFacturXLot10Rdv(); }} disabled={!state.canGenerateInvoice || state.isGeneratingFacturX}>
              Lot(s) de 10 rendez-vous qualifiés
            </Button>
          )}
          <Button style={state.canGenerateInvoice ? 'seaGreen' : 'grey'} onClick={state.openEmailModal} disabled={!state.canGenerateInvoice}>Envoyer la facture par email</Button>
        </div>
      </div>
    </article>
  );
}
