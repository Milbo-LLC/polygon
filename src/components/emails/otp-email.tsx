import * as React from 'react';

interface OtpEmailProps {
  firstName?: string;
  otp: string;
  type: 'sign-in' | 'email-verification' | 'forget-password';
}

export const OtpEmail: React.FC<OtpEmailProps> = ({ firstName = 'there', otp, type }) => {
  const title = 
    type === 'sign-in' ? 'Your sign-in code' :
    type === 'email-verification' ? 'Verify your email' :
    'Reset your password';

  return (
    <div>
      <h1>{title}</h1>
      <p>Hey {firstName},</p>
      <p>Your verification code is:</p>
      <div style={{ 
        padding: '12px 24px', 
        background: '#f4f4f4', 
        borderRadius: '4px', 
        fontSize: '24px',
        fontWeight: 'bold',
        letterSpacing: '3px', 
        margin: '24px 0',
        textAlign: 'center' 
      }}>
        {otp}
      </div>
      <p>This code will expire in 5 minutes.</p>
      <p>If you didn't request this code, you can safely ignore this email.</p>
    </div>
  );
}; 