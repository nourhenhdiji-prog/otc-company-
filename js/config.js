/*
 * Configuration du site — modifiez ce fichier pour gérer les commerciaux.
 *
 *   id   : numéro du commercial (unique ; ne jamais réutiliser le numéro d'un ancien commercial)
 *   name : nom affiché dans l'application et imprimé sur le bon de commande
 *   pinHash : empreinte SHA-256 du texte otc:<id>:<mot de passe> (le mot de passe n'est pas écrit ici)
 *
 * Attention : le mot de passe évite qu'un commercial entre sur le compte d'un autre.
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
        logo: 'assets/logo-otc.png',
        // Filigrane en fond de page : '' = symbole dessiné par le site.
        logoMark: 'assets/logo-otc-mark.png'
    },

    commercials: [
        { id: 1, name: 'Abd Rahmen Chaari', pinHash: '5fb00319bf4427463431e7ff2287ba4e38664a70fd2f0775b9db29c1250b751f' },
        { id: 2, name: 'Manel Maamri', pinHash: '95dacdd53c508bf72e0d5d6b287fc030f0a75573fb9165d5300a344887b70025' },
        { id: 3, name: 'Ahmed Boujelben', pinHash: '9475b4d7c25fcb842843c3d045ad833061b797422bc479ad782b3b4bbe186973' },
        { id: 4, name: 'Naim Fessi', pinHash: '93ec366d9b25b48973bb712ad8e5d6cec5df17af50048dd8b409d3de49705d31' }
    ]
};
