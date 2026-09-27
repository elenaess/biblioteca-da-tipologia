import { BookOpen, CreativeCommons, FileText, Library, Pencil, UserRound } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { roleCanEdit } from '@biblioteca/core';
import { GoogleMark } from './GoogleMark';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function Shell({ session, role }: { session: Session | null; role: string | null }) {
  const canEdit = roleCanEdit(role);
  async function login() { await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${window.location.pathname}` } }); }
  return <div className="app-shell">
    <a className="skip" href="#content">Ir para o conteúdo</a>
    <header className="topbar">
      <NavLink to="/" className="brand" aria-label="Biblioteca da Tipologia — início">
        <img src="./wordmark.png" className="wordmark" alt="BIBLIOTECA DA TIPOLOGIA" />
        <img src="./symbol.png" className="symbol" alt="Biblioteca da Tipologia" />
      </NavLink>
      <nav className="main-nav" aria-label="Principal">
        <NavLink to="/"><Library size={17}/>Biblioteca</NavLink>
        <NavLink to="/leituras"><BookOpen size={17}/>Leituras</NavLink>
        <NavLink to="/artigos"><FileText size={17}/>Artigos</NavLink>
        <NavLink to="/conta"><UserRound size={17}/>Minha conta</NavLink>
        {canEdit && <NavLink to="/admin"><Pencil size={17}/>Editar</NavLink>}
      </nav>
      {!session && <button className="google-button compact" onClick={login}><GoogleMark/>Entrar</button>}
    </header>
    <main id="content"><Outlet /></main>
    <footer>Biblioteca da Tipologia <CreativeCommons size={16} aria-label="Creative Commons" /> - 2006 | Alguns direitos reservados.</footer>
  </div>;
}
