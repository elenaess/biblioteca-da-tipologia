export type Role = "member" | "admin" | "owner";
export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  avatar_path?: string | null;
}
export interface Book {
  id: string;
  title: string;
  authors: string[];
  translators: string[];
  published_date: string;
  translation_date: string;
  edition: string;
  language: string;
  description: string;
  topics: string[];
  schools: string[];
  source_type: "drive" | "upload";
  drive_id: string | null;
  resource_key: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  cover_url: string | null;
  status: "draft" | "published";
  source_title: string;
  created_at?: string;
}
export interface Publication {
  id: string;
  title: string;
  kind: "article" | "base_text" | "post";
  summary: string;
  html: string;
  topics: string[];
  schools: string[];
  author_name: string;
  published_at: string | null;
  status: "draft" | "published";
  source_url: string | null;
  created_at?: string;
}
export interface Comment {
  id: string;
  user_id: string;
  book_id: string | null;
  publication_id: string | null;
  body: string;
  created_at: string;
  profiles: Profile | null;
}
export interface DriveReference {
  id: string;
  resourceKey: string | null;
}
