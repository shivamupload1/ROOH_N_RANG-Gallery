import {
  Album,
  Camera,
  Clapperboard,
  Contact,
  Diamond,
  Film,
  Heart,
  Images,
  Inbox,
  MapPin,
  Plane,
  Sparkles,
  Video
} from "lucide-react";

export const brand = {
  name: "ROOH & RANG Stories",
  tagline: "Rooh se judi kahaniyan, rangon mein amar.",
  city: "Jaipur, Rajasthan",
  whatsapp: "+91 90000 00000",
  whatsappHref: "https://wa.me/919000000000",
  email: "hello@roohandrangstories.in",
  instagram: "@roohandrangstories"
};

export const navItems = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/services", label: "Services" },
  { href: "/packages", label: "Packages" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" }
];

export const services = [
  {
    title: "Wedding Photography",
    description: "Emotional, editorial wedding coverage built around real moments, family rituals, and royal detail.",
    icon: Camera
  },
  {
    title: "Cinematic Videography",
    description: "Warm wedding films, teasers, and reels that feel intimate without losing the scale of the celebration.",
    icon: Film
  },
  {
    title: "Pre-wedding Shoots",
    description: "Styled couple portraits across palaces, havelis, dunes, gardens, and meaningful personal places.",
    icon: Heart
  },
  {
    title: "Albums & Prints",
    description: "Premium album curation and print-ready selections for keepsakes that can stay in the family.",
    icon: Album
  },
  {
    title: "Drone Coverage",
    description: "Elegant aerial perspectives for venues, baraats, decor, and large-scale wedding entries.",
    icon: Plane
  },
  {
    title: "Private Client Gallery",
    description: "A secure gallery experience with PIN access, favorites, downloads, and Drive delivery.",
    icon: Images
  }
];

export const detailedServices = [
  ...services,
  {
    title: "Engagement Shoot",
    description: "Polished portraits and candid moments for announcements, invitations, and family memories.",
    icon: Diamond
  },
  {
    title: "Haldi / Mehendi Coverage",
    description: "Color-rich coverage of close family rituals, playful moments, details, and celebration energy.",
    icon: Sparkles
  }
];

export const packages = [
  {
    name: "Essential Story",
    price: "Rs. 35,000+",
    description: "A focused one-day package for intimate ceremonies and small celebrations.",
    includes: ["1 day coverage", "Edited photos", "Online gallery", "Basic cinematic highlights"]
  },
  {
    name: "Signature Story",
    price: "Rs. 75,000+",
    description: "A balanced photo and film package for two-day wedding celebrations.",
    includes: ["2 day coverage", "Photo + video", "Cinematic teaser", "Online private gallery", "Album selection"],
    featured: true
  },
  {
    name: "Royal Story",
    price: "Rs. 1,25,000+",
    description: "A premium multi-day story for families who want the full cinematic treatment.",
    includes: ["Multi-day coverage", "Premium team", "Cinematic film", "Drone coverage", "Private gallery", "Album + reels"]
  }
];

export const portfolioItems = [
  {
    title: "Wedding",
    category: "Wedding",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Pre-wedding",
    category: "Pre-wedding",
    image: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Haldi",
    category: "Haldi",
    image: "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Mehendi",
    category: "Mehendi",
    image: "https://images.unsplash.com/photo-1597157639073-69284dc0fdaf?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Reception",
    category: "Reception",
    image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Couple Portraits",
    category: "Couple Portraits",
    image: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80"
  }
];

export const adminNavItems = [
  { href: "/admin", label: "Dashboard Overview", icon: Sparkles },
  { href: "/admin/clients", label: "Clients", icon: Contact },
  { href: "/admin/drive-accounts", label: "Drive Accounts", icon: Images },
  { href: "/admin/events", label: "Events", icon: MapPin },
  { href: "/admin/albums", label: "Albums", icon: Album },
  { href: "/admin/media", label: "Media Library", icon: Camera },
  { href: "/admin/galleries", label: "Galleries", icon: Images },
  { href: "/admin/downloads", label: "Downloads", icon: Video },
  { href: "/admin/favorites", label: "Favorites / Album Selection", icon: Heart },
  { href: "/admin/inquiries", label: "Inquiries", icon: Inbox },
  { href: "/admin/content", label: "Website Content", icon: Clapperboard },
  { href: "/admin/settings", label: "Settings", icon: Sparkles }
];
