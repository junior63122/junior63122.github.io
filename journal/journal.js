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
      sourcesNote: "Nos revues de presse sélectionnent l'essentiel de l'actualité et renvoient vers les articles des médias cités.",
      more: "Toute la rubrique ›",
      alsoTitle: "À lire aussi",
      portrait: "Portrait",
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
      sourcesNote: "Our press reviews pick out the day's essential news and link to the original articles of the outlets cited.",
      more: "Whole section ›",
      alsoTitle: "Also worth reading",
      portrait: "Profile",
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
  const langOf = (a) => a.lang || "fr";
  const visibles = () => articles.filter((a) => langOf(a) === lang);
  // Un article et sa traduction ont le même id, à la langue près (« 2026-11-05-en-… »).
  const twinKey = (id) => id.replace(/^(\d{4}-\d\d-\d\d)-[a-z]{2}-/, "$1-");
  const secName = (k) => T.sections[k] || k;

  const longDate = (d) => new Date(d + "T12:00:00Z").toLocaleDateString(T.locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const hhmm = (iso) => new Date(iso).toLocaleTimeString(T.locale, { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  const artLink = (a, i) => `#a/${encodeURIComponent(a.id)}${i != null ? "/" + i : ""}`;
  const secLink = (k) => `#r/${SLUG[k]}`;
  const kicker = (a) => (a.type === "article" && a.rubrique && a.rubrique !== secName(a.section) ? `${secName(a.section)} · ${a.rubrique}` : secName(a.section));

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
    document.getElementById("sections").innerHTML = `<a class="home" href="#">${esc(T.home)}</a>${secLinks}`;
    document.getElementById("drawer-nav").innerHTML = `<a href="#">${esc(T.home)}</a>${secLinks}`;
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
    const lead = revues.slice().sort((x, y) => ((y.liens[0] && y.liens[0].heure) || "").localeCompare((x.liens[0] && x.liens[0].heure) || ""))[0] || all[0];
    // Les articles maison restent à la une 3 jours, puis vivent dans leur rubrique.
    const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
    const features = all.filter((a) => a.type === "article" && (Date.parse(today) - Date.parse(a.date)) / 864e5 <= 3).slice(0, 1);
    const sideRevues = revues.filter((r) => r !== lead).slice(0, features.length ? 1 : 2);
    const blocks = revues.filter((r) => r !== lead && !sideRevues.includes(r));

    const leadAlso = (lead.liens || []).slice(1, 5);
    const featureHtml = (a, badge) => `<article class="feature">
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
          <h2><a href="${artLink(lead, lead.liens ? 0 : null)}">${esc(lead.titre)}</a></h2>
          <div class="lead-body">
            <div>
              <p class="chapo">${esc(lead.liens && lead.liens[0].resume ? lead.liens[0].resume : lead.chapo)}</p>
              <p class="byline">${esc(T.by)} ${esc(lead.auteur)} <span class="when">· ${esc(longDate(lead.date))}</span></p>
              <div class="wave" role="presentation"></div>
            </div>
            ${leadAlso.length ? `<ul class="also">${leadAlso.map((l, i) => `<li><a href="${artLink(lead, i + 1)}">${esc(l.titre)}</a><span class="src">${esc(l.source)}</span></li>`).join("")}</ul>` : ""}
          </div>
        </article>
        <aside>
          ${features.map((a, i) => featureHtml(a, a.rubrique || T.portrait)).join("")}
          ${sideRevues.map((a) => featureHtml(a, null)).join("")}
        </aside>
      </section>
      ${blocks.map(renderBlock).join("")}
    </div>`;
  }

  function renderBlock(a) {
    const [main, ...rest] = a.liens || [];
    if (!main) return "";
    const side = rest.slice(0, 2);
    return `<section class="block">
      <div class="block-head"><h2><a href="${secLink(a.section)}">${esc(secName(a.section))}</a></h2><a class="more" href="${secLink(a.section)}">${esc(T.more)}</a></div>
      <div class="block-grid">
        <div class="main"><h3><a href="${artLink(a, 0)}">${esc(main.titre)}</a></h3>${main.resume ? `<p>${esc(main.resume)}</p>` : ""}<span class="src">${esc(T.by)} ${esc(a.auteur)} · ${esc(T.source)} : ${esc(main.source)}</span></div>
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
        <span class="kicker">${esc(a.type === "revue" ? T.review : a.rubrique)} · ${esc(longDate(a.date))}</span>
        <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3>
        <p>${esc(a.chapo)}</p>
        <p class="byline">${esc(T.by)} ${esc(a.auteur)}</p></article>`).join("") : `<p class="loading">${esc(T.empty)}</p>`}</div>`;
    window.scrollTo(0, 0);
  }

  // ---------- Article ----------
  function renderArticle(a, focus) {
    markNav(SLUG[a.section]);
    const sources = a.sources && a.sources.length ? `<span class="sources">${esc(T.sources)} : ${esc(a.sources.join(", "))}</span>` : "";
    app.innerHTML = `<article class="article">
      <div class="crumbs"><a href="${secLink(a.section)}">${esc(secName(a.section))}</a>${a.type === "revue" ? ` · ${esc(T.review)}` : a.rubrique ? ` · ${esc(a.rubrique)}` : ""}</div>
      <h1>${esc(a.titre)}</h1>
      <p class="chapo">${esc(a.chapo)}</p>
      <div class="meta-line"><strong>${esc(T.by)} ${esc(a.auteur)}</strong><span class="when">${esc(T.published)} ${esc(longDate(a.date))}</span>${sources}</div>
      ${(a.corps || []).map((p) => `<p class="body">${esc(p)}</p>`).join("")}
      ${a.liens && a.liens.length ? `<ol class="revue">${a.liens.map((l, i) => `
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
      const twin = articles.find((x) => langOf(x) === target && twinKey(x.id) === twinKey(current.id))
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
  fetch("articles.json?v=" + Date.now())
    .then((r) => r.json())
    .then((data) => { articles = data; route(); })
    .catch(() => { app.innerHTML = `<p class="loading">${esc(T.error)}</p>`; });
})();
