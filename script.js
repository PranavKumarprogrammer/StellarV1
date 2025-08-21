document.addEventListener('DOMContentLoaded', function() {
    // --- API Key ---
    const MISTRAL_API_KEY = "Mqi7XO31m9WsymCnEX7jL3tNbglgMTfz";

    // --- Helper: Safe getElement ---
    function $(id) { return document.getElementById(id); }

    // --- Live particles background ---
    function loadParticles() {
        if (typeof particlesJS !== "function") return;
        const color = getComputedStyle(document.body).getPropertyValue('--particle-color').trim() || "#ffffff";
        particlesJS('particles-js', {
            "particles": {
                "number": { "value": 120, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": color },
                "shape": { "type": "circle" },
                "opacity": { "value": 0.5, "random": true, "anim": { "enable": true, "speed": 1, "opacity_min": 0.1, "sync": false } },
                "size": { "value": 3, "random": true, "anim": { "enable": true, "speed": 2, "size_min": 0.1, "sync": false } },
                "line_linked": { "enable": false },
                "move": { "enable": true, "speed": 1, "direction": "none", "random": true, "straight": false, "out_mode": "out", "bounce": false }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": { "enable": true, "mode": "repulse" },
                    "onclick": { "enable": true, "mode": "push" },
                    "resize": true
                }
            },
            "retina_detect": true
        });
    }

    // --- Mistral API call ---
    async function queryMistral(prompt) {
        try {
            const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${MISTRAL_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "mistral-tiny",
                    messages: [{ role: "user", content: prompt }]
                })
            });
            const data = await response.json();
            if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                return data.choices[0].message.content;
            }
            if (data.error && data.error.message) {
                return "Error: " + data.error.message;
            }
            return "No reply from Mistral.";
        } catch (err) {
            return "Error: Could not get reply.";
        }
    }

    // --- Theme logic ---
    const themeToggle = $('themeToggle');
    const themeSelect = $('themeSelect');
    let savedTheme = localStorage.getItem('stellarTheme') || "dark";
    document.body.setAttribute('data-theme', savedTheme);
    if (themeSelect) themeSelect.value = savedTheme;
    setTimeout(loadParticles, 200);

    if (themeToggle && themeSelect) {
        themeToggle.addEventListener('click', function() {
            let nextTheme = themeSelect.value === "dark" ? "light" : "dark";
            themeSelect.value = nextTheme;
            document.body.setAttribute('data-theme', nextTheme);
            localStorage.setItem('stellarTheme', nextTheme);
            setTimeout(loadParticles, 200);
        });
        themeSelect.addEventListener('change', function() {
            document.body.setAttribute('data-theme', this.value);
            localStorage.setItem('stellarTheme', this.value);
            setTimeout(loadParticles, 200);
        });
    }

    // --- Sidebar logic ---
    const sidebarBar = $('sidebarBar');
    const sidebar = $('sidebar');
    const closeSidebar = $('closeSidebar');
    const sidebarTabs = document.querySelectorAll('.sidebar-tab');
    const tabContents = {
        history: $('historyTab'),
        newchat: $('newchatTab'),
        settings: $('settingsTab')
    };
    const sidebarNewChatBtn = $('sidebarNewChatBtn');

    if (sidebarBar && sidebar) {
        sidebarBar.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.add('open');
        });
    }
    if (closeSidebar && sidebar) {
        closeSidebar.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.remove('open');
        });
    }
    document.body.addEventListener('click', function(e) {
        if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== sidebarBar) {
            sidebar.classList.remove('open');
        }
    });

    sidebarTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            sidebarTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            Object.keys(tabContents).forEach(key => {
                if (tabContents[key]) tabContents[key].style.display = key === tab.dataset.tab ? 'block' : 'none';
            });
        });
    });

    // --- Chat history logic ---
    let fullHistory = [];
    let chatHistory = [];
    let showTimestamps = localStorage.getItem('stellarShowTimestamps') !== 'false';
    let autoScrollEnabled = localStorage.getItem('stellarAutoScroll') !== 'false';

    function renderSidebarHistory() {
        if (!tabContents.history) return;
        tabContents.history.innerHTML = '';
        if (fullHistory.length === 0) {
            tabContents.history.innerHTML = '<div style="opacity:0.6;">No history yet.</div>';
            return;
        }
        fullHistory.slice().reverse().forEach((item, idx) => {
            const div = document.createElement('div');
            div.style.marginBottom = '1.2rem';
            div.style.padding = '0.5rem';
            div.style.background = 'var(--accent)';
            div.style.borderRadius = '8px';
            div.style.cursor = 'pointer';
            let timestampHtml = '';
            if (showTimestamps && item.timestamp) {
                timestampHtml = `<div style="font-size:0.8em;opacity:0.5;">${item.timestamp}</div>`;
            }
            div.innerHTML = `<div style="font-weight:500;">${item.query}</div>
                <div style="font-size:0.95em;opacity:0.7;">${item.response.slice(0, 80)}${item.response.length > 80 ? '...' : ''}</div>${timestampHtml}`;
            div.addEventListener('click', () => {
                showHistoryModal(item.query, item.response, item.timestamp);
            });
            tabContents.history.appendChild(div);
        });
    }
    if (sidebarNewChatBtn) {
        sidebarNewChatBtn.addEventListener('click', () => {
            chatHistory.length = 0;
            if ($('responseContent')) $('responseContent').innerHTML = '';
            if (sidebar) sidebar.classList.remove('open');
            if ($('mainContainer')) $('mainContainer').classList.remove('search-active');
            if ($('responseContainer')) $('responseContainer').classList.remove('active');
            renderSidebarHistory();
        });
    }

    // --- Font size setting ---
    const replyFontSizeSlider = $('replyFontSize');
    const replyFontSizeValue = $('replyFontSizeValue');
    const historyModalReply = $('modalReply');
    let savedFontSize = localStorage.getItem('stellarReplyFontSize');
    if (replyFontSizeSlider && replyFontSizeValue) {
        if (savedFontSize) {
            replyFontSizeSlider.value = savedFontSize;
            replyFontSizeValue.textContent = savedFontSize + "px";
            applyReplyFontSize();
        }
        replyFontSizeSlider.addEventListener('input', function() {
            replyFontSizeValue.textContent = this.value + "px";
            localStorage.setItem('stellarReplyFontSize', this.value);
            applyReplyFontSize();
        });
    }
    function applyReplyFontSize() {
        const size = replyFontSizeSlider ? replyFontSizeSlider.value + "px" : "16px";
        document.querySelectorAll('.reply-text').forEach(el => {
            el.style.fontSize = size;
        });
        if (historyModalReply) historyModalReply.style.fontSize = size;
    }

    // --- Cosmic pulse animation toggle ---
    const pulseToggle = $('pulseToggle');
    const logoGroup = document.querySelector('.logo-group');
    if (pulseToggle && logoGroup) {
        if (localStorage.getItem('stellarPulse') === 'false') {
            logoGroup.classList.remove('cosmic-pulse');
            pulseToggle.checked = false;
        }
        pulseToggle.addEventListener('change', function() {
            if (this.checked) {
                logoGroup.classList.add('cosmic-pulse');
                localStorage.setItem('stellarPulse', 'true');
            } else {
                logoGroup.classList.remove('cosmic-pulse');
                localStorage.setItem('stellarPulse', 'false');
            }
        });
    }

    // --- Auto-scroll toggle ---
    const autoScrollToggle = $('autoScrollToggle');
    if (autoScrollToggle) {
        autoScrollToggle.checked = autoScrollEnabled;
        autoScrollToggle.addEventListener('change', function() {
            autoScrollEnabled = this.checked;
            localStorage.setItem('stellarAutoScroll', autoScrollEnabled ? 'true' : 'false');
        });
    }

    // --- Version note ---
    const versionElement = document.querySelector('.version');
    if (versionElement) {
        versionElement.textContent += ' (Beta)';
    }

    // --- Export chat history ---
    const exportHistoryBtn = $('exportHistoryBtn');
    if (exportHistoryBtn) {
        exportHistoryBtn.addEventListener('click', function() {
            if (fullHistory.length === 0) {
                alert("No chat history to export.");
                return;
            }
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullHistory, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", "cosmic_ai_chat_history.json");
            document.body.appendChild(dlAnchorElem);
            dlAnchorElem.click();
            document.body.removeChild(dlAnchorElem);
        });
    }

    // --- Copy last reply ---
    const copyLastReplyBtn = $('copyLastReplyBtn');
    if (copyLastReplyBtn) {
        copyLastReplyBtn.addEventListener('click', function() {
            if (chatHistory.length > 0) {
                navigator.clipboard.writeText(chatHistory[chatHistory.length - 1].response);
                this.textContent = "Copied!";
                setTimeout(() => { this.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 1200);
            } else {
                this.textContent = "No Reply!";
                setTimeout(() => { this.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 1200);
            }
        });
    }

    // --- Reset all settings ---
    const resetSettingsBtn = $('resetSettingsBtn');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', function() {
            if (confirm("Reset all settings to default?")) {
                localStorage.clear();
                location.reload();
            }
        });
    }

    // --- Clear all history ---
    const clearHistoryBtn = $('clearHistoryBtn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', function() {
            if (confirm("Are you sure you want to clear all chat history?")) {
                fullHistory.length = 0;
                chatHistory.length = 0;
                if ($('responseContent')) $('responseContent').innerHTML = '';
                renderSidebarHistory();
                if ($('historyModal')) $('historyModal').style.display = 'none';
            }
        });
    }

    // --- Modal logic ---
    const historyModal = $('historyModal');
    const closeModal = $('closeModal');
    const modalQuestion = $('modalQuestion');
    function showHistoryModal(question, reply, timestamp) {
        if (!modalQuestion || !historyModalReply || !historyModal) return;
        modalQuestion.textContent = "You: " + question + (showTimestamps && timestamp ? ` (${timestamp})` : "");
        historyModalReply.textContent = reply;
        applyReplyFontSize();
        historyModal.style.display = 'flex';
    }
    if (closeModal && historyModal) {
        closeModal.onclick = function() {
            historyModal.style.display = 'none';
        };
    }
    window.onclick = function(event) {
        if (historyModal && event.target === historyModal) {
            historyModal.style.display = 'none';
        }
    };

    // --- Chat input logic ---
    const searchInput = $('searchInput');
    const responseContainer = $('responseContainer');
    const responseContent = $('responseContent');
    const mainContainer = $('mainContainer');
    const newChatBtn = $('newChatBtn');
    let replyLanguage = localStorage.getItem('stellarReplyLanguage') || 'en';
    let typingSpeed = Number(localStorage.getItem('typingSpeed')) || 40;

    function renderChat() {
        if (!responseContent) return;
        responseContent.innerHTML = '';
        chatHistory.forEach(item => {
            const msgDiv = document.createElement('div');
            msgDiv.style.marginBottom = '1.5rem';
            let timestampHtml = '';
            if (showTimestamps && item.timestamp) {
                timestampHtml = `<div style="font-size:0.8em;opacity:0.5;">${item.timestamp}</div>`;
            }
            msgDiv.innerHTML = `<div style="font-weight:500;margin-bottom:4px;">You: ${item.query}</div>
                <div class="reply-text">${item.response}</div>${timestampHtml}`;
            responseContent.appendChild(msgDiv);
        });
        applyReplyFontSize();
        if (autoScrollEnabled && responseContainer) {
            responseContainer.scrollTop = responseContainer.scrollHeight;
        }
    }
    if (searchInput && responseContent && responseContainer && mainContainer) {
        searchInput.addEventListener('keydown', async function(e) {
            if (e.key === 'Enter' && searchInput.value.trim() !== '') {
                mainContainer.classList.add('search-active');
                responseContainer.classList.add('active');
                const userQuery = searchInput.value.trim();
                searchInput.value = '';
                const msgDiv = document.createElement('div');
                msgDiv.style.marginBottom = '1.5rem';
                msgDiv.innerHTML = `<div style="font-weight:500;margin-bottom:4px;">You: ${userQuery}</div>
                    <span class="typing"></span>`;
                responseContent.appendChild(msgDiv);
                responseContainer.scrollTop = responseContainer.scrollHeight;

                // --- Creator-related questions ---
                const creatorQuestions = [
                    "who created you", "who made you", "your creator", "who is your developer", "who built you", "who designed you",
                    "who programmed you", "who is your author", "who is your maker"
                ];
                if (creatorQuestions.some(q => userQuery.toLowerCase().includes(q))) {
                    const customReply = "I am created by Pranav, a professional full stack web developer living in Chandigarh, India.";
                    msgDiv.querySelector('.typing').remove();
                    msgDiv.innerHTML = `<div style="font-weight:500;margin-bottom:4px;">You: ${userQuery}</div>
                        <div class="reply-typing reply-text"></div>`;
                    const replyDiv = msgDiv.querySelector('.reply-typing');
                    typeText(customReply, replyDiv, () => {});
                    const timestamp = new Date().toLocaleString();
                    const chatItem = { query: userQuery, response: customReply, timestamp };
                    chatHistory.push(chatItem);
                    fullHistory.push(chatItem);
                    renderSidebarHistory();
                    applyReplyFontSize();
                    if (autoScrollEnabled && responseContainer) {
                        responseContainer.scrollTop = responseContainer.scrollHeight;
                    }
                    return;
                }

                // --- Language instruction ---
                let languageInstruction = '';
                if (replyLanguage === 'en') languageInstruction = 'Reply in English.';
                else if (replyLanguage === 'hi') languageInstruction = 'Reply in Hindi.';
                else if (replyLanguage === 'es') languageInstruction = 'Reply in Spanish.';

                let prompt = `${languageInstruction}\n${userQuery}`;

                // --- Mistral API ---
                let response = await queryMistral(prompt);

                // --- Filter "Mistral AI" ---
                if (typeof response === "string" && response.toLowerCase().includes("mistral ai")) {
                    response = "I am created by Pranav, a professional full stack web developer living in Chandigarh, India.";
                }
                if (!response || typeof response !== "string") response = "No reply from Mistral.";

                msgDiv.querySelector('.typing').remove();
                msgDiv.innerHTML = `<div style="font-weight:500;margin-bottom:4px;">You: ${userQuery}</div>
                    <div class="reply-typing reply-text"></div>`;
                const replyDiv = msgDiv.querySelector('.reply-typing');
                typeText(response, replyDiv, () => {});
                const timestamp = new Date().toLocaleString();
                const chatItem = { query: userQuery, response: response, timestamp };
                chatHistory.push(chatItem);
                fullHistory.push(chatItem);
                renderSidebarHistory();
                applyReplyFontSize();
                if (autoScrollEnabled && responseContainer) {
                    responseContainer.scrollTop = responseContainer.scrollHeight;
                }
            }
        });
    }
    function typeText(text, element, callback) {
        if (!element) return;
        element.innerHTML = '';
        let i = 0;
        function type() {
            if (i < text.length) {
                element.innerHTML += text[i];
                i++;
                setTimeout(type, typingSpeed);
            } else if (callback) {
                callback();
            }
        }
        type();
    }
    if (newChatBtn && responseContent && mainContainer && responseContainer) {
        newChatBtn.addEventListener('click', () => {
            chatHistory.length = 0;
            responseContent.innerHTML = '';
            mainContainer.classList.remove('search-active');
            responseContainer.classList.remove('active');
            renderSidebarHistory();
            renderChat();
        });
    }

    // --- Music toggle ---
    const musicToggleBtn = $('musicToggleBtn');
    const ambientMusic = $('ambientMusic');
    let isMusicPlaying = false;

    function updateMusicToggleUI() {
        if (!musicToggleBtn) return;
        if (isMusicPlaying) {
            musicToggleBtn.innerHTML = '<i class="fas fa-volume-up"></i> Music On';
        } else {
            musicToggleBtn.innerHTML = '<i class="fas fa-volume-mute"></i> Music Off';
        }
    }

    function toggleMusic() {
        if (!ambientMusic) return;
        if (isMusicPlaying) {
            ambientMusic.pause();
        } else {
            ambientMusic.play().catch(e => console.error("Error playing audio:", e));
        }
        isMusicPlaying = !isMusicPlaying;
        updateMusicToggleUI();
        localStorage.setItem('stellarMusicPlaying', isMusicPlaying);
    }

    if (musicToggleBtn && ambientMusic) {
        musicToggleBtn.addEventListener('click', toggleMusic);
        if (localStorage.getItem('stellarMusicPlaying') === 'true') {
            isMusicPlaying = true;
            ambientMusic.play().catch(e => console.error("Error playing audio:", e));
            updateMusicToggleUI();
        }
    }

    // --- Typing speed setting ---
    const typingSpeedSlider = $('typingSpeed');
    const typingSpeedValue = $('typingSpeedValue');
    if (typingSpeedSlider && typingSpeedValue) {
        typingSpeedSlider.value = typingSpeed;
        typingSpeedValue.textContent = typingSpeed + "ms";
        typingSpeedSlider.oninput = function() {
            typingSpeed = Number(this.value);
            typingSpeedValue.textContent = typingSpeed + "ms";
            localStorage.setItem('typingSpeed', typingSpeed);
        };
    }

    // --- Reply language select ---
    const replyLanguageSelect = $('replyLanguage');
    if (replyLanguageSelect) {
        replyLanguageSelect.value = replyLanguage;
        replyLanguageSelect.addEventListener('change', function() {
            replyLanguage = this.value;
            localStorage.setItem('stellarReplyLanguage', replyLanguage);
        });
    }
});