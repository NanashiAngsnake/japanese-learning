"use client";

import React from "react";

const RE_RUBY = /([一-鿿々ヶ]+)（([ぁ-ゟァ-ヿー]+)）/g;

export function parseFurigana(text: string): React.ReactNode[] {
  if (!text) return [];
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  RE_RUBY.lastIndex = 0;
  while ((m = RE_RUBY.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const [, kanji, reading] = m;
    nodes.push(
      <ruby key={key++} className="group">
        {kanji}
        <rt className="rt">{reading}</rt>
      </ruby>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function Furigana({
  text,
  show = true,
  className = "",
}: {
  text: string;
  show?: boolean;
  className?: string;
}) {
  return (
    <span className={`${className} ${show ? "furigana-on" : "furigana-off"}`}>
      {parseFurigana(text)}
    </span>
  );
}
