/*
 * Configuration du site — modifiez ce fichier pour gérer les commerciaux.
 *
 *   id   : numéro du commercial (unique ; ne jamais réutiliser le numéro d'un ancien commercial)
 *   name : nom affiché dans l'application et imprimé sur le bon de commande
 *   pin  : code d'accès optionnel ('' = pas de code)
 *
 * Attention : le code PIN évite seulement de se tromper de commercial.
 * Le site est statique et ce fichier est public : ce n'est pas une vraie sécurité.
 */
window.OTC_CONFIG = {
    company: {
        short: 'O.T.C',
        name: 'Optical Trade Company',
        address: '4 Av. Taieb Mhiri App. N°2 - 2080 ARIANA',
        phone: '00 216 29 808 579',
        sav: '29 760 935',
        email: 'opticaltrade.company@gmail.com',
        mf: '954101H/A/M',
        rc: 'B03128200',
        // Logo imprimé sur le bon : '' = logo O.T.C dessiné par le site.
        // Pour utiliser le fichier officiel, copiez-le dans assets/ puis ex. 'assets/logo-otc.png'
        logo: ''
    },

    commercials: [
        { id: 1, name: 'Abd Rahmen Chaari', pin: '' },
        { id: 2, name: 'Manel Maamri', pin: '' },
        { id: 3, name: 'Ahmed Boujelben', pin: '' },
        { id: 4, name: 'Naim Fessi', pin: '' }
    ]
};
