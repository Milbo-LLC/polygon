'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '~/providers/session-provider';
import { Building, User, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { H3, Muted } from '~/components/ui/typography';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { api } from '~/trpc/react';
import { type OrganizationInvitation } from '~/validators/organization-invitations';
import Image from 'next/image';
import { useOrganizationContext } from '~/providers/organization-provider';
import { type MemberRole } from '~/validators/user-organizations';

enum InvitationState {
  LOADING = 'loading',
  VALID = 'valid',
  INVALID = 'invalid',
  EXPIRED = 'expired',
  WRONG_EMAIL = 'wrong-email',
  ALREADY_ACCEPTED = 'already-accepted'
}

function InvitationContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  console.log('code: ', code);
  const router = useRouter();
  const { session } = useSession();
  const [accepting, setAccepting] = useState(false);
  const [invitationState, setInvitationState] = useState<InvitationState>(InvitationState.LOADING);
  const {handleOrgSwitch} = useOrganizationContext();
  
  const { data: invitation, error, isLoading } = api.organizationInvitation.get.useQuery(
    { id: code ?? '' },
    { 
      enabled: !!code,
      retry: false,
    }
  );

  const validateInvitation = useCallback((invitation: OrganizationInvitation) => {
    if (!invitation) {
      setInvitationState(InvitationState.INVALID);
      return;
    }

    if (invitation.acceptedAt) {
      setInvitationState(InvitationState.ALREADY_ACCEPTED);
      return;
    }
    
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      setInvitationState(InvitationState.EXPIRED);
      return;
    }
    
    if (session?.user?.email !== invitation.email) {
      setInvitationState(InvitationState.WRONG_EMAIL);
      return;
    }

    setInvitationState(InvitationState.VALID);
  }, [session?.user?.email, setInvitationState]);

  useEffect(() => {
    if (invitation) {
      validateInvitation(invitation);
    } else if (error) {
      setInvitationState(InvitationState.INVALID);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invitation, error]);

  const acceptInvitation = api.organizationInvitation.accept.useMutation({
    onError: (error) => {
      toast.error(`Failed to join: ${error.message}`);
      setAccepting(false);
      
      if (error.message.includes("expired")) {
        setInvitationState(InvitationState.EXPIRED);
      } else if (error.message.includes("already been accepted")) {
        router.push('/projects');
      } else if (error.message.includes("email address")) {
        setInvitationState(InvitationState.WRONG_EMAIL);
      } else {
        setInvitationState(InvitationState.INVALID);
      }
    }
  });

  const restoreOrCreateUserOrganization = api.userOrganization.restoreOrCreate.useMutation({
    onError: (error) => {
      toast.error(`Failed to create organization connection: ${error.message}`);
      setAccepting(false);
    }
  });

  const handleAcceptInvitation = () => {
    if (!(invitation && session?.user)) {
      toast.error("Missing invitation details or user not authenticated");
      return;
    }

    if (invitationState !== InvitationState.VALID) {
      return;
    }

    setAccepting(true);
    
    restoreOrCreateUserOrganization.mutate({
      userId: session.user.id,
      organizationId: invitation.organizationId,
      role: invitation.role as MemberRole
    }, {
      onSuccess: () => {
        acceptInvitation.mutate({ 
          id: invitation.id 
        }, {
          onSuccess: () => {
            toast.success("You've successfully joined the organization!");
            
            router.push('/projects');

            void handleOrgSwitch(invitation.organizationId).catch(error => {
              console.error("Error switching organization:", error);
            });
          }
        });
      },
      onError: (error) => {
        setAccepting(false);
        toast.error(`Failed to join organization: ${error.message}`);
      }
    });
  };

  if (invitationState === InvitationState.INVALID || error) {
    return (
      <ErrorCard 
        title="Invalid Invitation"
        description="This invitation link is either expired, already used, or invalid."
        icon={<AlertCircle className="h-6 w-6 text-destructive" />}
      />
    );
  }

  if (invitationState === InvitationState.EXPIRED) {
    return (
      <ErrorCard 
        title="Invitation Expired"
        description="This invitation has expired. Please ask the organization admin to send a new invitation."
        icon={<Clock className="h-6 w-6 text-destructive" />}
      />
    );
  }

  if (invitationState === InvitationState.ALREADY_ACCEPTED) {
    return (
      <ErrorCard 
        title="Already Joined"
        description="This invitation has already been accepted. You can access the organization from your dashboard."
        icon={<Building className="h-6 w-6 text-primary" />}
        buttonText="Go to Dashboard"
        buttonAction={() => router.push('/projects')}
      />
    );
  }

  if (invitationState === InvitationState.WRONG_EMAIL) {
    return (
      <ErrorCard 
        title="Incorrect Account"
        description={`This invitation was sent to ${invitation?.email}, but you're logged in as ${session?.user?.email}.`}
        icon={<User className="h-6 w-6 text-destructive" />}
        secondaryButton={
          <Button onClick={() => router.push('/auth/signout')}>Sign Out</Button>
        }
      />
    );
  }

  if (isLoading || invitationState === InvitationState.LOADING) {
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
                {invitation?.organization.name}
              </H3>

              {invitation?.organization.logoUrl && (
                <div className="mt-4 flex justify-center relative size-24">
                  <Image
                    src={invitation.organization.logoUrl}
                    alt={`${invitation.organization.name} logo`}
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
                {invitation?.role ? (invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)) : 'Member'}
              </div>
            </div>

            {invitation?.expiresAt && (
              <div className="border-t border-secondary pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Muted>Expires</Muted>
                </div>
                <div className="font-medium">
                  {new Date(invitation?.expiresAt).toLocaleDateString('en-US', {
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
            disabled={accepting || invitationState !== InvitationState.VALID}
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

function ErrorCard({ 
  title, 
  description, 
  icon,
  buttonText = "Go to Homepage",
  buttonAction = () => window.location.href = '/',
  secondaryButton = null
}: { 
  title: string; 
  description: string; 
  icon?: React.ReactNode;
  buttonText?: string;
  buttonAction?: () => void;
  secondaryButton?: React.ReactNode;
}) {
  return (
    <div className="container max-w-2xl mx-auto py-16 px-4">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </CardTitle>
          <CardDescription className="text-base">
            {description}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-4">
          {secondaryButton}
          <Button variant="outline" onClick={buttonAction}>
            {buttonText}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="container max-w-2xl mx-auto py-16 px-4">
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
    </div>}>
      <InvitationContent />
    </Suspense>
  );
}