import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOPICS,
  displayTopic,
  bookMatches,
  roleCanEdit,
  parseOAuthCallback,
  publicationSection,
} from '../src/index.js';

test('topic labels preserve requested public names', () => {
  assert.equal(displayTopic('protoanalise'), 'Protoanálise');
  assert.equal(displayTopic('psicossofia'), 'Psicossofia');
  assert.equal(displayTopic('jung'), 'Psicologia Junguiana');
  assert.equal(TOPICS.length, 7);
});

test('bookMatches searches title, author and translator and applies topic', () => {
  const book = {
    title: 'Caráter & Neurose',
    authors: ['Claudio Naranjo'],
    translators: ['Ana Pessoa'],
    topics: ['eneagrama'],
  };
  assert.equal(bookMatches(book, 'naranjo', 'all'), true);
  assert.equal(bookMatches(book, 'ana', 'eneagrama'), true);
  assert.equal(bookMatches(book, 'caráter', 'socionics'), false);
});

test('roleCanEdit only enables admin and owner', () => {
  assert.equal(roleCanEdit('owner'), true);
  assert.equal(roleCanEdit('admin'), true);
  assert.equal(roleCanEdit('member'), false);
  assert.equal(roleCanEdit(null), false);
});

test('parseOAuthCallback accepts PKCE query code and implicit fragment tokens', () => {
  assert.deepEqual(parseOAuthCallback('bibliotecadatipologia://auth/callback?code=abc123'), { code: 'abc123' });
  assert.deepEqual(
    parseOAuthCallback('bibliotecadatipologia://auth/callback#access_token=a&refresh_token=r'),
    { access_token: 'a', refresh_token: 'r' },
  );
});

test('publicationSection maps base_text to Leituras', () => {
  assert.equal(publicationSection('base_text'), 'Leituras');
  assert.equal(publicationSection('article'), 'Artigos');
});
