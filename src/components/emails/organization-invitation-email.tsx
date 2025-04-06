import * as React from 'react';
import { H1 } from '../ui/typography';

interface OrganizationInvitationEmailProps {
  inviterName: string;
  inviteeEmail: string;
  organizationName: string;
  role: string;
  invitationCode: string;
}

export const OrganizationInvitationEmail: React.FC<Readonly<OrganizationInvitationEmailProps>> = ({
  inviterName,
  inviteeEmail,
  organizationName,
  role,
  invitationCode,
}) => {
  // Generate the invitation URL with the code as a query parameter
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitations?code=${invitationCode}`;
  
  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
      color: '#333',
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
    }}>
      <H1 className="text-center text-2xl font-bold mb-4">
        You've been invited to join {organizationName}!
      </H1>
      
      <div style={{ 
        backgroundColor: '#f9f9f9', 
        borderRadius: '8px', 
        padding: '24px', 
        marginBottom: '24px' 
      }}>
        <p style={{ fontSize: '16px', lineHeight: '1.5', marginBottom: '16px' }}>
          <strong>{inviterName}</strong> has invited you ({inviteeEmail}) to join <strong>{organizationName}</strong> as a <strong>{role}</strong>.
        </p>
        
        <p style={{ fontSize: '16px', lineHeight: '1.5', marginBottom: '24px' }}>
          Click the button below to accept this invitation and get started:
        </p>
        
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <a 
            href={invitationUrl}
            style={{
              backgroundColor: '#4F46E5',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              fontWeight: 'bold',
              textDecoration: 'none',
              display: 'inline-block',
              fontSize: '16px',
            }}
          >
            Accept Invitation
          </a>
        </div>
        
        <p style={{ fontSize: '14px', color: '#666', marginTop: '24px' }}>
          This invitation will expire in 7 days. If you have any questions, please contact the person who invited you.
        </p>
      </div>
      
      <div style={{ 
        borderTop: '1px solid #eaeaea', 
        paddingTop: '16px', 
        fontSize: '14px', 
        color: '#666',
        textAlign: 'center'
      }}>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style={{ 
          wordBreak: 'break-all', 
          color: '#4F46E5',
          fontSize: '12px'
        }}>
          {invitationUrl}
        </p>
      </div>
    </div>
  );
};