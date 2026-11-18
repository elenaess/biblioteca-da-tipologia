import { useEffect, useState } from "react";
import type { Publication } from "../../../packages/domain/src";
import seeds from "../../../packages/domain/src/publications.json";
import { repository, useLibrary } from "./context";

export function usePublication(id?: string) {
  const { publications, user } = useLibrary();
  const summary = publications.find(item => item.id === id);
  const publicationId = summary?.id;
  const userId = user?.id;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    publicationId: string;
    userId?: string;
    attempt: number;
    item?: Publication;
    failed?: boolean;
  }>();
  useEffect(() => {
    if (!publicationId || !repository) return;
    let active = true;
    repository.publication(publicationId).then(
      item => { if (active) setResult({ publicationId, userId, attempt, item }); },
      () => { if (active) setResult({ publicationId, userId, attempt, failed: true }); },
    );
    return () => { active = false; };
  }, [publicationId, userId, attempt]);
  const current = result && result.publicationId === publicationId && result.userId === userId && result.attempt === attempt ? result : undefined;
  const item = repository ? current?.item : (seeds as Publication[]).find(p => p.id === id);
  return { item, pending: !!summary && !!repository && !current, failed: !!current?.failed,
    retry: () => setAttempt(n => n + 1) };
}
