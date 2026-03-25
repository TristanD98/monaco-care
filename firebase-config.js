/**
 * MONACO CARE — firebase-config.js
 * Mode DÉMO (localStorage) — prêt à l'emploi sans backend.
 * Guide de migration Firebase en bas de fichier.
 *
 * SCHÉMA FIRESTORE:
 *   demo_codes/   { code, active, patientId, label, expiresAt, createdAt }
 *   professionals/ { proId, name, specialty, email, pin, status, lastLogin, expiresAt }
 *   patients/     { patientId, name, age, assignedPros[], assignedFamilyCodes[] }
 *   pending_registrations/ { name, specialty, email, status, createdAt }
 */

const MonacoCare = (() => {

    const DEMO_DEFAULTS = {
        demo_codes: {
            'DEMO-2026': { active: true, patientId: 'patient-demo', label: 'Famille de démonstration',
                expiresAt: new Date(Date.now() + 90 * 864e5).toISOString() },
            'TEST-FAMI': { active: true, patientId: 'patient-demo', label: 'Code test famille #2',
                expiresAt: new Date(Date.now() + 30 * 864e5).toISOString() }
        },
        professionals: {
            'PRO-001': { firstName: 'Sarah', lastName: 'Martin', name: 'Dr. Sarah Martin',
                specialty: 'medecin', professionLabel: 'Médecin généraliste — Spécialiste en gériatrie', email: 'sarah@monacocare.mc',
                pin: 'CARE2026', status: 'active', createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 365 * 864e5).toISOString() },
            'PRO-002': { firstName: 'Marc', lastName: 'Dupont', name: 'Marc Dupont',
                specialty: 'kine', professionLabel: 'Kinésithérapeute — Rééducation fonctionnelle', email: 'marc@monacocare.mc',
                pin: 'KINE2026', status: 'active', createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 365 * 864e5).toISOString() },
            'PRO-003': { firstName: 'Sophie', lastName: 'Bernard', name: 'Sophie Bernard',
                specialty: 'auxiliaire', professionLabel: 'Auxiliaire de vie — Aide à domicile spécialisée', email: 'sophie@monacocare.mc',
                pin: 'AUXIL26', status: 'active', createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 365 * 864e5).toISOString() }
        },
        patients: {
            'patient-demo': { name: 'Jean-Pierre DUBOIS', patientId: 'PAT-001', firstName: 'Jean-Pierre',
                lastName: 'DUBOIS', dateOfBirth: '1947-03-12', address: '12 Avenue de la Costa, Monaco',
                age: 78, photoUrl: 'https://i.pravatar.cc/150?u=jeanpierre',
                assignedPros: ['PRO-001','PRO-002','PRO-003'],
                assignedFamilyCodes: ['DEMO-2026','TEST-FAMI'],
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 365 * 864e5).toISOString() }
        },
        pending_registrations: {}
    };

    function _init() {
        if (!localStorage.getItem('mc_demo_codes'))
            localStorage.setItem('mc_demo_codes', JSON.stringify(DEMO_DEFAULTS.demo_codes));
        if (!localStorage.getItem('mc_professionals'))
            localStorage.setItem('mc_professionals', JSON.stringify(DEMO_DEFAULTS.professionals));
        if (!localStorage.getItem('mc_patients'))
            localStorage.setItem('mc_patients', JSON.stringify(DEMO_DEFAULTS.patients));
        if (!localStorage.getItem('mc_pending_registrations'))
            localStorage.setItem('mc_pending_registrations', JSON.stringify(DEMO_DEFAULTS.pending_registrations));
    }

    function _get(key)      { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch(e) { return {}; } }
    function _set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
    function _sleep(ms)     { return new Promise(r => setTimeout(r, ms)); }
    function _genPin()      {
        const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        return Array.from({length:8}, () => c[Math.floor(Math.random()*c.length)]).join('');
    }

    // ── SESSION ────────────────────────────────────────────────
    function setSession(data) {
        const s = { ...data, loginAt: new Date().toISOString() };
        (data.remember ? localStorage : sessionStorage).setItem('mc_session', JSON.stringify(s));
    }

    function getSession() {
        try {
            const ls = localStorage.getItem('mc_session');
            const ss = sessionStorage.getItem('mc_session');
            return ls ? JSON.parse(ls) : ss ? JSON.parse(ss) : null;
        } catch(e) { return null; }
    }

    function clearSession() {
        localStorage.removeItem('mc_session');
        sessionStorage.removeItem('mc_session');
    }

    function requireAuth() {
        const s = getSession();
        if (!s) { window.location.href = 'login.html'; return null; }
        return s;
    }

    // ── VALIDATION CODE DÉMO ───────────────────────────────────
    async function validateDemoCode(code) {
        await _sleep(600);
        const codes = _get('mc_demo_codes');
        const entry = codes[code];
        if (!entry)          return { valid: false, message: 'Code introuvable. Vérifiez votre code.' };
        if (!entry.active)   return { valid: false, message: 'Ce code a été désactivé.' };
        if (entry.expiresAt && new Date(entry.expiresAt) < new Date())
                             return { valid: false, message: 'Ce code a expiré.' };
        return { valid: true, patientId: entry.patientId, label: entry.label, expiresAt: entry.expiresAt };
    }

    // ── CONNEXION PRO ──────────────────────────────────────────
    async function loginProfessional(proId, pin, remember) {
        await _sleep(700);
        const pros = _get('mc_professionals');
        const pro  = pros[proId];
        if (!pro)
            return { success: false, message: 'Identifiant introuvable.' };
        if (pro.status === 'pending')
            return { success: false, message: 'Votre compte est en attente de validation.' };
        if (pro.status === 'suspended')
            return { success: false, message: 'Votre compte a été suspendu.' };
        if (pro.pin !== pin)
            return { success: false, message: 'Code d\'accès incorrect.' };
        pros[proId].lastLogin = new Date().toISOString();
        _set('mc_professionals', pros);
        return { success: true, displayName: pro.name, specialty: pro.specialty, email: pro.email };
    }

    // ── INSCRIPTION PRO ───────────────────────────────────────────────
    async function registerProfessional({ firstName, lastName, professionLabel, email }) {
        await _sleep(800);
        const pending = _get('mc_pending_registrations');
        if (Object.values(pending).find(p => p.email === email && p.status === 'pending'))
            return { success: false, message: 'Une demande avec cet e-mail est déjà en attente.' };
        const id = 'REG-' + Date.now();
        const name = (firstName + ' ' + lastName).trim();
        pending[id] = { id, firstName, lastName, name, professionLabel, email, status: 'pending', createdAt: new Date().toISOString() };
        _set('mc_pending_registrations', pending);
        return { success: true, registrationId: id };
    }

    // ── ADMIN ──────────────────────────────────────────────────
    const admin = {
        generateDemoCode(options = {}) {
            const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            const p1 = Array.from({length:4}, ()=>c[Math.floor(Math.random()*c.length)]).join('');
            const p2 = Array.from({length:4}, ()=>c[Math.floor(Math.random()*c.length)]).join('');
            const code = `${p1}-${p2}`;
            const codes = _get('mc_demo_codes');
            const days  = options.days || 30;
            codes[code] = {
                active: true,
                patientId: options.patientId || 'patient-demo',
                label: options.label || 'Nouveau code',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + days * 864e5).toISOString()
            };
            _set('mc_demo_codes', codes);
            return code;
        },
        toggleDemoCode(code) {
            const codes = _get('mc_demo_codes');
            if (codes[code]) { codes[code].active = !codes[code].active; _set('mc_demo_codes', codes); return codes[code].active; }
        },
        deleteDemoCode(code) {
            const codes = _get('mc_demo_codes'); delete codes[code]; _set('mc_demo_codes', codes);
        },
        approveProfessional(regId) {
            const pending = _get('mc_pending_registrations');
            const reg = pending[regId];
            if (!reg) return null;
            const pros  = _get('mc_professionals');
            const count = Object.keys(pros).length + 1;
            const proId = 'PRO-' + String(count).padStart(3,'0');
            const pin   = _genPin();
            const name  = reg.name || ((reg.firstName||'') + ' ' + (reg.lastName||'')).trim();
            pros[proId] = { firstName: reg.firstName||'', lastName: reg.lastName||'', name,
                specialty: reg.specialty || 'autre',
                professionLabel: reg.professionLabel || reg.specialty || '',
                email: reg.email, pin,
                status: 'active', createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 365 * 864e5).toISOString() };
            _set('mc_professionals', pros);
            pending[regId].status = 'approved';
            pending[regId].approvedProId = proId;
            _set('mc_pending_registrations', pending);
            return { proId, pin, name, email: reg.email };
        },
        toggleProfessional(proId) {
            const pros = _get('mc_professionals');
            if (pros[proId]) {
                pros[proId].status = pros[proId].status === 'active' ? 'suspended' : 'active';
                _set('mc_professionals', pros);
                return pros[proId].status;
            }
        },
        resetPin(proId) {
            const pros = _get('mc_professionals');
            if (pros[proId]) { const p = _genPin(); pros[proId].pin = p; _set('mc_professionals', pros); return p; }
        },
        getAllCodes()             { return _get('mc_demo_codes'); },
        getAllProfessionals()     { return _get('mc_professionals'); },
        getAllPatients()          { return _get('mc_patients'); },
        getPendingRegistrations(){ const a = _get('mc_pending_registrations'); return Object.fromEntries(Object.entries(a).filter(([,v])=>v.status==='pending')); },

        // Créer un patient (par famille ou admin)
        createPatient({ firstName, lastName, dateOfBirth, address, photoUrl }) {
            const patients  = _get('mc_patients');
            const count     = Object.keys(patients).length + 1;
            const patientId = 'PAT-' + String(count).padStart(3,'0');
            const name      = (firstName + ' ' + lastName).trim();
            const age       = dateOfBirth ? Math.floor((Date.now() - new Date(dateOfBirth)) / (365.25*864e5)) : null;
            patients[patientId] = { patientId, firstName, lastName, name, dateOfBirth: dateOfBirth||'', address: address||'',
                age, photoUrl: photoUrl||'', assignedPros: [], assignedFamilyCodes: [],
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 365 * 864e5).toISOString() };
            _set('mc_patients', patients);
            return { patientId, name };
        },

        // Rechercher un professionnel par ID pour la famille
        findProfessional(proId) {
            const pros = _get('mc_professionals');
            const pro  = pros[proId];
            if (!pro || pro.status !== 'active') return null;
            return { proId, name: pro.name, professionLabel: pro.professionLabel || pro.specialty, specialty: pro.specialty };
        },

        // Rechercher un patient par son ID (pour un pro)
        findPatient(patientId) {
            const patients = _get('mc_patients');
            return patients[patientId] || null;
        },

        // Assigner un pro à un patient
        assignProToPatient(patientId, proId) {
            const patients = _get('mc_patients');
            if (patients[patientId] && !patients[patientId].assignedPros.includes(proId)) {
                patients[patientId].assignedPros.push(proId);
                _set('mc_patients', patients);
                return true;
            }
            return false;
        }
    };

    _init();
    return { validateDemoCode, loginProfessional, registerProfessional, setSession, getSession, clearSession, requireAuth, admin };

})();

/*
 * ────────────────────────────────────────────────────────────
 * MIGRATION VERS FIREBASE (quand vous êtes prêts)
 * ────────────────────────────────────────────────────────────
 * 1. Créez un projet sur https://console.firebase.google.com
 * 2. Activez Firestore Database et Authentication
 * 3. Copiez les clés de votre projet ici :
 *
 * const firebaseConfig = {
 *   apiKey:            "VOTRE_API_KEY",
 *   authDomain:        "votre-projet.firebaseapp.com",
 *   projectId:         "votre-projet",
 *   storageBucket:     "votre-projet.appspot.com",
 *   messagingSenderId: "VOTRE_SENDER_ID",
 *   appId:             "VOTRE_APP_ID"
 * };
 *
 * 4. Importez les SDK Firebase et remplacez les fonctions
 *    _get() / _set() par getDoc() / setDoc() de Firestore.
 * ────────────────────────────────────────────────────────────
 */
