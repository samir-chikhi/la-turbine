# La Turbine — site web

Site de l'association **La Turbine** (cafés politiques & poétiques, Montauban) : <https://turbine.genie-montauban.fr/>

Le site est **généré automatiquement** : les bénévoles modifient les contenus dans une **interface d'administration** (Pages CMS) ; à chaque enregistrement, GitHub reconstruit et republie le site en 1 à 2 minutes. Aucun logiciel à installer.

## Pour les bénévoles : modifier le site

1. Aller sur **<https://app.pagescms.org>** et cliquer sur « Se connecter avec GitHub ».
2. Choisir le dépôt **la-turbine** (si l'application demande des droits d'accès, accepter : ils servent uniquement à lire et modifier ce dépôt).
3. Dans le menu de gauche, choisir ce que l'on veut modifier :

| Menu | À quoi ça sert |
|---|---|
| **Prochain café** | Date, heures, question, invité·e, affiche du prochain rendez-vous (affiché sur l'accueil et la page Rendez-vous). Décocher « Afficher un prochain café » quand aucune date n'est fixée. |
| **La mémoire (cafés passés)** | Un café = une fiche : question, date, invité·e, affiche, compte rendu. *Add an entry* pour en ajouter un après chaque café. |
| **Questions fréquentes** | Les questions/réponses de la page Rendez-vous. |
| **Pistes de thèmes** | Les thèmes évoqués pour la suite. |
| **Documents à télécharger** | Ajouter un PDF (statuts, bulletin, dossier de presse…) : il apparaît sur la page « Documents ». |
| **Équipe** | Les noms et fonctions affichés sur la page L'association. |
| **Réglages du site** | E-mail, liens Facebook/Instagram, montant de la cotisation, texte d'accueil. |
| **Images / Documents (Media)** | Bibliothèque des fichiers envoyés (affiches, PDF). |

4. Cliquer sur **Save** : le site se met à jour tout seul. On peut suivre l'avancement dans l'onglet *Actions* du dépôt sur GitHub (une coche verte = publié).

### Après chaque café (marche à suivre)
1. **La mémoire → Add an entry** : copier la question, la date, les heures, l'invité·e et l'affiche depuis « Prochain café » ; rédiger le compte rendu ; *Save*.
2. **Prochain café** : changer la date, la question, l'affiche… du café suivant (ou décocher « Afficher » si pas de date).

## Donner l'accès à une personne
- Sur github.com → dépôt **la-turbine** → *Settings → Collaborators → Add people* → son nom d'utilisateur GitHub. Il ou elle se connecte ensuite sur <https://app.pagescms.org> avec son compte GitHub.
- Seules les personnes ajoutées comme collaborateur·rices peuvent modifier le site. Pour retirer l'accès : même écran, *Remove*.
- Chaque modification est tracée (qui, quand, quoi) dans l'historique GitHub (*Commits*) et peut être annulée.

## Organisation du dépôt (pour une personne technique)

| Chemin | Contenu |
|---|---|
| `content/` | Les contenus éditables (JSON + une fiche Markdown par café dans `content/cafes/`). |
| `.pages.yml` | Configuration de l'interface d'administration (champs, libellés, dossiers de fichiers). |
| `tools/build.js` | Générateur du site (Node.js, sans dépendance) : lit `content/` et écrit `_site/`. Contient aussi les textes des pages « fixes » (Le principe, L'association…). |
| `.github/workflows/deploy.yml` | Lance le générateur puis publie `_site/` sur GitHub Pages à chaque push sur `main`. |
| `turbine.css`, `turbine.js` | Style et menu mobile. |
| `img/`, `documents/`, `assets/` | Images, PDF, polices (copiés tels quels dans le site). |
| `CNAME` | Nom de domaine `turbine.genie-montauban.fr` (CNAME `turbine` → `samir-chikhi.github.io.` chez OVH ; à adapter si le dépôt change de propriétaire). |

Tester en local : `node tools/build.js` puis ouvrir `_site/index.html` (ou `npx serve _site`).
Modifier un texte « fixe » (page Le principe, charte, mentions légales…) : éditer `tools/build.js`, enregistrer sur `main` ; le site se republie.

## Règles à respecter
- Aucun cookie, aucun outil de mesure, aucun formulaire, aucun widget de réseau social : seulement des liens. Si l'un d'eux est ajouté, mettre à jour les mentions légales.
- Aucun secret ni pièce d'identité dans ce dépôt (il est public).
- Photos de participant·es : uniquement avec leur accord (droit à l'image).
- Écriture inclusive : utiliser le point médian (« adhérent·e », « invité·e »).

Conception et maintenance : MUSIVA.
