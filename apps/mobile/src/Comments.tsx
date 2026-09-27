import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Image,
} from "react-native";
import { repository } from "./client";
import { MotionPressable as Pressable } from "./Motion";
import {
  canManage,
  type Comment,
  type Role,
} from "../../../packages/domain/src";
export default function Comments({
  id,
  kind,
  userId,
  role,
}: {
  id: string;
  kind: "book" | "publication";
  userId?: string;
  role: Role | null;
}) {
  const [list, setList] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    if (repository)
      try {
        setList(await repository.comments(kind, id));
        setError("");
      } catch {
        setError("Não foi possível carregar os comentários.");
      }
  }
  useEffect(() => {
    setList([]);
    void load();
  }, [id, kind]);
  async function send() {
    if (!repository) return;
    setBusy(true);
    try {
      await repository.addComment(kind, id, text);
      setText("");
      await load();
    } catch (e) {
      Alert.alert(
        "Comentário",
        e instanceof Error ? e.message : "Não foi possível publicar.",
      );
    } finally {
      setBusy(false);
    }
  }
  function remove(cid: string) {
    Alert.alert("Remover comentário?", "Esta ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await repository!.deleteComment(cid);
            await load();
          } catch {
            Alert.alert("Não foi possível remover.");
          }
        },
      },
    ]);
  }
  return (
    <View style={s.wrap}>
      <Text style={s.heading}>Conversa sobre a leitura</Text>
      {error ? (
        <Pressable onPress={load}>
          <Text>{error} Toque para tentar novamente.</Text>
        </Pressable>
      ) : null}
      {list.map((c) => (
        <View key={c.id} style={s.comment}>
          <View style={s.author}>
            {c.profiles?.avatar_url ? <Image source={{ uri: c.profiles.avatar_url }} style={s.avatar} /> : null}
            <Text style={s.name}>{c.profiles?.display_name || "Leitor"}</Text>
          </View>
          <Text style={s.date}>
            {new Date(c.created_at).toLocaleDateString("pt-BR")}
          </Text>
          <Text style={s.body}>{c.body}</Text>
          {(userId === c.user_id || canManage(role)) && (
            <Pressable accessibilityRole="button" onPress={() => remove(c.id)}>
              <Text style={s.action}>Remover</Text>
            </Pressable>
          )}
        </View>
      ))}
      {!list.length && !error && (
        <Text style={s.muted}>Ainda não há comentários.</Text>
      )}
      {userId ? (
        <>
          <TextInput
            accessibilityLabel="Seu comentário"
            multiline
            value={text}
            onChangeText={setText}
            maxLength={3000}
            style={s.input}
            placeholder="Compartilhe uma ideia sobre a leitura…"
          />
          <Pressable
            style={s.button}
            disabled={busy || !text.trim()}
            onPress={send}
          >
            <Text style={s.white}>
              {busy ? "Publicando…" : "Publicar comentário"}
            </Text>
          </Pressable>
        </>
      ) : (
        <Text style={s.muted}>Entre na aba Conta para comentar.</Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderColor: "#d9cbb8",
    marginTop: 30,
    paddingTop: 24,
  },
  heading: {
    fontSize: 20,
    color: "#352c25",
    marginBottom: 20,
    fontWeight: "600",
  },
  comment: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: "#ded3c3",
  },
  name: { fontWeight: "700", color: "#352c25" },
  author: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  date: { fontSize: 12, color: "#776b5c", marginTop: 4 },
  body: { fontSize: 16, lineHeight: 25, marginVertical: 12, color: "#352c25" },
  action: { color: "#914732", paddingVertical: 8 },
  muted: { fontSize: 14, lineHeight: 23, color: "#766b60", marginBottom: 15 },
  input: {
    padding: 15,
    minHeight: 100,
    backgroundColor: "#fffaf3",
    borderColor: "#d9cbb8",
    borderWidth: 1,
    borderRadius: 7,
    textAlignVertical: "top",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#914732",
    padding: 15,
    borderRadius: 7,
    marginTop: 12,
    alignItems: "center",
  },
  white: { color: "#fff8f0", fontWeight: "600" },
});
