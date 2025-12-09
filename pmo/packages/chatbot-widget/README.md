# @pmo/chatbot-widget

React components and hooks for embedding PMO Chatbot in your application.

## Installation

```bash
npm install @pmo/chatbot-widget
# or
yarn add @pmo/chatbot-widget
# or
pnpm add @pmo/chatbot-widget
```

## Quick Start

### Floating Widget

The easiest way to add the chatbot - a floating bubble that opens a chat window:

```tsx
import { ChatWidget } from '@pmo/chatbot-widget';

function App() {
  return (
    <ChatWidget
      apiUrl="https://your-api.example.com"
      configId={123}
      position="bottom-right"
      theme="light"
    />
  );
}
```

### Embedded Chat Window

For embedding a chat window directly in your page:

```tsx
import { ChatWindow } from '@pmo/chatbot-widget';

function SupportPage() {
  return (
    <div className="support-container">
      <h1>Need Help?</h1>
      <ChatWindow
        apiUrl="https://your-api.example.com"
        configId={123}
        width={400}
        height={600}
        theme="light"
      />
    </div>
  );
}
```

### Custom Implementation with Hook

For complete control, use the `useChatbot` hook:

```tsx
import { useChatbot } from '@pmo/chatbot-widget';

function CustomChat() {
  const {
    sessionId,
    messages,
    isLoading,
    sendMessage,
    startConversation,
    suggestedActions,
  } = useChatbot({
    apiUrl: 'https://your-api.example.com',
    configId: 123,
    autoStart: true,
    customerInfo: {
      email: 'user@example.com',
      name: 'John Doe',
    },
  });

  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id} className={msg.sender.toLowerCase()}>
          {msg.content}
        </div>
      ))}

      {isLoading && <div>Typing...</div>}

      {suggestedActions.map((action) => (
        <button key={action.label} onClick={() => sendMessage(action.label)}>
          {action.label}
        </button>
      ))}

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
      <button onClick={handleSend} disabled={isLoading}>
        Send
      </button>
    </div>
  );
}
```

## API Reference

### ChatWidget Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiUrl` | `string` | required | Your PMO API base URL |
| `configId` | `number` | required | Chatbot configuration ID |
| `position` | `'bottom-right' \| 'bottom-left'` | `'bottom-right'` | Widget position |
| `primaryColor` | `string` | `'#3B82F6'` | Primary brand color |
| `textColor` | `string` | `'#ffffff'` | Text color on primary |
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme |
| `defaultOpen` | `boolean` | `false` | Start with chat open |
| `welcomeMessage` | `string` | `'Hi! How can I help...'` | Initial bot message |
| `zIndex` | `number` | `999999` | CSS z-index |
| `onOpen` | `() => void` | - | Called when chat opens |
| `onClose` | `() => void` | - | Called when chat closes |
| `onMessageSent` | `(message: string) => void` | - | Called when user sends |
| `onMessageReceived` | `(message: ChatMessage) => void` | - | Called when bot responds |

### ChatWindow Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiUrl` | `string` | required | Your PMO API base URL |
| `configId` | `number` | required | Chatbot configuration ID |
| `width` | `string \| number` | `'100%'` | Window width |
| `height` | `string \| number` | `'500px'` | Window height |
| `theme` | `'light' \| 'dark'` | `'light'` | Color theme |
| `welcomeMessage` | `string` | `'Hi! How can I help...'` | Initial bot message |
| `onMessageSent` | `(message: string) => void` | - | Called when user sends |
| `onMessageReceived` | `(message: ChatMessage) => void` | - | Called when bot responds |

### useChatbot Hook

```tsx
const {
  sessionId,      // Current session ID
  messages,       // Array of ChatMessage
  isLoading,      // Loading state
  error,          // Error if any
  sendMessage,    // Send a message
  startConversation,  // Start new conversation
  endConversation,    // End conversation
  suggestedActions,   // Suggested action buttons
} = useChatbot({
  apiUrl: string,
  configId: number,
  autoStart?: boolean,
  customerInfo?: {
    email?: string,
    name?: string,
    phone?: string,
  },
});
```

## TypeScript

This package is written in TypeScript and includes type definitions. All types are exported:

```tsx
import type {
  ChatMessage,
  SuggestedAction,
  Conversation,
  ConversationStatus,
} from '@pmo/chatbot-widget';
```

## License

MIT
