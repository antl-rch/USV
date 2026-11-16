import type { ReactElement } from 'react';
import { IoCloudUpload, IoTrash } from 'react-icons/io5';
import Select from 'react-select';

import type { CampagneFormViewModel } from '../../../hooks/index.ts';
import { CAMPAIGN_VARIANT_OPTIONS, LEAD_BOOKING_WEEKDAY_OPTIONS, getCampagneLogoUrl } from '../../../utils/scripts/index.ts';
import { Button } from '../index.ts';

interface CampagneGeneralFieldsProps {
  viewModel: CampagneFormViewModel;
}

export function CampagneGeneralFields({ viewModel }: CampagneGeneralFieldsProps): ReactElement {
  const {
    form,
    existing,
    isLeadCampaign,
    isCreantlCampaign,
    handleChange,
    handleVariantChange,
    handleDeleteLogo,
    handleLeadBookingWeekdayChange,
    leadSchedule,
    handleOpenLogoModal,
  } = viewModel.campaignForm;
  return (
    <>
      <div className="campagneForm__row">
        <label>Nom de la campagne *<input name="nom_campagne" value={form.nom_campagne} onChange={handleChange} required placeholder="Ex : Campagne fenêtres PVC 2026" /></label>
        <label htmlFor="campagne-variant">Variante du script *
          <Select
            inputId="campagne-variant"
            name="type_campagne"
            className="campagneForm__select"
            classNamePrefix="reactSelect"
            options={CAMPAIGN_VARIANT_OPTIONS}
            value={CAMPAIGN_VARIANT_OPTIONS.find((option) => option.value === form.type_campagne)}
            onChange={(option) => { if (option) handleVariantChange(option.value); }}
            isSearchable={false}
            required
          />
          <span className="campagneForm__hint">Ce réglage pilote le rendu fonctionnel du script vendeur pour cette campagne.</span>
        </label>
      </div>
      <div className="campagneForm__row">
        <label>Date de début *<input type="date" name="date_debut" value={form.date_debut} onChange={handleChange} required /></label>
        <label>Date de fin<input type="date" name="date_fin" value={form.date_fin} onChange={handleChange} /></label>
      </div>
      <div className="campagneForm__row"><label>Budget (€)<input type="number" name="budget" value={form.budget} onChange={handleChange} min="0" step="0.01" placeholder="0.00" /></label></div>
      <div className="campagneForm__row">
        <label>Code postal du centre de prospection
          <input
            type="text"
            name="code_postal_centre_prospection"
            value={form.code_postal_centre_prospection}
            onChange={handleChange}
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="Ex : 17000"
          />
          <span className="campagneForm__hint">Épicentre du tri géographique. Vide : utilisation du code postal de la maison mère.</span>
        </label>
      </div>
      <div className="campagneForm__row">
        <label className="campagneForm__checkbox-label"><input type="checkbox" name="autoriser_mobile" checked={form.autoriser_mobile} onChange={handleChange} /><span>Autoriser les appels sur mobile (06/07)</span></label>
        <span className="campagneForm__hint">{form.autoriser_mobile ? 'Les agents pourront appeler les numéros mobiles' : 'Les agents ne pourront pas appeler les numéros mobiles (verrouillé)'}</span>
      </div>
      {isLeadCampaign && (
        <fieldset className="campagneForm__lead-booking-days">
          <legend>Disponibilités des rendez-vous client</legend>
          <Button style="gradient" type="button" onClick={leadSchedule.open}>Choisir les créneaux ouverts aux rendez-vous</Button>
          <span className="campagneForm__hint">La grille définit les heures de début autorisées pour chaque jour de la semaine.</span>
          {form.lead_booking_weekly_slots == null && <div className="campagneForm__weekday-grid">
            {LEAD_BOOKING_WEEKDAY_OPTIONS.map((option) => (
              <label key={option.value} className="campagneForm__weekday-option">
                <input
                  type="checkbox"
                  checked={form.lead_booking_open_weekdays.includes(option.value)}
                  onChange={(event) => handleLeadBookingWeekdayChange(option.value, event.target.checked)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>}
          <span className="campagneForm__hint">Les autres jours seront désactivés dans le calendrier du script vendeur.</span>
        </fieldset>
      )}
      {isCreantlCampaign && <fieldset>
        <legend>Confirmation des rendez-vous Créantl</legend>
        <label className="campagneForm__checkbox-label"><input type="checkbox" name="creantl_booking_notify_external" checked={form.creantl_booking_notify_external} onChange={handleChange} /><span>Envoyer également la confirmation au prospect</span></label>
        <span className="campagneForm__hint">Désactivé par défaut. L’envoi externe utilise l’email saisi au rendez-vous, dans un message séparé sans les notes ni les copies internes.</span>
      </fieldset>}
      <label className="campagneForm__label-full">Objectifs<textarea name="objectifs" value={form.objectifs} onChange={handleChange} rows={3} placeholder="Décrivez les objectifs de la campagne..." /></label>

      <fieldset className="campagneForm__fieldset campagneForm__fieldset--logo">
        <legend>Logo de la campagne</legend>
        <div className="campagneForm__logo-section">
          {existing?.logo_path && existing.logo_file_name ? (
            <div className="campagneForm__logo-display">
              <div className="campagneForm__logo-preview"><img src={getCampagneLogoUrl(existing.logo_path) || ''} alt={`Logo ${existing.nom_campagne}`} onError={(event) => { event.currentTarget.src = ''; }} /></div>
              <div className="campagneForm__logo-info"><p className="campagneForm__logo-filename">{existing.logo_file_name}</p><div className="campagneForm__logo-actions">
                <Button style="seaGreen" type="button" onClick={handleOpenLogoModal}><IoCloudUpload /> Changer le logo</Button>
                <Button style="red" type="button" onClick={handleDeleteLogo}><IoTrash /> Supprimer</Button>
              </div></div>
            </div>
          ) : (
            <div className="campagneForm__no-logo"><p>Aucun logo n&apos;est configuré pour cette campagne.</p><Button style="gradient" type="button" onClick={handleOpenLogoModal}><IoCloudUpload /> Ajouter un logo</Button></div>
          )}
        </div>
      </fieldset>
    </>
  );
}
