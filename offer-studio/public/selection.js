// Pure tile-selection helpers (no DOM), shared by the browser and the tests.

// Keeps only tiles that exist and can be selected. A deleted or coming-soon tile has no button in the
// picker, so without this it could not be deselected and saving would fail.
export const cleanSelection = (ids, tiles) => {
  const ok = new Set(tiles.filter((t) => t.status !== 'soon').map((t) => t.id));
  return (ids || []).filter((id) => ok.has(id));
};

// Same rule as src/generate.js: an element's tiles are its own tile tags plus those of its linked solutions.
export const elementTiles = (item, solutionsById) => {
  const tiles = (tags) => (tags || []).filter((t) => String(t).includes(':'));
  const linked = (item?.data?.solutions || []).flatMap((id) => tiles(solutionsById[id]?.tags));
  return [...new Set([...tiles(item?.tags), ...linked])];
};

// Client tiles an element matches on a slide that answers the given tile kinds (non-empty = highlighted).
export const slotMatches = (item, clientTiles, answers, solutionsById) =>
  elementTiles(item, solutionsById).filter((t) => clientTiles.includes(t) && answers.includes(t.split(':')[0]));
