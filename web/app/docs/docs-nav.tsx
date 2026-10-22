"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./docs.module.css";

type Groups = { group: string; pages: { slug: string; title: string }[] }[];

function List({ groups, path }: { groups: Groups; path: string | null }) {
  return (
    <nav aria-label="Docs" className={styles.nav}>
      <Link href="/docs" className={styles.home} aria-current={path === "/docs" ? "page" : undefined}>
        Docs home
      </Link>
      {groups.map((g) => (
        <div key={g.group}>
          <p className={styles.group}>{g.group}</p>
          <ul>
            {g.pages.map((p) => {
              const href = `/docs/${p.slug}`;
              return (
                <li key={p.slug}>
                  <Link href={href} aria-current={path === href ? "page" : undefined}>
                    {p.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className={styles.group}>Course</p>
      <ul>
        <li>
          <Link href="/learn">Learn RL from zero</Link>
        </li>
      </ul>
    </nav>
  );
}

// Under 860px the list folds behind one row naming the current page, so an article opened
// from a link starts on the first screen instead of below fourteen nav links.
function Fold({ groups, path }: { groups: Groups; path: string | null }) {
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(path);
  if (openedOn !== path) {
    setOpenedOn(path);
    setOpen(false);
  }
  const current = groups.flatMap((g) => g.pages).find((p) => `/docs/${p.slug}` === path)?.title;
  return (
    <div className={styles.fold} data-open={open || undefined}>
      <button type="button" className={styles.toggle} aria-expanded={open} aria-controls="docs-nav" onClick={() => setOpen(!open)}>
        <span className={styles.toggleLabel}>Docs</span>
        <span className={styles.toggleCurrent}>{current ?? (path === "/docs" ? "Docs home" : "All pages")}</span>
        <span aria-hidden="true" className={styles.chevron} />
      </button>
      <div id="docs-nav" className={styles.foldBody}>
        <List groups={groups} path={path} />
      </div>
    </div>
  );
}

function Live({ groups }: { groups: Groups }) {
  return <Fold groups={groups} path={usePathname()} />;
}

export function DocsNav({ groups, static: isStatic = false }: { groups: Groups; static?: boolean }) {
  return isStatic ? <Fold groups={groups} path={null} /> : <Live groups={groups} />;
}
