export interface Document {
  document_id: number;
  type_id: number;
  title: string;
  abstract: string;
  latex_content: string;
  compiled_pdf_path: string;
  status: string;
  language: string;
  grade: number;
  created_by: number;
  created_at: Date | string;
  updated_at: Date | string;
}
