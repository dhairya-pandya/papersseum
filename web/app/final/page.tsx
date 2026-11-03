import type { Metadata } from "next";
import { LeaderboardPodium } from "@/features/ladder/components/leaderboard-podium";
import type { LeaderRow } from "@/features/ladder/queries";
import { parseGenome } from "@/lib/character/genome";
import { FinalTable } from "./final-table";
import { FINAL_GAMES, FINAL_RESULTS } from "./results";

export const metadata: Metadata = { title: "Final results" };

// Same row shape as the leaderboard, so the podium and the bot tags are the ones the site already draws.
const rows: LeaderRow[] = FINAL_RESULTS.map((r) => ({
  rank: r.rank,
  botId: r.name,
  name: r.name,
  owner: r.owner,
  isHouse: false,
  rating: r.score,
  elo: r.score,
  sigma: 0,
  games: r.games,
  version: null,
  activeSince: null,
  appearance: parseGenome(r.appearance),
}));

export default function FinalPage() {
  return (
    <>
      <div className="section-head">
        <div>
          <h1>Final results</h1>
          <p className="muted small">
            Ranked by strength over {FINAL_GAMES.toLocaleString("en-GB")} games between final files. Ranks 3 to 6 are within the margin of error.
          </p>
        </div>
      </div>
      <LeaderboardPodium rows={rows} medals />
      <FinalTable rows={rows} />
    </>
  );
}
