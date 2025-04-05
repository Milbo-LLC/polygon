import * as React from 'react';
import { H1 } from '../ui/typography';

interface WelcomeEmailProps {
  firstName: string;
}

export const WelcomeEmail: React.FC<Readonly<WelcomeEmailProps>> = ({
  firstName,
}) => (
  <div>
    <H1>Welcome, {firstName}!</H1>
  </div>
);