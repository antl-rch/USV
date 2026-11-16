export interface ScriptDocumentMailbox {
  sender_name: string;
  sender_email: string;
  has_password: boolean;
}

export interface ScriptDocumentDraft {
  id?: string;
  label: string;
  subject: string;
  message: string;
  position: number;
  enabled: boolean;
  revision?: number;
  attachment_filename?: string;
}

export type ScriptDocument = ScriptDocumentDraft & { id: string; revision: number; attachment_filename: string };

export interface ScriptDocumentSettings {
  mailbox: ScriptDocumentMailbox;
  documents: ScriptDocument[];
}
