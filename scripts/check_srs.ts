import { calculateSRS, capUntilProven, DISTINCT_SENTENCES_TO_TRUST } from "../src/lib/srs";

let bad = 0;
const check = (label: string, ok: boolean) => {
  if (!ok) { console.log(`   ✗ ${label}`); bad++; }
};

const N = 6;
let card = { easeFactor: 2.5, interval: 1, repetitions: 0, nextReview: new Date(), streak: 0 };
let totalReviews = 0;
const seenOld = new Set<number>(), seenNew = new Set<number>();
for (let i = 0; i < N; i++) {
  seenOld.add(card.repetitions % N);
  seenNew.add(totalReviews % N);
  card = calculateSRS(card, 1);
  totalReviews++;
}
console.log(`── rotation après ${N} échecs ──`);
console.log(`   ancienne logique : ${seenOld.size} phrase(s) distincte(s) vue(s)`);
console.log(`   nouvelle logique : ${seenNew.size} phrase(s) distincte(s) vue(s)`);
check("la rotation doit couvrir toutes les phrases malgré les échecs", seenNew.size === N);
check("l'ancienne logique restait bien bloquée (sinon ce test ne prouve rien)", seenOld.size === 1);

console.log(`\n── plafond d'intervalle (seuil ${DISTINCT_SENTENCES_TO_TRUST} phrases) ──`);
let c2 = { easeFactor: 2.5, interval: 1, repetitions: 0, nextReview: new Date(), streak: 0 };
for (let i = 0; i < 4; i++) c2 = calculateSRS(c2, 5);
console.log(`   intervalle brut après 4 réussites : ${c2.interval} jours`);
check("une seule phrase réussie → intervalle bridé", capUntilProven(c2.interval, 1) <= 7);
check("deux phrases → toujours bridé", capUntilProven(c2.interval, 2) <= 7);
check("trois phrases → plus de bridage", capUntilProven(c2.interval, 3) === c2.interval);
check("le plafond ne rallonge jamais un intervalle court", capUntilProven(3, 0) === 3);

console.log(bad === 0 ? "\n✅ Tout passe." : `\n❌ ${bad} problème(s).`);
process.exit(bad === 0 ? 0 : 1);
