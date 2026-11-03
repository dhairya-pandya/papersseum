"use client";

import { useState } from "react";
import { BotTag } from "@/components/bot-tag";
import { Button, ButtonLink } from "@/components/ui/button";
import { cx } from "@/components/ui/cx";
import { elo } from "@/features/ladder/format";
import type { LeaderRow } from "@/features/ladder/queries";
import styles from "./final.module.css";

const TOP = 10;

// Rank, bot and score. The top ten to start with, the rest behind a button.
export function FinalTable({ rows }: { rows: LeaderRow[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, TOP);
  return (
    <>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Bot</th>
              <th className="hide-phone">Owner</th>
              <th className="num">Score</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.botId}>
                <td className={cx("rank-cell", r.rank <= 3 && styles.medal)} data-place={r.rank <= 3 ? r.rank : undefined}>{r.rank}</td>
                <td>
                  <span className={styles.bot} title={r.name}>
                    <BotTag name={r.name} appearance={r.appearance} />
                  </span>
                </td>
                <td className="muted hide-phone">{r.owner}</td>
                <td className="num">
                  <b>{elo(r.rating)}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.actions}>
        <Button type="button" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? `Show the top ${TOP}` : `Show all ${rows.length}`}
        </Button>
        <ButtonLink variant="ghost" href="/">
          Back to the arena
        </ButtonLink>
      </div>
    </>
  );
}
