import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  makeClient,
  Repository,
  type Book,
  type Publication,
  type Role,
  type Profile,
} from "../../../packages/data/src";
import seedBooks from "../../../packages/domain/src/books.json";
import seedPublications from "../../../packages/domain/src/publications.json";
import { projectConfig } from "../../../packages/domain/src/project-config";
export const client = makeClient(
  import.meta.env.VITE_SUPABASE_URL || projectConfig.supabaseUrl,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || projectConfig.supabasePublishableKey,
  {
    auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true },
  },
);
export const repository = client ? new Repository(client) : null;
interface State {
  books: Book[];
  publications: Publication[];
  user: User | null;
  role: Role | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  notice: (s: string) => void;
  preview: boolean;
}
const C = createContext<State>(null!);
export const useLibrary = () => useContext(C);
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>(
    client ? [] : (seedBooks as Book[]),
  );
  const [publications, setPublications] = useState<Publication[]>(
    client ? [] : (seedPublications as Publication[]),
  );
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const loadVersion = useRef(0);
  const [loading, setLoading] = useState(!!client);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const notice = useCallback((s: string) => setToast(s), []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const reload = useCallback(async () => {
    if (!repository) return;
    setError("");
    const version = ++loadVersion.current;
    try {
      const [b, p] = await Promise.all([
        repository.books(),
        repository.publications(),
      ]);
      if (version === loadVersion.current) {
        setBooks(b);
        setPublications(p);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível carregar o acervo.",
      );
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!client) return;
    let active = true,
      sequence = 0,
      previousId: string | null | undefined;
    const sync = async (u: User | null) => {
      if (!active) return;
      const current = ++sequence;
      setUser(u);
      if (previousId !== u?.id) {
        previousId = u?.id;
        loadVersion.current++;
        setRole(null);
        setProfile(null);
        setBooks([]);
        setPublications([]);
        setLoading(true);
      }
      if (u) {
        await client!.rpc("claim_owner");
        try {
          const [role, profile] = await Promise.all([
            repository!.role(),
            repository!.profile(u.id),
          ]);
          if (active && current === sequence) {
            setRole(role);
            setProfile(profile);
          }
        } catch {
          notice("Não foi possível verificar suas permissões.");
        }
      }
      if (active && current === sequence) await reload();
    };
    void client.auth
      .getSession()
      .then(({ data }) => sync(data.session?.user ?? null));
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void sync(session?.user ?? null), 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [reload, notice]);
  async function refreshProfile() {
    if (user && repository) setProfile(await repository.profile(user.id));
  }
  async function login() {
    if (!client) {
      notice("O login ficará disponível após configurar a conexão.");
      return;
    }
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname },
    });
    if (error) notice(error.message);
  }
  async function logout() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) notice(error.message);
    else {
      setUser(null);
      setRole(null);
      setProfile(null);
      loadVersion.current++;
      setBooks([]);
      setPublications([]);
      await reload();
    }
  }
  return (
    <C.Provider
      value={{
        books,
        publications,
        user,
        role,
        profile,
        refreshProfile,
        loading,
        error,
        reload,
        login,
        logout,
        notice,
        preview: !client,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button onClick={() => setToast("")} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      )}
    </C.Provider>
  );
}
