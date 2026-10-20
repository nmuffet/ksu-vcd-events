import React from 'react';
import { X, Server, Terminal, Copy } from 'lucide-react';

interface AdminDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordUpdated?: (newPwd: string) => void;
}

export const AdminDocsModal: React.FC<AdminDocsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const envSnippet = 'ADMIN_PASSWORD="your-secure-password-here"';

  const copyToClipboard = () => {
    navigator.clipboard?.writeText(envSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Environment Configuration</h3>
              <p className="text-xs text-stone-500">Setup instructions for project deployment & replication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-stone-600 leading-relaxed">
          <div className="space-y-2">
            <h4 className="font-semibold text-stone-800 text-xs flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-stone-500" />
              Environment Variable Configuration (Production & Hosting)
            </h4>
            <p className="text-stone-500">
              When replicating, self-hosting, or deploying this project to Vercel, Netlify, or any server, configure your admin authentication password using the following environment variable:
            </p>

            <div className="relative group bg-stone-950 text-stone-100 p-3 rounded-lg font-mono text-[11px] flex items-center justify-between">
              <code>{envSnippet}</code>
              <button
                onClick={copyToClipboard}
                className="text-stone-400 hover:text-white px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                title="Copy to clipboard"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-[11px] text-stone-600 space-y-1">
            <span className="font-medium text-stone-800">Replication Note:</span>
            <p>
              In a local development environment, add this key to your local <code className="font-mono bg-stone-200/70 text-stone-800 px-1 py-0.5 rounded text-[10px]">.env</code> file. For hosted production environments, set it in your hosting provider's Environment Variables dashboard.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
