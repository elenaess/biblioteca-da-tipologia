export type Book = {
  id: string; title: string; authors: string[]; translators: string[];
  published_date: string; translation_date: string; edition: string; language: string;
  description: string; topics: string[]; schools: string[]; drive_id: string | null;
  resource_key: string | null; cover_url: string | null; source_title: string; status: string;
  source_type: string; file_path: string | null; file_name: string | null; file_size: number | null;
};
export type Publication = {
  id: string; title: string; kind: string; summary: string; html: string; topics: string[];
  schools: string[]; author_name: string; published_at: string | null; source_url: string | null; status: string;
};
export type Profile = { id: string; display_name: string; avatar_url: string | null };
export type Comment = { id: string; user_id: string; book_id: string | null; publication_id: string | null; body: string; created_at: string; profile?: Profile };
