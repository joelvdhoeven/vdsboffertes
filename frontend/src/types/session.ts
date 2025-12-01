export interface SessionStatus {
  session_id: string;
  notes_uploaded: boolean;
  prijzenboek_uploaded: boolean;
  parsed: boolean;
  matched: boolean;
  generated: boolean;
}

export interface UploadNotesResponse {
  session_id: string;
  filename: string;
  message: string;
}

export interface UploadNotesTextResponse extends UploadNotesResponse {
  text_length: number;
}

export interface UploadPrijzenboekResponse {
  session_id: string;
  filename: string;
  message: string;
}

