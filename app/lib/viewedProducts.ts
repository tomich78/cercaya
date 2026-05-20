const CATS_KEY = "estamosCerca_viewed_cats";
const IDS_KEY  = "estamosCerca_viewed_ids";
const MAX_CATS = 6;
const MAX_IDS  = 20;

export function trackProductView(category: string, productId: string): void {
  try {
    const cats: string[] = (() => {
      try { return JSON.parse(localStorage.getItem(CATS_KEY) ?? "[]") as string[]; } catch { return []; }
    })();
    localStorage.setItem(CATS_KEY, JSON.stringify(
      [category, ...cats.filter(c => c !== category)].slice(0, MAX_CATS)
    ));

    const ids: string[] = (() => {
      try { return JSON.parse(localStorage.getItem(IDS_KEY) ?? "[]") as string[]; } catch { return []; }
    })();
    localStorage.setItem(IDS_KEY, JSON.stringify(
      [productId, ...ids.filter(i => i !== productId)].slice(0, MAX_IDS)
    ));
  } catch { /* localStorage bloqueado */ }
}

export function getViewedCategories(): string[] {
  try { return JSON.parse(localStorage.getItem(CATS_KEY) ?? "[]") as string[]; } catch { return []; }
}

export function getViewedProductIds(): string[] {
  try { return JSON.parse(localStorage.getItem(IDS_KEY) ?? "[]") as string[]; } catch { return []; }
}
