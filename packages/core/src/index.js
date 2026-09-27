export const TOPICS = Object.freeze([
  { key: 'mbti', label: 'MBTI' },
  { key: 'eneagrama', label: 'Eneagrama' },
  { key: 'protoanalise', label: 'Protoanálise' },
  { key: 'socionics', label: 'Socionics' },
  { key: 'jung', label: 'Psicologia Junguiana' },
  { key: 'neurotype', label: 'Neurotype' },
  { key: 'psicossofia', label: 'Psicossofia' },
]);

const labelMap = new Map(TOPICS.map((topic) => [topic.key, topic.label]));

export function displayTopic(key) {
  return labelMap.get(key) ?? key ?? '';
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function bookMatches(book, query = '', topic = 'all') {
  const topicOk = topic === 'all' || (book?.topics ?? []).includes(topic);
  if (!topicOk) return false;

  const q = normalizeText(query);
  if (!q) return true;

  const haystack = normalizeText([
    book?.title,
    ...(book?.authors ?? []),
    ...(book?.translators ?? []),
  ].join(' '));

  return haystack.includes(q);
}

export function roleCanEdit(role) {
  return role === 'owner' || role === 'admin';
}

export function parseOAuthCallback(url) {
  if (!url) return {};
  const [beforeHash, hash = ''] = String(url).split('#', 2);
  let code = null;
  try {
    code = new URL(beforeHash).searchParams.get('code');
  } catch {
    const q = beforeHash.split('?')[1] ?? '';
    code = new URLSearchParams(q).get('code');
  }
  if (code) return { code };

  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) return { access_token, refresh_token };
  return {};
}

export function publicationSection(kind) {
  return kind === 'base_text' ? 'Leituras' : 'Artigos';
}
