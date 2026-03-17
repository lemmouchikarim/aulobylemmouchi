// ==================== js/firebase-config.js ====================
// تهيئة Firebase مع تخزين مؤقت - نسخة كاملة

const firebaseConfig = {
    apiKey: "AIzaSyBZj9QplNw-VmwSl8Ijv_b6nIi4ghcHDms",
    authDomain: "aulobylemmouchi.firebaseapp.com",
    databaseURL: "https://aulobylemmouchi-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "aulobylemmouchi",
    storageBucket: "aulobylemmouchi.firebasestorage.app",
    messagingSenderId: "63959796567",
    appId: "1:63959796567:web:5cb2b14ca64cc01b6d4c12"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// ==================== نظام التخزين المؤقت المتقدم ====================
class CacheManager {
    constructor(ttlMinutes = 5) {
        this.cache = new Map();
        this.ttl = ttlMinutes * 60 * 1000; // تحويل إلى ميلي ثانية
        this.pending = new Map(); // للطلبات المعلقة
    }

    // جلب من الكاش أو تنفيذ الدالة
    async get(key, fetcher) {
        // التحقق من وجود في الكاش
        if (this.cache.has(key)) {
            const item = this.cache.get(key);
            if (Date.now() - item.timestamp < this.ttl) {
                return item.data;
            }
            this.cache.delete(key);
        }

        // إذا كان هناك طلب معلق لنفس المفتاح
        if (this.pending.has(key)) {
            return this.pending.get(key);
        }

        // تنفيذ الطلب
        const promise = fetcher().then(data => {
            this.cache.set(key, {
                data,
                timestamp: Date.now()
            });
            this.pending.delete(key);
            return data;
        }).catch(error => {
            this.pending.delete(key);
            throw error;
        });

        this.pending.set(key, promise);
        return promise;
    }

    // حذف عنصر من الكاش
    delete(key) {
        this.cache.delete(key);
    }

    // تفريغ الكاش
    clear() {
        this.cache.clear();
        this.pending.clear();
    }

    // حذف عناصر معينة (مثلاً كل ما يخص مستخدم)
    deletePattern(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
}

// ==================== مخازن مؤقتة ====================
const userCache = new CacheManager(5); // 5 دقائق للمستخدمين
const postCache = new CacheManager(3); // 3 دقائق للمنشورات
const chatCache = new CacheManager(2); // دقيقتين للمحادثات

// ==================== دوال المستخدمين المحسنة ====================
async function getUser(uid) {
    if (!uid) return null;
    
    return userCache.get(`user_${uid}`, async () => {
        const snapshot = await database.ref(`users/${uid}`).once('value');
        return snapshot.val() || null;
    });
}

async function getUsers(uids) {
    const uniqueUids = [...new Set(uids)];
    return Promise.all(uniqueUids.map(uid => getUser(uid)));
}

async function updateUser(uid, data) {
    userCache.delete(`user_${uid}`);
    return database.ref(`users/${uid}`).update(data);
}

// ==================== دوال المنشورات المحسنة ====================
async function getPosts(limit = 10, startFrom = null) {
    let query = database.ref('posts')
        .orderByChild('timestamp')
        .limitToLast(limit);
    
    if (startFrom) {
        query = query.endAt(startFrom);
    }
    
    const cacheKey = `posts_${limit}_${startFrom || 'first'}`;
    
    return postCache.get(cacheKey, async () => {
        const snapshot = await query.once('value');
        const posts = [];
        snapshot.forEach(child => posts.push({ id: child.key, ...child.val() }));
        return posts.reverse();
    });
}

async function getUserPosts(userId, limit = 10) {
    const cacheKey = `user_posts_${userId}_${limit}`;
    
    return postCache.get(cacheKey, async () => {
        const snapshot = await database.ref('posts')
            .orderByChild('userId')
            .equalTo(userId)
            .limitToLast(limit)
            .once('value');
        
        const posts = [];
        snapshot.forEach(child => posts.push({ id: child.key, ...child.val() }));
        return posts.reverse();
    });
}

async function addPost(postData) {
    const postRef = database.ref('posts').push();
    const postId = postRef.key;
    
    await postRef.set({
        id: postId,
        ...postData,
        timestamp: Date.now(),
        likes: 0,
        comments: 0
    });
    
    // تحديث عدد منشورات المستخدم
    const userRef = database.ref(`users/${postData.userId}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val() || {};
    await userRef.update({
        postsCount: (userData.postsCount || 0) + 1
    });
    
    // مسح الكاش
    postCache.deletePattern('user_posts');
    postCache.deletePattern('posts');
    
    return postId;
}

async function deletePost(postId, userId) {
    await database.ref(`posts/${postId}`).remove();
    await database.ref(`likes/${postId}`).remove();
    
    // تحديث عدد منشورات المستخدم
    const userRef = database.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val() || {};
    await userRef.update({
        postsCount: Math.max(0, (userData.postsCount || 1) - 1)
    });
    
    // مسح الكاش
    postCache.deletePattern('user_posts');
    postCache.deletePattern('posts');
}

// ==================== دوال الإعجابات المحسنة ====================
async function toggleLike(postId, userId) {
    const likeRef = database.ref(`likes/${postId}/${userId}`);
    const snapshot = await likeRef.once('value');
    const exists = snapshot.exists();
    
    if (exists) {
        await likeRef.remove();
        await database.ref(`posts/${postId}/likes`).transaction(current => (current || 1) - 1);
    } else {
        await likeRef.set({ timestamp: Date.now() });
        await database.ref(`posts/${postId}/likes`).transaction(current => (current || 0) + 1);
    }
    
    // مسح الكاش
    postCache.deletePattern('posts');
    
    return !exists;
}

async function checkIfLiked(postId, userId) {
    if (!userId) return false;
    const snapshot = await database.ref(`likes/${postId}/${userId}`).once('value');
    return snapshot.exists();
}

// ==================== دوال المحادثات المحسنة ====================
async function getChatMessages(chatId, limit = 50) {
    const cacheKey = `chat_${chatId}_${limit}`;
    
    return chatCache.get(cacheKey, async () => {
        const snapshot = await database.ref(`messages/${chatId}`)
            .orderByChild('timestamp')
            .limitToLast(limit)
            .once('value');
        
        const messages = [];
        snapshot.forEach(child => messages.push({ id: child.key, ...child.val() }));
        return messages;
    });
}

async function sendMessage(chatId, messageData) {
    const messageRef = database.ref(`messages/${chatId}`).push();
    const messageId = messageRef.key;
    
    await messageRef.set({
        id: messageId,
        ...messageData,
        timestamp: Date.now(),
        read: false
    });
    
    await database.ref(`chats/${chatId}`).update({
        lastMessage: messageData.type === 'text' ? messageData.content : '📎 وسائط',
        lastMessageTime: Date.now(),
        lastSenderId: messageData.senderId
    });
    
    // مسح كاش المحادثة
    chatCache.deletePattern(chatId);
    
    return messageId;
}

// ==================== دوال المتابعة المحسنة ====================
async function followUser(currentUserId, targetUserId) {
    await database.ref(`followers/${targetUserId}/${currentUserId}`).set({
        timestamp: Date.now()
    });
    
    await database.ref(`following/${currentUserId}/${targetUserId}`).set({
        timestamp: Date.now()
    });
    
    // مسح كاش المستخدمين
    userCache.delete(`user_${currentUserId}`);
    userCache.delete(`user_${targetUserId}`);
}

async function unfollowUser(currentUserId, targetUserId) {
    await database.ref(`followers/${targetUserId}/${currentUserId}`).remove();
    await database.ref(`following/${currentUserId}/${targetUserId}`).remove();
    
    // مسح كاش المستخدمين
    userCache.delete(`user_${currentUserId}`);
    userCache.delete(`user_${targetUserId}`);
}

async function getFollowersCount(userId) {
    const snapshot = await database.ref(`followers/${userId}`).once('value');
    return snapshot.exists() ? snapshot.numChildren() : 0;
}

async function getFollowingCount(userId) {
    const snapshot = await database.ref(`following/${userId}`).once('value');
    return snapshot.exists() ? snapshot.numChildren() : 0;
}

// ==================== دوال الإشعارات المحسنة ====================
async function getNotifications(userId, limit = 30) {
    const snapshot = await database.ref(`notifications/${userId}`)
        .orderByChild('timestamp')
        .limitToLast(limit)
        .once('value');
    
    const notifications = [];
    snapshot.forEach(child => notifications.push({ id: child.key, ...child.val() }));
    return notifications.reverse();
}

async function markNotificationAsRead(userId, notificationId) {
    await database.ref(`notifications/${userId}/${notificationId}`).update({
        read: true
    });
}

async function markAllNotificationsAsRead(userId) {
    const snapshot = await database.ref(`notifications/${userId}`)
        .orderByChild('read')
        .equalTo(false)
        .once('value');
    
    const updates = {};
    snapshot.forEach(child => {
        updates[`notifications/${userId}/${child.key}/read`] = true;
    });
    
    if (Object.keys(updates).length > 0) {
        await database.ref().update(updates);
    }
}

async function getUnreadNotificationsCount(userId) {
    const snapshot = await database.ref(`notifications/${userId}`)
        .orderByChild('read')
        .equalTo(false)
        .once('value');
    
    return snapshot.exists() ? snapshot.numChildren() : 0;
}

// ==================== دوال الحظر المحسنة ====================
async function blockUser(currentUserId, targetUserId) {
    // حذف المتابعة المتبادلة
    await database.ref(`followers/${targetUserId}/${currentUserId}`).remove();
    await database.ref(`followers/${currentUserId}/${targetUserId}`).remove();
    await database.ref(`following/${targetUserId}/${currentUserId}`).remove();
    await database.ref(`following/${currentUserId}/${targetUserId}`).remove();
    
    // حذف طلبات المتابعة
    await database.ref(`followRequests/${targetUserId}/${currentUserId}`).remove();
    await database.ref(`followRequests/${currentUserId}/${targetUserId}`).remove();
    
    // إضافة إلى قائمة الحظر
    await database.ref(`blocked/${currentUserId}/${targetUserId}`).set({
        timestamp: Date.now()
    });
    
    // إرسال إشعار
    await database.ref(`notifications/${targetUserId}`).push({
        type: 'blocked',
        userId: currentUserId,
        timestamp: Date.now(),
        read: false
    });
    
    // مسح الكاش
    userCache.delete(`user_${currentUserId}`);
    userCache.delete(`user_${targetUserId}`);
}

async function unblockUser(currentUserId, targetUserId) {
    await database.ref(`blocked/${currentUserId}/${targetUserId}`).remove();
    
    // مسح الكاش
    userCache.delete(`user_${currentUserId}`);
    userCache.delete(`user_${targetUserId}`);
}

async function isBlocked(currentUserId, targetUserId) {
    const snapshot = await database.ref(`blocked/${currentUserId}/${targetUserId}`).once('value');
    return snapshot.exists();
}

async function isBlockedBy(currentUserId, targetUserId) {
    const snapshot = await database.ref(`blocked/${targetUserId}/${currentUserId}`).once('value');
    return snapshot.exists();
}

// ==================== تحديث حالة الاتصال ====================
database.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true && auth.currentUser) {
        const userStatusRef = database.ref(`users/${auth.currentUser.uid}`);
        
        userStatusRef.update({
            online: true,
            lastSeen: Date.now()
        });

        userStatusRef.onDisconnect().update({
            online: false,
            lastSeen: Date.now()
        });
    }
});

// ==================== تصدير الدوال للاستخدام العام ====================
window.db = {
    // المستخدمين
    getUser,
    getUsers,
    updateUser,
    
    // المنشورات
    getPosts,
    getUserPosts,
    addPost,
    deletePost,
    
    // الإعجابات
    toggleLike,
    checkIfLiked,
    
    // المحادثات
    getChatMessages,
    sendMessage,
    
    // المتابعة
    followUser,
    unfollowUser,
    getFollowersCount,
    getFollowingCount,
    
    // الإشعارات
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationsCount,
    
    // الحظر
    blockUser,
    unblockUser,
    isBlocked,
    isBlockedBy,
    
    // الكاش
    clearCache: () => {
        userCache.clear();
        postCache.clear();
        chatCache.clear();
    }
};