'use client';

import { type ReactNode, createContext, useContext, useMemo } from 'react';

import { activeOrganizationIdAtom } from '~/app/(protected)/atoms';
import { useSetAtom } from 'jotai';
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

  // Fetch all organizations for the user
  const { data: userOrganizations = [], isLoading: loadingUserOrganizations } = api.userOrganization.getAll.useQuery(undefined, {
    enabled: !!userId,
  });

  const setActiveOrganizationId = useSetAtom(
    activeOrganizationIdAtom,
  );

  const { data: organizationUser } = api.userOrganization.get.useQuery(undefined, {
    enabled: !!userId,
  });
  
  const role = useMemo(() => {
    if (!organizationUser || !user) return null;
    return organizationUser.role;
  }, [user, organizationUser]);

  // Format organizations into the correct structure
  const organizations = useMemo(() => {
    return userOrganizations.map((userOrg) => ({
      organization: userOrg.organization,
      role: userOrg.role,
    }));
  }, [userOrganizations]);

  const updateOrganizationMutation = api.organization.update.useMutation({
    onSuccess: async () => {
      await utils.organization.get.refetch();
      toast.success("Organization updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update organization: ${error.message}`);
    }
  });

  // Function to update the organization
  const updateOrganization = async (data: {
    id: string;
    name?: string;
    logoUrl?: string | null;
  }) => {
    return updateOrganizationMutation.mutateAsync(data);
  };

  if (loadingOrganization || loadingUserOrganizations) {
    return <div>Loading...</div>
  }

  const handleOrgSwitch = async (organizationId: string) => {
    try {
      setActiveOrganizationId(organizationId);
      await utils.organization.get.invalidate();
      await utils.userOrganization.get.invalidate();
      await utils.userOrganization.getAll.invalidate();
      await utils.userOrganization.get.refetch();
      await utils.organization.get.refetch();

      // router.push('/projects');
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
