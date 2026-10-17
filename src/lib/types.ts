export const STEPS = ["write", "group", "vote", "discuss", "done"] as const;
export type Step = (typeof STEPS)[number];

export const COLUMN_COLORS = ["green", "red", "blue", "amber", "violet", "pink"] as const;
export type ColumnColor = (typeof COLUMN_COLORS)[number];

export type Column = {
  id: string;
  title: string;
  prompt: string;
  color: ColumnColor;
};

export type RetroSettings = {
  /** How many votes each person gets. */
  votes: number;
  /** Show who wrote each card. */
  showAuthors: boolean;
  /** Keep other people's cards hidden while everyone writes. */
  hideWhileWriting: boolean;
};

export const DEFAULT_SETTINGS: RetroSettings = { votes: 3, showAuthors: false, hideWhileWriting: true };

export type Person = { id: string; name: string; color: string };

export type CardDTO = {
  id: string;
  columnId: string;
  groupId: string | null;
  /** Empty when the card is hidden from this viewer. */
  text: string;
  hidden: boolean;
  mine: boolean;
  author: Person | null;
  votes: number | null;
  myVotes: number;
};

export type GroupDTO = {
  id: string;
  columnId: string;
  title: string;
  votes: number | null;
  myVotes: number;
};

export type ActionDTO = {
  id: string;
  text: string;
  owner: Person | null;
  done: boolean;
  sourceId: string | null;
  retroId: string | null;
  retroTitle?: string | null;
  createdAt: string;
};

export type RetroStateDTO = {
  version: number;
  serverNow: string;
  ai: boolean;
  me: {
    id: string;
    name: string;
    isGuest: boolean;
    isFacilitator: boolean;
    canFacilitate: boolean;
    isTeamMember: boolean;
    votesLeft: number;
    ready: boolean;
  };
  retro: {
    id: string;
    title: string;
    teamId: string;
    teamName: string;
    step: Step;
    columns: Column[];
    settings: RetroSettings;
    facilitatorId: string;
    focusId: string | null;
    summary: string | null;
    createdAt: string;
    closedAt: string | null;
  };
  people: (Person & { online: boolean; typingAt: string | null; ready: boolean })[];
  cards: CardDTO[];
  groups: GroupDTO[];
  actions: ActionDTO[];
  /** Open action items from the team's earlier retros. */
  earlierActions: ActionDTO[];
};
