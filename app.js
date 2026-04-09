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
    };

    roleSelect.addEventListener('change', updateRoleUI);
    updateRoleUI(); // Initialize on load


    /* --- BIOMETRIC + CODE EXTERNE --- */
    simulateBioBtn.addEventListener('click', () => {
        simulateBioBtn.textContent = "🗓️ Scan en cours...";
        simulateBioBtn.disabled = true;
        setTimeout(() => {
            bioOverlay.classList.add('hidden');
            vaultContent.classList.remove('hidden');
            vaultUnlocked = true;
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
                // Accès allégé : cacher les notes cliniques
                const clinSection = vaultContent.querySelector('#clinical-notes-container')?.closest('.vault-section');
                if (clinSection) clinSection.style.display = 'none';
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
        }
    }


    /* --- CHAT : contacts mockés ---
     * En mode session réelle, ces contacts seront remplacés par
     * les vrais membres de l'équipe du patient depuis Firestore (Sprint 3).
     */
    const MOCK_TEAM = [
        { name: 'Marc Dupont', role: 'Kinésithérapeute', initial: 'M', color: '#7B1535', lastMsg: 'Séance terminée, bonne mobilité.' },
        { name: 'Dr. Sarah Chen', role: 'Médecin traitant', initial: 'S', color: '#436653', lastMsg: 'ECG normal, continuer le protocole.' },
        { name: 'Sophie Martin', role: 'Auxiliaire de vie', initial: 'S', color: '#3B82F6', lastMsg: 'Repas pris, humeur stable.' },
        { name: 'Emma Dubois', role: 'Famille — Fille', initial: 'E', color: '#8B5CF6', lastMsg: 'Merci pour vos retours.' },
    ];

    function renderChatList() {
        const container = document.getElementById('chat-list-container');
        const emptyState = document.getElementById('chat-empty-state');
        const session = MonacoCare.getSession ? MonacoCare.getSession() : null;

        // En session réelle, on filtrera par l'équipe du patient. En démo : mock.
        const contacts = MOCK_TEAM;

        if (!contacts || contacts.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Nettoyer et reconstruire
        container.innerHTML = '';
        contacts.forEach(contact => {
            const item = document.createElement('div');
            item.className = 'chat-item';
            item.dataset.name = contact.name;
            item.dataset.role = contact.role;
            item.innerHTML = `
                <div class="chat-avatar" style="background:${contact.color}; color:white; font-weight:800; font-size:16px;">${contact.initial}</div>
                <div class="chat-content">
                    <div class="chat-title-row">
                        <h4>${contact.name}</h4>
                    </div>
                    <p>${contact.role}</p>
                    <p style="margin-top:3px; font-size:11px; color:var(--on-surface-variant); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${contact.lastMsg}</p>
                </div>
            `;
            item.addEventListener('click', () => openChatRoom(contact));
            container.appendChild(item);
        });

        // Rebrancher "Nouveau message"
        const newMsgBtn = document.getElementById('chat-new-msg-btn');
        if (newMsgBtn) newMsgBtn.addEventListener('click', () => openNewChatModal());
    }

    function openChatRoom(contact) {
        chatListView.classList.remove('active');
        chatRoomView.classList.add('active');
        document.getElementById('current-chat-title').innerText = contact.name;
        document.getElementById('current-chat-subtitle').innerText = contact.role;
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = `
            <div class="message received">
                <div class="sender-info">${contact.name} — Hier</div>
                <div class="bubble">${contact.lastMsg}</div>
            </div>
        `;
    }

    function openNewChatModal() {
        const modal = document.getElementById('new-chat-modal');
        if (modal) modal.classList.remove('hidden');
    }

    // Initialiser la liste chat
    renderChatList();

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
        sendBtn.addEventListener('click', () => {
            const text = messageInput.value.trim();
            if (text !== '') {
                const chatMessages = document.getElementById('chat-messages');
                const msg = document.createElement('div');
                msg.className = 'message sent';
                msg.innerHTML = `<div class="sender-info">Vous — À l'instant</div><div class="bubble">${text}</div>`;
                chatMessages.appendChild(msg);
                messageInput.value = '';
                chatMessages.scrollTop = chatMessages.scrollHeight;
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

    function publishToFeed(actionText, imageUrl) {
        const fluxFeed = document.getElementById('flux-feed');
        const role = roleSelect.value;
        const roleName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];
        const titleJob = roleSelect.options[roleSelect.selectedIndex].text;

        const isUrgent = actionText.startsWith('⚠️ URGENT');
        const isMedical = role === 'medecin' || actionText.toLowerCase().includes('prescription') || actionText.toLowerCase().includes('médical');
        const tagClass = isUrgent ? 'tag-urgent' : isMedical ? 'tag-medical' : 'tag-team';
        const tagName  = isUrgent ? '⚠️ URGENT' : isMedical ? 'MÉDICAL' : 'MÉDICAL & FAMILLE';

        const now = new Date();
        const timeStr = "À l'instant (" + now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ')';

        const imageHTML = imageUrl ? `<img class="post-image" src="${imageUrl}" alt="Photo">` : '';

        const isMedPost = isMedical ? ' medical-only-post' : '';
        const post = document.createElement('div');
        post.className = 'feed-post' + isMedPost;
        post.innerHTML = `
            <div class="post-header">
                <div class="post-avatar">${roleName.charAt(0)}</div>
                <div class="post-meta">
                    <h4>${titleJob}</h4>
                    <p>${timeStr}</p>
                </div>
                <span class="visibility-tag ${tagClass}" title="Cliquer pour changer la visibilité">${tagName}</span>
            </div>
            ${imageHTML}
            <div class="post-content"><p>${actionText}</p></div>
            <div class="post-comments"></div>
            <div class="post-actions">
                <button class="reply-btn"><i class="fa-regular fa-comment"></i> Commenter</button>
            </div>
        `;
        bindPostActions(post);
        bindVisibilityTag(post);

        post.style.opacity = '0';
        fluxFeed.insertBefore(post, fluxFeed.firstChild);
        setTimeout(() => post.style.opacity = '1', 50);

        // Retirer le message "vide"
        const emptyMsg = fluxFeed.querySelector('.empty-msg, [style*="text-align:center"]');
        if (emptyMsg) emptyMsg.remove();
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
                btn.addEventListener('click', () => {
                    // Retirer toutes les classes tag-*
                    tag.className = `visibility-tag ${opt.cls}`;
                    tag.textContent = opt.label;
                    popup.remove();
                    // Mettre à jour la classe medical-only-post si besoin
                    if (opt.key === 'medical') {
                        post.classList.add('medical-only-post');
                    } else {
                        post.classList.remove('medical-only-post');
                    }
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

    /* --- NEW PAIN & VITALS LOGIC --- */

    const addVitalsBtn = document.getElementById('add-vitals-btn');
    if(addVitalsBtn) {
        addVitalsBtn.addEventListener('click', () => {
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

            // Sauvegarde dans Firebase
            const session = MonacoCare.getSession();
            const patientId = session?.patientId || 'patient-demo';
            const reporterName = session?.displayName || session?.proId || "Utilisateur Démo";
            const roleName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0];

            if (MonacoCare.admin && MonacoCare.admin.addVital) {
                MonacoCare.admin.addVital(patientId, {
                    heartRate, bloodPress, temperature, reporterName, reporterRole: roleName
                });
            }

            const tempNum = parseFloat(temperature.replace(',', '.'));
            const tempStatus = tempNum >= 38.0 ? 'red' :
                               tempNum <= 36.0 ? 'silver' : 'stable';
            const tempAlert  = tempNum >= 38.5 ? ' ⚠ Fièvre' :
                               tempNum >= 38.0 ? ' Subfébrile' :
                               tempNum <= 36.0 ? ' Hypothermie' : ' Normal';

            const grid = document.querySelector('.vitals-grid');
            const now = new Date();
            const ts = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

            grid.innerHTML = `
                <div class="vital-card red">
                    <div class="vital-icon"><i class="fa-solid fa-heart-pulse"></i> Tension Art.</div>
                    <div class="vital-value" style="margin:5px 0;">${bloodPress}<span>mmHg</span></div>
                    <div class="vital-graph"><i class="fa-solid fa-chart-line"></i> (Mise à jour)</div>
                    <div class="vital-time"><i class="fa-regular fa-clock"></i> Pris à ${ts}</div>
                </div>
                <div class="vital-card silver">
                    <div class="vital-icon"><i class="fa-solid fa-heart-pulse"></i> Rythme Cardiaque</div>
                    <div class="vital-value" style="margin:5px 0;">${heartRate}<span>bpm</span></div>
                    <div class="vital-graph stable">Nouveau relevé</div>
                    <div class="vital-time"><i class="fa-regular fa-clock"></i> Pris à ${ts}</div>
                </div>
                <div class="vital-card" style="background:linear-gradient(135deg,rgba(251,146,60,0.15),rgba(249,115,22,0.08)); border:1px solid rgba(251,146,60,0.3);">
                    <div class="vital-icon"><i class="fa-solid fa-temperature-half" style="color:#F97316;"></i> Température</div>
                    <div class="vital-value" style="margin:5px 0; color:#F97316;">${temperature.replace(',','.')}<span>°C</span></div>
                    <div class="vital-graph ${tempStatus}" style="color:${tempNum>=38.0?'#EF4444':tempNum<=36.0?'#3B82F6':'#10B981'};">${tempAlert}</div>
                    <div class="vital-time"><i class="fa-regular fa-clock"></i> Pris à ${ts}</div>
                </div>
            `;
            if(typeof appendClinicalNote === 'function')
                appendClinicalNote(`Constantes : TA ${bloodPress} mmHg, Pouls ${heartRate} bpm, Temp. ${temperature}°C${tempAlert}.`);
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
        savePainBtn.addEventListener('click', () => {
            const locInput = document.getElementById('pain-location-input').value.trim();
            let scoreInput = parseInt(document.getElementById('pain-score-input').value);
            
            if(locInput && !isNaN(scoreInput)) {
                if(scoreInput < 0) scoreInput = 0;
                if(scoreInput > 10) scoreInput = 10;
                
                const trackersContainer = document.querySelector('.pain-trackers');
                const bgColor = scoreInput > 5 ? 'var(--monaco-red)' : '#F59E0B';
                
                const newPainCard = document.createElement('div');
                newPainCard.className = 'pain-card';
                newPainCard.innerHTML = `
                    <div class="pain-header">
                        <span>${locInput}</span>
                        <span class="pain-score" style="color:${bgColor}">${scoreInput}/10</span>
                    </div>
                    <div class="pain-bar" style="background-color: var(--silver-dark); height: 6px; border-radius: 3px; overflow:hidden;">
                        <div style="width: ${scoreInput}0%; height: 100%; background-color: ${bgColor};"></div>
                    </div>
                    <div class="pain-time"><i class="fa-regular fa-clock"></i> À l'instant</div>
                `;
                
                trackersContainer.appendChild(newPainCard);
                
                // Close and reset
                document.getElementById('pain-location-input').value = '';
                document.getElementById('pain-score-input').value = '';
                addPainModal.classList.add('hidden');
                
                // Auto append a clinical note
                appendClinicalNote(`Évaluation ajoutée : Douleur à l'emplacement "${locInput}" estimée à ${scoreInput}/10.`);
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

    function appendClinicalNote(text) {
        const roleName = roleSelect.options[roleSelect.selectedIndex].text.split(' (')[0]; 
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        
        const newNote = document.createElement('div');
        newNote.className = 'clinical-note';
        newNote.style.borderLeftColor = 'var(--tag-public)'; // Different color for new notes
        newNote.innerHTML = `
            <strong>Aujourd'hui, ${timeStr} - ${roleName}</strong>
            <p>${text}</p>
        `;
        
        // prepend it
        clinicalNotesContainer.insertBefore(newNote, clinicalNotesContainer.firstChild);
    }

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

    // Paramètres (ouvre le modal existant)
    const ddSettings = document.getElementById('dd-settings');
    if (ddSettings && settingsModal) {
        ddSettings.addEventListener('click', () => {
            headerDropdown.classList.add('hidden');
            const role = roleSelect.value;
            const secPatient = document.getElementById('settings-add-patient-section');
            const secPro     = document.getElementById('settings-add-pro-section');
            const secSub     = document.getElementById('settings-sub-section');
            const secInv     = document.getElementById('settings-invitations-section');
            const invList    = document.getElementById('pending-invitations-list');
            if (role === 'family') {
                if(secPatient) secPatient.style.display = 'block';
                if(secPro)     secPro.style.display = 'block';
                if(secSub)     secSub.style.display = 'block';
                if(secInv)     secInv.style.display = 'block';
                if(invList)    invList.innerHTML = '<p style="font-size:11px;color:var(--text-muted);">Aucune demande en attente.</p>';
            } else {
                if(secPatient) secPatient.style.display = 'block';
                if(secPro)     secPro.style.display = 'none';
                if(secSub)     secSub.style.display = 'none';
                if(secInv)     secInv.style.display = 'block';
                if(invList)    invList.innerHTML = '<p style="font-size:11px;color:var(--text-muted);">Aucune invitation en attente.</p>';
            }
            settingsModal.classList.remove('hidden');
        });
    }
    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', () => settingsModal.classList.add('hidden'));
    }

    // Déconnexion
    const ddLogout = document.getElementById('dd-logout');
    if (ddLogout) {
        ddLogout.addEventListener('click', () => {
            MonacoCare.clearSession();
            window.location.href = 'login.html';
        });
    }

    // Add Patient/Beneficiary Logic
    const addPatientBtn = document.getElementById('add-patient-btn');
    const newPatientName = document.getElementById('new-patient-name');
    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', () => {
            if(newPatientName.value.trim() !== "") {
                alert(`Le dossier pour le bénéficiaire "${newPatientName.value}" a été créé avec succès. Vous pouvez maintenant y ajouter des professionnels médicaux.`);
                newPatientName.value = '';
                document.getElementById('new-patient-id').value = '';
            } else {
                alert("Veuillez saisir le nom complet du bénéficiaire.");
            }
        });
    }

    // Add Pro via ID Logic
    const addProBtn = document.getElementById('add-pro-btn');
    const proUniqueId = document.getElementById('pro-unique-id');
    if (addProBtn) {
        addProBtn.addEventListener('click', () => {
            if(proUniqueId.value.trim() !== "") {
                alert(`Le professionnel lié à l'identifiant ${proUniqueId.value} a été rattaché à ce dossier de soins. Il pourra y accéder lors de sa prochaine connexion.`);
                proUniqueId.value = '';
            } else {
                alert("Veuillez saisir l'identifiant unique du professionnel.");
            }
        });
    }

    // Subscription Payment Logic
    const paySubBtn = document.getElementById('pay-sub-btn');
    if (paySubBtn) {
        paySubBtn.addEventListener('click', () => {
            alert("Redirection vers la passerelle de paiement (Stripe) pour gérer la carte bancaire et choisir votre formule d'abonnement...");
        });
    }

});
