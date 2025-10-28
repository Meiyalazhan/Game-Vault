// GameVault - Collaborative Game Library Management System
class GameVault {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.hasAdminAccess = false;
        this.games = new Map();
        this.userProgress = new Map();
        this.filters = {
            source: 'all',
            status: 'all',
            category: 'all',
            size: 'all'
        };
        this.searchTimeout = null;
        this.editingGameId = null;

        this.initializeFirebase();
        this.initializeEventListeners();
        this.initializeAuth();

        // Hide activity feed immediately and on DOM load
        this.hideActivityFeed();
        document.addEventListener('DOMContentLoaded', () => {
            this.hideActivityFeed();
        });

        // Also hide after a short delay to ensure it's really hidden
        setTimeout(() => {
            this.hideActivityFeed();
        }, 100);
    }

    hideActivityFeed() {
        const activityFeed = document.getElementById('activityFeed');
        if (activityFeed) {
            activityFeed.style.display = 'none';
            console.log('🚫 Activity feed force hidden');
        }
    }

    // Firebase Configuration (Replace with your config)
    initializeFirebase() {
        const firebaseConfig = {
            apiKey: "AIzaSyDQEwhZ1E4memwRG_gdwzur5GeYhN5AZAc",
            authDomain: "game-vault-47.firebaseapp.com",
            projectId: "game-vault-47",
            storageBucket: "game-vault-47.firebasestorage.app",
            messagingSenderId: "93160921425",
            appId: "1:93160921425:web:100eee7b66a9d33f401b70",
            measurementId: "G-5P7VVVBJ5X"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        this.db = firebase.firestore();
        this.auth = firebase.auth();

        // Enable offline persistence (updated method)
        this.db.enablePersistence({
            synchronizeTabs: true
        }).catch(err => {
            if (err.code === 'failed-precondition') {
                console.log('Persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.log('Persistence not available in this browser');
            }
        });
    }

    // Authentication Setup
    initializeAuth() {
        // Load games immediately for public viewing
        this.loadGames();
        this.setupRealtimeListener();

        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                document.body.classList.add('logged-in');
                await this.checkAdminStatus();
                this.showUserInterface();
                // Ensure all modals are closed when user logs in
                this.closeAllModals();
            } else {
                this.currentUser = null;
                this.isAdmin = false;
                document.body.classList.remove('logged-in');
                this.showLoginInterface();
                // Keep games visible but hide admin controls
                this.toggleAdminControls();
            }
        });
    }

    // Event Listeners
    initializeEventListeners() {
        // Login/Logout
        document.getElementById('loginToggle').addEventListener('click', () => {
            this.showLoginModal();
        });

        document.getElementById('loginBtn').addEventListener('click', () => {
            this.login();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Registration functionality
        document.getElementById('registerBtn').addEventListener('click', () => {
            this.register();
        });

        document.getElementById('showRegisterLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterModal();
        });

        document.getElementById('showLoginLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginModal();
        });

        // Modal controls
        this.setupModalControls();

        // Admin mode toggle
        document.getElementById('adminMode').addEventListener('change', (e) => {
            if (this.currentUser && this.hasAdminAccess) {
                this.isAdmin = e.target.checked;
                this.toggleAdminControls(true); // Show notification when manually toggling
            } else {
                e.target.checked = false;
                this.showNotification('You do not have admin access', 'error');
            }
        });

        // Activity toggle
        document.getElementById('activityToggle').addEventListener('change', (e) => {
            this.toggleActivityFeed(e.target.checked);
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.filterGames();
            }, 300);
        });

        // Filter buttons
        this.setupFilterButtons();

        // Admin controls
        document.getElementById('addGameBtn').addEventListener('click', () => {
            this.showGameModal();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportGames();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importGames(e.target.files[0]);
        });

        document.getElementById('manageAdminsBtn').addEventListener('click', () => {
            this.showAdminRequestsModal();
        });

        // Game form
        document.getElementById('gameForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGame();
        });

        document.getElementById('cancelGameBtn').addEventListener('click', () => {
            this.hideGameModal();
        });
    }

    setupModalControls() {
        // Close modals - only allow X button to close
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Removed outside click closing - now only X button can close modals
    }

    setupFilterButtons() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = e.target.dataset.filter;
                const filterValue = e.target.dataset.value;

                // Update active state
                e.target.parentElement.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.remove('active');
                });
                e.target.classList.add('active');

                // Update filter
                this.filters[filterType] = filterValue;
                this.filterGames();
            });
        });
    }

    // Authentication Methods
    showLoginModal() {
        document.getElementById('loginModal').style.display = 'block';
    }

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showNotification('Please enter both email and password', 'error');
            return;
        }

        try {
            await this.auth.signInWithEmailAndPassword(email, password);
            document.getElementById('loginModal').style.display = 'none';
            this.showNotification('Welcome to GameVault!', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
            this.showNotification('Logged out successfully', 'success');
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    // Registration Methods
    showRegisterModal() {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('registerModal').style.display = 'block';
    }

    async register() {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const requestAdmin = document.getElementById('requestAdmin').checked;

        // Validation
        if (!email || !password || !confirmPassword) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Password must be at least 6 characters', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        try {
            // Create user account
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);

            // Add user to users collection
            await this.db.collection('users').doc(userCredential.user.uid).set({
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                displayName: email.split('@')[0]
            });

            // If admin access requested, add to admin_requests
            if (requestAdmin) {
                await this.db.collection('admin_requests').add({
                    email: email,
                    userId: userCredential.user.uid,
                    requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'pending',
                    message: 'Admin access requested during registration'
                });

                this.showNotification('Account created! Admin request submitted for approval.', 'success');
            } else {
                this.showNotification('Account created successfully! Welcome to GameVault!', 'success');
            }

            // Close all modals and clear form
            this.closeAllModals();
            this.clearRegistrationForm();

        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification(error.message, 'error');
        }
    }

    clearRegistrationForm() {
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        document.getElementById('requestAdmin').checked = false;
    }

    closeAllModals() {
        // Close all modals
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });

        // Clear any existing notifications
        document.querySelectorAll('.toastify').forEach(toast => {
            toast.remove();
        });

        console.log('🚪 All modals closed and notifications cleared');
    }

    // Render game status based on user login state
    renderGameStatus(game) {
        if (!this.currentUser) {
            // Hide status completely for non-logged users
            return '';
        }

        // Get user's personal progress
        const userProgress = this.userProgress.get(game.id);
        const personalStatus = userProgress ? userProgress.status : 'not-started'; // Default to not-started for new users

        return `
            <div class="personal-status">
                <select class="status-dropdown" onchange="gameVault.updatePersonalStatus('${game.id}', this.value)">
                    <option value="not-started" ${personalStatus === 'not-started' ? 'selected' : ''}>Not Started</option>
                    <option value="in-progress" ${personalStatus === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${personalStatus === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="abandoned" ${personalStatus === 'abandoned' ? 'selected' : ''}>Abandoned</option>
                </select>
                <div class="status-indicator status-${personalStatus}"></div>
            </div>
        `;
    }

    // Update user's personal status for a game
    async updatePersonalStatus(gameId, newStatus) {
        if (!this.currentUser) {
            console.error('No current user for status update');
            return;
        }

        console.log(`🎮 Updating status for game ${gameId} to ${newStatus} for user ${this.currentUser.email}`);

        try {
            const existingProgress = this.userProgress.get(gameId);
            console.log('📊 Existing progress:', existingProgress);

            if (existingProgress && existingProgress.id) {
                // Update existing progress
                console.log(`🔄 Updating existing progress doc: ${existingProgress.id}`);
                await this.db.collection('user_progress').doc(existingProgress.id).update({
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Updated existing progress');
            } else {
                // Create new progress record
                console.log('📝 Creating new progress record');
                const docRef = await this.db.collection('user_progress').add({
                    userId: this.currentUser.email,
                    gameId: gameId,
                    status: newStatus,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('✅ Created new progress with ID:', docRef.id);

                // Update local cache with the new document ID
                this.userProgress.set(gameId, {
                    id: docRef.id,
                    status: newStatus,
                    updatedAt: new Date()
                });
            }

            // Update local cache for existing records
            if (existingProgress && existingProgress.id) {
                this.userProgress.set(gameId, {
                    id: existingProgress.id,
                    status: newStatus,
                    updatedAt: new Date()
                });
            }

            this.showNotification(`Status updated to ${this.formatStatus(newStatus)}`, 'success');
            console.log('🎉 Status update completed successfully');

        } catch (error) {
            console.error('❌ Error updating status:', error);
            console.error('Error details:', error.code, error.message);
            this.showNotification(`Error updating status: ${error.message}`, 'error');
        }
    }

    // Admin Requests Management
    async showAdminRequestsModal() {
        document.getElementById('adminRequestsModal').style.display = 'block';
        await this.loadAdminRequests();
    }

    async loadAdminRequests() {
        try {
            const snapshot = await this.db.collection('admin_requests')
                .orderBy('requestedAt', 'desc')
                .get();

            const requestsList = document.getElementById('adminRequestsList');

            if (snapshot.empty) {
                requestsList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No admin requests found.</p>';
                return;
            }

            requestsList.innerHTML = snapshot.docs.map(doc => {
                const request = doc.data();
                const requestDate = request.requestedAt ? request.requestedAt.toDate().toLocaleDateString() : 'Unknown';

                return `
                    <div class="admin-request-item ${request.status}" data-request-id="${doc.id}">
                        <div class="request-info">
                            <div class="request-header">
                                <strong>${request.email}</strong>
                                <span class="request-status status-${request.status}">${request.status.toUpperCase()}</span>
                            </div>
                            <div class="request-details">
                                <p><i class="fas fa-calendar"></i> Requested: ${requestDate}</p>
                                ${request.message ? `<p><i class="fas fa-comment"></i> ${request.message}</p>` : ''}
                            </div>
                        </div>
                        ${request.status === 'pending' ? `
                            <div class="request-actions">
                                <button class="btn btn-sm btn-success" onclick="gameVault.approveAdminRequest('${doc.id}', '${request.email}')">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="gameVault.denyAdminRequest('${doc.id}')">
                                    <i class="fas fa-times"></i> Deny
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading admin requests:', error);
            document.getElementById('adminRequestsList').innerHTML =
                '<p style="text-align: center; color: #dc3545; padding: 20px;">Error loading requests.</p>';
        }
    }

    async approveAdminRequest(requestId, email) {
        try {
            // Add user to admins collection
            await this.db.collection('admins').doc(email).set({
                email: email,
                addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                addedBy: this.currentUser.email,
                role: 'admin'
            });

            // Update request status
            await this.db.collection('admin_requests').doc(requestId).update({
                status: 'approved',
                approvedBy: this.currentUser.email,
                approvedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.showNotification(`Admin access granted to ${email}`, 'success');
            await this.loadAdminRequests(); // Refresh the list

        } catch (error) {
            console.error('Error approving admin request:', error);
            this.showNotification('Error approving request', 'error');
        }
    }

    async denyAdminRequest(requestId) {
        try {
            await this.db.collection('admin_requests').doc(requestId).update({
                status: 'denied',
                deniedBy: this.currentUser.email,
                deniedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.showNotification('Admin request denied', 'info');
            await this.loadAdminRequests(); // Refresh the list

        } catch (error) {
            console.error('Error denying admin request:', error);
            this.showNotification('Error denying request', 'error');
        }
    }

    // Check if current user has admin access
    async checkAdminStatus() {
        if (!this.currentUser) {
            this.hasAdminAccess = false;
            console.log('❌ No current user, hasAdminAccess = false');
            return;
        }

        try {
            console.log('🔍 Checking admin status for:', this.currentUser.email);

            // Try to get the admin document
            const adminDoc = await this.db.collection('admins').doc(this.currentUser.email).get();
            this.hasAdminAccess = adminDoc.exists;

            console.log('📄 Admin document exists:', adminDoc.exists);
            console.log('📧 Looking for document ID:', this.currentUser.email);

            if (adminDoc.exists) {
                console.log('✅ Admin check result: IS ADMIN');
                console.log('👑 Admin data:', adminDoc.data());
            } else {
                console.log('❌ Admin check result: NOT ADMIN');

                // Let's also check what documents exist in the admins collection
                const allAdmins = await this.db.collection('admins').get();
                console.log('� All admin documents:');
                allAdmins.forEach(doc => {
                    console.log(`   - Document ID: "${doc.id}"`, doc.data());
                });
            }

        } catch (error) {
            console.error('❌ Error checking admin status:', error);
            this.hasAdminAccess = false;
        }
    }    // UI State Management
    showUserInterface() {
        document.getElementById('loginToggle').style.display = 'none';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('userName').textContent = this.currentUser.email;

        console.log('🎮 showUserInterface called');
        console.log('👤 Current user:', this.currentUser.email);
        console.log('🔑 Has admin access:', this.hasAdminAccess);

        // Show admin toggle only if user has admin access
        const adminToggle = document.getElementById('adminMode').parentElement;
        const activityToggleContainer = document.getElementById('activityToggleContainer');

        if (this.hasAdminAccess) {
            console.log('✅ Showing admin controls');
            adminToggle.style.display = 'flex';
            activityToggleContainer.style.display = 'flex';
        } else {
            console.log('❌ Hiding admin controls');
            adminToggle.style.display = 'none';
            activityToggleContainer.style.display = 'none';
            this.isAdmin = false;
        }

        // Hide activity feed by default
        const activityFeed = document.getElementById('activityFeed');
        if (activityFeed) {
            activityFeed.style.display = 'none';
        }

        this.toggleAdminControls();
    }

    showLoginInterface() {
        document.getElementById('loginToggle').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('adminControls').style.display = 'none';
        document.getElementById('activityToggleContainer').style.display = 'none';

        // Hide activity feed for non-logged in users
        const activityFeed = document.getElementById('activityFeed');
        if (activityFeed) {
            activityFeed.style.display = 'none';
        }

        // Keep games visible but hide admin-only features
        this.isAdmin = false;
        this.toggleAdminControls();
    }

    toggleAdminControls(showNotification = false) {
        const adminControls = document.getElementById('adminControls');
        adminControls.style.display = this.isAdmin ? 'flex' : 'none';

        // Show/hide action buttons in table
        document.querySelectorAll('.action-buttons').forEach(buttons => {
            buttons.style.display = this.isAdmin ? 'flex' : 'none';
        });

        // Show/hide "Status" column and filter
        document.querySelectorAll('.status-column').forEach(col => {
            col.style.display = this.currentUser ? 'table-cell' : 'none';
        });
        document.querySelectorAll('.status-filter-group').forEach(group => {
            group.style.display = this.currentUser ? 'block' : 'none';
        });

        // Show/hide "Added by" column
        document.querySelectorAll('.added-by-column').forEach(col => {
            col.style.display = this.isAdmin ? 'table-cell' : 'none';
        });

        // Actions column should always be visible (contains download button)
        document.querySelectorAll('.actions-column').forEach(col => {
            col.style.display = 'table-cell';
        });

        // Only show notification when manually toggling
        if (showNotification && this.currentUser) {
            this.showNotification(
                this.isAdmin ? 'Admin mode enabled' : 'Admin mode disabled',
                'info'
            );
        }

        // Re-render games to update the table
        this.renderGames();
    }

    toggleActivityFeed(show) {
        const activityFeed = document.getElementById('activityFeed');
        activityFeed.style.display = show ? 'block' : 'none';
        console.log('🕰️ Activity feed toggled:', show ? 'SHOWN' : 'HIDDEN');
    }

    // Game Management
    showGameModal(gameId = null) {
        if (!this.currentUser) {
            this.showNotification('Please login to add or edit games', 'error');
            this.showLoginModal();
            return;
        }

        this.editingGameId = gameId;
        const modal = document.getElementById('gameModal');
        const modalTitle = document.getElementById('modalTitle');

        if (gameId) {
            modalTitle.textContent = 'Edit Game';
            this.populateGameForm(gameId);
        } else {
            modalTitle.textContent = 'Add New Game';
            this.clearGameForm();
        }

        modal.style.display = 'block';
    }

    hideGameModal() {
        document.getElementById('gameModal').style.display = 'none';
        this.editingGameId = null;
        this.clearGameForm();
    }

    populateGameForm(gameId) {
        const game = this.games.get(gameId);
        if (!game) return;

        document.getElementById('gameName').value = game.name || '';
        document.getElementById('gameSize').value = game.size || '';
        document.getElementById('gameSource').value = game.source || 'apun';
        document.getElementById('gameCategory').value = game.category || 'action';
        document.getElementById('gameStatus').value = game.status || 'not-started';
        document.getElementById('gameRating').value = game.rating || '';
        document.getElementById('gameDownloadLink').value = game.downloadLink || '';
        document.getElementById('gameNotes').value = game.notes || '';
    }

    clearGameForm() {
        document.getElementById('gameForm').reset();
    }

    async saveGame() {
        const gameData = {
            name: document.getElementById('gameName').value.trim(),
            size: document.getElementById('gameSize').value.trim(),
            source: document.getElementById('gameSource').value,
            category: document.getElementById('gameCategory').value,
            status: document.getElementById('gameStatus').value,
            rating: document.getElementById('gameRating').value,
            downloadLink: document.getElementById('gameDownloadLink').value.trim(),
            notes: document.getElementById('gameNotes').value.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: this.currentUser.email
        };

        if (!this.editingGameId) {
            gameData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            gameData.createdBy = this.currentUser.email;
        }

        try {
            let docRef;
            if (this.editingGameId) {
                docRef = this.db.collection('games').doc(this.editingGameId);
                await docRef.update(gameData);
                this.logActivity('edit', gameData.name);
                this.showNotification('Game updated successfully!', 'success');
            } else {
                docRef = await this.db.collection('games').add(gameData);
                this.logActivity('add', gameData.name);
                this.showNotification('Game added successfully!', 'success');
            }

            this.hideGameModal();
        } catch (error) {
            console.error('Error saving game:', error);
            this.showNotification('Error saving game: ' + error.message, 'error');
        }
    }

    async deleteGame(gameId) {
        if (!this.currentUser) {
            this.showNotification('Please login to delete games', 'error');
            this.showLoginModal();
            return;
        }

        const game = this.games.get(gameId);
        if (!game) return;

        if (!confirm(`Are you sure you want to delete "${game.name}"?`)) {
            return;
        }

        try {
            await this.db.collection('games').doc(gameId).delete();
            this.logActivity('delete', game.name);
            this.showNotification('Game deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting game:', error);
            this.showNotification('Error deleting game: ' + error.message, 'error');
        }
    }

    // Real-time Data Sync
    setupRealtimeListener() {
        this.db.collection('games').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                const game = { id: change.doc.id, ...change.doc.data() };

                if (change.type === 'added' || change.type === 'modified') {
                    this.games.set(game.id, game);
                } else if (change.type === 'removed') {
                    this.games.delete(game.id);
                }
            });

            this.renderGames();
            this.updateStats();
        });

        // Listen to activity logs but don't show by default
        this.db.collection('activity')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .onSnapshot(snapshot => {
                this.renderActivity(snapshot.docs);
                // Ensure activity feed stays hidden unless admin enabled it
                if (!this.isAdmin || !document.getElementById('activityToggle').checked) {
                    this.hideActivityFeed();
                }
            });
    }

    async loadGames() {
        try {
            document.querySelector('.loading').style.display = 'block';

            const snapshot = await this.db.collection('games').get();
            this.games.clear();

            snapshot.forEach(doc => {
                this.games.set(doc.id, { id: doc.id, ...doc.data() });
            });

            // Load user progress if logged in
            if (this.currentUser) {
                await this.loadUserProgress();
            }

            this.renderGames();
            this.updateStats();
            document.querySelector('.loading').style.display = 'none';
        } catch (error) {
            console.error('Error loading games:', error);
            this.showNotification('Error loading games: ' + error.message, 'error');
            document.querySelector('.loading').style.display = 'none';
        }
    }

    async loadUserProgress() {
        if (!this.currentUser) return;

        try {
            this.userProgress = new Map();
            const snapshot = await this.db.collection('user_progress')
                .where('userId', '==', this.currentUser.email)
                .get();

            snapshot.forEach(doc => {
                const data = doc.data();
                this.userProgress.set(data.gameId, {
                    id: doc.id,
                    status: data.status,
                    updatedAt: data.updatedAt
                });
            });
        } catch (error) {
            console.error('Error loading user progress:', error);
        }
    }

    // Rendering Methods
    renderGames() {
        const tbody = document.getElementById('gamesTableBody');
        const filteredGames = this.getFilteredGames();

        const colSpan = this.isAdmin ? '7' : '6';
        if (filteredGames.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 40px; color: #666;">No games found</td></tr>`;
            document.querySelector('.no-results').style.display = 'block';
            document.getElementById('gamesTable').style.display = 'none';
            return;
        }

        document.querySelector('.no-results').style.display = 'none';
        document.getElementById('gamesTable').style.display = 'table';

        tbody.innerHTML = filteredGames.map(game => `
            <tr data-game-id="${game.id}">
                <td>
                    <div class="game-info">
                        <div class="game-name">
                            <i class="fas fa-gamepad"></i>
                            ${game.name}
                            <span class="source-badge source-${game.source}">${game.source.toUpperCase()}</span>
                        </div>
                        ${game.notes ? `<div class="game-notes" title="${game.notes}">${game.notes}</div>` : ''}
                    </div>
                </td>
                <td>
                    <span class="category-badge">${this.formatCategory(game.category)}</span>
                </td>
                <td class="size">${game.size}</td>
                ${this.currentUser ? `<td class="status-column">
                    ${this.renderGameStatus(game)}
                </td>` : ''}
                <td>
                    <div class="rating-stars">
                        ${this.renderStars(game.rating)}
                    </div>
                </td>
                ${this.isAdmin ? `
                <td class="added-by-column">
                    <div class="added-by">
                        <i class="fas fa-user"></i>
                        ${game.createdBy || 'Unknown'}
                        <div class="added-date">${this.formatDate(game.createdAt)}</div>
                    </div>
                </td>` : ''}
                <td class="actions-column">
                    ${this.isAdmin ? `
                    <div class="action-buttons">
                        <a href="${game.downloadLink}" target="_blank" class="action-btn download" title="Download">
                            <i class="fas fa-download"></i>
                        </a>
                        <button class="action-btn edit" onclick="gameVault.showGameModal('${game.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="gameVault.deleteGame('${game.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>` : `
                    <div class="download-only">
                        <a href="${game.downloadLink}" target="_blank" class="action-btn download">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>`}
                </td>
            </tr>
        `).join('');
    }

    renderActivity(activityDocs) {
        const activityList = document.getElementById('activityList');

        // Only populate activity content, don't control visibility here
        if (activityDocs.length === 0) {
            activityList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No recent activity</p>';
            return;
        }

        activityList.innerHTML = activityDocs.map(doc => {
            const activity = doc.data();
            return `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-text">
                            <strong>${activity.user}</strong> ${activity.action} <strong>${activity.gameName}</strong>
                        </div>
                        <div class="activity-time">${this.formatDate(activity.timestamp)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Filtering and Search
    getFilteredGames() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();

        return Array.from(this.games.values()).filter(game => {
            // Search filter
            const matchesSearch = !searchTerm ||
                game.name.toLowerCase().includes(searchTerm) ||
                (game.notes && game.notes.toLowerCase().includes(searchTerm));

            // Source filter
            const matchesSource = this.filters.source === 'all' || game.source === this.filters.source;

            // Status filter
            const matchesStatus = this.filters.status === 'all' || game.status === this.filters.status;

            // Category filter
            const matchesCategory = this.filters.category === 'all' || game.category === this.filters.category;

            // Size filter
            const matchesSize = this.filters.size === 'all' || this.matchesSizeFilter(game.size, this.filters.size);

            return matchesSearch && matchesSource && matchesStatus && matchesCategory && matchesSize;
        }).sort((a, b) => {
            // Sort by name alphabetically
            return a.name.localeCompare(b.name);
        });
    }

    matchesSizeFilter(sizeStr, filter) {
        const sizeInGB = this.parseSizeToGB(sizeStr);

        switch (filter) {
            case 'small': return sizeInGB < 5;
            case 'medium': return sizeInGB >= 5 && sizeInGB <= 20;
            case 'large': return sizeInGB > 20;
            default: return true;
        }
    }

    parseSizeToGB(sizeStr) {
        if (!sizeStr) return 0;

        const match = sizeStr.match(/(\d+\.?\d*)\s*(GB|MB|TB)/i);
        if (!match) return 0;

        const size = parseFloat(match[1]);
        const unit = match[2].toUpperCase();

        switch (unit) {
            case 'MB': return size / 1024;
            case 'GB': return size;
            case 'TB': return size * 1024;
            default: return size;
        }
    }

    filterGames() {
        this.renderGames();
        this.updateStats();
    }

    // Import/Export Functionality
    async exportGames() {
        const games = Array.from(this.games.values());
        const exportData = {
            games,
            exportDate: new Date().toISOString(),
            exportedBy: this.currentUser.email
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `gamevault-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Games exported successfully!', 'success');
    }

    async importGames(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.games || !Array.isArray(data.games)) {
                throw new Error('Invalid import file format');
            }

            const batch = this.db.batch();

            data.games.forEach(game => {
                const gameData = {
                    ...game,
                    importedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    importedBy: this.currentUser.email
                };
                delete gameData.id; // Remove old ID

                const docRef = this.db.collection('games').doc();
                batch.set(docRef, gameData);
            });

            await batch.commit();
            this.showNotification(`Successfully imported ${data.games.length} games!`, 'success');
        } catch (error) {
            console.error('Error importing games:', error);
            this.showNotification('Error importing games: ' + error.message, 'error');
        }
    }

    // Activity Logging
    async logActivity(type, gameName) {
        try {
            await this.db.collection('activity').add({
                type,
                action: this.getActivityAction(type),
                gameName,
                user: this.currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    getActivityAction(type) {
        switch (type) {
            case 'add': return 'added';
            case 'edit': return 'updated';
            case 'delete': return 'deleted';
            default: return 'modified';
        }
    }

    getActivityIcon(type) {
        switch (type) {
            case 'add': return 'plus';
            case 'edit': return 'edit';
            case 'delete': return 'trash';
            default: return 'gamepad';
        }
    }

    // Statistics and Display Helpers
    updateStats() {
        const games = this.getFilteredGames();
        const totalSize = games.reduce((sum, game) => sum + this.parseSizeToGB(game.size), 0);
        const completedGames = games.filter(game => game.status === 'completed').length;
        const sources = new Set(games.map(game => game.source)).size;

        this.animateStatValue('totalGames', games.length);
        this.animateStatValue('totalSize', totalSize.toFixed(1) + ' GB');
        this.animateStatValue('completedGames', completedGames);
        this.animateStatValue('totalSources', sources);
    }

    animateStatValue(elementId, newValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.classList.add('updating');
        setTimeout(() => {
            element.textContent = newValue;
            element.classList.remove('updating');
        }, 250);
    }

    formatCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    formatStatus(status) {
        return status.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    renderStars(rating) {
        if (!rating) return '<span style="color: #666;">Not Rated</span>';

        const stars = '⭐'.repeat(parseInt(rating));
        const emptyStars = '☆'.repeat(5 - parseInt(rating));
        return stars + emptyStars;
    }

    formatDate(timestamp) {
        if (!timestamp) return 'Unknown';

        let date;
        if (timestamp.toDate) {
            date = timestamp.toDate();
        } else {
            date = new Date(timestamp);
        }

        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Notification System
    showNotification(message, type = 'info') {
        // Clear any existing error notifications if showing a success message
        if (type === 'success') {
            document.querySelectorAll('.toastify').forEach(toast => {
                if (toast.style.background === this.getNotificationColor('error')) {
                    toast.remove();
                }
            });
        }

        Toastify({
            text: message,
            duration: type === 'error' ? 4000 : 3000, // Longer duration for errors
            close: true,
            gravity: "top",
            position: "right",
            style: {
                background: this.getNotificationColor(type)
            },
            stopOnFocus: true,
            onClick: function () {
                this.hideToast(); // Allow clicking to dismiss
            }
        }).showToast();
    }

    getNotificationColor(type) {
        switch (type) {
            case 'success': return '#28a745';
            case 'error': return '#dc3545';
            case 'warning': return '#ffc107';
            case 'info': return '#17a2b8';
            default: return '#6c757d';
        }
    }

    // Cleanup
    clearGamesList() {
        this.games.clear();
        document.getElementById('gamesTableBody').innerHTML = '';
        this.updateStats();
    }
}

// Initialize GameVault when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameVault = new GameVault();
});

// Additional utility functions for enhanced features
const GameVaultUtils = {
    // Keyboard shortcuts
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + F to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.style.display === 'block') {
                        modal.style.display = 'none';
                    }
                });
            }

            // Ctrl/Cmd + N to add new game (admin only)
            if ((e.ctrlKey || e.metaKey) && e.key === 'n' && window.gameVault.isAdmin) {
                e.preventDefault();
                window.gameVault.showGameModal();
            }
        });
    },

    // Enhanced search with highlighting
    highlightSearchTerms(text, searchTerm) {
        if (!searchTerm) return text;

        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },

    // Local storage for user preferences
    saveUserPreferences() {
        const preferences = {
            adminMode: window.gameVault.isAdmin,
            filters: window.gameVault.filters
        };
        localStorage.setItem('gamevault-preferences', JSON.stringify(preferences));
    },

    loadUserPreferences() {
        const saved = localStorage.getItem('gamevault-preferences');
        if (saved) {
            return JSON.parse(saved);
        }
        return null;
    }
};

// Initialize additional features
document.addEventListener('DOMContentLoaded', () => {
    GameVaultUtils.initKeyboardShortcuts();

    // Load user preferences
    const preferences = GameVaultUtils.loadUserPreferences();
    if (preferences && window.gameVault) {
        window.gameVault.filters = { ...window.gameVault.filters, ...preferences.filters };
    }
});

// Save preferences before page unload
window.addEventListener('beforeunload', () => {
    if (window.gameVault) {
        GameVaultUtils.saveUserPreferences();
    }
});