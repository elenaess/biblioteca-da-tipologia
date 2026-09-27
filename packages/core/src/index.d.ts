export type Topic = { key: string; label: string };
export const TOPICS: readonly Topic[];
export function displayTopic(key?: string | null): string;
export function normalizeText(value: unknown): string;
export function bookMatches(book: { title?: string; authors?: string[]; translators?: string[]; topics?: string[] }, query?: string, topic?: string): boolean;
export function roleCanEdit(role?: string | null): boolean;
export function parseOAuthCallback(url?: string | null): { code?: string; access_token?: string; refresh_token?: string };
export function publicationSection(kind?: string | null): string;
