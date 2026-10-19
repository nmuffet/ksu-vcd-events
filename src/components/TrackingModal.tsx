import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { CommunityEvent } from '../types';
import { X, Search, Clock, CheckCircle2, XCircle, Calendar, MapPin } from 'lucide-react';
import { formatDateLong } from '../utils/dateUtils';

interface TrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrackingId?: string;
}

export const TrackingModal: React.FC<TrackingModalProps> = ({
  isOpen,
  onClose,
  initialTrackingId = '',
}) => {
  const [trackingId, setTrackingId] = useState(initialTrackingId);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CommunityEvent | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLookup = useCallback(async (idToLookUp?: string) => {
    const query = (idToLookUp !== undefined ? idToLookUp : trackingId).trim();
    if (!query) return;

    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await api.trackEvent(query);
      setResult(data);
      setHasSearched(true);
      if (!data) {
        setErrorMsg('No submission found with that reference ID. Please check and try again.');
      }
    } catch {
      setErrorMsg('Could not retrieve tracking details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [trackingId]);

  useEffect(() => {
    if (isOpen && initialTrackingId) {
      setTrackingId(initialTrackingId);
      handleLookup(initialTrackingId);
    } else if (!isOpen) {
      setResult(null);
      setHasSearched(false);
      setErrorMsg('');
    }
  }, [initialTrackingId, isOpen, handleLookup]);

  const getStatusBadge = (status: 'pending' | 'approved' | 'rejected') => {
    switch (status) {
      case 'approved':
        return (
          <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 text-sm">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
            <div>
              <div className="font-semibold text-teal-900">Approved & Published</div>
              <div className="text-xs text-teal-700">This event is active on the public community calendar.</div>
            </div>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-2 p-3 bg-stone-100 border border-stone-300 rounded-lg text-stone-800 text-sm">
            <XCircle className="w-5 h-5 text-stone-500 shrink-0" />
            <div>
              <div className="font-semibold text-stone-900">Not Approved</div>
              <div className="text-xs text-stone-600">This submission did not meet the community guidelines.</div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-semibold text-amber-950">Pending Moderation</div>
              <div className="text-xs text-amber-800">Nick is currently reviewing this submission before publishing.</div>
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Track Event Submission</h3>
            <p className="text-xs text-stone-500">Check the moderation status of an anonymous submission</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Paste reference ID (e.g. evt-109)"
                className="w-full px-3.5 py-2 pl-9 text-sm font-mono bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-900"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            </div>
            <button
              type="submit"
              disabled={isLoading || !trackingId.trim()}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 shrink-0"
            >
              {isLoading ? 'Checking...' : 'Check Status'}
            </button>
          </form>

          {errorMsg && (
            <div className="p-3 bg-stone-100 border border-stone-200 text-stone-700 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          {result && (
            <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 space-y-4">
              {getStatusBadge(result.status)}

              <div>
                <h4 className="text-base font-bold text-stone-900 mb-1">{result.title}</h4>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 mb-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>{formatDateLong(result.date)} · {result.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span>{result.location}</span>
                  </div>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed bg-white p-3 rounded-lg border border-stone-200/60">
                  {result.description}
                </p>
              </div>

              <div className="text-[11px] text-stone-400 font-mono flex items-center justify-between pt-1">
                <span>Submitted: {new Date(result.createdAt).toLocaleDateString()}</span>
                <span>ID: {result.id}</span>
              </div>
            </div>
          )}

          {!result && !hasSearched && (
            <div className="text-xs text-stone-500 bg-stone-50 p-3.5 rounded-lg border border-stone-200/60">
              <span className="font-medium text-stone-700">Quick tip:</span> When you submit an event, a unique tracking code (e.g. <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-800">evt-109</code>) is generated. You can paste it here anytime to check if Nick has approved it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
