(function () {
    const chat = document.querySelector('.chat-container');
    const closeBtn = document.querySelector('.chat-close');
    const launcher = document.getElementById('chatLauncher');
    if (!chat) return;

    function closeChat() {
        chat.classList.add('closed');
        try {
            localStorage.setItem('unlayrChatOpen', '0');
        } catch (e) {
            /* ignore storage errors */
        }
        if (launcher) launcher.classList.remove('hidden');
    }

    function openChat() {
        chat.classList.remove('closed');
        try {
            localStorage.setItem('unlayrChatOpen', '1');
        } catch (e) {
            /* ignore storage errors */
        }
        if (launcher) launcher.classList.add('hidden');
        // focus the input for convenience when chat opens
        const input = document.getElementById('messageInput');
        if (input) input.focus();
    }

    if (closeBtn) closeBtn.addEventListener('click', closeChat);
    if (launcher) launcher.addEventListener('click', openChat);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !chat.classList.contains('closed')) {
            closeChat();
        }
    });

    let shouldOpen = true;
    try {
        shouldOpen = localStorage.getItem('unlayrChatOpen') !== '0';
    } catch (e) {
        shouldOpen = true;
    }

    if (shouldOpen) {
        openChat();
    } else {
        closeChat();
    }
})();
