'use client';

import { type ReactNode, createContext, useContext, useMemo } from 'react';

import { activeOrganizationIdAtom } from '~/app/(protected)/atoms';
import { useAtom } from 'jotai';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import { Organization } from '~/validators/organizations';
import { MemberRole } from '~/validators/user-organizations';
import { UserOrganizationWithOrg } from '~/validators/extended-schemas';

type OrganizationContextValue = 
  | ({
      organization: Organization | null;
      organizations: Partial<UserOrganizationWithOrg>[];
      handleOrgSwitch: (organizationId: string) => Promise<void>;
      role: MemberRole | null;
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

  console.log('organization: ', organization);

  // Fetch all organizations for the user
  const { data: userOrganizations = [], isLoading: loadingUserOrganizations } = api.userOrganization.getAll.useQuery(undefined, {
    enabled: !!userId,
  });

  const [activeOrganizationId, setActiveOrganizationId] = useAtom(
    activeOrganizationIdAtom,
  );

  const { data: organizationUser } = api.userOrganization.get.useQuery();
  
  const router = useRouter();
  const pathname = usePathname();

  const role = useMemo(() => {
    if (!organizationUser || !user) return null;
    return organizationUser.role;
  }, [user, organizationUser, activeOrganizationId]);

  // Format organizations into the correct structure
  const organizations = useMemo(() => {
    return userOrganizations.map((userOrg) => ({
      organization: userOrg.organization,
      role: userOrg.role,
    }));
  }, [userOrganizations]);

  console.log('userOrganizations: ', userOrganizations);

  if (loadingOrganization || loadingUserOrganizations) {
    return <div>Loading...</div>
  }

  const handleOrgSwitch = async (organizationId: string) => {
    try {
      setActiveOrganizationId(organizationId);
      await utils.invalidate();
      if (pathname.includes('/projects')) {
        router.push('/projects');
      }
      await Promise.all([
        utils.userOrganization.get.refetch(),
        utils.organization.get.refetch(),
      ]);
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
