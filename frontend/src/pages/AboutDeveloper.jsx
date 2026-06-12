import founderPhoto from '../assets/founder-1.jpeg';
import SEO from '../components/SEO';

function AboutDeveloper() {
  return (
    <>
    <SEO
      title="About the Developer"
      description="Meet John Adu, MSc — founder and lead developer of RoscaApp. Software engineer with over 30 years of experience in fintech, banking systems and web development."
      path="/about-the-developer"
    />
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1rem',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
        maxWidth: '680px',
        width: '100%',
        padding: '3rem 2.5rem',
      }}>

        {/* Photo + Name side by side */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
        }}>
          <img
            src={founderPhoto}
            alt="John Adu"
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '4px solid #1a6b4a',
              boxShadow: '0 4px 16px rgba(26,107,74,0.2)',
              flexShrink: 0,
            }}
          />
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1a6b4a', margin: '0 0 0.25rem 0' }}>
              John Adu, MSc
            </h1>
            <p style={{ fontSize: '1rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '500' }}>
              Founder & Lead Developer
            </p>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
              RoscaApp
            </p>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '0 0 2rem 0' }} />

        {/* Bio */}
        <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.7, margin: '0 0 1.5rem 0' }}>
          Software engineer with over 30 years of experience in software development,
          banking systems, industrial automation and fintech innovation.
        </p>
        <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.7, margin: '0 0 2rem 0' }}>
          RoscaApp was created to modernise traditional savings circles through
          secure and transparent technology.
        </p>

        {/* Timeline */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1a6b4a', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 1rem 0' }}>
            Technology Journey
          </h3>
          {[
            { year: '1992', tech: 'COBOL & BASIC' },
            { year: '1997', tech: 'Visual FoxPro' },
            { year: '2000s', tech: 'ASP, ASP.NET, PHP' },
            { year: '2010s', tech: 'Symfony, CodeIgniter, Laravel' },
            { year: '2020s', tech: 'Python, Django, FastAPI, PostgreSQL, React & Fintech' },
          ].map(({ year, tech }) => (
            <div key={year} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.65rem' }}>
              <span style={{
                minWidth: 52,
                fontSize: '0.78rem',
                fontWeight: '700',
                color: 'white',
                background: '#1a6b4a',
                borderRadius: '6px',
                padding: '0.2rem 0.5rem',
                textAlign: 'center',
              }}>{year}</span>
              <span style={{ fontSize: '0.9rem', color: '#475569' }}>{tech}</span>
            </div>
          ))}
        </div>

        {/* WhatsApp CTA */}
        <div style={{ textAlign: 'center' }}>
          <a
            href="https://wa.me/447427642920"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#25d366',
              color: 'white',
              padding: '0.75rem 1.75rem',
              borderRadius: '50px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.95rem',
              boxShadow: '0 4px 12px rgba(37,211,102,0.3)',
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contact John on WhatsApp
          </a>
        </div>
      </div>
    </div>
    </>
  );
}

export default AboutDeveloper;
