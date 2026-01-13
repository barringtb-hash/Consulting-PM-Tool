/**
 * Chatbot Widget Router
 *
 * Serves the embeddable widget script and handles widget-related endpoints.
 * These endpoints are public (no auth required) for external website integration.
 */

import { Router, Request, Response } from 'express';
import { generateWidgetScript, WidgetConfig } from './widget.template';
import { env } from '../../../config/env';
import prisma from '../../../prisma/client';

const router = Router();

/**
 * GET /api/chatbot/widget/:configId.js
 * Serves the embeddable widget JavaScript for a specific chatbot configuration.
 *
 * This is a public endpoint - no authentication required.
 * The widget itself handles conversation creation via public API endpoints.
 */
router.get(
  '/chatbot/widget/:configId.js',
  async (req: Request<{ configId: string }>, res: Response) => {
    const configId = parseInt(String(req.params.configId), 10);

    if (isNaN(configId)) {
      res.status(400).send('// Invalid config ID');
      return;
    }

    try {
      // Fetch the chatbot configuration
      const config = await prisma.chatbotConfig.findUnique({
        where: { id: configId },
        select: {
          id: true,
          name: true,
          welcomeMessage: true,
          isActive: true,
          widgetPosition: true,
          widgetPrimaryColor: true,
          widgetTextColor: true,
          widgetBubbleIcon: true,
          widgetTitle: true,
          widgetSubtitle: true,
          widgetAvatarUrl: true,
          widgetAllowedDomains: true,
          widgetCustomCss: true,
        },
      });

      if (!config) {
        res.status(404).send('// Chatbot configuration not found');
        return;
      }

      if (!config.isActive) {
        res.status(403).send('// Chatbot is currently inactive');
        return;
      }

      // Check domain restrictions if configured
      const origin = req.get('origin') || req.get('referer');
      if (config.widgetAllowedDomains && origin) {
        const allowedDomains = config.widgetAllowedDomains
          .split(',')
          .map((d) => d.trim().toLowerCase());

        const requestDomain = extractDomain(origin);
        const isAllowed = allowedDomains.some(
          (allowed) =>
            requestDomain === allowed ||
            requestDomain.endsWith('.' + allowed) ||
            allowed === '*',
        );

        if (!isAllowed) {
          res
            .status(403)
            .send(
              '// This widget is not authorized for use on this domain: ' +
                requestDomain,
            );
          return;
        }
      }

      // Determine API base URL
      // In production, use the configured CORS origin or request origin
      // In development, use localhost
      let apiBaseUrl = env.corsOrigin || 'http://localhost:3001';
      if (apiBaseUrl.includes(',')) {
        // If multiple origins, use the first one
        apiBaseUrl = apiBaseUrl.split(',')[0].trim();
      }
      // Ensure we're pointing to the API, not the frontend
      if (
        !apiBaseUrl.includes(':3001') &&
        !apiBaseUrl.includes('/api') &&
        env.nodeEnv === 'development'
      ) {
        apiBaseUrl = 'http://localhost:3001';
      }
      apiBaseUrl = apiBaseUrl.replace(/\/$/, '') + '/api';

      // Generate widget configuration
      const widgetConfig: WidgetConfig = {
        configId: config.id,
        apiBaseUrl,
        name: config.name,
        welcomeMessage:
          config.welcomeMessage ||
          `Hi! I'm ${config.name}. How can I help you today?`,
        position: config.widgetPosition || 'bottom-right',
        primaryColor: config.widgetPrimaryColor || '#3B82F6',
        textColor: config.widgetTextColor || '#FFFFFF',
        bubbleIcon: config.widgetBubbleIcon || 'chat',
        title: config.widgetTitle,
        subtitle: config.widgetSubtitle,
        avatarUrl: sanitizeImageUrl(config.widgetAvatarUrl),
        customCss: config.widgetCustomCss,
      };

      // Generate the widget script
      const script = generateWidgetScript(widgetConfig);

      // Set appropriate headers for JavaScript
      res.set({
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'X-Content-Type-Options': 'nosniff',
      });

      res.send(script);
    } catch (error) {
      console.error('Widget generation error:', error);
      res.status(500).send('// Error generating widget');
    }
  },
);

/**
 * GET /api/chatbot/widget/:configId/config
 * Returns the widget configuration as JSON.
 * Useful for custom integrations that don't want the full widget script.
 */
router.get(
  '/chatbot/widget/:configId/config',
  async (req: Request<{ configId: string }>, res: Response) => {
    const configId = parseInt(String(req.params.configId), 10);

    if (isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    try {
      const config = await prisma.chatbotConfig.findUnique({
        where: { id: configId },
        select: {
          id: true,
          name: true,
          welcomeMessage: true,
          fallbackMessage: true,
          isActive: true,
          enableOrderTracking: true,
          enableReturns: true,
          enableFAQ: true,
          enableHumanHandoff: true,
          widgetPosition: true,
          widgetPrimaryColor: true,
          widgetTextColor: true,
          widgetBubbleIcon: true,
          widgetTitle: true,
          widgetSubtitle: true,
          widgetAvatarUrl: true,
        },
      });

      if (!config) {
        res.status(404).json({ error: 'Chatbot configuration not found' });
        return;
      }

      if (!config.isActive) {
        res.status(403).json({ error: 'Chatbot is currently inactive' });
        return;
      }

      res.json({ config });
    } catch (error) {
      console.error('Widget config fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch widget configuration' });
    }
  },
);

/**
 * GET /api/chatbot/embed/:configId
 * Serves a full-page embeddable chat interface (for iframe embedding).
 *
 * Query params:
 * - theme: 'light' | 'dark' (default: light)
 * - fullscreen: 'true' to hide the bubble and show chat directly
 */
router.get(
  '/chatbot/embed/:configId',
  async (req: Request<{ configId: string }>, res: Response) => {
    const configId = parseInt(String(req.params.configId), 10);

    if (isNaN(configId)) {
      res.status(400).send('Invalid config ID');
      return;
    }

    try {
      const config = await prisma.chatbotConfig.findUnique({
        where: { id: configId },
        select: {
          id: true,
          name: true,
          welcomeMessage: true,
          isActive: true,
          widgetPrimaryColor: true,
          widgetTextColor: true,
          widgetTitle: true,
          widgetSubtitle: true,
          widgetAvatarUrl: true,
          widgetCustomCss: true,
        },
      });

      if (!config) {
        res.status(404).send('Chatbot not found');
        return;
      }

      if (!config.isActive) {
        res.status(403).send('Chatbot is currently inactive');
        return;
      }

      const theme = req.query.theme === 'dark' ? 'dark' : 'light';
      const fullscreen = req.query.fullscreen === 'true';

      // Determine API base URL
      let apiBaseUrl = env.corsOrigin || 'http://localhost:3001';
      if (apiBaseUrl.includes(',')) {
        apiBaseUrl = apiBaseUrl.split(',')[0].trim();
      }
      if (!apiBaseUrl.includes(':3001') && env.nodeEnv === 'development') {
        apiBaseUrl = 'http://localhost:3001';
      }
      apiBaseUrl = apiBaseUrl.replace(/\/$/, '') + '/api';

      const primaryColor = config.widgetPrimaryColor || '#3B82F6';
      const textColor = config.widgetTextColor || '#FFFFFF';
      const bgColor = theme === 'dark' ? '#1f2937' : '#ffffff';
      const textOnBg = theme === 'dark' ? '#f3f4f6' : '#1f2937';
      const borderColor = theme === 'dark' ? '#374151' : '#e5e7eb';

      const html = generateEmbedHtml({
        configId: config.id,
        apiBaseUrl,
        name: config.name,
        welcomeMessage:
          config.welcomeMessage || `Hi! How can I help you today?`,
        title: config.widgetTitle || config.name,
        subtitle: config.widgetSubtitle,
        avatarUrl: sanitizeImageUrl(config.widgetAvatarUrl),
        primaryColor,
        textColor,
        bgColor,
        textOnBg,
        borderColor,
        fullscreen,
        customCss: config.widgetCustomCss,
      });

      res.set({
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': 'frame-ancestors *',
      });

      res.send(html);
    } catch (error) {
      console.error('Embed generation error:', error);
      res.status(500).send('Error generating embed');
    }
  },
);

/**
 * Generate the full-page embed HTML
 */
function generateEmbedHtml(config: {
  configId: number;
  apiBaseUrl: string;
  name: string;
  welcomeMessage: string;
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  primaryColor: string;
  textColor: string;
  bgColor: string;
  textOnBg: string;
  borderColor: string;
  fullscreen: boolean;
  customCss: string | null;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.title)} - Chat</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${config.bgColor};
      color: ${config.textOnBg};
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .chat-header {
      background: ${config.primaryColor};
      color: ${config.textColor};
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .chat-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .chat-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .chat-title {
      font-size: 18px;
      font-weight: 600;
    }

    .chat-subtitle {
      font-size: 13px;
      opacity: 0.85;
      margin-top: 2px;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message {
      display: flex;
      gap: 8px;
      max-width: 85%;
    }

    .message.customer {
      flex-direction: row-reverse;
      margin-left: auto;
    }

    .message-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: ${config.borderColor};
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .message.customer .message-avatar {
      background: ${config.primaryColor};
      color: ${config.textColor};
    }

    .message-content {
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.4;
    }

    .message.bot .message-content {
      background: ${config.borderColor};
      border-bottom-left-radius: 4px;
    }

    .message.customer .message-content {
      background: ${config.primaryColor};
      color: ${config.textColor};
      border-bottom-right-radius: 4px;
    }

    .suggested-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 0 16px 16px;
    }

    .action-btn {
      padding: 8px 14px;
      border: 1px solid ${config.primaryColor};
      background: transparent;
      color: ${config.primaryColor};
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: ${config.primaryColor};
      color: ${config.textColor};
    }

    .chat-input-area {
      padding: 12px 16px;
      border-top: 1px solid ${config.borderColor};
      display: flex;
      gap: 8px;
    }

    .chat-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid ${config.borderColor};
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      background: ${config.bgColor};
      color: ${config.textOnBg};
    }

    .chat-input:focus {
      border-color: ${config.primaryColor};
    }

    .send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${config.primaryColor};
      color: ${config.textColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .typing {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
    }

    .typing-dot {
      width: 8px;
      height: 8px;
      background: ${config.borderColor};
      border-radius: 50%;
      animation: typing 1.4s infinite;
    }

    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }

    ${config.customCss || ''}
  </style>
</head>
<body>
  <div class="chat-header">
    <div class="chat-avatar">
      ${config.avatarUrl ? `<img src="${escapeHtml(config.avatarUrl)}" alt="">` : '🤖'}
    </div>
    <div>
      <div class="chat-title">${escapeHtml(config.title)}</div>
      ${config.subtitle ? `<div class="chat-subtitle">${escapeHtml(config.subtitle)}</div>` : ''}
    </div>
  </div>

  <div class="chat-messages" id="messages"></div>

  <div class="suggested-actions" id="actions"></div>

  <div class="chat-input-area">
    <input type="text" class="chat-input" id="input" placeholder="Type a message...">
    <button class="send-btn" id="send">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    </button>
  </div>

  <script>
    (function() {
      var CONFIG = {
        configId: ${config.configId},
        apiBaseUrl: '${config.apiBaseUrl}',
        welcomeMessage: '${escapeJs(config.welcomeMessage)}'
      };

      var state = {
        sessionId: null,
        isLoading: false
      };

      var messagesEl = document.getElementById('messages');
      var actionsEl = document.getElementById('actions');
      var inputEl = document.getElementById('input');
      var sendBtn = document.getElementById('send');

      function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }

      function addMessage(sender, content) {
        var div = document.createElement('div');
        div.className = 'message ' + sender;
        div.innerHTML = '<div class="message-avatar">' + (sender === 'customer' ? '👤' : '🤖') + '</div>' +
                        '<div class="message-content">' + escapeHtml(content) + '</div>';
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      function showTyping() {
        var div = document.createElement('div');
        div.className = 'message bot';
        div.id = 'typing';
        div.innerHTML = '<div class="message-avatar">🤖</div>' +
                        '<div class="typing"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      function hideTyping() {
        var el = document.getElementById('typing');
        if (el) el.remove();
      }

      function setActions(actions) {
        actionsEl.innerHTML = '';
        if (!actions || !actions.length) return;
        actions.forEach(function(action) {
          var btn = document.createElement('button');
          btn.className = 'action-btn';
          btn.textContent = action.label;
          btn.onclick = function() { sendMessage(action.label); };
          actionsEl.appendChild(btn);
        });
      }

      function startConversation() {
        fetch(CONFIG.apiBaseUrl + '/chatbot/' + CONFIG.configId + '/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 'WEB' })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.conversation) {
            state.sessionId = data.conversation.sessionId;
            addMessage('bot', CONFIG.welcomeMessage);
          }
        });
      }

      function sendMessage(text) {
        var msg = text || inputEl.value.trim();
        if (!msg || state.isLoading || !state.sessionId) return;

        if (!text) inputEl.value = '';
        addMessage('customer', msg);
        setActions([]);
        state.isLoading = true;
        showTyping();

        fetch(CONFIG.apiBaseUrl + '/chatbot/conversations/' + state.sessionId + '/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: msg })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          hideTyping();
          state.isLoading = false;
          if (data.botResponse) {
            addMessage('bot', data.botResponse.content);
            if (data.botResponse.suggestedActions) {
              setActions(data.botResponse.suggestedActions);
            }
          }
        })
        .catch(function() {
          hideTyping();
          state.isLoading = false;
          addMessage('bot', 'Sorry, something went wrong. Please try again.');
        });
      }

      inputEl.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
      });
      sendBtn.addEventListener('click', function() { sendMessage(); });

      startConversation();
    })();
  </script>
</body>
</html>`;
}

/**
 * Escape HTML for safe embedding
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape string for JavaScript embedding
 */
function escapeJs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Sanitize URL to prevent XSS via javascript: or other dangerous protocols.
 * Only allows http://, https://, and data:image/ URLs for images.
 */
function sanitizeImageUrl(url: string | null): string | null {
  if (!url) return null;

  const trimmedUrl = url.trim();

  // Decode URL-encoded characters to prevent bypass via encoded protocols
  // e.g., %6A%61%76%61%73%63%72%69%70%74%3A => javascript:
  let decodedUrl = trimmedUrl;
  try {
    decodedUrl = decodeURIComponent(trimmedUrl);
  } catch {
    // If decoding fails, use the trimmed value
  }

  const normalizedUrl = decodedUrl.toLowerCase();

  // Allow data:image/ URLs (for base64 encoded images)
  if (normalizedUrl.startsWith('data:image/')) {
    return trimmedUrl;
  }

  // Validate http(s) URLs using URL parsing to prevent encoded protocol bypasses
  try {
    const parsed = new URL(decodedUrl);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') {
      return trimmedUrl;
    }
  } catch {
    // If URL parsing fails, treat as unsafe
  }

  // Block all other protocols (javascript:, vbscript:, data:text/html, etc.)
  return null;
}

/**
 * Extract domain from URL for domain restriction checking
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/(?:https?:\/\/)?([^/:]+)/i);
    return match ? match[1].toLowerCase() : '';
  }
}

export default router;
