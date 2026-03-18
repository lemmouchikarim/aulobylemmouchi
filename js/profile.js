// js/profile.js
// عرض الملفات الشخصية (خاصة وعامة)

let currentProfileUserId = null;

// تحميل الملف الشخصي
async function loadProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    if (!userId) {
        showMessage('لم يتم تحديد مستخدم', true);
        window.location.href = 'main.html';
        return;
    }
    
    currentProfileUserId = userId;
    
    try {
        // الحصول على بيانات المستخدم
        const userSnapshot = await database.ref(`users/${userId}`).once('value');
        const userData = userSnapshot.val();
        
        if (!userData) {
            showMessage('المستخدم غير موجود', true);
            window.location.href = 'main.html';
            return;
        }
        
        // تحديث الواجهة
        document.getElementById('user-avatar').src = userData.avatar || 'images/profile.png';
        document.getElementById('user-display-name').textContent = userData.displayName || userData.username;
        document.getElementById('user-username').textContent = `@${userData.username}`;
        document.getElementById('user-bio').textContent = userData.bio || 'لا يوجد نبذة شخصية';
        
        // تنسيق تاريخ الميلاد
        if (userData.birthdate) {
            const date = new Date(userData.birthdate);
            document.getElementById('user-dob').textContent = date.toLocaleDateString('ar-SA');
        }
        
        // الجنس
        const genderSpan = document.getElementById('user-gender');
        const genderIcon = document.getElementById('user-gender-icon');
        
        if (userData.gender === 'male') {
            genderSpan.textContent = 'ذكر';
            genderIcon.className = 'fa-solid fa-mars';
        } else if (userData.gender === 'female') {
            genderSpan.textContent = 'أنثى';
            genderIcon.className = 'fa-solid fa-venus';
        }
        
        // تحميل منشورات المستخدم
        loadUserPosts(userId);
        
        // زر بدء المحادثة
        document.getElementById('start-chat-btn').onclick = () => {
            window.location.href = `chat.html?id=${userId}`;
        };
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showMessage('خطأ في تحميل الملف الشخصي', true);
    }
}

// تحميل منشورات المستخدم
async function loadUserPosts(userId) {
    const feed = document.getElementById('user-posts-feed');
    
    try {
        const postsRef = database.ref('posts')
            .orderByChild('userId')
            .equalTo(userId)
            .limitToLast(10);
        
        const snapshot = await postsRef.once('value');
        const posts = [];
        
        snapshot.forEach((child) => {
            posts.push({ id: child.key, ...child.val() });
        });
        
        // عكس الترتيب
        posts.reverse();
        
        if (posts.length === 0) {
            feed.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--secondary-text);">لا توجد منشورات بعد</div>';
            return;
        }
        
        feed.innerHTML = '';
        
        for (const post of posts) {
            const userData = await getUserData(post.userId);
            const isLiked = await checkIfLiked(post.id);
            feed.appendChild(createProfilePostElement(post, userData, isLiked));
        }
        
    } catch (error) {
        console.error('Error loading user posts:', error);
        feed.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--error-color);">خطأ في تحميل المنشورات</div>';
    }
}

// إنشاء عنصر منشور للملف الشخصي
function createProfilePostElement(post, userData, isLiked = false) {
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.dataset.postId = post.id;
    
    const contentHTML = post.text ? `<div class="post-content">${post.text}</div>` : '';
    
    let mediaHTML = '';
    if (post.media && post.media.length > 0) {
        const gridClass = `media-grid-${Math.min(post.media.length, 5)}`;
        mediaHTML = `<div class="post-media-container ${gridClass}">`;
        
        post.media.forEach((media) => {
            if (media.type === 'image') {
                mediaHTML += `<img src="${media.url}" alt="صورة" loading="lazy">`;
            } else if (media.type === 'video') {
                mediaHTML += `
                    <div class="video-wrapper">
                        <video src="${media.url}" preload="metadata"></video>
                    </div>
                `;
            } else if (media.type === 'audio') {
                mediaHTML += `
                    <div class="audio-player">
                        <i class="fa-solid fa-circle-play audio-icon" onclick="this.nextElementSibling.play()"></i>
                        <audio src="${media.url}" preload="none"></audio>
                        <span>تسجيل صوتي</span>
                    </div>
                `;
            }
        });
        
        mediaHTML += '</div>';
    }
    
    const likeClass = isLiked ? 'active' : '';
    
    postCard.innerHTML = `
        <div class="post-header">
            <img src="${userData.avatar || 'images/profile.png'}" class="user-avatar">
            <div class="post-info">
                <span class="display-name">${userData.displayName || userData.username}</span>
                <span class="post-time">${formatDate(post.timestamp)}</span>
            </div>
        </div>
        ${contentHTML}
        ${mediaHTML}
        <div class="post-actions">
            <button class="like-btn ${likeClass}" onclick="toggleLike('${post.id}', this)">
                <i class="fa-${isLiked ? 'solid' : 'regular'} fa-heart"></i>
            </button>
            <span class="like-count">${post.likes || 0}</span>
        </div>
    `;
    
    return postCard;
}

// دوال مساعدة
async function getUserData(userId) {
    try {
        const snapshot = await database.ref(`users/${userId}`).once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error('Error getting user data:', error);
        return {};
    }
}

async function checkIfLiked(postId) {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        const snapshot = await database.ref(`likes/${postId}/${user.uid}`).once('value');
        return snapshot.exists();
    } catch (error) {
        return false;
    }
}

// بدء التحميل
auth.onAuthStateChanged((user) => {
    if (user) {
        loadProfile();
    } else {
        window.location.href = 'index.html';
    }
});