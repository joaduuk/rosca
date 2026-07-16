import { useState } from 'react';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';

// ── Section Label (matches HomePage/ContactPage style) ──
function SLabel({ children }) {
  return (
    <div style={{ fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a6b4a', marginBottom: '0.5rem' }}>
      {children}
    </div>
  );
}

function STitle({ children }) {
  return (
    <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', color: '#124d35', marginBottom: '0.75rem', fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}>
      {children}
    </h2>
  );
}

// ── Collapsible step group, styled like the FAQ accordion ──
function GuideStep({ number, title, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '10px', marginBottom: '1rem', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', textAlign: 'left',
          padding: '1.1rem 1.25rem', cursor: 'pointer', display: 'flex',
          alignItems: 'center', gap: '0.9rem', fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ width: '30px', height: '30px', background: '#e8f5ef', color: '#1a6b4a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '700', flexShrink: 0 }}>
          {number}
        </div>
        <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1c1c1c', flex: 1 }}>{title}</span>
        <span style={{ fontSize: '1.4rem', color: '#1a6b4a', transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '0 1.25rem 1.25rem 3.15rem', color: '#5a5a5a', fontSize: '0.92rem', lineHeight: '1.7' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function InfoCallout({ icon, title, children, tone = 'green' }) {
  const bg = tone === 'gold' ? '#fff8e6' : '#e8f5ef';
  const border = tone === 'gold' ? '#f0d080' : '#cdeadd';
  const titleColor = tone === 'gold' ? '#9a6700' : '#124d35';
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '1.1rem 1.25rem', marginTop: '1rem' }}>
      <div style={{ fontWeight: '600', color: titleColor, marginBottom: '0.35rem', fontSize: '0.9rem' }}>{icon} {title}</div>
      <div style={{ color: '#5a5a5a', fontSize: '0.88rem', lineHeight: '1.6' }}>{children}</div>
    </div>
  );
}

export default function UserGuidePage() {
  return (
    <>
      <SEO
        title="User Guide"
        description="Step-by-step guide to creating and managing a savings circle on RoscaApp — from registration to adding members and recording payments."
        path="/user-guide"
      />
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#f8faf9', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #f0f9f4, #e8f5ef)', padding: '3.5rem 1.5rem 3rem', textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1a6b4a', marginBottom: '0.5rem' }}>Getting Started</div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#124d35', marginBottom: '0.75rem', fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 }}>User Guide</h1>
          <p style={{ color: '#5a5a5a', fontSize: '1.05rem', maxWidth: '560px', margin: '0 auto' }}>
            Everything you need to create a savings circle, add members, and keep every cycle on track.
          </p>
        </div>

        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>

          {/* Quick nav */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '2.5rem' }}>
            {['Dashboard', 'Create a Group', 'Add Members', 'Manage a Group', 'No Email? No Problem'].map((label, i) => (
              <a
                key={label}
                href={`#step-${i + 1}`}
                style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: '50px', padding: '0.4rem 0.9rem', fontSize: '0.82rem', color: '#1a6b4a', textDecoration: 'none', fontWeight: '600' }}
              >
                {label}
              </a>
            ))}
          </div>

          {/* Step 1 — Dashboard */}
          <div id="step-1">
            <SLabel>Step 1</SLabel>
            <STitle>Register, Log In, and Find Your Way Around</STitle>
            <p style={{ color: '#5a5a5a', lineHeight: '1.7', marginBottom: '1.25rem' }}>
              If you don't already have an account, register first — it only takes a minute. Once you're registered, log in to reach your dashboard, the home base for everything you'll do on RoscaApp.
            </p>
            <GuideStep number="i" title="What you'll see on your Dashboard" defaultOpen>
              <p style={{ marginBottom: '0.6rem' }}>Your dashboard gives you access to:</p>
              <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                <li><strong>Reports</strong> — summaries and activity across your groups</li>
                <li><strong>Manage</strong> — tools for running your groups day to day</li>
                <li><strong>Profile</strong> — your details and your personal invite code</li>
                <li><strong>Notifications</strong> — updates on payments and group activity</li>
                <li><strong>My Groups</strong> — every group you belong to or run, with its contribution amount, frequency, status, and current cycle at a glance</li>
              </ul>
            </GuideStep>
          </div>

          {/* Step 2 — Create a group */}
          <div id="step-2" style={{ marginTop: '2.5rem' }}>
            <SLabel>Step 2</SLabel>
            <STitle>Create a New Group</STitle>
            <p style={{ color: '#5a5a5a', lineHeight: '1.7', marginBottom: '1.25rem' }}>
              From your dashboard, click <strong>+ New Group</strong> and fill in the basics: the group name, contribution amount and currency, how often members pay (e.g. weekly), and the contribution type (e.g. fixed). Save it, and your group appears in <strong>My Groups</strong>, active and ready for Cycle 1.
            </p>
          </div>

          {/* Step 3 — Add members */}
          <div id="step-3" style={{ marginTop: '2.5rem' }}>
            <SLabel>Step 3</SLabel>
            <STitle>Add Members — the Most Important Step</STitle>
            <p style={{ color: '#5a5a5a', lineHeight: '1.7', marginBottom: '1.25rem' }}>
              A group isn't a group without its members. Once it's created, open it and click <strong>+ Add Member</strong>. You'll see two ways to add someone — pick whichever fits.
            </p>
            <GuideStep number="i" title="Option A: Add with invite code (member is already registered)" defaultOpen>
              Every RoscaApp user has a unique invite code, shown on their Profile page, for example:
              <div style={{ background: '#f8faf9', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '0.85rem 1rem', marginTop: '0.75rem', fontFamily: 'monospace', fontSize: '0.9rem', color: '#124d35' }}>
                Your Invite Code<br /><strong>RC-SJFUBB</strong>
              </div>
              <p style={{ marginTop: '0.75rem' }}>Ask your member for their invite code, enter it in the Add Member screen, and they'll be added to the group. You may also be asked to assign a guarantor for that member — this is entirely optional; leave it blank and you (the admin) will be assigned automatically.</p>
            </GuideStep>
            <GuideStep number="ii" title="Option B: Add an offline member (no account needed)">
              Not every member wants — or is able — to register their own account. In the Add Member screen, switch to the <strong>Add Offline Member</strong> tab and enter just their name. Email and phone are both optional.
              <p style={{ marginTop: '0.75rem' }}>
                That's it — they're added to the group immediately, take their place in the payout order, and you can record their contributions on their behalf, the same way you'd manage a paper ledger entry. There's no pending step and no pressure for them to ever create an account — offline is a fully complete, permanent way to be a group member.
              </p>
            </GuideStep>
          </div>

          {/* Step 4 — Manage */}
          <div id="step-4" style={{ marginTop: '2.5rem' }}>
            <SLabel>Step 4</SLabel>
            <STitle>Manage Your Group</STitle>
            <p style={{ color: '#5a5a5a', lineHeight: '1.7', marginBottom: '1.25rem' }}>
              Once members are in, your group page becomes mission control for each cycle. At a glance you'll see:
            </p>
            <ul style={{ paddingLeft: '1.2rem', color: '#5a5a5a', lineHeight: '1.8', marginBottom: '1.25rem' }}>
              <li><strong>Group details</strong> — contribution amount, frequency, type, currency, and member count</li>
              <li><strong>Active cycle</strong> — which payment cycle is currently running</li>
              <li><strong>Cycle status</strong> — how many members have paid, and what percentage is collected</li>
              <li><strong>Financial summary</strong> — expected total, amount collected, and amount remaining</li>
              <li><strong>Payout status</strong> — whether a payout has been scheduled</li>
              <li><strong>Member Payment Status</strong> — a table of every member's payout order, status, and paid date</li>
            </ul>
            <p style={{ color: '#5a5a5a', lineHeight: '1.7' }}>
              As admin, click <strong>Record Payment</strong> next to a member once you've received their contribution, so the cycle stays accurate for everyone.
            </p>
          </div>

          {/* Step 5 — No email */}
          <div id="step-5" style={{ marginTop: '2.5rem' }}>
            <SLabel>Step 5</SLabel>
            <STitle>Members Without an Email, Phone, or Account</STitle>
            <p style={{ color: '#5a5a5a', lineHeight: '1.7', marginBottom: '1rem' }}>
              RoscaApp exists to replace manual, paper-based record keeping with automatic tracking and notifications — especially valuable once a group grows large. Even so, not everyone will have an email address, a smartphone, or want an account of their own — and that's completely fine.
            </p>
            <p style={{ color: '#5a5a5a', lineHeight: '1.7' }}>
              This is exactly what <strong>offline members</strong> (Option B in Step 3) are for. As group admin, add them by name — nothing else required:
            </p>
            <ol style={{ paddingLeft: '1.2rem', color: '#5a5a5a', lineHeight: '1.8', margin: '0.75rem 0 0' }}>
              <li>Open <strong>+ Add Member</strong> and switch to the <strong>Add Offline Member</strong> tab.</li>
              <li>Enter their name. Email and phone are optional — add them only if you have them.</li>
              <li>They're added instantly, with a full spot in the payout order and contribution tracking, same as any registered member.</li>
            </ol>
            <InfoCallout icon="✅" title="This is fully supported">
              An offline member is a permanent, first-class way to be in a group — not a placeholder waiting to be finished. You record their contributions and payouts directly, the same way you'd keep a paper ledger, for as long as that's what suits them. If they ever do want to register their own account later, that's a bonus — never a requirement.
            </InfoCallout>
          </div>

          {/* Summary table */}
          <div style={{ marginTop: '3rem', background: 'white', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#124d35', fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400, marginBottom: '1rem' }}>Quick Summary</h3>
            <div>
              {[
                ['1', 'Register or log in'],
                ['2', 'Click + New Group and enter the group details'],
                ['3', 'Click + Add Member'],
                ['4', "Option A: enter the member's invite code (found on their Profile page)"],
                ['5', 'Option B: switch to Add Offline Member and enter just their name — no account needed'],
                ['6', 'Optional: assign or accept a guarantor role (invite-code members only)'],
                ['7', 'Use Record Payment to track contributions each cycle'],
              ].map(([num, text]) => (
                <div key={num} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid #f0f0f0', fontSize: '0.9rem', color: '#3a3a3a' }}>
                  <span style={{ color: '#1a6b4a', fontWeight: '700', flexShrink: 0 }}>{num}.</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA back to contact */}
          <div style={{ marginTop: '2.5rem', textAlign: 'center', color: '#5a5a5a', fontSize: '0.9rem' }}>
            Still have questions?{' '}
            <Link to="/contact" style={{ color: '#1a6b4a', fontWeight: '600', textDecoration: 'none' }}>
              Contact us
            </Link>{' '}
            and we'll help you out.
          </div>
        </div>
      </div>
    </>
  );
}
