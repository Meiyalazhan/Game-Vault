# GameVault - Collaborative Game Library Management System

A modern, real-time collaborative game library management system built with Firebase and vanilla JavaScript.

## 🎮 Features

- **Real-time Synchronization**: Multi-user real-time updates
- **Public Game Viewing**: View games without login required
- **Admin Access Control**: Secure admin-only features with email whitelist
- **Advanced Filtering**: Filter by source, status, category, and size
- **Smart Search**: Search across game names and notes
- **Progress Tracking**: Track game completion status
- **Rating System**: 5-star rating system for games
- **Activity Logging**: Admin-controlled activity feed
- **Data Import/Export**: JSON import/export functionality
- **Full Screen Design**: Optimized for full screen viewing
- **Responsive Design**: Works on desktop and mobile devices
- **Offline Support**: Works offline with automatic sync when online

## 🚀 Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Firestore (NoSQL Database)
- **Authentication**: Firebase Auth
- **Hosting**: Firebase Hosting (optional)
- **UI/UX**: Font Awesome icons, CSS animations, modern gradients

## 📋 Setup Instructions

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Firestore Database
4. Enable Authentication with Email/Password
5. Copy your Firebase configuration
6. Replace the config in `gamevault.js` (lines 18-26)

### 2. Firestore Rules

Copy and apply the security rules from `firestore.rules` to your Firestore database in the Firebase Console.

### 3. Setup First Admin User

1. Open `gamevault.html` in your browser
2. Create an account and login
3. Open browser developer console (F12)
4. Copy and paste the contents of `setup-admin.js` into the console
5. Run: `setupAdmin('your-email@example.com')`
6. Refresh the page - you should now see admin controls

### 4. Deploy (Optional)

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init`
4. Deploy: `firebase deploy`

## 🎯 Admin Features

Admins have access to additional features:

- **Admin Mode Toggle**: Enable/disable admin features
- **Activity Feed Toggle**: Show/hide recent activity
- **Add/Edit/Delete Games**: Full game management
- **Import/Export**: Bulk data operations
- **View Added By**: See who added each game
- **Admin Management**: Add/remove other admins (via console)

## 📁 File Structure

```
gamevault/
├── gamevault.html          # Main HTML file
├── gamevault.css           # Styles (full screen optimized)
├── gamevault.js            # Main JavaScript logic
├── firestore.rules         # Database security rules
├── setup-admin.js          # Admin setup utility
└── README.md              # This file
```

## 🎮 Usage

### For Regular Users:

1. Open `gamevault.html` in browser
2. Browse games without login
3. Login to download games
4. View ratings and game details

### For Admins:

1. Login with admin account
2. Toggle "Admin Mode" to access admin features
3. Toggle "Show Activity" to see recent changes
4. Add, edit, or delete games
5. Import/export game data

## 🎯 Game Sources Supported

- ApunKaGames
- FitGirl Repacks
- Steam
- Epic Games Store
- GOG
- Other sources

## 🔧 Admin Management

Use the browser console with `setup-admin.js` functions:

```javascript
// Add admin
setupAdmin("user@example.com");

// Remove admin
removeAdmin("user@example.com");

// List all admins
listAdmins();
```

## 🎨 Key Improvements

- **Full Screen Layout**: No max-width constraints
- **Better Button Design**: Improved download and action buttons
- **Conditional UI Elements**: Admin-only features properly hidden
- **Public Game Access**: View games without authentication
- **Secure Admin System**: Email-based admin whitelist
- **Enhanced UX**: Better visual feedback and interactions

## 🤝 Contributing

Feel free to contribute by:

- Reporting bugs
- Suggesting new features
- Submitting pull requests

## 📄 License

This project is open source and available under the MIT License.
