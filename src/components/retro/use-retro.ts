"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { RetroStateDTO } from "@/lib/types";

type Op = { type: string; [k: string]: unknown };
type OpResult = { ok: boolean; result?: unknown; error?: string };

export type RetroCtx = {
  state: RetroStateDTO;
  op: (type: string, payload?: Record<string, unknown>) => Promise<OpResult>;
  typing: () => void;
  connected: boolean;
  /** serverNow − clientNow, in ms */
  clockOffset: number;
};

export const RetroContext = createContext<RetroCtx | null>(null);

export function useRetro() {
  const ctx = useContext(RetroContext);
  if (!ctx) throw new Error("useRetro must be used inside the retro room");
  return ctx;
}

/** Keeps a retro in sync with the server by long-polling its version. */
export function useRetroSync(initial: RetroStateDTO): RetroCtx {
  const [state, setState] = useState(initial);
  const [connected, setConnected] = useState(true);
  const [clockOffset, setClockOffset] = useState(() => new Date(initial.serverNow).getTime() - Date.now());
  const versionRef = useRef(initial.version);
  const kick = useRef<AbortController | null>(null);
  const retroId = initial.retro.id;

  const apply = useCallback((s: RetroStateDTO) => {
    if (s.version < versionRef.current) return;
    versionRef.current = s.version;
    setClockOffset(new Date(s.serverNow).getTime() - Date.now());
    setState(s);
  }, []);

  useEffect(() => {
    let stopped = false;
    let failures = 0;
    const loop = async () => {
      while (!stopped) {
        const ctrl = new AbortController();
        kick.current = ctrl;
        try {
          const res = await fetch(`/api/retros/${retroId}/state?v=${versionRef.current}`, { signal: ctrl.signal, cache: "no-store" });
          if (res.status === 401 || res.status === 403 || res.status === 404) {
            if (res.status === 404) toast.error("This retro was deleted");
            stopped = true;
            break;
          }
          const json = await res.json();
          failures = 0;
          setConnected(true);
          if (!json.unchanged) apply(json as RetroStateDTO);
        } catch (e) {
          if ((e as Error).name === "AbortError") {
            if (stopped) break;
            continue;
          }
          failures++;
          if (failures > 1) setConnected(false);
          await new Promise((r) => setTimeout(r, Math.min(10_000, 500 * 2 ** failures)));
        }
      }
    };
    void loop();
    const onVis = () => {
      if (document.visibilityState === "visible") kick.current?.abort();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stopped = true;
      kick.current?.abort();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [retroId, apply]);

  const send = useCallback(
    async (ops: Op[], returnState = true) => {
      try {
        const res = await fetch(`/api/retros/${retroId}/ops`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ops, returnState }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false as const, error: (json.error as string) ?? "Something went wrong" };
        if (json.state) apply(json.state as RetroStateDTO);
        return { ok: true as const, results: json.results as unknown[] };
      } catch {
        return { ok: false as const, error: "You seem to be offline. Try again in a moment." };
      }
    },
    [retroId, apply],
  );

  const op = useCallback(
    async (type: string, payload: Record<string, unknown> = {}): Promise<OpResult> => {
      const r = await send([{ type, ...payload }]);
      if (!r.ok) {
        toast.error(r.error);
        return { ok: false, error: r.error };
      }
      return { ok: true, result: r.results?.[0] };
    },
    [send],
  );

  const lastTyping = useRef(0);
  const typing = useCallback(() => {
    const now = Date.now();
    if (now - lastTyping.current < 3000) return;
    lastTyping.current = now;
    void send([{ type: "typing" }], false);
  }, [send]);

  return useMemo(() => ({ state, op, typing, connected, clockOffset }), [state, op, typing, connected, clockOffset]);
}

/** The current time, refreshed every `ms` milliseconds. */
export function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
