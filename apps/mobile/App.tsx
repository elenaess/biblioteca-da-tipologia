import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { WebView } from "react-native-webview";
import RenderHTML from "react-native-render-html";
import { Ionicons } from "@expo/vector-icons";
import type { User } from "@supabase/supabase-js";
import { client, repository } from "./src/client";
import Comments from "./src/Comments";
import {
  TOPICS,
  SCHOOLS,
  canManage,
  driveUrl,
  filterBooks,
  topicLabel,
  type Book,
  type Publication,
  type Role,
} from "../../packages/domain/src";
import seedBooks from "../../packages/domain/src/books.json";
import seedPublications from "../../packages/domain/src/publications.json";
import { projectConfig } from "../../packages/domain/src/project-config";
import { imageAssets } from "./src/image-assets";
import { ReaderRepository } from "../../packages/data/src/reader";
import * as SecureStore from "expo-secure-store";
import SemanticReader from "./src/SemanticReader";
import { MotionProvider, MotionPressable as Pressable, ScreenTransition } from "./src/Motion";
import GoogleMark from "./src/GoogleMark";
WebBrowser.maybeCompleteAuthSession();
const colors = [
  "#78513e",
  "#566049",
  "#9b6749",
  "#454b3b",
  "#875041",
  "#75674e",
];
function AppContent() {
  const [tab, setTab] = useState("library");
  const [books, setBooks] = useState<Book[]>(
    repository ? [] : (seedBooks as Book[]),
  );
  const [publications, setPublications] = useState<Publication[]>(
    repository ? [] : (seedPublications as Publication[]),
  );
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [school, setSchool] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [publication, setPublication] = useState<Publication | null>(null);
  const [reader, setReader] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  useEffect(()=>{let alive=true;setReadingProgress(0);if(book&&repository&&!reader){const r=new ReaderRepository(repository.client);void Promise.all([r.manifest(book.id),r.position(book.id).catch(()=>null),SecureStore.getItemAsync('reading.'+(user?.id||'guest')+'.'+book.id)]).then(([m,remote,raw])=>{let saved=remote;try{const local=JSON.parse(raw||'null');if(local&&(!saved||local.updatedAt>saved.updatedAt))saved=local;}catch{}if(alive&&saved?.revision===m?.revision)setReadingProgress(saved?.progress||0);}).catch(()=>{});}return()=>{alive=false;};},[book?.id,user?.id,reader]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [profileName, setProfileName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  function openEditor(kind: "livro" | "texto", id: string) {
    const web = process.env.EXPO_PUBLIC_WEB_URL || projectConfig.webUrl;
    void WebBrowser.openBrowserAsync(web.replace(/\/$/, "") + "/#/admin/" + kind + "/" + id);
  }
  const { width } = useWindowDimensions();
  const visible = useMemo(
    () => filterBooks(books, query, topic, school),
    [books, query, topic, school],
  );
  async function load() {
    if (!repository) return;
    setRefreshing(true);
    try {
      const [b, p] = await Promise.all([
        repository.books(),
        repository.publications(),
      ]);
      setBooks(b);
      setPublications(p);
      setError("");
    } catch {
      setError(
        "Não foi possível carregar o acervo. Puxe para tentar novamente.",
      );
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    void load();
    if (!client) return;
    let alive = true,
      sequence = 0,
      previousId: string | undefined;
    const sync = async (u: User | null) => {
      if (!alive) return;
      const current = ++sequence;
      if (previousId !== u?.id) {
        previousId = u?.id;
        setBook(null);
        setPublication(null);
        setReader(false);
        setBooks([]);
        setPublications([]);
      }
      setUser(u);
      setAvatarUrl(null);
      setProfileName(u?.user_metadata.full_name || "");
      setRole(null);
      if (u) {
        await client!.rpc("claim_owner");
        const [r, p] = await Promise.all([
          repository!.role().catch(() => null),
          repository!.profile(u.id).catch(() => null),
        ]);
        if (alive && current === sequence) {
          setRole(r);
          setDisplayName(
            p?.display_name || u.user_metadata.full_name || "Leitor",
          );
          setProfileName(p?.display_name || u.user_metadata.full_name || "");
          setAvatarUrl(p?.avatar_url || null);
        }
      }
      if (alive && current === sequence) await load();
    };
    void client.auth
      .getSession()
      .then(({ data }) => sync(data.session?.user || null));
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void sync(session?.user || null), 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const back = () => {
    if (reader) setReader(false);
    else {
      setBook(null);
      setPublication(null);
    }
  };
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (book || publication || reader) {
        back();
        return true;
      }
      if (tab !== "library") {
        setTab("library");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [book, publication, reader, tab]);
  async function login() {
    if (!client) {
      Alert.alert(
        "Prévia",
        "O login será ativado ao conectar os serviços da biblioteca.",
      );
      return;
    }
    try {
      const redirectTo = projectConfig.mobileRedirectUrl;
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw Error("Não foi possível abrir o login.");
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );
      if (result.type === "success") {
        const url = new URL(result.url);
        if (url.protocol + "//" + url.hostname + url.pathname !== redirectTo)
          throw Error("Retorno de login inválido.");
        const code = url.searchParams.get("code");
        if (!code)
          throw Error(
            url.searchParams.get("error_description") || "Login cancelado.",
          );
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
      }
    } catch (e) {
      Alert.alert(
        "Login",
        e instanceof Error ? e.message : "Não foi possível entrar.",
      );
    }
  }
  async function saveProfile() {
    try {
      await repository?.saveProfile({ display_name: profileName.trim() });
      setDisplayName(profileName.trim());
      Alert.alert("Perfil", "Nome atualizado.");
    } catch {
      Alert.alert("Perfil", "Não foi possível salvar.");
    }
  }
  async function changePhoto() {
    if (!repository || !user || uploadingPhoto) return;
    setUploadingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8,
        base64: true,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled) return;
      const photo = result.assets[0];
      if (!photo.base64) throw new Error("Não foi possível abrir essa foto.");
      const profile = await repository.uploadAvatar(decode(photo.base64));
      setAvatarUrl(profile.avatar_url);
      Alert.alert("Foto de perfil", "Foto atualizada.");
    } catch (error) {
      Alert.alert("Foto de perfil", error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setUploadingPhoto(false);
    }
  }
  const switchTab = (next: string) => {
    setTab(next);
    setBook(null);
    setPublication(null);
    setReader(false);
    setTopic("");
    setSchool("");
  };
  const cover = (b: Book, large = false) => (
    <View
      style={[
        s.cover,
        { backgroundColor: colors[b.title.charCodeAt(0) % colors.length] },
        large
          ? { width: 200, height: 300, alignSelf: "center" }
          : { width: "100%", aspectRatio: 2 / 3 },
      ]}
    >
      {b.cover_url ? (
        <Image
          source={{ uri: b.cover_url }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={s.typeCover}>
          <Text style={s.coverTopic}>{topicLabel(b.topics[0])}</Text>
          <View style={s.coverLine} />
          <Text
            numberOfLines={5}
            style={[s.coverTitle, large && { fontSize: 29 }]}
          >
            {b.title}
          </Text>
          <Text style={s.coverAuthor}>
            {b.authors.join(" · ") || "Biblioteca da Tipologia"}
          </Text>
          <Text style={s.coverNote}>CAPA A CADASTRAR</Text>
        </View>
      )}
    </View>
  );
  const richHtml = useMemo(
    () =>
      publication?.html.replace(
        /src="\.\/?source-images\/([^"]+)"/g,
        (_match, key) => {
          const asset = imageAssets[key];
          return asset
            ? 'src="' + Image.resolveAssetSource(asset).uri + '"'
            : 'src=""';
        },
      ) || "",
    [publication],
  );
  const tagsStyles = {
    body: { color: "#352c25", fontSize: 18, lineHeight: 29 },
    p: { marginBottom: 16 },
    a: { color: "#8f4632" },
    h1: { fontSize: 27 },
    h2: { fontSize: 23 },
    img: { maxWidth: width - 40 },
  };
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <View style={s.top}>
        {book || publication ? (
          <Pressable accessibilityLabel="Voltar" onPress={back} style={s.back}>
            <Ionicons name="arrow-back" size={23} color="#352c25" />
          </Pressable>
        ) : (
          <Pressable accessibilityLabel="Biblioteca da Tipologia — início" onPress={() => switchTab("library")}>
            <Image source={require("./assets/brand-symbol.png")} style={s.logo} />
          </Pressable>
        )}
        <Text style={s.topLabel}>
          {reader ? "LEITURA" : book ? "LIVRO" : publication ? "TEXTO" : ""}
        </Text>
        {canManage(role) && !reader && (book || publication) && (
          <Pressable accessibilityLabel={"Editar " + (book?.title || publication?.title)} style={s.user} onPress={() => book ? openEditor("livro", book.id) : publication && openEditor("texto", publication.id)}>
            <Ionicons name="pencil-outline" size={19} color="#8f4632" />
          </Pressable>
        )}
        <Pressable
          accessibilityLabel="Minha conta"
          onPress={() => switchTab("account")}
          style={s.user}
        >
          <Ionicons name="person-outline" size={20} color="#594a3b" />
        </Pressable>
      </View>
      {!repository && !book && !publication && (
        <View style={s.preview}>
          <Text style={s.previewText}>
            Prévia do acervo · dados originais da biblioteca
          </Text>
        </View>
      )}
      <ScreenTransition transitionKey={`${reader ? "reader" : "page"}:${book?.id || publication?.id || tab}`}>
      {reader && book ? (
        <SemanticReader book={book} onClose={()=>setReader(false)} />
      ) : book ? (
        <ScrollView contentContainerStyle={s.content}>
          {cover(book, true)}
          <View style={s.tags}>
            {book.topics.map((t) => (
              <Text style={s.tag} key={t}>
                {topicLabel(t)}
              </Text>
            ))}
          </View>
          <Text style={s.heading}>{book.title}</Text>
          <Text style={s.subtitle}>
            {book.authors.join(", ") || "Autoria a conferir"}
          </Text>
          <View style={s.metadata}>
            {[
              ["Tradução", book.translators.join(", ") || "Não informada"],
              ["Publicação", book.published_date || "Não informada"],
              ["Idioma", book.language || "Não informado"],
              ["Edição", book.edition || "Não informada"],
            ].map(([label, value]) => (
              <View key={label} style={{ width: "48%", marginBottom: 20 }}>
                <Text style={s.metaLabel}>{label}</Text>
                <Text style={s.metaValue}>{value}</Text>
              </View>
            ))}
          </View>
          <Pressable style={s.primary} onPress={() => setReader(true)}>
            <Ionicons name="book-outline" size={20} color="#fff" />
            <Text style={s.white}>{readingProgress>0&&readingProgress<.995?`Continuar lendo — ${Math.round(readingProgress*100)}%`:"Começar a leitura"}</Text>
          </Pressable>
          {book.description ? (
            <Text style={s.body}>{book.description}</Text>
          ) : null}
          <Comments kind="book" id={book.id} userId={user?.id} role={role} />
        </ScrollView>
      ) : publication ? (
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.eyebrow}>
            {publication.topics.map(topicLabel).join(" · ")}
          </Text>
          <Text style={s.heading}>{publication.title}</Text>
          <Text style={s.subtitle}>
            {publication.author_name || "Texto do acervo"}
          </Text>
          {publication.source_url && (
            <Pressable
              onPress={() => void Linking.openURL(publication.source_url!)}
            >
              <Text style={s.link}>Documento original ↗</Text>
            </Pressable>
          )}
          <RenderHTML
            enableCSSInlineProcessing={true}
            enableUserAgentStyles={true}
            contentWidth={width - 40}
            source={{ html: richHtml }}
            tagsStyles={tagsStyles}
            ignoredDomTags={["script", "iframe", "object", "embed", "style"]}
            renderersProps={{
              a: {
                onPress: (_event, href) => {
                  if (/^https:\/\//.test(href)) void Linking.openURL(href);
                },
              },
              img: { enableExperimentalPercentWidth: true },
            }}
          />
          <Comments
            kind="publication"
            id={publication.id}
            userId={user?.id}
            role={role}
          />
        </ScrollView>
      ) : tab === "library" ? (
        <FlatList
          key="books"
          data={visible}
          numColumns={2}
          keyExtractor={(b) => b.id}
          contentContainerStyle={s.catalogue}
          columnWrapperStyle={{ gap: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={load}
              tintColor="#8f4632"
            />
          }
          ListHeaderComponent={
            <>
              <Text style={s.eyebrow}>O ACERVO</Text>
              <Text style={s.heading}>Encontre sua{"\n"}próxima leitura.</Text>
              <Text style={s.subtitle}>
                Perspectivas para compreender a personalidade.
              </Text>
              <View style={s.search}>
                <Ionicons name="search-outline" size={21} color="#7c6b57" />
                <TextInput
                  placeholder="Título, autor ou tradutor…"
                  value={query}
                  onChangeText={setQuery}
                  style={s.searchInput}
                  accessibilityLabel="Buscar livros"
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.filters}
              >
                {[{ id: "", label: "Todos" }, ...TOPICS].map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      setTopic(t.id);
                      setSchool("");
                    }}
                    style={[s.filter, topic === t.id && s.filterActive]}
                  >
                    <Text
                      style={[
                        s.filterText,
                        topic === t.id && { color: "#fff8ed" },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {topic === "socionics" && (
                <ScrollView horizontal style={{ marginBottom: 18 }}>
                  {["", ...SCHOOLS].map((sc) => (
                    <Pressable
                      key={sc}
                      onPress={() => setSchool(sc)}
                      style={[s.filter, school === sc && s.filterActive]}
                    >
                      <Text
                        style={[
                          s.filterText,
                          school === sc && { color: "white" },
                        ]}
                      >
                        {sc || "Todas as escolas"}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              <View style={s.section}>
                <Text style={s.sectionHeading}>Explore a biblioteca</Text>
                <Text style={s.count}>{visible.length} livros</Text>
              </View>
              {error && <Text style={s.error}>{error}</Text>}
            </>
          }
          renderItem={({ item }) => (
            <Pressable
              style={s.bookCard}
              onPress={() => setBook(item)}
              accessibilityRole="button"
              accessibilityLabel={"Ler " + item.title}
            >
              {cover(item)}
              <Text style={s.category}>{topicLabel(item.topics[0])}</Text>
              <Text numberOfLines={2} style={s.bookTitle}>
                {item.title}
              </Text>
              <Text style={s.bookAuthor} numberOfLines={1}>
                {item.authors.join(", ") || "Autoria a conferir"}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.subtitle}>
                Nenhum livro encontrado para este filtro.
              </Text>
            </View>
          }
        />
      ) : tab === "texts" || tab === "articles" ? (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={load} />
          }
        >
          <Text style={s.eyebrow}>
            {tab === "texts" ? "FUNDAMENTOS" : "PERSPECTIVAS"}
          </Text>
          <Text style={s.heading}>
            {tab === "texts" ? "Leituras" : "Artigos e escritos"}
          </Text>
          <Text style={s.subtitle}>
            {tab === "texts"
              ? "Um ponto de partida para cada teoria."
              : "Ideias e discussões sobre tipologia."}
          </Text>
          {publications
            .filter((p) =>
              tab === "texts" ? p.kind === "base_text" : p.kind !== "base_text",
            )
            .map((p, i) => (
              <Pressable
                key={p.id}
                style={s.publication}
                onPress={() => setPublication(p)}
              >
                <Text style={s.pubNumber}>
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.category}>
                    {p.topics.map(topicLabel).join(" · ")}
                  </Text>
                  <Text style={s.pubTitle}>{p.title}</Text>
                  <Text style={s.bookAuthor}>{p.summary}</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#914732" />
              </Pressable>
            ))}
          {!publications.some((p) =>
            tab === "texts" ? p.kind === "base_text" : p.kind !== "base_text",
          ) && (
            <View style={s.empty}>
              <Text style={s.subtitle}>
                As publicações aparecerão aqui quando forem adicionadas.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.eyebrow}>SEU ESPAÇO</Text>
          <Text style={s.heading}>
            {user ? "Sua conta" : "Uma biblioteca, muitas perspectivas."}
          </Text>
          <View style={s.account}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: 90, height: 90, borderRadius: 45 }} />
              : <Ionicons name="person-circle-outline" size={70} color="#697050" />}
            <Text style={s.pubTitle}>
              {user ? displayName || "Leitor" : "Bem-vinda à Biblioteca"}
            </Text>
            <Text style={s.subtitle}>
              {user?.email || "Entre para participar das conversas."}
            </Text>
            {user ? (
              <>
                <Pressable style={s.secondary} disabled={uploadingPhoto} onPress={changePhoto}
                  accessibilityRole="button" accessibilityLabel="Trocar foto de perfil">
                  <Text>{uploadingPhoto ? "Enviando foto…" : "Trocar foto"}</Text>
                </Pressable>
                <Text style={s.bookAuthor}>JPEG, PNG ou WebP. Até 3 MB.</Text>
                <Text style={s.tag}>
                  {role === "owner"
                    ? "Proprietária"
                    : role === "admin"
                      ? "Administrador"
                      : "Membro"}
                </Text>
                <TextInput
                  accessibilityLabel="Nome de exibição"
                  style={s.profileInput}
                  value={profileName}
                  onChangeText={setProfileName}
                  maxLength={80}
                />
                <Pressable style={s.secondary} onPress={saveProfile}>
                  <Text>Salvar nome</Text>
                </Pressable>
                {canManage(role) && (
                  <Pressable
                    style={s.primary}
                    onPress={() => {
                      const web = process.env.EXPO_PUBLIC_WEB_URL || projectConfig.webUrl;
                      void WebBrowser.openBrowserAsync(
                        web.replace(/\/$/, "") + "/#/admin",
                      );
                    }}
                  >
                    <Text style={s.white}>Abrir administração</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => void client?.auth.signOut()}>
                  <Text style={s.link}>Sair da conta</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={s.googleButton} onPress={login}>
                <GoogleMark />
                <Text style={s.googleText}>Continuar com Google</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}
      </ScreenTransition>
      {!reader && (
        <View style={s.bottom}>
          {[
            ["library", "library-outline", "Biblioteca"],
            ["texts", "book-outline", "Leituras"],
            ["articles", "document-text-outline", "Artigos"],
            ["account", "person-outline", "Conta"],
          ].map(([id, icon, label]) => (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === id }}
              onPress={() => switchTab(id)}
              style={s.navItem}
            >
              <Ionicons
                name={icon as any}
                size={22}
                color={tab === id ? "#914732" : "#877965"}
              />
              <Text
                style={[
                  s.navText,
                  tab === id && { color: "#914732", fontWeight: "700" },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <MotionProvider><AppContent /></MotionProvider>
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f4eee4" },
  top: {
    paddingHorizontal: 20,
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#e0d4c3",
    gap: 12,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  logo: { width: 44, height: 44, resizeMode: "contain" },
  googleButton: { backgroundColor: "#fff", borderColor: "#747775", borderWidth: 1, borderRadius: 5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 14, marginVertical: 16 },
  googleText: { color: "#1f1f1f", fontSize: 14, fontWeight: "500" },
  brandTitle: { fontFamily: "serif", fontSize: 21, color: "#352c25" },
  brandSub: { fontFamily: "serif", fontSize: 14, color: "#665543" },
  topLabel: { flex: 1, fontSize: 11, letterSpacing: 2, color: "#7d6953" },
  back: { padding: 10, marginLeft: -10 },
  user: {
    width: 37,
    height: 37,
    borderRadius: 20,
    backgroundColor: "#e5daca",
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    backgroundColor: "#e9dfce",
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  previewText: { fontSize: 11, color: "#6e5b42" },
  content: { padding: 20, paddingTop: 28, paddingBottom: 40 },
  catalogue: { padding: 20, paddingTop: 28, paddingBottom: 30 },
  eyebrow: {
    fontSize: 10,
    color: "#914732",
    letterSpacing: 2,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 14,
  },
  heading: {
    fontFamily: "serif",
    fontSize: 32,
    lineHeight: 39,
    color: "#352c25",
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: "#766b60",
    marginBottom: 23,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fffaf3",
    borderWidth: 1,
    borderColor: "#d9ccba",
    borderRadius: 6,
    paddingHorizontal: 14,
    height: 53,
    marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#352c25" },
  filters: { marginBottom: 20 },
  filter: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#dccfbd",
    borderRadius: 5,
    marginRight: 9,
  },
  filterActive: { backgroundColor: "#665340", borderColor: "#665340" },
  filterText: { fontSize: 12, color: "#6e5f4d" },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 22,
  },
  sectionHeading: { fontSize: 20, fontFamily: "serif", color: "#352c25" },
  count: { fontSize: 12, color: "#766b60" },
  bookCard: { flex: 1, maxWidth: "47%", marginBottom: 28 },
  cover: {
    borderRadius: 5,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#392719",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  typeCover: {
    flex: 1,
    alignItems: "center",
    padding: 17,
    borderLeftWidth: 5,
    borderColor: "#00000018",
  },
  coverTopic: {
    fontSize: 9,
    color: "#e9d8bc",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
  },
  coverLine: {
    height: 1,
    backgroundColor: "#dec8a366",
    width: 25,
    marginVertical: 19,
  },
  coverTitle: {
    fontFamily: "serif",
    fontSize: 21,
    lineHeight: 26,
    color: "#faecd6",
    textAlign: "center",
  },
  coverAuthor: {
    marginTop: "auto",
    paddingTop: 12,
    fontSize: 10,
    lineHeight: 14,
    color: "#f7e9d3",
    textAlign: "center",
  },
  coverNote: { fontSize: 7, letterSpacing: 1, color: "#d8c5a9", marginTop: 13 },
  category: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#7a6b56",
    marginTop: 14,
    marginBottom: 6,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    color: "#352c25",
  },
  bookAuthor: { fontSize: 12, lineHeight: 19, color: "#766b60", marginTop: 5 },
  empty: { paddingVertical: 50, alignItems: "center" },
  tags: {
    flexDirection: "row",
    gap: 7,
    flexWrap: "wrap",
    marginTop: 25,
    marginBottom: 18,
  },
  tag: {
    fontSize: 11,
    color: "#67543c",
    backgroundColor: "#e6dccb",
    padding: 7,
    borderRadius: 4,
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 18,
    paddingBottom: 0,
    backgroundColor: "#eee4d4",
    borderRadius: 6,
    marginBottom: 25,
  },
  metaLabel: { fontSize: 12, color: "#766b60", marginBottom: 6 },
  metaValue: { fontSize: 15, color: "#352c25" },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#914732",
    padding: 15,
    minHeight: 48,
    borderRadius: 6,
    marginVertical: 8,
  },
  secondary: {
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cdbda6",
    borderRadius: 5,
    marginVertical: 10,
  },
  white: { color: "#fff8ed", fontSize: 15, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 27, marginTop: 25, color: "#352c25" },
  readerLink: { padding: 12, alignItems: "center" },
  link: { fontSize: 13, color: "#914732", paddingVertical: 12 },
  publication: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderColor: "#daccb8",
  },
  pubNumber: { fontSize: 27, fontFamily: "serif", color: "#ac9375" },
  pubTitle: {
    fontSize: 22,
    lineHeight: 29,
    fontFamily: "serif",
    color: "#352c25",
    marginVertical: 10,
  },
  account: {
    backgroundColor: "#fffaf2",
    borderWidth: 1,
    borderColor: "#dbcebc",
    borderRadius: 8,
    padding: 25,
    alignItems: "center",
    marginTop: 20,
  },
  profileInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d9cbb8",
    padding: 12,
    borderRadius: 5,
    marginTop: 22,
    fontSize: 16,
  },
  bottom: {
    flexDirection: "row",
    backgroundColor: "#fffaf2",
    borderTopWidth: 1,
    borderColor: "#ded2bf",
    paddingTop: 12,
    paddingBottom: 24,
  },
  navItem: { flex: 1, alignItems: "center", gap: 5 },
  navText: { fontSize: 10, color: "#877965" },
  error: { padding: 15, color: "#963d2c" },
});
