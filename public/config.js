// Public settings for the live site. These two values are safe to publish:
// the anon key only allows what the database's row-level security allows.
// Leave supabaseUrl empty to run the old prototype (everything in memory, nothing charged).
window.FETTLE_CONFIG = {
  supabaseUrl: "",      // e.g. https://abcdefgh.supabase.co
  supabaseAnonKey: "",  // Supabase > Project settings > API > anon public key
  siteUrl: "https://getfettle.co.uk",  // used in shared score links
  freeBook: true        // winter test: the digital book is free (with a free account), so Stripe isn't needed yet
};
