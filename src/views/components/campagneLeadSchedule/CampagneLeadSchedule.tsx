import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { IoClose } from 'react-icons/io5';
import Select from 'react-select';
import type { CampagneFormViewModel } from '../../../hooks/index.ts';
import { LEAD_BOOKING_WEEKDAY_OPTIONS } from '../../../utils/scripts/index.ts';
import './campagneLeadSchedule.scss';

const INTERVAL_OPTIONS = [
  { value: 15, label: 'Quart d’heure' },
  { value: 30, label: 'Demi-heure' },
  { value: 60, label: 'Heure' },
] as const;

export function CampagneLeadSchedule({ viewModel }: { viewModel: CampagneFormViewModel }): ReactElement {
  const schedule = viewModel.campaignForm.leadSchedule;
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (schedule.isOpen) dialog?.showModal();
    else dialog?.close();
  }, [schedule.isOpen]);
  return (
    <dialog ref={dialogRef} className="lead-schedule" onCancel={schedule.close} aria-labelledby="lead-schedule-title">
      <div className="lead-schedule__header">
        <h2 id="lead-schedule-title">Créneaux ouverts aux rendez-vous</h2>
        <button type="button" onClick={schedule.close} aria-label="Fermer"><IoClose aria-hidden="true" /></button>
      </div>
      <p>Une semaine type : cliquez sur une heure de début pour l’ouvrir ou la fermer. Les créneaux violets sont ouverts.</p>
      <label htmlFor="campagne-lead-schedule-interval">
        Pas de la grille
        <Select
          inputId="campagne-lead-schedule-interval"
          className="campagneForm__select"
          classNamePrefix="reactSelect"
          options={INTERVAL_OPTIONS}
          value={INTERVAL_OPTIONS.find((option) => option.value === schedule.interval)}
          onChange={(option) => { if (option) schedule.setInterval(option.value); }}
          isSearchable={false}
          menuPosition="fixed"
        />
      </label>
      <p>Changer le pas conserve les heures déjà sélectionnées.</p>
      <div className="lead-schedule__scroll">
        <table className="lead-schedule__grid">
          <thead><tr><th scope="col">Heure</th>{LEAD_BOOKING_WEEKDAY_OPTIONS.map((day) => <th scope="col" key={day.value}>{day.label}</th>)}</tr></thead>
          <tbody>{schedule.rows.map((time) => <tr key={time}><th scope="row">{time}</th>{LEAD_BOOKING_WEEKDAY_OPTIONS.map((day) => <td key={day.value}>
            <button type="button" aria-label={`${day.label} ${time}`} aria-pressed={schedule.slots[day.value]?.includes(time) ?? false} onClick={() => schedule.toggleSlot(day.value, time)}>{time}</button>
          </td>)}</tr>)}</tbody>
        </table>
      </div>
      <label className="lead-schedule__manual"><input type="checkbox" checked={schedule.allowManual} onChange={(event) => schedule.setAllowManual(event.target.checked)} /> Autoriser également la saisie libre d’une heure sur les jours ouverts</label>
      <p>La saisie libre conserve le fonctionnement des anciennes campagnes. Désactivez-la pour imposer uniquement la grille. Sans créneau, le jour est fermé.</p>
      <div className="lead-schedule__actions"><button type="button" onClick={schedule.close}>Annuler</button><button type="button" onClick={schedule.confirm}>Appliquer à la campagne</button></div>
      <p className="lead-schedule__save-reminder">Enregistrez ensuite la campagne pour publier cette configuration dans le script.</p>
    </dialog>
  );
}
