(function () {
  const app = document.getElementById("app");
  const filters = document.getElementById("filters");
  const fmt = (d) =>
    new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  document.getElementById("edition").textContent = "Édition du " + fmt(new Date().toISOString().slice(0, 10));

  let articles = [];
  let rubrique = null;

  function renderList() {
    const list = rubrique ? articles.filter((a) => a.rubrique === rubrique) : articles;
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
  function a_meta(a) { return `${a.emoji} ${a.rubrique} · ${fmt(a.date)}`; }

  function renderArticle(a) {
    app.innerHTML = `<article class="full">
      <a class="back" href="#">← Toutes les nouvelles</a>
      <span class="meta">${esc(a_meta(a))}</span>
      <h2>${esc(a.titre)}</h2>
      <p class="chapo">${esc(a.chapo)}</p>
      <p class="byline">Par ${esc(a.auteur)}</p>
      ${a.corps.map((p) => `<p class="body">${esc(p)}</p>`).join("")}
    </article>`;
    window.scrollTo(0, 0);
  }

  function renderFilters() {
    const noms = [...new Set(articles.map((a) => a.rubrique))];
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
