'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Building, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAtom } from 'jotai';

import { Button } from '~/components/ui/button';
import { H3, Muted } from '~/components/ui/typography';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { api } from '~/trpc/react';
import { pendingInvitationCodeAtom } from '~/app/(protected)/atoms';
import { type OrganizationInvitation } from '~/validators/organization-invitations';
import Image from 'next/image';

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const urlInvitationCode = searchParams.get('code');
  const router = useRouter();
  const { data: session } = useSession();
  const [accepting, setAccepting] = useState(false);
  
  // Use the Jotai atom for persisting the invitation code
  const [pendingInvitationCode, setPendingInvitationCode] = useAtom(pendingInvitationCodeAtom);
  
  // Use URL code or pending code from storage
  const invitationCode = urlInvitationCode ?? pendingInvitationCode;

  // Query to get invitation details
  const { data: invitation, isLoading, error } = api.organizationInvitation.get.useQuery(
    { id: invitationCode ?? '' },
    { enabled: !!invitationCode, retry: 1 }
  ) as { data: OrganizationInvitation | undefined, isLoading: boolean, error: Error | null };

  // Query to get organization details
  const { data: organization } = api.organization.getById.useQuery(
    { id: invitation?.organizationId ?? '' },
    { enabled: !!invitation?.organizationId }
  );

  // Mutation to accept invitation
  const acceptInvitation = api.organizationInvitation.update.useMutation({
    onSuccess: () => {
      toast.success("You've successfully joined the organization!");
      // Clear the stored invitation code when accepted
      setPendingInvitationCode(null);
      router.push('/projects');
    },
    onError: (error) => {
      toast.error(`Failed to join: ${error.message}`);
      setAccepting(false);
    }
  });

  // Handle authentication and redirection
  useEffect(() => {
    // Always store the URL invitation code if it exists
    if (urlInvitationCode) {
      setPendingInvitationCode(urlInvitationCode);
    }

    // If user is authenticated and we have a stored code but no URL code, 
    // update the URL to include the code
    if (session?.user && pendingInvitationCode && !urlInvitationCode) {
      router.push(`/invitations?code=${pendingInvitationCode}`);
    }
    
    // Authentication is handled by the layout component, which will redirect to login
    // with the proper callback URL if needed
  }, [session, urlInvitationCode, pendingInvitationCode, setPendingInvitationCode, router]);

  // Handle invitation acceptance
  const handleAcceptInvitation = () => {
    if (!(invitation && session?.user)) {
      toast.error("Missing invitation details or user not authenticated");
      return;
    }

    setAccepting(true);
    acceptInvitation.mutate({ id: invitation.id, acceptedAt: new Date() });
  };

  // Handle invitation errors
  if (error) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation is either expired, already used, or invalid.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/')}>Go to Homepage</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Handle loading state
  if (isLoading ?? !invitation ?? !organization) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Check if invitation is expired
  const isExpired = invitation.expiresAt && new Date(invitation.expiresAt) < new Date();
  if (isExpired) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Please ask the organization admin to send a new invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/')}>Go to Homepage</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If email doesn't match the user's email
  if (session?.user?.email !== invitation.email) {
    return (
      <div className="container max-w-2xl mx-auto py-16 px-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Incorrect Account</CardTitle>
            <CardDescription>
              This invitation was sent to {invitation.email}, but you&apos;re logged in as {session?.user?.email}.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-4">
            <Button onClick={() => router.push('/auth/signout')}>Sign Out</Button>
            <Button variant="outline" onClick={() => router.push('/')}>Go to Homepage</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-16 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Building className="h-6 w-6" />
            Organization Invitation
          </CardTitle>
          <CardDescription>
            You&apos;ve been invited to join an organization
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-secondary/30 rounded-lg p-6 space-y-4">
            <div>
              <H3 className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                {organization.name}
              </H3>

              {organization.logoUrl && (
                <div className="mt-4 flex justify-center relative size-24">
                  <Image
                    src={organization.logoUrl}
                    alt={`${organization.name} logo`}
                    fill
                    className="rounded-lg border"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-secondary pt-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Muted>Your Role</Muted>
              </div>
              <div className="font-medium">
                {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
              </div>
            </div>

            {invitation.expiresAt && (
              <div className="border-t border-secondary pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Muted>Expires</Muted>
                </div>
                <div className="font-medium">
                  {new Date(invitation.expiresAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-4">
          <Button
            className="w-full sm:w-auto"
            size="lg"
            onClick={handleAcceptInvitation}
            disabled={accepting}
          >
            {accepting ? "Joining..." : "Accept & Join Organization"}
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={() => router.push('/')}
          >
            Decline
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}