// ==================== js/chat-offline.js ====================
// نظام التخزين المحلي للمحادثات

const ChatStorage = {
    // حفظ الرسائل محلياً
    saveMessages(chatId, messages) {
        try {
            localStorage.setItem(`chat_${chatId}`, JSON.stringify({
                messages: messages,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.error('فشل في حفظ المحادثة محلياً', e);
        }
    },
    
    // تحميل الرسائل المحفوظة
    getMessages(chatId) {
        try {
            const data = localStorage.getItem(`chat_${chatId}`);
            if (data) {
                const parsed = JSON.parse(data);
                // تجاهل الرسائل الأقدم من 7 أيام
                if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
                    return parsed.messages;
                }
            }
        } catch (e) {
            console.error('فشل في تحميل المحادثة المحفوظة', e);
        }
        return null;
    },
    
    // إضافة رسالة جديدة
    addMessage(chatId, message) {
        const messages = this.getMessages(chatId) || [];
        messages.push(message);
        this.saveMessages(chatId, messages);
    },
    
    // مسح محادثة قديمة
    clearChat(chatId) {
        localStorage.removeItem(`chat_${chatId}`);
    },
    
    // مسح المحادثات الأقدم من أسبوع
    cleanOldChats() {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('chat_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.timestamp < oneWeekAgo) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {}
            }
        }
    }
};

// تنظيف المحادثات القديمة عند التحميل
ChatStorage.cleanOldChats();