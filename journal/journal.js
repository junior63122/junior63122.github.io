(function () {
  const app = document.getElementById("app");
  const filters = document.getElementById("filters");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const FONDATION = "2026-11-01";
  const ORDRE = ["Business", "Finance", "Événementiel", "Tech", "Monde", "Nice & Côte d'Azur", "Sport", "Junior"];

  const I18N = {
    fr: {
      locale: "fr-FR",
      tagline: "Le quotidien niçois : business, finance, événementiel, tech, monde, sport… et toute l'actualité de Junior Joyant.",
      loading: "Chargement des articles…",
      empty: "Aucun article pour le moment.",
      error: "Impossible de charger les articles.",
      all: "À la une",
      backList: "← Toutes les nouvelles",
      by: "Par",
      review: "Revue de presse",
      sources: "Sources",
      source: "Source",
      read: "lire l'article",
      edition: "Édition du",
      numero: "N°",
      team: "La rédaction",
      sourcesNote: "Nos revues de presse citent et renvoient vers les articles des médias d'origine.",
      insta: "Suivre Junior sur Instagram",
      back: "Retour au site",
      sections: { Business: "Business", Finance: "Finance", "Événementiel": "Événementiel", Tech: "Tech", Monde: "Monde", "Nice & Côte d'Azur": "Nice & Côte d'Azur", Sport: "Sport", Junior: "Junior" },
    },
    en: {
      locale: "en-GB",
      tagline: "The daily from Nice: business, finance, events, tech, world, sport… and all the news about Junior Joyant.",
      loading: "Loading articles…",
      empty: "No articles yet.",
      error: "Could not load the articles.",
      all: "Front page",
      backList: "← All the news",
      by: "By",
      review: "Press review",
      sources: "Sources",
      source: "Source",
      read: "read the article",
      edition: "Edition of",
      numero: "No.",
      team: "Our newsroom",
      sourcesNote: "Our press reviews quote and link to the original articles of the outlets cited.",
      insta: "Follow Junior on Instagram",
      back: "Back to the site",
      sections: { Business: "Business", Finance: "Finance", "Événementiel": "Events", Tech: "Tech", Monde: "World", "Nice & Côte d'Azur": "Nice & the Riviera", Sport: "Sport", Junior: "Junior" },
    },
  };

  const REDACTION = [
    ["Camille Rostand", "Business"], ["Hugo Marchetti", "Finance"], ["Léa Fontaine", "Événementiel"],
    ["Nathan Belkacem", "Tech"], ["Sofia Delmas", "Monde"], ["Lucas Giordano", "Nice & Côte d'Azur"],
    ["Inès Morel", "Sport"], ["Clara Benoît", "Junior"], ["Théo Lambert", "Junior"],
  ];

  // Langue : ?lang=en, sinon choix mémorisé, sinon langue du navigateur.
  let lang = new URLSearchParams(location.search).get("lang");
  if (!I18N[lang]) { try { lang = localStorage.getItem("journal-lang"); } catch (e) { lang = null; } }
  if (!I18N[lang]) lang = (navigator.language || "fr").toLowerCase().startsWith("fr") ? "fr" : "en";
  let T = I18N[lang];

  let articles = [];
  let section = null;
  const sec = (a) => a.section || "Junior";
  const langOf = (a) => a.lang || "fr";
  // Un article et sa traduction ont le même id, à la langue près (« 2026-11-05-en-… »).
  const twinKey = (a) => a.id.replace(/^(\d{4}-\d\d-\d\d)-[a-z]{2}-/, "$1-");
  const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString(T.locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const visibles = () => articles.filter((a) => langOf(a) === lang);

  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = T[el.dataset.i18n]; });
    document.querySelectorAll(".langs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("edition").textContent = `${T.edition} ${fmt(today)}`;
    const n = Math.floor((Date.parse(today) - Date.parse(FONDATION)) / 864e5) + 1;
    document.getElementById("numero").textContent = `${T.numero} ${n}`;
    document.getElementById("year").textContent = new Date().getFullYear();
    document.getElementById("redaction").innerHTML = REDACTION
      .map(([nom, s]) => `<li><strong>${esc(nom)}</strong> · ${esc(T.sections[s])}</li>`).join("");
  }

  function meta(a) {
    const r = sec(a) === "Junior" ? `Junior · ${a.rubrique}` : (T.sections[sec(a)] || a.rubrique);
    return `${a.emoji} ${r} · ${fmt(a.date)}`;
  }
  const signature = (a) => (a.auteur ? `${T.by} ${a.auteur}` : "");

  function renderList() {
    const all = visibles();
    const list = section ? all.filter((a) => sec(a) === section) : all;
    if (!list.length) { app.innerHTML = `<p class="loading">${esc(T.empty)}</p>`; return; }
    const [une, ...rest] = list;
    const link = (a) => "#" + encodeURIComponent(a.id);
    app.innerHTML =
      `<section class="une"><span class="meta">${esc(meta(une))}</span>
         <a href="${link(une)}"><h2>${esc(une.titre)}</h2></a>
         <p class="chapo">${esc(une.chapo)}</p>
         <p class="sig">${esc(signature(une))}</p></section>
       <section class="grid">${rest.map((a) => `
         <div class="card"><span class="meta">${esc(meta(a))}</span>
           <a href="${link(a)}"><h3>${esc(a.titre)}</h3></a>
           <p>${esc(a.chapo)}</p>
           <p class="sig">${esc(signature(a))}</p></div>`).join("")}</section>`;
  }

  function renderArticle(a) {
    const revue = a.type === "revue";
    const sources = a.sources && a.sources.length ? ` · ${T.sources} : ${a.sources.join(", ")}` : "";
    app.innerHTML = `<article class="full">
      <a class="back" href="#">${esc(T.backList)}</a>
      <span class="meta">${esc(meta(a))}${revue ? " · " + esc(T.review) : ""}</span>
      <h2>${esc(a.titre)}</h2>
      <p class="chapo">${esc(a.chapo)}</p>
      <p class="byline">${esc(signature(a))}${esc(sources)}</p>
      ${(a.corps || []).map((p) => `<p class="body">${esc(p)}</p>`).join("")}
      ${a.liens && a.liens.length ? `<ol class="revue">${a.liens.map((l) => `
        <li><a href="${esc(l.url)}" target="_blank" rel="noopener"><h3>${esc(l.titre)}</h3></a>
          ${l.resume ? `<p>${esc(l.resume)}</p>` : ""}
          <span class="src">${esc(T.source)} : ${esc(l.source || "")} — <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(T.read)} ↗</a></span></li>`).join("")}</ol>` : ""}
    </article>`;
    window.scrollTo(0, 0);
  }

  function renderFilters() {
    const present = new Set(visibles().map(sec));
    const noms = ORDRE.filter((n) => present.has(n)).concat([...present].filter((n) => !ORDRE.includes(n)));
    filters.innerHTML = [null, ...noms].map((n) =>
      `<button type="button" data-r="${esc(n || "")}" aria-pressed="${n === section}">${esc(n ? T.sections[n] || n : T.all)}</button>`).join("");
  }
  filters.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    section = b.dataset.r || null;
    if (location.hash) location.hash = ""; else route();
  });

  // Changement de langue : on ouvre la traduction de l'article en cours s'il en a une.
  document.querySelector(".langs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.dataset.lang === lang) return;
    const current = articles.find((x) => x.id === decodeURIComponent(location.hash.slice(1)));
    lang = b.dataset.lang; T = I18N[lang];
    try { localStorage.setItem("journal-lang", lang); } catch (err) { /* navigation privée */ }
    applyStatic();
    const twin = current && visibles().find((x) => twinKey(x) === twinKey(current));
    if (twin) location.hash = encodeURIComponent(twin.id);
    else if (location.hash) location.hash = "";
    else route();
  });

  function route() {
    renderFilters();
    const id = decodeURIComponent(location.hash.slice(1));
    const a = id && articles.find((x) => x.id === id);
    a ? renderArticle(a) : renderList();
  }
  window.addEventListener("hashchange", route);

  applyStatic();
  fetch("articles.json?v=" + Date.now())
    .then((r) => r.json())
    .then((data) => {
      articles = data;
      const a = articles.find((x) => x.id === decodeURIComponent(location.hash.slice(1)));
      if (a && langOf(a) !== lang) { lang = langOf(a); T = I18N[lang]; applyStatic(); }
      route();
    })
    .catch(() => { app.innerHTML = `<p class="loading">${esc(T.error)}</p>`; });
})();
