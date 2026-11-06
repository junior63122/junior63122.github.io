// Pages fixes de L'Écho des Anges : histoire du journal et mentions légales.
//
// MENTIONS LÉGALES — À COMPLÉTER PAR L'ÉDITEUR AVANT LA MISE EN LIGNE
// Renseignez les champs ci-dessous ; tant qu'un champ est vide, la page affiche « [à compléter] ».
window.JOURNAL_CONFIG = {
  editeur: "",          // raison sociale de la société éditrice (ex. « L'Écho des Anges SAS »)
  forme: "",            // forme juridique et capital (ex. « SAS au capital de 10 000 € »)
  rcs: "",              // immatriculation (ex. « RCS Nice 123 456 789 »)
  siege: "",            // adresse du siège social
  telephone: "",        // numéro de téléphone de l'éditeur
  tva: "",              // numéro de TVA intracommunautaire (si assujetti)
  directeur: "Jules Vernet",          // directeur de la publication
  contact: "jules.vernet@gmail.com",  // adresse de contact (droit de réponse, données personnelles)
  hebergeur: "GitHub, Inc. (service GitHub Pages), 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis",
};

(function () {
  const C = window.JOURNAL_CONFIG;
  const v = (x) => x || "[à compléter]";
  const mail = C.contact ? `<a href="mailto:${C.contact}">${C.contact}</a>` : "[à compléter]";

  window.JOURNAL_PAGES = {
    histoire: {
      fr: {
        titre: "Notre histoire",
        chapo: "Né à Nice en 2026, L'Écho des Anges raconte la Côte d'Azur et le monde vu depuis la Baie des Anges, en français et en anglais.",
        html: `
<h2>Pourquoi « L'Écho des Anges »</h2>
<p>Le journal tient son nom de la Baie des Anges, l'anse qui borde Nice de la colline du Château jusqu'à l'aéroport. Deux explications circulent sur l'origine de ce nom. Selon la tradition, le corps de sainte Réparate, jeune martyre de Palestine devenue patronne de la ville, aurait été déposé dans une barque que des anges auraient guidée jusqu'au rivage niçois. Les naturalistes avancent une explication plus prosaïque : la baie abritait autrefois en abondance des anges de mer, des requins plats qui vivent sur les fonds sableux.</p>
<p>« L'Écho », parce qu'un journal renvoie ce qui se dit et ce qui se passe. Celui-ci le fait depuis Nice, pour la Côte d'Azur, de Menton à Saint-Tropez, et pour tous ceux qui suivent l'actualité de la Riviera, qu'ils y vivent ou non.</p>

<h2>Ce que nous faisons</h2>
<p>L'Écho des Anges couvre sept rubriques : l'économie et la vie des entreprises, la finance, l'événementiel, la tech, l'international, Nice et la Côte d'Azur, et le sport. Le journal paraît en continu, avec deux éditions par jour, en français et en anglais, pour une région où se croisent habitants, visiteurs et résidents étrangers.</p>
<p>Les archives retracent les grands événements de la Riviera depuis 2020 : la tempête Alex, la crise sanitaire, les palmarès du Festival de Cannes, les Grands Prix de Monaco, les grands rendez-vous internationaux accueillis à Nice.</p>

<h2>Notre ligne éditoriale</h2>
<ul>
  <li><strong>Des faits sourcés.</strong> Chaque information est attribuée au média ou à l'organisme qui l'a rapportée, et les sources sont listées en fin d'article.</li>
  <li><strong>La séparation des faits et des opinions.</strong> Nos articles rapportent ; ils ne prennent pas parti.</li>
  <li><strong>Les corrections assumées.</strong> Une erreur signalée est corrigée, et la correction est indiquée.</li>
  <li><strong>La transparence.</strong> Le journal ne publie pas de contenu sponsorisé présenté comme un article, et signale en fin d'article tout lien entre son sujet et la direction du journal.</li>
</ul>`,
      },
      en: {
        titre: "Our story",
        chapo: "Founded in Nice in 2026, L'Écho des Anges covers the Côte d'Azur and the world as seen from the Baie des Anges, in French and English.",
        html: `
<h2>Why “L'Écho des Anges”</h2>
<p>The paper takes its name from the Baie des Anges, the Bay of Angels, which curves along Nice from Castle Hill to the airport. Two explanations are given for the name. According to tradition, the body of Saint Reparata, a young martyr from Palestine who became the city's patron saint, was laid in a boat that angels guided to the shore at Nice. Naturalists offer a more down-to-earth version: the bay was once full of angelsharks, flat sharks that live on sandy seabeds.</p>
<p>“Écho”, because a newspaper carries what is said and what happens. This one does so from Nice, for the Côte d'Azur from Menton to Saint-Tropez, and for everyone who follows Riviera news, whether they live here or not.</p>

<h2>What we do</h2>
<p>L'Écho des Anges covers seven sections: business, finance, events, tech, world news, Nice and the Riviera, and sport. The paper publishes continuously, with two editions a day, in French and English, for a region where residents, visitors and expatriates meet.</p>
<p>Our archives trace the Riviera's major events since 2020: Storm Alex, the pandemic, the Cannes Film Festival awards, the Monaco Grand Prix and the international gatherings hosted in Nice.</p>

<h2>Our editorial standards</h2>
<ul>
  <li><strong>Sourced facts.</strong> Every piece of information is attributed to the outlet or body that reported it, and sources are listed at the end of each article.</li>
  <li><strong>Facts kept apart from opinion.</strong> Our articles report; they do not take sides.</li>
  <li><strong>Corrections.</strong> Any error reported to us is corrected, and the correction is noted.</li>
  <li><strong>Transparency.</strong> The paper does not publish sponsored content presented as articles, and discloses at the end of an article any link between its subject and the paper's management.</li>
</ul>`,
      },
    },

    mentions: {
      fr: {
        titre: "Mentions légales",
        chapo: "Informations relatives à l'éditeur, à l'hébergement, aux contenus et aux données personnelles, conformément à la loi pour la confiance dans l'économie numérique (LCEN) et au RGPD.",
        html: `
<h2>Éditeur</h2>
<p>Le site L'Écho des Anges est édité par ${v(C.editeur)}, ${v(C.forme)}, immatriculée sous le numéro ${v(C.rcs)}, dont le siège social est situé ${v(C.siege)}.<br>
Téléphone : ${v(C.telephone)} — Courriel : ${mail}${C.tva ? `<br>TVA intracommunautaire : ${C.tva}` : ""}</p>

<h2>Directeur de la publication</h2>
<p>${v(C.directeur)}.</p>

<h2>Hébergement</h2>
<p>${v(C.hebergeur)}.</p>

<h2>Rédaction et méthode</h2>
<p>Les signatures des articles sont des noms de plume de la rédaction. Les articles d'actualité sont rédigés à partir d'informations publiées par des médias et des organismes identifiés, cités dans le texte et listés en fin d'article. Certains contenus sont produits avec l'assistance d'outils d'intelligence artificielle, sous la responsabilité éditoriale du directeur de la publication.</p>
<p>Les articles d'archives retracent des événements passés ; leur date est celle de l'événement relaté.</p>

<h2>Droit de réponse, rectification et retrait</h2>
<p>Toute personne nommée ou désignée dans un article dispose d'un droit de réponse (article 6, IV de la LCEN), à exercer dans un délai de trois mois à compter de la mise en ligne. Les demandes de rectification d'une erreur ou de retrait d'un contenu peuvent être adressées à ${mail}.</p>

<h2>Propriété intellectuelle</h2>
<p>Les textes publiés sur L'Écho des Anges sont protégés par le droit d'auteur. Toute reproduction intégrale est interdite sans autorisation ; les courtes citations sont autorisées avec mention de la source et un lien vers l'article.</p>
<p>Les titres et extraits d'articles de médias tiers sont reproduits au titre du droit de courte citation (article L. 122-5 du code de la propriété intellectuelle), avec mention de leur source et un lien vers l'article d'origine ; ils restent la propriété de leurs auteurs.</p>
<p>Photographies : les images de rubrique proviennent de Wikimedia Commons et de Pexels, sous licences libres (domaine public, CC0, CC BY, CC BY-SA, licence Pexels) ; l'auteur et la licence sont indiqués sous chaque image. Les autres photographies sont publiées avec l'accord de leurs ayants droit (mention « DR » ou nom du photographe).</p>

<h2>Responsabilité</h2>
<p>L'Écho des Anges s'efforce de publier des informations exactes et à jour, mais ne peut garantir l'absence d'erreur. Les informations publiées ne constituent pas un conseil financier, juridique ou d'investissement. Le site contient des liens vers des sites tiers dont il ne contrôle pas le contenu.</p>

<h2>Données personnelles et cookies</h2>
<p>Le site ne propose ni compte, ni formulaire, ni publicité, et n'utilise aucun outil de mesure d'audience ni aucun cookie de suivi.</p>
<ul>
  <li><strong>Préférence de langue.</strong> Le choix entre français et anglais est conservé dans le stockage local de votre navigateur (localStorage). Cette information reste sur votre appareil et n'est transmise à personne.</li>
  <li><strong>Hébergement.</strong> L'hébergeur enregistre des données techniques de connexion, dont l'adresse IP, pour assurer le fonctionnement et la sécurité du service.</li>
  <li><strong>Polices de caractères.</strong> Les polices sont chargées depuis Google Fonts ; votre navigateur transmet à ce titre votre adresse IP à Google (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">règles de confidentialité de Google</a>).</li>
</ul>
<p>Responsable du traitement : ${v(C.editeur)}. Conformément au RGPD, vous disposez de droits d'accès, de rectification, d'effacement et d'opposition, que vous pouvez exercer à l'adresse ${mail}. Vous pouvez également adresser une réclamation à la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).</p>

<h2>Droit applicable</h2>
<p>Le présent site et ses mentions légales sont soumis au droit français.</p>`,
      },
      en: {
        titre: "Legal notice",
        chapo: "Information about the publisher, hosting, content and personal data, in accordance with French law (LCEN) and the GDPR.",
        html: `
<h2>Publisher</h2>
<p>L'Écho des Anges is published by ${v(C.editeur)}, ${v(C.forme)}, registered under number ${v(C.rcs)}, with its registered office at ${v(C.siege)}.<br>
Telephone: ${v(C.telephone)} — Email: ${mail}${C.tva ? `<br>EU VAT number: ${C.tva}` : ""}</p>

<h2>Publication director</h2>
<p>${v(C.directeur)}.</p>

<h2>Hosting</h2>
<p>${v(C.hebergeur)}.</p>

<h2>Editorial method</h2>
<p>Bylines are the newsroom's pen names. News articles are written from information published by identified outlets and organisations, credited in the text and listed at the end of each article. Some content is produced with the assistance of artificial intelligence tools, under the editorial responsibility of the publication director.</p>
<p>Archive articles cover past events; their date is the date of the event reported.</p>

<h2>Right of reply, corrections and removal</h2>
<p>Anyone named or referred to in an article has a right of reply (article 6, IV of the LCEN), to be exercised within three months of publication. Requests to correct an error or remove content can be sent to ${mail}.</p>

<h2>Intellectual property</h2>
<p>Texts published on L'Écho des Anges are protected by copyright. Full reproduction is prohibited without permission; short quotations are allowed with credit and a link to the article.</p>
<p>Headlines and extracts from third-party outlets are reproduced under the right of short quotation (article L. 122-5 of the French Intellectual Property Code), credited and linked to the original article; they remain the property of their authors.</p>
<p>Photographs: section images come from Wikimedia Commons and Pexels under free licences (public domain, CC0, CC BY, CC BY-SA, Pexels licence); the author and licence are shown under each image. Other photographs are published with the consent of their rights holders (“DR” or the photographer's name).</p>

<h2>Liability</h2>
<p>L'Écho des Anges strives to publish accurate and up-to-date information but cannot guarantee it is error-free. Nothing published here constitutes financial, legal or investment advice. The site links to third-party websites whose content it does not control.</p>

<h2>Personal data and cookies</h2>
<p>The site has no accounts, forms or advertising, and uses no analytics or tracking cookies.</p>
<ul>
  <li><strong>Language preference.</strong> Your choice of French or English is stored in your browser's local storage. It stays on your device and is not sent to anyone.</li>
  <li><strong>Hosting.</strong> The host logs technical connection data, including IP addresses, to run and secure the service.</li>
  <li><strong>Fonts.</strong> Fonts are loaded from Google Fonts, so your browser sends your IP address to Google (<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google privacy policy</a>).</li>
</ul>
<p>Data controller: ${v(C.editeur)}. Under the GDPR you have rights of access, rectification, erasure and objection, which you can exercise at ${mail}. You may also lodge a complaint with the CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).</p>

<h2>Governing law</h2>
<p>This site and its legal notice are governed by French law.</p>`,
      },
    }
  };
})();
