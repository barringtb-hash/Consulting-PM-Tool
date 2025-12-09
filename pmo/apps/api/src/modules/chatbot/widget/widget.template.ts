/**
 * Chatbot Widget Template
 *
 * This generates the embeddable JavaScript widget code that customers
 * can add to their websites via a simple script tag.
 */

export interface WidgetConfig {
  configId: number;
  apiBaseUrl: string;
  name: string;
  welcomeMessage: string;
  position: string;
  primaryColor: string;
  textColor: string;
  bubbleIcon: string;
  title: string | null;
  subtitle: string | null;
  avatarUrl: string | null;
  customCss: string | null;
}

/**
 * Generates the widget JavaScript code as a string
 */
export function generateWidgetScript(config: WidgetConfig): string {
  const widgetCode = `
(function() {
  'use strict';

  // Widget Configuration
  var CONFIG = {
    configId: ${config.configId},
    apiBaseUrl: '${config.apiBaseUrl}',
    name: '${escapeString(config.name)}',
    welcomeMessage: '${escapeString(config.welcomeMessage)}',
    position: '${config.position}',
    primaryColor: '${config.primaryColor}',
    textColor: '${config.textColor}',
    bubbleIcon: '${config.bubbleIcon}',
    title: ${config.title ? `'${escapeString(config.title)}'` : 'null'},
    subtitle: ${config.subtitle ? `'${escapeString(config.subtitle)}'` : 'null'},
    avatarUrl: ${config.avatarUrl ? `'${escapeString(config.avatarUrl)}'` : 'null'},
    customCss: ${config.customCss ? `'${escapeString(config.customCss)}'` : 'null'}
  };

  // State
  var state = {
    isOpen: false,
    sessionId: null,
    messages: [],
    isLoading: false,
    customerInfo: {}
  };

  // Icons as SVG strings
  var ICONS = {
    chat: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>',
    message: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    support: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="14.83" y1="9.17" x2="18.36" y2="5.64"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>',
    close: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    send: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    bot: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>',
    user: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  };

  // Styles
  var STYLES = \`
    .pmo-chatbot-widget * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }

    .pmo-chatbot-bubble {
      position: fixed;
      \${CONFIG.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: \${CONFIG.primaryColor};
      color: \${CONFIG.textColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 999998;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .pmo-chatbot-bubble:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }

    .pmo-chatbot-bubble svg {
      width: 28px;
      height: 28px;
    }

    .pmo-chatbot-container {
      position: fixed;
      \${CONFIG.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      bottom: 90px;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
    }

    .pmo-chatbot-container.open {
      display: flex;
    }

    .pmo-chatbot-header {
      background: \${CONFIG.primaryColor};
      color: \${CONFIG.textColor};
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .pmo-chatbot-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pmo-chatbot-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .pmo-chatbot-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .pmo-chatbot-avatar svg {
      width: 20px;
      height: 20px;
    }

    .pmo-chatbot-title {
      font-weight: 600;
      font-size: 16px;
      margin: 0;
    }

    .pmo-chatbot-subtitle {
      font-size: 12px;
      opacity: 0.8;
      margin: 2px 0 0;
    }

    .pmo-chatbot-close {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 4px;
      display: flex;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    .pmo-chatbot-close:hover {
      opacity: 1;
    }

    .pmo-chatbot-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .pmo-chatbot-message {
      display: flex;
      gap: 8px;
      max-width: 85%;
    }

    .pmo-chatbot-message.customer {
      flex-direction: row-reverse;
      margin-left: auto;
    }

    .pmo-chatbot-message-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pmo-chatbot-message.customer .pmo-chatbot-message-avatar {
      background: \${CONFIG.primaryColor};
      color: \${CONFIG.textColor};
    }

    .pmo-chatbot-message-content {
      padding: 10px 14px;
      border-radius: 16px;
      background: #f3f4f6;
      color: #1f2937;
      font-size: 14px;
      line-height: 1.4;
    }

    .pmo-chatbot-message.customer .pmo-chatbot-message-content {
      background: \${CONFIG.primaryColor};
      color: \${CONFIG.textColor};
      border-bottom-right-radius: 4px;
    }

    .pmo-chatbot-message.bot .pmo-chatbot-message-content {
      border-bottom-left-radius: 4px;
    }

    .pmo-chatbot-suggested-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 16px 16px;
    }

    .pmo-chatbot-action-btn {
      padding: 8px 14px;
      border: 1px solid \${CONFIG.primaryColor};
      background: transparent;
      color: \${CONFIG.primaryColor};
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .pmo-chatbot-action-btn:hover {
      background: \${CONFIG.primaryColor};
      color: \${CONFIG.textColor};
    }

    .pmo-chatbot-input-area {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }

    .pmo-chatbot-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #d1d5db;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .pmo-chatbot-input:focus {
      border-color: \${CONFIG.primaryColor};
    }

    .pmo-chatbot-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: \${CONFIG.primaryColor};
      color: \${CONFIG.textColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }

    .pmo-chatbot-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pmo-chatbot-typing {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: #f3f4f6;
      border-radius: 16px;
      width: fit-content;
    }

    .pmo-chatbot-typing-dot {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: pmo-typing 1.4s infinite;
    }

    .pmo-chatbot-typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .pmo-chatbot-typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes pmo-typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }

    .pmo-chatbot-powered {
      padding: 8px;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
    }

    \${CONFIG.customCss || ''}
  \`;

  // Helper to escape strings for JS
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Inject styles
  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // Create widget DOM
  function createWidget() {
    var wrapper = document.createElement('div');
    wrapper.className = 'pmo-chatbot-widget';

    // Chat bubble button
    var bubble = document.createElement('button');
    bubble.className = 'pmo-chatbot-bubble';
    bubble.innerHTML = ICONS[CONFIG.bubbleIcon] || ICONS.chat;
    bubble.onclick = toggleChat;

    // Chat container
    var container = document.createElement('div');
    container.className = 'pmo-chatbot-container';
    container.id = 'pmo-chatbot-container';

    // Header
    var header = document.createElement('div');
    header.className = 'pmo-chatbot-header';
    header.innerHTML = \`
      <div class="pmo-chatbot-header-info">
        <div class="pmo-chatbot-avatar">
          \${CONFIG.avatarUrl ? '<img src="' + CONFIG.avatarUrl + '" alt="Bot">' : ICONS.bot}
        </div>
        <div>
          <h3 class="pmo-chatbot-title">\${escapeHtml(CONFIG.title || CONFIG.name)}</h3>
          \${CONFIG.subtitle ? '<p class="pmo-chatbot-subtitle">' + escapeHtml(CONFIG.subtitle) + '</p>' : ''}
        </div>
      </div>
      <button class="pmo-chatbot-close" onclick="window.PMOChatbot.toggle()">\${ICONS.close}</button>
    \`;

    // Messages area
    var messages = document.createElement('div');
    messages.className = 'pmo-chatbot-messages';
    messages.id = 'pmo-chatbot-messages';

    // Suggested actions
    var actions = document.createElement('div');
    actions.className = 'pmo-chatbot-suggested-actions';
    actions.id = 'pmo-chatbot-actions';

    // Input area
    var inputArea = document.createElement('div');
    inputArea.className = 'pmo-chatbot-input-area';
    inputArea.innerHTML = \`
      <input type="text" class="pmo-chatbot-input" id="pmo-chatbot-input" placeholder="Type a message...">
      <button class="pmo-chatbot-send" id="pmo-chatbot-send">\${ICONS.send}</button>
    \`;

    // Powered by
    var powered = document.createElement('div');
    powered.className = 'pmo-chatbot-powered';
    powered.textContent = 'Powered by AI Chatbot';

    // Assemble
    container.appendChild(header);
    container.appendChild(messages);
    container.appendChild(actions);
    container.appendChild(inputArea);
    container.appendChild(powered);

    wrapper.appendChild(bubble);
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);

    // Event listeners
    var input = document.getElementById('pmo-chatbot-input');
    var sendBtn = document.getElementById('pmo-chatbot-send');

    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener('click', sendMessage);
  }

  // Toggle chat visibility
  function toggleChat() {
    var container = document.getElementById('pmo-chatbot-container');
    state.isOpen = !state.isOpen;
    if (state.isOpen) {
      container.classList.add('open');
      if (!state.sessionId) {
        startConversation();
      }
      document.getElementById('pmo-chatbot-input').focus();
    } else {
      container.classList.remove('open');
    }
  }

  // Start a new conversation
  function startConversation() {
    fetch(CONFIG.apiBaseUrl + '/chatbot/' + CONFIG.configId + '/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'WEB',
        customerEmail: state.customerInfo.email,
        customerName: state.customerInfo.name
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.conversation) {
        state.sessionId = data.conversation.sessionId;
        // Add welcome message
        addMessage({
          sender: 'BOT',
          content: CONFIG.welcomeMessage
        });
      }
    })
    .catch(function(err) {
      console.error('PMO Chatbot: Failed to start conversation', err);
      addMessage({
        sender: 'BOT',
        content: 'Sorry, I\\'m having trouble connecting. Please try again later.'
      });
    });
  }

  // Add a message to the UI
  function addMessage(message) {
    state.messages.push(message);
    renderMessages();
  }

  // Render all messages
  function renderMessages() {
    var container = document.getElementById('pmo-chatbot-messages');
    container.innerHTML = '';

    state.messages.forEach(function(msg) {
      var div = document.createElement('div');
      div.className = 'pmo-chatbot-message ' + (msg.sender === 'CUSTOMER' ? 'customer' : 'bot');
      div.innerHTML = \`
        <div class="pmo-chatbot-message-avatar">
          \${msg.sender === 'CUSTOMER' ? ICONS.user : (CONFIG.avatarUrl ? '<img src="' + CONFIG.avatarUrl + '" alt="" style="width:100%;height:100%;object-fit:cover;">' : ICONS.bot)}
        </div>
        <div class="pmo-chatbot-message-content">\${escapeHtml(msg.content)}</div>
      \`;
      container.appendChild(div);
    });

    // Show loading indicator
    if (state.isLoading) {
      var loading = document.createElement('div');
      loading.className = 'pmo-chatbot-message bot';
      loading.innerHTML = \`
        <div class="pmo-chatbot-message-avatar">\${ICONS.bot}</div>
        <div class="pmo-chatbot-typing">
          <div class="pmo-chatbot-typing-dot"></div>
          <div class="pmo-chatbot-typing-dot"></div>
          <div class="pmo-chatbot-typing-dot"></div>
        </div>
      \`;
      container.appendChild(loading);
    }

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  // Render suggested actions
  function renderActions(actions) {
    var container = document.getElementById('pmo-chatbot-actions');
    container.innerHTML = '';

    if (!actions || actions.length === 0) return;

    actions.forEach(function(action) {
      var btn = document.createElement('button');
      btn.className = 'pmo-chatbot-action-btn';
      btn.textContent = action.label;
      btn.onclick = function() {
        sendMessage(action.label);
      };
      container.appendChild(btn);
    });
  }

  // Send a message
  function sendMessage(text) {
    var input = document.getElementById('pmo-chatbot-input');
    var message = text || input.value.trim();

    if (!message || state.isLoading || !state.sessionId) return;

    // Clear input
    if (!text) input.value = '';

    // Add customer message
    addMessage({
      sender: 'CUSTOMER',
      content: message
    });

    // Show loading
    state.isLoading = true;
    renderMessages();

    // Clear actions
    renderActions([]);

    // Send to API
    fetch(CONFIG.apiBaseUrl + '/chatbot/conversations/' + state.sessionId + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        customerEmail: state.customerInfo.email,
        customerName: state.customerInfo.name
      })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      state.isLoading = false;
      if (data.botResponse) {
        addMessage({
          sender: 'BOT',
          content: data.botResponse.content
        });
        if (data.botResponse.suggestedActions) {
          renderActions(data.botResponse.suggestedActions);
        }
      }
    })
    .catch(function(err) {
      state.isLoading = false;
      console.error('PMO Chatbot: Failed to send message', err);
      addMessage({
        sender: 'BOT',
        content: 'Sorry, I\\'m having trouble responding. Please try again.'
      });
      renderMessages();
    });
  }

  // Public API
  window.PMOChatbot = {
    toggle: toggleChat,
    open: function() {
      if (!state.isOpen) toggleChat();
    },
    close: function() {
      if (state.isOpen) toggleChat();
    },
    setCustomerInfo: function(info) {
      state.customerInfo = info || {};
    },
    sendMessage: sendMessage
  };

  // Initialize
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        injectStyles();
        createWidget();
      });
    } else {
      injectStyles();
      createWidget();
    }
  }

  init();
})();
`;

  return widgetCode;
}

/**
 * Escapes special characters for embedding in JS strings
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
