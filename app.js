document.addEventListener('DOMContentLoaded', () => {

    /* --- GLOBALS --- */
    const roleSelect = document.getElementById('role-select');
    
    // Core Tabs & Views Navigation
    const tabs = document.querySelectorAll('.bottom-nav .nav-btn');
    const views = document.querySelectorAll('.views-container .view');
    
    // Flux Monaco Elements
    const fluxQuickActions = document.getElementById('flux-quick-actions');
    const medicalPosts = document.querySelectorAll('.medical-only-post');

    // Vault Elements
    const bioOverlay = document.getElementById('biometric-overlay');
    const vaultContent = document.getElementById('vault-content');
    const simulateBioBtn = document.getElementById('simulate-bio-btn');
    let vaultUnlocked = false;
    let fluxListener = null;
    let currentChatListener = null;
    let activeFilter = 'all'; // Filtre actif du flux ('all', 'medical', 'team', 'public')

    // Règles de visibilité : retourne true si le rôle peut voir ce post
    function canSeePost(data, role) {
        const visibility = data.visibility || 'medifam';
        switch(visibility) {
            case 'public':
                return true;
            case 'medical':
                return role !== 'family' && role !== 'auxiliaire';
            case 'medifam':
                return true;
            case 'family':
                return role === 'family';
            default:
                return true;
        }
    }

    // Chat Elements
    const chatRoomView = document.getElementById('chat-room-view');
    const chatListView = document.getElementById('chat-list-view');

    /* --- CORE NAVIGATION --- */
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update Tab Active State
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Hide All Views (remove .active)
            views.forEach(v => v.classList.remove('active'));

            // Show Target View (add .active)
            const targetId = tab.getAttribute('data-target');
            const target = document.getElementById(targetId);
            if (target) target.classList.add('active');

            // Logic to handle internal state when tabbing
            if(targetId === 'chat-list-view') {
                if (chatRoomView) chatRoomView.classList.remove('active');
            }
        });
    });


    /* --- ROLE SIMULATION LOGIC --- */

    // Raccourcis par défaut
    const DEFAULT_SHORTCUTS = {
        'kine':       ['🏃 Séance Terminée', '✅ Mobilité Stable', '⚠️ Alerte Douleur'],
        'auxiliaire': ['🍽️ Repas Pris', '🚿 Toilette Faite', '😊 Bonne Humeur'],
        'medecin':    ['💊 Nouvelle Prescription', '🩺 Visite Effectuée'],
        'family':     ['❤️ Visite de courtoisie']
    };

    // Charger depuis localStorage immédiatement (pour affichage instantané)
    const savedShortcutsRaw = localStorage.getItem('mc_custom_shortcuts');
    if (savedShortcutsRaw) {
        try { window.customShortcuts = JSON.parse(savedShortcutsRaw); } catch(e) { window.customShortcuts = null; }
    }
    if (!window.customShortcuts) {
        window.customShortcuts = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
        localStorage.setItem('mc_custom_shortcuts', JSON.stringify(window.customShortcuts));
    }

    // Identifiant de l'utilisateur pour Firebase (proId de la session)
    function getShortcutsDocId() {
        const session = MonacoCare.getSession();
        return session?.proId || session?.uid || 'demo-user';
    }

    // Sauvegarder les raccourcis dans Firebase ET localStorage
    async function saveShortcuts() {
        const docId = getShortcutsDocId();
        localStorage.setItem('mc_custom_shortcuts', JSON.stringify(window.customShortcuts));
        try {
            await db.collection('user_shortcuts').doc(docId).set(window.customShortcuts);
        } catch(e) {
            console.warn('Impossible de sauvegarder les raccourcis dans Firebase:', e);
        }
    }

    // Charger les raccourcis depuis Firebase (async, met à jour l'UI si différent)
    async function loadShortcutsFromFirebase() {
        const docId = getShortcutsDocId();
        if (docId === 'demo-user') return; // pas de sauvegarde Firebase en mode démo sans session
        try {
            const doc = await db.collection('user_shortcuts').doc(docId).get();
            if (doc.exists) {
                // Firebase a des données → les charger
                const data = doc.data();
                window.customShortcuts = Object.assign({}, DEFAULT_SHORTCUTS, data);
                localStorage.setItem('mc_custom_shortcuts', JSON.stringify(window.customShortcuts));
                updateRoleUI();
            } else {
                // Première connexion avec cet ID → sauvegarder les raccourcis actuels dans Firebase
                // pour qu'ils survivent à un effacement du localStorage
                await db.collection('user_shortcuts').doc(docId).set(window.customShortcuts);
            }
        } catch(e) {
            console.warn('Impossible de charger les raccourcis depuis Firebase:', e);
        }
    }

    // Lancer le chargement Firebase en arrière-plan
    loadShortcutsFromFirebase();

    const updateRoleUI = () => {
        const role = roleSelect.value;
        const roleName = roleSelect.options[roleSelect.selectedIndex].text;

        // Header Update with current Patient
        const session = MonacoCare.getSession();
        if(session && session.label) {
            const ptNameEl = document.getElementById('patient-name');
            const ptInfoEl = document.getElementById('patient-info');
            if(ptNameEl) ptNameEl.innerText = session.label;
            if(ptInfoEl) ptInfoEl.innerText = "Dossier : " + (session.patientId || "N/A");
        }

        // 1. Update Flux Quick Buttons
        const savedShortcuts = window.customShortcuts[role] || [];
        
        let buttonsHTML = '';
        savedShortcuts.forEach(txt => {
            const extraStyle = txt.includes('Douleur') ? 'style="color:#CE1126; border-color:#CE1126;"' : '';
            buttonsHTML += `<button class="quick-btn" ${extraStyle}>${txt}</button>`;
        });
        
        // Ajouter le bouton "+" pour la customisation finale
        buttonsHTML += `<button class="quick-btn add-custom-btn" style="border-style: dashed; color: #64748B;"><i class="fa-solid fa-plus"></i></button>`;

        fluxQuickActions.innerHTML = buttonsHTML;

        // Attacher les événements à ces boutons pour poster dans le flux
        const qBtns = fluxQuickActions.querySelectorAll('.quick-btn:not(.add-custom-btn)');
        qBtns.forEach(btn => {
            btn.addEventListener('click', () => publishToFeed(btn.innerText));
        });

        // Attacher l'événement du bouton +
        const addCustomBtn = fluxQuickActions.querySelector('.add-custom-btn');
        if(addCustomBtn) {
            addCustomBtn.addEventListener('click', () => {
                if(typeof renderManageList === 'function') renderManageList();
                document.getElementById('new-shortcut-modal').classList.remove('hidden');
            });
        }

        // Manage role display — no more reference to old settings-btn
        const menuBtn = document.getElementById('header-menu-btn');
        if(role === 'auxiliaire') {
            medicalPosts.forEach(post => post.style.display = 'none');
            // Distinguer intervenant (helper) et auxiliaire de vie pro
            const sess = MonacoCare.getSession();
            if (sess && sess.role === 'helper') {
                bioOverlay.querySelector('p').innerText = "Accès limité. Entrez votre code d'accès ci-dessous pour ouvrir le coffre médical.";
            } else {
                bioOverlay.querySelector('p').innerText = "Accès Refusé. Autorisation Médicale / Famille Nécessaire.";
            }
            simulateBioBtn.style.display = 'none';
        } else if (role === 'family') {
            medicalPosts.forEach(post => post.style.display = 'flex');
            bioOverlay.querySelector('p').innerText = "Accès sécurisé Famille via Face ID / Empreinte.";
            simulateBioBtn.style.display = 'inline-block';
        } else {
            medicalPosts.forEach(post => post.style.display = 'flex');
            bioOverlay.querySelector('p').innerText = "Accès réservé au personnel médical via Face ID / Empreinte.";
            simulateBioBtn.style.display = 'inline-block';
        }

        // Re-charger le flux en temps réel pour appliquer les nouveaux filtres de rôle
        const patientId = MonacoCare.getSession()?.patientId || 'patient-demo';
        if (typeof loadRealtimeFeed === 'function') {
            const fluxFeed = document.getElementById('flux-feed');
            if(fluxFeed) fluxFeed.innerHTML = ''; // Nettoyer pour recréer proprement
            loadRealtimeFeed(patientId);
        }
    };

    roleSelect.addEventListener('change', updateRoleUI);
    updateRoleUI(); // Initialize on load


    /* --- BIOMETRIC + CODE EXTERNE --- */
    let vaultListeners = [];

    simulateBioBtn.addEventListener('click', () => {
        simulateBioBtn.textContent = "🗓️ Scan en cours...";
        simulateBioBtn.disabled = true;
        setTimeout(() => {
            bioOverlay.classList.add('hidden');
            vaultContent.classList.remove('hidden');
            vaultUnlocked = true;

            // Famille : accès coffre (constantes + douleur) mais pas les notes cliniques
            const isFamily = roleSelect.value === 'family';
            const showClinical = !isFamily;
            const clinSection = vaultContent.querySelector('#clinical-notes-container')?.closest('.vault-section');
            if(clinSection) clinSection.style.display = showClinical ? 'block' : 'none';

            loadRealtimeVault(MonacoCare.getSession()?.patientId || 'patient-demo', showClinical);
        }, 1200);
    });

    const validateCodeBtn = document.getElementById('validate-code-btn');
    const externalCodeInput = document.getElementById('external-code-input');
    if (validateCodeBtn && externalCodeInput) {
        validateCodeBtn.addEventListener('click', () => {
            const code = externalCodeInput.value.trim().toUpperCase();
            // Codes valides : MC-XXXX (n'importe quel code de 4+ chars après MC-)
            if (code.startsWith('MC-') && code.length >= 6) {
                bioOverlay.classList.add('hidden');
                vaultContent.classList.remove('hidden');
                vaultUnlocked = true;
                
                // Accès allégé : cacher les notes cliniques (famille ou pro externe limité)
                const clinSection = vaultContent.querySelector('#clinical-notes-container')?.closest('.vault-section');
                if (clinSection) clinSection.style.display = 'none';

                loadRealtimeVault(MonacoCare.getSession()?.patientId || 'patient-demo', false);
            } else {
                externalCodeInput.style.borderColor = '#ef4444';
                externalCodeInput.placeholder = 'Code invalide — format MC-XXXX';
                setTimeout(() => {
                    externalCodeInput.style.borderColor = '';
                    externalCodeInput.placeholder = 'Ex: MC-4821';
                }, 2000);
            }
        });
    }

    // Verrouiller le coffre quand on quitte l'onglet
    document.querySelector('.nav-btn[data-target="flux-view"]').addEventListener('click', lockVault);
    document.querySelector('.nav-btn[data-target="chat-list-view"]').addEventListener('click', lockVault);
    function lockVault() {
        if(vaultUnlocked) {
            bioOverlay.classList.remove('hidden');
            vaultContent.classList.add('hidden');
            simulateBioBtn.textContent = '🔒 Déverrouiller';
            simulateBioBtn.disabled = false;
            vaultUnlocked = false;
            
            // Cleanup des listeners
            vaultListeners.forEach(unsub => unsub());
            vaultListeners = [];
        }
    }

    // Fonction de chargement temps réel du Coffre
    function loadRealtimeVault(patientId, showClinicalNotes) {
        // Nettoyer existants
        vaultListeners.forEach(unsub => unsub());
        vaultListeners = [];

        // 1. Constantes
        const vitalsGrid = document.getElementById('vitals-grid-container');
        if(vitalsGrid) {
            vitalsGrid.innerHTML = '<div style="text-align:center;color:gray;grid-column:1/-1;">Chargement...</div>';

            const VITAL_TYPES = [
                { type: 'Rythme Cardiaque',   unit: 'bpm',  placeholder: '72',    icon: 'fa-heart-pulse',    color: '#CE1126', bg: 'rgba(206,17,38,0.1)' },
                { type: 'Tension Artérielle', unit: 'mmHg', placeholder: '120/80', icon: 'fa-gauge-high',    color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                { type: 'Température',        unit: '°C',   placeholder: '37.2',   icon: 'fa-temperature-half', color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
            ];

            const unsubVitals = db.collection('medical_vitals')
                .where('patientId', '==', patientId)
                .onSnapshot(snap => {
                    vitalsGrid.innerHTML = '';

                    // Garder uniquement le document LE PLUS RÉCENT par type
                    // (gère les anciens docs accumulés avec des IDs aléatoires)
                    const byType = {};
                    snap.forEach(doc => {
                        const data = doc.data();
                        const existing = byType[data.type];
                        const newTs = data.createdAt?.seconds ?? 0;
                        const oldTs = existing?.createdAt?.seconds ?? 0;
                        if (!existing || newTs >= oldTs) {
                            byType[data.type] = data;
                        }
                    });

                    // Toujours afficher les 3 cartes, cliquables, vides ou non
                    VITAL_TYPES.forEach(meta => {
                        const d = byType[meta.type] || null;


                        const div = document.createElement('div');
                        div.className = 'vital-card';
                        div.title = 'Cliquer pour mettre à jour';
                        div.innerHTML = `
                            <div class="vital-icon-bubble" style="background:${meta.bg}; color:${meta.color};">
                                <i class="fa-solid ${meta.icon}"></i>
                            </div>
                            <div class="vital-info">
                                <div class="vital-label">${meta.type}</div>
                                ${d
                                    ? `<div class="vital-value">${d.value}<span class="vital-unit">${meta.unit}</span></div>`
                                    : `<div class="vital-value empty">--</div>`
                                }
                            </div>
                        `;
                        div.addEventListener('click', () => promptVital(meta.type, meta.unit, meta.placeholder));
                        vitalsGrid.appendChild(div);
                    });
                });
            vaultListeners.push(unsubVitals);
        }

        // 2. Douleur — ID fixe par zone, carte cliquable, grille 2 colonnes
        const painGrid = document.getElementById('pain-trackers-container');
        if(painGrid) {
            painGrid.innerHTML = '<div style="text-align:center;color:gray;">Chargement...</div>';
            const unsubPain = db.collection('medical_pain')
                .where('patientId', '==', patientId)
                .onSnapshot(snap => {
                    painGrid.innerHTML = '';

                    if (snap.empty) {
                        painGrid.innerHTML = `<div style="text-align:center; padding:20px 0; color:var(--text-muted); font-size:13px; grid-column:1/-1;">
                            <i class="fa-regular fa-face-smile" style="font-size:24px; margin-bottom:8px; display:block;"></i>
                            Aucune évaluation. Appuyez sur « Ajouter localisation » pour commencer.
                        </div>`;
                        return;
                    }

                    // Dédoublonnage : l'ID fixe (patientId_zone) gagne toujours sur les anciens IDs aléatoires
                    // → élimine le flash causé par serverTimestamp() null lors de l'écriture locale
                    const byLocation = {};
                    snap.forEach(doc => {
                        const d = doc.data();
                        const expectedId = `${patientId}_${(d.location || '').replace(/\s+/g, '_')}`;
                        const isFixed = doc.id === expectedId;
                        const existing = byLocation[d.location];
                        const existingIsFixed = existing?._isFixed || false;

                        if (!existing) {
                            byLocation[d.location] = { ...d, _isFixed: isFixed };
                        } else if (isFixed && !existingIsFixed) {
                            // Le nouveau a un ID fixe, l'ancien non → le nouveau gagne toujours
                            byLocation[d.location] = { ...d, _isFixed: true };
                        } else if (!isFixed && existingIsFixed) {
                            // L'existant a un ID fixe → on garde l'existant
                        } else {
                            // Les deux sont du même type → on prend le plus récent
                            const newTs = d.createdAt?.seconds ?? 0;
                            const oldTs = existing?.createdAt?.seconds ?? 0;
                            if (newTs >= oldTs) byLocation[d.location] = { ...d, _isFixed: isFixed };
                        }
                    });

                    // Grille 2 colonnes
                    painGrid.style.display = 'grid';
                    painGrid.style.gridTemplateColumns = '1fr 1fr';
                    painGrid.style.gap = '10px';

                    Object.values(byLocation).forEach(d => {
                        const level = d.level ?? d.score ?? 0;
                        const pct = Math.round((level / 10) * 100);
                        const barColor = level >= 7 ? '#CE1126' : level >= 4 ? '#F59E0B' : '#10B981';

                        const div = document.createElement('div');
                        div.style.cssText = `
                            background: white;
                            border-radius: 12px;
                            padding: 12px;
                            box-shadow: 0 2px 8px rgba(89,0,33,0.08);
                            cursor: pointer;
                            border: 1px solid rgba(220,192,195,0.3);
                            transition: transform .15s;
                        `;
                        div.title = 'Cliquer pour mettre à jour';
                        div.innerHTML = `
                            <div style="font-weight:700; font-size:13px; color:#1c1b1c; margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${d.location}</div>
                            <div style="font-size:22px; font-weight:800; color:${barColor}; line-height:1; margin-bottom:8px;">${level}<span style="font-size:12px; font-weight:500; color:#897174;">/10</span></div>
                            <div style="height:5px; border-radius:999px; background:#f0e8e9; overflow:hidden;">
                                <div style="height:100%; width:${pct}%; background:${barColor}; border-radius:999px; transition:width .4s;"></div>
                            </div>
                        `;
                        div.addEventListener('mouseenter', () => div.style.transform = 'scale(1.02)');
                        div.addEventListener('mouseleave', () => div.style.transform = 'scale(1)');
                        div.addEventListener('click', () => promptPainUpdate(d.location));
                        painGrid.appendChild(div);
                    });
                });
            vaultListeners.push(unsubPain);
        }


        // 3. Notes Cliniques
        if(showClinicalNotes) {
            const notesGrid = document.getElementById('clinical-notes-container');
            if(notesGrid) {
                notesGrid.innerHTML = '<div style="text-align:center;color:gray;">Chargement...</div>';
                const unsubNotes = db.collection('medical_notes')
                    .where('patientId', '==', patientId)
                    .onSnapshot(snap => {
                        if(snap.empty) {
                            notesGrid.innerHTML = `<div style="text-align:center; padding:20px 0; color:var(--text-muted); font-size:13px;">
                                <i class="fa-regular fa-note-sticky" style="font-size:24px; margin-bottom:8px; display:block;"></i>
                                Aucune note clinique pour le moment.
                            </div>`;
                        } else {
                            // Trier en JS (pas besoin d'index Firestore composite)
                            const noteDocs = [];
                            snap.forEach(doc => noteDocs.push(doc));
                            noteDocs.sort((a,b) => (b.data().createdAt?.seconds||0) - (a.data().createdAt?.seconds||0));

                            notesGrid.innerHTML = '';
                            noteDocs.forEach(doc => {
                                const d = doc.data();
                                const div = document.createElement('div');
                                div.style = "background: white; border-radius:12px; padding:15px; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:10px;";
                                let timeDisplay = "";
                                if(d.createdAt) {
                                    const dateObj = d.createdAt.toDate();
                                    timeDisplay = dateObj.toLocaleDateString() + ' ' + dateObj.getHours().toString().padStart(2,'0') + ':' + dateObj.getMinutes().toString().padStart(2,'0');
                                }
                                div.innerHTML = `
                                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                        <b style="font-size:13px;">${d.authorName}</b>
                                        <span style="font-size:11px; color:var(--text-muted);">${d.authorRole} • ${timeDisplay}</span>
                                    </div>
                                    <p style="font-size:13px; line-height:1.4;">${d.content}</p>
                                `;
                                notesGrid.appendChild(div);
                            });
                        }
                    }, err => {
                        // Index Firestore manquant ou erreur réseau → message clair
                        console.warn('Notes cliniques non disponibles:', err);
                        notesGrid.innerHTML = `<div style="text-align:center; padding:20px 0; color:var(--text-muted); font-size:13px;">
                            <i class="fa-solid fa-triangle-exclamation" style="font-size:24px; margin-bottom:8px; display:block; color:#F59E0B;"></i>
                            Notes temporairement indisponibles.
                        </div>`;
                    });
                vaultListeners.push(unsubNotes);
            }
        }
    }



    /* --- CHAT : contacts mockés ---
     * En mode session réelle, ces contacts seront remplacés par
     * les vrais membres de l'équipe du patient depuis Firestore (Sprint 3).
     */
    /* --- CHAT : REALTIME CONTACTS & MESSAGES --- */
    let currentContactId = null;

    async function loadPatientTeam(patientId) {
        try {
            const patientSnap = await db.collection('patients').doc(patientId).get();
            if (!patientSnap.exists) return [];
            
            const data = patientSnap.data();
            const pros = data.assignedPros || [];
            const familles = data.assignedFamilyCodes || [];
            
            let team = [];
            
            // Loop pros
            for (const proId of pros) {
                const pSnap = await db.collection('professionals').doc(proId).get();
                if (pSnap.exists) {
                    const pData = pSnap.data();
                    team.push({
                        id: proId,
                        name: pData.name || proId,
                        role: pData.role || pData.specialty || 'Professionnel',
                        initial: (pData.name || proId).charAt(0).toUpperCase(),
                        color: pData.color || '#64748B'
                    });
                }
            }
            // Loop family
            for (const code of familles) {
                const fSnap = await db.collection('family_codes').doc(code).get();
                if (fSnap.exists && fSnap.data().active) {
                    const fData = fSnap.data();
                    team.push({
                        id: code,
                        name: fData.name || fData.label || 'Famille',
                        role: fData.role || 'Famille',
                        initial: (fData.name || fData.label || 'F').charAt(0).toUpperCase(),
                        color: '#8B5CF6'
                    });
                }
            }
            return team;
        } catch(e) {
            console.error("Erreur chargement équipe:", e);
            return [];
        }
    }

    async function renderChatList() {
        const container = document.getElementById('chat-list-container');
        const emptyState = document.getElementById('chat-empty-state');
        const patientId = MonacoCare.getSession()?.patientId || 'patient-demo';

        // Afficher un "Chargement..."
        container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted); font-size:13px;"><i class="fa-solid fa-spinner fa-spin"></i> Chargement de l\'équipe...</div>';
        
        let contacts = await loadPatientTeam(patientId);

        if (!contacts || contacts.length === 0) {
            // Fallback si la Base de données n'est pas encore instanciée ou vide
            const MOCK_TEAM = [
                { id: 'PRO-001', name: 'Marc Dupont', role: 'Kinésithérapeute', initial: 'M', color: '#7B1535' },
                { id: 'PRO-002', name: 'Dr. Sarah Chen', role: 'Médecin traitant', initial: 'S', color: '#436653' },
                { id: 'PRO-003', name: 'Sophie Martin', role: 'Auxiliaire de vie', initial: 'S', color: '#3B82F6' },
                { id: 'DEMO-2026', name: 'Emma Dubois', role: 'Famille — Fille', initial: 'E', color: '#8B5CF6' },
            ];
            contacts = MOCK_TEAM;
            console.warn("Utilisation de la MOCK_TEAM car Firestore a retourné 0 contact.");
        }

        if (emptyState) emptyState.style.display = 'none';
        container.innerHTML = '';

        contacts.forEach(contact => {
            // Pour l'instant pas de 'lastMsg' lu dynamiquement car on ne fait pas de jointure complexe ici,
            // on l'ajoute plus tard ou on laisse vide.
            const item = document.createElement('div');
            item.className = 'chat-item';
            item.dataset.id = contact.id;
            item.innerHTML = `
                <div class="chat-avatar" style="background:${contact.color}; color:white; font-weight:800; font-size:16px;">${contact.initial}</div>
                <div class="chat-content">
                    <div class="chat-title-row">
                        <h4>${contact.name}</h4>
                    </div>
                    <p>${contact.role}</p>
                    <p style="margin-top:3px; font-size:11px; color:var(--on-surface-variant); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Appuyez pour ouvrir la discussion</p>
                </div>
            `;
            item.addEventListener('click', () => openChatRoom(contact, patientId));
            container.appendChild(item);
        });

        // Rebrancher "Nouveau message"
        const newMsgBtn = document.getElementById('chat-new-msg-btn');
        if (newMsgBtn) newMsgBtn.addEventListener('click', () => openNewChatModal());
    }

    function openChatRoom(contact, patientId) {
        chatListView.classList.remove('active');
        chatRoomView.classList.add('active');
        document.getElementById('current-chat-title').innerText = contact.name;
        document.getElementById('current-chat-subtitle').innerText = contact.role;
        
        currentContactId = contact.id;
        loadRealtimeChat(patientId, contact.id, contact.name);
    }

    function loadRealtimeChat(patientId, contactId, contactName) {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '<div style="text-align:center; padding:10px; font-size:12px; color:var(--text-muted);"><i class="fa-solid fa-lock"></i> Chat sécurisé</div>';

        // L'identifiant "Room" classique (trie les IDs par ordre alphabétique pour être unique entre 2 personnes sur ce patient)
        const myId = roleSelect.value; // ex: 'kine' par défaut, on va simuler. L'idéal est le vrai UID.
        // En démo, l'identifiant local est souvent fictif. Utilisons l'input du `roleSelect` pour identifier "moi"
        const me = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];
        
        // Simuler un ID de conversation unique pour la paire (contactId / myId) sans se soucier de l'ordre pour ce MVP simplifié
        const roomId = "chat_" + patientId + "_" + contactId;

        if (currentChatListener) currentChatListener();

        currentChatListener = db.collection('chat_messages')
            .where('roomId', '==', roomId)
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                // On vide seulement avant le premier render ? Non, on va iterer les changes.
                // Pour faire simple dans le chat: on re-renderise tout si y a un truc pour éviter des doublons complexes. (MVP)
                // Retirer tout sauf le header lock
                chatMessages.innerHTML = '<div style="text-align:center; padding:10px; font-size:12px; color:var(--text-muted);"><i class="fa-solid fa-lock"></i> Chat sécurisé</div>';
                
                if (snapshot.empty) {
                    const empty = document.createElement('div');
                    empty.style = "text-align:center; padding:20px; font-size:12px; opacity:0.6;";
                    empty.innerText = "Aucun message. Commencez la discussion.";
                    chatMessages.appendChild(empty);
                } else {
                    snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        const isMe = data.senderName === me;
                        const msgDiv = document.createElement('div');
                        msgDiv.className = isMe ? 'message sent' : 'message received';
                        
                         let timeDisplay = "";
                         if(data.createdAt) {
                             const d = data.createdAt.toDate();
                             const today = new Date();
                             const isToday = d.toDateString() === today.toDateString();
                             const yesterday = new Date(today);
                             yesterday.setDate(today.getDate() - 1);
                             const isYesterday = d.toDateString() === yesterday.toDateString();
                             const timeStr = d.getHours().toString().padStart(2,'0') + 'h' + d.getMinutes().toString().padStart(2,'0');
                             if (isToday) timeDisplay = `Aujourd'hui · ${timeStr}`;
                             else if (isYesterday) timeDisplay = `Hier · ${timeStr}`;
                             else timeDisplay = d.toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) + ' · ' + timeStr;
                         }

                        const imgHTML = data.imageUrl
                            ? `<img src="${data.imageUrl}" alt="Photo" style="max-width:200px; border-radius:10px; display:block; margin-top:6px; cursor:pointer;" onclick="window.open(this.src,'_blank')">`
                            : '';
                        msgDiv.innerHTML = `
                            <div class="sender-info">${data.senderName} — ${timeDisplay}</div>
                            <div class="bubble">${data.text}${imgHTML}</div>
                        `;
                        chatMessages.appendChild(msgDiv);
                    });
                }
                setTimeout(() => chatMessages.scrollTop = chatMessages.scrollHeight, 50);
            });
    }

    function openNewChatModal() {
        const modal = document.getElementById('new-chat-modal');
        if (modal) modal.classList.remove('hidden');
    }

    /* Initialisation différée si firebase charge (on l'appelle aussi quand le tab chat est cliqué) */
    setTimeout(() => { renderChatList() }, 1000);

    /* --- CHAT ROOM BUTTONS --- */
    const backBtn = document.getElementById('back-btn');
    const attachBtn = document.getElementById('prescription-btn');
    const attachMenu = document.getElementById('attachment-menu');
    const chatMessages = document.getElementById('chat-messages');
    const currentChatTitle = document.getElementById('current-chat-title');
    const currentChatSub = document.getElementById('current-chat-subtitle');

    if (backBtn) backBtn.addEventListener('click', () => {
        chatRoomView.classList.remove('active');
        chatListView.classList.add('active');
    });
    if (attachBtn) attachBtn.addEventListener('click', () => attachMenu && attachMenu.classList.toggle('hidden'));

    // Bouton "Appareil Photo" dans le menu pièce jointe du chat
    const chatPhotoBtn = document.querySelector('.attach-item');
    if (chatPhotoBtn) {
        const chatFileInput = document.createElement('input');
        chatFileInput.type = 'file';
        chatFileInput.accept = 'image/*';
        chatFileInput.capture = 'environment'; // ouvre la caméra sur mobile
        chatFileInput.style.display = 'none';
        document.body.appendChild(chatFileInput);

        chatPhotoBtn.addEventListener('click', () => {
            if (attachMenu) attachMenu.classList.add('hidden');
            chatFileInput.click();
        });

        chatFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const origIcon = chatPhotoBtn.innerHTML;
            chatPhotoBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi...';
            chatPhotoBtn.disabled = true;

            try {
                const patientId = MonacoCare.getSession()?.patientId || 'patient-demo';
                const fileName = `chat/${patientId}/${Date.now()}_${file.name}`;
                const ref = storage.ref().child(fileName);
                await ref.put(file);
                const imageUrl = await ref.getDownloadURL();

                const meId = roleSelect.value;
                const meName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];
                const roomId = "chat_" + patientId + "_" + (currentContactId || "unknown");

                await db.collection('chat_messages').add({
                    roomId, patientId,
                    participants: [meId, currentContactId],
                    senderId: meId,
                    senderName: meName,
                    text: '📷 Photo',
                    imageUrl: imageUrl,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch(err) {
                console.error('Erreur upload photo chat:', err);
                alert('Impossible d\'envoyer la photo. Vérifiez les règles Firebase Storage.');
            } finally {
                chatPhotoBtn.innerHTML = origIcon;
                chatPhotoBtn.disabled = false;
                chatFileInput.value = '';
            }
        });
    }

    document.querySelectorAll('.attach-item').forEach(item => {
        // fermer le menu au clic sur n'importe quel item (sauf le photo déjà géré ci-dessus)
        if (item !== chatPhotoBtn) item.addEventListener('click', () => attachMenu && attachMenu.classList.add('hidden'));
    });

    /* --- SEND IN CHAT ROOM --- */
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');
    if(sendBtn && messageInput) {
        sendBtn.addEventListener('click', async () => {
            const text = messageInput.value.trim();
            if (text !== '') {
                const patientId = MonacoCare.getSession()?.patientId || 'patient-demo';
                const meId = roleSelect.value;
                const meName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];
                const roomId = "chat_" + patientId + "_" + (currentContactId || "unknown");

                // Nettoyer localement avant d'attendre firebase pour de la fluidité (optionnel, mais on efface l'input au moins)
                messageInput.value = '';

                try {
                    await db.collection('chat_messages').add({
                        roomId: roomId,
                        patientId: patientId,
                        participants: [meId, currentContactId],
                        senderId: meId,
                        senderName: meName,
                        text: text,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch(e) {
                    console.error("Erreur d'envoi du message privé:", e);
                    alert("Impossible d'envoyer le message.");
                }
            }
        });
        messageInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendBtn.click(); });
    }

    const urgentToggle = document.getElementById('urgent-toggle');
    if(urgentToggle) {
        urgentToggle.addEventListener('click', () => {
            urgentToggle.classList.toggle('active');
            urgentToggle.style.backgroundColor = urgentToggle.classList.contains('active') ? 'var(--monaco-red)' : '';
            urgentToggle.style.color = urgentToggle.classList.contains('active') ? 'white' : '';
        });
    }

    // Bouton "Nouveau message" (header chat list)
    const newChatBtn = document.getElementById('new-chat-btn');
    if(newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            const modal = document.getElementById('new-chat-modal');
            if (modal) modal.classList.remove('hidden');
        });
    }
    const closeChatModal = document.getElementById('close-chat-modal');
    if(closeChatModal) {
        const modal = document.getElementById('new-chat-modal');
        closeChatModal.addEventListener('click', () => modal && modal.classList.add('hidden'));
    }

    /* --- FEED PUBLISH LOGIC --- */

    // Initialiser les posts statiques en dur (démo) avec bindPostActions
    document.querySelectorAll('.feed-post').forEach(post => bindPostActions(post));

    /* --- PUBLISH TO FEED (design Stitch : carte blanche) --- */
    function bindPostActions(postEl) {
        const replyBtn = postEl.querySelector('.reply-btn');
        const commentsContainer = postEl.querySelector('.post-comments');
        if (!replyBtn || !commentsContainer) return;

        replyBtn.addEventListener('click', () => {
            // S'il y a déjà un input ouvert, ne pas en dupliquer
            if (postEl.querySelector('.comment-input-row')) return;
            const row = document.createElement('div');
            row.className = 'comment-input-row';
            row.innerHTML = `<input type="text" placeholder="Votre commentaire..."><button class="comment-send-btn"><i class="fa-solid fa-paper-plane"></i></button>`;
            commentsContainer.after(row);
            const inp = row.querySelector('input');
            const sendCommentBtn = row.querySelector('.comment-send-btn');
            inp.focus();
            const submitComment = () => {
                const txt = inp.value.trim();
                if (!txt) return;
                const roleName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];
                const comment = document.createElement('div');
                comment.className = 'comment-item';
                comment.innerHTML = `<strong>${roleName} :</strong> ${txt}`;
                commentsContainer.appendChild(comment);
                row.remove();
            };
            sendCommentBtn.addEventListener('click', submitComment);
            inp.addEventListener('keydown', e => { if (e.key === 'Enter') submitComment(); });
        });
    }

    /* --- FIREBASE: LECTURE DU FLUX EN TEMPS RÉEL --- */

    function formatTime(dateObj) {
        if(!dateObj) return "À l'instant";
        const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();

        const timeStr = d.getHours().toString().padStart(2,'0') + 'h' + d.getMinutes().toString().padStart(2,'0');

        if (isToday) return `Aujourd'hui · ${timeStr}`;
        if (isYesterday) return `Hier · ${timeStr}`;

        const dateStr = d.toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' });
        return `${dateStr} · ${timeStr}`;
    }

    function loadRealtimeFeed(patientId) {
        const fluxFeed = document.getElementById('flux-feed');
        if(fluxListener) fluxListener();

        // Pas de orderBy → pas d'index composite requis, tri en JS après réception
        fluxListener = db.collection('posts')
            .where('patientId', '==', patientId)
            .onSnapshot(snapshot => {
                // Ignorer les écritures locales en attente (bug serverTimestamp)
                if (snapshot.metadata.hasPendingWrites) return;

                fluxFeed.innerHTML = '';

                if (snapshot.empty) {
                    fluxFeed.innerHTML = `
                        <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
                            <i class="fa-regular fa-newspaper" style="font-size:32px; margin-bottom:12px; display:block; opacity:0.4;"></i>
                            <p style="font-size:13px;">Aucun message dans le flux pour le moment.</p>
                            <p style="font-size:11px; margin-top:4px; opacity:0.7;">Les publications de l'équipe soignante apparaîtront ici.</p>
                        </div>
                    `;
                    return;
                }

                // Trier du plus récent au plus ancien en JS
                const sorted = snapshot.docs.slice().sort((a, b) => {
                    const ta = a.data().createdAt?.seconds || 0;
                    const tb = b.data().createdAt?.seconds || 0;
                    return tb - ta;
                });

                sorted.forEach(doc => {
                    renderRealtimePost(doc, fluxFeed, false);
                });
            }, err => {
                console.error('loadRealtimeFeed error:', err);
                fluxFeed.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">
                    <i class="fa-solid fa-triangle-exclamation" style="display:block; font-size:24px; margin-bottom:8px; color:#F59E0B;"></i>
                    Impossible de charger le flux.
                </div>`;
            });
    }


    function renderRealtimePost(docSnap, container, isNewAdd) {
        const data = docSnap.data();
        const role = roleSelect.value;
        const postId = docSnap.id;

        // Filtre par rôle : qui a le droit de voir ce post ?
        if (!canSeePost(data, role)) return;

        // Filtre actif sélectionné par l'utilisateur dans le menu du haut
        if (activeFilter !== 'all') {
            const visibility = data.visibility || 'medifam';
            if (activeFilter === 'medical' && visibility !== 'medical') return;
            if (activeFilter === 'team'    && visibility !== 'medifam') return;
            if (activeFilter === 'public'  && visibility !== 'public')  return;
        }

        const tagMap = {
            'public':   { cls: 'tag-sys',     label: 'PUBLIC' },
            'medical':  { cls: 'tag-medical', label: 'MÉDICAL' },
            'medifam':  { cls: 'tag-team',    label: 'MÉDICAL & FAMILLE' },
            'family':   { cls: 'tag-family',  label: 'FAMILLE UNIQUEMENT' },
            'urgent':   { cls: 'tag-urgent',  label: '⚠️ URGENT' }
        };
        const visKey = data.isUrgent ? 'urgent' : (data.visibility || 'medifam');
        const tagInfo = tagMap[visKey] || tagMap['medifam']; // Fallback sécurisé

        const timeStr = formatTime(data.createdAt);
        const imageHTML = data.imageUrl ? `<img class="post-image" src="${data.imageUrl}" alt="Photo">` : '';

        const isMedPost = (data.visibility === 'medical') ? ' medical-only-post' : '';

        const post = document.createElement('div');
        post.id = 'post-' + postId;
        post.dataset.postid = postId; // Sauvegarde ID
        post.className = 'feed-post' + isMedPost;
        
        const currentUserName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];
        const isAuthor = data.authorName === currentUserName;
        const deleteBtn = isAuthor
            ? `<button class="delete-post-btn" title="Supprimer ce message"><i class="fa-solid fa-trash"></i></button>`
            : '';

        post.innerHTML = `
            <div class="post-header">
                <div class="post-avatar">${(data.authorName || 'S').charAt(0)}</div>
                <div class="post-meta">
                    <h4>${data.authorName} (${data.authorRole})</h4>
                    <p>${timeStr}</p>
                </div>
                <span class="visibility-tag ${tagInfo.cls}" title="Cliquer pour changer la visibilité">${tagInfo.label}</span>
                ${deleteBtn}
            </div>
            ${imageHTML}
            <div class="post-content"><p>${data.text}</p></div>
            <div class="post-comments"></div>
            <div class="post-actions">
                <button class="reply-btn"><i class="fa-regular fa-comment"></i> Commenter</button>
            </div>
        `;

        // Bouton supprimer
        const delBtn = post.querySelector('.delete-post-btn');
        if (delBtn) {
            delBtn.addEventListener('click', () => {
                if (!confirm('Supprimer ce message définitivement ?')) return;
                db.collection('posts').doc(postId).delete()
                    .catch(() => alert('Impossible de supprimer le message.'));
            });
        }

        bindPostActions(post);
        bindVisibilityTag(post);

        // Insertion selon la date ? En réalité on met au début
        if (isNewAdd) {
            post.style.opacity = '0';
            container.insertBefore(post, container.firstChild);
            setTimeout(() => post.style.opacity = '1', 50);
        } else {
            // Dans le cas d'une modification, on append direct pour l'instant
            container.appendChild(post);
        }
    }

    /* --- FIREBASE: ÉCRITURE AU FLUX --- */
    async function publishToFeed(actionText, imageUrl) {
        const isUrgent = actionText.startsWith('⚠️ URGENT');
        let visibility = isUrgent ? 'urgent' : selectedVisibility;

        const session = MonacoCare.getSession();
        const patientId = session?.patientId || 'patient-demo';

        // Utiliser les données de session si disponibles (session réelle),
        // sinon fallback sur le roleSelect (mode démo sans session)
        let authorName, authorRole;
        if (session && session.displayName) {
            authorName = session.displayName.includes(' — ')
                ? session.displayName.split(' — ')[0]
                : session.displayName;
            const roleLabels = {
                'family': 'Famille', 'medecin': 'Médecin', 'kine': 'Kinésithérapeute',
                'auxiliaire': 'Auxiliaire de vie', 'helper': 'Intervenant', 'pro': 'Professionnel'
            };
            authorRole = roleLabels[session.role] || session.role || 'Utilisateur';
        } else {
            authorName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];
            authorRole = roleSelect.options[roleSelect.selectedIndex].text.split('(')[1]?.replace(')','') || roleSelect.value;
        }

        try {
            await db.collection('posts').add({
                patientId,
                authorName,
                authorRole,
                text: actionText,
                visibility,
                isUrgent,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                imageUrl: imageUrl || null
            });
        } catch(e) {
            console.error("Erreur publication: ", e);
            alert("Erreur réseau: impossible de poster pour le moment.");
        }
    }

    /* --- VISIBILITY TAG — CHANGEMENT DE CATÉGORIE --- */
    const VISIBILITY_OPTIONS = [
        { key: 'public',   label: 'PUBLIC',              cls: 'tag-sys',     icon: 'fa-globe' },
        { key: 'medical',  label: 'MÉDICAL',             cls: 'tag-medical', icon: 'fa-stethoscope' },
        { key: 'medifam',  label: 'MÉDICAL & FAMILLE',   cls: 'tag-team',    icon: 'fa-users-between-lines' },
        { key: 'family',   label: 'FAMILLE UNIQUEMENT',  cls: 'tag-family',  icon: 'fa-house-heart' },
    ];

    function bindVisibilityTag(post) {
        const tag = post.querySelector('.visibility-tag');
        if (!tag) return;

        tag.addEventListener('click', (e) => {
            e.stopPropagation();
            // Fermer tout popup existant
            document.querySelectorAll('.visibility-popup').forEach(p => p.remove());

            // Positionner le popup en fixed par rapport au viewport (évite le clipping par overflow:hidden de .feed-post)
            const rect = tag.getBoundingClientRect();
            const popup = document.createElement('div');
            popup.className = 'visibility-popup';
            popup.style.cssText = `
                position: fixed;
                top: ${rect.bottom + 6}px;
                left: ${Math.min(rect.left, window.innerWidth - 175)}px;
                z-index: 9999;
            `;

            VISIBILITY_OPTIONS.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'vis-option';
                btn.innerHTML = `<i class="fa-solid ${opt.icon}"></i> ${opt.label}`;
                btn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    popup.remove();

                    // Mise à jour DOM immédiate (feedback instantané, indépendant de onSnapshot)
                    tag.className = `visibility-tag ${opt.cls}`;
                    tag.textContent = opt.label;

                    // Persistance Firestore en arrière-plan
                    const postId = post.dataset.postid;
                    if (postId) {
                        db.collection('posts').doc(postId).update({ visibility: opt.key })
                            .catch(err => {
                                console.error("Erreur mise à jour visibilité: ", err);
                                alert("Impossible de modifier la visibilité.");
                            });
                    }
                });
                popup.appendChild(btn);
            });

            document.body.appendChild(popup);

            // Fermer en cliquant ailleurs
            setTimeout(() => {
                document.addEventListener('click', () => popup.remove(), { once: true });
            }, 10);
        });
    }

    // Bind sur les posts déjà présents au chargement
    document.querySelectorAll('.feed-post .visibility-tag').forEach(tag => {
        const post = tag.closest('.feed-post');
        if (post) bindVisibilityTag(post);
    });



    /* --- FLUX FREETEXT INPUT LOGIC --- */
    const fluxSendBtn = document.getElementById('flux-send-btn');
    const fluxMessageInput = document.getElementById('flux-message-input');
    const fluxUrgentToggle = document.getElementById('flux-urgent-toggle');
    const fluxAttachBtn = document.getElementById('flux-attach-btn');

    if(fluxUrgentToggle) {
        fluxUrgentToggle.addEventListener('click', () => {
            fluxUrgentToggle.classList.toggle('active');
            if(fluxUrgentToggle.classList.contains('active')) {
                fluxUrgentToggle.style.backgroundColor = 'var(--monaco-red)';
                fluxUrgentToggle.style.color = 'white';
            } else {
                fluxUrgentToggle.style.backgroundColor = 'var(--silver-light)';
                fluxUrgentToggle.style.color = 'var(--text-muted)';
            }
        });
    }

    /* --- VISIBILITÉ AVANT ENVOI (menu déroulant sur la flèche) --- */
    let selectedVisibility = 'medifam'; // valeur par défaut

    /* --- FLUX ATTACHEMENTS — upload vers Firebase Storage --- */
    if(fluxAttachBtn) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fluxAttachBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Feedback visuel pendant l'upload
            fluxAttachBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            fluxAttachBtn.disabled = true;

            try {
                const patientId = MonacoCare.getSession()?.patientId || 'patient-demo';
                const fileName = `posts/${patientId}/${Date.now()}_${file.name}`;
                const ref = storage.ref().child(fileName);

                await ref.put(file);
                const imageUrl = await ref.getDownloadURL();

                await publishToFeed(fluxMessageInput.value.trim() || '📷 Photo partagée', imageUrl);
                fluxMessageInput.value = '';
            } catch(err) {
                console.error('Erreur upload image:', err);
                alert('Impossible d\'uploader l\'image. Vérifiez les règles Firebase Storage.');
            } finally {
                fluxAttachBtn.innerHTML = '<i class="fa-solid fa-paperclip"></i>';
                fluxAttachBtn.disabled = false;
                fileInput.value = '';
            }
        });
    }

    if(fluxSendBtn) {
        fluxSendBtn.addEventListener('click', () => {
            const rawText = fluxMessageInput.value.trim();
            if (!rawText) return;

            // Fermer tout popup existant
            document.querySelectorAll('.send-vis-popup').forEach(p => p.remove());

            const isUrgent = fluxUrgentToggle.classList.contains('active');

            // Si urgent, on envoie directement sans demander la visibilité
            if (isUrgent) {
                publishToFeed('⚠️ URGENT: ' + rawText);
                fluxMessageInput.value = '';
                fluxUrgentToggle.classList.remove('active');
                fluxUrgentToggle.style.backgroundColor = 'var(--silver-light)';
                fluxUrgentToggle.style.color = 'var(--text-muted)';
                return;
            }

            // Sinon : afficher le menu de visibilité au-dessus de la flèche
            const rect = fluxSendBtn.getBoundingClientRect();
            const popup = document.createElement('div');
            popup.className = 'send-vis-popup';
            popup.style.cssText = `
                position: fixed;
                bottom: ${window.innerHeight - rect.top + 8}px;
                right: ${window.innerWidth - rect.right}px;
                z-index: 9999;
            `;

            const SEND_VIS_OPTIONS = [
                { key: 'public',  label: 'Public',             icon: 'fa-globe' },
                { key: 'medifam', label: 'Équipe & Famille',   icon: 'fa-users' },
                { key: 'medical', label: 'Médical uniquement', icon: 'fa-stethoscope' },
                { key: 'family',  label: 'Famille uniquement', icon: 'fa-house-heart' },
            ];

            SEND_VIS_OPTIONS.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'send-vis-option';
                btn.innerHTML = `<i class="fa-solid ${opt.icon}"></i> ${opt.label}`;
                btn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    selectedVisibility = opt.key;
                    popup.remove();
                    publishToFeed(rawText);
                    fluxMessageInput.value = '';
                });
                popup.appendChild(btn);
            });

            document.body.appendChild(popup);
            setTimeout(() => {
                document.addEventListener('click', () => popup.remove(), { once: true });
            }, 10);
        });
    }

    /* --- CUSTOM SHORTCUT MODAL --- */
    const shortcutModal = document.getElementById('new-shortcut-modal');
    const saveShortcutBtn = document.getElementById('save-shortcut-btn');
    const closeShortcutBtn = document.getElementById('close-shortcut-modal');
    const emjInput = document.getElementById('shortcut-emoji');
    const nameInput = document.getElementById('shortcut-name');
    const manageList = document.getElementById('shortcuts-manage-list');
    const roleNameDisplay = document.getElementById('role-name-display');

    window.renderManageList = function() {
        const role = roleSelect.value;
        const roleName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0]; 
        if(roleNameDisplay) roleNameDisplay.innerText = roleName;
        
        if(!window.customShortcuts) window.customShortcuts = {};
        const savedShortcuts = window.customShortcuts[role] || [];
        
        if(savedShortcuts.length === 0) {
            manageList.innerHTML = '<p style="font-size:12px; color:var(--text-muted); text-align:center; padding: 10px;">Aucun raccourci personnalisé créé.</p>';
        } else {
            manageList.innerHTML = savedShortcuts.map((txt, index) => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--silver-light); padding:10px; border-radius:8px;">
                    <span style="font-size:13px; font-weight:600;">${txt}</span>
                    <button class="icon-btn delete-shortcut-btn" data-index="${index}" style="font-size:14px; padding:0;"><i class="fa-solid fa-trash"></i></button>
                </div>
            `).join('');
            
            // Re-bind delete events
            manageList.querySelectorAll('.delete-shortcut-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = e.currentTarget.getAttribute('data-index');
                    window.customShortcuts[role].splice(idx, 1);
                    // Sauvegarder dans Firebase ET localStorage
                    saveShortcuts();
                    renderManageList(); 
                    updateRoleUI();     
                });
            });
        }
    }

    if(closeShortcutBtn) {
        closeShortcutBtn.addEventListener('click', () => shortcutModal.classList.add('hidden'));
    }
    
    if(saveShortcutBtn) {
        saveShortcutBtn.addEventListener('click', () => {
            const role = roleSelect.value;
            const fullTxt = (emjInput.value + " " + nameInput.value).trim();
            if(fullTxt !== "") {
                if(!window.customShortcuts) window.customShortcuts = {};
                if(!window.customShortcuts[role]) window.customShortcuts[role] = [];
                window.customShortcuts[role].push(fullTxt);
                
                // Sauvegarder dans Firebase ET localStorage
                saveShortcuts();

                // Clear inputs
                emjInput.value = '';
                nameInput.value = '';
                
                // Update lists
                renderManageList();
                updateRoleUI(); 
            }
        });
    }

    /* --- VITALS: cartes cliquables (pas de boutons séparés) --- */

    function promptVital(type, unit, placeholder) {
        const role = roleSelect.value;
        if (role === 'auxiliaire' || role === 'pro') {
            alert("Erreur de droits : impossible d'ajouter des constantes.");
            return;
        }
        const value = prompt(`Saisir ${type} (${unit})\nExemple : ${placeholder}`);
        if (!value || !value.trim()) return;

        const session = MonacoCare.getSession();
        const patientId = session?.patientId || 'patient-demo';
        const docId = `${patientId}_${type.replace(/\s+/g, '_')}`;

        let status = 'normal';
        if (type === 'Température') {
            const num = parseFloat(value.replace(',', '.'));
            if (num >= 38.0 || num <= 36.0) status = 'alert';
        }

        const payload = {
            patientId, type,
            value: value.trim().replace(',', '.'),
            unit, status,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Valeur courante (ID fixe = toujours 1 doc par type)
        db.collection('medical_vitals').doc(docId).set(payload)
            .then(() => {
                if (typeof appendClinicalNote === 'function') {
                    appendClinicalNote(`Constante mise à jour : ${type} → ${value.trim()} ${unit}`);
                }
            }).catch(e => console.error('Erreur constante:', e));

        // Historique (ID auto-généré = accumulation voulue)
        db.collection('medical_vitals_history').add(payload)
            .catch(e => console.error('Erreur historique constante:', e));
    }

    // Cacher l'ancien bouton (les cartes sont maintenant cliquables)
    const addVitalsBtn = document.getElementById('add-vitals-btn');
    if (addVitalsBtn) addVitalsBtn.style.display = 'none';

    /* --- PAIN: prompt de mise à jour d'une zone existante --- */
    function promptPainUpdate(location) {
        const role = roleSelect.value;
        if (role === 'auxiliaire' || role === 'pro') {
            alert("Erreur de droits : impossible de modifier une évaluation.");
            return;
        }
        const newScore = prompt(`Mettre à jour la douleur — ${location}\nNouvelle intensité (0 à 10) :`);
        if (newScore === null || newScore.trim() === '') return;
        let score = parseInt(newScore);
        if (isNaN(score)) return;
        if (score < 0) score = 0;
        if (score > 10) score = 10;

        const session = MonacoCare.getSession();
        const patientId = session?.patientId || 'patient-demo';
        const authorName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];
        const docId = `${patientId}_${location.replace(/\s+/g, '_')}`;

        const payload = {
            patientId,
            location,
            level: score,
            score,   // alias pour compatibilité historique
            authorName,
            authorRole: 'Équipe Soignante',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Valeur courante (ID fixe = 1 doc par zone)
        db.collection('medical_pain').doc(docId).set(payload)
            .catch(e => console.error('Erreur mise à jour douleur:', e));

        // Historique (auto-ID = accumulation)
        db.collection('medical_pain_history').add(payload)
            .catch(e => console.error('Erreur historique douleur:', e));
    }

    const openPainModalBtn = document.getElementById('open-pain-modal-btn');
    const addPainModal = document.getElementById('add-pain-modal');
    const closePainModalBtn = document.getElementById('close-pain-modal');
    const savePainBtn = document.getElementById('save-pain-btn');

    if(openPainModalBtn) {
        openPainModalBtn.addEventListener('click', () => {
            if(roleSelect.value === 'auxiliaire' || roleSelect.value === 'pro') {
                alert("Erreur de droits : Seul le personnel médical ou la famille qualifiée peut ajouter une évaluation.");
                return;
            }
            addPainModal.classList.remove('hidden');
        });
    }

    if(closePainModalBtn) {
        closePainModalBtn.addEventListener('click', () => addPainModal.classList.add('hidden'));
    }

    if(savePainBtn) {
        savePainBtn.addEventListener('click', async () => {
            const locInput = document.getElementById('pain-location-input').value.trim();
            let scoreInput = parseInt(document.getElementById('pain-score-input').value);
            
            if(locInput && !isNaN(scoreInput)) {
                if(scoreInput < 0) scoreInput = 0;
                if(scoreInput > 10) scoreInput = 10;
                
                const session = MonacoCare.getSession();
                const patientId = session?.patientId || 'patient-demo';
                const reporterName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];
                const docId = `${patientId}_${locInput.replace(/\s+/g, '_')}`;

                const payload = {
                    patientId,
                    location: locInput,
                    level: scoreInput,
                    score: scoreInput,  // alias pour compatibilité
                    authorName: reporterName,
                    authorRole: 'Équipe Soignante',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                try {
                    // Valeur courante (ID fixe par zone)
                    await db.collection('medical_pain').doc(docId).set(payload);
                    // Historique (auto-ID)
                    await db.collection('medical_pain_history').add(payload);

                    document.getElementById('pain-location-input').value = '';
                    document.getElementById('pain-score-input').value = '';
                    addPainModal.classList.add('hidden');
                    
                    if(typeof appendClinicalNote === 'function') {
                        appendClinicalNote(`Évaluation ajoutée : Douleur à l'emplacement "${locInput}" estimée à ${scoreInput}/10.`);
                    }
                } catch(e) {
                    console.error('Erreur évaluation douleur:', e);
                }
            }
        });
    }

    /* --- HISTORY TABLE (Firebase réel) --- */
    function renderHistoryTable(metric, period) {
        const container = document.getElementById('charts-container');
        container.innerHTML = '<div style="text-align:center;color:gray;padding:20px;">Chargement...</div>';

        const session = MonacoCare.getSession();
        const patientId = session?.patientId || 'patient-demo';

        // Calcul de la date de début selon la période
        let since = null;
        if (period === '24h') {
            since = new Date(Date.now() - 24 * 3600 * 1000);
        } else if (period === '7j') {
            since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        }
        // 'Tout' → since = null → pas de filtre de date

        function fmtDate(ts) {
            if (!ts) return '—';
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' })
                + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
        }

        if (metric === 'Constantes Vitales') {
            // Pas de orderBy → aucun index composite requis, on trie en JS
            db.collection('medical_vitals_history')
                .where('patientId', '==', patientId)
                .get().then(snap => {
                if (snap.empty) {
                    container.innerHTML = '<div style="text-align:center;color:gray;padding:20px;">Aucun historique disponible.<br><small>Les nouvelles saisies seront enregistrées automatiquement.</small></div>';
                    return;
                }

                // Filtrer par date + trier du plus récent au plus ancien en JS
                let rows = [];
                snap.forEach(doc => {
                    const d = doc.data();
                    const ts = d.createdAt?.toDate?.() || null;
                    if (since && ts && ts < since) return;
                    rows.push(d);
                });
                rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                if (rows.length === 0) {
                    container.innerHTML = '<div style="text-align:center;color:gray;padding:20px;">Aucune donnée sur cette période.</div>';
                    return;
                }

                const COLORS = {
                    'Rythme Cardiaque':   '#CE1126',
                    'Tension Artérielle': '#3B82F6',
                    'Température':        '#F97316'
                };

                let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <thead>
                        <tr style="border-bottom:2px solid #dcc0c3;">
                            <th style="text-align:left;padding:6px 4px;color:#7B1535;font-weight:700;">Date</th>
                            <th style="text-align:left;padding:6px 4px;color:#7B1535;font-weight:700;">Type</th>
                            <th style="text-align:right;padding:6px 4px;color:#7B1535;font-weight:700;">Valeur</th>
                        </tr>
                    </thead><tbody>`;

                rows.forEach(d => {
                    const color = COLORS[d.type] || '#564245';
                    html += `<tr style="border-bottom:1px solid #f0e8e9;">
                        <td style="padding:7px 4px;color:#564245;">${fmtDate(d.createdAt)}</td>
                        <td style="padding:7px 4px;">
                            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:5px;"></span>
                            ${d.type}
                        </td>
                        <td style="padding:7px 4px;text-align:right;font-weight:700;color:#1c1b1c;">${d.value} <span style="font-weight:400;color:#897174;">${d.unit}</span></td>
                    </tr>`;
                });

                html += '</tbody></table>';
                container.innerHTML = html;

            }).catch(e => {
                console.error('Historique vitaux:', e);
                container.innerHTML = '<div style="text-align:center;color:gray;padding:20px;">Erreur de chargement.</div>';
            });

        } else {
            // Douleur : pas de orderBy → tri en JS
            db.collection('medical_pain_history')
                .where('patientId', '==', patientId)
                .get().then(snap => {

                if (snap.empty) {
                    container.innerHTML = '<div style="text-align:center;color:gray;padding:20px;">Aucun historique de douleur.<br><small>Les mises à jour de zones seront enregistrées automatiquement.</small></div>';
                    return;
                }

                let rows = [];
                snap.forEach(doc => {
                    const d = doc.data();
                    const ts = d.createdAt?.toDate?.() || null;
                    if (since && ts && ts < since) return;
                    rows.push(d);
                });
                rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

                if (rows.length === 0) {
                    container.innerHTML = '<div style="text-align:center;color:gray;padding:20px;">Aucune donnée sur cette période.</div>';
                    return;
                }

                let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
                    <thead>
                        <tr style="border-bottom:2px solid #dcc0c3;">
                            <th style="text-align:left;padding:6px 4px;color:#7B1535;font-weight:700;">Date</th>
                            <th style="text-align:left;padding:6px 4px;color:#7B1535;font-weight:700;">Zone</th>
                            <th style="text-align:right;padding:6px 4px;color:#7B1535;font-weight:700;">Intensité</th>
                        </tr>
                    </thead><tbody>`;

                rows.forEach(d => {
                    const score = parseInt(d.level ?? d.score) || 0;
                    const barColor = score >= 7 ? '#CE1126' : score >= 4 ? '#F59E0B' : '#10B981';

                    html += `<tr style="border-bottom:1px solid #f0e8e9;">
                        <td style="padding:7px 4px;color:#564245;">${fmtDate(d.createdAt)}</td>
                        <td style="padding:7px 4px;font-weight:600;">${d.location || d.zone || '—'}</td>
                        <td style="padding:7px 4px;text-align:right;">
                            <span style="display:inline-block;background:${barColor};color:white;font-weight:700;font-size:11px;padding:2px 8px;border-radius:999px;">${score}/10</span>
                        </td>
                    </tr>`;
                });

                html += '</tbody></table>';
                container.innerHTML = html;

            }).catch(e => {
                console.error('Historique douleur:', e);
                container.innerHTML = '<div style="text-align:center;color:gray;padding:20px;">Erreur de chargement.</div>';
            });
        }
    }

    /* --- HISTORY MODAL WIRING --- */
    const historyBtns = document.querySelectorAll('.history-btn');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryBtn = document.getElementById('close-history-modal');
    const historyTitle = document.getElementById('history-modal-title');
    const histTabs = document.querySelectorAll('.hist-tab');
    let currentMetric = 'Constantes Vitales';

    historyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if(roleSelect.value === 'auxiliaire' || roleSelect.value === 'pro') {
                alert('Accès refusé. Historique réservé au corps médical et à la famille.');
            } else {
                currentMetric = btn.getAttribute('data-metric');
                if (historyTitle) historyTitle.innerText = 'Historique : ' + currentMetric;
                histTabs.forEach(t => t.classList.remove('active'));
                histTabs[0].classList.add('active');
                historyModal.classList.remove('hidden');
                renderHistoryTable(currentMetric, '24h');
            }
        });
    });

    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => historyModal.classList.add('hidden'));
    }

    histTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            histTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderHistoryTable(currentMetric, tab.innerText.trim());
        });
    });

    /* --- DICTATION LOGIC --- */
    const dictateBtn = document.getElementById('dictate-btn');
    const typeBtn = document.getElementById('type-btn');
    const clinicalNotesContainer = document.getElementById('clinical-notes-container');

    window.appendClinicalNote = async function(text) {
        const roleName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0]; 
        const session = MonacoCare.getSession();
        const patientId = session?.patientId || 'patient-demo';

        try {
            await db.collection('medical_notes').add({
                patientId,
                content: text,
                authorName: roleName,
                authorRole: "Équipe Soignante",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch(e) {
            console.error("Erreur enregistrement de la note:", e);
        }
    };

    if(dictateBtn) {
        dictateBtn.addEventListener('click', () => {
            if(roleSelect.value === 'auxiliaire' || roleSelect.value === 'pro') {
                alert("Permission refusée.");
                return;
            }
            const transcript = prompt("🎤 Mode Dictée Vocale :\nParlez dans le micro maintenant...\n[Ou tapez le texte enregistré par le logiciel tiers ci-dessous]");
            if(transcript) {
                appendClinicalNote("🎙️ " + transcript);
            }
        });
    }

    if(typeBtn) {
        typeBtn.addEventListener('click', () => {
            if(roleSelect.value === 'auxiliaire' || roleSelect.value === 'pro') {
                alert("Permission refusée.");
                return;
            }
            const txt = prompt("⌨️ Saisie Manuelle :\nEntrez votre note clinique complète :");
            if(txt) {
                appendClinicalNote(txt);
            }
        });
    }

    /* --- NEW: FLUX FILTER LOGIC --- */
    const fluxFilterBtn = document.getElementById('flux-filter-btn');
    const fluxFilterMenu = document.getElementById('flux-filter-menu');
    const filterOptions = document.querySelectorAll('.filter-option');
    const currentFilterName = document.getElementById('current-filter-name');

    if (fluxFilterBtn && fluxFilterMenu) {
        fluxFilterBtn.addEventListener('click', () => {
            fluxFilterMenu.classList.toggle('hidden');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!fluxFilterBtn.contains(e.target) && !fluxFilterMenu.contains(e.target)) {
                fluxFilterMenu.classList.add('hidden');
            }
        });

        filterOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const filterType = e.currentTarget.getAttribute('data-filter');

                // Mémoriser le filtre actif
                activeFilter = filterType;

                // Mettre à jour l'affichage du bouton
                currentFilterName.innerText = e.currentTarget.innerText;
                fluxFilterMenu.classList.add('hidden');

                // Marquer l'option active en gras
                filterOptions.forEach(opt => opt.style.fontWeight = 'normal');
                e.currentTarget.style.fontWeight = 'bold';

                // Recharger le feed — renderRealtimePost appliquera rôle + filtre actif
                const patientId = MonacoCare.getSession()?.patientId || 'patient-demo';
                const fluxFeed = document.getElementById('flux-feed');
                if (fluxFeed) fluxFeed.innerHTML = '';
                loadRealtimeFeed(patientId);
            });
        });
    }

    /* --- HEADER DROPDOWN MENU --- */
    const headerMenuBtn  = document.getElementById('header-menu-btn');
    const headerDropdown = document.getElementById('header-dropdown');
    const settingsModal  = document.getElementById('settings-modal');
    const closeSettingsModal = document.getElementById('close-settings-modal');

    if (headerMenuBtn && headerDropdown) {
        headerMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            headerDropdown.classList.toggle('hidden');
        });
        // Fermer en cliquant ailleurs
        document.addEventListener('click', () => headerDropdown.classList.add('hidden'));
        headerDropdown.addEventListener('click', e => e.stopPropagation());
    }

    // Gestion du Select Patient
    const ddSelectPatient = document.getElementById('dd-select-patient');
    const selectPatientModal = document.getElementById('select-patient-modal');
    if (ddSelectPatient && selectPatientModal) {
        ddSelectPatient.addEventListener('click', () => {
            headerDropdown.classList.add('hidden');
            selectPatientModal.classList.remove('hidden');
            
            const listContainer = document.getElementById('patients-list-container');
            const role = roleSelect.value;
            // Mode Démo: Mock de patients
            let patients = [];
            if(role === 'family') {
                patients = [{id: 'patient-demo', name: 'Charles Leclerc'}];
            } else {
                patients = [{id: 'patient-demo', name: 'Charles Leclerc'}];
            }

            listContainer.innerHTML = '';
            patients.forEach(p => {
                const btn = document.createElement('button');
                btn.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#f9f9f9; padding:12px; border:1px solid #ddd; border-radius:8px; cursor:pointer;";
                btn.innerHTML = `<span style="font-weight:600; font-size:14px; color:var(--text-dark);">${p.name}</span> <i class="fa-solid fa-chevron-right" style="color:var(--monaco-red); font-size:12px;"></i>`;
                
                btn.addEventListener('click', () => {
                    MonacoCare.switchPatient(p.id, p.name);
                });
                
                listContainer.appendChild(btn);
            });
        });
    }

    // Gestion du Add Patient
    const ddAddPatient = document.getElementById('dd-add-patient');
    const addPatientModal = document.getElementById('add-patient-modal');
    if (ddAddPatient && addPatientModal) {
        ddAddPatient.addEventListener('click', () => {
            headerDropdown.classList.add('hidden');
            addPatientModal.classList.remove('hidden');
        });
    }

    // Paramètres (ouvre le modal existant)
    const ddSettings = document.getElementById('dd-settings');
    if (ddSettings && settingsModal) {
        ddSettings.addEventListener('click', () => {
            headerDropdown.classList.add('hidden');
            const role = roleSelect.value;
            const secPro     = document.getElementById('settings-add-pro-section');
            const secInv     = document.getElementById('settings-invitations-section');
            const invList    = document.getElementById('pending-invitations-list');
            
            if (role === 'family') {
                if(secPro)     secPro.style.display = 'block';
                if(secInv)     secInv.style.display = 'block';
                if(invList)    invList.innerHTML = '<p style="font-size:11px;color:var(--text-muted);">Chargement des demandes...</p>';
            } else {
                if(secPro)     secPro.style.display = 'none';
                if(secInv)     secInv.style.display = 'block';
                if(invList)    invList.innerHTML = '<p style="font-size:11px;color:var(--text-muted);">Chargement des invitations...</p>';
            }
            settingsModal.classList.remove('hidden');
        });
    }

    // Déconnexion
    const ddLogout = document.getElementById('dd-logout');
    if (ddLogout) {
        ddLogout.addEventListener('click', () => {
            MonacoCare.clearSession();
            window.location.href = 'login.html';
        });
    }

    // === PHASE 4: GESTION MULTI-PATIENTS ET INVITATIONS ===

    // 1. Envoyer une demande d'accès à un patient (Pro -> Famille)
    const sendPatientRequestBtn = document.getElementById('send-patient-request-btn');
    if (sendPatientRequestBtn) {
        sendPatientRequestBtn.addEventListener('click', async () => {
            const lastName = document.getElementById('link-patient-lastname').value.trim();
            const patientId = document.getElementById('link-patient-id').value.trim();
            
            if(!lastName || !patientId) {
                alert("Veuillez saisir le nom de famille et l'identifiant du patient.");
                return;
            }

            const simulatedUserId = roleSelect.value;
            
            try {
                await db.collection('requests').add({
                    fromId: simulatedUserId,
                    fromRole: 'pro',
                    type: 'access_request',
                    targetPatientId: patientId,
                    targetLastName: lastName,
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert(`Demande d'accès envoyée au responsable du dossier de "${lastName}".`);
                document.getElementById('link-patient-lastname').value = '';
                document.getElementById('link-patient-id').value = '';
                document.getElementById('add-patient-modal').classList.add('hidden');
            } catch (err) {
                console.error("Erreur lors de l'envoi :", err);
                alert("Une erreur est survenue.");
            }
        });
    }

    // 2. Inviter un pro (Famille -> Pro)
    const sendProInviteBtn = document.getElementById('send-pro-invite-btn');
    if (sendProInviteBtn) {
        sendProInviteBtn.addEventListener('click', async () => {
            const lastName = document.getElementById('pro-invite-lastname').value.trim();
            const proId = document.getElementById('pro-invite-id').value.trim();
            const session = MonacoCare.getSession();
            const patientId = session?.patientId || 'patient-demo'; 
            
            if(!lastName || !proId) {
                alert("Veuillez remplir tous les champs.");
                return;
            }

            try {
                await db.collection('requests').add({
                    fromId: patientId,
                    fromRole: 'family',
                    type: 'pro_invite',
                    targetProId: proId,
                    targetLastName: lastName,
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert(`Invitation envoyée au professionnel "${lastName}". Il pourra l'accepter lors de sa connexion.`);
                document.getElementById('pro-invite-lastname').value = '';
                document.getElementById('pro-invite-id').value = '';
            } catch (err) {
                console.error("Erreur d'invitation :", err);
            }
        });
    }

    // 3. Écoute temps-réel des demandes (Boîte de réception)
    let requestsUnsubscribe = null;

    window.listenToRequests = function() {
        if(requestsUnsubscribe) requestsUnsubscribe();
        
        const role = roleSelect.value;
        const invList = document.getElementById('pending-invitations-list');
        if(!invList) return;

        let query = null;
        if(role === 'family') {
            const patientId = MonacoCare.getSession()?.patientId || 'patient-demo'; // Dans un cas réel lié au compte famille
            query = db.collection('requests')
                      .where('type', '==', 'access_request')
                      //.where('targetPatientId', '==', patientId) // Simplifié pour la démo
                      .where('status', '==', 'pending');
        } else {
            const myProId = role;
            query = db.collection('requests')
                      .where('type', '==', 'pro_invite')
                      //.where('targetProId', '==', myProId) // Simplifié pour la démo
                      .where('status', '==', 'pending');
        }

        requestsUnsubscribe = query.onSnapshot(snapshot => {
            invList.innerHTML = '';
            if(snapshot.empty) {
                invList.innerHTML = `<p style="font-size:12px;color:var(--text-muted);"><i class="fa-solid fa-check"></i> Vous êtes à jour.</p>`;
                return;
            }

            snapshot.forEach(doc => {
                const req = doc.data();
                const div = document.createElement('div');
                div.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.03); padding:8px 12px; border-radius:8px; margin-bottom: 5px;";
                
                let text = "";
                if(req.type === 'access_request') {
                    const proName = req.fromId.toUpperCase();
                    text = `Le compte pro <b>${proName}</b> demande l'accès pour M./Mme ${req.targetLastName}.`;
                } else {
                    text = `La famille Dubois vous a invité au dossier du patient <b>${req.fromId}</b>.`;
                }

                div.innerHTML = `
                    <p style="font-size:11px; margin:0; line-height:1.4; flex:1; padding-right:10px;">${text}</p>
                    <div style="display:flex; gap:5px; flex-shrink:0;">
                        <button style="padding:6px; background:#10B981; color:white; border:none; border-radius:6px; cursor:pointer;" data-id="${doc.id}" class="acc-btn"><i class="fa-solid fa-check"></i></button>
                        <button style="padding:6px; background:#EF4444; color:white; border:none; border-radius:6px; cursor:pointer;" data-id="${doc.id}" class="rej-btn"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                `;
                invList.appendChild(div);
            });

            invList.querySelectorAll('.acc-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    await db.collection('requests').doc(id).update({status: 'accepted'});
                });
            });
            invList.querySelectorAll('.rej-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    await db.collection('requests').doc(id).update({status: 'rejected'});
                });
            });
        });
    };

    // Subscription Payment Logic
    const paySubBtn = document.getElementById('pay-sub-btn');
    if (paySubBtn) {
        paySubBtn.addEventListener('click', () => {
            alert("Redirection vers la passerelle de paiement (Stripe) pour gérer la carte bancaire et choisir votre formule d'abonnement...");
        });
    }

    // On lance l'écoute des requêtes au démarrage ou lors du changement de vue
    listenToRequests();

});
