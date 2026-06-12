import { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';

// ── Inject Google Fonts ───────────────────────────────
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// ── FAQ Item ──────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #e0e0e0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', textAlign: 'left',
          padding: '1.25rem 0', fontSize: '1rem', fontWeight: '600', color: '#1c1c1c',
          cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: '1rem', fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {q}
        <span style={{ fontSize: '1.4rem', color: '#1a6b4a', transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>+</span>
      </button>
      {open && (
        <div style={{ paddingBottom: '1.25rem', color: '#5a5a5a', fontSize: '0.95rem', lineHeight: '1.7' }}
          dangerouslySetInnerHTML={{ __html: a }}
        />
      )}
    </div>
  );
}

// ── Section Label ─────────────────────────────────────
function SLabel({ children }) {
  return <div style={{ fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a6b4a', marginBottom: '0.5rem' }}>{children}</div>;
}

function STitle({ children, center }) {
  return <h2 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', color: '#124d35', marginBottom: '1rem', fontFamily: "'DM Serif Display', serif", fontWeight: 400, textAlign: center ? 'center' : 'left' }}>{children}</h2>;
}

// ── Responsive helpers ────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

function useIsTablet() {
  const [tablet, setTablet] = useState(window.innerWidth < 900);
  useEffect(() => {
    const fn = () => setTablet(window.innerWidth < 900);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return tablet;
}

// ── Page sections ─────────────────────────────────────

function Hero({ mobile }) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #f0f9f4 0%, #e8f5ef 60%, #fff8e6 100%)', padding: mobile ? '3rem 1.5rem 2.5rem' : '5rem 0 4rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', padding: mobile ? '0' : '0 1.5rem' }}>
        <div style={{ display: 'inline-block', background: '#fff8e6', color: '#9a6700', border: '1px solid #f0d080', borderRadius: '50px', fontSize: '0.82rem', fontWeight: '600', padding: '0.3rem 0.9rem', marginBottom: '1.2rem', letterSpacing: '0.02em' }}>
          🌍 100% Free · No Money Transfers · Trusted by Communities
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', color: '#124d35', marginBottom: '1.2rem', fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}>
          Manage Your <em style={{ fontStyle: 'italic', color: '#1a6b4a' }}>Savings Circle</em><br />the Smart Way
        </h1>
        <p style={{ fontSize: '1.15rem', color: '#5a5a5a', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: '1.7' }}>
          RoscaApp is a free, transparent platform for managing Rotating Savings and Credit Associations (ROSCAs). Track contributions, schedule payouts, and keep your group organised — all in one place, at no cost.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login" style={{ background: '#1a6b4a', color: 'white', padding: '0.85rem 2rem', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', textDecoration: 'none' }}>
            Start Managing Free
          </Link>
          <a href="#about" style={{ border: '2px solid #1a6b4a', color: '#1a6b4a', padding: '0.85rem 2rem', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', textDecoration: 'none', background: 'transparent' }}>
            Learn How It Works
          </a>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#5a5a5a', marginTop: '1rem' }}>No credit card needed. No money passes through us. Ever.</p>
      </div>
    </div>
  );
}

function NamesStrip() {
  const names = ['Susu', 'Esusu', 'Ajo', 'Pardna', 'Paluwagan', 'Chama', 'Tontine', 'Stokfel', 'Hui', 'Tanda', 'Gameya', 'Kameti', 'Arisan', 'Consorcio', 'Pandero'];
  const doubled = [...names, ...names];
  return (
    <div style={{ background: '#1a6b4a', color: 'white', padding: '0.85rem 0', overflow: 'hidden', whiteSpace: 'nowrap' }}>
      <style>{`@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      <div style={{ display: 'inline-flex', gap: '2rem', animation: 'scroll 22s linear infinite' }}>
        {doubled.map((n, i) => (
          <span key={i} style={{ fontSize: '0.85rem', fontWeight: '500', opacity: 0.88 }}>{n} ·</span>
        ))}
      </div>
    </div>
  );
}

function WhatIsRosca({ tablet }) {
  return (
    <section id="about" style={{ background: '#f8faf9', padding: '4.5rem 0' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: tablet ? '1fr' : '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
          <div>
            <SLabel>What is a ROSCA?</SLabel>
            <STitle>A Tradition of Community Savings, Now Digital</STitle>
            <p style={{ color: '#5a5a5a', marginBottom: '1rem', lineHeight: '1.7' }}>
              A Rotating Savings and Credit Association (ROSCA) is one of the world's oldest and most widely used financial tools. Known by hundreds of names — Susu in West Africa, Pardna in Jamaica, Paluwagan in the Philippines, Chama in Kenya — over <strong>1 billion people</strong> across 90+ countries participate in these savings circles.
            </p>
            <p style={{ color: '#5a5a5a', marginBottom: '1rem', lineHeight: '1.7' }}>
              Each member contributes a fixed amount every period. One member receives the entire pooled amount in rotation. Everyone gets their turn. No interest, no banks — just community trust.
            </p>
            <p style={{ color: '#5a5a5a', lineHeight: '1.7' }}>
              <strong>RoscaApp digitises the record-keeping</strong> so your group can focus on trust, not spreadsheets.
            </p>
          </div>
          <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e0e0e0', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#124d35', marginBottom: '0.75rem' }}>How a 4-member circle works</div>
            {[
              ['1', '4 members each contribute £200/month', '→'],
              ['2', 'Month 1: Member A receives £800', '↻'],
              ['3', 'Month 2: Member B receives £800', '↻'],
              ['4', 'Continues until all members have received', '✓'],
            ].map(([num, text, arrow]) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: '#f8faf9', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                <div style={{ width: '28px', height: '28px', background: '#1a6b4a', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: '700', flexShrink: 0 }}>{num}</div>
                <div dangerouslySetInnerHTML={{ __html: text.replace(/£\d+/g, m => `<strong>${m}</strong>`) }} />
                <div style={{ color: '#f0a500', fontSize: '1.1rem', marginLeft: 'auto' }}>{arrow}</div>
              </div>
            ))}
            <div style={{ background: '#e8f5ef', borderRadius: '8px', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#124d35' }}>
              💡 Everyone saves the same amount, everyone receives the same lump sum. No interest charged.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Features({ tablet, mobile }) {
  const cols = mobile ? '1fr' : tablet ? '1fr 1fr' : 'repeat(3, 1fr)';
  const features = [
    ['⚡', 'Quick Group Setup', 'Create your circle in minutes. Set the contribution amount, cycle length, and invite members with a simple link.'],
    ['📊', 'Transparent Tracking', 'Every member can see who has paid and who hasn\'t. No more chasing, no more guesswork — full visibility for all.'],
    ['🔔', 'Automated Reminders', 'Gentle automated reminders go out before payment is due. No awkward conversations — the app handles it.'],
    ['📅', 'Payout Schedule', 'A clear, visual payout schedule so every member knows exactly when it\'s their turn to receive the pot.'],
    ['🔒', 'Secure & Private', 'Your group\'s data is protected with industry-standard encryption. Only members can see group activity.'],
    ['📱', 'Works on Any Device', 'RoscaApp works in any browser on mobile, tablet, or desktop. No app download needed.'],
  ];
  return (
    <section style={{ padding: '4.5rem 0' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <SLabel>What RoscaApp Does</SLabel>
          <STitle center>Everything Your Circle Needs</STitle>
          <p style={{ color: '#5a5a5a', maxWidth: '560px', margin: '0 auto', fontSize: '1.05rem' }}>Powerful tools to keep your group transparent, organised and drama-free.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '1.5rem', marginTop: '2.5rem' }}>
          {features.map(([icon, title, desc]) => (
            <div key={title} style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '10px', padding: '1.75rem', transition: 'box-shadow 0.2s, transform 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(26,107,74,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ width: '46px', height: '46px', background: '#e8f5ef', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontSize: '1.3rem' }}>{icon}</div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: '#124d35', fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}>{title}</h3>
              <p style={{ fontSize: '0.9rem', color: '#5a5a5a', lineHeight: '1.6' }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FreeBanner() {
  return (
    <section style={{ background: '#1a6b4a', color: 'white', textAlign: 'center', padding: '3.5rem 1.5rem' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem', fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}>Always Free. No Catch.</h2>
      <p style={{ opacity: 0.88, maxWidth: '560px', margin: '0 auto 1.75rem', fontSize: '1.05rem', lineHeight: '1.7' }}>
        RoscaApp is completely free to use. No subscription fees, no transaction charges, no hidden costs. We believe everyone deserves access to good financial tools.
      </p>
      <Link to="/login" style={{ background: 'white', color: '#1a6b4a', padding: '0.85rem 2.2rem', borderRadius: '8px', fontWeight: '700', fontSize: '1rem', textDecoration: 'none', display: 'inline-block' }}>
        Get Started Free →
      </Link>
    </section>
  );
}

function GlobalNames({ mobile }) {
  const names = [
    ['Susu', 'Ghana, Nigeria, Trinidad'],
    ['Esusu', 'Nigeria, Yoruba'],
    ['Ajo', 'Nigeria'],
    ['Pardna', 'Jamaica & Caribbean'],
    ['Paluwagan', 'Philippines'],
    ['Chama', 'Kenya & East Africa'],
    ['Tontine', 'West Africa, France'],
    ['Stokvel', 'South Africa'],
    ['Hui', 'China, Taiwan'],
    ['Tanda', 'Mexico, Latin America'],
    ['Gameya', 'Egypt, Middle East'],
    ['Kameti', 'India, Pakistan'],
    ['Arisan', 'Indonesia'],
    ['Consorcio', 'Brazil'],
    ['Pandero', 'Peru'],
    ['Xitique', 'Mozambique'],
  ];
  const cols = mobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))';
  return (
    <section id="names" style={{ background: '#f8faf9', padding: '4.5rem 0' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 1.5rem' }}>
        <SLabel>Known Around the World</SLabel>
        <STitle>One Idea, A Hundred Names</STitle>
        <p style={{ color: '#5a5a5a', maxWidth: '560px', fontSize: '1.05rem', lineHeight: '1.7' }}>
          The ROSCA concept exists in almost every culture and continent. Whatever you call yours, RoscaApp helps you manage it.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '0.6rem', marginTop: '2rem' }}>
          {names.map(([name, region]) => (
            <div key={name} style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '50px', padding: '0.4rem 0.9rem', fontSize: '0.85rem', textAlign: 'center', color: '#5a5a5a' }}>
              <strong style={{ color: '#1c1c1c' }}>{name}</strong> — {region}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ tablet, mobile }) {
  const cols = mobile ? '1fr' : tablet ? '1fr 1fr' : 'repeat(3, 1fr)';
  const testimonials = [
    ["RoscaApp has transformed how our Susu group works. No more arguments about who paid and who didn't.", "Abena M., London"],
    ["Finally, a free tool that understands how our Paluwagan works. Simple and transparent.", "Maria R., Leicester"],
    ["We've been running our Chama for 8 years on paper. RoscaApp made it so much easier.", "James K., Birmingham"],
  ];
  return (
    <section style={{ padding: '4.5rem 0' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <SLabel>What Members Say</SLabel>
          <STitle center>Trusted by Savings Circles Worldwide</STitle>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '1.5rem', marginTop: '2.5rem' }}>
          {testimonials.map(([quote, cite]) => (
            <div key={cite} style={{ background: '#f8faf9', borderRadius: '10px', padding: '1.5rem', borderLeft: '4px solid #1a6b4a' }}>
              <p style={{ fontSize: '0.92rem', color: '#5a5a5a', fontStyle: 'italic', marginBottom: '0.75rem', lineHeight: '1.7' }}>"{quote}"</p>
              <cite style={{ fontSize: '0.83rem', fontWeight: '600', color: '#1c1c1c', fontStyle: 'normal' }}>{cite}</cite>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = [
    ['Is RoscaApp really free?', 'Yes — completely free. No subscription, no transaction fees, no hidden charges. RoscaApp is a record-keeping tool, not a financial service provider.'],
    ['Does money pass through RoscaApp?', 'No. RoscaApp is purely a record-keeping and management tool. All money transfers happen directly between your group members, exactly as they always have. We never touch or hold your money.'],
    ['How do I start a savings circle?', 'Register for a free account, create a group, set your contribution amount and cycle length, then share the group link with your members. They register and join — it takes about 5 minutes.'],
    ['Can I manage multiple circles?', 'Yes. You can be a member of multiple circles and manage as many as you need, all from one account.'],
    ['Is my data secure?', 'Yes. We use HTTPS encryption, password hashing, and strict access controls. Only group members can see group data. We never sell your data.'],
    ['What if a member misses a payment?', 'The platform tracks all contributions clearly, so the group can see who has and hasn\'t paid. You can use the automated reminder feature to nudge members. How you handle disputes remains within your group — we provide the records, not the enforcement.'],
    ['Can I export our records?', 'Yes. Group reports can be exported so you have a permanent record of all contributions and payouts.'],
    ['Does it work on mobile?', 'Yes. RoscaApp is fully responsive and works on any smartphone, tablet, or computer browser. No app download required.'],
  ];
  return (
    <section id="faq" style={{ background: '#f8faf9', padding: '4.5rem 0' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 1.5rem' }}>
        <SLabel>FAQ</SLabel>
        <STitle>Frequently Asked Questions</STitle>
        <div style={{ marginTop: '2rem' }}>
          {faqs.map(([q, a]) => <FaqItem key={q} q={q} a={a} />)}
        </div>
      </div>
    </section>
  );
}

function TermsSection() {
  return (
    <section id="terms" style={{ padding: '4.5rem 0' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ background: '#f8faf9', borderBottom: '1px solid #e0e0e0', padding: '3.5rem 0 2.5rem', marginBottom: '2rem' }}>
          <SLabel>Legal</SLabel>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#124d35', marginBottom: '0.5rem', fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}>Terms &amp; Conditions</h1>
          <p style={{ color: '#5a5a5a', fontSize: '1.05rem' }}>Last updated: June 2025</p>
        </div>
        <div style={{ lineHeight: '1.8', color: '#1c1c1c' }}>
          {[
            ['1. Acceptance of Terms', 'By accessing or using RoscaApp you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the platform.'],
            ['2. What RoscaApp Is', 'RoscaApp is a free digital record-keeping and group management tool for Rotating Savings and Credit Associations (ROSCAs). <strong>RoscaApp is not a financial institution, payment processor, bank, or money transfer service.</strong> We do not hold, move, or process any money on behalf of users or groups. All financial transactions take place directly between group members, outside of this platform.'],
            ['3. Eligibility', 'You must be at least 18 years old to create an account. By registering, you confirm that all information you provide is accurate and that you will keep it up to date.'],
            ['4. Your Responsibilities', `<ul style="padding-left:1.5rem;margin-top:0.5rem;">
              <li>You are responsible for all activity on your account.</li>
              <li>You must keep your password secure and not share it with others.</li>
              <li>You must not use RoscaApp for any unlawful purpose.</li>
              <li>You are responsible for the accuracy of the contribution and payout records you enter.</li>
              <li>RoscaApp does not mediate financial disputes between group members.</li>
            </ul>`],
            ['5. No Financial Advice', 'Nothing on RoscaApp constitutes financial, legal, or tax advice. The platform is an organisational tool only. Consult a qualified professional for financial guidance.'],
            ['6. Limitation of Liability', 'RoscaApp is provided "as is" without warranties of any kind. We are not liable for any financial losses, disputes between group members, data inaccuracies entered by users, or service interruptions. Our liability is limited to the maximum extent permitted by UK law.'],
            ['7. Intellectual Property', 'All content, design, and code on RoscaApp is owned by us or licensed to us. You may not copy, reproduce, or distribute it without our written permission.'],
            ['8. Termination', 'We reserve the right to suspend or terminate accounts that violate these terms or that we reasonably believe are being used unlawfully.'],
            ['9. Changes to These Terms', 'We may update these Terms from time to time. Continued use of RoscaApp after changes are posted constitutes acceptance of the new Terms.'],
            ['10. Governing Law', 'These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.'],
            ['11. Contact', 'For any questions about these Terms, please contact us via the details in the footer.'],
          ].map(([title, content]) => (
            <div key={title} style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontFamily: "'DM Serif Display', serif", fontWeight: 400, color: '#124d35', marginBottom: '0.5rem' }}>{title}</h2>
              <div dangerouslySetInnerHTML={{ __html: content }} style={{ color: '#5a5a5a', lineHeight: '1.8' }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section id="privacy" style={{ background: '#f8faf9', padding: '4.5rem 0' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 1.5rem' }}>
        <SLabel>Legal</SLabel>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#124d35', marginBottom: '0.5rem', fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}>Privacy Policy</h1>
        <p style={{ color: '#5a5a5a', fontSize: '1.05rem', marginBottom: '2rem' }}>Last updated: June 2025</p>
        <div style={{ lineHeight: '1.8', color: '#5a5a5a' }}>
          {[
            ['1. Who We Are', 'RoscaApp ("we", "us", "our") operates the RoscaApp platform at roscaapp.com. We are committed to protecting your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.'],
            ['2. Data We Collect', `<ul style="padding-left:1.5rem;margin-top:0.5rem;">
              <li><strong>Account data:</strong> name, email address, phone number, and password (hashed — we never store plain-text passwords)</li>
              <li><strong>Group data:</strong> contribution records, payout schedules, and group membership information you enter</li>
              <li><strong>Usage data:</strong> basic server logs including IP addresses and browser type, retained for security purposes</li>
            </ul>`],
            ['3. How We Use Your Data', `We use your data to:<ul style="padding-left:1.5rem;margin-top:0.5rem;">
              <li>Provide and maintain the RoscaApp service</li>
              <li>Manage your account and the circles you are part of</li>
              <li>Send contribution reminders and platform notifications</li>
              <li>Respond to your support requests</li>
              <li>Improve the platform through aggregated usage analysis</li>
              <li>Comply with legal obligations</li>
            </ul><p style="margin-top:0.75rem;">We do not use your data for advertising. We do not sell your data to any third party, ever.</p>`],
            ['4. Legal Basis for Processing (UK GDPR)', `<ul style="padding-left:1.5rem;margin-top:0.5rem;">
              <li><strong>Contract:</strong> Processing necessary to provide the service you've signed up for</li>
              <li><strong>Legitimate interests:</strong> Platform security, fraud prevention, and service improvement</li>
              <li><strong>Legal obligation:</strong> Where required by law</li>
              <li><strong>Consent:</strong> For any optional communications (you can withdraw at any time)</li>
            </ul>`],
            ['5. Data Sharing', `We share your data only in the following limited circumstances:<ul style="padding-left:1.5rem;margin-top:0.5rem;">
              <li><strong>With circle members:</strong> Other members of your circle can see your name and contribution records within that circle</li>
              <li><strong>Service providers:</strong> We use trusted third-party services (e.g., hosting, email delivery) who process data on our behalf under strict data processing agreements</li>
              <li><strong>Legal requirements:</strong> If required by law or to protect our legal rights</li>
            </ul><p style="margin-top:0.75rem;">We never sell, rent, or share your data with marketing companies or advertisers.</p>`],
            ['6. Data Retention', 'We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal compliance. Circle records may be retained for a limited period after circle completion.'],
            ['7. Your Rights', `Under UK GDPR, you have the right to:<ul style="padding-left:1.5rem;margin-top:0.5rem;">
              <li><strong>Access</strong> the personal data we hold about you</li>
              <li><strong>Correct</strong> inaccurate data</li>
              <li><strong>Delete</strong> your data ("right to be forgotten")</li>
              <li><strong>Restrict</strong> or object to certain processing</li>
              <li><strong>Data portability</strong> — receive your data in a machine-readable format</li>
              <li><strong>Withdraw consent</strong> at any time where processing is based on consent</li>
            </ul><p style="margin-top:0.75rem;">To exercise any of these rights, contact us using the footer details. We will respond within 30 days.</p>`],
            ['8. Cookies', 'RoscaApp uses essential cookies to keep you logged in and maintain your session. We do not use third-party advertising cookies or tracking pixels. You can control cookies through your browser settings.'],
            ['9. Security', 'We implement industry-standard security measures including encrypted data transmission (HTTPS), password hashing, and access controls. We encourage you to use a strong, unique password for your account.'],
            ['10. International Transfers', 'Our platform is primarily hosted in the UK/EEA. If any data is transferred outside these regions, we ensure appropriate safeguards are in place in accordance with UK GDPR requirements.'],
            ['11. Changes to This Policy', 'We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a prominent notice on the platform.'],
            ['12. Contact & Complaints', 'For any privacy-related questions or to exercise your rights, please contact us via the footer. If you are not satisfied with our response, you have the right to lodge a complaint with the UK Information Commissioner\'s Office (ICO) at ico.org.uk.'],
          ].map(([title, content]) => (
            <div key={title} style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontFamily: "'DM Serif Display', serif", fontWeight: 400, color: '#124d35', marginBottom: '0.5rem' }}>{title}</h2>
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ mobile }) {
  return (
    <footer style={{ background: '#124d35', color: 'white', padding: '3.5rem 0 0' }}>
      <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(4, 1fr)', gap: '2rem', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', color: 'white', marginBottom: '0.75rem' }}>
              Rosca<span style={{ color: '#f0a500' }}>App</span>
            </div>
            <p style={{ color: '#8abba0', fontSize: '0.88rem', lineHeight: '1.6' }}>
              A free, transparent platform for managing Rotating Savings and Credit Associations. No money transfers. No hidden costs. Just better records for your community.
            </p>
            <p style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#5a907a' }}>🌍 Used by savings circles worldwide</p>
          </div>
          <div>
            <h4 style={{ color: 'white', fontSize: '0.82rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Platform</h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {[['Home', '/'], ['Login', '/login'], ['Create Account', '/login'], ['Contact', '/contact']].map(([label, to]) => (
                <li key={label} style={{ marginBottom: '0.5rem' }}>
                  <Link to={to} style={{ color: '#8abba0', fontSize: '0.88rem', textDecoration: 'none' }}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ color: 'white', fontSize: '0.82rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Legal</h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {[['Terms & Conditions', '#terms'], ['Privacy Policy', '#privacy'], ['Cookie Policy', '#privacy'], ['Blog', '']].map(([label, href]) => (
                <li key={label} style={{ marginBottom: '0.5rem' }}>
                  <a href={href} style={{ color: '#8abba0', fontSize: '0.88rem', textDecoration: 'none' }}>{label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={{ color: 'white', fontSize: '0.82rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>Learn More</h4>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {[['What is a ROSCA?', '#about'], ['How It Works', '#about'], ['Global ROSCA Names', '#names'], ['FAQs', '#faq']].map(([label, href]) => (
                <li key={label} style={{ marginBottom: '0.5rem' }}>
                  <a href={href} style={{ color: '#8abba0', fontSize: '0.88rem', textDecoration: 'none' }}>{label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ fontSize: '0.82rem', color: '#5a907a' }}>© 2025 RoscaApp. All rights reserved. RoscaApp is a free record-keeping tool and is not a financial service provider.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/about-the-developer" style={{ fontSize: '0.82rem', color: '#5a907a', textDecoration: 'none' }}>
    Developer
  </Link>
            <a href="#privacy" style={{ fontSize: '0.82rem', color: '#5a907a', textDecoration: 'none' }}>Privacy</a>
            <a href="#terms" style={{ fontSize: '0.82rem', color: '#5a907a', textDecoration: 'none' }}>Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main page ─────────────────────────────────────────
export default function HomePage() {
  const mobile = useIsMobile();
  const tablet = useIsTablet();

  return (
    <>
      <SEO
        title="Free ROSCA &amp; Savings Circle Management"
        description="RoscaApp is a free platform to manage rotating savings and credit associations (ROSCAs), susu, chit funds, tontines and pardner circles. Track contributions, payouts and members online."
        path="/"
      />
      <div style={{ fontFamily: "'DM Sans', sans-serif", color: '#1c1c1c', background: 'white' }}>
      <Hero mobile={mobile} />
      <NamesStrip />
      <WhatIsRosca tablet={tablet} />
      <Features tablet={tablet} mobile={mobile} />
      <FreeBanner />
      <GlobalNames mobile={mobile} />
      <Testimonials tablet={tablet} mobile={mobile} />
      <FaqSection />
      <TermsSection />
      <PrivacySection />
      <Footer mobile={mobile} />
    </div>
    </>
  );
}
