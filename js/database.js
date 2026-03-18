// js/database.js
// تهيئة Firebase مع Realtime Database

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

// تهيئة Realtime Database
const database = firebase.database();
const auth = firebase.auth();

// تكوين Cloudinary
const uwConfig = {
    cloudName: "daxh9u5dc",
    uploadPreset: "aulobylemmouchi",
    sources: ["local"],
    multiple: true,
    folder: "aulobylemmouchi"
};

// دالة مساعدة لتحويل التاريخ إلى ميلادي للعرض
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// دالة لتشغيل الأصوات
function playSound(soundName) {
    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.play().catch(e => console.log('صوت غير متاح:', e));
}

// دالة عرض الرسائل (Snackbar)
function showMessage(text, isError = false) {
    const msg = document.getElementById('msg');
    if (!msg) return;
    
    msg.style.display = 'block';
    msg.textContent = text;
    msg.style.background = isError ? 'var(--error-color)' : '#333';
    
    setTimeout(() => {
        msg.style.display = 'none';
    }, 3000);
}

// التحقق من حالة المصادقة
auth.onAuthStateChanged((user) => {
    if (user) {
        // تحديث آخر ظهور للمستخدم
        database.ref(`users/${user.uid}/lastSeen`).set(Date.now());
        
        // تحديث حالة الاتصال
        const userStatusRef = database.ref(`users/${user.uid}/online`);
        userStatusRef.set(true);
        
        // عند قطع الاتصال
        userStatusRef.onDisconnect().set(false);
    }
});