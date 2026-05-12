from fastapi import APIRouter
from pathlib import Path
import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv # pyright: ignore[reportMissingImports]
import aiosmtplib # pyright: ignore[reportMissingImports]

router = APIRouter()


load_dotenv()

EMAIL_HOST = os.getenv("SMTP_HOST")
EMAIL_PORT = int(os.getenv("SMTP_PORT", 587))
EMAIL_HOST_USER = os.getenv("SMTP_USER")
EMAIL_HOST_PASSWORD = os.getenv("SMTP_PASS")
DEFAULT_FROM_EMAIL = os.getenv("SMTP_FROM")


async def send_email(
    to: str,
    subject: str,
    body: str,
    lead_name: str = "",
    followup_time: str = "",
    lead_link: str = "",
):

    BASE_DIR = Path(__file__).resolve().parent.parent.parent

    TEMPLATE_DIR = BASE_DIR / "EmailTemplates"

    load_dotenv(Path(BASE_DIR / ".env"))

    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASS = os.getenv("SMTP_PASS")
    SMTP_FROM = os.getenv("SMTP_FROM")

    if not all([
        SMTP_HOST,
        SMTP_PORT,
        SMTP_USER,
        SMTP_PASS,
        SMTP_FROM,
    ]):
        print("SMTP environment variables missing")
        return

    # Read HTML template
    template_path = TEMPLATE_DIR / "followUpEmail.html"

    with open(template_path, "r", encoding="utf-8") as f:
        html_template = f.read()

    # Replace placeholders
    html_body = (
        html_template
        .replace("{{lead_name}}", lead_name)
        .replace("{{followup_time}}", followup_time)
        .replace("{{lead_link}}", lead_link)
        .replace("{{message}}", body)
    )

    msg = MIMEMultipart("alternative")

    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject

    # Plain text fallback
    text_part = MIMEText(body, "plain")

    # HTML email
    html_part = MIMEText(html_body, "html")

    msg.attach(text_part)
    msg.attach(html_part)

    try:

        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASS,
            start_tls=True,
            timeout=30,
        )
    except Exception as ex:
        # Notify you via email if sending fails
        notify_admin_of_failure(to, str(ex))
        return False


def notify_admin_of_failure(failed_recipient: str, error_message: str):
    try:
        admin_email = "vedant.shimpi@digikore.com"  
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