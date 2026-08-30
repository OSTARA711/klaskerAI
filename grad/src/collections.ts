// src/collections.ts
export interface CollectionPage {
  title: string;
  sourcePath: string;
  date?: string;       // optional ISO date string
  collection?: string;
  order?: number;      // optional manual order
  [key: string]: any;  // for other frontmatter fields
}

export interface Collection {
  name: string;
  pages: CollectionPage[];
}

export type SortKey = "date" | "title" | "order";
export type SortDirection = "asc" | "desc";

export class CollectionRegistry {
  private collections: Map<string, Collection> = new Map();
  private defaultSort: { key: SortKey; dir: SortDirection } = {
    key: "date",
    dir: "desc",
  };

  addPage(page: CollectionPage) {
    if (!page.collection) page.collection = "uncategorized";

    const name = page.collection;
    if (!this.collections.has(name)) {
      this.collections.set(name, { name, pages: [] });
    }
    this.collections.get(name)!.pages.push(page);
  }

  getAll(): Collection[] {
    return Array.from(this.collections.values());
  }

  getCollection(name: string): Collection | undefined {
    return this.collections.get(name);
  }

  setDefaultSort(key: SortKey, dir: SortDirection) {
    this.defaultSort = { key, dir };
  }

  sortCollections(sortKey?: SortKey, direction?: SortDirection) {
    const key = sortKey || this.defaultSort.key;
    const dir = direction || this.defaultSort.dir;

    for (const collection of this.collections.values()) {
      collection.pages.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (key) {
          case "date":
            aValue = a.date ? new Date(a.date).getTime() : 0;
            bValue = b.date ? new Date(b.date).getTime() : 0;
            break;
          case "title":
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case "order":
            aValue = a.order ?? 0;
            bValue = b.order ?? 0;
            break;
        }

        if (aValue < bValue) return dir === "asc" ? -1 : 1;
        if (aValue > bValue) return dir === "asc" ? 1 : -1;
        return 0;
      });
    }
  }
}
