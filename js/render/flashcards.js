// ════════════════════════════════════════
// ── Flashcard View Renderer ──
// ════════════════════════════════════════

import { loadDecks, loadCards, getDueCards, getDeckStats } from '../flashcards.js';

export function renderFlashcardsView(ctx) {
  try {
    return _renderInner(ctx);
  } catch (err) {
    console.error('[render] Flashcards failed:', err);
    return `<div style="padding:24px;color:#e94560">Flashcard render error: ${ctx.escapeHtml(String(err))}</div>`;
  }
}

function _renderInner(ctx) {
  const { escapeHtml, state } = ctx;
  const decks = loadDecks();
  const studying = state.flashcardStudyDeck;
  const flipped  = state.flashcardFlipped;

  // ── Study Mode ──
  if (studying) {
    return _renderStudyMode(ctx, studying);
  }

  // ── Deck Overview ──
  const totalDue = getDueCards().length;

  let html = `<div class="view-page">
    <div class="view-page-header">
      <h1 class="view-page-title">🧠 Flashcards</h1>
      <div class="view-page-sub">${totalDue} card${totalDue !== 1 ? 's' : ''} due for review today</div>
    </div>`;

  // All-decks study button
  if (totalDue > 0) {
    html += `<button class="data-btn" data-action="startFlashcardStudy" data-deck-id=""
      style="width:100%;margin-bottom:16px;color:#00d2ff;border-color:#00d2ff44;padding:12px;font-size:13px;font-weight:600">
      ▶ Study All Due Cards (${totalDue})
    </button>`;
  }

  // Deck list
  if (decks.length > 0) {
    html += `<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">`;
    decks.forEach(deck => {
      const stats = getDeckStats(deck.id);
      const dueCount = getDueCards(deck.id).length;
      html += `<div class="home-card" style="cursor:pointer" data-action="startFlashcardStudy" data-deck-id="${escapeHtml(deck.id)}">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-weight:600;font-size:14px;color:var(--text-bright)">${escapeHtml(deck.name)}</div>
            <div style="font-size:11px;color:var(--dim);margin-top:2px">
              ${stats.total} cards &middot; ${stats.learned} learned &middot; ${dueCount} due
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${dueCount > 0 ? `<span style="background:#00d2ff22;color:#00d2ff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600">${dueCount} due</span>` : '<span style="color:#00e676;font-size:11px">✓ All done</span>'}
            <button class="editor-remove-btn" data-action="removeFlashcardDeck" data-deck-id="${escapeHtml(deck.id)}" title="Delete deck">✕</button>
          </div>
        </div>
        ${_renderDeckCardList(deck.id, escapeHtml)}
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="home-card" style="text-align:center;padding:32px">
      <div style="font-size:32px;margin-bottom:12px">🧠</div>
      <div style="color:var(--text-bright);font-weight:600;margin-bottom:6px">No flashcard decks yet</div>
      <div style="color:var(--dim);font-size:12px">Create a deck to start reviewing with spaced repetition</div>
    </div>`;
  }

  // Add deck form
  html += `<div class="home-card">
    <div class="home-card-label">+ New Deck</div>
    <div style="display:flex;gap:8px;margin-top:8px">
      <input id="fc-new-deck-name" type="text" placeholder="Deck name (e.g. Linear Algebra)"
        style="flex:1;font-family:inherit;font-size:13px;background:var(--bg);color:var(--text);
        border:1px solid var(--border);border-radius:8px;padding:9px 12px;outline:none"
        data-key-action="addFlashcardDeckOnEnter">
      <button class="data-btn" data-action="addFlashcardDeck"
        style="padding:9px 16px;color:#00d2ff;border-color:#00d2ff44">Add</button>
    </div>
  </div>

  </div>`;

  return html;
}

function _renderDeckCardList(deckId, escapeHtml) {
  const cards = loadCards().filter(c => c.deckId === deckId);
  if (cards.length === 0) {
    return `<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
      <div style="font-size:11px;color:var(--dim);margin-bottom:8px">No cards yet. Add some:</div>
      ${_renderAddCardForm(deckId, escapeHtml)}
    </div>`;
  }
  // Show up to 3 cards + add form
  const preview = cards.slice(0, 3);
  const extra   = cards.length - preview.length;
  return `<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
    ${preview.map(c => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:11px">
      <span style="flex:1;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(c.front)}</span>
      <button class="editor-remove-btn" data-action="removeFlashcard" data-card-id="${escapeHtml(c.id)}" title="Delete card">✕</button>
    </div>`).join('')}
    ${extra > 0 ? `<div style="font-size:10px;color:var(--dim);margin-bottom:8px">+${extra} more cards</div>` : ''}
    ${_renderAddCardForm(deckId, escapeHtml)}
  </div>`;
}

function _renderAddCardForm(deckId, escapeHtml) {
  return `<div style="display:flex;flex-direction:column;gap:6px">
    <input id="fc-front-${escapeHtml(deckId)}" type="text" placeholder="Front (question)"
      style="font-family:inherit;font-size:11px;background:var(--bg);color:var(--text);
      border:1px solid var(--border);border-radius:6px;padding:7px 10px;outline:none">
    <input id="fc-back-${escapeHtml(deckId)}" type="text" placeholder="Back (answer)"
      style="font-family:inherit;font-size:11px;background:var(--bg);color:var(--text);
      border:1px solid var(--border);border-radius:6px;padding:7px 10px;outline:none">
    <button class="data-btn" data-action="addFlashcard" data-deck-id="${escapeHtml(deckId)}"
      style="font-size:11px;padding:6px 12px">+ Add Card</button>
  </div>`;
}

// ── Study Mode ──
function _renderStudyMode(ctx, deckId) {
  const { escapeHtml, state } = ctx;
  const due = getDueCards(deckId || null);

  if (due.length === 0) {
    const deck = loadDecks().find(d => d.id === deckId);
    return `<div class="view-page">
      <div class="view-page-header">
        <h1 class="view-page-title">🧠 ${escapeHtml(deck?.name ?? 'Flashcards')}</h1>
      </div>
      <div class="home-card" style="text-align:center;padding:40px">
        <div style="font-size:40px;margin-bottom:16px">🎉</div>
        <div style="font-size:16px;font-weight:700;color:#00e676;margin-bottom:8px">All done for today!</div>
        <div style="font-size:12px;color:var(--dim);margin-bottom:20px">Great work — come back tomorrow for more review.</div>
        <button class="data-btn" data-action="exitFlashcardStudy" style="padding:10px 24px;color:#00d2ff;border-color:#00d2ff44">
          ← Back to Decks
        </button>
      </div>
    </div>`;
  }

  const card     = due[0];
  const isFlipped = !!state.flashcardFlipped;
  const remaining = due.length;

  return `<div class="view-page">
    <div class="view-page-header">
      <h1 class="view-page-title">🧠 Flashcards</h1>
      <div class="view-page-sub">${remaining} card${remaining !== 1 ? 's' : ''} remaining</div>
    </div>

    <div style="max-width:500px;margin:0 auto">
      <!-- Card -->
      <div class="fc-card ${isFlipped ? 'fc-card--flipped' : ''}"
        data-action="flipFlashcard" style="cursor:pointer;margin-bottom:16px">
        <div class="fc-card-side fc-card-front">
          <div class="fc-card-label">Question</div>
          <div class="fc-card-text">${escapeHtml(card.front)}</div>
          <div class="fc-tap-hint">Tap to reveal →</div>
        </div>
        ${isFlipped ? `<div class="fc-card-side fc-card-back">
          <div class="fc-card-label">Answer</div>
          <div class="fc-card-text">${escapeHtml(card.back)}</div>
        </div>` : ''}
      </div>

      ${isFlipped ? `
      <!-- Rating buttons -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
        <button class="data-btn" data-action="rateFlashcard" data-card-id="${escapeHtml(card.id)}" data-rating="0"
          style="padding:10px 4px;font-size:11px;color:#e94560;border-color:#e9456044;flex-direction:column;gap:2px">
          <span>Again</span><span style="font-size:9px;color:var(--dim)">&lt;1d</span>
        </button>
        <button class="data-btn" data-action="rateFlashcard" data-card-id="${escapeHtml(card.id)}" data-rating="1"
          style="padding:10px 4px;font-size:11px;color:#ffab00;border-color:#ffab0044;flex-direction:column;gap:2px">
          <span>Hard</span><span style="font-size:9px;color:var(--dim)">short</span>
        </button>
        <button class="data-btn" data-action="rateFlashcard" data-card-id="${escapeHtml(card.id)}" data-rating="2"
          style="padding:10px 4px;font-size:11px;color:#00d2ff;border-color:#00d2ff44;flex-direction:column;gap:2px">
          <span>Good</span><span style="font-size:9px;color:var(--dim)">medium</span>
        </button>
        <button class="data-btn" data-action="rateFlashcard" data-card-id="${escapeHtml(card.id)}" data-rating="3"
          style="padding:10px 4px;font-size:11px;color:#00e676;border-color:#00e67644;flex-direction:column;gap:2px">
          <span>Easy</span><span style="font-size:9px;color:var(--dim)">long</span>
        </button>
      </div>` : `
      <div style="text-align:center;padding:16px">
        <button class="data-btn" data-action="flipFlashcard"
          style="padding:12px 32px;color:#00d2ff;border-color:#00d2ff44;font-size:14px">
          Reveal Answer
        </button>
      </div>`}

      <div style="text-align:center">
        <button class="data-btn" data-action="exitFlashcardStudy"
          style="color:var(--dim);border-color:var(--border);font-size:11px;padding:7px 16px">
          ← Exit Study Session
        </button>
      </div>
    </div>
  </div>`;
}
