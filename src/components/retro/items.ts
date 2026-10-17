import type { CardDTO, RetroStateDTO } from "@/lib/types";

/** Something people can vote on and discuss: a group of cards, or a card on its own. */
export type Item = {
  id: string;
  kind: "group" | "card";
  columnId: string;
  /** The group's name, or the card's text. */
  title: string;
  named: boolean;
  cards: CardDTO[];
  votes: number;
  myVotes: number;
};

export function itemsOf(state: RetroStateDTO): Item[] {
  const items: Item[] = [];
  for (const g of state.groups) {
    const cards = state.cards.filter((c) => c.groupId === g.id);
    if (!cards.length) continue;
    items.push({ id: g.id, kind: "group", columnId: g.columnId, title: g.title || cards[0].text, named: !!g.title, cards, votes: g.votes ?? 0, myVotes: g.myVotes });
  }
  for (const c of state.cards) {
    if (c.groupId) continue;
    items.push({ id: c.id, kind: "card", columnId: c.columnId, title: c.text, named: false, cards: [c], votes: c.votes ?? 0, myVotes: c.myVotes });
  }
  return items;
}

/** Most voted first; ties keep board order. */
export function rankedItems(state: RetroStateDTO) {
  const order = new Map(state.retro.columns.map((c, i) => [c.id, i]));
  return itemsOf(state)
    .map((item, i) => ({ item, i }))
    .sort((a, b) => b.item.votes - a.item.votes || (order.get(a.item.columnId) ?? 0) - (order.get(b.item.columnId) ?? 0) || a.i - b.i)
    .map((x) => x.item);
}
