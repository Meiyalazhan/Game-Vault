// Setup Admin User Script
// Run this in the browser console after logging in as the user you want to make admin

// Firebase Configuration (Replace with your config)
const firebaseConfig = {
    apiKey: "AIzaSyDQEwhZ1E4memwRG_gdwzur5GeYhN5AZAc",
    authDomain: "game-vault-47.firebaseapp.com",
    projectId: "game-vault-47",
    storageBucket: "game-vault-47.firebasestorage.app",
    messagingSenderId: "93160921425",
    appId: "1:93160921425:web:100eee7b66a9d33f401b70",
    measurementId: "G-5P7VVVBJ5X"
};

// Function to setup admin user
async function setupAdmin(email) {
    try {
        // Initialize Firebase if not already done
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        const db = firebase.firestore();

        // Add the email to the admins collection
        await db.collection('admins').doc(email).set({
            email: email,
            addedAt: firebase.firestore.FieldValue.serverTimestamp(),
            addedBy: 'setup-script'
        });

        console.log(`✅ Successfully added ${email} as admin`);
        alert(`Successfully added ${email} as admin!`);

    } catch (error) {
        console.error('❌ Error setting up admin:', error);
        alert('Error setting up admin: ' + error.message);
    }
}

// Function to remove admin user
async function removeAdmin(email) {
    try {
        const db = firebase.firestore();
        await db.collection('admins').doc(email).delete();
        console.log(`✅ Successfully removed ${email} from admins`);
        alert(`Successfully removed ${email} from admins!`);
    } catch (error) {
        console.error('❌ Error removing admin:', error);
        alert('Error removing admin: ' + error.message);
    }
}

// Function to list all admins
async function listAdmins() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('admins').get();
        const admins = [];
        snapshot.forEach(doc => {
            admins.push({
                email: doc.id,
                ...doc.data()
            });
        });
        console.log('📋 Current admins:', admins);
        return admins;
    } catch (error) {
        console.error('❌ Error listing admins:', error);
        return [];
    }
}

// Instructions
console.log(`
🚀 GameVault Admin Setup

To use these functions:

1. Make yourself admin:
   setupAdmin('your-email@example.com')

2. Add another admin:
   setupAdmin('another-user@example.com')

3. Remove an admin:
   removeAdmin('user@example.com')

4. List all admins:
   listAdmins()

Example:
setupAdmin('${firebase.auth()?.currentUser?.email || 'your-email@example.com'}')
`);

// Auto-setup current user if logged in
if (firebase.auth()?.currentUser) {
    const currentEmail = firebase.auth().currentUser.email;
    console.log(`Current user: ${currentEmail}`);
    console.log(`To make yourself admin, run: setupAdmin('${currentEmail}')`);
}

// Make functions globally available
window.setupAdmin = setupAdmin;
window.removeAdmin = removeAdmin;
window.listAdmins = listAdmins;