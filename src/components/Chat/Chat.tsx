import React, { useState, useRef, useEffect } from 'react';

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  isCommand?: boolean;
  id?: string;
  isPinned?: boolean;
}

interface PromptTemplate {
  name: string;
  prompt: string;
  category: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [showPinnedPanel, setShowPinnedPanel] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [theme, setTheme] = useState(
    localStorage.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );

  // Load pinned messages from localStorage on component mount
  useEffect(() => {
    const savedPinned = localStorage.getItem('pinnedMessages');
    if (savedPinned) {
      try {
        setPinnedMessages(JSON.parse(savedPinned));
      } catch (error) {
        console.error('Error loading pinned messages:', error);
      }
    }
  }, []);

  // Save pinned messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pinnedMessages', JSON.stringify(pinnedMessages));
  }, [pinnedMessages]);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsVoiceSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
    }
  }, []);

  // Slash commands
  const slashCommands = {
    help: {
      description: 'Show available commands',
      usage: '/help',
      action: () => {
        const helpText = `Available Commands:
        
📋 **/help** - Show this help message
🗑️ **/clear** - Clear all messages
ℹ️ **/about** - About this chat application
🎨 **/theme** - Toggle between light/dark theme
💾 **/save** - Export current chat
📊 **/stats** - Show chat statistics
🔄 **/reset** - Reset chat and start fresh
📝 **/templates** - Show prompt templates
🎤 **/voice** - Toggle voice input (if supported)
📌 **/pinned** - Show pinned messages panel

Type any command to execute it!`;
        
        setMessages(prev => [...prev, {
          role: 'system',
          content: helpText,
          timestamp: new Date(),
          isCommand: true,
          id: generateMessageId()
        }]);
      }
    },
    clear: {
      description: 'Clear all messages',
      usage: '/clear',
      action: () => {
        setMessages([]);
        setMessages(prev => [...prev, {
          role: 'system',
          content: '🗑️ Chat cleared successfully!',
          timestamp: new Date(),
          isCommand: true,
          id: generateMessageId()
        }]);
      }
    },
    about: {
      description: 'About this application',
      usage: '/about',
      action: () => {
        const aboutText = `🤖 **AI Chat Assistant**
        
Built with React + TypeScript + Tailwind CSS
Powered by Google Gemini AI API

Features:
• 💬 Real-time chat with AI
• 🎤 Voice input support
• 📝 Prompt templates
• 📤 Chat export
• 🎨 Dark/light theme
• ⌨️ Slash commands
• 📌 Pinned messages
• 📱 Responsive design

Version: 1.0.0
Made with ❤️ for better AI interactions`;
        
        setMessages(prev => [...prev, {
          role: 'system',
          content: aboutText,
          timestamp: new Date(),
          isCommand: true,
          id: generateMessageId()
        }]);
      }
    },
    theme: {
      description: 'Toggle theme',
      usage: '/theme',
      action: () => {
        toggleTheme();
        setMessages(prev => [...prev, {
          role: 'system',
          content: `🎨 Theme switched to ${theme === 'light' ? 'dark' : 'light'} mode!`,
          timestamp: new Date(),
          isCommand: true,
          id: generateMessageId()
        }]);
      }
    },
    save: {
      description: 'Export chat',
      usage: '/save',
      action: () => {
        exportChat();
        setMessages(prev => [...prev, {
          role: 'system',
          content: '💾 Chat exported successfully!',
          timestamp: new Date(),
          isCommand: true,
          id: generateMessageId()
        }]);
      }
    },
    stats: {
      description: 'Show chat statistics',
      usage: '/stats',
      action: () => {
        const userMessages = messages.filter(m => m.role === 'user').length;
        const assistantMessages = messages.filter(m => m.role === 'assistant').length;
        const systemMessages = messages.filter(m => m.role === 'system').length;
        const totalMessages = messages.length;
        
        const statsText = `📊 **Chat Statistics**
        
Total Messages: ${totalMessages}
User Messages: ${userMessages}
AI Responses: ${assistantMessages}
System Messages: ${systemMessages}
Pinned Messages: ${pinnedMessages.length}

Session started: ${messages.length > 0 ? new Date(messages[0].timestamp || Date.now()).toLocaleString() : 'N/A'}`;
        
        setMessages(prev => [...prev, {
          role: 'system',
          content: statsText,
          timestamp: new Date(),
          isCommand: true,
          id: generateMessageId()
        }]);
      }
    },
    reset: {
      description: 'Reset chat',
      usage: '/reset',
      action: () => {
        setMessages([]);
        setInputHistory([]);
        setHistoryIndex(-1);
        setMessages(prev => [...prev, {
          role: 'system',
          content: '🔄 Chat reset successfully! Ready for a fresh conversation.',
          timestamp: new Date(),
          isCommand: true,
          id: generateMessageId()
        }]);
      }
    },
    templates: {
      description: 'Show prompt templates',
      usage: '/templates',
      action: () => {
        const templatesText = `📝 **Available Prompt Templates**
        
${promptTemplates.map(template => 
  `**${template.name}** (${template.category})
  ${template.prompt}`
).join('\n\n')}

Click the 📝 button in the header to use these templates!`;
        
        setMessages(prev => [...prev, {
          role: 'system',
          content: templatesText,
          timestamp: new Date(),
          isCommand: true,
          id: generateMessageId()
        }]);
      }
    },
    voice: {
      description: 'Toggle voice input',
      usage: '/voice',
      action: () => {
        if (!isVoiceSupported) {
          setMessages(prev => [...prev, {
            role: 'system',
            content: '🎤 Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.',
            timestamp: new Date(),
            isCommand: true,
            id: generateMessageId()
          }]);
        } else if (isListening) {
          stopListening();
          setMessages(prev => [...prev, {
            role: 'system',
            content: '🎤 Voice input stopped.',
            timestamp: new Date(),
            isCommand: true,
            id: generateMessageId()
          }]);
        } else {
          startListening();
          setMessages(prev => [...prev, {
            role: 'system',
            content: '🎤 Voice input started. Speak now!',
            timestamp: new Date(),
            isCommand: true,
            id: generateMessageId()
          }]);
        }
      }
    },
    pinned: {
      description: 'Show pinned messages panel',
      usage: '/pinned',
      action: () => {
        setShowPinnedPanel(!showPinnedPanel);
        setMessages(prev => [...prev, {
          role: 'system',
          content: `📌 Pinned messages panel ${showPinnedPanel ? 'hidden' : 'shown'}!`,
          timestamp: new Date(),
          isCommand: true,
          id: generateMessageId()
        }]);
      }
    }
  };

  // Generate unique message ID
  const generateMessageId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // Prompt templates
  const promptTemplates: PromptTemplate[] = [
    {
      name: "Code Review",
      prompt: "Please review this code and provide feedback on best practices, potential bugs, and improvements:",
      category: "Development"
    },
    {
      name: "Writing Assistant",
      prompt: "Help me write a professional email about:",
      category: "Writing"
    },
    {
      name: "Problem Solver",
      prompt: "I'm facing this problem: [describe your problem]. Can you help me brainstorm solutions?",
      category: "General"
    },
    {
      name: "Learning Helper",
      prompt: "Explain [topic] in simple terms with examples:",
      category: "Education"
    },
    {
      name: "Creative Writing",
      prompt: "Write a short story about:",
      category: "Creative"
    },
    {
      name: "Data Analysis",
      prompt: "Analyze this data and provide insights:",
      category: "Analytics"
    }
  ];

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme: 'light' | 'dark') => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Auto-scroll to bottom when new message added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle slash commands
  const handleSlashCommand = (command: string) => {
    const cmd = command.toLowerCase().trim();
    const commandKey = cmd.replace('/', '') as keyof typeof slashCommands;
    
    if (slashCommands[commandKey]) {
      slashCommands[commandKey].action();
      return true;
    } else {
      // Unknown command
      setMessages(prev => [...prev, {
        role: 'system',
        content: `❌ Unknown command: ${command}\nType /help to see available commands.`,
        timestamp: new Date(),
        isCommand: true,
        id: generateMessageId()
      }]);
      return true;
    }
  };

  // Pin/Unpin message functionality
  const togglePinMessage = (message: Message) => {
    if (!message.id) return;

    if (message.isPinned) {
      // Unpin message
      setPinnedMessages(prev => prev.filter(m => m.id !== message.id));
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, isPinned: false } : m
      ));
    } else {
      // Pin message
      const messageToPin = { ...message, isPinned: true };
      setPinnedMessages(prev => [...prev, messageToPin]);
      setMessages(prev => prev.map(m => 
        m.id === message.id ? { ...m, isPinned: true } : m
      ));
    }
  };

  // Long press functionality
  const handleMouseDown = (message: Message) => {
    if (longPressTimer) clearTimeout(longPressTimer);
    
    const timer = setTimeout(() => {
      // setLongPressedMessage(message.id || null);
      togglePinMessage(message);
    }, 500); // 500ms long press

    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Voice input functionality
  const startListening = () => {
    if (!isVoiceSupported || !recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    setIsListening(true);
    recognitionRef.current.start();

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript);
      setIsListening(false);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        alert('No speech detected. Please try again.');
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Handle input history navigation with ArrowUp and ArrowDown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < inputHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(inputHistory[inputHistory.length - 1 - newIndex]);
      } else if (historyIndex === -1 && inputHistory.length > 0) {
        setHistoryIndex(0);
        setInput(inputHistory[inputHistory.length - 1]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(inputHistory[inputHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: PromptTemplate) => {
    setInput(template.prompt);
    setShowTemplates(false);
  };

  // Export chat functionality
  const exportChat = () => {
    if (messages.length === 0) {
      alert('No messages to export!');
      return;
    }

    const chatContent = messages.map((message, index) => {
      const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleString() : `Message ${index + 1}`;
      const pinnedIndicator = message.isPinned ? ' [PINNED]' : '';
      return `${message.role.toUpperCase()} (${timestamp})${pinnedIndicator}:\n${message.content}\n\n`;
    }).join('---\n');

    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExport(false);
  };

  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Check if it's a slash command
    if (input.startsWith('/')) {
      const isCommand = handleSlashCommand(input);
      if (isCommand) {
        setInput('');
        return;
      }
    }

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      timestamp: new Date(),
      id: generateMessageId()
    };
    setMessages(prev => [...prev, userMessage]);

    // Save input to history if unique
    if (inputHistory[0] !== input.trim()) {
      setInputHistory(prev => [input.trim(), ...prev]);
    }
    setHistoryIndex(-1);
    setInput('');
    setIsLoading(true);

    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: 'API key not found. Set VITE_GEMINI_API_KEY in your .env file.',
            timestamp: new Date(),
            id: generateMessageId()
          },
        ]);
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: input }] }],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      const generatedText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from model.';

      const assistantMessage: Message = {
        role: 'assistant',
        content: generatedText,
        timestamp: new Date(),
        id: generateMessageId()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
          id: generateMessageId()
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Main Chat Area */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${showPinnedPanel ? 'mr-80' : ''}`}>
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg w-full flex flex-col h-full">
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h2 className="text-2xl font-bold text-center flex-1">
              Chat Interface
            </h2>
            <div className="flex space-x-2">
              {/* Pinned Messages Button */}
              <button
                onClick={() => setShowPinnedPanel(!showPinnedPanel)}
                className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  showPinnedPanel 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-orange-400 text-white hover:bg-orange-500'
                }`}
                title="Pinned Messages"
              >
                📌 {pinnedMessages.length > 0 && (
                  <span className="ml-1 text-xs bg-white text-orange-500 rounded-full px-1">
                    {pinnedMessages.length}
                  </span>
                )}
              </button>

              {/* Prompt Templates Button */}
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                title="Prompt Templates"
              >
                📝
              </button>
              
              {/* Export Button */}
              <button
                onClick={() => setShowExport(!showExport)}
                className="p-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                title="Export Chat"
              >
                📤
              </button>
              
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>

          {/* Prompt Templates Modal */}
          {showTemplates && (
            <div className="absolute top-20 right-4 z-50 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-white">Prompt Templates</h3>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {promptTemplates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left p-2 rounded border dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="font-medium text-gray-800 dark:text-white">{template.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{template.category}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 truncate">{template.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Export Modal */}
          {showExport && (
            <div className="absolute top-20 right-4 z-50 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-white">Export Chat</h3>
                <button
                  onClick={() => setShowExport(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Export {messages.length} messages as a text file
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={exportChat}
                  className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                >
                  Export
                </button>
                <button
                  onClick={() => setShowExport(false)}
                  className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group relative`}
                onMouseDown={() => handleMouseDown(message)}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={() => handleMouseDown(message)}
                onTouchEnd={handleMouseUp}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 relative ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.role === 'system'
                      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700'
                      : 'bg-gray-200 dark:bg-gray-700 dark:text-white'
                  } ${message.isPinned ? 'ring-2 ring-orange-400' : ''}`}
                >
                  {/* Pin Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinMessage(message);
                    }}
                    className={`absolute -top-2 -right-2 p-1 rounded-full transition-all duration-200 ${
                      message.isPinned 
                        ? 'bg-orange-500 text-white scale-100' 
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 scale-0 group-hover:scale-100'
                    }`}
                    title={message.isPinned ? 'Unpin message' : 'Pin message'}
                  >
                    📌
                  </button>

                  <div className="text-sm opacity-75 mb-1">
                    {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                    {message.isCommand && ' • Command'}
                    {message.isPinned && ' • Pinned'}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message or use /help for commands..."
                className="flex-1 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              
              {/* Voice Input Button */}
              {isVoiceSupported && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  className={`p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-red-400 text-white hover:bg-red-500'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? '🔴' : '🎤'}
                </button>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Send
              </button>
            </div>
            
            {/* Voice Input Status */}
            {isListening && (
              <div className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                Listening... Speak now!
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Pinned Messages Panel */}
      {showPinnedPanel && (
        <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-l dark:border-gray-700 shadow-lg z-40">
          <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white">
              📌 Pinned Messages ({pinnedMessages.length})
            </h3>
            <button
              onClick={() => setShowPinnedPanel(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <div className="overflow-y-auto h-full p-4 space-y-3">
            {pinnedMessages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="text-4xl mb-2">📌</div>
                <p>No pinned messages yet</p>
                <p className="text-sm">Long-press any message or click the pin button to save it here</p>
              </div>
            ) : (
              pinnedMessages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`p-3 rounded-lg border dark:border-gray-600 ${
                    message.role === 'user'
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      : message.role === 'system'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                      {message.role}
                    </span>
                    <button
                      onClick={() => togglePinMessage(message)}
                      className="text-orange-500 hover:text-orange-600 text-sm"
                      title="Unpin message"
                    >
                      📌
                    </button>
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-200 mb-1">
                    {message.timestamp ? new Date(message.timestamp).toLocaleString() : ''}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-4">
                    {message.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
