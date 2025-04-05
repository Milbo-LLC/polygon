// In src/lib/email-server.ts
import { Resend } from 'resend';
import { WelcomeEmail } from '../components/emails/welcome-email';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmailServer(email: string, name: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Noah <noah@milbo.co>',
      to: [email],
      subject: 'Welcome to Our Platform',
      react: WelcomeEmail({ firstName: name }),
    });

    console.log('Email sent:', data);

    if (error) {
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}