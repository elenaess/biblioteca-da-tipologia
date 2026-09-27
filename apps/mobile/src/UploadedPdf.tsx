import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import Pdf from "react-native-pdf";
import { repository } from "./client";
import type { Book } from "../../../packages/domain/src";
export default function UploadedPdf({ book }: { book: Book }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [page, setPage] = useState("");
  useEffect(() => {
    let alive = true;
    void repository
      ?.pdfUrl(book)
      .then((url) => {
        if (alive) setUrl(url);
      })
      .catch(() => {
        if (alive)
          setError(
            "Não foi possível carregar este arquivo. Volte e tente novamente.",
          );
      });
    return () => {
      alive = false;
    };
  }, [book.file_path]);
  async function external() {
    try {
      if (repository) await Linking.openURL(await repository.pdfUrl(book));
    } catch {
      setError("Não foi possível abrir o arquivo.");
    }
  }
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          padding: 12,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: "#6e5b42" }}>{page || "Carregando PDF…"}</Text>
        <Pressable onPress={() => void external()}>
          <Text style={{ color: "#914732" }}>Abrir arquivo ↗</Text>
        </Pressable>
      </View>
      {error ? (
        <Text style={{ padding: 20, color: "#963d2c" }}>{error}</Text>
      ) : url ? (
        <Pdf
          source={{ uri: url, cache: false }}
          trustAllCerts={false}
          style={{ flex: 1, backgroundColor: "#e9dfce" }}
          onPageChanged={(page, total) => setPage(page + " / " + total)}
          onError={() =>
            setError(
              "O PDF não pôde ser exibido. Use “Abrir arquivo” ou reabra o leitor.",
            )
          }
        />
      ) : (
        <ActivityIndicator color="#914732" />
      )}
    </View>
  );
}
