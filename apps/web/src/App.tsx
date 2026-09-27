import { lazy, Suspense, useEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  Link,
  useLocation,
} from "react-router-dom";
import {
  BookOpen,
  LibraryBig,
  FileText,
  UserRound,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { LibraryProvider, useLibrary } from "./context";
import { canManage } from "../../../packages/domain/src";
import Library from "./pages/Library";
import Book from "./pages/Book";
import { Publications, PublicationDetail } from "./pages/Publications";
import Account from "./pages/Account";
const SemanticReader = lazy(() => import("./reader/WebReader"));
const Admin = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.Admin })),
);
const BookEditor = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.BookEditor })),
);
const PublicationEditor = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.PublicationEditor })),
);
function Layout() {
  const { user, profile, role, preview } = useLibrary();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <aside className="sidebar desktop-sidebar">
          <Link className="header-brand" to="/" aria-label="Biblioteca da Tipologia — início">
            <img className="header-symbol" src="./brand-symbol.png" alt="" />
            <span className="header-wordmark" aria-hidden="true">
              <span className="wordmark-title"><span className="wordmark-initial">B</span>IBLIOTECA</span>
              <span className="wordmark-subtitle">{"DA TIPOLOGIA".split("").map((letter, i) => <span key={i}>{letter === " " ? "\u00a0" : letter}</span>)}</span>
            </span>
          </Link>
          <div className="sidebar-divider" />
        <nav className="sidebar-nav" aria-label="Navegação lateral">
          <NavLink end to="/">
            <LibraryBig size={20} />
            <span>Biblioteca</span>
          </NavLink>
          <NavLink to="/textos-base">
            <BookOpen size={20} />
            <span>Leituras</span>
          </NavLink>
          <NavLink to="/artigos">
            <FileText size={20} />
            <span>Artigos</span>
          </NavLink>
          <NavLink to="/conta">
            <UserRound size={20} />
            <span>Minha conta</span>
          </NavLink>
          {canManage(role) && (
            <NavLink to="/admin">
              <ShieldCheck size={20} />
              <span>Administração</span>
            </NavLink>
          )}
        </nav>
      </aside>
      <div className="main-shell">
        <header className="site-header">
          <Link className="header-brand" to="/" aria-label="Biblioteca da Tipologia — início">
            <img className="header-symbol" src="./brand-symbol.png" alt="" />
            <span className="header-wordmark" aria-hidden="true">
              <span className="wordmark-title"><span className="wordmark-initial">B</span>IBLIOTECA</span>
              <span className="wordmark-subtitle">{"DA TIPOLOGIA".split("").map((letter, i) => <span key={i}>{letter === " " ? "\u00a0" : letter}</span>)}</span>
            </span>
          </Link>
        <nav className="header-nav" aria-label="Navegação principal">
          <NavLink end to="/">
            <LibraryBig size={20} />
            <span>Biblioteca</span>
          </NavLink>
          <NavLink to="/textos-base">
            <BookOpen size={20} />
            <span>Leituras</span>
          </NavLink>
          <NavLink to="/artigos">
            <FileText size={20} />
            <span>Artigos</span>
          </NavLink>
          <NavLink to="/conta">
            <UserRound size={20} />
            <span>Minha conta</span>
          </NavLink>
          {canManage(role) && (
            <NavLink to="/admin">
              <ShieldCheck size={20} />
              <span>Administração</span>
            </NavLink>
          )}
        </nav>
          <Link className="account-link" to="/conta" aria-label="Minha conta">
            <span>
              {(profile?.display_name || user?.user_metadata.full_name)?.split(
                " ",
              )[0] || "Entrar com Google"}
            </span>
            <div className="avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" referrerPolicy="no-referrer" /> : <UserRound size={18} />}
            </div>
          </Link>
        </header>
        {preview && (
          <div className="preview-banner">
            <span>Prévia da biblioteca</span>
            <span>Explore o acervo e experimente a escrita.</span>
            <Link to="/editor">
              Abrir editor <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
        <main id="main" key={location.pathname} className="route-content">
          <Suspense fallback={<div className="empty">Carregando…</div>}>
            <Routes>
              <Route path="/" element={<Library />} />
              <Route path="/livro/:id" element={<Book />} />
              <Route path="/livro/:id/ler" element={<SemanticReader />} />
              <Route path="/textos-base" element={<Publications base />} />
              <Route path="/artigos" element={<Publications />} />
              <Route path="/texto/:id" element={<PublicationDetail />} />
              <Route path="/conta" element={<Account />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/livro/:id" element={<BookEditor />} />
              <Route path="/admin/texto/:id" element={<PublicationEditor />} />
              {preview && (
                <Route path="/editor" element={<PublicationEditor demo />} />
              )}
              <Route
                path="*"
                element={
                  <div className="empty">
                    <h1>Página não encontrada.</h1>
                    <Link to="/">Voltar à biblioteca</Link>
                  </div>
                }
              />
            </Routes>
          </Suspense>
        </main>
        <footer>
          <span>Biblioteca da Tipologia <span className="cc-symbol" aria-label="Creative Commons">cc</span> - 2026 | Alguns direitos reservados.</span>
        </footer>
      </div>
    </div>
  );
}
export default function App() {
  return (
    <LibraryProvider>
      <HashRouter>
        <a className="skip-link" href="#main">
          Ir para o conteúdo
        </a>
        <Layout />
      </HashRouter>
    </LibraryProvider>
  );
}
