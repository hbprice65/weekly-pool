import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Abbreviates a pool name to a clean, compact badge string (e.g. '26 NWP, GOL, DTC).
 */
export function getPoolAbbreviation(name?: string): string {
  if (!name) return "POOL";
  const trimmed = name.trim();
  if (trimmed.length <= 5) return trimmed.toUpperCase();

  // Strip apostrophe-s and punctuation
  const clean = trimmed
    .replace(/['’]s\b/gi, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase();
  }

  // If first word is a 4-digit year like "2026"
  if (/^\d{4}$/.test(words[0])) {
    const yearPart = `'${words[0].slice(2)}`;
    const remaining = words.slice(1);
    const inits = remaining.map((w) => w[0].toUpperCase()).join("");
    return `${yearPart} ${inits}`.trim();
  }

  // If first word is a 2-digit year like "'26" or "26"
  if (/^\d{2}$/.test(words[0])) {
    const yearPart = `'${words[0]}`;
    const remaining = words.slice(1);
    const inits = remaining.map((w) => w[0].toUpperCase()).join("");
    return `${yearPart} ${inits}`.trim();
  }

  // Otherwise, take first letter of each word (up to 5 chars)
  const initials = words.map((w) => w[0].toUpperCase()).join("");
  return initials.slice(0, 5);
}

