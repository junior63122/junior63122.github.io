(function () {
  const app = document.getElementById("app");
  const filters = document.getElementById("filters");
  const fmt = (d) =>
    new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  document.getElementById("edition").textContent = "Édition du " + fmt(new Date().toISOString().slice(0, 10));

  let articles = [];
  let rubrique = null;
  const ORDRE = ["Business", "Finance", "Événementiel", "Tech", "Monde", "Nice & Côte d'Azur", "Sport", "Junior"];
  const sec = (a) => a.section || "Junior";

  function renderList() {
    const list = rubrique ? articles.filter((a) => sec(a) === rubrique) : articles;
    if (!list.length) { app.innerHTML = '<p class="loading">Aucun article pour le moment.</p>'; return; }
    const [une, ...rest] = list;
    const link = (a) => "#" + encodeURIComponent(a.id);
    app.innerHTML =
      `<section class="une"><span class="meta">${esc(a_meta(une))}</span>
         <a href="${link(une)}"><h2>${esc(une.titre)}</h2></a>
         <p class="chapo">${esc(une.chapo)}</p></section>
       <section class="grid">${rest.map((a) => `
         <div class="card"><span class="meta">${esc(a_meta(a))}</span>
           <a href="${link(a)}"><h3>${esc(a.titre)}</h3></a>
           <p>${esc(a.chapo)}</p></div>`).join("")}</section>`;
  }
  function a_meta(a) {
    const r = sec(a) === "Junior" ? `Junior · ${a.rubrique}` : a.rubrique;
    return `${a.emoji} ${r} · ${fmt(a.date)}`;
  }

  function renderArticle(a) {
    app.innerHTML = `<article class="full">
      <a class="back" href="#">← Toutes les nouvelles</a>
      <span class="meta">${esc(a_meta(a))}</span>
      <h2>${esc(a.titre)}</h2>
      <p class="chapo">${esc(a.chapo)}</p>
      <p class="byline">Par ${esc(a.auteur)}</p>
      ${(a.corps || []).map((p) => `<p class="body">${esc(p)}</p>`).join("")}
      ${a.liens && a.liens.length ? `<ol class="revue">${a.liens.map((l) => `
        <li><a href="${esc(l.url)}" target="_blank" rel="noopener"><h3>${esc(l.titre)}</h3></a>
          ${l.resume ? `<p>${esc(l.resume)}</p>` : ""}
          <span class="src">Source : ${esc(l.source || "")} — <a href="${esc(l.url)}" target="_blank" rel="noopener">lire l'article ↗</a></span></li>`).join("")}</ol>` : ""}
    </article>`;
    window.scrollTo(0, 0);
  }

  function renderFilters() {
    const present = new Set(articles.map(sec));
    const noms = ORDRE.filter((n) => present.has(n)).concat([...present].filter((n) => !ORDRE.includes(n)));
    filters.innerHTML = ["Tout", ...noms].map((n) =>
      `<button type="button" data-r="${esc(n)}" aria-pressed="${(n === "Tout" && !rubrique) || n === rubrique}">${esc(n)}</button>`).join("");
  }
  filters.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    rubrique = b.dataset.r === "Tout" ? null : b.dataset.r;
    if (location.hash) location.hash = ""; else route();
  });

  function route() {
    renderFilters();
    const id = decodeURIComponent(location.hash.slice(1));
    const a = id && articles.find((x) => x.id === id);
    a ? renderArticle(a) : renderList();
  }
  window.addEventListener("hashchange", route);

  fetch("articles.json?v=" + Date.now())
    .then((r) => r.json())
    .then((data) => { articles = data; route(); })
    .catch(() => { app.innerHTML = '<p class="loading">Impossible de charger les articles.</p>'; });
})();
