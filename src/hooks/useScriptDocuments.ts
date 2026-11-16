import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { scriptDocumentService } from '../API/services/index.ts';
import type { ScriptDocument, ScriptDocumentDraft, ScriptDocumentMailbox } from '../utils/types/index.ts';

const EMPTY_DOCUMENT: ScriptDocumentDraft = { label: '', subject: '', message: '', position: 0, enabled: false };
const EMPTY_MAILBOX: ScriptDocumentMailbox = { sender_name: '', sender_email: '', has_password: false };
const errorMessage = (error: unknown) => {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data.message ?? 'Connexion à Olympe impossible.';
  }
  return error instanceof Error ? error.message : 'La modification a échoué.';
};

export function useScriptDocuments(campaignId: number) {
  const [mailbox, setMailbox] = useState(EMPTY_MAILBOX);
  const [password, setPassword] = useState('');
  const [documents, setDocuments] = useState<ScriptDocument[]>([]);
  const [draft, setDraft] = useState<ScriptDocumentDraft>(EMPTY_DOCUMENT);
  const [file, setFile] = useState<File | null>(null);
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    scriptDocumentService.get(campaignId).then((settings) => {
      if (!active) return;
      setMailbox(settings.mailbox);
      setDocuments(settings.documents);
      setDraft(EMPTY_DOCUMENT);
      setPassword('');
      setFile(null);
      setFileInputVersion((value) => value + 1);
      setFeedback(null);
      setLoaded(true);
    }).catch((error: unknown) => {
      if (active) setFeedback({ error: true, text: errorMessage(error) });
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [campaignId, reloadKey]);

  const edit = (document: ScriptDocumentDraft = EMPTY_DOCUMENT) => {
    setDraft(document);
    setFile(null);
    setFileInputVersion((value) => value + 1);
    setFeedback(null);
  };

  const saveMailbox = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      setMailbox(await scriptDocumentService.saveMailbox(campaignId, {
        sender_name: mailbox.sender_name,
        sender_email: mailbox.sender_email,
        ...(password ? { password } : {}),
      }));
      setPassword('');
      setFeedback({ error: false, text: 'Expéditeur enregistré.' });
    } catch (error) {
      setFeedback({ error: true, text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const saveDocument = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const saved = await scriptDocumentService.saveDocument(campaignId, draft, file);
      setDocuments((current) => [...current.filter((item) => item.id !== saved.id), saved]
        .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)));
      edit(saved);
      setFeedback({ error: false, text: 'Bouton et PDF enregistrés.' });
    } catch (error) {
      setFeedback({ error: true, text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const documentOptions = [
    { value: '', label: 'Nouveau bouton' },
    ...documents.map(({ id, label, enabled }) => ({ value: id, label: `${label} · ${enabled ? 'Visible' : 'Masqué'}` })),
  ];
  const selectDocument = (id: string) => edit(documents.find((document) => document.id === id));

  return { mailbox, setMailbox, password, setPassword, documentOptions, selectDocument, draft, setDraft, fileInputVersion, setFile,
    loading, loaded, saving, feedback, saveMailbox, saveDocument, reload: () => setReloadKey((value) => value + 1) };
}
