import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { getRequest, postFormDataRequest } from '../APICalls.ts';
import type { ScriptDocument, ScriptDocumentDraft, ScriptDocumentMailbox, ScriptDocumentSettings } from '../../utils/types/index.ts';

type MailboxInput = Pick<ScriptDocumentMailbox, 'sender_name' | 'sender_email'> & { password?: string };
type Response<T> = { success: boolean; data: T };
const endpoint = (campaignId: number) => `/campagnes/${campaignId}/documents-script`;

export const scriptDocumentService = {
  async get(campaignId: number): Promise<ScriptDocumentSettings> {
    const { data }: AxiosResponse<Response<ScriptDocumentSettings>> = await getRequest(endpoint(campaignId));
    return data.data;
  },
  async saveMailbox(campaignId: number, mailbox: MailboxInput): Promise<ScriptDocumentMailbox> {
    const { data } = await axios.put<Response<ScriptDocumentMailbox>>(`${endpoint(campaignId)}/expediteur`, mailbox);
    return data.data;
  },
  async saveDocument(campaignId: number, draft: ScriptDocumentDraft, file: File | null): Promise<ScriptDocument> {
    const form = new FormData();
    form.set('label', draft.label);
    form.set('subject', draft.subject);
    form.set('message', draft.message);
    form.set('position', String(draft.position));
    form.set('enabled', String(draft.enabled));
    if (draft.revision !== undefined) form.set('revision', String(draft.revision));
    if (file) form.set('file', file);
    const uri = draft.id ? `${endpoint(campaignId)}/${draft.id}` : endpoint(campaignId);
    const { data } = await postFormDataRequest<Response<ScriptDocument>>(uri, form);
    return data.data;
  },
};
