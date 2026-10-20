export interface CommunityEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g., "10:00 AM – 1:00 PM" or "All Day"
  startTime?: string; // e.g., "10:00" (24-hour HH:mm)
  endTime?: string;   // e.g., "13:00" (24-hour HH:mm)
  isAllDay?: boolean;
  location: string;
  description: string;
  contactEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string; // ISO date string
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  suggestedEditForId?: string;
  suggestedEditTitle?: string;
}

export interface EventSubmissionInput {
  title: string;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  location: string;
  description: string;
  contactEmail?: string;
  suggestedEditForId?: string;
  suggestedEditTitle?: string;
  suggestionReason?: string;
  _hp_website?: string; // Honeypot field
  _opened_at?: number;  // Dwell-time check
}

export interface ModerationAction {
  action: 'approve' | 'reject';
  notes?: string;
}

export interface EventFilterState {
  searchQuery: string;
  timeframe: 'all' | 'upcoming' | 'this-week' | 'this-month';
}
