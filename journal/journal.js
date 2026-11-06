(function () {
  const app = document.getElementById("app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const FONDATION = "2026-11-01";
  const TZ = "Europe/Paris";
  const ORDRE = ["Business", "Finance", "Événementiel", "Tech", "Monde", "Nice & Côte d'Azur", "Sport"];
  const SLUG = { Business: "economie", Finance: "finance", "Événementiel": "evenementiel", Tech: "tech", Monde: "international", "Nice & Côte d'Azur": "nice", Sport: "sport" };
  const FROM_SLUG = Object.fromEntries(Object.entries(SLUG).map(([k, v]) => [v, k]));

  const I18N = {
    fr: {
      locale: "fr-FR",
      menu: "Rubriques",
      home: "À la une",
      live: "En continu",
      now: "À l'instant",
      founded: "Le quotidien de la Baie des Anges. Fondé à Nice en 2026.",
      loading: "Chargement de l'édition…",
      empty: "Aucun article pour le moment.",
      error: "Impossible de charger l'édition.",
      by: "Par",
      published: "Publié le",
      review: "Revue de presse",
      sources: "Sources",
      source: "Source",
      read: "Lire l'article",
      edition: "",
      numero: "N°",
      team: "La rédaction",
      sectionsTitle: "Rubriques",
      about: "À propos",
      archives: "Archives",
      archivesChapo: "Les grands événements de la Côte d'Azur depuis 2020, de Nice à Monaco, de Cannes à l'arrière-pays.",
      archivesFr: "",
      fromArchives: "Dans nos archives",
      local: "L'actualité de la Côte d'Azur",
      allArchives: "Toutes les archives ›",
      history: "Notre histoire",
      legal: "Mentions légales",
      sourcesNote: "Nos articles s'appuient sur les informations des médias cités en source, accessibles en fin d'article.",
      more: "Toute la rubrique ›",
      alsoTitle: "À lire aussi",
      portrait: "Portrait",
      photo: "Photo",
      sections: { Business: "Économie", Finance: "Finance", "Événementiel": "Événementiel", Tech: "Tech", Monde: "International", "Nice & Côte d'Azur": "Nice & Côte d'Azur", Sport: "Sport" },
    },
    en: {
      locale: "en-GB",
      menu: "Sections",
      home: "Front page",
      live: "Live",
      now: "Just in",
      founded: "The daily of the Baie des Anges. Founded in Nice in 2026.",
      loading: "Loading today's edition…",
      empty: "No articles yet.",
      error: "Could not load the edition.",
      by: "By",
      published: "Published on",
      review: "Press review",
      sources: "Sources",
      source: "Source",
      read: "Read the article",
      edition: "",
      numero: "No.",
      team: "Our newsroom",
      sectionsTitle: "Sections",
      about: "About",
      archives: "Archives",
      archivesChapo: "The Riviera's major events since 2020, from Nice to Monaco and from Cannes to the hinterland.",
      archivesFr: "Our archives are currently available in French only.",
      fromArchives: "From our archives",
      local: "Riviera news",
      allArchives: "All archives ›",
      history: "Our story",
      legal: "Legal notice",
      sourcesNote: "Our articles draw on reporting by the outlets credited as sources, listed at the end of each article.",
      more: "Whole section ›",
      alsoTitle: "Also worth reading",
      portrait: "Profile",
      photo: "Photo",
      sections: { Business: "Business", Finance: "Finance", "Événementiel": "Events", Tech: "Tech", Monde: "World", "Nice & Côte d'Azur": "Nice & the Riviera", Sport: "Sport" },
    },
  };

  const REDACTION = [
    ["Camille Rostand", "Business"], ["Hugo Marchetti", "Finance"], ["Léa Fontaine", "Événementiel"],
    ["Nathan Belkacem", "Tech"], ["Sofia Delmas", "Monde"], ["Lucas Giordano", "Nice & Côte d'Azur"], ["Inès Morel", "Sport"],
  ];

  // Langue : ?lang=en, sinon choix mémorisé, sinon langue du navigateur.
  let lang = new URLSearchParams(location.search).get("lang");
  if (!I18N[lang]) { try { lang = localStorage.getItem("journal-lang"); } catch (e) { lang = null; } }
  if (!I18N[lang]) lang = (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
  let T = I18N[lang];

  let articles = [];
  let photos = {};
  const langOf = (a) => a.lang || "fr";
  const visibles = () => articles.filter((a) => langOf(a) === lang);
  // Un article et sa traduction ont le même id, à la langue près (« 2026-11-05-en-… »).
  const twinKey = (a) => (langOf(a) === "en" ? a.id.replace(/^((?:archive-)?\d{4}-\d\d-\d\d)-en-/, "$1-") : a.id);
  const secName = (k) => T.sections[k] || k;

  const longDate = (d) => new Date(d + "T12:00:00Z").toLocaleDateString(T.locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const hhmm = (iso) => new Date(iso).toLocaleTimeString(T.locale, { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const artLink = (a, i) => `#a/${encodeURIComponent(a.id)}${i != null ? "/" + i : ""}`;
  const secLink = (k) => `#r/${SLUG[k]}`;
  const kicker = (a) => (a.type === "article" && a.rubrique && a.rubrique !== secName(a.section) ? `${secName(a.section)} · ${a.rubrique}` : secName(a.section));

  // ---------- Photos ----------
  // Photo propre à l'article, sinon une photo libre de droits de la rubrique
  // (la même pour un article et sa traduction).
  const hash = (str) => { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  function imageFor(a) {
    if (a.photo === false) return null; // sujets tragiques : pas de photo d'illustration
    if (a.image) return { src: a.image.src, credit: `${T.photo} : ${a.image.credit}`, legende: (a.image.legende || {})[lang] || "" };
    const pool = photos[a.section] || [];
    if (!pool.length) return null;
    const p = pool[hash(twinKey(a)) % pool.length];
    const origine = p.origine === "wikimedia" ? "Wikimedia Commons" : p.origine === "pexels" ? "Pexels" : p.origine;
    return { src: `img/stock/${p.fichier}`, credit: `${T.photo} : ${p.auteur} / ${origine} (${p.licence})`, href: p.page, legende: "" };
  }
  function figure(img, cls) {
    if (!img) return "";
    const credit = img.href ? `<a href="${esc(img.href)}" target="_blank" rel="noopener">${esc(img.credit)}</a>` : esc(img.credit);
    return `<figure class="fig ${cls || ""}"><img src="${esc(img.src)}" alt="${esc(img.legende)}" loading="lazy" decoding="async">
      <figcaption>${img.legende ? `<span>${esc(img.legende)}</span> ` : ""}<span class="credit">${credit}</span></figcaption></figure>`;
  }
  const thumb = (img, cls) => (img ? `<div class="thumb ${cls || ""}"><img src="${esc(img.src)}" alt="${esc(img.legende)}" loading="lazy" decoding="async"></div>` : "");

  // ---------- Éléments fixes ----------
  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = T[el.dataset.i18n]; });
    document.querySelectorAll(".langs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
    const d = longDate(today);
    document.getElementById("edition").textContent = d.charAt(0).toUpperCase() + d.slice(1);
    const n = Math.floor((Date.parse(today) - Date.parse(FONDATION)) / 864e5) + 1;
    document.getElementById("numero").textContent = `${T.numero} ${n}`;
    document.getElementById("year").textContent = today.slice(0, 4);
    const secLinks = ORDRE.map((k) => `<a href="${secLink(k)}" data-sec="${SLUG[k]}">${esc(secName(k))}</a>`).join("");
    const extra = `<a href="#archives" data-sec="archives">${esc(T.archives)}</a>`;
    document.getElementById("sections").innerHTML = `<a class="home" href="#">${esc(T.home)}</a>${secLinks}${extra}`;
    document.getElementById("drawer-nav").innerHTML = `<a href="#">${esc(T.home)}</a>${secLinks}${extra}<a href="#p/histoire">${esc(T.history)}</a><a href="#p/mentions">${esc(T.legal)}</a>`;
    document.getElementById("about-links").innerHTML = `<li><a href="#p/histoire">${esc(T.history)}</a></li><li><a href="#archives">${esc(T.archives)}</a></li><li><a href="#p/mentions">${esc(T.legal)}</a></li>`;
    document.getElementById("footer-sections").innerHTML = ORDRE.map((k) => `<li><a href="${secLink(k)}">${esc(secName(k))}</a></li>`).join("");
    document.getElementById("redaction").innerHTML = REDACTION.map(([nom, k]) => `<li><strong>${esc(nom)}</strong> · ${esc(secName(k))}</li>`).join("");
  }

  function markNav(slug) {
    document.querySelectorAll("#sections a").forEach((a) => {
      const on = slug ? a.dataset.sec === slug : a.classList.contains("home");
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  // ---------- Fil « En continu » ----------
  function liveItems() {
    const out = [];
    for (const a of visibles()) {
      if (a.type !== "revue") continue;
      (a.liens || []).forEach((l, i) => { if (l.heure) out.push({ a, l, i }); });
    }
    return out.sort((x, y) => (x.l.heure < y.l.heure ? 1 : -1)).slice(0, 8);
  }
  function renderLive() {
    const items = liveItems();
    if (!items.length) return "";
    return `<section class="live" aria-label="${esc(T.live)}"><div class="live-inner">
      <span class="live-label">${esc(T.live)}</span>
      <div class="live-track">${items.map(({ a, l, i }) => {
        const recent = Date.now() - Date.parse(l.heure) < 3600e3;
        return `<div class="live-item"><time datetime="${esc(l.heure)}">${esc(hhmm(l.heure))}</time>${recent ? `<span class="tag">${esc(T.now)}</span>` : ""}
          <a href="${artLink(a, i)}">${esc(l.titre)}</a></div>`;
      }).join("")}</div>
    </div></section>`;
  }

  // ---------- Accueil ----------
  function latestBySection() {
    const map = {};
    for (const a of visibles()) if (a.type === "revue" && !map[a.section]) map[a.section] = a;
    return map;
  }

  function renderHome() {
    markNav(null);
    const all = visibles();
    if (!all.length) { app.innerHTML = `<p class="loading">${esc(T.empty)}</p>`; return; }
    const bySec = latestBySection();
    const revues = ORDRE.map((k) => bySec[k]).filter(Boolean);
    // Les articles de la rédaction restent à la une 3 jours, puis vivent dans leur rubrique.
    const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
    const recents = all.filter((a) => a.type === "article" && (Date.parse(today) - Date.parse(a.date)) / 864e5 <= 3);
    const redaction = recents.filter((a) => a.heure).sort((x, y) => y.heure.localeCompare(x.heure));
    const leadRevue = revues.slice().sort((x, y) => ((y.liens[0] && y.liens[0].heure) || "").localeCompare((x.liens[0] && x.liens[0].heure) || ""))[0] || all[0];
    const lead = redaction[0] || leadRevue;
    const features = recents.filter((a) => !a.heure).slice(0, 1);
    const sideRevues = revues.filter((r) => r !== lead).slice(0, features.length ? 1 : 2);
    const blocks = revues.filter((r) => r !== lead && !sideRevues.includes(r));
    const autres = redaction.slice(5);

    const leadAlso = lead.type === "article"
      ? redaction.slice(1, 5).map((a) => ({ titre: a.titre, source: a.rubrique || secName(a.section), href: artLink(a) }))
      : (lead.liens || []).slice(1, 5).map((l, i) => ({ titre: l.titre, source: l.source, href: artLink(lead, i + 1) }));
    const leadHref = lead.type === "article" ? artLink(lead) : artLink(lead, lead.liens ? 0 : null);
    const featureHtml = (a, badge) => `<article class="feature">
        ${a.type === "article" ? `<a href="${artLink(a)}" tabindex="-1">${thumb(imageFor(a), "portrait")}</a>` : ""}
        <span>${badge ? `<span class="badge">${esc(badge)}</span>` : `<span class="kicker">${esc(kicker(a))}</span>`}</span>
        <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3>
        <p>${esc(a.chapo)}</p>
        <p class="byline">${esc(T.by)} ${esc(a.auteur)}</p>
      </article>`;

    app.innerHTML = `${renderLive()}
    <div class="home-page">
      <section class="top">
        <article class="lead">
          <span class="kicker">${esc(kicker(lead))}</span>
          <h2><a href="${leadHref}">${esc(lead.titre)}</a></h2>
          <div class="lead-body">
            <div>
              <p class="chapo">${esc(!lead.redige && lead.liens && lead.liens[0].resume ? lead.liens[0].resume : lead.chapo)}</p>
              <p class="byline">${esc(T.by)} ${esc(lead.auteur)} <span class="when">· ${esc(longDate(lead.date))}</span></p>
              ${imageFor(lead) ? `<a href="${leadHref}" tabindex="-1">${thumb(imageFor(lead), "lead-img")}</a>` : `<div class="wave" role="presentation"></div>`}
            </div>
            ${leadAlso.length ? `<ul class="also">${leadAlso.map((l) => `<li><a href="${l.href}">${esc(l.titre)}</a><span class="src">${esc(l.source)}</span></li>`).join("")}</ul>` : ""}
          </div>
        </article>
        <aside>
          ${features.map((a, i) => featureHtml(a, a.rubrique || T.portrait)).join("")}
          ${sideRevues.map((a) => featureHtml(a, null)).join("")}
        </aside>
      </section>
      ${autres.length ? `<section class="block">
        <div class="block-head"><h2>${esc(T.local)}</h2><a class="more" href="#r/nice">${esc(T.more)}</a></div>
        <div class="block-grid archives-grid">${autres.map((a) => `<div>${thumb(imageFor(a))}
          <span class="kicker">${esc(kicker(a))}</span>
          <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3><p>${esc(a.chapo)}</p></div>`).join("")}</div>
      </section>` : ""}
      ${blocks.map(renderBlock).join("")}
      ${renderArchivesBlock()}
    </div>`;
  }

  // Trois archives tirées au sort chaque jour (les mêmes pour tous les lecteurs).
  function archivesPool() {
    const own = articles.filter((a) => a.type === "archive" && langOf(a) === lang);
    return own.length ? own : articles.filter((a) => a.type === "archive");
  }
  function renderArchivesBlock() {
    const pool = archivesPool();
    if (!pool.length) return "";
    const seed = hash(new Date().toLocaleDateString("en-CA", { timeZone: TZ }));
    const picks = [];
    for (let i = 0; picks.length < Math.min(3, pool.length) && i < 50; i++) {
      const a = pool[(seed + i * 7919) % pool.length];
      if (!picks.includes(a)) picks.push(a);
    }
    return `<section class="block archives-block">
      <div class="block-head"><h2><a href="#archives">${esc(T.fromArchives)}</a></h2><a class="more" href="#archives">${esc(T.allArchives)}</a></div>
      <div class="block-grid archives-grid">${picks.map((a) => `<div>${thumb(imageFor(a))}
        <span class="kicker">${esc(secName(a.section))} · ${esc(longDate(a.date))}</span>
        <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3><p>${esc(a.chapo)}</p></div>`).join("")}</div>
    </section>`;
  }

  // ---------- Archives ----------
  function renderArchives() {
    markNav("archives");
    const own = articles.filter((a) => a.type === "archive" && langOf(a) === lang);
    const list = own.length ? own : articles.filter((a) => a.type === "archive");
    const parAn = {};
    for (const a of list) (parAn[a.date.slice(0, 4)] ||= []).push(a);
    const annees = Object.keys(parAn).sort().reverse();
    app.innerHTML = `<div class="rubrique-head"><h1>${esc(T.archives)}</h1><p class="rubrique-chapo">${esc(T.archivesChapo)}${!own.length && T.archivesFr ? " " + esc(T.archivesFr) : ""}</p></div>
      <nav class="years">${annees.map((y) => `<a href="#archives/${y}">${y}</a>`).join("")}</nav>
      <div class="list">${annees.map((y) => `<h2 class="year" id="y-${y}">${y}</h2>${parAn[y].map((a) => `<article class="list-item">
        <span class="kicker">${esc(secName(a.section))} · ${esc(longDate(a.date))}</span>
        <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3>
        <p>${esc(a.chapo)}</p></article>`).join("")}`).join("") || `<p class="loading">${esc(T.empty)}</p>`}</div>`;
  }

  // ---------- Pages fixes ----------
  function renderPage(key) {
    markNav(null);
    const page = (window.JOURNAL_PAGES || {})[key];
    if (!page) return renderHome();
    const P = page[lang] || page.fr;
    app.innerHTML = `<article class="article page"><h1>${esc(P.titre)}</h1><p class="chapo">${esc(P.chapo)}</p><div class="page-body">${P.html}</div></article>`;
    window.scrollTo(0, 0);
  }

  function renderBlock(a) {
    const [first, ...rest] = a.liens || [];
    if (!first) return "";
    const main = a.redige ? { titre: a.titre, resume: a.chapo, source: (a.sources || []).join(", ") } : first;
    const side = rest.slice(0, 2);
    return `<section class="block">
      <div class="block-head"><h2><a href="${secLink(a.section)}">${esc(secName(a.section))}</a></h2><a class="more" href="${secLink(a.section)}">${esc(T.more)}</a></div>
      <div class="block-grid">
        <div class="main">${thumb(imageFor(a))}<h3><a href="${artLink(a, 0)}">${esc(main.titre)}</a></h3>${main.resume ? `<p>${esc(main.resume)}</p>` : ""}<span class="src">${esc(T.by)} ${esc(a.auteur)}${a.redige ? "" : ` · ${esc(T.source)} : ${esc(main.source)}`}</span></div>
        ${side.map((l, i) => `<div class="side"><h3><a href="${artLink(a, i + 1)}">${esc(l.titre)}</a></h3><span class="src">${esc(l.source)}</span></div>`).join("")}
      </div>
    </section>`;
  }

  // ---------- Rubrique ----------
  function renderSection(key) {
    markNav(SLUG[key]);
    const list = visibles().filter((a) => a.section === key);
    app.innerHTML = `<div class="rubrique-head"><h1>${esc(secName(key))}</h1></div>
      <div class="list">${list.length ? list.map((a) => `<article class="list-item">
        <span class="kicker">${esc(a.type === "revue" ? (a.redige ? secName(a.section) : T.review) : a.rubrique)} · ${esc(longDate(a.date))}</span>
        <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3>
        <p>${esc(a.chapo)}</p>
        <p class="byline">${esc(T.by)} ${esc(a.auteur)}</p></article>`).join("") : `<p class="loading">${esc(T.empty)}</p>`}</div>`;
    window.scrollTo(0, 0);
  }

  // ---------- Article ----------
  function renderArticle(a, focus) {
    markNav(SLUG[a.section]);
    const revue = a.type === "revue" && !a.redige;
    const sources = a.sources && a.sources.length ? `<span class="sources">${esc(T.sources)} : ${esc(a.sources.join(", "))}</span>` : "";
    app.innerHTML = `<article class="article">
      <div class="crumbs">${a.type === "archive" ? `<a href="#archives">${esc(T.archives)}</a> · ` : ""}<a href="${secLink(a.section)}">${esc(secName(a.section))}</a>${revue ? ` · ${esc(T.review)}` : a.type === "article" && a.rubrique ? ` · ${esc(a.rubrique)}` : ""}</div>
      <h1>${esc(a.titre)}</h1>
      <p class="chapo">${esc(a.chapo)}</p>
      <div class="meta-line"><strong>${esc(T.by)} ${esc(a.auteur)}</strong><span class="when">${a.type === "archive" ? esc(longDate(a.date)) : `${esc(T.published)} ${esc(longDate(a.date))}`}</span>${sources}</div>
      ${figure(imageFor(a), a.image ? "hero-portrait" : "hero")}
      ${(a.corps || []).map((p) => `<p class="body">${esc(p)}</p>`).join("")}
      ${a.transparence ? `<p class="transparence">${esc(a.transparence)}</p>` : ""}
      ${a.galerie && a.galerie.length ? `<div class="galerie">${a.galerie.map((g) => figure({ src: g.src, credit: `${T.photo} : ${g.credit}`, legende: (g.legende || {})[lang] || "" })).join("")}</div>` : ""}
      ${(a.redige || a.type !== "revue") && a.liens && a.liens.length ? `<section class="sources-list"><h2>${esc(T.sources)}</h2><ul>${a.liens.map((l, i) => `
        <li id="info-${i}"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.titre)}</a> <span>— ${esc(l.source)}</span></li>`).join("")}</ul></section>` : ""}
      ${revue && a.liens && a.liens.length ? `<ol class="revue">${a.liens.map((l, i) => `
        <li id="info-${i}"><div>
          <h2>${esc(l.titre)}</h2>
          ${l.resume ? `<p>${esc(l.resume)}</p>` : ""}
          <span class="src">${l.heure ? `<time datetime="${esc(l.heure)}">${esc(hhmm(l.heure))}</time>` : ""}${esc(T.source)} : ${esc(l.source)} — <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(T.read)} ↗</a></span>
        </div></li>`).join("")}</ol>` : ""}
    </article>`;
    const target = focus != null && document.getElementById("info-" + focus);
    if (target && focus > 0) target.scrollIntoView(); else window.scrollTo(0, 0);
  }

  // ---------- Navigation ----------
  function route() {
    closeDrawer();
    const h = location.hash.slice(1);
    let m;
    if ((m = h.match(/^a\/([^/]+)(?:\/(\d+))?$/))) {
      const a = articles.find((x) => x.id === decodeURIComponent(m[1]));
      if (a) { if (langOf(a) !== lang) setLang(langOf(a), false); return renderArticle(a, m[2] != null ? +m[2] : null); }
    }
    if ((m = h.match(/^r\/([a-z]+)$/)) && FROM_SLUG[m[1]]) return renderSection(FROM_SLUG[m[1]]);
    if ((m = h.match(/^archives(?:\/(\d{4}))?$/))) {
      renderArchives();
      const y = m[1] && document.getElementById("y-" + m[1]);
      return y ? y.scrollIntoView() : window.scrollTo(0, 0);
    }
    if ((m = h.match(/^p\/([a-z]+)$/))) return renderPage(m[1]);
    renderHome();
  }

  function setLang(l, rerender = true) {
    lang = l; T = I18N[lang];
    try { localStorage.setItem("journal-lang", lang); } catch (err) { /* navigation privée */ }
    applyStatic();
    if (rerender) route();
  }

  // Changement de langue : on ouvre la traduction de l'article en cours s'il en a une.
  document.querySelector(".langs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.dataset.lang === lang) return;
    const m = location.hash.match(/^#a\/([^/]+)/);
    const current = m && articles.find((x) => x.id === decodeURIComponent(m[1]));
    const target = b.dataset.lang;
    if (current) {
      const twin = articles.find((x) => langOf(x) === target && twinKey(x) === twinKey(current))
        || articles.find((x) => langOf(x) === target && x.type === current.type && x.section === current.section && x.date === current.date);
      setLang(target, false);
      location.hash = twin ? `a/${encodeURIComponent(twin.id)}` : "";
      return;
    }
    setLang(target);
  });

  const drawer = document.getElementById("drawer");
  const menuBtn = document.getElementById("menu-btn");
  function closeDrawer() { drawer.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", () => {
    drawer.hidden = !drawer.hidden;
    menuBtn.setAttribute("aria-expanded", String(!drawer.hidden));
  });

  window.addEventListener("hashchange", route);
  applyStatic();
  const v = "?v=" + Date.now();
  Promise.all([
    fetch("articles.json" + v).then((r) => r.json()),
    fetch("img/stock/credits.json" + v).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ])
    .then(([data, credits]) => { articles = data; photos = credits || {}; route(); })
    .catch(() => { app.innerHTML = `<p class="loading">${esc(T.error)}</p>`; });
})();
