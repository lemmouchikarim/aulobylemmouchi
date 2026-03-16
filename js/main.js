// js/main.js
// الصفحة الرئيسية - عرض المنشورات مع التحميل اللانهائي

let lastPostTime = Date.now();
let loading = false;
let allPostsLoaded = false;
const POSTS_PER_PAGE = 5;

// تحميل المنشورات
async function loadPosts(loadMore = false) {
    if (loading || allPostsLoaded) return;
    
    loading = true;
    const feed = document.getElementById('feed');
    
    if (!loadMore) {
        feed.innerHTML = generateSkeletonCards(3);
        lastPostTime = Date.now();
    }
    
    try {
        const postsRef = database.ref('posts')
            .orderByChild('timestamp')
            .endAt(lastPostTime)
            .limitToLast(POSTS_PER_PAGE + 1);
        
        const snapshot = await postsRef.once('value');
        const posts = [];
        
        snapshot.forEach((child) => {
            posts.push({ id: child.key, ...child.val() });
        });
        
        // عكس الترتيب (من الأحدث إلى الأقدم)
        posts.reverse();
        
        // التحقق من وجود المزيد
        if (posts.length <= POSTS_PER_PAGE) {
            allPostsLoaded = true;
        } else {
            posts.pop(); // إزالة العنصر الزائد
            lastPostTime = posts[posts.length - 1].timestamp;
        }
        
        if (!loadMore) {
            feed.innerHTML = '';
        }
        
        // عرض المنشورات
        for (const post of posts) {
            const userData = await getUserData(post.userId);
            const isLiked = await checkIfLiked(post.id);
            feed.appendChild(createPostElement(post, userData, isLiked));
        }
        
        if (posts.length === 0) {
            allPostsLoaded = true;
            if (!loadMore) {
                feed.innerHTML = '<div class="empty-state" style="text-align: center; padding: 50px;"><i class="fa-regular fa-newspaper"></i><p>لا توجد منشورات بعد</p></div>';
            }
        }
        
    } catch (error) {
        console.error('Error loading posts:', error);
        showMessage('خطأ في تحميل المنشورات', true);
    } finally {
        loading = false;
    }
}

// الحصول على بيانات المستخدم
async function getUserData(userId) {
    try {
        const snapshot = await database.ref(`users/${userId}`).once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error('Error getting user data:', error);
        return {};
    }
}

// التحقق من الإعجاب
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

// إنشاء عنصر منشور في DOM
function createPostElement(post, userData, isLiked = false) {
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.dataset.postId = post.id;
    
    // معالجة المحتوى النصي
    const contentHTML = post.text ? `<div class="post-content">${post.text}</div>` : '';
    
    // معالجة الوسائط
    let mediaHTML = '';
    if (post.media && post.media.length > 0) {
        const gridClass = `media-grid-${Math.min(post.media.length, 5)}`;
        mediaHTML = `<div class="post-media-container ${gridClass}">`;
        
        post.media.forEach((media, index) => {
            if (index < 5) { // حد أقصى 5 صور
                if (media.type === 'image') {
                    mediaHTML += `<img src="${media.url}" alt="صورة منشور" loading="lazy" onclick="openMediaViewer('${media.url}', 'image')">`;
                } else if (media.type === 'video') {
                    mediaHTML += `
                        <div class="video-wrapper">
                            <video src="${media.url}" onclick="this.paused ? this.play() : this.pause(); this.muted=false;">
                                <source src="${media.url}" type="video/mp4">
                            </video>
                            <button class="video-mute-btn" onclick="toggleVideoMute(this, event)">
                                <i class="fa-solid fa-volume-xmark"></i>
                            </button>
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
            }
        });
        
        mediaHTML += '</div>';
    }
    
    // زر الإعجاب
    const likeClass = isLiked ? 'active' : '';
    
    postCard.innerHTML = `
        <div class="post-header" onclick="location.href='profile.html?id=${post.userId}'">
            <img src="${userData.avatar || 'images/profile.png'}" class="user-avatar">
            <div class="post-info">
                <span class="display-name">${userData.displayName || userData.username || 'مستخدم'}</span>
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

// تبديل الإعجاب
window.toggleLike = async (postId, btnElement) => {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const likeRef = database.ref(`likes/${postId}/${user.uid}`);
        const snapshot = await likeRef.once('value');
        const postRef = database.ref(`posts/${postId}`);
        const postSnapshot = await postRef.once('value');
        const post = postSnapshot.val();
        
        if (snapshot.exists()) {
            // إزالة الإعجاب
            await likeRef.remove();
            await postRef.update({ likes: (post.likes || 1) - 1 });
            btnElement.classList.remove('active');
            btnElement.querySelector('i').className = 'fa-regular fa-heart';
        } else {
            // إضافة إعجاب
            await likeRef.set({
                userId: user.uid,
                timestamp: Date.now()
            });
            await postRef.update({ likes: (post.likes || 0) + 1 });
            btnElement.classList.add('active');
            btnElement.querySelector('i').className = 'fa-solid fa-heart';
            
            // تشغيل صوت اللايك
            playSound('like');
            
            // إرسال إشعار لصاحب المنشور (إذا كان مختلفاً)
            if (post.userId !== user.uid) {
                await database.ref(`notifications/${post.userId}`).push({
                    type: 'like',
                    postId: postId,
                    userId: user.uid,
                    timestamp: Date.now(),
                    read: false
                });
                
                // تحديث النقطة الحمراء في الهيدر
                updateNotificationDot();
            }
        }
        
        // تحديث عدد الإعجابات في العنصر
        const likeCountSpan = btnElement.nextElementSibling;
        likeCountSpan.textContent = parseInt(likeCountSpan.textContent) + (snapshot.exists() ? -1 : 1);
        
    } catch (error) {
        console.error('Error toggling like:', error);
        showMessage('حدث خطأ', true);
    }
};

// توليد بطاقات skeleton
function generateSkeletonCards(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="post-card skeleton-card">
                <div class="post-header">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="post-info">
                        <div class="skeleton skeleton-text" style="width: 100px;"></div>
                        <div class="skeleton skeleton-text" style="width: 60px;"></div>
                    </div>
                </div>
                <div class="skeleton skeleton-media"></div>
            </div>
        `;
    }
    return html;
}

// التحميل عند التمرير
window.addEventListener('scroll', () => {
    const trigger = document.getElementById('load-more-trigger');
    if (!trigger) return;
    
    const rect = trigger.getBoundingClientRect();
    if (rect.top <= window.innerHeight && !loading && !allPostsLoaded) {
        loadPosts(true);
    }
});

// تحديث نقطة الإشعارات
async function updateNotificationDot() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const snapshot = await database.ref(`notifications/${user.uid}`)
            .orderByChild('read')
            .equalTo(false)
            .limitToFirst(1)
            .once('value');
        
        const dot = document.getElementById('not-dot');
        if (dot) {
            dot.style.display = snapshot.exists() ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}

// بدء التحميل
auth.onAuthStateChanged((user) => {
    if (user) {
        loadPosts(false);
        updateNotificationDot();
    } else {
        window.location.href = 'index.html';
    }
});