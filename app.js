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
    
    // Initialize default shortcuts if totally blank
    if(!window.customShortcuts) {
        window.customShortcuts = {
            'kine': ['🏃 Séance Terminée', '✅ Mobilité Stable', '⚠️ Alerte Douleur'],
            'auxiliaire': ['🍽️ Repas Pris', '🚿 Toilette Faite', '😊 Bonne Humeur'],
            'medecin': ['💊 Nouvelle Prescription', '🩺 Visite Effectuée'],
            'family': ['❤️ Visite de courtoisie']
        };
    }

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
            bioOverlay.querySelector('p').innerText = "Accès Refusé. Autorisation Médicale / Famille Nécessaire.";
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
            
            // Accès complet (soignant)
            const clinSection = vaultContent.querySelector('#clinical-notes-container')?.closest('.vault-section');
            if(clinSection) clinSection.style.display = 'block';
            
            loadRealtimeVault(MonacoCare.getSession()?.patientId || 'patient-demo', true);
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
            const unsubVitals = db.collection('medical_vitals')
                .where('patientId', '==', patientId)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .onSnapshot(snap => {
                    if(snap.empty) {
                        vitalsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:20px 0; color:var(--text-muted); font-size:13px;">
                            <i class="fa-regular fa-chart-bar" style="font-size:24px; margin-bottom:8px; display:block;"></i>
                            Aucune constante enregistrée.
                        </div>`;
                    } else {
                        vitalsGrid.innerHTML = '';
                        snap.forEach(doc => {
                            const d = doc.data();
                            const div = document.createElement('div');
                            div.className = 'vital-card';
                            div.innerHTML = `
                                <h4>${d.type}</h4>
                                <div class="value">${d.value} <span class="unit">${d.unit || ''}</span></div>
                                <div class="status ${d.status || 'normal'}">${d.status === 'alert' ? 'À surveiller' : 'Normal'}</div>
                            `;
                            vitalsGrid.appendChild(div);
                        });
                    }
                });
            vaultListeners.push(unsubVitals);
        }

        // 2. Douleur
        const painGrid = document.getElementById('pain-trackers-container');
        if(painGrid) {
            painGrid.innerHTML = '<div style="text-align:center;color:gray;">Chargement...</div>';
            const unsubPain = db.collection('medical_pain')
                .where('patientId', '==', patientId)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .onSnapshot(snap => {
                    if(snap.empty) {
                        painGrid.innerHTML = `<div style="text-align:center; padding:20px 0; color:var(--text-muted); font-size:13px;">
                            <i class="fa-regular fa-face-smile" style="font-size:24px; margin-bottom:8px; display:block;"></i>
                            Aucune évaluation enregistrée.
                        </div>`;
                    } else {
                        painGrid.innerHTML = '';
                        snap.forEach(doc => {
                            const d = doc.data();
                            const div = document.createElement('div');
                            div.className = 'pain-item';
                            div.innerHTML = `
                                <div>
                                    <div style="font-weight:600; font-size:14px; margin-bottom:2px;">${d.location}</div>
                                    <div style="color:var(--text-muted); font-size:12px;">Évaluée par ${d.authorName}</div>
                                </div>
                                <div class="pain-score score-${d.level > 7 ? 'high' : (d.level > 3 ? 'medium' : 'low')}">${d.level}/10</div>
                            `;
                            painGrid.appendChild(div);
                        });
                    }
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
                    .orderBy('createdAt', 'desc')
                    .onSnapshot(snap => {
                        if(snap.empty) {
                            notesGrid.innerHTML = `<div style="text-align:center; padding:20px 0; color:var(--text-muted); font-size:13px;">
                                <i class="fa-regular fa-note-sticky" style="font-size:24px; margin-bottom:8px; display:block;"></i>
                                Aucune note clinique pour le moment.
                            </div>`;
                        } else {
                            notesGrid.innerHTML = '';
                            snap.forEach(doc => {
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
    let currentChatListener = null;
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
                const fSnap = await db.collection('demo_codes').doc(code).get();
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
                             timeDisplay = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
                         }

                        msgDiv.innerHTML = `
                            <div class="sender-info">${data.senderName} — ${timeDisplay}</div>
                            <div class="bubble">${data.text}</div>
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
    document.querySelectorAll('.attach-item').forEach(item => {
        item.addEventListener('click', () => attachMenu && attachMenu.classList.add('hidden'));
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
    let fluxListener = null;

    function formatTime(dateObj) {
        if(!dateObj) return "À l'instant";
        const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
        return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
    }

    function loadRealtimeFeed(patientId) {
        const fluxFeed = document.getElementById('flux-feed');
        if(fluxListener) fluxListener(); // Stop previous listener

        fluxListener = db.collection('posts')
            .where('patientId', '==', patientId)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                // Retirer le message "vide"
                const emptyMsg = fluxFeed.querySelector('.empty-msg, [style*="text-align:center"]');
                if (emptyMsg) emptyMsg.remove();

                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        renderRealtimePost(change.doc, fluxFeed, true);
                    }
                    if (change.type === 'modified') {
                        // Le doc a été mis à jour (ex: visibilité changée)
                        const oldPost = document.getElementById('post-' + change.doc.id);
                        if (oldPost) {
                            oldPost.remove();
                            // Pour simplifier on le recrée (dans une vraie app, on mettrait juste à jour les classes)
                            renderRealtimePost(change.doc, fluxFeed, false);
                        }
                    }
                    if (change.type === 'removed') {
                        const oldPost = document.getElementById('post-' + change.doc.id);
                        if(oldPost) oldPost.remove();
                    }
                });
                
                if(fluxFeed.children.length === 0) {
                    fluxFeed.innerHTML = `
                        <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
                            <i class="fa-regular fa-newspaper" style="font-size:32px; margin-bottom:12px; display:block; opacity:0.4;"></i>
                            <p style="font-size:13px;">Aucun message dans le flux pour le moment.</p>
                            <p style="font-size:11px; margin-top:4px; opacity:0.7;">Les publications de l'équipe soignante apparaîtront ici.</p>
                        </div>
                    `;
                }
            });
    }

    function renderRealtimePost(docSnap, container, isNewAdd) {
        const data = docSnap.data();
        const role = roleSelect.value;
        const postId = docSnap.id;

        // Filtre d'affichage côté client selon le rôle
        // Si je suis family, je ne vois pas les posts 'medical'
        // Si je suis auxiliaire, je ne vois pas les posts 'medical' non plus (en théorie, à ajuster)
        if (data.visibility === 'medical' && (role === 'family' || role === 'auxiliaire')) {
            return; 
        }

        const tagMap = {
            'public':   { cls: 'tag-sys',     label: 'PUBLIC' },
            'medical':  { cls: 'tag-medical', label: 'MÉDICAL' },
            'medifam':  { cls: 'tag-team',    label: 'MÉDICAL & FAMILLE' },
            'family':   { cls: 'tag-family',  label: 'FAMILLE UNIQUEMENT' },
            'urgent':   { cls: 'tag-urgent',  label: '⚠️ URGENT' }
        };
        const visKey = data.isUrgent ? 'urgent' : (data.visibility || 'medifam');
        const tagInfo = tagMap[visKey];

        const timeStr = formatTime(data.createdAt);
        const imageHTML = data.imageUrl ? `<img class="post-image" src="${data.imageUrl}" alt="Photo">` : '';

        const isMedPost = (data.visibility === 'medical') ? ' medical-only-post' : '';

        const post = document.createElement('div');
        post.id = 'post-' + postId;
        post.dataset.postid = postId; // Sauvegarde ID
        post.className = 'feed-post' + isMedPost;
        
        post.innerHTML = `
            <div class="post-header">
                <div class="post-avatar">${(data.authorName || 'S').charAt(0)}</div>
                <div class="post-meta">
                    <h4>${data.authorName} (${data.authorRole})</h4>
                    <p>${timeStr}</p>
                </div>
                <span class="visibility-tag ${tagInfo.cls}" title="Cliquer pour changer la visibilité">${tagInfo.label}</span>
            </div>
            ${imageHTML}
            <div class="post-content"><p>${data.text}</p></div>
            <div class="post-comments"></div>
            <div class="post-actions">
                <button class="reply-btn"><i class="fa-regular fa-comment"></i> Commenter</button>
            </div>
        `;

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
        const role = roleSelect.value;
        const roleName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];
        const titleJob = roleSelect.options[roleSelect.selectedIndex].text.split('(')[1]?.replace(')','') || role;

        const isUrgent = actionText.startsWith('⚠️ URGENT');
        const isMedical = role === 'medecin' || actionText.toLowerCase().includes('prescription') || actionText.toLowerCase().includes('médical');
        
        let visibility = 'medifam';
        if (isUrgent) visibility = 'urgent';
        else if (isMedical) visibility = 'medical';

        const patientId = MonacoCare.getSession()?.patientId || 'patient-demo';

        try {
            await db.collection('posts').add({
                patientId: patientId,
                authorName: roleName,
                authorRole: titleJob,
                text: actionText,
                visibility: visibility,
                isUrgent: isUrgent,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                imageUrl: imageUrl || null
            });
            // Pas besoin d'ajouter manuellement au DOM, le listener s'en charge !
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

            const popup = document.createElement('div');
            popup.className = 'visibility-popup';
            VISIBILITY_OPTIONS.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'vis-option';
                btn.innerHTML = `<i class="fa-solid ${opt.icon}"></i> ${opt.label}`;
                btn.addEventListener('click', async () => {
                    const postId = post.dataset.postid;
                    if (postId) {
                        try {
                            await db.collection('posts').doc(postId).update({
                                visibility: opt.key
                            });
                            // Le onSnapshot s'occupera de mettre à jour le DOM !
                        } catch (err) {
                            console.error("Erreur mise à jour visibilité: ", err);
                            alert("Impossible de modifier la visibilité.");
                        }
                    } else {
                        // Fallback pour anciens posts non-firebase (si besoin, temporaire)
                        tag.className = `visibility-tag ${opt.cls}`;
                        tag.textContent = opt.label;
                        if (opt.key === 'medical') {
                            post.classList.add('medical-only-post');
                        } else {
                            post.classList.remove('medical-only-post');
                        }
                    }
                    popup.remove();
                });
                popup.appendChild(btn);
            });

            tag.style.position = 'relative';
            tag.appendChild(popup);

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

    /* --- FLUX ATTACHEMENTS (PHOTO RÉELLE) --- */
    if(fluxAttachBtn) {
        // Créer un input file caché
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        fluxAttachBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const imageDataUrl = ev.target.result;
                const role = roleSelect.value;
                const roleName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];
                const now = new Date();
                const timeStr = "À l'instant (" + now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ')';

                const fluxFeed = document.getElementById('flux-feed');
                const post = document.createElement('div');
                post.className = 'feed-post';
                post.innerHTML = `
                    <div class="post-header">
                        <div class="post-avatar">${roleName.charAt(0)}</div>
                        <div class="post-meta">
                            <h4>${roleName}</h4>
                            <p>${timeStr}</p>
                        </div>
                        <span class="visibility-tag tag-team">ÉQUIPE &amp; FAMILLE</span>
                    </div>
                    <img class="post-image" src="${imageDataUrl}" alt="Photo partagée">
                    <div class="post-actions">
                        <button class="reply-btn"><i class="fa-regular fa-comment"></i> Commenter</button>
                    </div>
                    <div class="post-comments"></div>
                `;
                bindPostActions(post);
                post.style.opacity = '0';
                fluxFeed.insertBefore(post, fluxFeed.firstChild);
                setTimeout(() => post.style.opacity = '1', 50);
                fileInput.value = ''; // reset
            };
            reader.readAsDataURL(file);
        });
    }

    if(fluxSendBtn) {
        fluxSendBtn.addEventListener('click', () => {
            const rawText = fluxMessageInput.value.trim();
            if(rawText !== '') {
                const isUrgent = fluxUrgentToggle.classList.contains('active');
                const urgencyPrefix = isUrgent ? '⚠️ URGENT: ' : '';
                // Trick to reuse standard feed function
                publishToFeed(urgencyPrefix + rawText);
                fluxMessageInput.value = '';
                
                // Reset urgent toggle
                fluxUrgentToggle.classList.remove('active');
                fluxUrgentToggle.style.backgroundColor = 'var(--silver-light)';
                fluxUrgentToggle.style.color = 'var(--text-muted)';
            }
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
                
                // Clear inputs
                emjInput.value = '';
                nameInput.value = '';
                
                // Update lists
                renderManageList();
                updateRoleUI(); 
            }
        });
    }

    /* --- NEW PAIN & VITALS LOGIC (FIREBASE) --- */

    const addVitalsBtn = document.getElementById('add-vitals-btn');
    if(addVitalsBtn) {
        addVitalsBtn.addEventListener('click', async () => {
            if(roleSelect.value === 'auxiliaire' || roleSelect.value === 'pro') {
                alert("Erreur de droits : Impossible d'ajouter des constantes.");
                return;
            }
            const heartRate = prompt("Saisir le rythme cardiaque (bpm) :");
            if(!heartRate) return;
            const bloodPress = prompt("Saisir la Tension Artérielle (ex: 120/80) :");
            if(!bloodPress) return;
            const temperature = prompt("Saisir la Température (°C, ex: 37.2) :");
            if(!temperature) return;

            const session = MonacoCare.getSession();
            const patientId = session?.patientId || 'patient-demo';
            const reporterName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];

            try {
                const batch = db.batch();
                
                // Tension
                batch.set(db.collection('medical_vitals').doc(), {
                    patientId, type: 'Tension Artérielle', value: bloodPress, unit: 'mmHg',
                    status: 'normal', createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                // Pouls
                batch.set(db.collection('medical_vitals').doc(), {
                    patientId, type: 'Rythme Cardiaque', value: heartRate, unit: 'bpm',
                    status: 'normal', createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                // Température
                const tempNum = parseFloat(temperature.replace(',', '.'));
                const tStatus = tempNum >= 38.0 ? 'alert' : (tempNum <= 36.0 ? 'alert' : 'normal');
                batch.set(db.collection('medical_vitals').doc(), {
                    patientId, type: 'Température', value: temperature.replace(',', '.'), unit: '°C',
                    status: tStatus, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                await batch.commit();

                // Ajouter automatiquement une note clinique de tracé
                if (typeof appendClinicalNote === 'function') {
                    appendClinicalNote(`Relevé de constantes : TA ${bloodPress} | Pouls ${heartRate} | Temp. ${temperature.replace(',','.')}°C.`);
                }
            } catch(e) {
                console.error("Erreur enregistrement constantes", e);
            }
        });
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
                const roleName = "Équipe Soignante"; // Simplification MVP

                try {
                    await db.collection('medical_pain').add({
                        patientId,
                        location: locInput,
                        level: scoreInput,
                        authorName: reporterName,
                        authorRole: roleName,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Cacher et reset
                    document.getElementById('pain-location-input').value = '';
                    document.getElementById('pain-score-input').value = '';
                    addPainModal.classList.add('hidden');
                    
                    // Auto append a clinical note (Optionnel, on peut le faire pour tracker)
                    if(typeof appendClinicalNote === 'function') {
                        appendClinicalNote(`Évaluation ajoutée : Douleur à l'emplacement "${locInput}" estimée à ${scoreInput}/10.`);
                    }
                } catch(e) {
                    console.error("Erreur évaluation douleur:", e);
                }
            }
        });
    }

    /* --- HISTORY MODAL LOGIC (Chart.js - Multi-Graphs) --- */
    const historyBtns = document.querySelectorAll('.history-btn');
    const historyModal = document.getElementById('history-modal');
    const closeHistoryBtn = document.getElementById('close-history-modal');
    const historyTitle = document.getElementById('history-modal-title');
    const histTabs = document.querySelectorAll('.hist-tab');
    let currentCharts = [];
    let currentMetric = "Échelle de Douleur";

    function renderCharts(metric, period) {
        const container = document.getElementById('charts-container');
        container.innerHTML = ''; 
        
        currentCharts.forEach(c => c.destroy());
        currentCharts = [];
        
        let labels = [];
        if(period === "24h") labels = ['10h', '14h', '18h', '22h', 'Mnt.'];
        if(period === "48h") labels = ['J-1 Matin', 'J-1 Soir', 'Matin', 'Midi', 'Mnt.'];
        if(period === "72h") labels = ['J-2', 'J-1', 'Hier', 'Matin', 'Mnt.'];
        
        if(metric === "Constantes Vitales" || metric === "Constantes Vitals") { // Fallbacks
            // 1. Heart Rate Canvas
            const hrWrapper = document.createElement('div');
            hrWrapper.style.cssText = "height: 150px; position: relative; width:100%; margin-bottom:15px;";
            hrWrapper.innerHTML = `<canvas id="hrChart"></canvas>`;
            container.appendChild(hrWrapper);
            
            // 2. Blood Pressure Canvas
            const bpWrapper = document.createElement('div');
            bpWrapper.style.cssText = "height: 150px; position: relative; width:100%;";
            bpWrapper.innerHTML = `<canvas id="bpChart"></canvas>`;
            container.appendChild(bpWrapper);
            
            // Mock data for HR
            let hrData = [72, 88, 75, 110, 82];
            if(period === "48h") hrData = [70, 75, 80, 105, 82];
            if(period === "72h") hrData = [68, 72, 75, 85, 82];
            
            const hrChart = new Chart(document.getElementById('hrChart'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Fréquence Cardiaque (bpm)',
                        data: hrData,
                        borderColor: '#CE1126',
                        backgroundColor: 'rgba(206,17,38,0.1)',
                        borderWidth: 2, tension: 0.3, fill: true, pointRadius: 3
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { x: { ticks:{font:{size:9}} }, y: { min: 50, max: 130, ticks:{font:{size:9}} } },
                    plugins: { legend: { display: true, position: 'top', labels:{boxWidth:10, font:{size:10}} }, tooltip: { enabled: true } }
                }
            });
            
            // Mock data for BP
            let sysData = [110, 125, 115, 140, 120];
            let diaData = [70, 85, 75, 95, 80];
            if(period === "48h") { sysData = [115, 120, 130, 135, 120]; diaData = [75, 80, 85, 90, 80]; }
            if(period === "72h") { sysData = [118, 122, 125, 120, 120]; diaData = [78, 82, 80, 78, 80]; }
            
            const bpChart = new Chart(document.getElementById('bpChart'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Systolique',
                            data: sysData,
                            borderColor: '#3B82F6',
                            backgroundColor: 'transparent',
                            borderWidth: 2, tension: 0.3, pointRadius: 3
                        },
                        {
                            label: 'Diastolique',
                            data: diaData,
                            borderColor: '#10B981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2, tension: 0.3, fill: '-1', pointRadius: 3
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { x: { ticks:{font:{size:9}} }, y: { min: 50, max: 160, ticks:{font:{size:9}} } },
                    plugins: { legend: { display: true, position: 'top', labels:{boxWidth:10, font:{size:10}} }, tooltip: { mode: 'index', intersect: false } }
                }
            });
            
            currentCharts.push(hrChart, bpChart);
            
        } else {
            // Douleur : Dynamic based on DOM
            const painWrapper = document.createElement('div');
            painWrapper.style.cssText = "height: 240px; position: relative; width:100%;";
            painWrapper.innerHTML = `<canvas id="painChart"></canvas>`;
            container.appendChild(painWrapper);
            
            const painCards = document.querySelectorAll('.pain-card');
            const datasets = [];
            const colors = ['#CE1126', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'];
            
            painCards.forEach((card, i) => {
                const title = card.querySelector('.pain-header span:first-child').innerText;
                const scoreText = card.querySelector('.pain-score').innerText;
                const currentScore = parseInt(scoreText.split('/')[0]) || 5;
                
                const dataPoints = [];
                let val = currentScore;
                for(let j=0; j<4; j++) {
                    let r = val + (Math.floor(Math.random()*5)-2);
                    if(r < 0) r = 0;
                    if(r > 10) r = 10;
                    dataPoints.unshift(r); 
                    val = r;
                }
                dataPoints.push(currentScore);
                
                datasets.push({
                    label: title,
                    data: dataPoints,
                    borderColor: colors[i % colors.length],
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 4
                });
            });
            
            const painChart = new Chart(document.getElementById('painChart'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { x: { ticks:{font:{size:9}} }, y: { min: 0, max: 10, ticks:{font:{size:9}} } },
                    plugins: { legend: { display: true, position: 'bottom', labels:{boxWidth:10, font:{size:10}} }, tooltip: { mode: 'index', intersect: false } }
                }
            });
            
            currentCharts.push(painChart);
        }
    }

    historyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if(roleSelect.value === 'auxiliaire' || roleSelect.value === 'pro') {
                alert("Accès refusé. Historique réservé au corps médical et à la famille.");
            } else {
                currentMetric = btn.getAttribute('data-metric');
                // Nettoyer text metrics if necessary
                if(currentMetric === "Constantes Vitales" || currentMetric === "Échelle de Douleur") {
                    // C'est bon
                }
                if(historyTitle) historyTitle.innerText = "Historique: " + currentMetric;
                
                histTabs.forEach(t => t.classList.remove('active'));
                histTabs[0].classList.add('active');
                
                historyModal.classList.remove('hidden');
                
                setTimeout(() => {
                    renderCharts(currentMetric, "24h");
                }, 50);
            }
        });
    });

    if(closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => {
            historyModal.classList.add('hidden');
            currentCharts.forEach(c => c.destroy());
            currentCharts = [];
        });
    }

    histTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            histTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderCharts(currentMetric, tab.innerText);
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
                const filterType = e.target.getAttribute('data-filter');
                const filterText = e.target.innerText;
                
                // Update button text
                currentFilterName.innerText = filterText;
                fluxFilterMenu.classList.add('hidden');
                
                // Bold active option
                filterOptions.forEach(opt => opt.style.fontWeight = 'normal');
                e.target.style.fontWeight = 'bold';

                // Apply filter
                const posts = document.querySelectorAll('.feed-post');
                posts.forEach(post => {
                    // Check tags to determine category
                    let tagMedical = post.querySelector('.tag-medical');
                    let tagTeam = post.querySelector('.tag-team');
                    let tagPublic = post.querySelector('.tag-public');

                    if (filterType === 'all') {
                        post.style.display = 'flex'; // Restore based on default display
                    } else if (filterType === 'medical') {
                        post.style.display = tagMedical ? 'flex' : 'none';
                    } else if (filterType === 'team') {
                        post.style.display = tagTeam ? 'flex' : 'none';
                    } else if (filterType === 'public') {
                        post.style.display = tagPublic ? 'flex' : 'none';
                    }
                });

                // Enforce role constraints (e.g. assistants shouldn't see medical posts even if they filtered logic tried to)
                updateRoleUI();
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
                patients = [{id: 'patient-demo', name: 'Robert Dubois'}, {id: 'PAT-002', name: 'Jeanne Dubois'}];
            } else {
                patients = [{id: 'patient-demo', name: 'Robert Dubois'}, {id: 'PAT-003', name: 'Alice Martin'}];
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
