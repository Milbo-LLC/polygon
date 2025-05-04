'use client';

import { type ReactNode, createContext, useContext, useMemo } from 'react';

import { toast } from 'sonner';
import { api } from '~/trpc/react';
import { authClient } from '~/server/auth/client';
import { type Organization } from '~/validators/organizations';
import { type MemberRole } from '~/validators/user-organizations';
import { type UserOrganizationWithOrg } from '~/validators/extended-schemas';
import { type SessionUser } from '~/types/auth';

type OrganizationContextValue = 
  | ({
      organization: Organization | null;
      organizations: Partial<UserOrganizationWithOrg>[];
      handleOrgSwitch: (organizationId: string) => Promise<void>;
      role: MemberRole | null;
      updateOrganization: (data: {
        id: string;
        name?: string;
        logoUrl?: string | null;
      }) => Promise<Organization>;
    })
  | null;

export const OrganizationContext =
  createContext<OrganizationContextValue>(null);

export function OrganizationProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string | undefined;
}) {
  const utils = api.useUtils();
  const { data: session } = authClient.useSession();
  const user = session?.user as SessionUser | undefined;

  const { data: organization, isLoading: loadingOrganization } = api.organization.get.useQuery(undefined, {
    enabled: !!userId,
  });

  const { data: userOrganizations = [], isLoading: loadingUserOrganizations } = api.userOrganization.getAll.useQuery(undefined, {
    enabled: !!userId,
  });

  const { data: organizationUser } = api.userOrganization.get.useQuery(undefined, {
    enabled: !!userId,
  });
  
  const role = useMemo(() => {
    if (!organizationUser || !user) return null;
    return organizationUser.role;
  }, [user, organizationUser]);

  const organizations = useMemo(() => {
    return userOrganizations.map((userOrg) => ({
      organization: userOrg.organization,
      role: userOrg.role,
    }));
  }, [userOrganizations]);

  const updateOrganizationMutation = api.organization.update.useMutation({
    onSuccess: async () => {
      await utils.organization.invalidate();
      await utils.organization.get.refetch();
      await utils.userOrganization.invalidate();
      toast.success("Organization updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update organization: ${error.message}`);
    }
  });

  const updateUserMutation = api.user.update.useMutation({
    onSuccess: async () => {
      await utils.user.invalidate();
    },
    onError: (error) => {
      console.error('error updating user: ', error);
    }
  });

  const updateOrganization = async (data: {
    id: string;
    name?: string;
    logoUrl?: string | null;
  }) => {
    console.log('Organization provider updating with data:', data);
    
    const updateData = {
      ...data,
      logoUrl: data.logoUrl === undefined ? null : data.logoUrl
    };
    
    return updateOrganizationMutation.mutateAsync(updateData);
  };

  if (loadingOrganization || loadingUserOrganizations) {
    return <div>Loading...</div>
  }

  const handleOrgSwitch = async (organizationId: string) => {
    console.log('=== ORGANIZATION SWITCH STARTED ===');
    console.log('Current session:', {
      userId: user?.id,
      activeOrgId: user?.activeOrganizationId,
      target: organizationId
    });
    
    try {
      // Update the user in the database
      console.log('Step 1: Updating user in database...');
      const updatedUser = await updateUserMutation.mutateAsync({
        id: user?.id,
        activeOrganizationId: organizationId,
      });
      
      // Cast the updatedUser to our SessionUser type to access activeOrganizationId
      const typedUser = updatedUser as unknown as SessionUser;
      
      console.log('Database updated successfully:', {
        userId: typedUser.id,
        activeOrgId: typedUser.activeOrganizationId
      });
      
      // Force a fresh session fetch to update with new activeOrganizationId
      console.log('Step 2: Forcing session refresh...');
      
      try {
        // Try to get session with disabled cache
        const newSessionResponse = await authClient.getSession({ 
          query: { 
            disableCookieCache: true 
          } 
        });
        
        const sessionUser = newSessionResponse?.data?.user as SessionUser | undefined;
        
        console.log('Session refresh response:', {
          success: !!newSessionResponse?.data,
          userId: sessionUser?.id,
          activeOrgId: sessionUser?.activeOrganizationId,
          error: newSessionResponse?.error?.message
        });
      } catch (sessionError) {
        console.error('Error refreshing session:', sessionError);
      }
      
      // Invalidate all cached queries
      console.log('Step 3: Invalidating TRPC cache...');
      await utils.invalidate();
      console.log('TRPC cache invalidated');
      
      // Force a hard reload
      console.log('Step 4: Performing hard reload...');
      const timestamp = Date.now();
      
      // The most reliable way to force a complete refresh with new session data
      console.log('=== RELOADING PAGE ===');
      window.location.href = `${window.location.pathname}?t=${timestamp}`;
    } catch (error) {
      console.error('Error switching organization:', error);
      toast.error(
        'Something went wrong switching your organization. Please try again.',
      );
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        organization: organization ?? null,
        updateOrganization,
        organizations,
        handleOrgSwitch,
        role,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      'useOrganizationContext must be used within an OrganizationProvider',
    );
  }
  return context;
}
