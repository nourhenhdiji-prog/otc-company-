# O.T.C — Bons de commande

Application web statique (HTML/CSS/JS, sans build) pour créer les bons de commande de montures d'**Optical Trade Company**.

- Chaque commercial se connecte avec **son nom** et ne voit que **ses propres commandes**.
- Les commandes sont numérotées par commercial : le commercial 1 a ses commandes n°1, 2, 3… (code `BC-01-0001`, `BC-01-0002`…), le commercial 2 a les siennes (`BC-02-0001`…). Les numéros restent successifs : un numéro libéré par une suppression est repris par la commande suivante.
- Enregistrement automatique, recherche, filtres brouillon / générée, duplication d'une commande.
- Génération du bon au format A4 en image PNG (42 références par page), téléchargement ou partage direct (WhatsApp, e-mail…) sur mobile.
- Mode clair / sombre automatique, adapté au téléphone.

## Configurer les commerciaux

Modifiez [js/config.js](js/config.js) :

```js
commercials: [
    { id: 1, name: 'Ahmed Ben Ali', pin: '1234' },
    { id: 2, name: 'Sarra Trabelsi', pin: '' }   // '' = pas de code
]
```

> Le code PIN évite de se tromper de commercial, mais ce n'est **pas** une sécurité : le site est public et ce fichier est lisible par tous.

## Logo imprimé

Le bon imprimé utilise le logo officiel ([assets/logo-otc.png](assets/logo-otc.png)) et son symbole en filigrane ([assets/logo-otc-mark.png](assets/logo-otc-mark.png)), sur fond transparent.
Pour les changer : remplacez ces fichiers ou modifiez `logo` et `logoMark` dans [js/config.js](js/config.js).

## Où sont stockées les données ?

Dans le navigateur de chaque appareil (`localStorage`), séparément pour chaque commercial. Il n'y a pas de serveur.
Conséquences :

- un commercial retrouve ses commandes sur **le même téléphone / navigateur** ;
- pour changer d'appareil ou faire une sauvegarde : **Mes commandes → Exporter**, puis **Importer** sur l'autre appareil (une sauvegarde ne peut être importée que par son propre commercial) ;
- vider les données du navigateur efface les commandes non exportées.

## Tester en local

Ouvrez `index.html` dans le navigateur, ou lancez un petit serveur :

```bash
npx serve .
```

## Publier

### GitHub Pages

```bash
git init
git add .
git commit -m "Bons de commande OTC"
git branch -M main
git remote add origin https://github.com/<compte>/<depot>.git
git push -u origin main
```

Puis sur GitHub : **Settings → Pages → Source : Deploy from a branch → `main` / `/ (root)`**.
Le site sera disponible sur `https://<compte>.github.io/<depot>/`.

### GitLab Pages

Le fichier [.gitlab-ci.yml](.gitlab-ci.yml) est déjà prêt. Il suffit de pousser sur la branche par défaut :

```bash
git remote add gitlab https://gitlab.com/<compte>/<depot>.git
git push -u gitlab main
```

Le site sera publié automatiquement (voir **Deploy → Pages** dans le projet GitLab).

## Structure

```
index.html        page unique
css/styles.css    design
js/config.js      société + liste des commerciaux
js/app.js         application (connexion, commandes, génération du bon)
assets/           icône
.gitlab-ci.yml    déploiement GitLab Pages
.nojekyll         désactive Jekyll sur GitHub Pages
```
