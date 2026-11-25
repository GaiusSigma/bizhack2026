# Base deck with swappable slots: design

Date: 2026-11-25. Area: `offer-studio/`. Approved in conversation.

## Why
Every client gets the same base presentation (the 8-slide deck "offer-pdf.pdf"). Only the swappable
elements on the slides change. Later, n8n will ask a language model to pick those elements from the
client's pains. The content of the library (elements and what they are linked to) comes later from the
team; this work builds only the foundation and creates no content.

## Decisions
- **One base deck.** A single scenario `base` replaces the Board and Champion scenarios. Role no longer
  changes which slides there are; it only affects values. Order (from the PDF): cover, problems (5),
  what Vault is (3), why (6 cards), use cases (6), what's included (3), comparison (7), contact (1).
- **Each slide says which tiles it answers** (`answers`: tile categories such as `pain`, optionally specific
  tile ids). Example: the problems slide answers the client's pains. Edited in Scenarios.
- **Each slot has a pool of elements**: blocks of one type or cards of one set. An element can be linked to
  tiles (its tags) and to solutions (`data.solutions`, solution block ids). Both are edited in Knowledge.
- **Highlighting:** an element is highlighted on a slide when it is linked to a client tile in a category the
  slide answers (directly, or through a linked solution that carries the tile).
- **API for n8n / the model:**
  - `GET /api/offers/:id/slots`: per slide its slots (kind, capacity, what the slide answers), current
    elements and every candidate with description, tiles, linked solutions and the client tiles it matches.
  - `PUT /api/offers/:id/slots`: the model's choice per slide, with an optional reason per element.
    Validated (element of the right kind, existing, at most capacity). Saved as chosen by the model and
    protected from recompute like manual edits.
- **Until a model chooses**, slots are filled by the existing tile-based ranking, so the deck is never empty.
- **UI:** the offer view shows what each slide answers, which elements match the client (highlighted), and
  the model's reason; the salesperson can still swap elements.

## Non-goals
Creating or changing library content; the n8n workflow and the model call; per-role slide sets.
