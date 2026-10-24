# La Turbine — site web

Site de l'association **La Turbine** (cafés politiques & poétiques, Montauban).
Adresse prévue : <https://turbine.genie-montauban.fr/>

Site **statique** : de simples fichiers HTML/CSS, **aucun outil à installer, aucune compilation**.
Tout changement poussé sur la branche `main` est publié automatiquement par GitHub Pages en 1 à 2 minutes.

## Les fichiers

| Fichier | Contenu |
|---|---|
| `index.html` | Accueil (le prochain café y est présenté) |
| `rendez-vous.html` | Prochain café, FAQ, cafés passés, pistes de thèmes |
| `memoire.html` | La mémoire de La Turbine : un bloc par café passé, avec compte rendu (à ajouter à chaque café) |
| `le-principe.html` | Déroulé d'une soirée, charte du débat, rôle de l'animation |
| `association.html` | Objet, indépendance, fonctionnement, équipe |
| `rejoindre.html` | Adhésion (1 €), bénévolat, partenariat, contact |
| `presse.html` | Présentation courte, infos pratiques, visuels à télécharger |
| `mentions-legales.html` | Mentions légales et données personnelles |
| `turbine.css` | Tout le style (couleurs en haut du fichier, section `:root`) |
| `img/` | Logo et affiches (format webp) |
| `documents/` | PDF : charte du débat, bulletin d'adhésion |
| `CNAME` | Nom de domaine du site (ne pas supprimer) |

## Après chaque café : mettre à jour le site (sans rien installer)

Tout se fait depuis le navigateur, sur github.com :

1. **Ajouter l'affiche** : dans le dossier `img/`, bouton *Add file → Upload files*. Format conseillé : `.webp`, 1000 px de large (convertissable sur squoosh.app).
2. **Modifier le texte** : ouvrir le fichier, cliquer sur le crayon ✏️ (*Edit this file*), changer le texte, puis *Commit changes*.
3. Les endroits à changer pour passer au café suivant :
   - `index.html` et `rendez-vous.html` : bloc « Deuxième rendez-vous » (titre, date, heure, texte de la bulle, affiche) et la fiche `"@type":"Event"` en bas de l'en-tête (dates `startDate` / `endDate`) ;
   - `memoire.html` : ajouter le café qui vient d'avoir lieu en haut de la liste (copier le bloc `<article class="rdv-ligne">` du café précédent) avec son compte rendu ;
   - `presse.html` : la date et le titre dans « Informations pratiques ».
4. Chercher « 19 novembre » dans chaque fichier (touche `t` sur GitHub, ou la loupe) pour ne rien oublier.

## Donner l'accès à quelqu'un

- **Un·e bénévole** : sur github.com → ce dépôt → *Settings → Collaborators → Add people* → son nom d'utilisateur GitHub (ou son e-mail). Il ou elle pourra modifier le site, rien d'autre.
- **Passer la main à l'association** : créer une organisation GitHub, puis *Settings → Danger zone → Transfer ownership*. Le site et son adresse continuent de fonctionner.

## Nom de domaine

`turbine.genie-montauban.fr` est un sous-domaine du Génie, géré chez OVH :
enregistrement **CNAME** `turbine` → `samir-chikhi.github.io.` (à mettre à jour si le dépôt change de propriétaire :
la cible devient `<nouveau-compte>.github.io.`). Dans GitHub : *Settings → Pages → Custom domain*, avec **Enforce HTTPS** coché.

## Ce qui est volontairement absent

- Aucun cookie, aucun outil de mesure, aucun formulaire, aucun widget Facebook/Instagram : seulement des liens. Si vous en ajoutez un, mettez à jour `mentions-legales.html` et la politique de confidentialité.
- Aucun secret, mot de passe ou pièce d'identité dans ce dépôt (il est public). Ne jamais y déposer les documents administratifs de l'association.
- Photos de participants : à ne publier qu'avec leur accord (droit à l'image).

## Tester sur son ordinateur (facultatif)

Double-cliquer sur `index.html` suffit pour un aperçu. Pour un rendu identique à la production : `npx serve .` puis ouvrir http://localhost:3000.
