(function () {
    'use strict';

    const CFG = window.OTC_CONFIG;
    const COMPANY = CFG.company;
    const ITEMS_PER_TABLE = 21;
    const ITEMS_PER_PAGE = ITEMS_PER_TABLE * 2;
    const SESSION_KEY = 'otc:v1:session';
    const DOC_FONT_STACK = "'Inter', Arial, sans-serif";

    const app = document.getElementById('app');
    const toastsEl = document.getElementById('toasts');

    // Search/filter for the order list survive navigation inside the session.
    const listUi = { query: '', filter: 'all' };
    // Pending autosave of the open order, flushed before leaving the editor.
    let pendingSave = null;

    const ICON = {
        plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
        minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
        close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
        back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
        chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
        logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/></svg>',
        search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
        download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
        upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>',
        share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
        copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
        trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
        file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
        lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'
    };

    /* ---------- OTC logo (grey parts follow currentColor) ---------- */

    const LOGO_RED = 'stroke: var(--brand-red, #a3222b);';

    function logoMarkPaths() {
        return '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M30 14 68 52 30 90" stroke="currentColor" stroke-width="14"/>' +
            '<path d="M26 34 44 52 26 70" style="' + LOGO_RED + '" stroke-width="12"/>' +
            '<path d="M82 38 92 28" stroke="currentColor" stroke-width="14"/>' +
        '</g>';
    }

    function logoMark(style) {
        return '<svg class="otc-mark" viewBox="0 0 104 104" aria-hidden="true"' + (style ? ' style="' + style + '"' : '') + '>' + logoMarkPaths() + '</svg>';
    }

    function logoFull(style) {
        return '<svg class="otc-logo" viewBox="0 0 330 110" role="img" aria-label="OTC Optical Trade Company"' + (style ? ' style="' + style + '"' : '') + '>' +
            logoMarkPaths() +
            '<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="7">' +
                '<circle cx="152" cy="48" r="28" stroke="currentColor"/>' +
                '<path d="M118 44A36 36 0 0 1 176 16" style="' + LOGO_RED + '"/>' +
                '<path d="M196 20H240M218 20V77" stroke="currentColor"/>' +
                '<path d="M299.8 28.2A28 28 0 1 0 299.8 67.8" stroke="currentColor"/>' +
            '</g>' +
            '<text x="230" y="102" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="currentColor">Optical Trade Company</text>' +
        '</svg>';
    }

    /* ---------- Storage (one namespace per commercial) ---------- */

    function readJson(storage, key, fallback) {
        try {
            const raw = storage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writeJson(storage, key, value) {
        try {
            storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage error:', error);
            toast('Impossible d\'enregistrer sur cet appareil (stockage plein ou bloqué).', 'error');
            return false;
        }
    }

    function ordersKey(agentId) {
        return 'otc:v1:c' + agentId + ':orders';
    }

    function loadOrders(agentId) {
        const orders = readJson(localStorage, ordersKey(agentId), []);
        return Array.isArray(orders) ? orders.map(normalizeOrder).filter(Boolean) : [];
    }

    function saveOrders(agentId, orders) {
        return writeJson(localStorage, ordersKey(agentId), orders);
    }

    function findOrder(agentId, number) {
        return loadOrders(agentId).find(function (order) { return order.number === number; }) || null;
    }

    function upsertOrder(agentId, order) {
        const orders = loadOrders(agentId);
        const index = orders.findIndex(function (o) { return o.number === order.number; });
        if (index === -1) {
            orders.push(order);
        } else {
            orders[index] = order;
        }
        return saveOrders(agentId, orders);
    }

    function deleteOrder(agentId, number) {
        saveOrders(agentId, loadOrders(agentId).filter(function (o) { return o.number !== number; }));
    }

    // Numbers stay successive: a new order takes the first number left free by a deletion.
    function takeNextNumber(agentId) {
        const used = new Set(loadOrders(agentId).map(function (o) { return o.number; }));
        let next = 1;
        while (used.has(next)) {
            next += 1;
        }
        return next;
    }

    function normalizeOrder(raw) {
        if (!raw || typeof raw !== 'object') {
            return null;
        }
        const number = parseInt(raw.number, 10);
        if (!number || number < 1) {
            return null;
        }
        return {
            number: number,
            createdAt: Number(raw.createdAt) || Date.now(),
            updatedAt: Number(raw.updatedAt) || Date.now(),
            generatedAt: Number(raw.generatedAt) || null,
            status: raw.status === 'generated' ? 'generated' : 'draft',
            date: typeof raw.date === 'string' && raw.date ? raw.date : today(),
            client: String(raw.client || ''),
            address: String(raw.address || ''),
            email: String(raw.email || ''),
            phone: String(raw.phone || ''),
            items: Array.isArray(raw.items) ? raw.items.map(function (item) {
                return {
                    ref: String((item && item.ref) || ''),
                    qty: sanitizeQty(item && item.qty),
                    note: String((item && item.note) || '')
                };
            }) : []
        };
    }

    function createOrder(agentId, base) {
        const now = Date.now();
        const order = normalizeOrder({
            number: takeNextNumber(agentId),
            createdAt: now,
            updatedAt: now,
            status: 'draft',
            date: today(),
            client: base ? base.client : '',
            address: base ? base.address : '',
            email: base ? base.email : '',
            phone: base ? base.phone : '',
            items: base ? base.items : [{ ref: '', qty: 1, note: '' }]
        });
        upsertOrder(agentId, order);
        return order;
    }

    /* ---------- Session ---------- */

    function getAgent(id) {
        return CFG.commercials.find(function (a) { return a.id === id; }) || null;
    }

    function currentAgent() {
        return getAgent(Number(readJson(localStorage, SESSION_KEY, 0)));
    }

    function signIn(agent) {
        writeJson(localStorage, SESSION_KEY, agent.id);
        location.hash = '#/';
        route();
    }

    function signOut() {
        flushPendingSave();
        localStorage.removeItem(SESSION_KEY);
        location.hash = '#/';
        route();
    }

    /* ---------- Helpers ---------- */

    function today() {
        const d = new Date();
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function pad(value, size) {
        return String(value).padStart(size, '0');
    }

    function orderCode(agentId, number) {
        return 'BC-' + pad(agentId, 2) + '-' + pad(number, 4);
    }

    function formatDate(iso) {
        if (!iso) {
            return '';
        }
        const parts = iso.split('-');
        return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : iso;
    }

    function sanitizeQty(value) {
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }

    function totalQty(items) {
        return items.reduce(function (sum, item) { return sum + (item.ref.trim() ? item.qty : 0); }, 0);
    }

    function filledItems(items) {
        return items.filter(function (item) { return item.ref.trim(); });
    }

    function plural(count, singular, pluralForm) {
        return count + ' ' + (count > 1 ? pluralForm : singular);
    }

    function toTitleCase(value) {
        return value.toLocaleLowerCase('fr-FR').replace(/(^|[\s\-'’])(\p{L})/gu, function (match, sep, letter) {
            return sep + letter.toLocaleUpperCase('fr-FR');
        });
    }

    function toUpper(value) {
        return value.toLocaleUpperCase('fr-FR');
    }

    function toSentenceCase(value) {
        const lower = value.toLocaleLowerCase('fr-FR');
        return lower.charAt(0).toLocaleUpperCase('fr-FR') + lower.slice(1);
    }

    // Rewrites an input's value without throwing the caret to the end.
    function applyCase(input, transform) {
        const value = input.value;
        const next = transform(value);
        if (next === value) {
            return;
        }
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = next;
        try {
            input.setSelectionRange(start, end);
        } catch (error) {
            /* type without selection support */
        }
    }

    function chunk(items, size) {
        const chunks = [];
        for (let i = 0; i < items.length; i += size) {
            chunks.push(items.slice(i, i + size));
        }
        return chunks;
    }

    function cleanFileName(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
            .trim()
            .replace(/\s+/g, '_');
    }

    function debounce(fn, delay) {
        let timer = null;
        const debounced = function () {
            window.clearTimeout(timer);
            timer = window.setTimeout(function () {
                timer = null;
                fn();
            }, delay);
        };
        debounced.flush = function () {
            if (timer) {
                window.clearTimeout(timer);
                timer = null;
                fn();
            }
        };
        return debounced;
    }

    function flushPendingSave() {
        if (pendingSave) {
            pendingSave.flush();
        }
    }

    function toast(message, tone) {
        const el = document.createElement('div');
        el.className = 'toast toast-' + (tone || 'neutral');
        el.setAttribute('role', tone === 'error' ? 'alert' : 'status');
        el.textContent = message;
        toastsEl.appendChild(el);
        window.setTimeout(function () {
            el.classList.add('is-leaving');
            window.setTimeout(function () { el.remove(); }, 250);
        }, 2600);
    }

    function brand() {
        return '<a class="brand" href="#/"><span class="brand-mark">' + (COMPANY.logoMark ? '<img src="' + esc(COMPANY.logoMark) + '" alt="">' : logoMark()) + '</span>' +
            '<span class="brand-text"><strong>' + esc(COMPANY.short) + '</strong><small>Bons de commande</small></span></a>';
    }

    function topbar(agent) {
        return '<header class="topbar"><div class="topbar-inner">' + brand() +
            '<div class="topbar-right">' +
                '<span class="agent-chip"><span class="agent-chip-name">' + esc(agent.name) + '</span></span>' +
                '<button type="button" class="icon-btn" id="logout" title="Changer de commercial" aria-label="Changer de commercial">' + ICON.logout + '</button>' +
            '</div></div></header>';
    }

    function bindTopbar() {
        document.getElementById('logout').addEventListener('click', signOut);
    }

    /* ---------- Router ---------- */

    function route() {
        flushPendingSave();
        pendingSave = null;

        const agent = currentAgent();
        if (!agent) {
            renderLogin();
            return;
        }

        const parts = location.hash.replace(/^#\/?/, '').split('/');
        if (parts[0] === 'commande' && parts[1]) {
            renderEditor(agent, parseInt(parts[1], 10));
        } else {
            renderOrders(agent);
        }
        window.scrollTo(0, 0);
    }

    /* ---------- Login ---------- */

    function renderLogin() {
        document.title = 'Connexion · ' + COMPANY.short;
        app.innerHTML =
            '<main class="login">' +
                '<div class="login-card">' +
                    '<div class="login-brand">' +
                        '<img class="brand-logo brand-logo-light" src="assets/logo-otc.png" alt="OTC Optical Trade Company">' +
                        '<img class="brand-logo brand-logo-dark" src="assets/logo-otc-white.png" alt="OTC Optical Trade Company">' +
                    '</div>' +
                    '<div id="loginStep">' + loginGrid() + '</div>' +
                '</div>' +
                '<p class="login-foot">' + esc(COMPANY.address) + '</p>' +
            '</main>';

        bindLoginGrid();
    }

    function loginGrid() {
        return '<h1>Bon de commande</h1>' +
            '<p class="muted">Choisissez votre nom pour accéder à vos commandes.</p>' +
            '<div class="agent-grid">' + CFG.commercials.map(function (agent) {
                const count = loadOrders(agent.id).length;
                return '<button type="button" class="agent-card" data-id="' + agent.id + '">' +
                    '<span class="agent-info"><strong>' + esc(agent.name) + '</strong>' +
                    '<small>' + (count ? plural(count, 'commande', 'commandes') : 'Aucune commande') + '</small></span>' +
                    (agent.pin ? '<span class="agent-lock" title="Code requis">' + ICON.lock + '</span>' : '') +
                    '<span class="agent-chevron">' + ICON.chevron + '</span>' +
                '</button>';
            }).join('') + '</div>';
    }

    function bindLoginGrid() {
        document.querySelectorAll('.agent-card').forEach(function (button) {
            button.addEventListener('click', function () {
                const agent = getAgent(Number(button.dataset.id));
                if (!agent.pin) {
                    signIn(agent);
                } else {
                    showPinStep(agent);
                }
            });
        });
    }

    function showPinStep(agent) {
        const step = document.getElementById('loginStep');
        step.innerHTML =
            '<button type="button" class="back-link" id="pinBack">' + ICON.back + ' Autre commercial</button>' +
            '<div class="pin-head"><div><h1>' + esc(agent.name) + '</h1></div></div>' +
            '<form id="pinForm" class="pin-form" novalidate>' +
                '<label for="pinInput">Code d\'accès</label>' +
                '<input id="pinInput" type="password" inputmode="numeric" autocomplete="off" maxlength="12" required>' +
                '<p id="pinError" class="field-error" hidden>Code incorrect.</p>' +
                '<button type="submit" class="btn btn-primary btn-lg btn-block">Accéder à mes commandes</button>' +
            '</form>';

        const input = document.getElementById('pinInput');
        const error = document.getElementById('pinError');
        input.focus();

        document.getElementById('pinBack').addEventListener('click', function () {
            step.innerHTML = loginGrid();
            bindLoginGrid();
        });

        input.addEventListener('input', function () {
            error.hidden = true;
            input.classList.remove('is-invalid');
        });

        document.getElementById('pinForm').addEventListener('submit', function (event) {
            event.preventDefault();
            if (input.value === String(agent.pin)) {
                signIn(agent);
            } else {
                error.hidden = false;
                input.classList.add('is-invalid');
                input.select();
            }
        });
    }

    /* ---------- Orders list ---------- */

    function renderOrders(agent) {
        document.title = 'Mes commandes · ' + agent.name;
        const orders = loadOrders(agent.id);
        const drafts = orders.filter(function (o) { return o.status === 'draft'; }).length;
        const frames = orders.reduce(function (sum, o) { return sum + totalQty(o.items); }, 0);

        app.innerHTML = topbar(agent) +
            '<main class="page">' +
                '<section class="page-head">' +
                    '<div><p class="eyebrow">' + esc(agent.name) + '</p><h1>Mes commandes</h1></div>' +
                    '<button type="button" class="btn btn-primary btn-lg" id="newOrder">' + ICON.plus + '<span>Nouvelle commande</span></button>' +
                '</section>' +
                '<section class="stats">' +
                    statTile('Commandes', orders.length) +
                    statTile('Brouillons', drafts) +
                    statTile('Montures', frames) +
                '</section>' +
                '<section class="toolbar">' +
                    '<label class="search">' + ICON.search +
                        '<input type="search" id="orderSearch" placeholder="Client, n° ou référence…" value="' + esc(listUi.query) + '">' +
                    '</label>' +
                    '<div class="segmented" role="tablist">' +
                        segment('all', 'Toutes') + segment('draft', 'Brouillons') + segment('generated', 'Générées') +
                    '</div>' +
                '</section>' +
                '<section id="orderList" class="order-list" aria-live="polite"></section>' +
                '<section class="backup card">' +
                    '<div><h2 class="card-title">Sauvegarde</h2>' +
                    '<p class="muted small">Les commandes sont enregistrées sur cet appareil. Exportez-les pour les garder ou les transférer sur un autre appareil.</p></div>' +
                    '<div class="backup-actions">' +
                        '<button type="button" class="btn btn-ghost" id="exportBtn">' + ICON.download + '<span>Exporter</span></button>' +
                        '<label class="btn btn-ghost">' + ICON.upload + '<span>Importer</span><input type="file" id="importInput" accept="application/json,.json" hidden></label>' +
                    '</div>' +
                '</section>' +
            '</main>';

        bindTopbar();
        renderOrderList(agent, orders);

        document.getElementById('newOrder').addEventListener('click', function () {
            const order = createOrder(agent.id);
            location.hash = '#/commande/' + order.number;
        });

        document.getElementById('orderSearch').addEventListener('input', function (event) {
            listUi.query = event.target.value;
            renderOrderList(agent, orders);
        });

        document.querySelectorAll('.segmented button').forEach(function (button) {
            button.addEventListener('click', function () {
                listUi.filter = button.dataset.filter;
                document.querySelectorAll('.segmented button').forEach(function (b) {
                    b.setAttribute('aria-selected', String(b === button));
                });
                renderOrderList(agent, orders);
            });
        });

        document.getElementById('exportBtn').addEventListener('click', function () {
            exportBackup(agent);
        });

        document.getElementById('importInput').addEventListener('change', function (event) {
            const file = event.target.files[0];
            event.target.value = '';
            if (file) {
                importBackup(agent, file);
            }
        });
    }

    function statTile(label, value) {
        return '<div class="stat"><span class="stat-label">' + label + '</span><span class="stat-value">' + value + '</span></div>';
    }

    function segment(filter, label) {
        return '<button type="button" role="tab" data-filter="' + filter + '" aria-selected="' + (listUi.filter === filter) + '">' + label + '</button>';
    }

    function renderOrderList(agent, orders) {
        const list = document.getElementById('orderList');
        const query = listUi.query.trim().toLocaleLowerCase('fr-FR');

        const visible = orders
            .filter(function (o) { return listUi.filter === 'all' || o.status === listUi.filter; })
            .filter(function (o) {
                if (!query) {
                    return true;
                }
                const haystack = [
                    o.client, o.address, String(o.number), orderCode(agent.id, o.number), formatDate(o.date)
                ].concat(o.items.map(function (i) { return i.ref; })).join(' ').toLocaleLowerCase('fr-FR');
                return haystack.indexOf(query) !== -1;
            })
            .sort(function (a, b) { return b.number - a.number; });

        if (!orders.length) {
            list.innerHTML = emptyState('Aucune commande pour le moment', 'Créez votre première commande avec le bouton « Nouvelle commande ».');
            return;
        }
        if (!visible.length) {
            list.innerHTML = emptyState('Aucun résultat', 'Essayez une autre recherche ou un autre filtre.');
            return;
        }

        list.innerHTML = visible.map(function (o) {
            const qty = totalQty(o.items);
            return '<a class="order-row" href="#/commande/' + o.number + '">' +
                '<span class="order-num"><small>N°</small>' + o.number + '</span>' +
                '<span class="order-main">' +
                    '<strong>' + (o.client.trim() ? esc(o.client) : '<span class="muted">Client non renseigné</span>') + '</strong>' +
                    '<small><span class="mono">' + orderCode(agent.id, o.number) + '</span> · ' + formatDate(o.date) + ' · ' + plural(qty, 'monture', 'montures') + '</small>' +
                '</span>' +
                statusPill(o.status) +
                '<span class="order-chevron">' + ICON.chevron + '</span>' +
            '</a>';
        }).join('');
    }

    function statusPill(status) {
        return status === 'generated'
            ? '<span class="pill pill-success">' + ICON.check + 'Générée</span>'
            : '<span class="pill pill-draft">Brouillon</span>';
    }

    function emptyState(title, text) {
        return '<div class="empty"><span class="empty-icon">' + ICON.file + '</span><strong>' + title + '</strong><p class="muted">' + text + '</p></div>';
    }

    function exportBackup(agent) {
        const data = {
            app: 'otc-bon-de-commande',
            version: 1,
            commercialId: agent.id,
            exportedAt: new Date().toISOString(),
            orders: loadOrders(agent.id)
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'otc_commercial-' + agent.id + '_' + today() + '.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
        toast('Sauvegarde exportée.', 'success');
    }

    function importBackup(agent, file) {
        const reader = new FileReader();
        reader.onload = function () {
            let data;
            try {
                data = JSON.parse(reader.result);
            } catch (error) {
                toast('Fichier de sauvegarde illisible.', 'error');
                return;
            }
            if (!data || data.app !== 'otc-bon-de-commande' || !Array.isArray(data.orders)) {
                toast('Ce fichier n\'est pas une sauvegarde de l\'application.', 'error');
                return;
            }
            // Keeps commercials' orders separate: a backup only goes back to its owner.
            if (Number(data.commercialId) !== agent.id) {
                const owner = getAgent(Number(data.commercialId));
                toast('Cette sauvegarde appartient à ' + (owner ? owner.name : 'un autre commercial') + '.', 'error');
                return;
            }

            const byNumber = new Map(loadOrders(agent.id).map(function (o) { return [o.number, o]; }));
            let added = 0;
            data.orders.map(normalizeOrder).filter(Boolean).forEach(function (incoming) {
                const existing = byNumber.get(incoming.number);
                if (!existing || incoming.updatedAt > existing.updatedAt) {
                    byNumber.set(incoming.number, incoming);
                    added += 1;
                }
            });

            saveOrders(agent.id, Array.from(byNumber.values()));

            toast(added ? plural(added, 'commande importée', 'commandes importées') + '.' : 'Rien de nouveau à importer.', 'success');
            renderOrders(agent);
        };
        reader.readAsText(file);
    }

    /* ---------- Order editor ---------- */

    function renderEditor(agent, number) {
        const order = findOrder(agent.id, number);
        if (!order) {
            toast('Commande introuvable.', 'error');
            location.hash = '#/';
            return;
        }

        document.title = 'Commande n°' + number + ' · ' + agent.name;

        app.innerHTML = topbar(agent) +
            '<main class="page page-editor">' +
                '<a href="#/" class="back-link">' + ICON.back + ' Mes commandes</a>' +
                '<section class="editor-head">' +
                    '<div>' +
                        '<h1>Commande n°' + number + ' <span id="statusSlot">' + statusPill(order.status) + '</span></h1>' +
                        '<p class="muted small"><span class="mono">' + orderCode(agent.id, number) + '</span> · <span id="saveState" class="save-state">' + ICON.check + 'Enregistrée</span></p>' +
                    '</div>' +
                    '<div class="editor-actions">' +
                        '<button type="button" class="btn btn-ghost" id="dupOrder">' + ICON.copy + '<span>Dupliquer</span></button>' +
                        '<button type="button" class="btn btn-ghost btn-danger" id="delOrder">' + ICON.trash + '<span>Supprimer</span></button>' +
                    '</div>' +
                '</section>' +
                '<form id="orderForm" class="editor" novalidate autocomplete="off">' +
                    '<section class="card">' +
                        '<h2 class="card-title">Informations client</h2>' +
                        '<div class="field-grid">' +
                            field('date', 'Date', 'date', order.date) +
                            '<div class="field"><span class="field-label">Agent commercial</span>' +
                                '<div class="readonly-field">' + esc(agent.name) + '</div></div>' +
                            field('client', 'Client', 'text', order.client, 'Nom du client ou de l\'opticien') +
                            field('address', 'Adresse', 'text', order.address) +
                            field('email', 'Email', 'email', order.email) +
                            field('phone', 'N° de tél (Responsable)', 'tel', order.phone) +
                        '</div>' +
                    '</section>' +
                    '<section class="card">' +
                        '<div class="card-head">' +
                            '<h2 class="card-title">Références de montures</h2>' +
                            '<button type="button" class="btn btn-soft" id="addItem">' + ICON.plus + '<span>Ajouter une référence</span></button>' +
                        '</div>' +
                        '<div id="items" class="items"></div>' +
                    '</section>' +
                '</form>' +
                '<section id="results" class="results" hidden>' +
                    '<h2 class="card-title">Bon de commande généré</h2>' +
                    '<div id="resultList" class="result-list"></div>' +
                '</section>' +
            '</main>' +
            '<div class="action-bar"><div class="action-bar-inner">' +
                '<div class="totals"><span><strong id="totalQty">0</strong> montures</span><small id="totalRefs"></small></div>' +
                '<button type="submit" form="orderForm" class="btn btn-primary btn-lg" id="generateBtn">' + ICON.file + '<span>Générer le bon</span></button>' +
            '</div></div>';

        bindTopbar();

        const form = document.getElementById('orderForm');
        const itemsEl = document.getElementById('items');
        const saveState = document.getElementById('saveState');

        (order.items.length ? order.items : [{ ref: '', qty: 1, note: '' }]).forEach(function (item) {
            itemsEl.appendChild(createItemRow(item));
        });
        refreshItems();

        function readForm() {
            const f = form.elements;
            order.date = f.date.value || today();
            order.client = f.client.value;
            order.address = f.address.value;
            order.email = f.email.value;
            order.phone = f.phone.value;
            order.items = Array.from(itemsEl.querySelectorAll('.item')).map(function (row) {
                return {
                    ref: row.querySelector('.item-ref').value,
                    qty: sanitizeQty(row.querySelector('.qty').textContent),
                    note: row.querySelector('.item-note').value
                };
            });
        }

        function persist() {
            readForm();
            order.updatedAt = Date.now();
            if (upsertOrder(agent.id, order)) {
                saveState.innerHTML = ICON.check + 'Enregistrée';
                saveState.classList.remove('is-pending');
            }
        }

        const scheduleSave = debounce(persist, 350);
        pendingSave = scheduleSave;

        function markDirty() {
            saveState.textContent = 'Enregistrement…';
            saveState.classList.add('is-pending');
            scheduleSave();
        }

        // Rows are listed newest first; the printed order is oldest first,
        // so the displayed index counts down.
        function refreshItems() {
            const rows = Array.from(itemsEl.querySelectorAll('.item'));
            let qty = 0;
            let refs = 0;
            rows.forEach(function (row, index) {
                row.querySelector('.item-idx').textContent = rows.length - index;
                if (row.querySelector('.item-ref').value.trim()) {
                    refs += 1;
                    qty += sanitizeQty(row.querySelector('.qty').textContent);
                }
            });
            document.getElementById('totalQty').textContent = qty;
            document.getElementById('totalRefs').textContent = plural(refs, 'référence', 'références');
        }

        form.addEventListener('input', function (event) {
            const target = event.target;
            if (target.name === 'client' || target.name === 'address') {
                applyCase(target, toTitleCase);
            } else if (target.classList.contains('item-ref')) {
                applyCase(target, toUpper);
            } else if (target.classList.contains('item-note')) {
                applyCase(target, toSentenceCase);
            }
            refreshItems();
            markDirty();
        });

        // Keeps the mobile keyboard open while tapping +/-.
        itemsEl.addEventListener('pointerdown', function (event) {
            if (event.target.closest('.step-btn')) {
                event.preventDefault();
            }
        });

        itemsEl.addEventListener('click', function (event) {
            const step = event.target.closest('.step-btn');
            const remove = event.target.closest('.item-del');
            if (step) {
                const output = step.parentElement.querySelector('.qty');
                const current = sanitizeQty(output.textContent);
                output.textContent = step.classList.contains('inc') ? current + 1 : Math.max(1, current - 1);
                refreshItems();
                markDirty();
            } else if (remove) {
                const row = remove.closest('.item');
                const hasContent = row.querySelector('.item-ref').value.trim() || row.querySelector('.item-note').value.trim();
                if (hasContent && !window.confirm('Supprimer cette référence ?')) {
                    return;
                }
                row.remove();
                if (!itemsEl.querySelector('.item')) {
                    itemsEl.appendChild(createItemRow({ ref: '', qty: 1, note: '' }));
                }
                refreshItems();
                markDirty();
            }
        });

        itemsEl.addEventListener('focusin', function (event) {
            const row = event.target.closest('.item');
            if (row) {
                row.classList.add('is-focused');
            }
        });

        itemsEl.addEventListener('focusout', function (event) {
            const row = event.target.closest('.item');
            if (row && !row.contains(event.relatedTarget)) {
                row.classList.remove('is-focused');
            }
        });

        document.getElementById('addItem').addEventListener('click', function () {
            const row = createItemRow({ ref: '', qty: 1, note: '' });
            itemsEl.insertBefore(row, itemsEl.firstChild);
            refreshItems();
            row.querySelector('.item-ref').focus();
            markDirty();
        });

        document.getElementById('dupOrder').addEventListener('click', function () {
            scheduleSave.flush();
            const copy = createOrder(agent.id, order);
            toast('Commande n°' + copy.number + ' créée à partir de la n°' + order.number + '.', 'success');
            location.hash = '#/commande/' + copy.number;
        });

        document.getElementById('delOrder').addEventListener('click', function () {
            if (!window.confirm('Supprimer définitivement la commande n°' + order.number + ' ?')) {
                return;
            }
            scheduleSave.flush();
            pendingSave = null;
            deleteOrder(agent.id, order.number);
            toast('Commande n°' + order.number + ' supprimée.', 'neutral');
            location.hash = '#/';
        });

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            scheduleSave.flush();
            generate(agent, order, form, function () {
                order.status = 'generated';
                order.generatedAt = Date.now();
                upsertOrder(agent.id, order);
                document.getElementById('statusSlot').innerHTML = statusPill(order.status);
            });
        });
    }

    function field(name, label, type, value, placeholder) {
        const id = 'f-' + name;
        const extra = type === 'tel' ? ' inputmode="tel" autocomplete="tel"' : '';
        return '<div class="field"><label class="field-label" for="' + id + '">' + label + '</label>' +
            '<input id="' + id + '" name="' + name + '" type="' + type + '" value="' + esc(value) + '"' +
            (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') + extra + '></div>';
    }

    function createItemRow(item) {
        const row = document.createElement('div');
        row.className = 'item';
        row.innerHTML =
            '<span class="item-idx" aria-hidden="true"></span>' +
            '<input type="text" class="item-ref" placeholder="Référence" aria-label="Référence" value="' + esc(item.ref) + '" autocapitalize="characters" spellcheck="false">' +
            '<div class="stepper">' +
                '<button type="button" class="step-btn dec" aria-label="Diminuer la quantité">' + ICON.minus + '</button>' +
                '<output class="qty" aria-label="Quantité">' + sanitizeQty(item.qty) + '</output>' +
                '<button type="button" class="step-btn inc" aria-label="Augmenter la quantité">' + ICON.plus + '</button>' +
            '</div>' +
            '<input type="text" class="item-note" placeholder="Remise / Note" aria-label="Remise / Note" value="' + esc(item.note) + '">' +
            '<button type="button" class="item-del" aria-label="Supprimer la référence">' + ICON.close + '</button>';
        return row;
    }

    /* ---------- Document generation ---------- */

    async function generate(agent, order, form, onDone) {
        const items = filledItems(order.items).slice().reverse();
        if (!items.length) {
            toast('Ajoutez au moins une référence avant de générer le bon.', 'warn');
            const firstRef = document.querySelector('.item-ref');
            if (firstRef) {
                firstRef.focus();
            }
            return;
        }
        if (!order.client.trim()) {
            toast('Indiquez le nom du client.', 'warn');
            form.elements.client.focus();
            return;
        }
        if (typeof window.html2canvas !== 'function') {
            toast('Générateur indisponible : vérifiez la connexion Internet puis rechargez la page.', 'error');
            return;
        }

        const button = document.getElementById('generateBtn');
        const results = document.getElementById('results');
        const resultList = document.getElementById('resultList');
        const label = button.querySelector('span');

        button.disabled = true;
        label.textContent = 'Génération…';
        resultList.innerHTML = '';

        try {
            const pages = chunk(items, ITEMS_PER_PAGE);
            const baseName = [orderCode(agent.id, order.number), cleanFileName(order.client), order.date].filter(Boolean).join('_');

            for (let i = 0; i < pages.length; i += 1) {
                const dataUrl = await renderDocument(agent, order, pages[i], {
                    pageNum: i + 1,
                    totalPages: pages.length,
                    qty: totalQty(items),
                    refs: items.length
                });
                const fileName = pages.length === 1 ? baseName + '.png' : baseName + '_' + (i + 1) + '.png';
                resultList.appendChild(resultCard(dataUrl, fileName, 'Page ' + (i + 1) + '/' + pages.length));
            }

            results.hidden = false;
            onDone();
            results.scrollIntoView({ behavior: 'smooth', block: 'start' });
            toast('Bon de commande généré.', 'success');
        } catch (error) {
            console.error('Generation error:', error);
            toast('Erreur pendant la génération du bon.', 'error');
        } finally {
            button.disabled = false;
            label.textContent = 'Générer le bon';
        }
    }

    function resultCard(dataUrl, fileName, label) {
        const card = document.createElement('article');
        card.className = 'result-card';
        card.innerHTML =
            '<div class="result-preview"><img alt=""></div>' +
            '<div class="result-meta"><div><strong>' + esc(label) + '</strong><small class="mono">' + esc(fileName) + '</small></div>' +
            '<div class="result-actions">' +
                '<a class="btn btn-primary" download>' + ICON.download + '<span>Télécharger</span></a>' +
            '</div></div>';

        card.querySelector('img').src = dataUrl;
        card.querySelector('img').alt = fileName;
        const link = card.querySelector('a');
        link.href = dataUrl;
        link.download = fileName;

        if (navigator.canShare) {
            const shareBtn = document.createElement('button');
            shareBtn.type = 'button';
            shareBtn.className = 'btn btn-ghost';
            shareBtn.innerHTML = ICON.share + '<span>Partager</span>';
            shareBtn.addEventListener('click', function () {
                shareImage(dataUrl, fileName);
            });
            card.querySelector('.result-actions').appendChild(shareBtn);
        }
        return card;
    }

    async function shareImage(dataUrl, fileName) {
        try {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], fileName, { type: 'image/png' });
            if (!navigator.canShare({ files: [file] })) {
                toast('Le partage n\'est pas disponible sur cet appareil. Utilisez Télécharger.', 'warn');
                return;
            }
            await navigator.share({ files: [file], title: fileName });
        } catch (error) {
            if (error && error.name !== 'AbortError') {
                toast('Partage impossible.', 'error');
            }
        }
    }

    const DOC = {
        ink: '#1f2023',
        grey: '#3d3d40',
        muted: '#6b6b70',
        line: '#d9d9de',
        red: '#a3222b'
    };

    async function renderDocument(agent, order, items, page) {
        const left = items.slice(0, ITEMS_PER_TABLE);
        const right = items.slice(ITEMS_PER_TABLE);
        const label = 'font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ' + DOC.muted + '; margin: 0 0 6px;';
        const box = 'flex: 1; padding: 12px 14px; border: 1px solid ' + DOC.line + '; border-radius: 10px; background: rgba(255, 255, 255, 0.85);';
        const infoLine = function (name, value) {
            return '<p style="margin: 0 0 5px; font-size: 13px; color: ' + DOC.grey + ';"><strong style="color: ' + DOC.ink + ';">' + name + ' :</strong> ' + esc(value.trim()) + '</p>';
        };

        const legal = [
            esc(COMPANY.address),
            'Tél : ' + esc(COMPANY.phone) + (COMPANY.sav ? ' · SAV : ' + esc(COMPANY.sav) : ''),
            esc(COMPANY.email),
            [COMPANY.mf ? 'MF : ' + esc(COMPANY.mf) : '', COMPANY.rc ? 'RC : ' + esc(COMPANY.rc) : ''].filter(Boolean).join(' · ')
        ].filter(Boolean).join('<br>');

        const html =
            '<div style="position: relative; width: 210mm; height: 297mm; padding: 30px 34px 20px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; background: #ffffff; color: ' + DOC.ink + '; font-family: ' + DOC_FONT_STACK + ';">' +
                // Faded mark in the background, as on the printed OTC documents.
                '<div style="position: absolute; right: -150px; bottom: 120px; width: 560px; height: 560px;">' +
                    (COMPANY.logoMark
                        ? '<img src="' + esc(COMPANY.logoMark) + '" alt="" style="display: block; width: 560px; height: auto; opacity: 0.07;">'
                        : logoMark('width: 560px; height: 560px; display: block; color: #f1f1f3; --brand-red: #f8eaeb;')) +
                '</div>' +

                '<div style="position: relative; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;">' +
                    '<div>' +
                        companyLogo() +
                        '<p style="margin: 10px 0 0; font-size: 10.5px; line-height: 1.6; color: ' + DOC.muted + ';">' + legal + '</p>' +
                    '</div>' +
                    '<div style="text-align: right;">' +
                        '<p style="margin: 4px 0 0; font-size: 25px; font-weight: 800; letter-spacing: 0.06em; color: ' + DOC.grey + ';">BON DE COMMANDE</p>' +
                        '<p style="margin: 8px 0 0; font-size: 16px; font-weight: 800; color: ' + DOC.red + ';">N° ' + orderCode(agent.id, order.number) + '</p>' +
                        (page.totalPages > 1 ? '<p style="margin: 2px 0 0; font-size: 12.5px; color: ' + DOC.muted + ';">Page ' + page.pageNum + ' / ' + page.totalPages + '</p>' : '') +
                    '</div>' +
                '</div>' +

                '<div style="position: relative; display: flex; margin: 16px 0;">' +
                    '<div style="width: 110px; height: 4px; background: ' + DOC.red + ';"></div>' +
                    '<div style="flex: 1; height: 4px; background: ' + DOC.grey + ';"></div>' +
                '</div>' +

                '<div style="position: relative; display: flex; gap: 16px;">' +
                    '<div style="' + box + ' display: flex; gap: 16px;">' +
                        '<div style="flex: 1;">' +
                            infoLine('Agent Commercial', agent.name) +
                            infoLine('Client', order.client) +
                            infoLine('Adresse', order.address) +
                        '</div>' +
                        '<div style="flex: 1;">' +
                            infoLine('Email', order.email) +
                            infoLine('N° de tél (Responsable)', order.phone) +
                            infoLine('Date', formatDate(order.date)) +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div style="position: relative; display: flex; gap: 16px; margin-top: 16px; flex: 1; min-height: 0;">' +
                    '<div style="flex: 1; min-height: 0;">' + documentTable(left) +'</div>' +
                    '<div style="flex: 1; min-height: 0;">' + documentTable(right) +'</div>' +
                '</div>' +

                '<div style="position: relative; display: flex; gap: 16px; margin-top: 16px;">' +
                    '<div style="display: flex; flex: 1; border: 1px solid ' + DOC.grey + '; border-radius: 10px; overflow: hidden;">' +
                        docTotal('Total montures', page.qty, true) +
                        docTotal('Références', page.refs, false) +
                    '</div>' +
                    '<div style="flex: 1; min-height: 64px; padding: 8px 12px; border: 1px dashed ' + DOC.line + '; border-radius: 10px;">' +
                        '<p style="' + label + '">Cachet &amp; signature du client</p>' +
                    '</div>' +
                '</div>' +

                '<p style="position: relative; margin: 14px 0 0; padding-top: 8px; border-top: 1px solid ' + DOC.line + '; font-size: 9.5px; text-align: center; color: ' + DOC.muted + ';">' +
                    esc(COMPANY.short) + ' — ' + esc(COMPANY.name) + ' · ' + esc(COMPANY.address) + ' · Tél : ' + esc(COMPANY.phone) +
                '</p>' +
            '</div>';

        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        document.body.appendChild(container);

        try {
            await Promise.all(Array.from(container.querySelectorAll('img')).map(function (img) {
                return img.decode().catch(function () { /* broken logo file: rendered without it */ });
            }));
            const canvas = await window.html2canvas(container.firstChild, { scale: 2, backgroundColor: '#ffffff' });
            return canvas.toDataURL('image/png');
        } finally {
            container.remove();
        }
    }

    function companyLogo() {
        if (COMPANY.logo) {
            return '<img src="' + esc(COMPANY.logo) + '" alt="" style="display: block; height: 72px; width: auto;">';
        }
        return '<div style="color: ' + DOC.grey + ';">' + logoFull('display: block; width: 216px; height: 72px; color: ' + DOC.grey + '; --brand-red: ' + DOC.red + ';') + '</div>';
    }

    function docTotal(label, value, primary) {
        return '<div style="flex: 1; padding: 10px 14px; ' + (primary ? 'background: ' + DOC.grey + '; color: #ffffff;' : 'background: #ffffff; color: ' + DOC.ink + ';') + '">' +
            '<p style="margin: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.8;">' + label + '</p>' +
            '<p style="margin: 2px 0 0; font-size: 26px; font-weight: 800; line-height: 1.1;">' + value + '</p>' +
        '</div>';
    }

    function documentTable(items) {
        const head = 'padding: 0 8px; height: 30px; background: ' + DOC.grey + '; color: #ffffff; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;';
        const cell = 'padding: 0 8px; border-bottom: 1px solid ' + DOC.line + '; vertical-align: middle; font-size: 12.5px;';
        let rows = '<tr>' +
            '<th style="' + head + ' text-align: center;">Référence</th>' +
            '<th style="' + head + ' text-align: center;">Quantité</th>' +
            '<th style="' + head + ' text-align: center;">Remise / Note</th>' +
        '</tr>';

        for (let i = 0; i < ITEMS_PER_TABLE; i += 1) {
            const item = items[i];
            // Same base height on every row so empty rows don't collapse.
            rows += '<tr style="height: 26px;' + (i % 2 ? ' background: rgba(61, 61, 64, 0.04);' : '') + '">' +
                '<td style="' + cell + ' text-align: center; font-weight: 700; letter-spacing: 0.02em;">' + (item ? esc(item.ref.trim()) : '') + '</td>' +
                // As on the paper form: only quantities above 1 are written.
                '<td style="' + cell + ' text-align: center; font-weight: 800; color: ' + DOC.red + ';">' + (item && item.qty > 1 ? 'x ' + item.qty : '') + '</td>' +
                '<td style="' + cell + ' text-align: center; font-weight: 600; color: ' + DOC.grey + ';">' + (item ? esc(item.note.trim()) : '') + '</td>' +
            '</tr>';
        }

        return '<table style="width: 100%; height: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid ' + DOC.line + ';">' + rows + '</table>';
    }

    /* ---------- Boot ---------- */

    window.addEventListener('hashchange', route);
    window.addEventListener('pagehide', flushPendingSave);

    // A visual viewport much shorter than the window means the on-screen keyboard is open.
    if (window.visualViewport) {
        const syncKeyboard = function () {
            document.body.classList.toggle('kb-open', window.innerHeight - window.visualViewport.height > 150);
        };
        window.visualViewport.addEventListener('resize', syncKeyboard);
        syncKeyboard();
    }
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') {
            flushPendingSave();
        }
    });

    route();
})();
