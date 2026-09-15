import { Certificate } from '../types';
import api from '../services/api';

/**
 * Builds a standalone, print-optimized HTML string for the No Due Certificate.
 * Contains embedded print stylesheets, high-resolution layout, QR code, and signatures.
 */
export function buildCertificatePrintHtml(cert: Certificate, originUrl?: string): string {
  const origin = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const verifyUrl = `${origin}/verify/${cert.verification_code}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(verifyUrl)}`;
  const issuedDateStr = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>No Due Certificate - ${cert.certificate_number} - ${cert.student_name || 'Student'}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background-color: #ffffff;
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      padding: 10px;
    }
    .cert-outer-wrapper {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 3px double #1e1b4b;
      border-radius: 20px;
      padding: 36px 44px;
      position: relative;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08);
    }
    @media print {
      body {
        padding: 0 !important;
        margin: 0 !important;
      }
      .cert-outer-wrapper {
        border: 2.5px double #1e1b4b !important;
        box-shadow: none !important;
        padding: 28px 36px !important;
        max-width: 100% !important;
        border-radius: 12px !important;
        page-break-inside: avoid;
      }
      .no-print {
        display: none !important;
      }
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.035;
      pointer-events: none;
      user-select: none;
      z-index: 0;
    }
    .watermark svg {
      width: 380px;
      height: 380px;
    }
    .cert-content {
      position: relative;
      z-index: 1;
      text-align: center;
    }
    .header-crest {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background-color: #1e1b4b;
      color: #ffffff;
      border-radius: 16px;
      margin-bottom: 12px;
      box-shadow: 0 4px 10px rgba(30, 27, 75, 0.2);
    }
    .header-crest svg {
      width: 32px;
      height: 32px;
    }
    .college-name {
      font-family: 'Cinzel', Georgia, serif;
      font-weight: 800;
      font-size: 26px;
      letter-spacing: 0.5px;
      color: #0f172a;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .affiliation {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-top: 5px;
    }
    .sub-office {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
      margin-top: 3px;
    }
    .header-divider {
      height: 2px;
      background: linear-gradient(to right, transparent, #cbd5e1, transparent);
      margin: 18px 0;
    }
    .badge-clearance {
      display: inline-block;
      padding: 4px 16px;
      background-color: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 9999px;
      color: #3730a3;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .cert-main-title {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 10px;
    }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 7px 18px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #475569;
      margin: 16px auto;
      max-width: 580px;
    }
    .meta-bar strong {
      color: #0f172a;
    }
    .meta-bar .code-highlight {
      color: #4338ca;
      font-weight: 700;
    }
    .cert-body {
      max-width: 680px;
      margin: 18px auto;
      text-align: justify;
      font-size: 13.5px;
      line-height: 1.7;
      color: #334155;
    }
    .cert-body p {
      margin-bottom: 12px;
    }
    .highlight-bold {
      font-weight: 700;
      color: #0f172a;
    }
    .reg-number {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #1e1b4b;
      background-color: #f1f5f9;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .no-due-tag {
      font-weight: 800;
      color: #065f46;
      background-color: #d1fae5;
      padding: 2px 8px;
      border-radius: 6px;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cert-footer {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .qr-block {
      display: flex;
      align-items: center;
      gap: 14px;
      text-align: left;
    }
    .qr-frame {
      padding: 6px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .qr-frame img {
      display: block;
      width: 78px;
      height: 78px;
    }
    .qr-meta-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .qr-meta-sub {
      font-size: 10px;
      color: #64748b;
      max-width: 170px;
      line-height: 1.35;
      margin-top: 3px;
    }
    .qr-meta-link {
      font-size: 9.5px;
      font-family: 'JetBrains Mono', monospace;
      color: #4f46e5;
      margin-top: 4px;
      word-break: break-all;
    }
    .signatories-block {
      display: flex;
      align-items: flex-end;
      gap: 36px;
      text-align: center;
    }
    .signatory {
      width: 130px;
    }
    .sig-name {
      font-family: 'Cinzel', Georgia, serif;
      font-style: italic;
      font-size: 13px;
      font-weight: 700;
      color: #1e1b4b;
      min-height: 26px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .sig-line {
      height: 1.5px;
      background-color: #64748b;
      margin: 6px auto 4px;
      width: 110px;
    }
    .sig-title {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="cert-outer-wrapper">
    <!-- Institutional Watermark -->
    <div class="watermark">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
      </svg>
    </div>

    <div class="cert-content">
      <!-- Header / Crest -->
      <div>
        <div class="header-crest">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
            <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
          </svg>
        </div>
        <h1 class="college-name">College of Engineering</h1>
        <p class="affiliation">Autonomous Institution &bull; Approved by AICTE &bull; Affiliated to Anna University &bull; NAAC 'A+'</p>
        <p class="sub-office">Office of Academic Affairs & Institutional Clearances (CIAT - I / II / End Sem)</p>
      </div>

      <div class="header-divider"></div>

      <!-- Title -->
      <div>
        <span class="badge-clearance">Official Institutional Clearance</span>
        <h2 class="cert-main-title">No Due Certificate</h2>
      </div>

      <!-- Metadata Bar -->
      <div class="meta-bar">
        <div><span>Cert No:</span> <strong>${cert.certificate_number}</strong></div>
        <div style="color: #cbd5e1;">|</div>
        <div><span>Verification:</span> <span class="code-highlight">${cert.verification_code}</span></div>
        <div style="color: #cbd5e1;">|</div>
        <div><span>Date:</span> <strong>${issuedDateStr}</strong></div>
      </div>

      <!-- Certification Statement -->
      <div class="cert-body">
        <p>
          This is to officially certify that <span class="highlight-bold">${cert.student_name || 'STUDENT'}</span>,
          bearing Registration Number <span class="reg-number">${cert.register_number || 'N/A'}</span>,
          enrolled in the academic program <span class="highlight-bold">${cert.course_name || 'Undergraduate Degree'}</span>
          within the Department of <span class="highlight-bold">${cert.department_name || 'Engineering'}</span>,
          has satisfactorily completed all institutional clearance and verification protocols.
        </p>
        <p>
          As of <span class="highlight-bold">${issuedDateStr}</span>, the aforementioned candidate has returned all issued library books,
          surrendered laboratory equipments, settled financial fees, vacated residential hostel inventory, and resolved all departmental obligations.
          There are <span class="no-due-tag">NO OUTSTANDING DUES</span> recorded against this student across any institutional division.
        </p>
      </div>

      <!-- Footer: QR Code & Signatures -->
      <div class="cert-footer">
        <!-- QR Code -->
        <div class="qr-block">
          <div class="qr-frame">
            <img src="${qrUrl}" alt="Verification QR" />
          </div>
          <div>
            <div class="qr-meta-title">
              <svg style="width:14px; height:14px; color:#059669;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
              Tamper-Proof QR
            </div>
            <p class="qr-meta-sub">
              Scan with any camera or scanner to verify institutional authenticity on the public registry.
            </p>
            <p class="qr-meta-link">${verifyUrl}</p>
          </div>
        </div>

        <!-- Authorized Signatures -->
        <div class="signatories-block">
          <div class="signatory">
            <div class="sig-name">Dean of Academics</div>
            <div class="sig-line"></div>
            <div class="sig-title">Dean (Academics)</div>
          </div>
          <div class="signatory">
            <div class="sig-name">Dr. T. Senthilvel</div>
            <div class="sig-line"></div>
            <div class="sig-title">Principal</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers printing using a hidden sandbox iframe.
 * If browser policy blocks iframe printing (common in embedded iframes), returns ok: false.
 */
export async function printCertificateDirectly(cert: Certificate): Promise<{ ok: boolean; error?: string }> {
  try {
    const htmlContent = buildCertificatePrintHtml(cert, window.location.origin);
    const iframe = document.createElement('iframe');
    iframe.id = 'certificate-hidden-printer';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      document.body.removeChild(iframe);
      return { ok: false, error: 'Cannot access printer document context' };
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Give images a short moment to render
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch {
            // ignore
          }
        }, 60000);
        return { ok: true };
      }
    } catch (printErr: any) {
      // Browser blocked window.print() inside iframe
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      return { ok: false, error: printErr?.message || 'Iframe print blocked' };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Unknown print error' };
  }
}

/**
 * Downloads official PDF for the certificate from backend.
 */
export async function downloadCertificatePdfFile(certId: number, certNumber?: string): Promise<void> {
  const res = await api.get(`/certificates/${certId}/download`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `College_NoDue_Certificate_${certNumber || certId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
