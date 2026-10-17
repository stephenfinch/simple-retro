"use client";

import type { RetroStateDTO } from "@/lib/types";
import { EarlierActions } from "./action-items";
import { Board } from "./board";
import { Discuss } from "./discuss";
import { Guide } from "./guide";
import { TopBar } from "./header";
import { Summary } from "./summary";
import { RetroContext, useRetroSync } from "./use-retro";

export function RetroRoom({ initial, link, user }: { initial: RetroStateDTO; link: string; user: { name: string; email: string | null; color: string; isGuest: boolean } }) {
  const ctx = useRetroSync(initial);
  const step = ctx.state.retro.step;
  return (
    <RetroContext.Provider value={ctx}>
      <div className="flex min-h-dvh flex-col bg-canvas">
        <TopBar link={link} user={user} />
        {step !== "done" && <Guide />}
        {/* room for the phone action bar */}
        <main className={step === "done" ? "flex-1" : "flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0"}>
          {step === "write" && (
            <div className="pt-5">
              <EarlierActions />
            </div>
          )}
          {(step === "write" || step === "group" || step === "vote") && (
            <div className={step === "write" ? "" : "pt-5"}>
              <div className="mx-auto max-w-[1600px]">
                <Board />
              </div>
            </div>
          )}
          {step === "discuss" && <Discuss />}
          {step === "done" && <Summary />}
        </main>
      </div>
    </RetroContext.Provider>
  );
}
