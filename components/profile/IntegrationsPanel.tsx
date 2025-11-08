'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, CheckCircle, XCircle, ExternalLink, Key, X, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface IntegrationsPanelProps {
  integrations: any[];
}

const INTEGRATION_CONFIGS = [
  {
    provider: 'canvas',
    name: 'Canvas LMS',
    description: 'Sync assignments, grades, and course announcements',
    icon: '📚',
    useToken: true,
  },
  {
    provider: 'gmail',
    name: 'Gmail',
    description: 'Import academic emails and professor announcements',
    icon: '📧',
    connectedViaGoogle: true,
  },
  {
    provider: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync events, deadlines, and meetings',
    icon: '📅',
    connectedViaGoogle: true,
  },
  {
    provider: 'slack',
    name: 'Slack',
    description: 'Monitor team project communications',
    icon: '💬',
  },
  {
    provider: 'discord',
    name: 'Discord',
    description: 'Track course server announcements',
    icon: '🎮',
  },
  {
    provider: 'notion',
    name: 'Notion',
    description: 'Import personal notes and tasks',
    icon: '📝',
  },
];

export default function IntegrationsPanel({ integrations: initialIntegrations }: IntegrationsPanelProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showCanvasModal, setShowCanvasModal] = useState(false);
  const [canvasToken, setCanvasToken] = useState('');
  const [canvasUrl, setCanvasUrl] = useState('https://umamherst.instructure.com');
  const [tokenError, setTokenError] = useState('');

  // Check for success/error messages in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success')) {
      // Refresh to show updated integrations
      router.refresh();
    }
  }, [router]);

  const getIntegration = (provider: string) => {
    return integrations.find((i) => i.provider === provider);
  };

  const handleConnect = async (provider: string) => {
    if (provider === 'canvas') {
      setShowCanvasModal(true);
      return;
    }

    setConnecting(provider);
    // Initiate OAuth flow
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

      // Success! Close modal and refresh
      setShowCanvasModal(false);
      setCanvasToken('');
      router.refresh();
    } catch (error: any) {
      setTokenError(error.message || 'Failed to connect. Please check your token and URL.');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const response = await fetch(`/api/integrations/${provider}/disconnect`, {
        method: 'POST',
      });

      if (response.ok) {
        setIntegrations((prev) =>
          prev.map((i) =>
            i.provider === provider ? { ...i, isConnected: false } : i
          )
        );
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 p-6">
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
                  placeholder="https://umamherst.instructure.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
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
                  <li>Purpose: "Clariti Task Manager"</li>
                  <li>Click "Generate Token" and copy it</li>
                </ol>
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

      <div className="flex items-center gap-3 mb-6">
        <Link2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Integrations
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATION_CONFIGS.map((config) => {
          const integration = getIntegration(config.provider);
          // Check if connected via Google OAuth or integration table
          const isConnected = config.connectedViaGoogle ? (session ? true : false) : (integration?.isConnected || false);

          return (
            <div
              key={config.provider}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {config.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {config.description}
                    </p>
                    {isConnected && config.connectedViaGoogle && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        ✓ Connected via Google OAuth
                      </p>
                    )}
                    {isConnected && integration?.lastSyncedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Last synced:{' '}
                        {new Date(integration.lastSyncedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isConnected ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-gray-400 dark:text-gray-600" />
                  )}
                </div>
              </div>

              <div className="mt-4">
                {isConnected ? (
                  config.connectedViaGoogle ? (
                    <div className="w-full px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-md text-center">
                      Connected via Google
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDisconnect(config.provider)}
                      disabled={connecting === config.provider}
                      className="w-full px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      Disconnect
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleConnect(config.provider)}
                    disabled={connecting === config.provider}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                  >
                    {connecting === config.provider ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-200 flex items-start gap-2">
          <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Need help setting up integrations? Check out the{' '}
            <a
              href="/INTEGRATION_SETUP.md"
              className="font-semibold underline hover:no-underline"
            >
              Integration Setup Guide
            </a>
          </span>
        </p>
      </div>
    </div>
  );
}
