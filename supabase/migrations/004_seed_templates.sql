-- ============================================================
-- 004_seed_templates.sql
-- ValueShare — Campaign template reference data
-- ============================================================

CREATE TABLE campaign_templates_ref (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  default_headline TEXT NOT NULL,
  default_subheadline TEXT,
  default_description TEXT,
  default_benefits JSONB DEFAULT '[]',
  default_how_it_works JSONB DEFAULT '[]',
  default_kpi_type TEXT DEFAULT 'clicks',
  default_threshold INTEGER DEFAULT 50,
  default_reward_label TEXT,
  suggested_deadline_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SEED DATA ──────────────────────────────────────────

INSERT INTO campaign_templates_ref (
  template_key, name, description, icon,
  default_headline, default_subheadline, default_description,
  default_benefits, default_how_it_works,
  default_kpi_type, default_threshold, default_reward_label, suggested_deadline_days
) VALUES
(
  'webinar_referral',
  'Webinar Referral Campaign',
  'Drive registrations to your live or recorded webinar by rewarding participants who bring sign-ups.',
  '🎙️',
  'Invite Friends & Unlock Exclusive Bonuses',
  'Share this webinar with your network and earn rewards for every sign-up',
  'Help us spread the word about this must-attend webinar. The more people you refer who register, the bigger your rewards. Top referrers get exclusive access to bonus content and VIP perks.',
  '["Exclusive bonus materials for top referrers", "Early access to the webinar recording", "Direct Q&A session with the speaker", "VIP community access for engaged participants"]'::jsonb,
  '[{"step": 1, "title": "Get Your Link", "description": "Sign up and receive your unique referral link instantly"}, {"step": 2, "title": "Share With Friends", "description": "Send your link to colleagues and friends who would benefit from this webinar"}, {"step": 3, "title": "Earn Rewards", "description": "When your referrals register, you unlock exclusive bonuses automatically"}]'::jsonb,
  'registrations', 10, 'Exclusive Webinar Bonus Pack', 7
),
(
  'ebook_giveaway',
  'Free Ebook / PDF Giveaway',
  'Give away a free ebook or PDF resource in exchange for referral clicks to grow your audience.',
  '📚',
  'Share & Unlock Your Free Ebook',
  'Spread the word and get instant access to our premium guide — completely free',
  'We created an in-depth guide packed with actionable insights. Instead of charging for it, we are giving it away to anyone who helps us reach more people. Share your unique link and once you hit the target, the ebook is yours.',
  '["Professionally designed 50+ page ebook", "Actionable strategies you can implement today", "Bonus worksheets and templates included", "Lifetime access — download and keep forever"]'::jsonb,
  '[{"step": 1, "title": "Enter Your Email", "description": "Join the campaign and get your personal share link"}, {"step": 2, "title": "Share on Social Media", "description": "Post your link on WhatsApp, Twitter, LinkedIn, or anywhere your audience hangs out"}, {"step": 3, "title": "Download Your Ebook", "description": "Once enough people click your link, your download unlocks instantly"}]'::jsonb,
  'clicks', 30, 'Premium Ebook Download', 14
),
(
  'video_content',
  'Exclusive Video Content Unlock',
  'Offer exclusive video content that unlocks when participants drive enough referral traffic.',
  '🎬',
  'Unlock Exclusive Video Content',
  'Help us grow and get instant access to premium video lessons',
  'We have recorded exclusive video content that is not available anywhere else. By sharing your referral link and driving views, you earn access to this premium content. The more you share, the more you unlock.',
  '["Hours of exclusive, never-before-seen video content", "Step-by-step tutorials from industry experts", "New content added as stretch goals are reached", "Stream anytime — no expiration on access"]'::jsonb,
  '[{"step": 1, "title": "Sign Up Free", "description": "Create your account and get your unique referral link"}, {"step": 2, "title": "Invite Your Network", "description": "Share your link via social media, email, or messaging apps"}, {"step": 3, "title": "Watch & Learn", "description": "Hit the referral threshold and start streaming exclusive videos immediately"}]'::jsonb,
  'clicks', 50, 'Exclusive Video Series Access', 10
),
(
  'whatsapp_share',
  'WhatsApp Status Share Campaign',
  'Optimized for WhatsApp sharing — participants post to their status and share in groups to earn rewards.',
  '💬',
  'Share on WhatsApp & Win Rewards',
  'Post to your WhatsApp status and groups to unlock amazing prizes',
  'This campaign is designed for WhatsApp power users. Simply share your unique link on your WhatsApp status or in groups. When your contacts click through, you earn points toward your reward. It takes just 30 seconds to share.',
  '["Takes less than 30 seconds to participate", "Pre-written share messages ready to copy", "Real-time tracking of your referral clicks", "Rewards delivered instantly via WhatsApp"]'::jsonb,
  '[{"step": 1, "title": "Get Your Link", "description": "Enter your email and receive a personalized share link"}, {"step": 2, "title": "Post on WhatsApp", "description": "Share to your status or forward to groups with the pre-written message"}, {"step": 3, "title": "Claim Your Reward", "description": "Watch your clicks grow in real-time and claim your reward when you hit the target"}]'::jsonb,
  'clicks', 30, 'WhatsApp Exclusive Reward', 3
),
(
  'product_launch',
  'Product Launch Waitlist',
  'Build a viral waitlist for your product launch by rewarding early supporters who bring in sign-ups.',
  '🚀',
  'Join the Waitlist & Get Early Access',
  'Be first in line — refer friends to move up and unlock launch-day perks',
  'Our product is launching soon and we want you to be first in line. Join the waitlist and share with friends to move up the queue. Top referrers get exclusive early access, founder pricing, and launch-day bonuses that will not be available after launch.',
  '["Priority early access before the public launch", "Exclusive founder pricing locked in forever", "Direct access to the founding team", "Limited-edition launch bonuses for top referrers"]'::jsonb,
  '[{"step": 1, "title": "Join the Waitlist", "description": "Enter your email to reserve your spot and get your unique referral link"}, {"step": 2, "title": "Refer Friends", "description": "Share your link with people who would love this product"}, {"step": 3, "title": "Move Up the Queue", "description": "Each referral who signs up moves you closer to early access and exclusive perks"}]'::jsonb,
  'registrations', 5, 'Early Access + Founder Pricing', 30
);
