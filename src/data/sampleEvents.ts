import { CommunityEvent } from '../types';

export const INITIAL_EVENTS: CommunityEvent[] = [
  {
    id: 'evt-101',
    title: 'Downtown Farmers & Artisans Market',
    date: '2026-10-24',
    time: '8:30 AM – 1:30 PM',
    location: 'Historic Downtown Plaza, 4th & Main St',
    description: 'Weekly gathering of local organic growers, bakers, ceramicists, and honey makers. Live acoustic music at the gazebo from 10 AM to noon. Bring your reusable bags and produce containers. Free admission.',
    contactEmail: 'organizers@downtownmarket.org',
    status: 'approved',
    createdAt: '2026-10-14T09:15:00.000Z',
    reviewedAt: '2026-10-14T11:20:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-102',
    title: 'Community Garden Workday & Native Seed Swap',
    date: '2026-10-25',
    time: '10:00 AM – 1:00 PM',
    location: 'Oak Ridge Community Gardens, Plot 14 (South Gate)',
    description: 'Help prepare the winter garden beds, prune berry canes, and exchange heirloom vegetable and wildflower seeds. Free compost tea demonstration at 11:30 AM. Gardening tools and gloves provided, or bring your favorites.',
    contactEmail: 'greenthumb@oakridgegarden.org',
    status: 'approved',
    createdAt: '2026-10-15T14:30:00.000Z',
    reviewedAt: '2026-10-15T16:00:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-103',
    title: 'Acoustic Porch Concert & Open Mic',
    date: '2026-10-27',
    time: '6:30 PM – 9:00 PM',
    location: 'The Old Mill Pavilion, Riverside Way',
    description: 'A cozy evening of unplugged folk, bluegrass, poetry, and storytelling. 10-minute sign-up slots available at the door starting at 6:00 PM. Hot cider and herbal tea provided by the Riverside Neighborhood Guild. Folding chairs welcome.',
    contactEmail: 'music@riversidearts.org',
    status: 'approved',
    createdAt: '2026-10-16T11:00:00.000Z',
    reviewedAt: '2026-10-16T13:45:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-104',
    title: 'Free Intro to Web Building & Coding Workshop',
    date: '2026-10-29',
    time: '6:00 PM – 8:00 PM',
    location: 'Public Library Tech Center, 2nd Floor Room B',
    description: 'Hands-on beginner workshop for teens and adults curious about building web pages, community sites, and simple apps. No coding background required. Library laptops available or bring your own wifi-enabled laptop.',
    contactEmail: 'programs@citylibrary.lib.org',
    status: 'approved',
    createdAt: '2026-10-16T15:20:00.000Z',
    reviewedAt: '2026-10-17T09:10:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-105',
    title: 'Sunset Outdoor Cinema: The Princess Bride',
    date: '2026-10-31',
    time: '6:45 PM – 9:00 PM',
    location: 'Heritage Park Great Lawn, near the amphitheater',
    description: 'Annual autumn family movie night under the open sky! Bring blankets, low lawn chairs, and warm layers. Free popcorn provided by the Parks Association. Film begins promptly at dusk (around 7:10 PM).',
    contactEmail: 'events@heritageparkfriends.org',
    status: 'approved',
    createdAt: '2026-10-17T08:00:00.000Z',
    reviewedAt: '2026-10-17T10:15:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-106',
    title: 'Riverside Trail Cleanup & Willow Tree Planting',
    date: '2026-11-03',
    time: '9:00 AM – 12:30 PM',
    location: 'North Bank Trailhead, River Mile Marker 3',
    description: 'Volunteer riverbank restoration morning. We will be clearing storm debris and planting 80 native willow saplings along the erosion barrier. Trash grabbers, bags, and water refills provided. Wear sturdy boots.',
    contactEmail: 'stewardship@riveralliance.org',
    status: 'approved',
    createdAt: '2026-10-17T18:00:00.000Z',
    reviewedAt: '2026-10-18T08:30:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-107',
    title: 'All-Ages Community Board Game & Puzzle Night',
    date: '2026-11-06',
    time: '6:00 PM – 9:30 PM',
    location: 'St. Jude Fellowship Hall, 220 Elm St',
    description: 'Casual community game night with over 60 tabletop games available: Catan, Ticket to Ride, Wingspan, chess, backgammon, and cooperative games. Feel free to bring your own favorites. Coffee, tea, and cookies available.',
    contactEmail: 'gamenight@stjudecenter.org',
    status: 'approved',
    createdAt: '2026-10-18T10:00:00.000Z',
    reviewedAt: '2026-10-18T12:00:00.000Z',
    reviewedBy: 'Nick'
  },
  {
    id: 'evt-108',
    title: 'Neighborhood Fall Book Swap & Story Circle',
    date: '2026-11-09',
    time: '11:00 AM – 2:00 PM',
    location: 'Cornerstone Cafe Courtyard, 18 Maple Ave',
    description: 'Take a book, leave a book! Fiction, non-fiction, cookbooks, and kids books. Children storytime circle at 11:30 AM led by retired educator Maria Gomez. 10% discount on warm drinks for swap participants.',
    contactEmail: 'books@maplestreetguild.org',
    status: 'approved',
    createdAt: '2026-10-18T11:45:00.000Z',
    reviewedAt: '2026-10-18T13:30:00.000Z',
    reviewedBy: 'Nick'
  },
  // Sample Pending Submissions for Nick's Moderation Queue
  {
    id: 'evt-109',
    title: 'Artisan Sourdough Baking & Starter Workshop',
    date: '2026-11-12',
    time: '2:00 PM – 4:30 PM',
    location: 'Community Center Commercial Kitchen, 300 Center St',
    description: 'Learn the fundamentals of wild yeast fermentation, stretch-and-fold technique, scoring, and baking in Dutch ovens. Every participant takes home an active 100-year-old starter jar and a proofing basket.',
    contactEmail: 'clara.sourdough@example.com',
    status: 'pending',
    createdAt: '2026-10-18T14:10:00.000Z'
  },
  {
    id: 'evt-110',
    title: 'Bicycle Winterization & Brake Tuning Clinic',
    date: '2026-11-15',
    time: '10:00 AM – 1:00 PM',
    location: 'Eastside Bike Path Pavillion, 800 East Ave',
    description: 'Free volunteer-run bicycle safety checks: chain degreasing, cable tensioning, brake pad alignment, and wet-weather tire pressure tips. Donations of spare tubes and lights welcome.',
    contactEmail: 'pedal.dan@commutercollective.org',
    status: 'pending',
    createdAt: '2026-10-18T14:35:00.000Z'
  }
];
