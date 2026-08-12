"use client";

import { useSyncExternalStore } from "react";

export type AttributionModel = "first_click" | "last_click";

const KEY = "attribution_model";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setAttributionModel(model: AttributionModel): void {
  try {
    localStorage.setItem(KEY, model);
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): AttributionModel {
  if (typeof window === "undefined") return "last_click";
  const v = localStorage.getItem(KEY);
  return v === "first_click" ? "first_click" : "last_click";
}

/** Modelo de atribuição corrente (compartilhado entre componentes). */
export function useAttributionModel(): AttributionModel {
  return useSyncExternalStore(subscribe, getSnapshot, () => "last_click");
}
