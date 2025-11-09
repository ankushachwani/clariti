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
];

export default function IntegrationsPanel({ integrations: initialIntegrations }: IntegrationsPanelProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
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
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) {
      return;
    }

    setDisconnecting(provider);

    try {
      const response = await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh to show updated integrations
        router.refresh();
      } else {
        console.error('Disconnect error:', data);
        alert(`Failed to disconnect: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Failed to disconnect. Please check console for details.');
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="bg-cream-white rounded-3xl shadow-md shadow-earth-brown/20 border-2 border-sage-gray/30 p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-sage-gray/5"></div>
      <div className="relative z-10">
      {/* Canvas Token Modal */}
      {showCanvasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-cream-white rounded-3xl shadow-2xl max-w-md w-full p-8 border-2 border-sage-gray/30">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold font-serif text-forest-green mb-2">
                  Connect Canvas LMS
                </h3>
                <p className="text-sm text-bark-brown">
                  Enter your Canvas access token to sync assignments
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCanvasModal(false);
                  setTokenError('');
                  setConnecting(null);
                }}
                className="text-sage-gray hover:text-forest-green transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-forest-green mb-2">
                  Canvas URL
                </label>
                <input
                  type="text"
                  value={canvasUrl}
                  onChange={(e) => setCanvasUrl(e.target.value)}
                  placeholder="https://umamherst.instructure.com"
                  className="w-full px-4 py-3 border-2 border-sage-gray/30 rounded-2xl focus:ring-2 focus:ring-forest-green focus:border-forest-green bg-stone-beige/50 text-bark-brown"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-forest-green mb-2">
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
                  className="w-full px-4 py-3 border-2 border-sage-gray/30 rounded-2xl focus:ring-2 focus:ring-forest-green focus:border-forest-green bg-stone-beige/50 text-bark-brown"
                />
              </div>

              {tokenError && (
                <div className="bg-sunset-coral/20 border-2 border-sunset-coral/30 rounded-2xl p-3">
                  <p className="text-sm text-sunset-coral font-medium">{tokenError}</p>
                </div>
              )}

              <div className="bg-gradient-to-r from-moss-green/20 to-ocean-teal/20 border-2 border-moss-green/30 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-forest-green mb-2 flex items-center">
                  <Key className="w-4 h-4 mr-2" />
                  How to get your token:
                </h4>
                <ol className="text-xs text-bark-brown space-y-1 list-decimal list-inside">
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
                className="w-full bg-gradient-to-br from-forest-green to-moss-green hover:shadow-lg hover:scale-105 disabled:opacity-50 text-cream-white font-medium py-3 px-4 rounded-full transition-all flex items-center justify-center"
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
        <Link2 className="w-7 h-7 text-forest-green" />
        <h2 className="text-2xl font-bold font-serif text-forest-green">
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
              className="border-2 border-sage-gray/30 rounded-2xl p-5 hover:bg-stone-beige/30 transition-all bg-stone-beige/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{config.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold font-serif text-forest-green">
                      {config.name}
                    </h3>
                    <p className="text-sm text-bark-brown mt-1">
                      {config.description}
                    </p>
                    {isConnected && config.connectedViaGoogle && (
                      <p className="text-xs text-moss-green mt-2 font-medium">
                        ✓ Connected via Google OAuth
                      </p>
                    )}
                    {isConnected && integration?.lastSyncedAt && (
                      <p className="text-xs text-sage-gray mt-2">
                        Last synced:{' '}
                        {new Date(integration.lastSyncedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isConnected ? (
                    <CheckCircle className="w-7 h-7 text-moss-green" />
                  ) : (
                    <XCircle className="w-7 h-7 text-sage-gray" />
                  )}
                </div>
              </div>

              <div className="mt-4">
                {isConnected ? (
                  config.connectedViaGoogle ? (
                    <div className="w-full px-4 py-2 text-sm font-medium text-moss-green bg-moss-green/20 rounded-full text-center border-2 border-moss-green/30">
                      Connected via Google
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDisconnect(config.provider)}
                      disabled={disconnecting === config.provider}
                      className="w-full px-4 py-3 text-sm font-medium text-sunset-coral bg-sunset-coral/20 rounded-full hover:bg-sunset-coral/30 transition-all disabled:opacity-50 flex items-center justify-center border-2 border-sunset-coral/30"
                    >
                      {disconnecting === config.provider ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        'Disconnect'
                      )}
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleConnect(config.provider)}
                    disabled={connecting === config.provider}
                    className="w-full px-4 py-3 text-sm font-medium text-cream-white bg-gradient-to-br from-forest-green to-moss-green rounded-full hover:shadow-lg hover:scale-105 disabled:opacity-50 transition-all flex items-center justify-center"
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
      </div>
    </div>
  );
}
