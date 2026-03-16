// js/find.js
// البحث عن المستخدمين في Realtime Database

const searchInput = document.getElementById('user-search');
const resultsContainer = document.getElementById('search-results');
const loadingSpinner = document.getElementById('loading-spinner');

let searchTimeout = null;

// البحث عند الكتابة
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    // إلغاء الطلب السابق
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length < 3) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    // تأخير البحث لتجنب الطلبات المتكررة
    searchTimeout = setTimeout(() => {
        performSearch(query);
    }, 500);
});

// تنفيذ البحث
async function performSearch(query) {
    loadingSpinner.style.display = 'block';
    resultsContainer.innerHTML = '';
    
    try {
        // الحصول على جميع المستخدمين (Realtime Database لا يدعم البحث النصي الكامل)
        const snapshot = await database.ref('users').once('value');
        
        const users = [];
        snapshot.forEach((child) => {
            const user = child.val();
            // البحث في اسم المستخدم والاسم المعروض
            if (user.username.toLowerCase().includes(query) || 
                (user.displayName && user.displayName.toLowerCase().includes(query))) {
                users.push(user);
            }
        });
        
        loadingSpinner.style.display = 'none';
        
        if (users.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">لا توجد نتائج</div>';
            return;
        }
        
        // عرض النتائج
        users.forEach(user => {
            const resultItem = document.createElement('a');
            resultItem.href = `profile.html?id=${user.uid}`;
            resultItem.className = 'user-result-item';
            
            resultItem.innerHTML = `
                <img src="${user.avatar || 'images/profile.png'}" class="result-avatar">
                <div class="result-info">
                    <span class="result-display-name">${user.displayName || user.username}</span>
                    <span class="result-username">@${user.username}</span>
                </div>
            `;
            
            resultsContainer.appendChild(resultItem);
        });
        
    } catch (error) {
        console.error('Error searching users:', error);
        loadingSpinner.style.display = 'none';
        resultsContainer.innerHTML = '<div class="no-results">حدث خطأ في البحث</div>';
    }
}

// التحقق من تسجيل الدخول
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'index.html';
    }
});