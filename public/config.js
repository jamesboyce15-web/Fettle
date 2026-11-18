// Public settings for the live site. These two values are safe to publish:
// the anon key only allows what the database's row-level security allows.
// Leave supabaseUrl empty to run the old prototype (everything in memory, nothing charged).
window.FETTLE_CONFIG = {
  supabaseUrl: "https://iuluoohtiewakwepbhsm.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1bHVvb2h0aWV3YWt3ZXBiaHNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0OTE0NjIsImV4cCI6MjExMDA2NzQ2Mn0.BuuIjJ_7GTxImk5g5cN-l3ozl04C97xgG6ATdN1Gae0",  // public by design: row-level security decides what it can do
  siteUrl: "https://getfettle.co.uk",  // used in shared score links
  freeBook: true,       // winter test: the digital book is free (with a free account), so Stripe isn't needed yet
  workbookUrl: "",      // the workbook's Amazon page, once it's on sale. Starts with https://. Empty hides the link on the home page.
  plusOn: false,        // true shows Fettle Plus subscribe buttons. Also needs PLUS_ON = "true" and the 4 Stripe prices in Cloudflare.
  amazonTag: "",        // Amazon Associates tracking ID (UK ones end in -21). Empty: shop links carry no tag and nothing is marked "paid link".
  turnstileSiteKey: ""  // Cloudflare Turnstile site key (public): the robot check when a new home joins a community. Its secret key goes in Cloudflare Pages as TURNSTILE_SECRET, never here.
};
