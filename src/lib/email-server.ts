// In src/lib/email-server.ts
import { Resend } from 'resend';
import { WelcomeEmail } from '../components/emails/welcome-email';
import { OrganizationInvitationEmail } from '../components/emails/organization-invitation-email';
import { OtpEmail } from '../components/emails/otp-email';

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

export async function sendOrganizationInvitationEmail(
  email: string, 
  inviterName: string,
  organizationName: string,
  role: string,
  invitationCode: string
) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Noah <noah@milbo.co>',
      to: [email],
      subject: `You've been invited to join ${organizationName}`,
      react: OrganizationInvitationEmail({ 
        inviterName,
        inviteeEmail: email,
        organizationName,
        role,
        invitationCode
      }),
    });

    console.log('Invitation email sent:', data);

    if (error) {
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return false;
  }
}

export async function sendOtpEmail(
  email: string,
  otp: string,
  type: 'sign-in' | 'email-verification' | 'forget-password'
) {
  try {
    const user = await getNameFromEmail(email);
    const firstName = user?.name?.split(' ')[0] || undefined;

    const subjects = {
      'sign-in': 'Your Sign-in Code',
      'email-verification': 'Verify Your Email',
      'forget-password': 'Reset Your Password'
    };

    const { data, error } = await resend.emails.send({
      from: 'Noah <noah@milbo.co>',
      to: [email],
      subject: subjects[type],
      react: OtpEmail({ 
        firstName, 
        otp, 
        type 
      }),
    });

    console.log('OTP email sent:', data);

    if (error) {
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error sending ${type} OTP email:`, error);
    return false;
  }
}

async function getNameFromEmail(email: string) {
  try {
    // Try to find the user in the database by email
    const user = await import('~/server/db').then(({ db }) => 
      db.user.findUnique({
        where: { email },
        select: { name: true }
      })
    );
    
    return user;
  } catch (error) {
    console.error('Error getting user from email:', error);
    return null;
  }
}