import type { ReactElement } from 'react';
import Select from 'react-select';
import type { StylesConfig } from 'react-select';
import { MdAdd, MdArrowForward, MdCheckCircleOutline, MdCloudUpload, MdContentCopy, MdDeleteOutline, MdFolderOpen, MdRefresh, MdWarningAmber } from 'react-icons/md';
import type { QuoteDraftsViewModel } from '../../../hooks/index.ts';
import { devisSelectStyles } from '../../../utils/styles/index.ts';
import { Button } from '../button/index.ts';

type DraftOption = QuoteDraftsViewModel['draftOptions'][number];

export function DevisDrafts({ viewModel: vm }: { viewModel: QuoteDraftsViewModel }): ReactElement {
  return (
    <section className="devisView__panel devisView__drafts" aria-label="Brouillons de devis">
      <div className="devisView__drafts-header">
        <div className="devisView__drafts-heading">
          <span className="devisView__drafts-icon"><MdFolderOpen /></span>
          <div>
            <h2>{vm.mode === 'browse' ? 'Devis à reprendre' : 'Rédaction du devis'}</h2>
            <p>{vm.mode === 'browse' ? 'Choisissez un devis partagé à reprendre ou créez une nouvelle proposition.' : 'Nommez votre devis, puis complétez la proposition ci-dessous.'}</p>
          </div>
        </div>
        {vm.mode === 'browse' ? (
          <Button style="white" className="devisView__drafts-new" disabled={vm.isSaving || vm.isRestoring} onClick={vm.newDraft}>
            <MdAdd /><span>Nouveau devis</span>
          </Button>
        ) : (
          <Button style="white" className="devisView__drafts-new" disabled={vm.isSaving || vm.isRestoring} onClick={() => { void vm.browseDrafts(); }}>
            <MdFolderOpen /><span>Changer de devis</span>
          </Button>
        )}
      </div>

      {vm.mode === 'browse' && <>
      <div className="devisView__drafts-picker">
        <div className="devisView__drafts-select">
          <label htmlFor="quote-draft-select">Quel devis souhaitez-vous reprendre ?</label>
          <Select<DraftOption, false>
            inputId="quote-draft-select"
            classNamePrefix="react-select"
            options={vm.draftOptions}
            value={vm.draftOptions.find(option => option.value === vm.selectedDraft?.id) ?? null}
            onChange={option => vm.selectDraft(option?.value ?? null)}
            isSearchable
            isLoading={vm.isLoading}
            isDisabled={vm.isSaving || vm.isLoading || vm.draftOptions.length === 0}
            placeholder="Rechercher un devis par son nom…"
            noOptionsMessage={() => 'Aucun devis trouvé'}
            loadingMessage={() => 'Chargement des devis…'}
            menuPortalTarget={document.body}
            menuPosition="fixed"
            styles={devisSelectStyles as StylesConfig<DraftOption, false>}
            formatOptionLabel={(option, context) => context.context === 'value' ? option.label : (
              <div className="devisView__drafts-option">
                <strong>{option.label}</strong>
                <span>{option.detail} · {option.storageLabel}</span>
              </div>
            )}
          />
          <p className="devisView__drafts-caption">
            {vm.selectedDraft ? <>Dernière modification : {vm.selectedDraft.dateLabel}{vm.selectedDraft.author_name ? ` · Créé par ${vm.selectedDraft.author_name}` : ''}{vm.selectedDraft.localOnly ? ' · Copie locale à synchroniser' : ''}</>
              : 'Les devis partagés apparaîtront ici dès les premières informations saisies.'}
          </p>
        </div>
        <Button style="gradient" className="devisView__drafts-resume" disabled={vm.isSaving || vm.isLoading || !vm.selectedDraft} onClick={vm.resumeSelectedDraft}>
          <span>Reprendre le devis</span><MdArrowForward />
        </Button>
      </div>

      <details className="devisView__drafts-more">
        <summary>Gérer les brouillons</summary>
        <div className="devisView__drafts-menu">
          <Button style="white" disabled={vm.isSaving || vm.isLoading} onClick={() => { void vm.refreshDrafts(); }}><MdRefresh /><span>Actualiser les brouillons</span></Button>
          <Button style="white" className="devisView__drafts-delete" disabled={vm.isSaving || vm.isLoading || !vm.selectedDraft} onClick={vm.removeSelectedDraft}><MdDeleteOutline /><span>Supprimer le devis sélectionné</span></Button>
        </div>
      </details>
      </>}

      {vm.mode === 'edit' && <>
      <label className="devisView__drafts-name">
        <span>Nom du devis</span>
        <input autoFocus aria-label="Nom du devis" aria-describedby="quote-draft-name-help" maxLength={255} value={vm.draftName} onChange={event => vm.changeDraftName(event.target.value)} placeholder="Ex. Zoenoe — Prospection octobre" />
        <small id="quote-draft-name-help">Ce nom sert à retrouver votre brouillon. Il est indépendant du nom de l’entreprise.</small>
      </label>
      <div className="devisView__drafts-current">
        <div className="devisView__drafts-save-info">
          <span className={`devisView__drafts-status devisView__drafts-status--${vm.saveTone}`}>
            {vm.saveTone === 'warning' ? <MdWarningAmber /> : vm.saveTone === 'saved' ? <MdCheckCircleOutline /> : <MdCloudUpload />}
            {vm.saveLabel}
          </span>
          <strong>{vm.currentTitle}</strong>
          <p role="status">{vm.status}</p>
        </div>
        <div className="devisView__drafts-secondary">
          <Button style="white" className="devisView__drafts-save" disabled={vm.isSaving || vm.isLoading || vm.hasConflict || !vm.currentId} onClick={() => { void vm.saveCurrent(); }}>
            <MdCloudUpload /><span>Sauvegarder maintenant</span>
          </Button>
          <details className="devisView__drafts-more">
            <summary>Autres actions</summary>
            <div className="devisView__drafts-menu">
              <Button style="white" disabled={vm.isSaving || vm.isLoading} onClick={vm.saveCopy}>
                <MdContentCopy /><span>Enregistrer une copie</span>
              </Button>
              <Button style="white" className="devisView__drafts-delete" disabled={vm.isSaving || vm.isLoading || !vm.currentId} onClick={vm.removeCurrentDraft}>
                <MdDeleteOutline /><span>Supprimer ce brouillon</span>
              </Button>
            </div>
          </details>
        </div>
      </div>

      </>}

      {(vm.error || vm.localError) && (
        <div role="alert" className="devisView__drafts-alert">
          <MdWarningAmber />
          <div>
            <strong>{vm.localError ? 'La copie locale n’a pas pu être enregistrée' : vm.hasConflict ? 'Une autre version de ce devis existe' : 'La sauvegarde serveur est indisponible'}</strong>
            <p>{vm.localError || (vm.hasConflict ? 'Enregistrez une copie pour conserver votre saisie, ou reprenez la version serveur.' : 'Vous pouvez continuer la rédaction. Réessayez pour synchroniser votre devis.')}</p>
            <details><summary>Détail de l’erreur</summary><p>{vm.error || vm.localError}</p></details>
          </div>
          <div className="devisView__drafts-recovery">
            {vm.hasConflict ? (
              <>
                <Button style="gradient" disabled={vm.isSaving} onClick={vm.saveCopy}>Enregistrer une copie</Button>
                <Button style="white" disabled={vm.isSaving} onClick={() => { if (vm.currentId) void vm.resumeDraft(vm.currentId, true); }}>Reprendre la version serveur</Button>
              </>
            ) : <Button style="white" disabled={vm.isSaving || vm.isLoading} onClick={() => { void vm.retrySynchronization(); }}><MdRefresh /><span>Réessayer</span></Button>}
          </div>
        </div>
      )}
    </section>
  );
}
