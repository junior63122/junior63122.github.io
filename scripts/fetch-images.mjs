#!/usr/bin/env node
// Constitue une banque de photos libres de droits par rubrique, depuis Wikimedia Commons.
// Seules les licences libres (domaine public, CC0, CC BY, CC BY-SA) sont retenues ;
// l'auteur et la licence sont enregistrés pour être crédités sous chaque photo.
// Usage : node scripts/fetch-images.mjs [--refresh]
// Sans --refresh, les rubriques qui ont déjà assez de photos ne sont pas retéléchargées.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "journal", "img", "stock");
const CREDITS = join(DIR, "credits.json");
const PAR_RUBRIQUE = 5;
const UA = "EchoDesAnges/1.0 (https://junior63122.github.io/journal/) Node.js";

const RECHERCHES = {
  Business: ["La Défense Paris skyscrapers", "business meeting office", "container port cargo ship"],
  Finance: ["Euronext Paris Palais Brongniart", "stock exchange trading floor", "euro banknotes coins"],
  "Événementiel": ["concert crowd stage lights", "music festival crowd", "trade fair exhibition hall"],
  Tech: ["data center servers", "computer programming code screen", "smartphone app hands"],
  Monde: ["United Nations General Assembly hall", "flags of the world", "European Parliament Strasbourg hemicycle"],
  "Nice & Côte d'Azur": ["Promenade des Anglais Nice", "Nice France panorama Baie des Anges", "Monaco harbour Port Hercule"],
  Sport: ["Allianz Riviera stadium Nice", "football stadium match", "tennis court match"],
};

const LICENCES_OK = /^(cc0|public domain|pd|cc by(-sa)? \d|cc-by(-sa)?-\d)/i;
const stripHtml = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function chercher(q) {
  const url = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
    action: "query", format: "json", generator: "search", gsrnamespace: "6",
    gsrsearch: `${q} filetype:bitmap`, gsrlimit: "15",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1280",
  });
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const pages = Object.values((await res.json()).query?.pages || {});
  return pages.map((p) => {
    const ii = p.imageinfo?.[0] || {};
    const m = ii.extmetadata || {};
    return {
      titre: p.title,
      mime: ii.mime, w: ii.width, h: ii.height,
      thumb: ii.thumburl, page: ii.descriptionurl,
      licence: stripHtml(m.LicenseShortName?.value),
      licenceUrl: stripHtml(m.LicenseUrl?.value),
      auteur: stripHtml(m.Artist?.value).slice(0, 80),
      restrictions: stripHtml(m.Restrictions?.value),
    };
  }).filter((x) =>
    x.mime === "image/jpeg" && x.thumb && x.w >= 1200 && x.w > x.h * 1.2 &&
    LICENCES_OK.test(x.licence) && !/trademark|personality/i.test(x.restrictions) && x.auteur);
}

async function main() {
  const refresh = process.argv.includes("--refresh");
  mkdirSync(DIR, { recursive: true });
  const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, "utf8")) : {};

  for (const [rub, requetes] of Object.entries(RECHERCHES)) {
    const actuelles = (credits[rub] || []).filter((c) => c.origine === "wikimedia" && existsSync(join(DIR, c.fichier)));
    if (!refresh && actuelles.length >= PAR_RUBRIQUE) { console.log(`= ${rub} : ${actuelles.length} photos`); continue; }
    const retenues = refresh ? [] : actuelles;
    const vues = new Set(retenues.map((c) => c.page));
    for (const q of requetes) {
      if (retenues.length >= PAR_RUBRIQUE) break;
      let res = [];
      try { res = await chercher(q); } catch (e) { console.warn(`  ${rub} ✗ « ${q} » : ${e.message}`); continue; }
      for (const img of res) {
        if (retenues.length >= PAR_RUBRIQUE) break;
        if (vues.has(img.page)) continue;
        try {
          const r = await fetch(img.thumb, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const buf = Buffer.from(await r.arrayBuffer());
          const fichier = `${slug(rub)}-${retenues.length + 1}.jpg`;
          writeFileSync(join(DIR, fichier), buf);
          retenues.push({ fichier, origine: "wikimedia", auteur: img.auteur, licence: img.licence, licenceUrl: img.licenceUrl, page: img.page });
          vues.add(img.page);
          console.log(`+ ${rub} ← ${img.titre} (${img.licence}, ${img.auteur})`);
        } catch (e) { console.warn(`  ${rub} ✗ ${img.titre} : ${e.message}`); }
      }
    }
    // On conserve les photos ajoutées à la main (origine autre que wikimedia).
    credits[rub] = [...(credits[rub] || []).filter((c) => c.origine !== "wikimedia"), ...retenues];
  }
  writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + "\n");
}

main();
