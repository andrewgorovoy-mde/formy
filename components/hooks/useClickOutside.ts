"use client";

import { useEffect, type RefObject } from "react";

/**
 * Calls `onOutside` when a mousedown lands outside the referenced element. Used for dismissing
 * dropdown/menu popovers (account menu, accent picker, form card menu) on outside click.
 *
 * Listens on `mousedown` rather than `click` so the close happens before a click's own handler
 * runs on whatever was clicked — otherwise a click just outside the menu could both close it and
 * immediately trigger something behind it.
 */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, onOutside]);
}
