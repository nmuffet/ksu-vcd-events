import React, { useState, useEffect, useRef } from 'react';
import { CommunityEvent, NewsletterSubscriber } from '../types';
import { api } from '../api/client';
import {
  X,
  Copy,
  Check,
  FileText,
  ExternalLink,
  Mail,
  Rss,
  Users,
  Download,
  Calendar,
  Sparkles,
  CheckCircle2,
  Key,
  RefreshCw,
  Zap,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  Globe,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
  Send,
} from 'lucide-react';

interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: CommunityEvent[];
  adminPassword?: string;
  isAdmin: boolean;
  initialTab?: 'preview' | 'html' | 'subscribers' | 'automation';
}

export const NewsletterModal: React.FC<NewsletterModalProps> = ({
  isOpen,
  onClose,
  events,
  adminPassword,
  isAdmin,
  initialTab = 'preview',
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'html' | 'subscribers' | 'automation'>(initialTab);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showBrevoKey, setShowBrevoKey] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedRss, setCopiedRss] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const [brevoConfig, setBrevoConfig] = useState<{
    configured: boolean;
    maskedKey: string;
    listId: string;
    senderEmail?: string;
    senderName?: string;
  }>({
    configured: false,
    maskedKey: '',
    listId: '',
    senderEmail: '',
    senderName: '',
  });
  const [brevoKeyInput, setBrevoKeyInput] = useState('');
  const [brevoListInput, setBrevoListInput] = useState('');
  const [senderEmailInput, setSenderEmailInput] = useState('');
  const [senderNameInput, setSenderNameInput] = useState('Kent State VCD Events');
  const [isSavingBrevo, setIsSavingBrevo] = useState(false);
  const [brevoSaveMsg, setBrevoSaveMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<string | null>(null);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignResult, setCampaignResult] = useState<{
    text: string;
    isError?: boolean;
    isDmarcError?: boolean;
    senderEmail?: string;
  } | null>(null);

  // Auto-Pilot state
  const [autoSendStatus, setAutoSendStatus] = useState<{
    enabled: boolean;
    dayOfWeek: number;
    hour: number;
    timezone: string;
    lastAutoSend?: {
      timestamp: string;
      campaignId?: number;
      eventsCount?: number;
      status: 'success' | 'failed';
      error?: string;
    };
  } | null>(null);
  const [isTogglingAutoSend, setIsTogglingAutoSend] = useState(false);
  const [isTriggeringAutoSend, setIsTriggeringAutoSend] = useState(false);
  const [testEmailInput, setTestEmailInput] = useState(() => {
    return localStorage.getItem('vcd_test_recipient_email') || 'nmuffet@gmail.com';
  });
  const [autoSendFeedback, setAutoSendFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Senders & Domains State
  const [brevoSenders, setBrevoSenders] = useState<Array<{ id: number; name: string; email: string; active: boolean }>>([]);
  const [brevoDomains, setBrevoDomains] = useState<Array<{ id: string; domain_name: string; authenticated: boolean; verified: boolean }>>([]);
  const [isLoadingSenders, setIsLoadingSenders] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [domainRecordsResult, setDomainRecordsResult] = useState<any | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [copiedRecordKey, setCopiedRecordKey] = useState<string | null>(null);
  const [isDmarcGuideExpanded, setIsDmarcGuideExpanded] = useState(true);

  const loadAutoPilotStatus = async () => {
    try {
      const status = await api.getBrevoAutoSendStatus(adminPassword);
      setAutoSendStatus(status);
    } catch {}
  };

  const handleToggleAutoSend = async (newVal: boolean) => {
    setIsTogglingAutoSend(true);
    setAutoSendFeedback(null);
    try {
      const res = await api.updateBrevoAutoSend(newVal, undefined, undefined, adminPassword);
      setAutoSendStatus((prev) => prev ? { ...prev, enabled: res.enabled } : null);
      setAutoSendFeedback({
        text: res.enabled
          ? '✓ Weekly Auto-Pilot enabled! The server will automatically broadcast upcoming events every Monday at 8:00 AM.'
          : 'Weekly Auto-Pilot paused.',
      });
      setTimeout(() => setAutoSendFeedback(null), 7000);
    } catch (err: any) {
      setAutoSendFeedback({ text: err.message || 'Failed to update Auto-Pilot', isError: true });
    } finally {
      setIsTogglingAutoSend(false);
    }
  };

  const handleTriggerAutoSendNow = async (sendLive = false) => {
    setIsTriggeringAutoSend(true);
    setAutoSendFeedback(null);
    if (!sendLive && testEmailInput.trim()) {
      localStorage.setItem('vcd_test_recipient_email', testEmailInput.trim());
    }
    try {
      const res = await api.triggerBrevoAutoSend(
        {
          testEmail: sendLive ? undefined : (testEmailInput.trim() || undefined),
          sendNow: sendLive,
        },
        adminPassword
      );
      setAutoSendFeedback({ text: `✓ ${res.message}` });
      loadAutoPilotStatus();
      setTimeout(() => setAutoSendFeedback(null), 10000);
    } catch (err: any) {
      setAutoSendFeedback({ text: err.message || 'Failed to execute Auto-Pilot', isError: true });
    } finally {
      setIsTriggeringAutoSend(false);
    }
  };

  const loadBrevoSendersAndDomains = async () => {
    setIsLoadingSenders(true);
    try {
      const res = await api.getBrevoSenders(adminPassword);
      setBrevoSenders(res.senders || []);
      setBrevoDomains(res.domains || []);

      if (res.currentSenderEmail && !senderEmailInput) {
        setSenderEmailInput(res.currentSenderEmail);
      } else if (!senderEmailInput && res.senders && res.senders.length > 0) {
        const activeSender = res.senders.find((s) => s.active) || res.senders[0];
        setSenderEmailInput(activeSender.email);
      }

      if (res.currentSenderName && !senderNameInput) {
        setSenderNameInput(res.currentSenderName);
      }
    } catch (e) {
      console.warn('Could not load senders from Brevo', e);
    } finally {
      setIsLoadingSenders(false);
    }
  };

  // Load subscribers and Brevo config when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (initialTab) {
        setActiveTab(initialTab);
      }
      contentRef.current?.scrollTo({ top: 0 });
      setIsLoadingSubs(true);
      api.getSubscribers().then((data) => {
        setSubscribers(data as any);
        setIsLoadingSubs(false);
      }).catch(() => {
        setIsLoadingSubs(false);
      });

      api.getBrevoConfig(adminPassword).then((cfg) => {
        setBrevoConfig(cfg);
        if (cfg.listId) setBrevoListInput(cfg.listId);
        if (cfg.senderEmail) setSenderEmailInput(cfg.senderEmail);
        if (cfg.senderName) setSenderNameInput(cfg.senderName);
        if (cfg.configured) {
          loadBrevoSendersAndDomains();
          loadAutoPilotStatus();
        }
      }).catch(() => {});
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialTab, adminPassword]);

  const handleTabSelect = (tab: 'preview' | 'html' | 'subscribers' | 'automation') => {
    setActiveTab(tab);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isOpen) return null;

  // Filter approved events for the rolling 2-month window (next 60 days)
  const twoMonthEvents = api.filterUpcomingTwoMonths(events);
  const markdownContent = api.generateNewsletterMarkdown(events);
  const htmlContent = api.generateNewsletterHtml(events);

  const feedUrl = `${window.location.origin}/api/newsletter/feed.xml`;

  const handleCopy = async (text: string, type: 'html' | 'rss' | 'md') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'html') {
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
      } else if (type === 'rss') {
        setCopiedRss(true);
        setTimeout(() => setCopiedRss(false), 2000);
      } else {
        setCopiedMd(true);
        setTimeout(() => setCopiedMd(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleCopyDnsValue = async (key: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedRecordKey(key);
      setTimeout(() => setCopiedRecordKey(null), 2500);
    } catch {}
  };

  const handleSaveBrevo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brevoKeyInput.trim() && !brevoConfig.configured) {
      setBrevoSaveMsg({ text: 'Please enter a valid Brevo API key.', isError: true });
      return;
    }
    setIsSavingBrevo(true);
    setBrevoSaveMsg(null);
    try {
      const res = await api.saveBrevoConfig(
        brevoKeyInput,
        brevoListInput,
        senderEmailInput,
        senderNameInput,
        adminPassword
      );
      setBrevoConfig(res);
      setBrevoKeyInput('');
      const note = res.accountEmail ? ` (Verified account: ${res.accountEmail})` : '';
      setBrevoSaveMsg({ text: `✓ Brevo settings saved and real-time auto-sync activated successfully!${note}` });
      setTimeout(() => setBrevoSaveMsg(null), 6000);
      loadBrevoSendersAndDomains();
    } catch (err: any) {
      setBrevoSaveMsg({ text: err.message || 'Failed to save Brevo config', isError: true });
    } finally {
      setIsSavingBrevo(false);
    }
  };

  const handleSyncAllToBrevo = async () => {
    setIsSyncingAll(true);
    setSyncAllResult(null);
    try {
      const res = await api.syncAllToBrevo(adminPassword);
      setSyncAllResult(`✓ Successfully pushed ${res.synced} of ${res.total} active subscribers to Brevo!`);
      setTimeout(() => setSyncAllResult(null), 6000);
    } catch (err: any) {
      setSyncAllResult(`Sync error: ${err.message || 'Failed to sync'}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;
    setIsAddingDomain(true);
    setDomainError(null);
    try {
      const res = await api.addBrevoDomain(domainInput.trim(), adminPassword);
      setDomainRecordsResult(res);
      loadBrevoSendersAndDomains();
    } catch (err: any) {
      setDomainError(err.message || 'Failed to add domain in Brevo');
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleCreateBrevoCampaign = async () => {
    if (!brevoConfig.configured) {
      setCampaignResult({
        text: 'Please connect your Brevo API key first under Brevo API Configuration.',
        isError: true,
      });
      return;
    }
    setIsCreatingCampaign(true);
    setCampaignResult(null);
    try {
      const now = new Date();
      const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const subject = `VCD Events Digest (${twoMonthEvents.length} Upcoming Events) · ${monthYear}`;
      const res = await api.createBrevoCampaign(
        htmlContent,
        subject,
        senderEmailInput || brevoConfig.senderEmail,
        senderNameInput || brevoConfig.senderName,
        adminPassword
      );
      setCampaignResult({
        text: `✓ Success! Draft campaign #${res.campaignId} created in Brevo using sender "${res.senderName}" <${res.senderEmail}>. You can review or schedule it directly from your Brevo Campaigns dashboard!`,
      });
      setTimeout(() => setCampaignResult(null), 12000);
    } catch (err: any) {
      const isDmarc = Boolean(
        err.isDmarcError ||
        err.message?.toLowerCase().includes('dmarc') ||
        err.message?.toLowerCase().includes('sender domain authentication')
      );
      setCampaignResult({
        text: err.message || 'Failed to create campaign in Brevo.',
        isError: true,
        isDmarcError: isDmarc,
        senderEmail: err.senderEmail || senderEmailInput,
      });
      if (isDmarc) {
        setIsDmarcGuideExpanded(true);
      }
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  // Check if current chosen sender domain is authenticated
  const currentSenderDomain = (senderEmailInput || brevoConfig.senderEmail || '').split('@')[1]?.toLowerCase() || '';
  const isSenderDomainAuthenticated = brevoDomains.some(
    (d) => d.domain_name?.toLowerCase() === currentSenderDomain && (d.authenticated || d.verified)
  );
  const isStrictDmarcDomain =
    currentSenderDomain === 'kent.edu' ||
    currentSenderDomain === 'gmail.com' ||
    currentSenderDomain === 'yahoo.com' ||
    currentSenderDomain === 'hotmail.com' ||
    currentSenderDomain === 'icloud.com';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-start justify-center p-3 sm:p-5 md:p-6">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] my-2 sm:my-3">
        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-stone-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Mail className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-stone-900 truncate">
                Weekly Newsletter &amp; Automated Digest
              </h3>
              <p className="text-xs text-stone-500 truncate">
                All upcoming events over the next two months ({twoMonthEvents.length} scheduled)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors shrink-0 ml-2 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Brevo Connection Status Notification Banner */}
        <div className={`px-5 sm:px-6 py-2.5 flex items-center justify-between text-xs border-b shrink-0 ${
          brevoConfig.configured
            ? 'bg-emerald-50/80 border-emerald-150 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2">
            <Key className={`w-4 h-4 shrink-0 ${brevoConfig.configured ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span>
              <strong>Brevo API Key:</strong>{' '}
              {brevoConfig.configured ? (
                <>
                  <span className="font-semibold text-emerald-800">Connected &amp; Active</span>
                  <span className="font-mono text-[11px] ml-1 bg-white/80 border border-emerald-200 px-1.5 py-0.5 rounded text-emerald-900">
                    {brevoConfig.maskedKey}
                  </span>
                  {brevoConfig.listId && <span className="ml-1 text-emerald-700 font-mono text-[11px]">(List #{brevoConfig.listId})</span>}
                </>
              ) : (
                <span>No API key set. Connect your free Brevo API key to automatically sync signups.</span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleTabSelect('automation')}
            className={`px-2.5 py-1 rounded-md font-semibold text-xs transition-colors shrink-0 ${
              activeTab === 'automation'
                ? 'bg-stone-900 text-white'
                : brevoConfig.configured
                ? 'bg-emerald-200/80 hover:bg-emerald-200 text-emerald-950 cursor-pointer'
                : 'bg-amber-900 hover:bg-stone-900 text-white shadow-2xs cursor-pointer'
            }`}
          >
            {brevoConfig.configured ? 'Edit API Key' : 'Enter Brevo API Key →'}
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 sm:px-6 pt-2.5 pb-2 flex items-center justify-between border-b border-stone-100 bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-stone-200/80 rounded-lg text-xs overflow-x-auto">
            <button
              onClick={() => handleTabSelect('preview')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'preview'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Email Preview ({twoMonthEvents.length})</span>
            </button>

            <button
              onClick={() => handleTabSelect('automation')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'automation'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span>Brevo API Key &amp; Auto-Send</span>
              {brevoConfig.configured ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 ml-0.5"></span>
              ) : (
                <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded font-bold text-[10px] ml-0.5">
                  Enter Key
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabSelect('subscribers')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'subscribers'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Subscribers ({subscribers.length})</span>
            </button>

            <button
              onClick={() => handleTabSelect('html')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'html'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>HTML / Markdown</span>
            </button>
          </div>
        </div>

        {/* Scrollable Tab Content Container */}
        <div ref={contentRef} className="flex-1 overflow-y-auto min-h-0 bg-white">
          {/* Tab 1: Live Rendered Email Preview */}
          {activeTab === 'preview' && (
            <div className="p-6 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">
                Visual preview of the email sent to subscribers every Monday morning:
              </span>
              <button
                onClick={() => handleCopy(htmlContent, 'html')}
                className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                {copiedHtml ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-teal-400" />
                    <span>Copied HTML!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy HTML Email</span>
                  </>
                )}
              </button>
            </div>

            {/* Email mock container */}
            <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50 max-h-[460px] overflow-y-auto p-4 sm:p-6 shadow-inner">
              <div className="max-w-[560px] mx-auto bg-white rounded-xl border border-stone-200 p-6 shadow-xs">
                {/* Header */}
                <div className="pb-4 border-b-2 border-stone-900 mb-5">
                  <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Kent State University · Visual Communication Design
                  </div>
                  <h1 className="text-2xl font-black text-stone-900 tracking-tight">
                    VCD Events Weekly Bulletin
                  </h1>
                  <p className="text-xs text-stone-600 mt-1">
                    All upcoming events over the next two months ({new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})
                  </p>
                </div>

                {/* Event listings */}
                {twoMonthEvents.length === 0 ? (
                  <div className="p-8 text-center text-stone-500 text-sm">
                    No upcoming events scheduled over the next two months.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {twoMonthEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-4 rounded-lg border border-stone-200/90 bg-stone-50/60"
                      >
                        <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                          {evt.date} · {evt.time}
                        </div>
                        <h4 className="text-base font-bold text-stone-900 mb-1.5">
                          {evt.title}
                        </h4>
                        <div className="text-xs text-stone-600 mb-2">
                          📍 {evt.location}
                        </div>
                        <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                          {evt.description}
                        </p>
                        {evt.contactEmail && (
                          <div className="text-[11px] text-stone-500 mt-2">
                            ✉️ Contact: <span className="font-medium text-stone-800">{evt.contactEmail}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Email Footer */}
                <div className="mt-8 pt-4 border-t border-stone-100 text-center text-[11px] text-stone-400">
                  <p className="font-semibold text-stone-600 mb-0.5">Kent State University VCD Events Board</p>
                  <p>You received this because you subscribed to the weekly events digest.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Brevo API Configuration & Automated Sending Setup */}
        {activeTab === 'automation' && (
          <div className="p-6 space-y-6 text-xs">
            {/* 1. Primary: Brevo API Key & Sender Configuration Form */}
            <div className="border-2 border-stone-800 rounded-2xl p-5 bg-white shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 shadow-xs">
                    <Key className="w-5 h-5 text-stone-950" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-950 text-sm">
                      1. Brevo API &amp; Sender Configuration
                    </h4>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Connect your free Brevo account and specify the sender address used for campaigns and subscriber auto-sync.
                    </p>
                  </div>
                </div>

                <div>
                  {brevoConfig.configured ? (
                    <span className="px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                      <Check className="w-3.5 h-3.5 text-emerald-700" /> Auto-Sync Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-full text-xs font-bold">
                      API Key Required
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveBrevo} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-900">
                      Brevo API Key (Free) <span className="text-rose-600 font-bold">*</span>
                    </label>
                    <a
                      href="https://app.brevo.com/settings/keys/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Open Brevo API Keys Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="relative">
                    <input
                      type={showBrevoKey ? 'text' : 'password'}
                      value={brevoKeyInput}
                      onChange={(e) => setBrevoKeyInput(e.target.value)}
                      placeholder={brevoConfig.maskedKey ? `Current Key: ${brevoConfig.maskedKey} (paste new key here to update)` : 'xkeysib-xxxxxxxxxxxxxxxxxxxx'}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900 pr-10 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBrevoKey(!showBrevoKey)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                      tabIndex={-1}
                      title={showBrevoKey ? 'Hide key' : 'Show key'}
                    >
                      {showBrevoKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 mb-1">
                      Sender Name (From Name)
                    </label>
                    <input
                      type="text"
                      value={senderNameInput}
                      onChange={(e) => setSenderNameInput(e.target.value)}
                      placeholder="Kent State VCD Events"
                      className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      Display name shown in subscribers' email inboxes.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-stone-900">
                        Sender Email Address
                      </label>
                      {brevoSenders.length > 0 && (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          {brevoSenders.length} verified sender(s) in Brevo
                        </span>
                      )}
                    </div>

                    {brevoSenders.length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          value={senderEmailInput}
                          onChange={(e) => setSenderEmailInput(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                        >
                          {brevoSenders.map((s) => (
                            <option key={s.id} value={s.email}>
                              {s.name ? `${s.name} <${s.email}>` : s.email} {s.active ? '✓' : '(inactive)'}
                            </option>
                          ))}
                          <option value="custom">-- Enter custom or new email address --</option>
                        </select>
                        {senderEmailInput === 'custom' && (
                          <input
                            type="email"
                            placeholder="e.g. events@yourdomain.com"
                            onChange={(e) => setSenderEmailInput(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-900"
                          />
                        )}
                      </div>
                    ) : (
                      <input
                        type="email"
                        value={senderEmailInput}
                        onChange={(e) => setSenderEmailInput(e.target.value)}
                        placeholder="e.g. nmuffet@kent.edu or events@vcdkent.org"
                        className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                      />
                    )}
                    <p className="text-[11px] text-stone-500 mt-1">
                      Must be verified in Brevo. Subject to DMARC domain authentication policy.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 mb-1">
                    Contact List ID <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={brevoListInput}
                    onChange={(e) => setBrevoListInput(e.target.value)}
                    placeholder="e.g. 2 (leave blank to add contacts to your default Brevo list)"
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Found in Brevo under <strong>Contacts</strong> → <strong>Lists</strong>. If left blank, subscribers are added to your main contacts list.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100">
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isSavingBrevo}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isSavingBrevo ? 'Saving Settings...' : 'Save Brevo & Sender Settings'}</span>
                    </button>

                    {brevoConfig.configured && (
                      <button
                        type="button"
                        onClick={loadBrevoSendersAndDomains}
                        disabled={isLoadingSenders}
                        className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Reload senders and domain status from Brevo"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSenders ? 'animate-spin' : ''}`} />
                        <span>Refresh Senders</span>
                      </button>
                    )}
                  </div>

                  {brevoConfig.configured && (
                    <button
                      type="button"
                      onClick={handleSyncAllToBrevo}
                      disabled={isSyncingAll}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                      <span>{isSyncingAll ? 'Syncing...' : 'Sync All Subscribers Now'}</span>
                    </button>
                  )}
                </div>

                {brevoSaveMsg && (
                  <div className={`p-3 rounded-xl text-xs font-medium border ${brevoSaveMsg.isError ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
                    {brevoSaveMsg.text}
                  </div>
                )}
                {syncAllResult && (
                  <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-800 font-medium">
                    {syncAllResult}
                  </div>
                )}
              </form>
            </div>

            {/* Automated Weekly Auto-Pilot (100% Hands-Off) */}
            <div className="border-2 border-emerald-600 rounded-2xl p-5 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Zap className="w-5 h-5 text-emerald-100" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-950 mb-1">
                      <span>100% Hands-Off Solution</span>
                    </div>
                    <h4 className="font-bold text-emerald-950 text-sm">
                      Weekly Auto-Pilot (Automated Monday Morning Broadcast)
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Runs automatically every Monday at 8:00 AM EST. Automatically pulls upcoming events from the calendar, compiles the branded newsletter, and sends it directly to your subscribers. No manual work required!
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleAutoSend(!autoSendStatus?.enabled)}
                    disabled={isTogglingAutoSend || !brevoConfig.configured}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                      !brevoConfig.configured
                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-60'
                        : autoSendStatus?.enabled
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-stone-800 hover:bg-stone-900 text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${autoSendStatus?.enabled ? 'bg-emerald-300 animate-pulse' : 'bg-stone-400'}`}></span>
                    <span>{isTogglingAutoSend ? 'Updating...' : autoSendStatus?.enabled ? 'Auto-Pilot: ACTIVE (Mon 8 AM)' : 'Enable Weekly Auto-Pilot'}</span>
                  </button>
                </div>
              </div>

              {/* Status and Last Broadcast Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/90 border border-emerald-200 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Schedule &amp; Cadence
                  </div>
                  <div className="font-bold text-stone-900 text-xs">
                    Every Monday at 8:00 AM (Eastern Time)
                  </div>
                  <div className="text-[11px] text-stone-600">
                    Rolling 60-day window ({twoMonthEvents.length} events currently scheduled)
                  </div>
                </div>

                <div className="p-3 bg-white/90 border border-emerald-200 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                    Last Automated Send
                  </div>
                  {autoSendStatus?.lastAutoSend ? (
                    <div>
                      <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${autoSendStatus.lastAutoSend.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span>
                          {autoSendStatus.lastAutoSend.status === 'success' ? 'Sent Successfully' : 'Failed'} · {new Date(autoSendStatus.lastAutoSend.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600">
                        {autoSendStatus.lastAutoSend.campaignId ? `Brevo Campaign #${autoSendStatus.lastAutoSend.campaignId}` : ''}
                        {autoSendStatus.lastAutoSend.eventsCount ? ` (${autoSendStatus.lastAutoSend.eventsCount} events)` : ''}
                        {autoSendStatus.lastAutoSend.error && <span className="text-rose-600 block mt-0.5">{autoSendStatus.lastAutoSend.error}</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-stone-600">
                      Pending first scheduled run this coming Monday at 8:00 AM.
                    </div>
                  )}
                </div>
              </div>

              {/* Instant Test / On-Demand Broadcast */}
              <div className="p-3.5 bg-white/95 border border-emerald-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs">
                    Test Send or Trigger Auto-Pilot On-Demand
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Verify how the live email looks in your inbox
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="email"
                    value={testEmailInput}
                    onChange={(e) => setTestEmailInput(e.target.value)}
                    placeholder="Enter email to receive test copy (e.g. your email)"
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleTriggerAutoSendNow(false)}
                    disabled={isTriggeringAutoSend || !brevoConfig.configured || !testEmailInput.trim()}
                    className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className={`w-3.5 h-3.5 ${isTriggeringAutoSend ? 'animate-bounce' : ''}`} />
                    <span>{isTriggeringAutoSend ? 'Sending Test...' : 'Send Test to My Inbox'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Send the live weekly digest campaign right now to ALL active subscribers?')) {
                        handleTriggerAutoSendNow(true);
                      }
                    }}
                    disabled={isTriggeringAutoSend || !brevoConfig.configured}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>Broadcast to All Now</span>
                  </button>
                </div>

                {autoSendFeedback && (
                  <div className={`p-2.5 rounded-lg text-xs font-medium border ${
                    autoSendFeedback.isError
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    {autoSendFeedback.text}
                  </div>
                )}
              </div>
            </div>

            {/* DMARC Domain Authentication Guide & DNS Tool */}
            <div className="border border-amber-300 bg-amber-50/70 rounded-2xl overflow-hidden shadow-xs">
              <div
                onClick={() => setIsDmarcGuideExpanded(!isDmarcGuideExpanded)}
                className="px-5 py-3.5 bg-amber-100/80 border-b border-amber-200 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs">
                      DMARC Policy &amp; Domain Authentication Guide
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      Why does Brevo require sender domain authentication for @kent.edu and how to resolve it
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-900 font-semibold text-xs">
                  <span>{isDmarcGuideExpanded ? 'Collapse' : 'Learn How to Fix'}</span>
                  {isDmarcGuideExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {isDmarcGuideExpanded && (
                <div className="p-5 space-y-4 text-xs text-amber-950 leading-relaxed">
                  <div className="space-y-2">
                    <p>
                      <strong>Why did you see the DMARC error?</strong><br />
                      Kent State University (<code>kent.edu</code>) and major webmail providers (<code>gmail.com</code>, <code>yahoo.com</code>) enforce a strict global anti-spoofing policy called <strong>DMARC with <code>p=reject</code></strong>.
                      This tells receiving mailboxes (Gmail, Outlook, Apple Mail) to reject any email claiming to come from <code>@kent.edu</code> unless Brevo cryptographically signs it with Kent State&apos;s DKIM keys in DNS.
                    </p>
                    <p>
                      Because Brevo does not own <code>kent.edu</code>, Brevo blocks launching email campaigns with <code>nmuffet@kent.edu</code> or free domains until an authenticated domain or verified sender is configured.
                    </p>
                  </div>

                  {/* Verified Domains Status */}
                  <div className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900">
                        Your Brevo Domains Status:
                      </span>
                      <a
                        href="https://app.brevo.com/senders/domain/list"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        <span>Open Brevo Domains Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {brevoDomains.length === 0 ? (
                      <p className="text-stone-600 text-[11px]">
                        No authenticated custom domains configured yet in Brevo.
                      </p>
                    ) : (
                      <div className="divide-y divide-stone-100">
                        {brevoDomains.map((d) => (
                          <div key={d.id} className="py-1.5 flex items-center justify-between text-[11px]">
                            <span className="font-mono font-medium text-stone-800">{d.domain_name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.authenticated || d.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {d.authenticated || d.verified ? '✓ Authenticated' : 'Pending DNS Records'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3 Practical Fixes */}
                  <div className="space-y-3 pt-1">
                    <h5 className="font-bold text-stone-900 text-xs uppercase tracking-wider">
                      3 Ways to Resolve This:
                    </h5>

                    {/* Method 1: Authenticate a custom domain */}
                    <div className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-2.5">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                        <div>
                          <strong className="text-stone-900">Method 1 (Recommended): Authenticate a Custom Domain</strong>
                          <p className="text-stone-600 text-[11px] mt-0.5">
                            If you or your team have a domain (e.g. <code>vcdkent.org</code>, a personal design portfolio domain, or a club domain), register it below to generate the exact DNS records needed for Brevo:
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleAddDomain} className="flex gap-2">
                        <input
                          type="text"
                          value={domainInput}
                          onChange={(e) => setDomainInput(e.target.value)}
                          placeholder="e.g. vcdkent.org"
                          className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:bg-white focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isAddingDomain || !domainInput.trim()}
                          className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-colors shrink-0 cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>{isAddingDomain ? 'Generating...' : 'Get Brevo DNS Records'}</span>
                        </button>
                      </form>

                      {domainError && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700">
                          {domainError}
                        </div>
                      )}

                      {domainRecordsResult?.dns_records && (
                        <div className="mt-2 space-y-2 border border-emerald-200 bg-emerald-50/60 p-3 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-950 text-[11px]">
                              ✓ Add these records to your domain DNS host (Cloudflare, GoDaddy, Namecheap):
                            </span>
                            <span className="text-[10px] text-emerald-800 font-mono">
                              Domain: {domainRecordsResult.domain_name}
                            </span>
                          </div>

                          <div className="space-y-1.5 font-mono text-[10px]">
                            {/* DKIM 1 */}
                            {domainRecordsResult.dns_records.dkim1Record && (
                              <div className="p-2 bg-white rounded border border-emerald-200 flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-stone-900">CNAME: </span>
                                  <span className="text-stone-700 font-semibold">{domainRecordsResult.dns_records.dkim1Record.host_name}</span>
                                  <span className="text-stone-400 mx-1">→</span>
                                  <span className="text-stone-600 break-all">{domainRecordsResult.dns_records.dkim1Record.value}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyDnsValue('dkim1', domainRecordsResult.dns_records.dkim1Record.value)}
                                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded text-[10px] font-sans font-medium shrink-0 cursor-pointer"
                                >
                                  {copiedRecordKey === 'dkim1' ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            )}

                            {/* DKIM 2 */}
                            {domainRecordsResult.dns_records.dkim2Record && (
                              <div className="p-2 bg-white rounded border border-emerald-200 flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-stone-900">CNAME: </span>
                                  <span className="text-stone-700 font-semibold">{domainRecordsResult.dns_records.dkim2Record.host_name}</span>
                                  <span className="text-stone-400 mx-1">→</span>
                                  <span className="text-stone-600 break-all">{domainRecordsResult.dns_records.dkim2Record.value}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyDnsValue('dkim2', domainRecordsResult.dns_records.dkim2Record.value)}
                                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded text-[10px] font-sans font-medium shrink-0 cursor-pointer"
                                >
                                  {copiedRecordKey === 'dkim2' ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            )}

                            {/* Brevo code */}
                            {domainRecordsResult.dns_records.brevo_code && (
                              <div className="p-2 bg-white rounded border border-emerald-200 flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-stone-900">TXT: </span>
                                  <span className="text-stone-700 font-semibold">{domainRecordsResult.dns_records.brevo_code.host_name}</span>
                                  <span className="text-stone-400 mx-1">→</span>
                                  <span className="text-stone-600 break-all">{domainRecordsResult.dns_records.brevo_code.value}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyDnsValue('brevo_code', domainRecordsResult.dns_records.brevo_code.value)}
                                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded text-[10px] font-sans font-medium shrink-0 cursor-pointer"
                                >
                                  {copiedRecordKey === 'brevo_code' ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            )}

                            {/* DMARC */}
                            {domainRecordsResult.dns_records.dmarc_record && (
                              <div className="p-2 bg-white rounded border border-emerald-200 flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-stone-900">TXT: </span>
                                  <span className="text-stone-700 font-semibold">{domainRecordsResult.dns_records.dmarc_record.host_name}</span>
                                  <span className="text-stone-400 mx-1">→</span>
                                  <span className="text-stone-600 break-all">{domainRecordsResult.dns_records.dmarc_record.value}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyDnsValue('dmarc', domainRecordsResult.dns_records.dmarc_record.value)}
                                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded text-[10px] font-sans font-medium shrink-0 cursor-pointer"
                                >
                                  {copiedRecordKey === 'dmarc' ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Method 2: Kent State IT Department Subdomain */}
                    <div className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                        <div>
                          <strong className="text-stone-900">Method 2: Institutional Subdomain Request (Kent State IT)</strong>
                          <p className="text-stone-600 text-[11px] mt-0.5">
                            If this newsletter is sent on behalf of the School of VCD, contact Kent State Division of IT and request delegating or adding Brevo DKIM records for a subdomain like <code>events.kent.edu</code> or <code>vcd.kent.edu</code>.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Method 3: Use an already verified sender */}
                    <div className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-1.5">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                        <div>
                          <strong className="text-stone-900">Method 3: Select or Add an Authenticated Sender in Brevo</strong>
                          <p className="text-stone-600 text-[11px] mt-0.5">
                            Under Brevo &gt; Senders, Domains &amp; Dedicated IPs &gt; Senders, add an email address from any domain that does not enforce <code>p=reject</code> or is already authenticated.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Push Campaign to Brevo (Option A) */}
            <div className="border border-stone-200 rounded-2xl p-4 bg-gradient-to-br from-stone-900 to-stone-800 text-white space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Option A · Direct 1-Click Push</span>
                  </div>
                  <h4 className="font-bold text-white text-sm">
                    Push Styled Digest Directly into Brevo Campaigns
                  </h4>
                  <p className="text-stone-300 text-xs leading-relaxed">
                    No template or variables needed in Brevo! The app compiles the styled HTML newsletter containing all {twoMonthEvents.length} upcoming events and pushes it directly into your Brevo account as a draft campaign ready to send.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreateBrevoCampaign}
                  disabled={isCreatingCampaign || !brevoConfig.configured}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    !brevoConfig.configured
                      ? 'bg-stone-700 text-stone-400 cursor-not-allowed opacity-60'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-md active:scale-98'
                  }`}
                >
                  <Send className={`w-4 h-4 ${isCreatingCampaign ? 'animate-bounce' : ''}`} />
                  <span>{isCreatingCampaign ? 'Pushing to Brevo...' : 'Push Campaign to Brevo →'}</span>
                </button>
              </div>

              {/* Sender Details Preview & DMARC Warning Badge */}
              <div className="pt-2 border-t border-stone-700/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2 text-stone-300">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    Campaign Sender: <strong>{senderNameInput || 'Kent State VCD Events'}</strong> &lt;<span className="font-mono">{senderEmailInput || 'nmuffet@kent.edu'}</span>&gt;
                  </span>
                </div>

                {isStrictDmarcDomain && !isSenderDomainAuthenticated ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>DMARC Authentication Required by Brevo</span>
                  </span>
                ) : isSenderDomainAuthenticated ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Domain Authenticated</span>
                  </span>
                ) : null}
              </div>

              {campaignResult && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${
                  campaignResult.isError
                    ? 'bg-rose-950/90 border-rose-800 text-rose-200'
                    : 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {campaignResult.isError ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p>{campaignResult.text}</p>
                      {campaignResult.isDmarcError && (
                        <div className="mt-2 pt-2 border-t border-rose-800/80 text-[11px] text-rose-300 space-y-1.5">
                          <p>
                            💡 <strong>How to fix this:</strong> Brevo prevented this campaign because <code>{campaignResult.senderEmail || senderEmailInput}</code> uses a domain with a strict DMARC policy without domain authentication.
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <a
                              href="https://app.brevo.com/senders/domain/list"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-white text-stone-900 rounded font-semibold text-[10px] inline-flex items-center gap-1 hover:bg-stone-100"
                            >
                              <span>Open Brevo Domains Page</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setIsDmarcGuideExpanded(true);
                                setDomainInput((campaignResult.senderEmail || senderEmailInput).split('@')[1] || '');
                              }}
                              className="px-2.5 py-1 bg-rose-900 text-white rounded font-semibold text-[10px] hover:bg-rose-800"
                            >
                              View Step-by-Step DNS Records
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Automated Feed URL */}
            <div className="space-y-2 border border-stone-200 rounded-2xl p-4 bg-stone-50">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-200 text-stone-700">
                <Rss className="w-3 h-3" />
                <span>Option B · Automated Weekly RSS Campaign</span>
              </div>
              <h4 className="font-bold text-stone-900 text-sm">
                Hands-Off Weekly Automation (No Template Building Required)
              </h4>
              <p className="text-stone-600 text-xs leading-relaxed">
                Brevo has a native <strong>RSS Campaign</strong> integration. You simply paste your feed URL. The app pre-renders the complete HTML for upcoming events directly inside the feed description:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={feedUrl}
                  className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono text-xs text-stone-800"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(feedUrl, 'rss')}
                  className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  {copiedRss ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRss ? 'Copied' : 'Copy Feed URL'}</span>
                </button>
              </div>
            </div>

            {/* Brevo RSS Field Tags Reference */}
            <div className="border border-stone-200 rounded-2xl p-4 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Rss className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-stone-900 text-sm">
                    Brevo RSS Field Tags Reference
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Verified with Brevo
                </span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1">
                <div className="font-bold text-amber-900">Why didn't Brevo explicitly list &#123;item.DESCRIPTION&#125; in their preview dialog?</div>
                <p className="leading-relaxed text-amber-900/90">
                  In Brevo's RSS preview, they state the rule: <em>&ldquo;Each key has the same name than the tag.&rdquo;</em> and only printed <code>&lt;title&gt;</code> and <code>&lt;pubDate&gt;</code> as quick examples. Because our feed includes a <code>&lt;description&gt;</code> tag with pre-rendered event cards, Brevo dynamically maps it to <strong><code>&#123;&#123; item.DESCRIPTION | safe &#125;&#125;</code></strong> in the template body!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-stone-500">
                    Channel / Feed Tags
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between bg-white p-1.5 rounded border border-stone-200/60">
                      <code className="text-emerald-700 font-bold">&#123;feed.TITLE&#125;</code>
                      <span className="text-stone-500 font-sans text-[11px]">Feed Title</span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-1.5 rounded border border-stone-200/60">
                      <code className="text-emerald-700 font-bold">&#123;feed.PUBDATE&#125;</code>
                      <span className="text-stone-500 font-sans text-[11px]">Build Date</span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-1.5 rounded border border-stone-200/60">
                      <code className="text-emerald-700 font-bold">&#123;feed.LINK&#125;</code>
                      <span className="text-stone-500 font-sans text-[11px]">Site URL</span>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-stone-500">
                    Item / Event Digest Tags
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between bg-white p-1.5 rounded border border-stone-200/60">
                      <code className="text-emerald-700 font-bold">&#123;item.TITLE&#125;</code>
                      <span className="text-stone-500 font-sans text-[11px]">Digest Headline</span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-1.5 rounded border border-stone-200/60">
                      <code className="text-emerald-700 font-bold">&#123;item.PUBDATE&#125;</code>
                      <span className="text-stone-500 font-sans text-[11px]">Publication Date</span>
                    </div>
                    <div className="flex items-center justify-between bg-white p-1.5 rounded border border-stone-200/60">
                      <code className="text-emerald-700 font-bold">&#123;&#123; item.DESCRIPTION | safe &#125;&#125;</code>
                      <span className="text-stone-500 font-sans text-[11px]">Formatted Event Cards</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 flex items-start gap-2">
                <span className="font-bold text-stone-800 shrink-0">Pro-Tip:</span>
                <span>
                  In Brevo's email template builder, paste <code className="font-mono text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-stone-200 font-bold">&#123;&#123; item.DESCRIPTION | safe &#125;&#125;</code> into an HTML or Text block. The <code>| safe</code> filter tells Brevo to render the cards rather than escaping the HTML!
                </span>
              </div>
            </div>

            {/* 3. Brevo Template Variables Reference (If building custom template in Brevo) */}
            <div className="border border-stone-200 rounded-2xl p-4 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-stone-700" />
                  <h4 className="font-bold text-stone-900 text-sm">
                    Option C · Custom Brevo Template &amp; Variable Guide
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const sample = JSON.stringify(
                      {
                        params: {
                          eventCount: twoMonthEvents.length,
                          events: twoMonthEvents.slice(0, 3).map((e) => ({
                            title: e.title,
                            date: e.date,
                            time: e.time,
                            location: e.location,
                            description: e.description,
                            contactEmail: e.contactEmail || 'events@kent.edu',
                          })),
                        },
                      },
                      null,
                      2
                    );
                    navigator.clipboard.writeText(sample);
                    alert('Sample Test JSON copied! In Brevo, go to Preview & Test → Preview as customer → Enable test data and paste this JSON.');
                  }}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Test JSON for Brevo Preview</span>
                </button>
              </div>

              {/* Troubleshooting Notice for raw {% for %} tags in Brevo */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-950">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Why do &lcub;% for %&rcub; tags show up literally in Brevo preview?</span>
                </div>
                <div className="space-y-1.5 pl-6 text-[11px] text-amber-900 leading-relaxed">
                  <p>
                    <strong>1. Variable Name Mismatch:</strong> If you write <code>&lcub;% for event in params.events %&rcub;</code>, you must use <code>&lcub;&lcub; event.title &rcub;&rcub;</code> (NOT <code>item.title</code>). If you use <code>item</code>, the loop tag must be <code>&lcub;% for item in params.events %&rcub;</code>.
                  </p>
                  <p>
                    <strong>2. Drag &amp; Drop Editor "Repeat Block":</strong> In Brevo's visual builder, <em>do not</em> type <code>&lcub;% for %&rcub;</code> in a text block (Brevo escapes it as plain text). Instead, select the <strong>Row / Section</strong>, toggle <strong>Repeat block</strong> in the sidebar, set Variable: <code>params.events</code>, Alias: <code>item</code>, and only place <code>&lcub;&lcub; item.title &rcub;&rcub;</code> inside the text blocks.
                  </p>
                  <p>
                    <strong>3. Missing Preview Data:</strong> Brevo previews are blank or show raw tags until you enable test data in Brevo: Click <strong>Preview &amp; Test → Preview as customer → Enable test data</strong> and paste sample JSON.
                  </p>
                  <p className="font-semibold text-emerald-900 pt-0.5">
                    💡 <em>Remember:</em> With <strong>Option A (Direct Push)</strong> above, you don't need any template or loop tags—the app compiles the styled email and pushes it directly into Brevo!
                  </p>
                </div>
              </div>

              <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="py-2 px-3">Brevo Variable Tag</th>
                      <th className="py-2 px-3">Field Description</th>
                      <th className="py-2 px-3">Example Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                    <tr className="bg-stone-50/50">
                      <td className="py-2 px-3 text-emerald-800 font-bold">&#123;&#123; item.title &#125;&#125;</td>
                      <td className="py-2 px-3 text-stone-600 font-sans">Event Title</td>
                      <td className="py-2 px-3 text-stone-500 font-sans">Graphic Design Thesis Exhibition</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-800 font-bold">&#123;&#123; item.date &#125;&#125;</td>
                      <td className="py-2 px-3 text-stone-600 font-sans">Date (YYYY-MM-DD)</td>
                      <td className="py-2 px-3 text-stone-500 font-sans">2026-11-15</td>
                    </tr>
                    <tr className="bg-stone-50/50">
                      <td className="py-2 px-3 text-emerald-800 font-bold">&#123;&#123; item.time &#125;&#125;</td>
                      <td className="py-2 px-3 text-stone-600 font-sans">Time Range</td>
                      <td className="py-2 px-3 text-stone-500 font-sans">6:00 PM – 9:00 PM</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-800 font-bold">&#123;&#123; item.location &#125;&#125;</td>
                      <td className="py-2 px-3 text-stone-600 font-sans">Venue / Room</td>
                      <td className="py-2 px-3 text-stone-500 font-sans">Taylor Hall 158 / Gallery</td>
                    </tr>
                    <tr className="bg-stone-50/50">
                      <td className="py-2 px-3 text-emerald-800 font-bold">&#123;&#123; item.description &#125;&#125;</td>
                      <td className="py-2 px-3 text-stone-600 font-sans">Full Event Summary</td>
                      <td className="py-2 px-3 text-stone-500 font-sans">Annual showcase of graduating seniors...</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-800 font-bold">&#123;&#123; item.contactEmail &#125;&#125;</td>
                      <td className="py-2 px-3 text-stone-600 font-sans">Organizer Contact Email</td>
                      <td className="py-2 px-3 text-stone-500 font-sans">faculty@kent.edu</td>
                    </tr>
                    <tr className="bg-stone-50/50">
                      <td className="py-2 px-3 text-stone-800 font-bold">&#123;&#123; params.eventCount &#125;&#125;</td>
                      <td className="py-2 px-3 text-stone-600 font-sans">Total Upcoming Events Count</td>
                      <td className="py-2 px-3 text-stone-500 font-sans">{twoMonthEvents.length}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Free Plan Overview */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-950 text-sm">
                    100% Free Automated Weekly Sending via Brevo
                  </h4>
                  <p className="text-emerald-800 leading-relaxed text-xs">
                    Unlike MailerLite and Kit which paywall RSS campaigns, <strong>Brevo (formerly Sendinblue)</strong> includes RSS-to-email on their <strong>Free Plan</strong>. It supports <strong>up to 100,000 contacts</strong> and <strong>300 emails/day</strong> free forever. For a weekly list of ≤250 subscribers, your Monday broadcast uses 250 of your 300 daily emails, remaining 100% free with no credit card required.
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-3">
              <h5 className="font-bold text-stone-900">
                Weekly Automated Digest Schedule:
              </h5>
              <ol className="list-decimal list-inside space-y-2 text-stone-700 leading-relaxed pl-1 text-xs">
                <li>
                  Sign up for a free account at <a href="https://www.brevo.com" target="_blank" rel="noopener noreferrer" className="text-stone-900 underline font-semibold">brevo.com</a> (no credit card needed).
                </li>
                <li>
                  Click your account name in top-right → <strong>Integrations</strong> → search and click <strong>RSS Campaign</strong>.
                </li>
                <li>
                  Paste your <strong>Feed URL</strong> above, choose schedule: <strong>Weekly (Monday at 8:00 AM)</strong>, select your subscriber list, and activate.
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 3: Subscribers list & CSV export */}
        {activeTab === 'subscribers' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">
                  Subscribed Email Addresses ({subscribers.length})
                </h4>
                <p className="text-stone-500 text-xs">
                  Collected from the public website newsletter signup form
                </p>
              </div>

              <a
                href="/api/newsletter/subscribers.csv"
                download="vcd-event-subscribers.csv"
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Subscribers CSV</span>
              </a>
            </div>

            {isLoadingSubs ? (
              <div className="py-12 text-center text-stone-500 text-xs">
                Loading subscribers...
              </div>
            ) : subscribers.length === 0 ? (
              <div className="p-8 border border-dashed border-stone-300 rounded-xl text-center text-stone-500 text-xs">
                No subscribers yet. When visitors sign up using the newsletter form on the calendar, they will appear here.
              </div>
            ) : (
              <div className="border border-stone-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-100 text-stone-600 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Subscribed Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {subscribers.map((sub) => (
                      <tr key={sub.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-4 font-medium text-stone-900">{sub.email}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-medium rounded-full text-[10px]">
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-stone-500">
                          {new Date(sub.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Raw HTML and Markdown code */}
        {activeTab === 'html' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500">
                Ready-to-paste email content formatted for any provider or manual blast:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(markdownContent, 'md')}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                >
                  {copiedMd ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMd ? 'Copied MD!' : 'Copy Markdown'}</span>
                </button>
                <button
                  onClick={() => handleCopy(htmlContent, 'html')}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  {copiedHtml ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHtml ? 'Copied HTML!' : 'Copy HTML Email'}</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-stone-900 text-stone-100 rounded-xl text-xs font-mono overflow-x-auto max-h-80 leading-relaxed">
              {htmlContent}
            </pre>
          </div>
        )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate">Automated 60-day rolling window · Free up to 1,000 subscribers</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
