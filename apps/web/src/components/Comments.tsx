import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { addComment, listComments, removeComment } from '../lib/api';
import type { Comment } from '../lib/types';
import { roleCanEdit } from '@biblioteca/core';

export function Comments({ session, role, bookId, publicationId }: { session: Session | null; role: string | null; bookId?: string; publicationId?: string }) {
  const [items,setItems]=useState<Comment[]>([]); const [body,setBody]=useState(''); const [error,setError]=useState('');
  const reload=()=>listComments({bookId,publicationId}).then(setItems).catch(e=>setError(e.message));
  useEffect(()=>{ reload(); },[bookId,publicationId]);
  async function submit(e: React.FormEvent){ e.preventDefault(); if(!session?.user || !body.trim()) return; try { await addComment({body:body.trim(),userId:session.user.id,bookId,publicationId}); setBody(''); reload(); } catch(e:any){setError(e.message);} }
  async function remove(c:Comment){ try{await removeComment(c.id); reload();}catch(e:any){setError(e.message);} }
  return <section className="comments"><h2>Comentários</h2>{error&&<p className="error">{error}</p>}
    {session ? <form onSubmit={submit} className="comment-form"><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Escreva um comentário…" maxLength={4000}/><button>Publicar</button></form> : <p className="muted">Entre com Google para comentar.</p>}
    <div className="comment-list">{items.map(c=><article className="comment" key={c.id}><div className="comment-head">{c.profile?.avatar_url&&<img src={c.profile.avatar_url}/>}<strong>{c.profile?.display_name || 'Leitor'}</strong><time>{new Date(c.created_at).toLocaleDateString('pt-BR')}</time></div><p>{c.body}</p>{(session?.user.id===c.user_id||roleCanEdit(role))&&<button className="text-button danger" onClick={()=>remove(c)}>Remover</button>}</article>)}</div>
  </section>;
}
