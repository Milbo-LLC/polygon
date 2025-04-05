import { WelcomeEmail } from '../../../../components/emails/welcome-email';
import { Resend } from 'resend';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);

// Define a type for the expected request body
type EmailRequestBody = {
  email: string;
  name: string;
};

// Define a schema for input validation
const emailRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    // Add type assertion or validation
    const body = await request.json() as EmailRequestBody;
    
    // Validate the input
    const result = emailRequestSchema.safeParse(body);
    
    if (!result.success) {
      return Response.json(
        { error: "Invalid input", details: result.error.format() }, 
        { status: 400 }
      );
    }
    
    const { email, name } = result.data;
    
    // Send the email with the provided data
    const { data, error } = await resend.emails.send({
      from: 'Noah <noah@milbo.co>',
      to: [email],
      subject: 'Welcome to Our Platform',
      react: WelcomeEmail({ firstName: name }),
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch {
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
}