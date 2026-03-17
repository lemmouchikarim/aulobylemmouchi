// ==================== js/firebase-config.js ====================
// تهيئة Firebase مع تخزين مؤقت وإشعارات - نسخة كاملة

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

// ==================== نظام الصوت ====================
const AudioManager = {
    sounds: {
        like: new Audio('sounds/like.mp3'),
        not: new Audio('sounds/not.mp3')
    },
    
    play(soundName) {
        const sound = this.sounds[soundName];
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('صوت غير متاح:', e));
        }
    },
    
    isSupported() {
        return !!(window.Audio);
    }
};

// ==================== نظام الإشعارات للهواتف ====================
const NotificationManager = {
    permission: false,
    
    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('هذا المتصفح لا يدعم إشعارات سطح المكتب');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            this.permission = true;
            return true;
        }
        
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.permission = permission === 'granted';
            return this.permission;
        }
        
        return false;
    },
    
    show(title, options = {}) {
        if (!this.permission) return;
        
        const defaultOptions = {
            icon: '/images/l.png',
            badge: '/images/l.png',
            vibrate: [200, 100, 200],
            sound: '/sounds/not.mp3',
            ...options
        };
        
        try {
            const notification = new Notification(title, defaultOptions);
            
            AudioManager.play('not');
            
            if (options.url) {
                notification.onclick = () => {
                    window.focus();
                    if (options.url) window.location.href = options.url;
                };
            }
            
            setTimeout(() => notification.close(), 5000);
            
            return notification;
            
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    },
    
    showNewMessage(senderName, message, chatId) {
        this.show(`💬 ${senderName}`, {
            body: message.length > 50 ? message.substring(0, 47) + '...' : message,
            url: `chat.html?id=${chatId}`,
            tag: `chat-${chatId}`,
            renotify: true
        });
    },
    
    showNewLike(senderName, postId) {
        this.show(`❤️ ${senderName}`, {
            body: 'أعجب بمنشورك',
            url: `main.html?post=${postId}`,
            tag: `like-${postId}`
        });
    },
    
    showNewFollower(senderName) {
        this.show(`👥 ${senderName}`, {
            body: 'بدأ بمتابعتك',
            url: `profile.html?id=${senderName}`,
            tag: 'follower'
        });
    },
    
    showFollowRequest(senderName) {
        this.show(`🔒 ${senderName}`, {
            body: 'يريد متابعتك',
            url: `myprofile.html?tab=requests`,
            tag: 'follow-request'
        });
    }
};

// ==================== نظام التخزين المؤقت المتقدم ====================
class CacheManager {
    constructor(ttlMinutes = 5) {
        this.cache = new Map();
        this.ttl = ttlMinutes * 60 * 1000;
        this.pending = new Map();
    }

    async get(key, fetcher) {
        if (this.cache.has(key)) {
            const item = this.cache.get(key);
            if (Date.now() - item.timestamp < this.ttl) {
                return item.data;
            }
            this.cache.delete(key);
        }

        if (this.pending.has(key)) {
            return this.pending.get(key);
        }

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

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
        this.pending.clear();
    }

    deletePattern(pattern) {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }
}

const userCache = new CacheManager(5);
const postCache = new CacheManager(3);
const chatCache = new CacheManager(2);

// ==================== دوال المستخدمين ====================
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

// ==================== دوال المنشورات ====================
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
    
    const userRef = database.ref(`users/${postData.userId}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val() || {};
    await userRef.update({
        postsCount: (userData.postsCount || 0) + 1
    });
    
    postCache.deletePattern('user_posts');
    postCache.deletePattern('posts');
    
    return postId;
}

async function deletePost(postId, userId) {
    await database.ref(`posts/${postId}`).remove();
    await database.ref(`likes/${postId}`).remove();
    
    const userRef = database.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val() || {};
    await userRef.update({
        postsCount: Math.max(0, (userData.postsCount || 1) - 1)
    });
    
    postCache.deletePattern('user_posts');
    postCache.deletePattern('posts');
}

// ==================== دوال الإعجابات مع الصوت ====================
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
        
        AudioManager.play('like');
        
        const postSnapshot = await database.ref(`posts/${postId}`).once('value');
        const post = postSnapshot.val();
        
        if (post && post.userId !== userId) {
            await addNotification(post.userId, {
                type: 'like',
                userId: userId,
                postId: postId,
                timestamp: Date.now()
            });
            
            const liker = await getUser(userId);
            NotificationManager.showNewLike(
                liker?.displayName || liker?.username || 'مستخدم',
                postId
            );
        }
    }
    
    postCache.deletePattern('posts');
    
    return !exists;
}

async function checkIfLiked(postId, userId) {
    if (!userId) return false;
    const snapshot = await database.ref(`likes/${postId}/${userId}`).once('value');
    return snapshot.exists();
}

// ==================== دوال المحادثات ====================
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
    
    const chatSnapshot = await database.ref(`chats/${chatId}`).once('value');
    const chat = chatSnapshot.val();
    const otherUserId = Object.keys(chat.participants).find(id => id !== messageData.senderId);
    
    if (otherUserId) {
        const sender = await getUser(messageData.senderId);
        const senderName = sender?.displayName || sender?.username || 'مستخدم';
        
        await addNotification(otherUserId, {
            type: 'chat',
            userId: messageData.senderId,
            chatId: chatId,
            message: messageData.type === 'text' ? messageData.content : '📎 وسائط',
            timestamp: Date.now()
        });
        
        NotificationManager.showNewMessage(
            senderName,
            messageData.type === 'text' ? messageData.content : '📎 وسائط',
            chatId
        );
    }
    
    chatCache.deletePattern(chatId);
    
    return messageId;
}

// ==================== دوال المتابعة ====================
async function followUser(currentUserId, targetUserId) {
    await database.ref(`followers/${targetUserId}/${currentUserId}`).set({
        timestamp: Date.now()
    });
    
    await database.ref(`following/${currentUserId}/${targetUserId}`).set({
        timestamp: Date.now()
    });
    
    const follower = await getUser(currentUserId);
    const followerName = follower?.displayName || follower?.username || 'مستخدم';
    
    await addNotification(targetUserId, {
        type: 'follow',
        userId: currentUserId,
        timestamp: Date.now()
    });
    
    NotificationManager.showNewFollower(followerName);
    
    userCache.delete(`user_${currentUserId}`);
    userCache.delete(`user_${targetUserId}`);
}

async function unfollowUser(currentUserId, targetUserId) {
    await database.ref(`followers/${targetUserId}/${currentUserId}`).remove();
    await database.ref(`following/${currentUserId}/${targetUserId}`).remove();
    
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

// ==================== دوال الإشعارات مع الصوت ====================
async function addNotification(userId, notification) {
    const notifRef = database.ref(`notifications/${userId}`).push();
    
    await notifRef.set({
        id: notifRef.key,
        ...notification,
        read: false
    });
    
    AudioManager.play('not');
    
    return notifRef.key;
}

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

// ==================== دوال الحظر ====================
async function blockUser(currentUserId, targetUserId) {
    await database.ref(`followers/${targetUserId}/${currentUserId}`).remove();
    await database.ref(`followers/${currentUserId}/${targetUserId}`).remove();
    await database.ref(`following/${targetUserId}/${currentUserId}`).remove();
    await database.ref(`following/${currentUserId}/${targetUserId}`).remove();
    await database.ref(`followRequests/${targetUserId}/${currentUserId}`).remove();
    await database.ref(`followRequests/${currentUserId}/${targetUserId}`).remove();
    
    await database.ref(`blocked/${currentUserId}/${targetUserId}`).set({
        timestamp: Date.now()
    });
    
    await addNotification(targetUserId, {
        type: 'blocked',
        userId: currentUserId,
        timestamp: Date.now()
    });
    
    userCache.delete(`user_${currentUserId}`);
    userCache.delete(`user_${targetUserId}`);
}

async function unblockUser(currentUserId, targetUserId) {
    await database.ref(`blocked/${currentUserId}/${targetUserId}`).remove();
    
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

// ==================== طلب إذن الإشعارات عند تسجيل الدخول ====================
auth.onAuthStateChanged(user => {
    if (user) {
        NotificationManager.requestPermission();
        
        database.ref(`notifications/${user.uid}`)
            .orderByChild('read')
            .equalTo(false)
            .limitToLast(1)
            .on('child_added', (snapshot) => {
                AudioManager.play('not');
            });
    }
});

// ==================== تصدير الدوال ====================
window.db = {
    getUser,
    getUsers,
    updateUser,
    getPosts,
    getUserPosts,
    addPost,
    deletePost,
    toggleLike,
    checkIfLiked,
    getChatMessages,
    sendMessage,
    followUser,
    unfollowUser,
    getFollowersCount,
    getFollowingCount,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getUnreadNotificationsCount,
    blockUser,
    unblockUser,
    isBlocked,
    isBlockedBy,
    clearCache: () => {
        userCache.clear();
        postCache.clear();
        chatCache.clear();
    },
    playSound: (name) => AudioManager.play(name),
    notify: NotificationManager
};