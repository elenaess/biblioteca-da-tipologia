import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Grid3X3, List, Pencil, Search } from 'lucide-react';
import { bookMatches, displayTopic, roleCanEdit, TOPICS } from '@biblioteca/core';
import { listBooks } from '../lib/api'; import type { Book } from '../lib/types';
export function LibraryPage({role}:{role:string|null}){const[books,setBooks]=useState<Book[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState('');const[q,setQ]=useState('');const[topic,setTopic]=useState('all');const[view,setView]=useState<'grid'|'list'>('grid');
useEffect(()=>{listBooks().then(setBooks).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);const filtered=useMemo(()=>books.filter(b=>bookMatches(b,q,topic)),[books,q,topic]);return <>
<section className="hero"><p className="eyebrow">UM ACERVO PARA OLHAR MAIS DE PERTO.</p><h1>Encontre sua próxima leitura.</h1><p>Perspectivas para compreender a personalidade.</p></section>
<section className="catalog section"><div className="section-title"><div><span>O ACERVO</span><h2>Explore a biblioteca</h2></div><strong>{filtered.length} livros</strong></div>
<div className="searchbox"><Search size={20}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar livros, autores e tradutores"/></div>
<div className="chips"><button className={topic==='all'?'active':''} onClick={()=>setTopic('all')}>Todos os temas</button>{TOPICS.map(t=><button key={t.key} className={topic===t.key?'active':''} onClick={()=>setTopic(t.key)}>{t.label}</button>)}</div>
<div className="view-controls"><button aria-label="Exibir em grade" className={view==='grid'?'active':''} onClick={()=>setView('grid')}><Grid3X3/></button><button aria-label="Exibir em lista" className={view==='list'?'active':''} onClick={()=>setView('list')}><List/></button></div>
{loading&&<p className="state">Carregando a biblioteca…</p>}{error&&<p className="error state">{error}</p>}{!loading&&!error&&!filtered.length&&<p className="state">Nenhum livro encontrado.</p>}
<div className={`book-${view}`}>{filtered.map(b=><article className="book-card" key={b.id}><Link to={`/livro/${b.id}`} className="cover-link"><div className="cover">{b.cover_url?<img src={b.cover_url} alt=""/>:<img className="cover-symbol" src="./symbol.png" alt=""/>}</div><div className="book-copy"><h3>{b.title}</h3><p>{b.authors?.join(', ')||'Autoria a revisar'}</p><div className="tags">{(b.topics||[]).map(t=><span key={t}>{displayTopic(t)}</span>)}</div></div></Link>{roleCanEdit(role)&&<Link className="edit-dot" title="Editar livro" to={`/admin/book/${b.id}`}><Pencil size={16}/></Link>}</article>)}</div>
</section></>}
