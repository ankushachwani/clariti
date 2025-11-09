'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Mail, 
  Calendar, 
  MessageSquare, 
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

  // Calculate connected count properly
  const connectedCount = integrationOptions.filter(option => {
    if (option.alreadyConnected) return true; // Gmail and Calendar via Google OAuth
    return integrations.some(i => i.provider === option.id && i.isConnected);
  }).length;

  return (
    <div className="bg-cream-white rounded-3xl shadow-xl shadow-earth-brown/20 border-2 border-sage-gray/30 p-8">
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
                  placeholder="https://canvas.instructure.com"
                  className="w-full px-4 py-3 border-2 border-sage-gray/30 rounded-2xl focus:ring-2 focus:ring-forest-green focus:border-forest-green bg-stone-beige/50 text-bark-brown"
                />
                <p className="text-xs text-sage-gray mt-1">
                  Your Canvas instance URL (usually canvas.instructure.com or yourschool.instructure.com)
                </p>
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
                  <li>Set Purpose: "Clariti Task Manager"</li>
                  <li>Leave Expires field blank (or set far future)</li>
                  <li>Click "Generate Token" and copy it</li>
                </ol>
                <p className="text-xs text-forest-green mt-2 italic">
                  Note: Your token is stored securely and only you can access your data. Teachers won't be notified.
                </p>
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

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-bark-brown">
            {connectedCount} of {integrationOptions.length} connected
          </span>
          <span className="text-sm text-forest-green font-medium">
            {connectedCount === integrationOptions.length ? '🎉 All set!' : 'Optional'}
          </span>
        </div>
        <div className="w-full bg-sage-gray/30 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-forest-green via-moss-green to-ocean-teal h-2 rounded-full transition-all duration-500"
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
              className={`relative border-2 rounded-2xl p-6 transition-all ${
                isConnected
                  ? 'border-moss-green bg-moss-green/10'
                  : 'border-sage-gray/30 hover:border-moss-green/50 bg-stone-beige/20'
              }`}
            >
              {integration.recommended && !isConnected && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-forest-green to-moss-green text-cream-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  Recommended
                </span>
              )}

              <div className="flex items-start justify-between mb-3">
                <div className={`${integration.color} p-3 rounded-2xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {isConnected && (
                  <CheckCircle className="w-6 h-6 text-moss-green" />
                )}
              </div>

              <h3 className="text-lg font-bold font-serif text-forest-green mb-1">
                {integration.name}
              </h3>
              <p className="text-sm text-bark-brown mb-4">
                {integration.description}
              </p>

              {!isConnected && !integration.alreadyConnected && (
                <button
                  onClick={() => handleConnect(integration.id)}
                  disabled={isConnecting}
                  className="w-full bg-gradient-to-br from-forest-green to-moss-green hover:shadow-lg hover:scale-105 disabled:opacity-50 text-cream-white font-medium py-2 px-4 rounded-full transition-all flex items-center justify-center"
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
                <div className="text-sm text-moss-green font-medium">
                  ✓ Already connected via Google
                </div>
              )}

              {isConnected && !integration.alreadyConnected && (
                <div className="text-sm text-moss-green font-medium">
                  ✓ Connected
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t-2 border-sage-gray/30">
        <button
          onClick={handleSkip}
          className="flex-1 px-6 py-3 text-bark-brown hover:bg-stone-beige rounded-full transition-all font-medium border-2 border-sage-gray/30"
        >
          Skip for now
        </button>
        <button
          onClick={handleContinue}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-forest-green via-moss-green to-ocean-teal hover:shadow-lg hover:scale-105 text-cream-white rounded-full transition-all font-medium flex items-center justify-center"
        >
          Continue to Dashboard
          <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-bark-brown mt-6">
        You can always add or remove integrations later in your profile settings
      </p>
    </div>
  );
}
