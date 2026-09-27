import { supabase } from './supabase';
import type { Book, Comment, Profile, Publication } from './types';

export async function listBooks(): Promise<Book[]> {
  const { data, error } = await supabase.from('books').select('*').order('title');
  if (error) throw error; return (data ?? []) as Book[];
}
export async function getBook(id: string): Promise<Book> {
  const { data, error } = await supabase.from('books').select('*').eq('id', id).single();
  if (error) throw error; return data as Book;
}
export async function listPublications(kind?: string): Promise<Publication[]> {
  let q = supabase.from('publications').select('*').order('title');
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q; if (error) throw error; return (data ?? []) as Publication[];
}
export async function getPublication(id: string): Promise<Publication> {
  const { data, error } = await supabase.from('publications').select('*').eq('id', id).single();
  if (error) throw error; return data as Publication;
}
export async function getMyRole(): Promise<string | null> {
  const { data, error } = await supabase.rpc('my_role'); if (error) return null; return data as string | null;
}
export async function claimOwner(): Promise<string | null> {
  const { data, error } = await supabase.rpc('claim_owner'); if (error) return getMyRole(); return data as string | null;
}
export async function listComments(target: { bookId?: string; publicationId?: string }): Promise<Comment[]> {
  let q = supabase.from('comments').select('*').order('created_at');
  if (target.bookId) q = q.eq('book_id', target.bookId);
  if (target.publicationId) q = q.eq('publication_id', target.publicationId);
  const { data, error } = await q; if (error) throw error;
  const comments = (data ?? []) as Comment[];
  const ids = [...new Set(comments.map(c => c.user_id))];
  if (!ids.length) return comments;
  const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
  const map = new Map((profiles ?? []).map(p => [p.id, p as Profile]));
  return comments.map(c => ({ ...c, profile: map.get(c.user_id) }));
}
export async function addComment(input: { body: string; userId: string; bookId?: string; publicationId?: string }) {
  const { error } = await supabase.from('comments').insert({ user_id: input.userId, book_id: input.bookId ?? null, publication_id: input.publicationId ?? null, body: input.body });
  if (error) throw error;
}
export async function removeComment(id: string) { const { error } = await supabase.rpc('remove_comment', { comment_id: id }); if (error) throw error; }
export async function saveBook(id: string, patch: Partial<Book>) { const { error } = await supabase.from('books').update(patch).eq('id', id); if (error) throw error; }
export async function savePublication(id: string, patch: Partial<Publication>) { const { error } = await supabase.from('publications').update(patch).eq('id', id); if (error) throw error; }
export async function bookReadUrl(book: Book): Promise<string | null> {
  if (book.drive_id) return `https://drive.google.com/file/d/${book.drive_id}/preview${book.resource_key ? `?resourcekey=${encodeURIComponent(book.resource_key)}` : ''}`;
  if (book.file_path) { const { data, error } = await supabase.storage.from('library-files').createSignedUrl(book.file_path, 3600); if (!error) return data.signedUrl; }
  return null;
}
