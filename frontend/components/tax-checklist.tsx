"use client";

import { useMemo, useState } from "react";
import type { Label } from "@/lib/api";

interface TaxChecklistProps {
  name: string;
  items: Label[];
  selected: string[];
  placeholder: string;
}

export function TaxChecklist({ name, items, selected, placeholder }: TaxChecklistProps) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(selected);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, query]);

  const pickedSet = new Set(picked);

  function toggle(slug: string, checked: boolean) {
    setPicked((current) => {
      if (checked) return current.includes(slug) ? current : [...current, slug];
      return current.filter((value) => value !== slug);
    });
  }

  return (
    <div className="tax-picker">
      <div className="tax-check-toolbar">
        <input
          className="tax-search"
          type="search"
          autoComplete="off"
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" className="tax-check-all" onClick={() => setPicked(items.map((item) => item.slug))}>
          Все {items.length}
        </button>
        <button type="button" className="tax-check-none" onClick={() => setPicked([])}>
          Сбросить
        </button>
      </div>
      <div className="tax-check-list" role="group">
        {visible.length ? (
          visible.map((item) => (
            <label key={item.slug} className="tax-check" title={item.description || item.name}>
              <input
                type="checkbox"
                checked={pickedSet.has(item.slug)}
                onChange={(event) => toggle(item.slug, event.target.checked)}
              />
              <span>{item.name}</span>
            </label>
          ))
        ) : (
          <p className="tax-check-empty">Ничего не найдено</p>
        )}
      </div>
      <p className="tax-check-meta">
        {picked.length} из {items.length}
      </p>
      <input type="hidden" name={name} value={picked.join(",")} />
    </div>
  );
}
