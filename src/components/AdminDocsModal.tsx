import React, { useState } from 'react';
import { api, DEFAULT_ADMIN_PASSWORD } from '../api/client';
import { X, Key, ShieldCheck, Server, RefreshCw, Check, BookOpen } from 'lucide-react';

interface AdminDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordUpdated: (newPwd: string) => void;
}

export const AdminDocsModal: React.FC<AdminDocsModalProps> = ({
  isOpen,
  onClose,
  onPasswordUpdated,
}) => {
  const [currentPwd, setCurrentPwd] = useState(api.getAdminPassword());
  const [newPwdInput, setNewPwdInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPwdInput.trim()) return;
    await api.updateAdminPassword(newPwdInput.trim(), currentPwd);
    setCurrentPwd(newPwdInput.trim());
    onPasswordUpdated(newPwdInput.trim());
    setNewPwdInput('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetToDefault = async () => {
    await api.updateAdminPassword(DEFAULT_ADMIN_PASSWORD, currentPwd);
    setCurrentPwd(DEFAULT_ADMIN_PASSWORD);
    onPasswordUpdated(DEFAULT_ADMIN_PASSWORD);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Admin Credentials & Management</h3>
              <p className="text-xs text-stone-500">Documentation for Nick & Calendar Curators</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs text-stone-600 leading-relaxed">
          {/* Active Credentials Block */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
            <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              Active Admin Credentials
            </div>
            <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-lg border border-stone-200 font-mono text-sm">
              <span className="text-stone-500 font-sans text-xs">Password:</span>
              <span className="font-bold text-stone-900">{currentPwd}</span>
            </div>
            {currentPwd !== DEFAULT_ADMIN_PASSWORD && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-[11px] text-stone-500 hover:text-stone-800 underline"
                >
                  Reset back to default ("{DEFAULT_ADMIN_PASSWORD}")
                </button>
              </div>
            )}
          </div>

          {/* Quick change password form */}
          <form onSubmit={handleUpdatePassword} className="space-y-3 bg-stone-50/50 p-4 rounded-xl border border-stone-200/60">
            <label className="block text-xs font-semibold text-stone-700">
              Set New Admin Password
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPwdInput}
                onChange={(e) => setNewPwdInput(e.target.value)}
                placeholder="Enter new admin passphrase"
                className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900 text-xs font-mono"
              />
              <button
                type="submit"
                disabled={!newPwdInput.trim()}
                className="px-3.5 py-1.5 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 shrink-0"
              >
                Update Password
              </button>
            </div>
            {savedSuccess && (
              <div className="text-emerald-700 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>Password updated successfully!</span>
              </div>
            )}
          </form>

          {/* Environmental variable notice */}
          <div className="space-y-2">
            <h4 className="font-semibold text-stone-800 text-xs flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-stone-500" />
              Environment Variable Configuration (Production & Vercel)
            </h4>
            <p className="text-stone-500">
              When deploying to Vercel or your hosting server, set the environment variable:
            </p>
            <div className="bg-stone-900 text-stone-100 p-2.5 rounded-lg font-mono text-[11px]">
              ADMIN_PASSWORD="your-secure-password-here"
            </div>
          </div>

          {/* Moderation Rules & Workflow */}
          <div className="space-y-2">
            <h4 className="font-semibold text-stone-800 text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
              Curation Best Practices for Nick
            </h4>
            <ul className="list-disc list-inside space-y-1 text-stone-500">
              <li>Check that dates and times are unambiguous (include AM/PM).</li>
              <li>Ensure location lists a specific public venue or address.</li>
              <li>Click <strong>Edit</strong> before approving to fix minor formatting or typos.</li>
              <li>Reject commercial solicitation or off-topic spam.</li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
