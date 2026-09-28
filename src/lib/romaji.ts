const KATA_TO_HIRA_OFFSET = 0x30a1 - 0x3041;

export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - KATA_TO_HIRA_OFFSET)
  );
}

const ROMAJI: Record<string, string> = {
  a: "あ", i: "い", u: "う", e: "え", o: "お",
  ka: "か", ki: "き", ku: "く", ke: "け", ko: "こ",
  ga: "が", gi: "ぎ", gu: "ぐ", ge: "げ", go: "ご",
  sa: "さ", shi: "し", si: "し", su: "す", se: "せ", so: "そ",
  za: "ざ", ji: "じ", zi: "じ", zu: "ず", ze: "ぜ", zo: "ぞ",
  ta: "た", chi: "ち", ti: "ち", tsu: "つ", tu: "つ", te: "て", to: "と",
  da: "だ", di: "ぢ", du: "づ", de: "で", do: "ど",
  na: "な", ni: "に", nu: "ぬ", ne: "ね", no: "の",
  ha: "は", hi: "ひ", fu: "ふ", hu: "ふ", he: "へ", ho: "ほ",
  ba: "ば", bi: "び", bu: "ぶ", be: "べ", bo: "ぼ",
  pa: "ぱ", pi: "ぴ", pu: "ぷ", pe: "ぺ", po: "ぽ",
  ma: "ま", mi: "み", mu: "む", me: "め", mo: "も",
  ya: "や", yu: "ゆ", yo: "よ",
  ra: "ら", ri: "り", ru: "る", re: "れ", ro: "ろ",
  wa: "わ", wi: "ゐ", we: "ゑ", wo: "を", vu: "ゔ",
  kya: "きゃ", kyu: "きゅ", kyo: "きょ",
  gya: "ぎゃ", gyu: "ぎゅ", gyo: "ぎょ",
  sha: "しゃ", shu: "しゅ", sho: "しょ",
  sya: "しゃ", syu: "しゅ", syo: "しょ",
  ja: "じゃ", ju: "じゅ", jo: "じょ",
  jya: "じゃ", jyu: "じゅ", jyo: "じょ",
  zya: "じゃ", zyu: "じゅ", zyo: "じょ",
  cha: "ちゃ", chu: "ちゅ", cho: "ちょ",
  tya: "ちゃ", tyu: "ちゅ", tyo: "ちょ",
  nya: "にゃ", nyu: "にゅ", nyo: "にょ",
  hya: "ひゃ", hyu: "ひゅ", hyo: "ひょ",
  bya: "びゃ", byu: "びゅ", byo: "びょ",
  pya: "ぴゃ", pyu: "ぴゅ", pyo: "ぴょ",
  mya: "みゃ", myu: "みゅ", myo: "みょ",
  rya: "りゃ", ryu: "りゅ", ryo: "りょ",
  xa: "ぁ", xi: "ぃ", xu: "ぅ", xe: "ぇ", xo: "ぉ",
  xya: "ゃ", xyu: "ゅ", xyo: "ょ", xtsu: "っ", xtu: "っ",
  la: "ぁ", li: "ぃ", lu: "ぅ", le: "ぇ", lo: "ぉ",
  "-": "ー",
};

const VOWELS = "aiueo";

export function romajiToKana(input: string): string {
  const s = toHiragana(input.toLowerCase().trim());
  let out = "";
  let i = 0;

  while (i < s.length) {
    const c = s[i];

    if (!/[a-z'-]/.test(c)) { out += c; i++; continue; }

    if (c === "n") {
      const next = s[i + 1];
      if (next === "'") { out += "ん"; i += 2; continue; }
      if (next === "n" && i + 2 >= s.length) { out += "ん"; i += 2; continue; }
      if (next === undefined || (!VOWELS.includes(next) && next !== "y")) {
        out += "ん"; i++; continue;
      }
    }

    if (c === s[i + 1] && !VOWELS.includes(c) && c !== "n") {
      out += "っ"; i++; continue;
    }

    let matched = false;
    for (let len = 4; len >= 1; len--) {
      const chunk = s.slice(i, i + len);
      if (ROMAJI[chunk]) { out += ROMAJI[chunk]; i += len; matched = true; break; }
    }
    if (!matched) { out += c; i++; }
  }

  return out;
}

function norm(s: string): string {
  return toHiragana(
    (s || "")
      .trim()
      .replace(/（[ぁ-ゟァ-ヿー]+）/g, "")
      .replace(/\s+/g, "")
      .replace(/[。、，．,.!?！？]/g, "")
      .toLowerCase()
  );
}

export function matchesAnswer(input: string, answer: string, japanese?: string): boolean {
  const got = norm(input);
  if (!got) return false;

  const want = norm(answer);
  if (got === want) return true;

  const asKana = romajiToKana(got);
  if (asKana === want) return true;

  if (japanese) {
    const reading = answerReading(japanese, answer);
    if (reading) {
      const wantReading = norm(reading);
      if (got === wantReading || asKana === wantReading) return true;
    }
  }

  return false;
}

export function answerReading(japanese: string, answer: string): string | null {
  if (!japanese || !answer) return null;

  let plain = "";
  let kana = "";
  const startInKana: number[] = [];
  const endInKana: number[] = [];

  let i = 0;
  while (i < japanese.length) {
    const ch = japanese[i];
    const isKanji = /[一-鿿㐀-䶿々]/.test(ch);

    if (isKanji) {
      let j = i;
      while (j < japanese.length && /[一-鿿㐀-䶿々]/.test(japanese[j])) j++;
      const close = japanese[j] === "（" ? japanese.indexOf("）", j) : -1;

      if (close !== -1) {
        const reading = japanese.slice(j + 1, close);
        const kanaStart = kana.length;
        kana += reading;
        for (let k = i; k < j; k++) { startInKana.push(kanaStart); endInKana.push(kana.length); }
        plain += japanese.slice(i, j);
        i = close + 1;
        continue;
      }
      startInKana.push(kana.length); endInKana.push(kana.length + 1);
      plain += ch; kana += ch; i++;
      continue;
    }

    startInKana.push(kana.length); endInKana.push(kana.length + 1);
    plain += ch; kana += ch; i++;
  }

  const at = plain.indexOf(answer);
  if (at === -1) return null;
  const from = startInKana[at];
  const to = endInKana[at + answer.length - 1];
  if (from === undefined || to === undefined) return null;
  return kana.slice(from, to);
}
