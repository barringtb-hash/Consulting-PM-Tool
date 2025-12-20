/**
 * Intake Widget Service
 *
 * Manages embeddable website widget configuration and JavaScript generation.
 * The widget allows intake forms to be embedded on external websites.
 */

import { prisma } from '../../../prisma/client';
import {
  IntakeChannelSettings,
  WidgetTrigger,
} from './channel.types';

export interface WidgetConfig {
  configId: number;
  formId?: number;
  formSlug?: string;

  // Appearance
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor: string;
  textColor: string;
  buttonText: string;
  title: string;
  subtitle?: string;
  logoUrl?: string;

  // Behavior
  mode: 'form' | 'chat' | 'both';
  defaultMode?: 'form' | 'chat';
  autoOpen: boolean;
  openDelay?: number;
  triggers: WidgetTrigger[];

  // Pre-fill
  preFillFromUrl: boolean;
  urlParamMapping?: Record<string, string>;

  // Analytics
  trackAnalytics: boolean;
  googleAnalyticsId?: string;

  // Advanced
  customCss?: string;
  zIndex?: number;
  hideOnMobile?: boolean;
  allowMinimize?: boolean;
}

export interface WidgetEmbed {
  scriptUrl: string;
  embedCode: string;
  configId: number;
}

/**
 * Get widget configuration for a client
 */
export async function getWidgetConfig(configId: number): Promise<WidgetConfig | null> {
  const config = await prisma.intakeConfig.findUnique({
    where: { id: configId },
    include: {
      forms: {
        where: { status: 'PUBLISHED' },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!config) {
    return null;
  }

  // Get widget settings from storageCredentials (using it as a JSON settings store)
  const storedSettings = (config.storageCredentials || {}) as Record<string, unknown>;
  const widgetSettings = (storedSettings.widgetSettings || {}) as Partial<WidgetConfig>;

  const defaultConfig: WidgetConfig = {
    configId,
    formId: config.forms[0]?.id,
    formSlug: config.forms[0]?.slug ?? undefined,
    position: 'bottom-right',
    primaryColor: config.primaryColor || '#2563eb',
    textColor: '#ffffff',
    buttonText: 'Get Started',
    title: config.portalName || 'Intake Form',
    mode: 'both',
    defaultMode: 'chat',
    autoOpen: false,
    triggers: [],
    preFillFromUrl: true,
    trackAnalytics: true,
    allowMinimize: true,
    zIndex: 999999,
  };

  return {
    ...defaultConfig,
    ...widgetSettings,
    configId,
    formId: config.forms[0]?.id,
    formSlug: config.forms[0]?.slug ?? undefined,
  };
}

/**
 * Update widget configuration
 */
export async function updateWidgetConfig(
  configId: number,
  settings: Partial<WidgetConfig>,
): Promise<WidgetConfig> {
  const config = await prisma.intakeConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Intake config not found');
  }

  const storedSettings = (config.storageCredentials || {}) as Record<string, unknown>;
  const existingWidgetSettings = (storedSettings.widgetSettings || {}) as Partial<WidgetConfig>;

  const updatedSettings: Partial<WidgetConfig> = {
    ...existingWidgetSettings,
    ...settings,
  };

  await prisma.intakeConfig.update({
    where: { id: configId },
    data: {
      storageCredentials: {
        ...storedSettings,
        widgetSettings: updatedSettings,
      },
    },
  });

  const fullConfig = await getWidgetConfig(configId);
  if (!fullConfig) {
    throw new Error('Failed to get updated widget config');
  }

  return fullConfig;
}

/**
 * Generate widget embed code
 */
export function generateEmbedCode(
  configId: number,
  apiBaseUrl: string,
  options?: {
    formSlug?: string;
    customSettings?: Partial<WidgetConfig>;
  },
): WidgetEmbed {
  const scriptUrl = `${apiBaseUrl}/intake/widget/${configId}/widget.js`;

  const initOptions = {
    configId,
    formSlug: options?.formSlug,
    ...options?.customSettings,
  };

  const embedCode = `<!-- Intake Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['IntakeWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  })(window,document,'script','intakeWidget','${scriptUrl}');
  intakeWidget('init', ${JSON.stringify(initOptions, null, 2)});
</script>
<!-- End Intake Widget -->`;

  return {
    scriptUrl,
    embedCode,
    configId,
  };
}

/**
 * Generate the widget JavaScript bundle
 */
export function generateWidgetScript(config: WidgetConfig, apiBaseUrl: string): string {
  const positionBottom = config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;';
  const positionRight = config.position.includes('right') ? 'right: 20px;' : 'left: 20px;';
  const popupBottom = config.position.includes('bottom') ? 'bottom: 70px;' : 'top: 70px;';
  const popupRight = config.position.includes('right') ? 'right: 0;' : 'left: 0;';
  const hideOnMobileStyle = config.hideOnMobile ? '.intake-widget-container { display: none; }' : '';
  const defaultMode = config.defaultMode || 'chat';
  const modeToggleHtml = config.mode === 'both'
    ? `<div class="intake-widget-mode-toggle">
          <button class="intake-widget-mode-btn" data-mode="chat">Chat</button>
          <button class="intake-widget-mode-btn" data-mode="form">Form</button>
        </div>`
    : '';

  return `(function() {
  'use strict';

  var IntakeWidget = window.IntakeWidget || {};
  IntakeWidget.config = ${JSON.stringify(config)};
  IntakeWidget.apiBaseUrl = '${apiBaseUrl}';
  IntakeWidget.isOpen = false;
  IntakeWidget.isMinimized = false;
  IntakeWidget.currentMode = '${defaultMode}';

  var styles = '.intake-widget-container { position: fixed; ${positionBottom} ${positionRight} z-index: ${config.zIndex || 999999}; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; }' +
    '.intake-widget-button { width: 60px; height: 60px; border-radius: 50%; background: ${config.primaryColor}; color: ${config.textColor}; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; transition: transform 0.2s, box-shadow 0.2s; }' +
    '.intake-widget-button:hover { transform: scale(1.05); box-shadow: 0 6px 16px rgba(0,0,0,0.2); }' +
    '.intake-widget-button svg { width: 28px; height: 28px; }' +
    '.intake-widget-popup { position: absolute; ${popupBottom} ${popupRight} width: 380px; height: 600px; max-height: calc(100vh - 100px); background: white; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.12); display: none; flex-direction: column; overflow: hidden; }' +
    '.intake-widget-popup.open { display: flex; animation: intakeSlideIn 0.3s ease; }' +
    '@keyframes intakeSlideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }' +
    '.intake-widget-header { background: ${config.primaryColor}; color: ${config.textColor}; padding: 16px; display: flex; align-items: center; justify-content: space-between; }' +
    '.intake-widget-title { font-size: 16px; font-weight: 600; margin: 0; }' +
    '.intake-widget-close { background: none; border: none; color: ${config.textColor}; cursor: pointer; padding: 4px; opacity: 0.8; }' +
    '.intake-widget-close:hover { opacity: 1; }' +
    '.intake-widget-body { flex: 1; overflow: hidden; }' +
    '.intake-widget-iframe { width: 100%; height: 100%; border: none; }' +
    '.intake-widget-mode-toggle { display: flex; padding: 8px; gap: 8px; border-bottom: 1px solid #e5e7eb; }' +
    '.intake-widget-mode-btn { flex: 1; padding: 8px; border: 1px solid #e5e7eb; background: white; border-radius: 6px; cursor: pointer; font-size: 14px; }' +
    '.intake-widget-mode-btn.active { background: ${config.primaryColor}; color: ${config.textColor}; border-color: ${config.primaryColor}; }' +
    '@media (max-width: 480px) { ${hideOnMobileStyle} .intake-widget-popup { position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; max-height: 100%; border-radius: 0; } }' +
    '${(config.customCss || '').replace(/'/g, "\\'")}';

  var styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  function createWidget() {
    var container = document.createElement('div');
    container.className = 'intake-widget-container';
    container.id = 'intake-widget';

    container.innerHTML = '<button class="intake-widget-button" id="intake-widget-btn" aria-label="Open intake form">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>' +
      '</button>' +
      '<div class="intake-widget-popup" id="intake-widget-popup">' +
      '<div class="intake-widget-header">' +
      '<h3 class="intake-widget-title">${config.title}</h3>' +
      '<button class="intake-widget-close" id="intake-widget-close" aria-label="Close">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>' +
      '</button></div>' +
      '${modeToggleHtml}' +
      '<div class="intake-widget-body"><iframe class="intake-widget-iframe" id="intake-widget-iframe" title="Intake Form"></iframe></div>' +
      '</div>';

    document.body.appendChild(container);

    document.getElementById('intake-widget-btn').addEventListener('click', toggleWidget);
    document.getElementById('intake-widget-close').addEventListener('click', closeWidget);

    var modeButtons = container.querySelectorAll('.intake-widget-mode-btn');
    modeButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        switchMode(btn.dataset.mode);
      });
    });

    updateModeButtons();
  }

  function updateModeButtons() {
    var buttons = document.querySelectorAll('.intake-widget-mode-btn');
    buttons.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.mode === IntakeWidget.currentMode);
    });
  }

  function toggleWidget() {
    if (IntakeWidget.isOpen) { closeWidget(); } else { openWidget(); }
  }

  function openWidget() {
    var popup = document.getElementById('intake-widget-popup');
    popup.classList.add('open');
    IntakeWidget.isOpen = true;
    loadContent();
    trackEvent('widget_opened');
  }

  function closeWidget() {
    var popup = document.getElementById('intake-widget-popup');
    popup.classList.remove('open');
    IntakeWidget.isOpen = false;
    trackEvent('widget_closed');
  }

  function switchMode(mode) {
    IntakeWidget.currentMode = mode;
    updateModeButtons();
    loadContent();
    trackEvent('mode_switched', { mode: mode });
  }

  function loadContent() {
    var iframe = document.getElementById('intake-widget-iframe');
    var mode = IntakeWidget.currentMode;
    var baseUrl = IntakeWidget.apiBaseUrl;
    var configId = IntakeWidget.config.configId;
    var formSlug = IntakeWidget.config.formSlug || 'default';
    var params = new URLSearchParams(window.location.search);
    var urlParams = ${config.preFillFromUrl} ? '&' + params.toString() : '';

    if (mode === 'chat') {
      iframe.src = baseUrl + '/public/intake/widget/' + configId + '/chat?formSlug=' + formSlug + urlParams;
    } else {
      iframe.src = baseUrl + '/public/intake/widget/' + configId + '/form?formSlug=' + formSlug + urlParams;
    }
  }

  function trackEvent(event, data) {
    if (!${config.trackAnalytics}) return;
    fetch(IntakeWidget.apiBaseUrl + '/intake/widget/' + IntakeWidget.config.configId + '/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: event, data: data, timestamp: new Date().toISOString() })
    }).catch(function() {});
    if (window.gtag && '${config.googleAnalyticsId || ''}') {
      gtag('event', event, { event_category: 'intake_widget' });
    }
  }

  function setupTriggers() {
    var triggers = ${JSON.stringify(config.triggers || [])};
    triggers.forEach(function(trigger) {
      switch (trigger.type) {
        case 'time':
          setTimeout(function() { if (!IntakeWidget.isOpen) openWidget(); }, trigger.delay || 5000);
          break;
        case 'scroll':
          window.addEventListener('scroll', function onScroll() {
            var scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            if (scrollPercent >= (trigger.scrollPercent || 50)) {
              if (!IntakeWidget.isOpen) openWidget();
              window.removeEventListener('scroll', onScroll);
            }
          });
          break;
        case 'exit_intent':
          document.addEventListener('mouseout', function onMouseOut(e) {
            if (e.clientY < 0 && !IntakeWidget.isOpen) {
              openWidget();
              document.removeEventListener('mouseout', onMouseOut);
            }
          });
          break;
        case 'page_view':
          if (trigger.pagePattern && window.location.pathname.match(new RegExp(trigger.pagePattern))) {
            setTimeout(function() { if (!IntakeWidget.isOpen) openWidget(); }, trigger.delay || 1000);
          }
          break;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      createWidget();
      setupTriggers();
      ${config.autoOpen ? `setTimeout(openWidget, ${config.openDelay || 0});` : ''}
    });
  } else {
    createWidget();
    setupTriggers();
    ${config.autoOpen ? `setTimeout(openWidget, ${config.openDelay || 0});` : ''}
  }

  window.intakeWidget = function(action, options) {
    switch (action) {
      case 'init': Object.assign(IntakeWidget.config, options); break;
      case 'open': openWidget(); break;
      case 'close': closeWidget(); break;
      case 'toggle': toggleWidget(); break;
    }
  };
})();`;
}

/**
 * Generate widget chat page HTML
 */
export function generateChatPageHtml(config: WidgetConfig, apiBaseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title} - Chat</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .chat-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      line-height: 1.4;
    }
    .message.assistant {
      background: #f3f4f6;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .message.user {
      background: ${config.primaryColor};
      color: ${config.textColor};
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .input-container {
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }
    .input-container input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
    }
    .input-container input:focus {
      border-color: ${config.primaryColor};
    }
    .input-container button {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: none;
      background: ${config.primaryColor};
      color: ${config.textColor};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
    }
    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: typing 1.4s infinite;
    }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typing {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
    .progress-bar {
      height: 4px;
      background: #e5e7eb;
    }
    .progress-bar-fill {
      height: 100%;
      background: ${config.primaryColor};
      transition: width 0.3s ease;
    }
  </style>
</head>
<body>
  <div class="progress-bar">
    <div class="progress-bar-fill" id="progress" style="width: 0%"></div>
  </div>
  <div class="chat-container">
    <div class="messages" id="messages"></div>
    <div class="input-container">
      <input type="text" id="input" placeholder="Type your message..." autocomplete="off">
      <button id="send" aria-label="Send">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
        </svg>
      </button>
    </div>
  </div>
  <script>
    var apiBaseUrl = '${apiBaseUrl}';
    var configId = ${config.configId};
    var formSlug = '${config.formSlug || 'default'}';
    var conversationToken = null;

    var messages = document.getElementById('messages');
    var input = document.getElementById('input');
    var sendBtn = document.getElementById('send');
    var progress = document.getElementById('progress');

    function addMessage(content, isUser) {
      var div = document.createElement('div');
      div.className = 'message ' + (isUser ? 'user' : 'assistant');
      div.textContent = content;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
      var div = document.createElement('div');
      div.className = 'message assistant typing-indicator';
      div.id = 'typing';
      div.innerHTML = '<span></span><span></span><span></span>';
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function hideTyping() {
      var typing = document.getElementById('typing');
      if (typing) typing.remove();
    }

    async function startConversation() {
      try {
        var response = await fetch(apiBaseUrl + '/public/intake/conversation/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formSlug: formSlug, configId: configId })
        });
        var data = await response.json();
        conversationToken = data.data.accessToken;
        addMessage(data.data.greeting, false);
      } catch (e) {
        addMessage('Unable to start conversation. Please try again.', false);
      }
    }

    async function sendMessage() {
      var text = input.value.trim();
      if (!text || !conversationToken) return;

      input.value = '';
      addMessage(text, true);
      showTyping();

      try {
        var response = await fetch(apiBaseUrl + '/public/intake/conversation/' + conversationToken + '/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        var data = await response.json();
        hideTyping();
        addMessage(data.data.reply, false);
        progress.style.width = data.data.progress + '%';

        if (data.data.isComplete) {
          input.disabled = true;
          sendBtn.disabled = true;
        }
      } catch (e) {
        hideTyping();
        addMessage('Something went wrong. Please try again.', false);
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });

    startConversation();
  </script>
</body>
</html>`;
}

/**
 * Generate widget form page HTML
 */
export function generateFormPageHtml(config: WidgetConfig, apiBaseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.title} - Form</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
    }
    .form-container {
      max-width: 100%;
    }
    .form-group {
      margin-bottom: 16px;
    }
    label {
      display: block;
      margin-bottom: 4px;
      font-weight: 500;
      font-size: 14px;
    }
    .required::after {
      content: ' *';
      color: #ef4444;
    }
    input, select, textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: ${config.primaryColor};
      box-shadow: 0 0 0 3px ${config.primaryColor}22;
    }
    .help-text {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    button[type="submit"] {
      width: 100%;
      padding: 12px;
      background: ${config.primaryColor};
      color: ${config.textColor};
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 16px;
    }
    button[type="submit"]:hover {
      opacity: 0.9;
    }
    button[type="submit"]:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .success-message {
      text-align: center;
      padding: 40px 20px;
    }
    .success-message svg {
      color: #10b981;
      margin-bottom: 16px;
    }
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }
  </style>
</head>
<body>
  <div class="form-container" id="form-container">
    <div class="loading" id="loading">Loading form...</div>
  </div>
  <script>
    var apiBaseUrl = '${apiBaseUrl}';
    var configId = ${config.configId};
    var formSlug = '${config.formSlug || 'default'}';

    async function loadForm() {
      try {
        var response = await fetch(apiBaseUrl + '/public/intake/form/' + configId + '/' + formSlug);
        var data = await response.json();
        renderForm(data.form);
      } catch (e) {
        document.getElementById('loading').textContent = 'Unable to load form.';
      }
    }

    function renderForm(form) {
      var container = document.getElementById('form-container');
      var html = '<form id="intake-form">';

      form.fields.forEach(function(field) {
        html += '<div class="form-group">';
        html += '<label class="' + (field.isRequired ? 'required' : '') + '">' + field.label + '</label>';

        switch(field.type) {
          case 'TEXTAREA':
            html += '<textarea name="' + field.name + '" ' + (field.isRequired ? 'required' : '') + ' placeholder="' + (field.placeholder || '') + '"></textarea>';
            break;
          case 'SELECT':
            html += '<select name="' + field.name + '" ' + (field.isRequired ? 'required' : '') + '>';
            html += '<option value="">Select...</option>';
            (field.options || []).forEach(function(opt) {
              html += '<option value="' + opt.value + '">' + opt.label + '</option>';
            });
            html += '</select>';
            break;
          default:
            var type = field.type === 'EMAIL' ? 'email' : field.type === 'PHONE' ? 'tel' : field.type === 'NUMBER' ? 'number' : 'text';
            html += '<input type="' + type + '" name="' + field.name + '" ' + (field.isRequired ? 'required' : '') + ' placeholder="' + (field.placeholder || '') + '">';
        }

        if (field.helpText) {
          html += '<div class="help-text">' + field.helpText + '</div>';
        }
        html += '</div>';
      });

      html += '<button type="submit">Submit</button>';
      html += '</form>';

      container.innerHTML = html;

      document.getElementById('intake-form').addEventListener('submit', submitForm);
    }

    async function submitForm(e) {
      e.preventDefault();
      var form = e.target;
      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      var formData = {};
      new FormData(form).forEach(function(value, key) {
        formData[key] = value;
      });

      try {
        // Create submission
        var createRes = await fetch(apiBaseUrl + '/intake/' + configId + '/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId: 1, // Would need to be passed properly
            submitterEmail: formData.email || 'widget@intake.local'
          })
        });
        var submission = await createRes.json();

        // Submit data
        await fetch(apiBaseUrl + '/public/intake/submission/' + submission.submission.accessToken, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formData: formData, submit: true })
        });

        document.getElementById('form-container').innerHTML = \`
          <div class="success-message">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2>Thank You!</h2>
            <p>Your form has been submitted successfully.</p>
          </div>
        \`;
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
        alert('Failed to submit. Please try again.');
      }
    }

    loadForm();
  </script>
</body>
</html>`;
}

/**
 * Track widget analytics event
 */
export async function trackWidgetEvent(
  configId: number,
  event: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    // Store in database or send to analytics service
    await prisma.intakeConfig.update({
      where: { id: configId },
      data: {
        updatedAt: new Date(), // Just touch the record for now
        // In production, you'd store this in a separate analytics table
      },
    });
  } catch (error) {
    console.error('Failed to track widget event:', error);
  }
}
