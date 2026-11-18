import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { readLocalQuoteDrafts, writeLocalQuoteDrafts, removeLocalQuoteDraft, listQuoteDrafts, getQuoteDraft, saveQuoteDraft, deleteQuoteDraft, quoteDraftError } from '../API/services/index.ts';
import type { LocalQuoteDraft, QuoteDraftSnapshot, QuoteDraftSummary } from '../utils/types/index.ts';
import { useUserContext } from './useUserContext.ts';
import { useAlert } from './useAlert.ts';

export function useQuoteDrafts(rawSnapshot: QuoteDraftSnapshot, restore: (snapshot: QuoteDraftSnapshot) => void) {
  const { user } = useUserContext();
  const owner = user?.id_employe;
  const { showConfirm } = useAlert();
  const [mode, setMode] = useState<'browse' | 'edit'>('browse');
  const [draftName, setDraftName] = useState('');
  const snapshot = useMemo(() => ({ ...rawSnapshot, draftName }), [rawSnapshot, draftName]);
  const initial = useRef(rawSnapshot);
  const lastSnapshot = useRef(JSON.stringify(snapshot));
  const local = useRef(new Map<string, LocalQuoteDraft>());
  const activeId = useRef<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const localAvailable = useRef(false);
  const conflict = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [rows, setRows] = useState<QuoteDraftSummary[]>([]);
  const [localRows, setLocalRows] = useState<LocalQuoteDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');
  const [localError, setLocalError] = useState('');
  const [status, setStatus] = useState('Commencez votre devis : la saisie sera sauvegardée automatiquement.');

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(timer.current); };
  }, []);

  const persist = useCallback((draft: LocalQuoteDraft): void => {
    local.current.set(draft.id, draft);
    setLocalRows([...local.current.values()]);
    if (!owner) return;
    try { writeLocalQuoteDrafts(owner, [draft]); localAvailable.current = true; setLocalError(''); }
    catch { localAvailable.current = false; setLocalError('La copie locale ne peut pas être enregistrée. Gardez cette page ouverte jusqu’à la confirmation de sauvegarde sur le serveur.'); }
  }, [owner]);
  const refreshDrafts = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try { setRows(await listQuoteDrafts()); setError(''); }
    catch (cause) { setError(quoteDraftError(cause)); }
    finally { setIsLoading(false); }
  }, []);
  useEffect(() => {
    if (!owner) return;
    try {
      const drafts = readLocalQuoteDrafts(owner);
      local.current = new Map(drafts.map(draft => [draft.id, draft]));
      setLocalRows(drafts);
    } catch (cause) { setLocalError(quoteDraftError(cause)); }
    void refreshDrafts();
  }, [owner, refreshDrafts]);

  const saveCurrent = useCallback(async (): Promise<void> => {
    if (busy.current || !activeId.current || conflict.current) return;
    const id = activeId.current;
    const draft = local.current.get(id);
    if (!draft?.dirty) return;
    busy.current = true; setIsSaving(true); setStatus('Sauvegarde sur le serveur…'); setError('');
    try {
      const saved = await saveQuoteDraft(draft);
      // Une réponse tardive ne doit pas remplacer une saisie reprise après navigation.
      if (!mounted.current) return;
      const latest = local.current.get(id) || draft;
      const stillDirty = JSON.stringify(latest.snapshot) !== JSON.stringify(draft.snapshot);
      persist({ ...saved, snapshot: latest.snapshot, dirty: stillDirty });
      setRows(previous => [saved, ...previous.filter(row => row.id !== id)]);
      setStatus(stillDirty ? 'Dernières modifications en attente…' : `Sauvegardé sur le serveur à ${new Date(saved.updated_at).toLocaleTimeString('fr-FR')}.`);
      // Une saisie effectuée pendant la requête repart avec la nouvelle révision.
      if (stillDirty && activeId.current === id) timer.current = setTimeout(() => { void saveCurrent(); }, 800);
    } catch (cause) {
      if (!mounted.current) return;
      conflict.current = axios.isAxiosError(cause) && cause.response?.status === 409;
      setError(quoteDraftError(cause));
      setStatus(localAvailable.current ? 'Saisie conservée sur ce navigateur. Synchronisation serveur en attente.' : 'Sauvegarde non confirmée. Gardez cette page ouverte puis réessayez.');
    } finally { busy.current = false; if (mounted.current) setIsSaving(false); }
  }, [persist]);

  useEffect(() => {
    const retry = (): void => { void refreshDrafts(); void saveCurrent(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [refreshDrafts, saveCurrent]);

  useEffect(() => {
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSnapshot.current || !owner) return;
    lastSnapshot.current = serialized;
    const id = activeId.current || crypto.randomUUID();
    activeId.current = id; setCurrentId(id);
    const previous = local.current.get(id);
    const now = new Date().toISOString();
    persist({ id, id_employe: previous?.id_employe ?? owner, author_name: previous?.author_name ?? null, revision: previous?.revision || 0, created_at: previous?.created_at || now, updated_at: now,
      title: snapshot.draftName.trim() || snapshot.formState.companyName.trim() || snapshot.formState.contactName.trim() || 'Devis sans nom', snapshot, dirty: true });
    setStatus('Modifications en attente de sauvegarde sur le serveur…');
    clearTimeout(timer.current);
    if (!conflict.current) timer.current = setTimeout(() => { void saveCurrent(); }, 800);
    return () => clearTimeout(timer.current);
  }, [snapshot, owner, persist, saveCurrent]);

  const resumeDraft = async (id: string, server = false): Promise<void> => {
    if (busy.current) return;
    clearTimeout(timer.current); setIsLoading(true); setIsRestoring(true); setError('');
    try {
      const cached = local.current.get(id);
      const source = !server && cached?.dirty ? cached : { ...await getQuoteDraft(id), dirty: false };
      const draft = { ...source, snapshot: { ...source.snapshot, draftName: source.snapshot.draftName || source.title } };
      if (!mounted.current) return;
      // En cas de rechargement volontaire depuis le serveur, garder la saisie locale en copie.
      if (server && cached?.dirty) {
        const copyId = crypto.randomUUID();
        persist({ ...cached, id: copyId, revision: 0, dirty: true, title: `${cached.title} (copie locale)`, snapshot: { ...cached.snapshot, draftName: `${cached.title} (copie locale)`.slice(0, 255) } });
      }
      persist(draft);
      activeId.current = draft.id; setCurrentId(draft.id); conflict.current = false;
      lastSnapshot.current = JSON.stringify(draft.snapshot); setDraftName(draft.snapshot.draftName); restore(draft.snapshot); setMode('edit');
      setStatus(draft.dirty ? 'Brouillon local repris. Sauvegarde serveur en attente.' : 'Brouillon serveur repris.');
      if (draft.dirty) timer.current = setTimeout(() => { void saveCurrent(); }, 800);
    } catch (cause) {
      if (!mounted.current) return;
      // Une copie déjà synchronisée reste récupérable si le serveur est indisponible.
      const cached = local.current.get(id);
      if (!server && cached) {
        const recovered = { ...cached.snapshot, draftName: cached.snapshot.draftName || cached.title };
        activeId.current = id; setCurrentId(id); lastSnapshot.current = JSON.stringify(recovered); setDraftName(recovered.draftName); restore(recovered); setMode('edit');
        setStatus('Copie locale reprise.');
      }
      setError(quoteDraftError(cause));
    } finally { if (mounted.current) { setIsLoading(false); setIsRestoring(false); } }
  };
  const newDraft = (): void => {
    if (busy.current) return;
    clearTimeout(timer.current); activeId.current = null; setCurrentId(null); conflict.current = false;
    lastSnapshot.current = JSON.stringify({ ...initial.current, draftName: '' }); setDraftName(''); restore(initial.current); setError(''); setMode('edit');
    setSelectedDraftId(null);
    setStatus('Nouveau devis. La sauvegarde démarre dès votre première modification.');
  };
  const saveCopy = (): void => {
    if (busy.current) return;
    const now = new Date().toISOString(); const id = crypto.randomUUID();
    const copyName = `Copie de ${snapshot.draftName || snapshot.formState.companyName.trim() || 'devis'}`.slice(0, 255);
    const copiedSnapshot = { ...snapshot, draftName: copyName };
    persist({ id, title: copyName, revision: 0,
      snapshot: copiedSnapshot, created_at: now, updated_at: now, dirty: true });
    lastSnapshot.current = JSON.stringify(copiedSnapshot); setDraftName(copyName); setMode('edit');
    activeId.current = id; setCurrentId(id); conflict.current = false; void saveCurrent();
  };

  const removeDraft = async (draft: QuoteDraftSummary): Promise<void> => {
    if (busy.current || !await showConfirm(`Supprimer le brouillon « ${draft.title} » ?`, 'Supprimer un brouillon', 'Supprimer')) return;
    clearTimeout(timer.current); busy.current = true; setIsSaving(true);
    try {
      if (draft.revision > 0) await deleteQuoteDraft(draft);
      if (owner) removeLocalQuoteDraft(owner, draft.id);
      local.current.delete(draft.id); setLocalRows([...local.current.values()]);
      setRows(previous => previous.filter(row => row.id !== draft.id));
      if (activeId.current === draft.id) { busy.current = false; newDraft(); setMode('browse'); }
    } catch (cause) { setError(quoteDraftError(cause)); }
    finally { busy.current = false; setIsSaving(false); }
  };
  const drafts = useMemo(() => {
    const merged = new Map(rows.map(row => [row.id, { ...row, localOnly: false }]));
    localRows.forEach(draft => {
      const serverRow = merged.get(draft.id);
      if (draft.dirty || !serverRow) {
        merged.set(draft.id, {
          ...draft,
          id_employe: draft.id_employe ?? serverRow?.id_employe,
          author_name: draft.author_name ?? serverRow?.author_name ?? null,
          localOnly: draft.dirty,
        });
      }
    });
    return [...merged.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map(draft => ({
      ...draft, dateLabel: new Date(draft.updated_at).toLocaleString('fr-FR'), current: draft.id === currentId,
    }));
  }, [rows, localRows, currentId]);
  const selectedDraft = drafts.find(draft => draft.id === selectedDraftId)
    || drafts.find(draft => draft.current) || drafts[0] || null;
  const currentDraft = drafts.find(draft => draft.current);
  const draftOptions = drafts.map(draft => ({
    value: draft.id, label: draft.title,
    detail: draft.author_name ? `${draft.dateLabel} · ${draft.author_name}` : draft.dateLabel,
    storageLabel: draft.localOnly ? 'Copie locale' : 'Sauvegardé',
  }));
  const hasWarning = Boolean(error || localError || conflict.current);
  const saveTone = isSaving ? 'pending' : hasWarning ? 'warning' : currentDraft?.localOnly ? 'pending' : currentId ? 'saved' : 'neutral';
  const saveLabel = isSaving ? 'Sauvegarde en cours' : hasWarning ? 'Synchronisation à vérifier'
    : currentDraft?.localOnly ? 'Modifications en attente' : currentId ? 'Sauvegardé' : 'Sauvegarde automatique';
  const browseDrafts = async (): Promise<void> => {
    if (busy.current) return;
    clearTimeout(timer.current);
    await saveCurrent();
    if (mounted.current) { setSelectedDraftId(activeId.current); setMode('browse'); }
  };
  const retrySynchronization = async (): Promise<void> => { await refreshDrafts(); await saveCurrent(); };
  return { mode, draftName, changeDraftName: setDraftName, browseDrafts, drafts, currentId, isSaving, isLoading, isRestoring, hasConflict: conflict.current, error, localError, status,
    draftOptions, selectedDraft, selectDraft: setSelectedDraftId, currentTitle: currentDraft?.title || 'Nouveau devis', saveTone, saveLabel,
    resumeSelectedDraft: (): void => { if (selectedDraft) void resumeDraft(selectedDraft.id); },
    removeCurrentDraft: (): void => { if (currentDraft) void removeDraft(currentDraft); },
    removeSelectedDraft: (): void => { if (selectedDraft) void removeDraft(selectedDraft); },
    retrySynchronization,
    saveCurrent, resumeDraft, newDraft, saveCopy, removeDraft, refreshDrafts };
}
export type QuoteDraftsViewModel = ReturnType<typeof useQuoteDrafts>;
