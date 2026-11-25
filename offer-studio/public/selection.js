// Pure tile-selection helpers (no DOM), shared by the browser and the tests.

// Keeps only tiles that exist and can be selected. A deleted or coming-soon tile has no button in the
// picker, so without this it could not be deselected and saving would fail.
export const cleanSelection = (ids, tiles) => {
  const ok = new Set(tiles.filter((t) => t.status !== 'soon').map((t) => t.id));
  return (ids || []).filter((id) => ok.has(id));
};
