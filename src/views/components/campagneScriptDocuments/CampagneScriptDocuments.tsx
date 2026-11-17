import { IoDocumentText, IoMailOutline } from 'react-icons/io5';
import Select from 'react-select';

import { useScriptDocuments } from '../../../hooks/index.ts';
import { Button } from '../button/index.ts';

export default function CampagneScriptDocuments({ campaignId }: { campaignId: number }) {
  const vm = useScriptDocuments(campaignId);
  const { mailbox, draft, loading, saving, feedback } = vm;

  return (
    <section className="campagneForm__documents" aria-labelledby="campagne-script-documents-title">
      <h2 id="campagne-script-documents-title">Documents à envoyer depuis Script</h2>
      {feedback && (
        <p className={feedback.error ? 'campagneForm__error' : 'campagneForm__success'} role={feedback.error ? 'alert' : 'status'}>
          {feedback.text}
        </p>
      )}
      {feedback?.error && vm.loaded && !saving && !loading && (
        <div className="campagneForm__row">
          <Button style="grey" type="button" onClick={vm.reload}>Recharger la configuration</Button>
        </div>
      )}
      {loading ? <p className="campagneForm__loading" role="status">Chargement de la configuration…</p> : vm.loaded ? (
        <>
          <form onSubmit={vm.saveMailbox} className="campagneForm__form">
            <fieldset disabled={saving}>
              <legend><IoMailOutline aria-hidden="true" /> Expéditeur de la campagne</legend>
              <div className="campagneForm__row">
                <label>
                  Nom affiché
                  <input value={mailbox.sender_name} required maxLength={100}
                    onChange={(event) => vm.setMailbox({ ...mailbox, sender_name: event.target.value })} />
                </label>
                <label>
                  Adresse email
                  <input type="email" value={mailbox.sender_email} required maxLength={255}
                    onChange={(event) => vm.setMailbox({ ...mailbox, sender_email: event.target.value })} />
                </label>
              </div>
              <label className="campagneForm__label-full">
                Mot de passe SMTP
                <input type="password" value={vm.password} autoComplete="new-password" maxLength={512}
                  required={!mailbox.has_password} placeholder={mailbox.has_password ? 'Laisser vide pour le conserver' : undefined}
                  onChange={(event) => vm.setPassword(event.target.value)} />
              </label>
              <div className="campagneForm__actions">
                <Button style="gradient" type="submit">Enregistrer l’expéditeur</Button>
              </div>
            </fieldset>
          </form>

          <form onSubmit={vm.saveDocument} className="campagneForm__form">
            <fieldset disabled={saving}>
              <legend><IoDocumentText aria-hidden="true" /> Bouton d’envoi</legend>
              <label className="campagneForm__label-full" htmlFor="campagne-script-document">
                Document à modifier
                <Select
                  inputId="campagne-script-document"
                  className="campagneForm__select"
                  classNamePrefix="reactSelect"
                  options={vm.documentOptions}
                  value={vm.documentOptions.find((option) => option.value === (draft.id ?? ''))}
                  onChange={(option) => { if (option) vm.selectDocument(option.value); }}
                  isDisabled={saving}
                  noOptionsMessage={() => 'Aucun document trouvé'}
                />
              </label>
              <div className="campagneForm__row">
                <label>
                  Libellé dans Script
                  <input value={draft.label} required maxLength={60}
                    onChange={(event) => vm.setDraft({ ...draft, label: event.target.value })} />
                </label>
                <label>
                  Ordre d’affichage
                  <input type="number" min={0} max={999} step={1} required value={draft.position}
                    onChange={(event) => vm.setDraft({ ...draft, position: Number(event.target.value) })} />
                </label>
              </div>
              <label className="campagneForm__label-full">
                Objet du mail
                <input value={draft.subject} required maxLength={180}
                  onChange={(event) => vm.setDraft({ ...draft, subject: event.target.value })} />
              </label>
              <div className="campagneForm__label-full">
                <label>
                  Texte du mail
                  <textarea value={draft.message} required maxLength={8000} rows={5}
                    aria-describedby="campagne-script-document-variables"
                    onChange={(event) => vm.setDraft({ ...draft, message: event.target.value })} />
                </label>
                <p id="campagne-script-document-variables" className="campagneForm__hint">
                  <code>{'{{agent}}'}</code> insère le prénom et le nom du commercial.
                  {' '}<code>{'{{date}}'}</code> insère la date de l’envoi en heure de Paris (date de l’échange pour la plaquette Créantl).
                </p>
              </div>
              <label className="campagneForm__label-full">
                {draft.id ? 'Remplacer le PDF' : 'Fichier PDF'}
                <input key={vm.fileInputVersion} type="file" accept=".pdf,application/pdf" required={!draft.id}
                  aria-describedby={draft.attachment_filename ? 'campagne-script-document-attachment' : undefined}
                  onChange={(event) => vm.setFile(event.target.files?.[0] ?? null)} />
              </label>
              {draft.attachment_filename && (
                <p id="campagne-script-document-attachment" className="campagneForm__hint">
                  {draft.attachment_filename} · Version {draft.revision}
                </p>
              )}
              <label className="campagneForm__checkbox-label">
                <input type="checkbox" checked={draft.enabled}
                  onChange={(event) => vm.setDraft({ ...draft, enabled: event.target.checked })} />
                <span>Afficher le bouton dans Script</span>
              </label>
              <div className="campagneForm__actions">
                <Button style="gradient" type="submit">Enregistrer le bouton</Button>
              </div>
            </fieldset>
          </form>
        </>
      ) : <Button style="grey" type="button" onClick={vm.reload}>Réessayer</Button>}
    </section>
  );
}
