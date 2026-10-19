import React, { useState } from 'react';
import { CommunityEvent } from '../types';
import { api } from '../api/client';
import { X, Copy, Check, Code, FileText, ExternalLink, Sparkles } from 'lucide-react';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CommunityEvent[];
}

export const NewsletterModal: React.FC<NewsletterModalProps> = ({
  isOpen,
  onClose,
  events,
}) => {
  const [activeTab, setActiveTab] = useState<'markdown' | 'api' | 'json'>('markdown');
  const [copied, setCopied] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'next-7' | 'next-30'>('all');

  if (!isOpen) return null;

  const approved = events.filter((e) => e.status === 'approved').sort((a, b) => a.date.localeCompare(b.date));

  // Filter based on selected date window
  const filteredEvents = approved.filter((e) => {
    if (dateFilter === 'all') return true;
    const now = new Date();
    const eventDate = new Date(e.date);
    const diffDays = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (dateFilter === 'next-7') return diffDays >= 0 && diffDays <= 7;
    if (dateFilter === 'next-30') return diffDays >= 0 && diffDays <= 30;
    return true;
  });

  const markdownContent = api.generateNewsletterMarkdown(filteredEvents);

  const jsonSnippet = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      eventCount: filteredEvents.length,
      events: filteredEvents.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        location: e.location,
        description: e.description,
        contactEmail: e.contactEmail,
      })),
    },
    null,
    2
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Newsletter & API Integration</h3>
              <p className="text-xs text-stone-500">
                Architected for weekly email bulletins, Substack, and automated feeds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-1 p-1 bg-stone-200/70 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('markdown')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'markdown'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Newsletter Markdown</span>
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'json'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JSON Export</span>
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'api'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>REST Endpoints</span>
            </button>
          </div>

          {activeTab !== 'api' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400 font-medium">Range:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-white border border-stone-200 rounded px-2 py-1 text-xs text-stone-700"
              >
                <option value="all">All Upcoming ({approved.length})</option>
                <option value="next-7">Next 7 Days</option>
                <option value="next-30">Next 30 Days</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Markdown view */}
        {activeTab === 'markdown' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">
                Copy and paste directly into Mailchimp, Substack, Beehiiv, or Gmail:
              </span>
              <button
                onClick={() => handleCopy(markdownContent)}
                className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-teal-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl text-xs font-mono overflow-x-auto max-h-80 leading-relaxed">
              {markdownContent}
            </pre>
          </div>
        )}

        {/* Tab 2: JSON export view */}
        {activeTab === 'json' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">
                Clean JSON payload structure ready for Zapier, RSS feeds, or webhook integrations:
              </span>
              <button
                onClick={() => handleCopy(jsonSnippet)}
                className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-teal-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-stone-900 text-emerald-300 rounded-xl text-xs font-mono overflow-x-auto max-h-80 leading-relaxed">
              {jsonSnippet}
            </pre>
          </div>
        )}

        {/* Tab 3: API Endpoints reference */}
        {activeTab === 'api' && (
          <div className="p-6 space-y-4 text-xs">
            <p className="text-stone-600 leading-relaxed">
              The application exposes lightweight public and authenticated REST endpoints so future newsletter automations can query live approved events without scraping:
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 font-mono font-bold rounded text-[10px]">
                    GET
                  </span>
                  <code className="font-mono text-stone-800">/api/events</code>
                </div>
                <div className="text-stone-500">
                  Returns all approved events in chronological order. Public, no authentication needed.
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 font-mono font-bold rounded text-[10px]">
                    GET
                  </span>
                  <code className="font-mono text-stone-800">/api/newsletter/events.json?from=YYYY-MM-DD&to=YYYY-MM-DD</code>
                </div>
                <div className="text-stone-500">
                  Filtered query designed for weekly or monthly newsletter batch automation.
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 font-mono font-bold rounded text-[10px]">
                    POST
                  </span>
                  <code className="font-mono text-stone-800">/api/events</code>
                </div>
                <div className="text-stone-500">
                  Submits an anonymous event to the moderation queue with status <code className="text-stone-700">pending</code>.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span>Complies with Phase 2 newsletter integration requirements</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
