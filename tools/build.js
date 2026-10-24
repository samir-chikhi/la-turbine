// Générateur du site La Turbine : lit content/ (modifiable via Pages CMS) et écrit _site/.
// Lancé automatiquement par .github/workflows/deploy.yml à chaque modification. Aucune dépendance.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '_site');
const BASE = 'https://turbine.genie-montauban.fr/';

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));
const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rel = (p) => String(p || '').replace(/^\//, '');            // /img/x.webp -> img/x.webp
const SITE = readJson('site.json');
const NEXT = readJson('prochain.json');
const FAQ = readJson('faq.json').questions || [];
const THEMES = readJson('themes.json').themes || [];
const EQUIPE = readJson('equipe.json').membres || [];
const DOCS = readJson('documents.json').documents || [];
const FB = SITE.facebook, IG = SITE.instagram, MAIL = SITE.email, COT = SITE.cotisation;

// ── Mini-Markdown (titres, listes, citations, gras, italique, liens) ──
function inline(t) {
  t = esc(t);
  t = t.replace(/\{cotisation\}/g, esc(COT));
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, u) => /^(https?:|mailto:|[\w./#?=&%-]+$)/.test(u) ? `<a href="${u}">${a}</a>` : a);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return t;
}
function md(src) {
  return String(src || '').replace(/\r/g, '').trim().split(/\n{2,}/).map((b) => {
    b = b.trim();
    if (!b) return '';
    let m;
    if ((m = b.match(/^(#{1,6})\s+(.*)$/s))) return `<h3 style="margin-top:20px">${inline(m[2])}</h3>`;
    if (/^([-*+])\s/.test(b)) return '<ul>' + b.split(/\n/).map((l) => `<li>${inline(l.replace(/^[-*+]\s+/, ''))}</li>`).join('') + '</ul>';
    if (/^\d+[.)]\s/.test(b)) return '<ol>' + b.split(/\n/).map((l) => `<li>${inline(l.replace(/^\d+[.)]\s+/, ''))}</li>`).join('') + '</ol>';
    if (/^>\s?/.test(b)) return `<blockquote>${inline(b.replace(/^>\s?/gm, ''))}</blockquote>`;
    return `<p>${inline(b).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}

// ── Dates en français ──
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const fr = (d, o) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...o }).format(new Date(d + 'T12:00:00Z'));
const dateLongue = (d) => cap(fr(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
const hh = (t) => { const [h, m] = String(t || '').split(':'); return m && m !== '00' ? `${+h}h${m}` : `${+h}h`; };
const horaire = (a, b) => (b ? `${hh(a)} – ${hh(b)}` : hh(a));
const tz = (d) => { const m = +fr(d, { month: 'numeric' }); const day = +fr(d, { day: 'numeric' }); // heure d'été UE (dernier dimanche de mars -> octobre)
  const y = +fr(d, { year: 'numeric' }); const last = (mo) => { const x = new Date(Date.UTC(y, mo, 0)); return x.getUTCDate() - x.getUTCDay(); };
  const summer = (m > 3 && m < 10) || (m === 3 && day >= last(3)) || (m === 10 && day < last(10)); return summer ? '+02:00' : '+01:00'; };

// ── Fichiers du contenu ──
function readCafes() {
  const dir = path.join(ROOT, 'content', 'cafes');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r/g, '');
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const fm = m ? parseYaml(m[1]) : {};
    fm.body = m ? m[2] : raw;
    fm.id = f.replace(/\.md$/, '');
    return fm;
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
// Mini-lecteur YAML : clés simples, listes de scalaires et d'objets à un niveau, textes repliés sur plusieurs lignes
// (suffisant pour les fiches écrites par Pages CMS).
function parseYaml(txt) {
  const o = {};
  let cur = null, item = null, last = null, block = null;
  const unq = (v) => { v = v.trim(); if (v.length > 1 && v[0] === '"' && v.endsWith('"')) return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n'); if (v.length > 1 && v[0] === "'" && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'"); return v; };
  const typed = (v) => { const t = v.trim(); if (/^[>|][+-]?$/.test(t)) return t; if (/^-?\d+$/.test(t)) return +t; if (t === 'true') return true; if (t === 'false') return false; return unq(v); };
  const set = (holder, key, raw) => {
    const v = typed(raw);
    if (typeof v === 'string' && /^[>|][+-]?$/.test(raw.trim())) { block = { holder, key, sep: raw.trim()[0] === '>' ? ' ' : '\n', parts: [] }; holder[key] = ''; last = null; return; }
    holder[key] = v; last = { holder, key };
  };
  for (const line of txt.split('\n')) {
    if (block) {
      if (/^\s+\S/.test(line) || !line.trim()) { block.parts.push(line.trim()); block.holder[block.key] = block.parts.join(block.sep).trim(); continue; }
      block = null;
    }
    if (!line.trim()) continue;
    let m;
    if ((m = line.match(/^([\w-]+):\s*(.*)$/))) { cur = m[1]; item = null; if (m[2] === '') { o[cur] = []; last = null; } else set(o, cur, m[2]); }
    else if ((m = line.match(/^\s*-\s+([\w-]+):\s*(.*)$/))) { item = {}; if (!Array.isArray(o[cur])) o[cur] = []; o[cur].push(item); set(item, m[1], m[2]); }
    else if ((m = line.match(/^\s*-\s+(.*)$/))) { if (!Array.isArray(o[cur])) o[cur] = []; o[cur].push(unq(m[1])); last = null; }
    else if (item && (m = line.match(/^\s+([\w-]+):\s*(.*)$/))) { set(item, m[1], m[2]); }
    else if (last && /^\s+\S/.test(line)) { const cont = unq(line.trim()); last.holder[last.key] = String(last.holder[last.key]) + ' ' + cont; }
  }
  return o;
}
const CAFES = readCafes();
const docLink = (cle, fallback) => { const d = DOCS.find((x) => x.emplacement === cle && x.fichier); return d ? rel(d.fichier) : fallback; };

const sprite = `<svg class="sr" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>
<symbol id="i-fb" viewBox="0 0 24 24"><path d="M14 8.5h2.5V4.5H14A3.5 3.5 0 0 0 10.5 8v2.2H8v3.8h2.5V21H14v-7h2.6l.5-3.8H14V8.8c0-.2.1-.3.3-.3Z"/></symbol>
<symbol id="i-ig" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17 7h.01"/></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6.5L20.5 7"/></symbol>
<symbol id="i-cal" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></symbol>
<symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
<symbol id="i-ticket" viewBox="0 0 24 24"><path d="M3.5 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4V18h17v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6h-17Z" transform="translate(0 -.5)"/><path d="M14 6.5v11" stroke-dasharray="2 2"/></symbol>
<symbol id="i-fl" viewBox="0 0 24 24"><path d="M4 12h15"/><path d="m13 6 6 6-6 6"/></symbol>
<symbol id="i-dl" viewBox="0 0 24 24"><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></symbol>
</defs></svg>`;
const ic = (n) => `<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;

const NAV = [
  ['rendez-vous.html', 'Prochain rendez-vous'],
  ['memoire.html', 'La mémoire de La Turbine'],
  ['le-principe.html', 'Le principe'],
  ['association.html', 'L’association'],
];

function page({ file, title, desc, h, body, ld = '', og = 'og-turbine.jpg', crumb }) {
  const url = file === 'index.html' ? BASE : BASE + file;
  const nav = NAV.map(([f, l]) => `<a href="${f}"${f === file ? ' aria-current="page"' : ''}>${l}</a>`).join('\n        ');
  const bc = file === 'index.html' ? '' : `
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"La Turbine","item":"${BASE}"},{"@type":"ListItem","position":2,"name":"${crumb}","item":"${url}"}]}
  </script>`;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:site_name" content="La Turbine — cafés politiques &amp; poétiques">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${BASE}${og}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="favicon-turbine.png">
  <link rel="preload" href="assets/fonts/dm-sans-latin-variable.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/bricolage-grotesque-latin-variable.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="turbine.css">${bc}${ld}
</head>
<body>
${sprite}
<a class="skip" href="#contenu">Aller au contenu</a>
<div class="bandeau"><div class="wrap">
  <span>Les cafés ont lieu au Génie, tiers-lieu associatif à Montauban.</span>
  <a href="https://genie-montauban.fr/">Découvrir le Génie ${ic('fl')}</a>
</div></div>
<header class="t-head">
  <div class="wrap">
    <a class="t-logo" href="./" aria-label="La Turbine — accueil"><img src="img/logo.webp" alt="La Turbine, cafés politiques &amp; poétiques" width="130" height="46"></a>
    <button class="t-burger" aria-label="Menu" aria-expanded="false" aria-controls="t-nav"><span></span><span></span><span></span></button>
    <nav class="t-nav" id="t-nav" aria-label="Menu principal">
        ${nav}
        <a class="t-cta" href="rejoindre.html"${file === 'rejoindre.html' ? ' aria-current="page"' : ''}>Rejoindre</a>
        <span class="t-soc">
          <a href="${FB}" rel="noopener" target="_blank" aria-label="Facebook de La Turbine (nouvel onglet)">${ic('fb')}</a>
          <a href="${IG}" rel="noopener" target="_blank" aria-label="Instagram de La Turbine (nouvel onglet)">${ic('ig')}</a>
        </span>
    </nav>
  </div>
</header>
<main id="contenu">
${body}
</main>
<footer class="t-foot">
  <div class="wrap">
    <div class="t-foot-grille">
      <div>
        <a class="logo-pied" href="./"><img src="img/logo.webp" alt="La Turbine" width="123" height="44"></a>
        <p>Cafés politiques &amp; poétiques à Montauban.<br>Pas besoin d’être d’accord. Venez avec vos idées. Et surtout, avec vos oreilles.</p>
        <div class="soc">
          <a href="${FB}" rel="noopener" target="_blank" aria-label="Facebook (nouvel onglet)">${ic('fb')}</a>
          <a href="${IG}" rel="noopener" target="_blank" aria-label="Instagram (nouvel onglet)">${ic('ig')}</a>
          <a href="mailto:${MAIL}" aria-label="Écrire à La Turbine">${ic('mail')}</a>
        </div>
      </div>
      <div>
        <h2>Les rendez-vous</h2>
        <ul>
          <li><a href="rendez-vous.html">Prochain rendez-vous</a></li>
          <li><a href="memoire.html">La mémoire de La Turbine</a></li>
          <li><a href="le-principe.html">Le principe</a></li>
          <li><a href="le-principe.html#charte">La charte du débat</a></li>
        </ul>
      </div>
      <div>
        <h2>L’association</h2>
        <ul>
          <li><a href="association.html">Qui sommes-nous</a></li>
          <li><a href="rejoindre.html">Adhérer (${esc(COT)})</a></li>
          <li><a href="rejoindre.html#proposer">Proposer un thème</a></li>
          <li><a href="documents.html">Documents</a></li>
          <li><a href="presse.html">Presse &amp; visuels</a></li>
        </ul>
      </div>
      <div>
        <h2>Le lieu</h2>
        <ul>
          <li>Le Génie<br>12 rue du Génie<br>82000 Montauban</li>
          <li><a href="mailto:${MAIL}">${MAIL}</a></li>
          <li><a href="https://genie-montauban.fr/">Site du Génie</a></li>
        </ul>
      </div>
    </div>
    <div class="t-foot-bas">
      <span>© 2026 La Turbine, association loi 1901 · Indépendante de tout parti politique.</span>
      <span>Ce site n’utilise ni cookies ni outil de mesure. · <a href="mentions-legales.html">Mentions légales et données</a></span>
    </div>
  </div>
</footer>
<script src="turbine.js"></script>
</body>
</html>
`;
}

// ───────── Prochain rendez-vous (content/prochain.json) ─────────
const actif = !!NEXT.actif && !!NEXT.date;
const N = actif ? {
  date: dateLongue(NEXT.date), heure: horaire(NEXT.heure_debut, NEXT.heure_fin), titre: NEXT.titre,
} : null;
const lastCafe = CAFES[0];
const eventLd = actif ? `
  <script type="application/ld+json">
  ${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Event', name: 'La Turbine — ' + NEXT.titre, description: NEXT.bulle || NEXT.titre,
    startDate: `${NEXT.date}T${NEXT.heure_debut || '19:00'}:00${tz(NEXT.date)}`, endDate: `${NEXT.date}T${NEXT.heure_fin || NEXT.heure_debut || '21:30'}:00${tz(NEXT.date)}`,
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', isAccessibleForFree: true,
    image: BASE + rel(NEXT.affiche),
    location: { '@type': 'Place', name: 'Le Génie', address: { '@type': 'PostalAddress', streetAddress: '12 rue du Génie', postalCode: '82000', addressLocality: 'Montauban', addressCountry: 'FR' } },
    organizer: { '@type': 'Organization', name: 'La Turbine', url: BASE },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: BASE + 'rendez-vous.html' } }).replace(/</g, '\\u003c')}
  </script>` : '';

const carteProchain = (h = 'h2') => actif ? `
<div class="rdv">
  <div class="rdv-grille">
    <div>
      <span class="etiquette">${esc(NEXT.etiquette)}</span>
      <${h} class="rdv-q">${esc(NEXT.titre)}</${h}>
      ${NEXT.bulle ? `<div class="bulle"><p>${esc(NEXT.bulle)}</p></div>` : ''}
      <ul class="infos">
        <li>${ic('cal')}<span><strong>${N.date}</strong><small>${N.heure}</small></span></li>
        <li>${ic('pin')}<span><strong>Le Génie</strong><small>12 rue du Génie, 82000 Montauban</small></span></li>
        ${NEXT.invite ? `<li>${ic('mail')}<span><strong>Invité·e</strong><small>${esc(NEXT.invite)}</small></span></li>` : ''}
        <li>${ic('ticket')}<span><strong>${esc(NEXT.entree)}</strong><small>${esc(NEXT.entree_detail)}</small></span></li>
      </ul>
      <div class="btn-row">
        ${h === 'h2' ? '' : `<a class="btn" href="rendez-vous.html">Tous les détails ${ic('fl')}</a>`}
        <a class="btn btn-clair" href="${FB}" rel="noopener" target="_blank">${ic('fb')} Sur Facebook</a>
      </div>
    </div>
    <img src="${rel(NEXT.affiche)}" alt="${esc(NEXT.affiche_alt)}" width="1000" height="1000" loading="lazy">
  </div>
</div>` : `
<div class="rdv">
  <span class="etiquette moutarde">À venir</span>
  <${h} class="rdv-q">Le prochain café sera annoncé très bientôt.</${h}>
  <p>Suivez-nous sur <a href="${FB}" rel="noopener" target="_blank">Facebook</a> et <a href="${IG}" rel="noopener" target="_blank">Instagram</a> pour être prévenu·e dès que la date est fixée, ou revivez les cafés passés dans <a href="memoire.html">la mémoire de La Turbine</a>.</p>
</div>`;

const pages = [];

// ───────── ACCUEIL ─────────
pages.push({
  file: 'index.html',
  title: 'La Turbine — cafés politiques & poétiques à Montauban',
  desc: 'La Turbine, association montalbanaise : des cafés politiques et poétiques au Génie, pour écouter, échanger et questionner. Entrée libre.' + (actif ? ` Prochain rendez-vous : ${fr(NEXT.date, { day: 'numeric', month: 'long', year: 'numeric' })}.` : ''),
  ld: eventLd,
  body: `
<section class="hero">
  <div class="wrap hero-grille">
    <div>
      <h1 class="sr">La Turbine, cafés politiques &amp; poétiques à Montauban</h1>
      <img class="hero-logo" src="img/logo.webp" alt="La Turbine — cafés politiques &amp; poétiques" width="560" height="197">
      <p class="lede"><strong>${esc(SITE.accueil_accroche)}</strong><br>${esc(SITE.accueil_texte)}</p>
      <p>${esc(SITE.accueil_devise)}</p>
      <div class="btn-row">
        <a class="btn" href="rendez-vous.html">Prochain rendez-vous ${ic('fl')}</a>
        <a class="btn btn-clair" href="le-principe.html">Comment ça se passe</a>
      </div>
    </div>
    ${actif ? `<div class="hero-aff">
      <img src="${rel(NEXT.affiche)}" alt="${esc(NEXT.affiche_alt)}" width="1000" height="1000">
      <span class="pastille">${cap(fr(NEXT.date, { weekday: 'long', day: 'numeric', month: 'long' }))} · ${hh(NEXT.heure_debut)}</span>
    </div>` : (lastCafe ? `<div class="hero-aff">
      <img src="${rel(lastCafe.affiche)}" alt="${esc(lastCafe.affiche_alt)}" width="1000" height="914">
      <span class="pastille">Dernier café : ${fr(lastCafe.date, { day: 'numeric', month: 'long' })}</span>
    </div>` : '')}
  </div>
</section>

<section class="sec sec-ciel" aria-labelledby="t-prochain">
  <div class="wrap">
    <div class="sec-tete"><h2 id="t-prochain">Le prochain café</h2></div>
    ${carteProchain('h3')}
  </div>
</section>

<section class="sec" aria-labelledby="t-principe">
  <div class="wrap">
    <div class="sec-tete">
      <h2 id="t-principe">Une soirée pour se rencontrer, pas pour gagner</h2>
      <p class="lede">Beaucoup de gens ont envie de parler de société, mais ne trouvent pas d’endroit où le faire sans se disputer ni se sentir jugés. La Turbine invente ce cadre : simple, chaleureux, ouvert à toutes et à tous.</p>
    </div>
    <div class="trois">
      <div class="carte"><span class="num">1</span><h3>On vient écouter</h3><p>Des idées, des expériences, des points de vue différents. Une personne parle, les autres l’entendent jusqu’au bout.</p></div>
      <div class="carte"><span class="num">2</span><h3>On vient échanger</h3><p>Un argument en rencontre un autre. Une expérience en rencontre une autre. Les idées sont en mouvement.</p></div>
      <div class="carte"><span class="num">3</span><h3>On vient questionner</h3><p>Ce qu’on croyait savoir. Plus de questions, plus de nuances, plus de compréhension. Ce qui compte, c’est la conversation qui continue.</p></div>
    </div>
    <p style="margin-top:28px"><a class="lien-fl" href="le-principe.html">Voir le déroulé d’une soirée et la charte du débat ${ic('fl')}</a> &nbsp;·&nbsp; <a class="lien-fl" href="memoire.html">La mémoire de La Turbine ${ic('fl')}</a></p>
  </div>
</section>

<section class="sec sec-moutarde" aria-labelledby="t-pas">
  <div class="wrap deux">
    <div>
      <h2 id="t-pas">Pas un débat. Pas un meeting. Pas un concours de punchlines.</h2>
      <p class="lede">Une soirée pour se rencontrer, et repartir avec ce qu’on a compris, ce qui reste discuté et ce qu’on pourrait essayer.</p>
      <ul class="idees" style="margin-top:18px">
        <li>Écouter</li><li>Comprendre</li><li>Questionner</li><li>Partager</li><li>Créer demain</li>
      </ul>
    </div>
    <img src="img/affiche-pas-un-debat.webp" alt="Affiche : Pas un débat, pas un meeting, pas un concours de punchlines. Une soirée pour se rencontrer." width="560" height="893" loading="lazy" style="width:100%;max-width:380px;margin-inline:auto">
  </div>
</section>

<section class="sec" aria-labelledby="t-cartes">
  <div class="wrap">
    <div class="sec-tete"><h2 id="t-cartes">En quelques images</h2></div>
    <div class="cartes-img">
      <figure><img src="img/carte-donner-son-avis.webp" alt="On ne vient pas seulement donner son avis : on vient se rencontrer, écouter, questionner, confronter." width="374" height="701" loading="lazy"></figure>
      <figure><img src="img/carte-ecouter.webp" alt="On vient écouter. Des idées, des expériences, des points de vue différents." width="374" height="701" loading="lazy"></figure>
      <figure><img src="img/carte-echanger.webp" alt="On vient échanger. Les idées en mouvement." width="374" height="701" loading="lazy"></figure>
      <figure><img src="img/carte-dernier-mot.webp" alt="On ne cherche pas à avoir le dernier mot. Ce qui compte, c’est la conversation qui continue." width="374" height="701" loading="lazy"></figure>
    </div>
  </div>
</section>

<section class="sec sec-encre" aria-labelledby="t-suivre">
  <div class="wrap deux">
    <div>
      <h2 id="t-suivre">Rejoindre La Turbine</h2>
      <p class="lede">L’adhésion coûte ${esc(COT)} par an. Elle n’est pas obligatoire pour venir : les cafés sont ouverts à tout le monde.</p>
      <div class="btn-row">
        <a class="btn" href="rejoindre.html">Adhérer ou donner un coup de main</a>
      </div>
    </div>
    <div>
      <h3>Suivre les prochains rendez-vous</h3>
      <p>Les annonces, les affiches et les comptes rendus sont publiés sur nos réseaux.</p>
      <div class="btn-row">
        <a class="btn btn-clair" href="${FB}" rel="noopener" target="_blank">${ic('fb')} Facebook</a>
        <a class="btn btn-clair" href="${IG}" rel="noopener" target="_blank">${ic('ig')} Instagram</a>
      </div>
    </div>
  </div>
</section>`,
});

// ───────── RENDEZ-VOUS ─────────
pages.push({
  file: 'rendez-vous.html',
  crumb: 'Rendez-vous',
  title: 'Prochain café politique à Montauban — La Turbine',
  desc: actif ? `${NEXT.titre} ${N.date}, ${N.heure}, au Génie à Montauban. ${NEXT.entree}. Retrouvez aussi les cafés passés.` : 'Les rendez-vous de La Turbine au Génie à Montauban : le prochain café sera annoncé très bientôt.',
  ld: eventLd,
  body: `
<section class="sec">
  <div class="wrap">
    <div class="sec-tete">
      <h1>Les rendez-vous</h1>
      <p class="lede">Un café politique et poétique, un jeudi soir, au Génie. Une question, un cadre simple, et le temps de se parler.</p>
    </div>
    ${carteProchain('h2')}
    <div class="deux" style="margin-top:56px;align-items:start">
      <div>
        <h2>Bon à savoir</h2>
        ${FAQ.map((q) => `<details><summary>${esc(q.question)}</summary>${md(q.reponse)}</details>`).join('\n        ')}
      </div>
      <div>
        <h2>Prochaines pistes de thèmes</h2>
        <p>Ces thèmes sont évoqués par l’équipe. Ils seront précisés avant d’être annoncés.</p>
        <ul class="idees">
          ${THEMES.map((t) => `<li>${esc(t)}</li>`).join('')}
        </ul>
        <p style="margin-top:18px">Une idée de thème ou d’invité·e ? <a href="rejoindre.html#proposer">Proposez-la</a>.</p>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-ciel" aria-labelledby="t-passes">
  <div class="wrap deux">
    <div>
      <h2 id="t-passes">Vous avez raté un café ?</h2>
      <p class="lede">Chaque rendez-vous laisse une trace : la question posée, qui était là, ce qu’on en retient. Tout est dans la mémoire de La Turbine.</p>
      <div class="btn-row"><a class="btn" href="memoire.html">La mémoire de La Turbine ${ic('fl')}</a></div>
    </div>
    ${lastCafe ? `<img src="${rel(lastCafe.affiche)}" alt="${esc(lastCafe.affiche_alt)}" width="1000" height="914" loading="lazy" style="width:100%;max-width:380px;margin-inline:auto">` : ''}
  </div>
</section>`,
});

// ───────── LE PRINCIPE ─────────
pages.push({
  file: 'memoire.html',
  crumb: 'La mémoire de La Turbine',
  title: 'La mémoire de La Turbine — les cafés passés et leurs comptes rendus',
  desc: 'Les rendez-vous passés de La Turbine, café après café : la question posée, l’invité·e, le déroulé et ce qu’on en retient.',
  body: `
<section class="sec">
  <div class="wrap">
    <div class="sec-tete">
      <h1>La mémoire de La Turbine</h1>
      <p class="lede">Chaque café laisse une trace : la question posée, qui était là, comment la soirée s’est déroulée et ce qu’on en retient. Les rendez-vous sont classés du plus récent au plus ancien.</p>
    </div>
    <div class="rdv-liste">
      ${CAFES.map((c) => `<article class="rdv-ligne" id="cafe-${esc(c.numero || c.id)}">
        <img src="${rel(c.affiche)}" alt="${esc(c.affiche_alt)}" width="1000" height="914" loading="lazy">
        <div>
          ${c.numero ? `<span class="etiquette">Café n° ${esc(c.numero)}</span>` : ''}
          <p class="rdv-date">${dateLongue(c.date)} · ${horaire(c.heure_debut, c.heure_fin)} · Le Génie</p>
          <h2 style="font-size:1.7rem">${esc(c.titre)}</h2>
          ${c.invite ? `<p><strong>Invité·e :</strong> ${esc(c.invite)}.</p>` : ''}
          <h3 style="margin-top:20px">Compte rendu</h3>
          ${md(c.body)}
          ${(c.visuels && c.visuels.length) ? `<div class="btn-row">${c.visuels.map((v) => `<a class="btn btn-clair" href="${rel(v.image)}">${esc(v.label)} ${ic('fl')}</a>`).join('')}</div>` : ''}
        </div>
      </article>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="sec sec-ciel" aria-labelledby="t-suite">
  <div class="wrap deux">
    <div>
      <h2 id="t-suite">La suite s’écrit en ce moment</h2>
      <p class="lede">${actif ? `Le prochain café aura lieu le <strong>${N.date.toLowerCase()}</strong> : « ${esc(NEXT.titre)} ».` : 'Le prochain café sera annoncé très bientôt.'}</p>
      <div class="btn-row"><a class="btn" href="rendez-vous.html">Prochain rendez-vous ${ic('fl')}</a></div>
    </div>
    <div class="bulle" style="font-size:1.1rem">
      <p><strong>Vous étiez là ?</strong> Dites-nous ce que vous en avez retenu : une phrase, une question qui continue de vous travailler. <a href="mailto:${MAIL}?subject=Mon%20retour%20sur%20le%20caf%C3%A9">Écrire à l’équipe</a>.</p>
    </div>
  </div>
</section>`,
});

pages.push({
  file: 'le-principe.html',
  crumb: 'Le principe',
  title: 'Le principe et la charte du débat — La Turbine',
  desc: 'Comment se déroule un café de La Turbine, pourquoi ce nom, et les huit engagements de la charte du débat : écouter, distinguer faits et opinions, accepter le désaccord.',
  body: `
<section class="sec">
  <div class="wrap">
    <div class="sec-tete">
      <h1>Le principe</h1>
      <p class="lede">Une turbine transforme une énergie en mouvement. La Turbine transforme les idées, les désaccords et les expériences de chacun·e en réflexion collective, en compréhension et, pourquoi pas, en projets.</p>
    </div>
    <div class="deux" style="align-items:start">
      <div>
        <h2>Une soirée, pas à pas</h2>
        <ol class="deroule">
          <li><strong>Accueil</strong>On s’installe, on se sert un café ou un thé.</li>
          <li><strong>Présentation de La Turbine et de la question</strong>L’association, son cadre, et pourquoi ce sujet.</li>
          <li><strong>Baromètre de départ</strong>Où en suis-je avant d’avoir entendu les autres ?</li>
          <li><strong>L’invité·e prend la parole</strong>Un éclairage, un témoignage, une expérience.</li>
          <li><strong>La discussion</strong>Animée, avec la parole distribuée, des relances, des temps de silence.</li>
          <li><strong>Baromètre de fin</strong>Qu’est-ce qui a bougé, ou pas ?</li>
          <li><strong>Conclusion et prochain rendez-vous</strong>Ce qu’on a compris, ce qui reste discuté.</li>
          <li><strong>Moment convivial</strong>On continue la conversation autour d’une boisson.</li>
        </ol>
      </div>
      <div>
        <img src="img/affiche-premier-rendez-vous.webp" alt="Affiche du premier rendez-vous : Sommes-nous encore capables de débattre ensemble ? On vient se rencontrer, écouter, questionner, confronter." width="800" height="1200" loading="lazy" style="width:100%;max-width:420px;margin-inline:auto">
        <p style="margin-top:20px">Chaque séance garde le même cadre mais peut changer de méthode : cercle de parole, petits groupes, world café, atelier de propositions…</p>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-ciel" id="charte" aria-labelledby="t-charte">
  <div class="wrap">
    <div class="sec-tete">
      <h2 id="t-charte">La charte du débat : nos huit engagements</h2>
      <p class="lede">La Turbine accueille des opinions diverses sans chercher à fabriquer un consensus artificiel. La charte garantit un débat libre, argumenté, inclusif et compatible avec la sécurité des personnes.</p>
    </div>
    <ol class="engagements">
      <li>Nous discutons des idées, des faits et des propositions, jamais de la dignité des personnes.</li>
      <li>Nous laissons finir une intervention avant de répondre.</li>
      <li>Nous distinguons clairement fait vérifiable, expérience vécue, interprétation et opinion.</li>
      <li>Nous acceptons le désaccord et reformulons loyalement le point de vue différent.</li>
      <li>Nous donnons une place aux personnes qui parlent peu.</li>
      <li>Nous refusons les propos haineux, discriminatoires, diffamatoires ou incitant à la violence.</li>
      <li>Nous respectons la liberté de conscience, la laïcité et l’indépendance de La Turbine.</li>
      <li>Nous ne transformons pas la rencontre en meeting, en opération de prosélytisme ou en campagne électorale.</li>
    </ol>
    <div class="btn-row"><a class="btn" href="${docLink('charte', 'documents/charte-du-debat-la-turbine.pdf')}">${ic('dl')} Télécharger la charte (PDF)</a></div>
  </div>
</section>

<section class="sec" aria-labelledby="t-animation">
  <div class="wrap deux">
    <div>
      <h2 id="t-animation">Le rôle de l’animation</h2>
      <p>L’animateur ou l’animatrice présente la question, rappelle le cadre, distribue la parole, protège les temps de silence et synthétise les accords, les désaccords et les questions ouvertes. Iel ne tranche pas le débat et ne défend pas de position personnelle pendant la séance.</p>
      <p>Pour que chacun·e trouve sa place : le baromètre de La Turbine, en début et en fin de séance, et un mur de synthèse en trois colonnes (accords, désaccords, pistes).</p>
    </div>
    <div class="bulle" style="font-size:1.1rem">
      <p><strong>Formule d’ouverture</strong></p>
      <p>« La Turbine est un espace indépendant et pluraliste. Nous ne cherchons pas à gagner le débat, mais à mieux comprendre. Vous pouvez parler, écouter ou passer votre tour. Nous discutons des idées, pas des personnes. »</p>
    </div>
  </div>
</section>`,
});

// ───────── ASSOCIATION ─────────
pages.push({
  file: 'association.html',
  crumb: 'L’association',
  title: 'L’association La Turbine — qui sommes-nous ?',
  desc: 'La Turbine est une association loi 1901 indépendante de tout parti, créée le 2 septembre 2026 à Montauban. Objet, valeurs, gouvernance bénévole et lien avec le Génie.',
  body: `
<section class="sec">
  <div class="wrap">
    <div class="sec-tete">
      <h1>L’association</h1>
      <p class="lede">La Turbine est une association loi 1901, à gestion bénévole, créée le 2 septembre 2026 à Montauban.</p>
    </div>
    <div class="trois">
      <div class="carte"><h3>Son objet</h3><p>Créer, organiser et animer à Montauban un espace convivial de débat, de réflexion, d’éducation populaire et de participation citoyenne, notamment sous la forme de cafés politiques et culturels.</p></div>
      <div class="carte"><h3>Le pluralisme</h3><p>Favoriser l’expression pluraliste, l’esprit critique et la compréhension des enjeux sociaux, démocratiques, écologiques, économiques, culturels et locaux.</p></div>
      <div class="carte"><h3>Les rencontres</h3><p>Réunir habitant·es, associations, chercheur·ses, élu·es, journalistes, professionnel·les, étudiant·es et citoyen·nes autour de la même table.</p></div>
    </div>
  </div>
</section>

<section class="sec sec-moutarde" aria-labelledby="t-indep">
  <div class="wrap deux">
    <div>
      <h2 id="t-indep">Indépendante, vraiment</h2>
      <p class="lede">La Turbine est indépendante de tout parti politique, de toute organisation syndicale, de toute entreprise et de tout courant de pensée.</p>
      <p>Elle ne soutient et ne finance aucune candidature électorale. Elle permet l’expression pluraliste des opinions, dans le respect de la loi et de sa <a href="le-principe.html#charte">charte du débat</a>.</p>
    </div>
    <div class="bulle" style="font-size:1.1rem">
      <p>Pas besoin d’être d’accord. Venez avec vos idées. Et surtout, avec vos oreilles.</p>
    </div>
  </div>
</section>

<section class="sec" aria-labelledby="t-fonct">
  <div class="wrap deux" style="align-items:start">
    <div>
      <h2 id="t-fonct">Comment ça fonctionne</h2>
      <ul>
        <li><strong>Une cotisation de ${esc(COT)}</strong> par personne et par année civile.</li>
        <li><strong>Une gestion bénévole</strong> et transparente, portée par un bureau : président·e, secrétaire, trésorier·ère.</li>
        <li><strong>Des activités ouvertes</strong> aux adhérent·es comme au public.</li>
        <li><strong>À titre accessoire</strong>, des boissons sans alcool, une petite restauration ou des publications pour financer les activités.</li>
        <li><strong>Des partenariats</strong> avec des associations, institutions, médias et acteurs de l’économie sociale et solidaire.</li>
      </ul>
    </div>
    <div>
      <h2>L’équipe</h2>
      <p>${EQUIPE.map((m) => `<strong>${esc(m.nom)}</strong>, ${esc(m.role)}.`).join('<br>')}</p>
      <p>Pour les contacter : <a href="mailto:${MAIL}">${MAIL}</a>.</p>
      <h2 style="margin-top:34px">Accueillie au Génie</h2>
      <p>Les cafés ont lieu au <a href="https://genie-montauban.fr/">Génie</a>, tiers-lieu associatif (économie sociale et solidaire, éducation populaire) situé au 12 rue du Génie à Montauban. Le Génie met ses espaces à disposition de La Turbine ; chaque structure reste indépendante.</p>
    </div>
  </div>
</section>`,
});

// ───────── REJOINDRE ─────────
pages.push({
  file: 'rejoindre.html',
  crumb: 'Rejoindre',
  title: 'Rejoindre La Turbine — adhérer, proposer, aider',
  desc: `Adhérez à La Turbine pour ${COT} par an, proposez un thème ou un invité, donnez un coup de main (accueil, buvette, animation) ou devenez partenaire.`,
  body: `
<section class="sec">
  <div class="wrap">
    <div class="sec-tete">
      <h1>Rejoindre La Turbine</h1>
      <p class="lede">Venir au café suffit. Mais si l’envie vous prend de soutenir l’association, voici les façons de le faire.</p>
    </div>
    <div class="trois">
      <div class="carte"><span class="num">${esc(COT)}</span><h3>Adhérer</h3><p>La cotisation est de ${esc(COT)} par personne et par année civile. Elle se règle en espèces ou par chèque à l’ordre de « La Turbine », sur place lors d’un café.</p><p><a class="lien-fl" href="${docLink('bulletin', 'documents/bulletin-adhesion-la-turbine.pdf')}">${ic('dl')} Bulletin d’adhésion (PDF)</a></p></div>
      <div class="carte"><span class="num">+</span><h3>Donner un coup de main</h3><p>Accueil, buvette, animation, affichage, photos : toute aide compte. Dites-nous ce que vous aimeriez faire.</p><p><a class="lien-fl" href="mailto:${MAIL}?subject=Je%20peux%20donner%20un%20coup%20de%20main">Écrire à l’équipe ${ic('fl')}</a></p></div>
      <div class="carte"><span class="num">&amp;</span><h3>Devenir partenaire</h3><p>Associations, médias, structures de l’économie sociale et solidaire : relayez les rendez-vous ou co-construisez un café.</p><p><a class="lien-fl" href="mailto:${MAIL}?subject=Partenariat%20avec%20La%20Turbine">Proposer un partenariat ${ic('fl')}</a></p></div>
    </div>
  </div>
</section>

<section class="sec sec-ciel" id="proposer" aria-labelledby="t-proposer">
  <div class="wrap deux">
    <div>
      <h2 id="t-proposer">Proposer un thème ou un·e invité·e</h2>
      <p class="lede">Une question qui vous travaille ? Une personne qui aurait quelque chose à dire ? Les cafés se construisent aussi avec vous.</p>
      <div class="btn-row"><a class="btn" href="mailto:${MAIL}?subject=Je%20propose%20un%20th%C3%A8me%20ou%20un%C2%B7e%20invit%C3%A9%C2%B7e">${ic('mail')} Envoyer ma proposition</a></div>
    </div>
    <div class="bulle" style="font-size:1.1rem">
      <p>Les thèmes évoqués pour la suite : ${THEMES.map((t) => esc(t.charAt(0).toLowerCase() + t.slice(1))).join(', ')}… et celles et ceux que vous apporterez.</p>
    </div>
  </div>
</section>

<section class="sec" aria-labelledby="t-contact">
  <div class="wrap deux">
    <div>
      <h2 id="t-contact">Nous écrire, nous suivre</h2>
      <ul class="infos">
        <li>${ic('mail')}<span><strong><a href="mailto:${MAIL}">${MAIL}</a></strong></span></li>
        <li>${ic('fb')}<span><a href="${FB}" rel="noopener" target="_blank">La Turbine, café politique, poétique, citoyen</a><small>Page Facebook (nouvel onglet)</small></span></li>
        <li>${ic('ig')}<span><a href="${IG}" rel="noopener" target="_blank">@laturbinecafe</a><small>Instagram (nouvel onglet)</small></span></li>
        <li>${ic('pin')}<span><strong>Le Génie</strong><small>12 rue du Génie, 82000 Montauban</small></span></li>
      </ul>
    </div>
    <img src="img/affiche-8-octobre.webp" alt="Affiche du premier café de La Turbine, le 8 octobre 2026 au Génie" width="1000" height="914" loading="lazy">
  </div>
</section>`,
});

// ───────── PRESSE ─────────
pages.push({
  file: 'presse.html',
  crumb: 'Presse',
  title: 'Presse et visuels — La Turbine',
  desc: 'Présentation de La Turbine en quelques lignes, informations pratiques, logo et affiches à télécharger pour les médias et les partenaires.',
  body: `
<section class="sec">
  <div class="wrap">
    <div class="sec-tete">
      <h1>Presse &amp; visuels</h1>
      <p class="lede">Tout ce qu’il faut pour parler de La Turbine : un texte de présentation, les informations pratiques et les visuels à télécharger.</p>
    </div>
    <div class="deux" style="align-items:start">
      <div>
        <h2>En quelques lignes</h2>
        <p>La Turbine est une association montalbanaise indépendante de tout parti. Elle organise au Génie, à Montauban, des cafés politiques et poétiques : des rendez-vous pour écouter, questionner et confronter les idées autour de sujets qui traversent notre société et notre territoire.</p>
        <p>Prendre le temps de converser ne signifie ni renoncer à ses convictions ni rechercher systématiquement le compromis. L’enjeu est ailleurs : ne pas simplifier les désaccords, mais les complexifier, en croisant les arguments, les expériences et les points de vue.</p>
        <h3 style="margin-top:28px">Informations pratiques</h3>
        <ul class="infos">
          ${actif ? `<li>${ic('cal')}<span><strong>${N.date}</strong><small>${N.heure} · « ${esc(NEXT.titre)} »</small></span></li>` : ''}
          <li>${ic('pin')}<span><strong>Le Génie</strong><small>12 rue du Génie, 82000 Montauban</small></span></li>
          <li>${ic('ticket')}<span><strong>Entrée libre</strong><small>Adhésion facultative : ${esc(COT)} par an</small></span></li>
          <li>${ic('mail')}<span><a href="mailto:${MAIL}">${MAIL}</a><small>Contact presse · communiqué sur demande</small></span></li>
        </ul>
      </div>
      <div>
        <h2>À télécharger</h2>
        <p>Merci de ne pas modifier le logo.</p>
        <div class="btn-row" style="flex-direction:column;align-items:stretch">
          <a class="btn btn-clair" href="img/logo.png" download>${ic('dl')} Logo (PNG, fond transparent)</a>
          ${actif ? `<a class="btn btn-clair" href="${rel(NEXT.affiche)}" download>${ic('dl')} Affiche du ${fr(NEXT.date, { day: 'numeric', month: 'long' })}</a>` : ''}
          ${CAFES.slice(0, 2).map((c) => `<a class="btn btn-clair" href="${rel(c.affiche)}" download>${ic('dl')} Affiche du ${fr(c.date, { day: 'numeric', month: 'long' })}</a>`).join('\n          ')}
          ${DOCS.filter((d) => d.categorie === 'Presse' || d.emplacement === 'charte').map((d) => `<a class="btn btn-clair" href="${rel(d.fichier)}" download>${ic('dl')} ${esc(d.titre)}</a>`).join('\n          ')}
          <a class="btn btn-clair" href="documents.html">Tous les documents ${ic('fl')}</a>
        </div>
        <img src="img/logo.webp" alt="Logo de La Turbine" width="400" height="141" style="margin-top:28px;background:#fff;border:var(--trait);border-radius:14px;padding:18px" loading="lazy">
      </div>
    </div>
  </div>
</section>`,
});

pages.push({
  file: 'mentions-legales.html',
  crumb: 'Mentions légales',
  title: 'Mentions légales et données personnelles — La Turbine',
  desc: 'Éditeur, hébergeur et protection des données du site de l’association La Turbine : aucun cookie, aucun outil de mesure, aucune donnée collectée.',
  body: `
<section class="sec">
  <div class="wrap" style="max-width:780px">
    <h1>Mentions légales</h1>
    <h2>Éditeur du site</h2>
    <p><strong>LA TURBINE</strong> — « Café politique, poétique et espace de débat citoyen »<br>
    Association régie par la loi du 1<sup>er</sup> juillet 1901 et son décret d’application du 16 août 1901, constituée à Montauban le 2 septembre 2026 pour une durée illimitée. Déclaration de création transmise à l’administration le 11 septembre 2026.<br>
    Siège social : 12 rue du Génie, 82000 Montauban.<br>
    Contact : <a href="mailto:${MAIL}">${MAIL}</a></p>
    <p><strong>Objet</strong> (article 2 des statuts) : créer, gérer et animer un espace convivial de débat, de réflexion et d’éducation populaire, notamment sous la forme de cafés politiques organisés au sein du tiers-lieu Le Génie, à Montauban. L’association est indépendante de tout parti politique, organisation syndicale, entreprise ou courant de pensée. Elle ne soutient ni ne finance de candidature électorale, tout en permettant l’expression pluraliste des opinions dans le respect de la loi.</p>
    <p><strong>Représentant légal :</strong> le ou la président·e de l’association (article 14 des statuts).</p>
    <h2>Responsable de la publication</h2>
    <p>${esc(SITE.responsable_publication)}, président de l’association La Turbine.</p>
    <h2>Conception et maintenance</h2>
    <p>MUSIVA (<a href="https://musiva.fr/" rel="noopener">musiva.fr</a>). Pour signaler une erreur ou demander une modification : <a href="mailto:${MAIL}">${MAIL}</a>.</p>
    <h2>Hébergement</h2>
    <p>Site statique hébergé par GitHub Pages — GitHub, Inc., 88 Colin P. Kelly Jr Street, San Francisco, CA 94107, États-Unis.</p>
    <h2 id="donnees">Données personnelles</h2>
    <p>Ce site ne contient aucun formulaire, n’utilise aucun cookie et n’intègre aucun outil de mesure d’audience ni contenu de réseau social. Aucune donnée personnelle n’est collectée par l’association via ce site.</p>
    <p>Si vous nous écrivez par courriel, votre adresse n’est utilisée que pour vous répondre. Vous pouvez demander sa suppression à tout moment à ${MAIL}. Comme sur tout site web, l’hébergeur peut enregistrer techniquement votre adresse IP lors de la consultation.</p>
    <p>Les liens vers Facebook et Instagram mènent à des services tiers, soumis à leurs propres conditions et règles de confidentialité.</p>
    <h2>Crédits</h2>
    <p>Logo et illustrations : La Turbine. Le contenu de ce site est publié sous la responsabilité de l’association ; sa reproduction nécessite son accord. Polices Bricolage Grotesque et DM Sans (licence SIL Open Font).</p>
  </div>
</section>`,
});

// ───────── DOCUMENTS ─────────
const CATS = ['Association', 'Charte du débat', 'Presse', 'Autre'];
pages.push({
  file: 'documents.html',
  crumb: 'Documents',
  title: 'Documents à télécharger — La Turbine',
  desc: 'Les documents de La Turbine à télécharger : charte du débat, bulletin d’adhésion et autres ressources.',
  body: `
<section class="sec">
  <div class="wrap">
    <div class="sec-tete">
      <h1>Documents</h1>
      <p class="lede">Les documents de l’association, à télécharger ou à imprimer.</p>
    </div>
    ${CATS.map((cat) => { const l = DOCS.filter((d) => (d.categorie || 'Autre') === cat && d.fichier); return l.length ? `<h2 style="margin-top:34px">${esc(cat)}</h2>
    <div class="rdv-liste">${l.map((d) => `
      <article class="rdv-ligne" style="grid-template-columns:1fr auto;align-items:center">
        <div><h3 style="margin-bottom:.2em">${esc(d.titre)}</h3>${d.description ? `<p style="margin:0">${esc(d.description)}</p>` : ''}</div>
        <a class="btn btn-clair" href="${rel(d.fichier)}" download>${ic('dl')} Télécharger</a>
      </article>`).join('')}
    </div>` : ''; }).join('')}
  </div>
</section>`,
});

// ───────── Écriture du site ─────────
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const p of pages) fs.writeFileSync(path.join(OUT, p.file), page(p));
for (const d of ['img', 'documents', 'assets']) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
for (const f of ['turbine.css', 'turbine.js', 'favicon-turbine.png', 'og-turbine.jpg', 'robots.txt', 'CNAME']) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

// Page 404 : même habillage, liens absolus
{
  const idx = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
  let head = idx.slice(0, idx.indexOf('<main id="contenu">')), foot = idx.slice(idx.indexOf('</main>'));
  head = head.replace(/<title>.*?<\/title>/, '<title>Page introuvable — La Turbine</title>').replace('<head>', '<head>\n  <meta name="robots" content="noindex">').replace(/<link rel="canonical"[^>]*>\n/, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  const body = '<main id="contenu"><section class="sec"><div class="wrap" style="max-width:700px"><span class="etiquette">Erreur 404</span><h1>Cette page s’est perdue en route.</h1><p class="lede">Elle n’existe pas, ou plus. Revenez à l’accueil ou regardez le prochain rendez-vous.</p><div class="btn-row"><a class="btn" href="/">Accueil</a><a class="btn btn-clair" href="/rendez-vous.html">Prochain rendez-vous</a></div></div></section>\n';
  const abs = (t) => t.replace(/(href|src)="(?!https?:|mailto:|#|\/|data:)([^"]*)"/g, (m, a, u) => `${a}="/${u}"`).replace('href="/./"', 'href="/"');
  fs.writeFileSync(path.join(OUT, '404.html'), abs(head + body + foot));
}

// Plan du site
const today = new Date().toISOString().slice(0, 10);
const prio = { 'index.html': ['weekly', '1.0'], 'rendez-vous.html': ['weekly', '0.9'], 'memoire.html': ['weekly', '0.8'], 'le-principe.html': ['yearly', '0.6'], 'association.html': ['yearly', '0.6'], 'rejoindre.html': ['yearly', '0.6'], 'documents.html': ['monthly', '0.4'], 'presse.html': ['yearly', '0.4'], 'mentions-legales.html': ['yearly', '0.2'] };
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  pages.map((p) => `  <url><loc>${BASE}${p.file === 'index.html' ? '' : p.file}</loc><lastmod>${today}</lastmod><changefreq>${(prio[p.file] || ['monthly'])[0]}</changefreq><priority>${(prio[p.file] || [0, '0.5'])[1]}</priority></url>`).join('\n') + '\n</urlset>\n');
console.log('Site généré :', pages.length, 'pages,', CAFES.length, 'café(s) dans la mémoire');
