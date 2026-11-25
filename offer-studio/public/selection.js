// Czyste funkcje wyboru kafelków (bez DOM), wspólne dla przeglądarki i testów.

// Zostawia tylko kafelki, które istnieją i można je wybrać. Kafelek usunięty albo „wkrótce”
// nie ma przycisku w wyborze, więc bez tego nie dałoby się go odznaczyć i zapis by się nie udał.
export const cleanSelection = (ids, tiles) => {
  const ok = new Set(tiles.filter((t) => t.status !== 'soon').map((t) => t.id));
  return (ids || []).filter((id) => ok.has(id));
};
