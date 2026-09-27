import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  Pressable,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import * as SecureStore from "expo-secure-store";
import { repository, client } from "./client";
import { ReaderRepository } from "../../../packages/data/src/reader";
import type { Book } from "../../../packages/domain/src";
import { driveUrl } from "../../../packages/domain/src";
import type { ReadingPosition } from "../../../packages/domain/src/reader";
import documentTemplate from "./generated/reader-document.json";
import UploadedPdf from "./UploadedPdf";
export default function SemanticReader({
  book,
  onClose,
}: {
  book: Book;
  onClose: () => void;
}) {
  const [ready, setReady] = useState<boolean | null>(null),
    [error, setError] = useState("");
  const web = useRef<WebView>(null);
  const r = useMemo(
    () => (repository ? new ReaderRepository(repository.client) : null),
    [],
  );
  useEffect(() => {
    let alive = true;
    void r
      ?.manifest(book.id)
      .then((m) => {
        if (alive) setReady(m?.processing_status === "ready");
      })
      .catch(() => {
        if (alive) {
          setReady(false);
          setError("Não foi possível carregar a leitura.");
        }
      });
    return () => {
      alive = false;
    };
  }, [book.id]);
  const original = async () => {
    await Linking.openURL(
      book.source_type === "drive"
        ? driveUrl(book)
        : await repository!.pdfUrl(book),
    );
  };
  const html = useMemo(
    () =>
      documentTemplate.replace(
        "__READER_CONFIG__",
        "window.__readerConfig=" +
          JSON.stringify({ id: book.id, title: book.title }).replace(
            /</g,
            "\\u003c",
          ) +
          ";",
      ),
    [book.id, book.title],
  );
  async function receive(raw: string) {
    let id: number | undefined;
    try {
      const message = JSON.parse(raw);
      id = message.id;
      if (typeof id !== "number" || !r) return;
      let value: unknown = null;
      const {
          data: { session },
        } = await client!.auth.getSession(),
        uid = session?.user.id;
      const key = "reading." + (uid || "guest") + "." + book.id;
      switch (message.method) {
        case "manifest":
          value = await r.manifest(book.id);
          break;
        case "chapter":
          if (typeof message.value !== "string") throw Error();
          value = await r.chapter(book.id, message.value);
          break;
        case "position": {
          const local = JSON.parse(
            (await SecureStore.getItemAsync(key)) || "null",
          ) as ReadingPosition | null;
          const remote = uid
            ? await r.position(book.id).catch(() => null)
            : null;
          value =
            remote && (!local || remote.updatedAt > local.updatedAt)
              ? remote
              : local;
          break;
        }
        case "save": {
          const p = message.value as ReadingPosition;
          if (p.bookId !== book.id || !Number.isFinite(p.progress))
            throw Error();
          await SecureStore.setItemAsync(key, JSON.stringify(p));
          if (uid) await r.save(p);
          break;
        }
        case "original":
          await original();
          break;
        case "close":
          onClose();
          break;
        default:
          throw Error();
      }
      web.current?.injectJavaScript(
        "window.__readerReceive?.(" +
          JSON.stringify({ id, value }).replace(/</g, "\\u003c") +
          ");true;",
      );
    } catch {
      if (id !== undefined)
        web.current?.injectJavaScript(
          "window.__readerReceive?.(" +
            JSON.stringify({
              id,
              error: "Não foi possível concluir. Tente novamente.",
            }) +
            ");true;",
        );
    }
  }
  if (ready === null)
    return <ActivityIndicator style={{ flex: 1 }} color="#996c43" />;
  if (!ready)
    return book.source_type === "upload" && book.file_path?.endsWith(".pdf") ? (
      <UploadedPdf book={book} />
    ) : (
      <View style={{ flex: 1 }}>
        <Pressable onPress={() => void original()} style={{ padding: 16 }}>
          <Text>{error || "Abrir arquivo original"} ↗</Text>
        </Pressable>
        {book.source_type === "drive" && (
          <WebView
            source={{ uri: driveUrl(book, true) }}
            style={{ flex: 1 }}
            originWhitelist={["https://*"]}
            onShouldStartLoadWithRequest={(req) =>
              /^https:\/\/(drive|docs|accounts)\.google\.com\//.test(req.url) ||
              /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//.test(req.url)
            }
          />
        )}
      </View>
    );
  return (
    <WebView
      ref={web}
      source={{ html, baseUrl: "https://reader.biblioteca.invalid/" }}
      style={{ flex: 1, backgroundColor: "#f5efe4" }}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["https://reader.biblioteca.invalid", "about:blank"]}
      allowFileAccess={false}
      allowFileAccessFromFileURLs={false}
      allowUniversalAccessFromFileURLs={false}
      setSupportMultipleWindows={false}
      onMessage={(e) => void receive(e.nativeEvent.data)}
      onShouldStartLoadWithRequest={(req) => {
        if (
          req.url === "about:blank" ||
          req.url.startsWith("https://reader.biblioteca.invalid/")
        )
          return true;
        if (/^https:\/\//.test(req.url)) void Linking.openURL(req.url);
        return false;
      }}
      onError={() => setError("Reabra o leitor para tentar novamente.")}
    />
  );
}
