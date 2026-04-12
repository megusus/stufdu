// ════════════════════════════════════════
// ── Flashcard System with SM-2 Algorithm ──
// ════════════════════════════════════════

import { Storage } from './storage.js';

// ── Storage ──
export function loadDecks()        { return Storage.get('flashcard-decks', []); }
export function saveDecks(decks)   { Storage.set('flashcard-decks', decks); }
export function loadCards()        { return Storage.get('flashcard-cards', []); }
export function saveCards(cards)   { Storage.set('flashcard-cards', cards); }

// ── SM-2 Spaced Repetition ──
// rating: 0=Again, 1=Hard, 2=Good, 3=Easy
export function sm2Rate(card, rating) {
  let { interval = 1, easiness = 2.5, repetitions = 0 } = card;

  if (rating < 2) {
    interval = 1;
    repetitions = 0;
  } else {
    if      (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else                        interval = Math.round(interval * easiness);
    repetitions++;
  }

  // Easiness factor adjustment (capped at minimum 1.3)
  easiness = Math.max(1.3, easiness + 0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  return {
    ...card,
    interval,
    easiness,
    repetitions,
    nextReview:   nextDate.toISOString().slice(0, 10),
    lastReviewed: new Date().toISOString().slice(0, 10),
  };
}

// ── Deck CRUD ──
export function addDeck(name, catId = null) {
  const decks = loadDecks();
  const deck = { id: 'deck-' + Date.now(), name: name.trim(), catId, createdAt: Date.now() };
  decks.push(deck);
  saveDecks(decks);
  return deck;
}

export function removeDeck(deckId) {
  saveDecks(loadDecks().filter(d => d.id !== deckId));
  saveCards(loadCards().filter(c => c.deckId !== deckId));
}

export function updateDeck(deckId, changes) {
  saveDecks(loadDecks().map(d => d.id === deckId ? { ...d, ...changes } : d));
}

// ── Card CRUD ──
export function addCard(deckId, front, back) {
  const cards = loadCards();
  const card = {
    id:          'card-' + Date.now(),
    deckId,
    front:       front.trim(),
    back:        back.trim(),
    interval:    1,
    easiness:    2.5,
    repetitions: 0,
    nextReview:  new Date().toISOString().slice(0, 10),
    lastReviewed: null,
    createdAt:   Date.now(),
  };
  cards.push(card);
  saveCards(cards);
  return card;
}

export function removeCard(cardId) {
  saveCards(loadCards().filter(c => c.id !== cardId));
}

export function updateCard(cardId, updates) {
  saveCards(loadCards().map(c => c.id === cardId ? { ...c, ...updates } : c));
}

// ── Queries ──
export function getDueCards(deckId = null) {
  const today = new Date().toISOString().slice(0, 10);
  return loadCards().filter(c =>
    (!deckId || c.deckId === deckId) &&
    (!c.nextReview || c.nextReview <= today)
  );
}

export function getDeckStats(deckId) {
  const cards = loadCards().filter(c => c.deckId === deckId);
  const today = new Date().toISOString().slice(0, 10);
  const due   = cards.filter(c => !c.nextReview || c.nextReview <= today).length;
  const learned = cards.filter(c => c.repetitions > 0).length;
  return { total: cards.length, due, learned };
}
