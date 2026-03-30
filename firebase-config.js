/**
 * MONACO CARE — firebase-config.js (REAL FIREBASE INTEGRATION)
 * Firestore Database + Firebase Authentication
 */

const firebaseConfig = {
    apiKey: "AIzaSyCZ9ByMIJ6RsEhCmLdwZbjjcwlBs4kGCpM",
    authDomain: "monaco-care.firebaseapp.com",
    projectId: "monaco-care",
    storageBucket: "monaco-care.firebasestorage.app",
    messagingSenderId: "894387998966",
    appId: "1:894387998966:web:7d3d6bf9d82ab74530dcd7",
    measurementId: "G-4C1SPS82L5"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

const MonacoCare = (() => {

    function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    function _genPin() {
        const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        return Array.from({length:8}, () => c[Math.floor(Math.random()*c.length)]).join('');
    }

    // ── SESSION (Compatibilité avec la UI) ─────────────
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
        auth.signOut();
    }
    function requireAuth() {
        const s = getSession();
        if (!s) { window.location.href = 'login.html'; return null; }
        return s;
    }

    // ── VALIDATION CODE DÉMO (FAMILLE) ─────────────────
    async function validateDemoCode(code) {
        try {
            const docRef = db.collection('demo_codes').doc(code);
            const docSnap = await docRef.get();
            if (!docSnap.exists) return { valid: false, message: 'Code introuvable. Vérifiez votre saisie.' };
            
            const entry = docSnap.data();
            if (!entry.active) return { valid: false, message: 'Ce code a été désactivé.' };
            if (entry.expiresAt && new Date(entry.expiresAt) < new Date())
                return { valid: false, message: 'Ce code a expiré.' };
                
            return { valid: true, patientId: entry.patientId, label: entry.label, expiresAt: entry.expiresAt };
        } catch(error) {
            console.error("Firebase Auth Error: ", error);
            // Fallback gracefully (if permissions restrict)
            return { valid: false, message: 'Erreur réseau avec la base de données.' };
        }
    }

    // ── CONNEXION PRO ──────────────────────────────────
    async function loginProfessional(proId, pin, remember) {
        try {
            // Astuce Sécurité : On se base sur le format PRO-XXX@monacocare.mc pour Firebase Auth
            const email = `${proId.toLowerCase().trim()}@monacocare.mc`;
            await auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
            
            await auth.signInWithEmailAndPassword(email, pin);
            
            // Vérifier le statut du professionnel dans Firestore
            const docRef = db.collection('professionals').doc(proId.toUpperCase().trim());
            const docSnap = await docRef.get();
            if(!docSnap.exists) {
                return { success: true, displayName: proId, specialty: 'Professionnel', email: email };
            }
            
            const proData = docSnap.data();
            if (proData.status === 'pending') {
                await auth.signOut();
                return { success: false, message: 'Votre compte est en attente de validation par l\'administrateur.' };
            }
            if (proData.status === 'suspended') {
                await auth.signOut();
                return { success: false, message: 'Votre compte a été suspendu.' };
            }

            // Met à jour la dernière connexion
            await docRef.update({ lastLogin: firebase.firestore.FieldValue.serverTimestamp() });

            return { success: true, displayName: proData.name, specialty: proData.specialty, email: proData.email };
        } catch(error) {
            console.error("Login error", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                 return { success: false, message: 'Identifiant (Ex: PRO-001) ou code d\'accès incorrect.' };
            }
            return { success: false, message: "Erreur de connexion sécurisée." };
        }
    }

    // ── INSCRIPTION PRO ─────────────────────────────────
    async function registerProfessional({ firstName, lastName, professionLabel, email }) {
        try {
            const querySnapshot = await db.collection('pending_registrations')
                .where('email', '==', email).where('status', '==', 'pending').get();
            
            if (!querySnapshot.empty) {
                return { success: false, message: 'Une demande avec cet e-mail est déjà en attente.' };
            }
            
            const id = 'REG-' + Date.now();
            const name = (firstName + ' ' + lastName).trim();
            await db.collection('pending_registrations').doc(id).set({
                id, firstName, lastName, name, professionLabel, email, status: 'pending', 
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, registrationId: id };
        } catch(e) {
            return { success: false, message: "Erreur lors de l'envoi de la demande. " + e.message };
        }
    }

    // ── DEMANDE D'ACCÈS FAMILLE ─────────────────────────
    async function requestFamilyAccess({ firstname, lastname, relation, phone, patientName, patientAddress }) {
        try {
            const id = 'REQ-FAM-' + Date.now();
            await db.collection('pending_family_requests').doc(id).set({
                id, firstname, lastname, relation, phone, patientName, patientAddress, status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true };
        } catch(e) {
            return { success: false, message: "Erreur lors de l'envoi de la demande. " + e.message };
        }
    }

    // ── ACCOMPAGNANT ────────────────────────────────────
    async function loginHelper(helperId, pin, remember) {
        return await loginProfessional(helperId, pin, remember);
    }

    async function registerHelper({ firstName, lastName, profession, phone }) {
        try {
            const id = 'REG-ACC-' + Date.now();
            const name = (firstName + ' ' + lastName).trim();
            const email = `helper_${Date.now()}@monacocare.mc`; 
            
            await db.collection('pending_registrations').doc(id).set({
                id, firstName, lastName, name, 
                professionLabel: 'Accompagnant - ' + profession, 
                phone, email, status: 'pending', role: 'helper',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { success: true, registrationId: id };
        } catch(e) {
            return { success: false, message: "Erreur lors de l'envoi de la formulation. " + e.message };
        }
    }

    // ── ADMIN (Opérations Firestore) ────────────────────
    const admin = {
        async generateDemoCode(options = {}) {
            const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            const code = Array.from({length:4}, ()=>c[Math.floor(Math.random()*c.length)]).join('') + '-' +
                         Array.from({length:4}, ()=>c[Math.floor(Math.random()*c.length)]).join('');
            const days  = options.days || 30;
            
            await db.collection('demo_codes').doc(code).set({
                active: true,
                patientId: options.patientId || 'patient-demo',
                label: options.label || 'Nouveau code',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + days * 864e5).toISOString()
            });
            return code;
        },
        async toggleDemoCode(code) {
            const docRef = db.collection('demo_codes').doc(code);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const newStatus = !docSnap.data().active;
                await docRef.update({ active: newStatus });
                return newStatus;
            }
            return false;
        },
        async deleteDemoCode(code) {
            await db.collection('demo_codes').doc(code).delete();
        },
        async approveProfessional(regId) {
            const regRef = db.collection('pending_registrations').doc(regId);
            const regSnap = await regRef.get();
            if (!regSnap.exists) return null;
            const reg = regSnap.data();

            // Attribuer un proId
            const profsSnap = await db.collection('professionals').get();
            const count = profsSnap.size + 1;
            const proId = 'PRO-' + String(count).padStart(3,'0');
            const pin   = _genPin(); // PIN généré, mais Firebase Auth devra être ajouté manuellement

            const name  = reg.name || ((reg.firstName||'') + ' ' + (reg.lastName||'')).trim();
            
            await db.collection('professionals').doc(proId).set({
                firstName: reg.firstName||'', lastName: reg.lastName||'', name,
                specialty: reg.specialty || 'autre',
                professionLabel: reg.professionLabel || reg.specialty || '',
                email: reg.email, pin, status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 365 * 864e5).toISOString()
            });

            await regRef.update({
                status: 'approved', approvedProId: proId
            });

            return { proId, pin, name, email: reg.email };
        },
        async toggleProfessional(proId) {
            const docRef = db.collection('professionals').doc(proId);
            const snap = await docRef.get();
            if(snap.exists) {
                const s = snap.data().status === 'active' ? 'suspended' : 'active';
                await docRef.update({ status: s });
                return s;
            }
        },
        async resetPin(proId) {
            const docRef = db.collection('professionals').doc(proId);
            const pin = _genPin();
            await docRef.update({ pin });
            return pin;
        },
        async getAllCodes() { 
            const snap = await db.collection('demo_codes').get();
            const res = {}; snap.forEach(d => res[d.id] = d.data()); return res;
        },
        async getAllProfessionals() {
            const snap = await db.collection('professionals').get();
            const res = {}; snap.forEach(d => res[d.id] = d.data()); return res;
        },
        async getAllPatients() {
            const snap = await db.collection('patients').get();
            const res = {}; snap.forEach(d => res[d.id] = d.data()); return res;
        },
        async getPendingRegistrations() {
            const snap = await db.collection('pending_registrations').where('status', '==', 'pending').get();
            const res = {}; snap.forEach(d => res[d.id] = d.data()); return res;
        },
        async createPatient({ firstName, lastName, dateOfBirth, address, photoUrl }) {
            const countSnap = await db.collection('patients').get();
            const count = countSnap.size + 1;
            const patientId = 'PAT-' + String(count).padStart(3,'0');
            const name = (firstName + ' ' + lastName).trim();
            const age = dateOfBirth ? Math.floor((Date.now() - new Date(dateOfBirth)) / (365.25*864e5)) : null;
            
            await db.collection('patients').doc(patientId).set({
                patientId, firstName, lastName, name, dateOfBirth: dateOfBirth||'', address: address||'',
                age, photoUrl: photoUrl||'', assignedPros: [], assignedFamilyCodes: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 365 * 864e5).toISOString()
            });
            return { patientId, name };
        },
        async findProfessional(proId) {
            const docSnap = await db.collection('professionals').doc(proId).get();
            if(!docSnap.exists || docSnap.data().status !== 'active') return null;
            const pro = docSnap.data();
            return { proId, name: pro.name, professionLabel: pro.professionLabel || pro.specialty, specialty: pro.specialty };
        },
        async findPatient(patientId) {
            const snap = await db.collection('patients').doc(patientId).get();
            return snap.exists ? snap.data() : null;
        },
        async assignProToPatient(patientId, proId) {
            const docRef = db.collection('patients').doc(patientId);
            await docRef.update({
                assignedPros: firebase.firestore.FieldValue.arrayUnion(proId)
            });
            return true;
        }
    };

    /** MIGRATION - SCRIPT DE DEMARRAGE (Crée un patient et un code démo si la BDD est vierge) */
    async function seedDatabaseIfEmpty() {
        try {
            const snap = await db.collection('demo_codes').limit(1).get();
            if(snap.empty) {
                console.log("Initialisation des données de base Firebase...");
                const batch = db.batch();
                batch.set(db.collection('patients').doc('patient-demo'), {
                    name: 'Jean-Pierre DUBOIS', patientId: 'patient-demo', firstName: 'Jean-Pierre',
                    lastName: 'DUBOIS', dateOfBirth: '1947-03-12', address: '12 Avenue de la Costa, Monaco',
                    age: 78, assignedPros: ['PRO-001'], assignedFamilyCodes: ['DEMO-2026'],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                batch.set(db.collection('demo_codes').doc('DEMO-2026'), {
                    active: true, patientId: 'patient-demo', label: 'Famille de démonstration (Créé automatiquement)',
                    expiresAt: new Date(Date.now() + 365 * 864e5).toISOString()
                });
                await batch.commit();
            }
        } catch(e) { console.warn("Seed skipped: ", e); }
    }
    setTimeout(() => { seedDatabaseIfEmpty(); }, 3000);

    return { validateDemoCode, loginProfessional, registerProfessional, loginHelper, registerHelper, requestFamilyAccess, setSession, getSession, clearSession, requireAuth, admin };
})();
