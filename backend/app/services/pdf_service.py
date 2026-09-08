import io
import os
import qrcode
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from backend.app.core.config import settings

def generate_certificate_pdf(
    student_name: str,
    register_number: str,
    course_name: str,
    department_name: str,
    academic_year: str,
    certificate_number: str,
    verification_code: str,
    issued_at: datetime
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'CollegeTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0f172a')
    )
    subtitle_style = ParagraphStyle(
        'CollegeSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#475569')
    )
    cert_heading_style = ParagraphStyle(
        'CertHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=10
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        alignment=TA_JUSTIFY,
        textColor=colors.HexColor('#1e293b')
    )
    meta_style = ParagraphStyle(
        'MetaText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748b')
    )
    meta_bold = ParagraphStyle(
        'MetaBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0f172a')
    )

    # 1. Header Banner
    story.append(Spacer(1, 10))
    story.append(Paragraph("APEX INSTITUTE OF TECHNOLOGY & HIGHER EDUCATION", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Approved by AICTE & Affiliated to State University | Institutional Accreditation Grade 'A+'<br/>Office of Academic Affairs & Student Clearance Administration", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1e40af'), spaceAfter=15, spaceBefore=5))

    # 2. Certificate Title Badge
    story.append(Paragraph("OFFICIAL NO DUE CLEARANCE CERTIFICATE", cert_heading_style))
    story.append(Paragraph("<i>Issued pursuant to complete departmental audit and institutional clearance protocol</i>", subtitle_style))
    story.append(Spacer(1, 15))

    # 3. Certificate Number & Issue Date Block
    formatted_date = issued_at.strftime("%B %d, %Y")
    cert_meta_data = [
        [
            Paragraph(f"<b>Certificate No:</b> <font color='#1e40af'>{certificate_number}</font>", meta_bold),
            Paragraph(f"<b>Issue Date:</b> {formatted_date}", ParagraphStyle('RightMeta', parent=meta_bold, alignment=TA_RIGHT))
        ]
    ]
    cert_meta_table = Table(cert_meta_data, colWidths=[260, 260])
    cert_meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(cert_meta_table)
    story.append(Spacer(1, 18))

    # 4. Student Information Grid
    student_table_data = [
        [
            Paragraph("<b>Candidate Name:</b>", meta_style),
            Paragraph(f"<b>{student_name.upper()}</b>", meta_bold),
            Paragraph("<b>Register Number:</b>", meta_style),
            Paragraph(f"<b>{register_number}</b>", meta_bold)
        ],
        [
            Paragraph("<b>Course / Program:</b>", meta_style),
            Paragraph(course_name, meta_bold),
            Paragraph("<b>Department:</b>", meta_style),
            Paragraph(department_name, meta_bold)
        ],
        [
            Paragraph("<b>Academic Year:</b>", meta_style),
            Paragraph(academic_year, meta_bold),
            Paragraph("<b>Status:</b>", meta_style),
            Paragraph("<font color='#16a34a'><b>ALL DUES CLEARED & WAIVED</b></font>", meta_bold)
        ]
    ]
    student_table = Table(student_table_data, colWidths=[110, 150, 110, 150])
    student_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(student_table)
    story.append(Spacer(1, 16))

    # 5. Clearance Certification Text
    cert_text = (
        f"This is to formally certify that <b>{student_name}</b> (Register No: <b>{register_number}</b>), "
        f"a bonafide student of <b>{course_name}</b> under the Department of <b>{department_name}</b>, "
        f"has satisfactorily cleared all outstanding dues, library books, laboratory apparatus, equipment, "
        f"tuition & exam fees, hostel & mess charges, transport passes, and sports amenities. "
        f"Official digital clearances from all assigned institutional departments have been authenticated and logged. "
        f"There are <b>NO OUTSTANDING DUES OR LIABILITIES</b> standing against the student as of <b>{formatted_date}</b>."
    )
    story.append(Paragraph(cert_text, body_style))
    story.append(Spacer(1, 14))

    # 6. Verified Departments Checklist
    departments_cleared = [
        ["✓ Central Library", "✓ Accounts & Finance", "✓ Academic Department", "✓ Laboratories"],
        ["✓ Hostel & Residence", "✓ Transport Facility", "✓ Sports & Athletics", "✓ Training & Placement"]
    ]
    dept_table_data = [
        [Paragraph(f"<font color='#16a34a'><b>{col}</b></font>", meta_bold) for col in row]
        for row in departments_cleared
    ]
    dept_table = Table(dept_table_data, colWidths=[130, 130, 130, 130])
    dept_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdf4')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#86efac')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#bbf7d0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(dept_table)
    story.append(Spacer(1, 20))

    # 7. QR Code Generation for Public Verification
    verify_url = f"{settings.FRONTEND_URL}/verify?code={verification_code}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=4,
        border=2,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0f172a", back_color="white")
    
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    reportlab_qr = Image(qr_buffer, width=1.1*inch, height=1.1*inch)

    # 8. Bottom Footer: QR & Verification on Left, Signatures on Right
    footer_data = [
        [
            reportlab_qr,
            Paragraph(
                f"<b>Digital Verification Code:</b><br/>"
                f"<font color='#1e40af' size='9'><b>{verification_code}</b></font><br/><br/>"
                f"<font size='8' color='#64748b'>Scan QR to verify certificate authenticity on the public college portal.</font>",
                meta_style
            ),
            Paragraph(
                "<br/><br/>"
                "<b>Dr. K. S. Ramanathan, Ph.D.</b><br/>"
                "<font color='#64748b'>Dean of Academic Affairs & Registrar</font><br/>"
                "<font color='#047857' size='8'>[Digitally Signed & Certified]</font>",
                ParagraphStyle('SignText', parent=meta_style, alignment=TA_CENTER)
            )
        ]
    ]
    footer_table = Table(footer_data, colWidths=[90, 220, 210])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(footer_table)

    # 9. Institutional Disclaimer Note
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#cbd5e1'), spaceAfter=6, spaceBefore=4))
    story.append(Paragraph(
        "Notice: This is an official computer-generated document from the College No Due Management System. "
        "Any alteration, forgery, or unauthorized reproduction is strictly prohibited and subject to institutional and legal prosecution.",
        ParagraphStyle('FooterDisclaimer', parent=meta_style, fontSize=7, leading=9, alignment=TA_CENTER, textColor=colors.HexColor('#94a3b8'))
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
