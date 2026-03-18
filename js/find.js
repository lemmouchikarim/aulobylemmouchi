<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Aulo - البحث</title>
    <link rel="icon" type="image/png" href="images/l.png">
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        .search-wrapper {
            position: sticky;
            top: 60px;
            background: #fff;
            padding: 15px 0;
            z-index: 100;
        }
        .search-input-container {
            position: relative;
            display: flex;
            align-items: center;
        }
        .search-input-container i {
            position: absolute;
            right: 15px;
            color: var(--secondary-text);
        }
        #user-search {
            padding-right: 40px;
            border-radius: 25px;
            background: #f1f1f1;
            border: none;
            height: 45px;
            font-size: 16px;
            width: 100%;
        }
        #user-search:focus {
            outline: none;
            border: 2px solid var(--primary-color);
            background: white;
        }
        .results-container {
            margin-top: 10px;
            display: flex;
            flex-direction: column;
        }
        .user-result-item {
            display: flex;
            align-items: center;
            padding: 12px 5px;
            border-bottom: 1px solid var(--border-color);
            text-decoration: none;
            color: inherit;
            transition: background 0.2s;
        }
        .user-result-item:active {
            background: #f9f9f9;
        }
        .result-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
            margin-left: 15px;
            background: var(--skeleton-bg);
        }
        .result-info {
            display: flex;
            flex-direction: column;
            flex: 1;
        }
        .result-display-name {
            font-weight: 700;
            font-size: 16px;
        }
        .result-username {
            font-size: 13px;
            color: var(--secondary-text);
        }
        .result-bio {
            font-size: 12px;
            color: var(--secondary-text);
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
        }
        .no-results {
            text-align: center;
            margin-top: 50px;
            color: var(--secondary-text);
        }
        .no-results i {
            font-size: 50px;
            margin-bottom: 15px;
            opacity: 0.3;
        }
        .search-hint {
            text-align: center;
            margin-top: 30px;
            color: var(--secondary-text);
            font-size: 14px;
        }
        .search-hint i {
            color: var(--primary-color);
            margin-left: 5px;
        }
        .loading-spinner {
            text-align: center;
            margin-top: 20px;
        }
        .loading-spinner i {
            color: var(--primary-color);
            font-size: 24px;
        }
        .recent-searches {
            margin-top: 20px;
        }
        .recent-title {
            font-size: 14px;
            color: var(--secondary-text);
            margin-bottom: 10px;
        }
        .recent-item {
            display: inline-block;
            background: #f1f1f1;
            padding: 5px 15px;
            border-radius: 20px;
            margin-left: 8px;
            margin-bottom: 8px;
            font-size: 13px;
            cursor: pointer;
        }
        .recent-item:hover {
            background: #e1e1e1;
        }
    </style>
</head>
<body>

    <header>
        <div class="logo-container">
            <img src="images/logo.png" alt="Aulo" onclick="location.href='main.html'">
        </div>
        <div style="font-weight: bold;">البحث</div>
        <div style="width: 35px;"></div>
    </header>

    <main class="container">
        <div class="search-wrapper">
            <div class="search-input-container">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="user-search" placeholder="ابحث عن صديق بالاسم أو اليوزر..." autocomplete="off" dir="rtl">
            </div>
        </div>

        <div id="recent-searches" class="recent-searches" style="display: none;">
            <div class="recent-title">عمليات البحث الأخيرة</div>
            <div id="recent-list"></div>
        </div>

        <div id="search-results" class="results-container"></div>

        <div id="loading-spinner" class="loading-spinner" style="display: none;">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
        </div>

        <div id="search-hint" class="search-hint">
            <i class="fa-regular fa-keyboard"></i>
            اكتب حرفين على الأقل للبحث
        </div>
    </main>

    <nav class="bottom-nav">
        <a href="main.html" class="nav-item"><i class="fa-solid fa-house"></i></a>
        <a href="find.html" class="nav-item active"><i class="fa-solid fa-magnifying-glass"></i></a>
        <a href="post.html" class="nav-item"><i class="fa-solid fa-plus-square"></i></a>
        <a href="chatmain.html" class="nav-item"><i class="fa-solid fa-paper-plane"></i></a>
        <a href="myprofile.html" class="nav-item"><i class="fa-solid fa-user"></i></a>
    </nav>

    <div id="msg" class="snackbar"></div>

    <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-database-compat.js"></script>
    <script src="js/ui.js"></script>

    <script>
        const firebaseConfig = {
            apiKey: "AIzaSyBZj9QplNw-VmwSl8Ijv_b6nIi4ghcHDms",
            authDomain: "aulobylemmouchi.firebaseapp.com",
            databaseURL: "https://aulobylemmouchi-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "aulobylemmouchi",
            storageBucket: "aulobylemmouchi.firebasestorage.app",
            messagingSenderId: "63959796567",
            appId: "1:63959796567:web:5cb2b14ca64cc01b6d4c12"
        };

        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();
        const auth = firebase.auth();

        let currentUser = null;
        let cachedUsers = [];

        const searchInput = document.getElementById('user-search');
        const resultsContainer = document.getElementById('search-results');
        const loadingSpinner = document.getElementById('loading-spinner');
        const searchHint = document.getElementById('search-hint');
        const recentSearches = document.getElementById('recent-searches');
        const recentList = document.getElementById('recent-list');

        async function loadAllUsers() {
            if (cachedUsers.length > 0) return cachedUsers;

            try {
                const snapshot = await database.ref('users').once('value');
                const users = [];
                
                snapshot.forEach((child) => {
                    const user = child.val();
                    if (user.uid !== currentUser?.uid) {
                        users.push(user);
                    }
                });
                
                cachedUsers = users;
                return users;
            } catch (error) {
                console.error('Error loading users:', error);
                return [];
            }
        }

        function searchUsers(query) {
            if (!query || query.length < 2) return [];

            query = query.toLowerCase().trim();
            
            return cachedUsers.filter(user => {
                const username = (user.username || '').toLowerCase();
                const displayName = (user.displayName || '').toLowerCase();
                
                return username.includes(query) || displayName.includes(query);
            });
        }

        function displayResults(users) {
            resultsContainer.innerHTML = '';
            
            if (users.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="no-results">
                        <i class="fa-regular fa-face-frown"></i>
                        <p>لا توجد نتائج مطابقة</p>
                        <p style="font-size: 13px;">جرب كلمات بحث أخرى</p>
                    </div>
                `;
                return;
            }

            users.forEach(user => {
                const resultItem = document.createElement('a');
                resultItem.href = `profile.html?id=${user.uid}`;
                resultItem.className = 'user-result-item';
                
                const bio = user.bio ? (user.bio.length > 30 ? user.bio.substring(0, 30) + '...' : user.bio) : '';
                
                resultItem.innerHTML = `
                    <img src="${user.avatar || 'images/profile.png'}" class="result-avatar" loading="lazy">
                    <div class="result-info">
                        <span class="result-display-name">${user.displayName || user.username}</span>
                        <span class="result-username">@${user.username}</span>
                        ${bio ? `<span class="result-bio">${bio}</span>` : ''}
                    </div>
                `;
                
                resultsContainer.appendChild(resultItem);
            });
        }

        function saveRecentSearch(query) {
            let recents = JSON.parse(localStorage.getItem('recentSearches') || '[]');
            recents = recents.filter(q => q !== query);
            recents.unshift(query);
            recents = recents.slice(0, 5);
            localStorage.setItem('recentSearches', JSON.stringify(recents));
            showRecentSearches();
        }

        function showRecentSearches() {
            const recents = JSON.parse(localStorage.getItem('recentSearches') || '[]');
            
            if (recents.length === 0) {
                recentSearches.style.display = 'none';
                return;
            }

            recentList.innerHTML = '';
            recents.forEach(query => {
                const recentItem = document.createElement('span');
                recentItem.className = 'recent-item';
                recentItem.textContent = query;
                recentItem.onclick = () => {
                    searchInput.value = query;
                    performSearch(query);
                };
                recentList.appendChild(recentItem);
            });

            recentSearches.style.display = 'block';
        }

        async function performSearch(query) {
            if (!query || query.length < 2) {
                searchHint.style.display = 'block';
                resultsContainer.innerHTML = '';
                return;
            }

            loadingSpinner.style.display = 'block';
            searchHint.style.display = 'none';
            recentSearches.style.display = 'none';

            setTimeout(() => {
                const results = searchUsers(query);
                loadingSpinner.style.display = 'none';
                displayResults(results);
                
                if (query.length >= 2) {
                    saveRecentSearch(query);
                }
            }, 300);
        }

        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (searchTimeout) clearTimeout(searchTimeout);

            if (query.length < 2) {
                resultsContainer.innerHTML = '';
                searchHint.style.display = 'block';
                showRecentSearches();
                return;
            }

            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 500);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length < 2) {
                showRecentSearches();
            }
        });

        async function initializeSearch() {
            loadingSpinner.style.display = 'block';
            try {
                await loadAllUsers();
                loadingSpinner.style.display = 'none';
                showRecentSearches();
                console.log(`تم تحميل ${cachedUsers.length} مستخدم`);
            } catch (error) {
                console.error('Error initializing search:', error);
                loadingSpinner.style.display = 'none';
            }
        }

        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                initializeSearch();
            } else {
                window.location.href = 'index.html';
            }
        });
    </script>
</body>
</html>