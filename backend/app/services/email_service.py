from fastapi import APIRouter
from pathlib import Path
import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from jinja2 import Template
from typing import Dict

router = APIRouter()


load_dotenv()

EMAIL_HOST = os.getenv("SMTP_HOST")
EMAIL_PORT = int(os.getenv("SMTP_PORT", 587))
EMAIL_HOST_USER = os.getenv("SMTP_USER")
EMAIL_HOST_PASSWORD = os.getenv("SMTP_PASS")
DEFAULT_FROM_EMAIL = os.getenv("SMTP_FROM")


def send_email(subject: str, recipient: str, template_name: str, context: Dict[str, str]):
    try:
        BASE_DIR = Path(__file__).resolve().parent.parent
        templates_path = BASE_DIR / "templates"
        template_file = templates_path / template_name

        # Load and render the HTML template with context
        html_template = Path(template_file).read_text(encoding="utf-8")
        template = Template(html_template)
        rendered_html = template.render(**context)

        # Create message container
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = DEFAULT_FROM_EMAIL
        msg['To'] = recipient

        # Attach HTML content
         
        msg.attach(MIMEText(rendered_html, 'html'))

        # Connect to SMTP server and send email
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            server.sendmail(DEFAULT_FROM_EMAIL, recipient, msg.as_string())

        return True
    except Exception as ex:
        # Notify you via email if sending fails
        notify_admin_of_failure(recipient, str(ex))
        return False


def notify_admin_of_failure(failed_recipient: str, error_message: str):
    try:
        admin_email = "krushna.khairnar@digikore.com"  
        subject = f"Email Failure Alert: Unable to send to {failed_recipient}"

        body = f"""
        <html>
        <body>
            <h3>Email Sending Failed from CRM_LeadsV2.ai</h3>
            <p><strong>Recipient:</strong> {failed_recipient}</p>
            <p><strong>Error:</strong> {error_message}</p>
        </body>
        </html>
        """

        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = DEFAULT_FROM_EMAIL
        msg['To'] = admin_email
        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            server.sendmail(DEFAULT_FROM_EMAIL, admin_email, msg.as_string())

    except Exception as e:
        print(f"Failed to notify admin about email error: {e}")