export type ScriptDocumentSignatureLayout = 'stacked' | 'side_by_side';

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
  signature_text?: string | null;
  signature_layout?: ScriptDocumentSignatureLayout;
  signature_image_filename?: string | null;
  remove_signature_image?: boolean;
  revision?: number;
  attachment_filename?: string;
}

export type ScriptDocument = ScriptDocumentDraft & {
  id: string;
  revision: number;
  attachment_filename: string;
  signature_text?: string | null;
  signature_layout?: ScriptDocumentSignatureLayout;
  signature_image_filename?: string | null;
};

export interface ScriptDocumentSettings {
  mailbox: ScriptDocumentMailbox;
  documents: ScriptDocument[];
}
