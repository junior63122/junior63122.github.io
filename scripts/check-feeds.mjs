#!/usr/bin/env node
// Vérifie quels flux RSS de médias locaux répondent, et ce qu'ils contiennent.
// Usage : node scripts/check-feeds.mjs [url ...]   (DUMP=1 pour afficher toutes les infos)
import { parseFeed } from "./generate-news.mjs";

const CANDIDATS = process.argv.slice(2).length ? process.argv.slice(2) : [
  "https://www.nicematin.com/rss", "https://www.nicematin.com/rss.xml", "https://www.nicematin.com/feed",
  "https://www.nicematin.com/rss/nice", "https://www.nicematin.com/rss/cannes", "https://www.nicematin.com/rss/faits-divers",
  "https://www.monacomatin.mc/rss", "https://www.monacomatin.mc/rss.xml",
  "https://www.varmatin.com/rss",
  "https://www.cannesradio.fr/feed/", "https://cannesradio.fr/feed/",
  "https://www.bfmtv.com/rss/cote-d-azur/", "https://www.bfmtv.com/rss/nice/", "https://www.bfmtv.com/rss/info/flux-rss/flux-toutes-les-actualites/",
  "https://france3-regions.franceinfo.fr/provence-alpes-cote-d-azur/alpes-maritimes/rss", "https://france3-regions.franceinfo.fr/provence-alpes-cote-d-azur/rss",
  "https://www.francebleu.fr/rss/azur/infos.xml", "https://www.francebleu.fr/rss/azur/rubrique/infos.xml",
  "https://www.ouest-france.fr/rss/une", "https://www.ouest-france.fr/rss-en-continu.xml",
  "https://www.lepetitnicois.fr/feed/", "https://www.nice-premium.com/feed", "https://www.radio-monaco.com/feed/",
  "https://www.monaco-tribune.com/feed/", "https://www.riviera-radio.com/feed/", "https://www.tendanceouest.com/rss.xml",
];

for (const url of CANDIDATS) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; EchoDesAnges/1.0)" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    const txt = await res.text();
    const items = res.ok ? parseFeed(txt, url) : [];
    const avecResume = items.filter((i) => i.resume && i.resume.length > 40).length;
    console.log(`${res.ok && items.length ? "OK " : "-- "} ${res.status} ${String(items.length).padStart(3)} items, ${String(avecResume).padStart(3)} résumés  ${url}`);
    if (process.env.DUMP) {
      for (const i of items) console.log(`  * ${i.date ? new Date(i.date).toISOString().slice(0, 16) : "?"} | ${i.titre} | ${i.resume} | ${i.url}`);
    } else if (items[0]) console.log(`      ex : ${items[0].titre.slice(0, 90)} | ${items[0].resume.slice(0, 120)}`);
  } catch (e) {
    console.log(`ERR ${e.message.slice(0, 40)}  ${url}`);
  }
}
