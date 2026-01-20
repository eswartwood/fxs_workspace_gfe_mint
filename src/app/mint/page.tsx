// src/app/mint/page.tsx
import React from 'react';
import Link from 'next/link';

export default function MintPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '40px 24px',
        display: 'flex',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at top, #1f2933 0, #020617 45%, #000000 100%)',
        color: '#f9fafb',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 960,
          background: 'rgba(15,23,42,0.9)',
          borderRadius: 24,
          border: '1px solid rgba(148,163,184,0.3)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          padding: 32,
        }}
      >
        {/* Top bar */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Placeholder for the GFE seal – you can swap this for the real PNG later */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '2px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.12,
              }}
            >
              GFE
            </div>
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                Global File Exchange
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}
              >
                Credential &amp; Provenance
              </div>
            </div>
          </div>

          <nav
            style={{
              display: 'flex',
              gap: 16,
              fontSize: 13,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            <Link href="https://globaldatacapture.com" style={{ color: '#9ca3af' }}>
              GDC
            </Link>
            <span style={{ color: '#4b5563' }}>•</span>
            <span style={{ color: '#e5e7eb' }}>Mint Media</span>
          </nav>
        </header>

        {/* Intro copy */}
        <section style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#9ca3af',
              marginBottom: 8,
            }}
          >
            Media Mint
          </div>
          <h1
            style={{
              fontSize: 28,
              lineHeight: 1.2,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            Mint a credentialed file from your media.
          </h1>
          <p style={{ fontSize: 14, color: '#9ca3af', maxWidth: 640 }}>
            Upload a single piece of media and attach the identity details you want
            locked to it. We’ll return a signed <code>.fxs</code> file that bundles
            your content, metadata, and certificate structure in one container.
          </p>
        </section>

        {/* Mint form */}
        <form
          method="POST"
          action="/api/mint"
          encType="multipart/form-data"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)',
            gap: 24,
          }}
        >
          {/* Left column – media + identity */}
          <div
            style={{
              padding: 20,
              borderRadius: 16,
              border: '1px solid rgba(55,65,81,0.8)',
              background: 'linear-gradient(135deg,#020617,#020617 55%,#020617)',
            }}
          >
            <h2
              style={{
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: 2,
                color: '#9ca3af',
                marginBottom: 16,
              }}
            >
              Media &amp; Identity
            </h2>

            {/* Media file */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="media"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}
              >
                Media file<span style={{ color: '#f97316' }}> *</span>
              </label>
              <input
                id="media"
                name="media"
                type="file"
                required
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #4b5563',
                  backgroundColor: '#020617',
                }}
              />
              <p style={{ marginTop: 4, fontSize: 11, color: '#6b7280' }}>
                Accepted: audio, video, image, or document files.
              </p>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="title"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}
              >
                Title<span style={{ color: '#f97316' }}> *</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="Example: Timberland Rising – Trailer v1"
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #4b5563',
                  backgroundColor: '#020617',
                }}
              />
            </div>

            {/* Creator */}
            <div style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="creator"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  Creator / Owner<span style={{ color: '#f97316' }}> *</span>
                </label>
                <input
                  id="creator"
                  name="creator"
                  type="text"
                  required
                  placeholder="Eric Swartwood"
                  style={{
                    width: '100%',
                    fontSize: 13,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #4b5563',
                    backgroundColor: '#020617',
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  Contact email (optional)
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="notifications@example.com"
                  style={{
                    width: '100%',
                    fontSize: 13,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #4b5563',
                    backgroundColor: '#020617',
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="description"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Short summary of what this media represents, where it comes from, or how it should be used."
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #4b5563',
                  backgroundColor: '#020617',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 4 }}>
              <label
                htmlFor="tags"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}
              >
                Tags (comma separated)
              </label>
              <input
                id="tags"
                name="tags"
                type="text"
                placeholder="music, trailer, timberland, v1"
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #4b5563',
                  backgroundColor: '#020617',
                }}
              />
            </div>
          </div>

          {/* Right column – rights & output */}
          <div
            style={{
              padding: 20,
              borderRadius: 16,
              border: '1px solid rgba(55,65,81,0.8)',
              background:
                'radial-gradient(circle at top, rgba(30,64,175,0.25), #020617 55%, #020617)',
            }}
          >
            <h2
              style={{
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: 2,
                color: '#9ca3af',
                marginBottom: 16,
              }}
            >
              Rights &amp; Output
            </h2>

            {/* Rights selection */}
            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="rights"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}
              >
                Rights label
              </label>
              <select
                id="rights"
                name="rights"
                defaultValue="all-rights-reserved"
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #4b5563',
                  backgroundColor: '#020617',
                  color: '#e5e7eb',
                }}
              >
                <option value="all-rights-reserved">All rights reserved</option>
                <option value="personal-noncommercial">Personal / non-commercial use</option>
                <option value="custom-license">Custom license (see description)</option>
              </select>
            </div>

            {/* Reference URL */}
            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="referenceUrl"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}
              >
                Reference URL (optional)
              </label>
              <input
                id="referenceUrl"
                name="referenceUrl"
                type="url"
                placeholder="Link where this media will live (YouTube, site, etc.)"
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #4b5563',
                  backgroundColor: '#020617',
                }}
              />
            </div>

            {/* Internal reference / project id */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="referenceId"
                style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}
              >
                Internal reference ID (optional)
              </label>
              <input
                id="referenceId"
                name="referenceId"
                type="text"
                placeholder="e.g. GFE-MEDIA-0001"
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #4b5563',
                  backgroundColor: '#020617',
                }}
              />
            </div>

            {/* Summary box */}
            <div
              style={{
                fontSize: 12,
                color: '#d1d5db',
                background: 'rgba(15,23,42,0.9)',
                borderRadius: 12,
                border: '1px solid rgba(55,65,81,0.9)',
                padding: 12,
                marginBottom: 16,
              }}
            >
              <strong style={{ display: 'block', marginBottom: 4 }}>
                What happens when you mint
              </strong>
              <ul style={{ paddingLeft: 18, margin: 0, listStyle: 'disc' }}>
                <li>
                  Your media and metadata are packaged into a signed{' '}
                  <code>.fxs</code> file.
                </li>
                <li>The file is returned to you for download immediately.</li>
                <li>
                  A copy can later be registered on-chain for pricing and
                  monetization.
                </li>
              </ul>
            </div>

            {/* Submit */}
            <button
              type="submit"
              style={{
                width: '100%',
                marginTop: 4,
                padding: '10px 14px',
                borderRadius: 999,
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                cursor: 'pointer',
                background:
                  'linear-gradient(135deg, #f97316, #facc15)',
                color: '#111827',
                boxShadow: '0 14px 40px rgba(251,191,36,0.35)',
              }}
            >
              Mint credentialed file
            </button>

            <p
              style={{
                marginTop: 8,
                fontSize: 11,
                color: '#6b7280',
                lineHeight: 1.4,
              }}
            >
              On submit, this page sends your details to the Global File Exchange
              builder and returns a downloadable <code>.fxs</code> file in your
              browser. No on-chain mint or email is triggered yet.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
