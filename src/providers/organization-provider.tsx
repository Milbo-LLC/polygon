'use client';

import { type ReactNode, createContext, useContext, useMemo } from 'react';

import { toast } from 'sonner';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import { type Organization } from '~/validators/organizations';
import { type MemberRole } from '~/validators/user-organizations';
import { type UserOrganizationWithOrg } from '~/validators/extended-schemas';

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
  const session = useSession();
  const user = session.data?.user;

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
      // Invalidate the entire organization cache
      await utils.organization.invalidate();
      // Also refetch the specific query
      await utils.organization.get.refetch();
      // Invalidate user organizations to ensure all data is fresh
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
    console.log('Switching to organization:', organizationId);
    try {
      await updateUserMutation.mutateAsync({
        id: user?.id,
        activeOrganizationId: organizationId,
      });
      await utils.invalidate();
      window.location.reload();
    } catch (error) {
      console.error(error);
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
