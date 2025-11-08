'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Mail, 
  Calendar, 
  MessageSquare, 
  Hash, 
  FileText,
  CheckCircle,
  ArrowRight,
  Loader2,
  Key,
  X
} from 'lucide-react';

interface Integration {
  id: string;
  provider: string;
  isConnected: boolean;
}

interface OnboardingIntegrationsProps {
  integrations: Integration[];
  userName: string;
}

const integrationOptions = [
  {
    id: 'canvas',
    name: 'Canvas LMS',
    description: 'Sync your assignments and deadlines',
    icon: BookOpen,
    color: 'bg-red-500',
    recommended: true,
    useToken: true,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Get important email reminders',
    icon: Mail,
    color: 'bg-red-600',
    recommended: true,
    alreadyConnected: true, // Connected via Google OAuth
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'View all your events in one place',
    icon: Calendar,
    color: 'bg-blue-500',
    recommended: true,
    alreadyConnected: true, // Connected via Google OAuth
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Stay on top of workspace updates',
    icon: MessageSquare,
    color: 'bg-purple-600',
    recommended: false,
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Track important server messages',
    icon: Hash,
    color: 'bg-indigo-500',
    recommended: false,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync your notes and databases',
    icon: FileText,
    color: 'bg-gray-700',
    recommended: false,
  },
];

export default function OnboardingIntegrations({ integrations, userName }: OnboardingIntegrationsProps) {
  const router = useRouter();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showCanvasModal, setShowCanvasModal] = useState(false);
  const [canvasToken, setCanvasToken] = useState('');
  const [canvasUrl, setCanvasUrl] = useState('https://umamherst.instructure.com');
  const [tokenError, setTokenError] = useState('');

  const handleConnect = async (provider: string) => {
    if (provider === 'canvas') {
      setShowCanvasModal(true);
      return;
    }
    setConnecting(provider);
    // Redirect to OAuth flow for other providers
    window.location.href = `/api/integrations/${provider}/connect`;
  };

  const handleCanvasTokenSubmit = async () => {
    if (!canvasToken.trim()) {
      setTokenError('Please enter your Canvas access token');
      return;
    }

    setConnecting('canvas');
    setTokenError('');

    try {
      const response = await fetch('/api/integrations/canvas/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: canvasToken,
          canvasUrl: canvasUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect Canvas');
      }

      // Success! Refresh the page to show updated status
      setShowCanvasModal(false);
      setCanvasToken('');
      router.refresh();
    } catch (error: any) {
      setTokenError(error.message || 'Failed to connect. Please check your token and URL.');
      setConnecting(null);
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  const handleContinue = () => {
    router.push('/dashboard');
  };

  const connectedCount = integrations.filter(i => i.isConnected).length + 2; // +2 for Gmail & Calendar

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
      {/* Canvas Token Modal */}
      {showCanvasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Connect Canvas LMS
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your Canvas access token to sync assignments
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCanvasModal(false);
                  setTokenError('');
                  setConnecting(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Canvas URL
                </label>
                <input
                  type="text"
                  value={canvasUrl}
                  onChange={(e) => setCanvasUrl(e.target.value)}
                  placeholder="https://canvas.instructure.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your Canvas instance URL (usually canvas.instructure.com or yourschool.instructure.com)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Access Token
                </label>
                <input
                  type="password"
                  value={canvasToken}
                  onChange={(e) => {
                    setCanvasToken(e.target.value);
                    setTokenError('');
                  }}
                  placeholder="Enter your Canvas access token"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {tokenError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{tokenError}</p>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center">
                  <Key className="w-4 h-4 mr-2" />
                  How to get your token:
                </h4>
                <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Go to Canvas → Account → Settings</li>
                  <li>Scroll to "Approved Integrations"</li>
                  <li>Click "+ New Access Token"</li>
                  <li>Set Purpose: "Clariti Task Manager"</li>
                  <li>Leave Expires field blank (or set far future)</li>
                  <li>Click "Generate Token" and copy it</li>
                </ol>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">
                  Note: Your token is stored securely and only you can access your data. Teachers won't be notified.
                </p>
              </div>

              <button
                onClick={handleCanvasTokenSubmit}
                disabled={connecting === 'canvas'}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {connecting === 'canvas' ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect Canvas
                    <CheckCircle className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {connectedCount} of {integrationOptions.length} connected
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {connectedCount === integrationOptions.length ? '🎉 All set!' : 'Optional'}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(connectedCount / integrationOptions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Integrations grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {integrationOptions.map((integration) => {
          const Icon = integration.icon;
          const isConnected = integration.alreadyConnected || 
            integrations.some(i => i.provider === integration.id && i.isConnected);
          const isConnecting = connecting === integration.id;

          return (
            <div
              key={integration.id}
              className={`relative border-2 rounded-xl p-6 transition-all ${
                isConnected
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              {integration.recommended && !isConnected && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  Recommended
                </span>
              )}

              <div className="flex items-start justify-between mb-3">
                <div className={`${integration.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {isConnected && (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {integration.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {integration.description}
              </p>

              {!isConnected && !integration.alreadyConnected && (
                <button
                  onClick={() => handleConnect(integration.id)}
                  disabled={isConnecting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect {integration.name}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </button>
              )}

              {integration.alreadyConnected && (
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                  ✓ Already connected via Google
                </div>
              )}

              {isConnected && !integration.alreadyConnected && (
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                  ✓ Connected
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSkip}
          className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
        >
          Skip for now
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center"
        >
          Continue to Dashboard
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
        You can always add or remove integrations later in your profile settings
      </p>
    </div>
  );
}
