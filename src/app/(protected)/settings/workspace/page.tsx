'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { TeamLogoInput } from '~/components/team-logo-input';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { Large, Muted, Small } from '~/components/ui/typography';
import { useOrganizationContext } from '~/providers/organization-provider';
import { toast } from 'sonner';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '~/providers/session-provider';
import { api } from '~/trpc/react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog';
import { LockIcon } from 'lucide-react';

// Form validation schema
const workspaceFormSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
  logoUrl: z.string().optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

export default function WorkspaceSettingsPage() {
  const { organization, organizations, updateOrganization, handleOrgSwitch, role } = useOrganizationContext();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { session } = useSession();
  
  // Check if this is a personal organization (userId === orgId)
  const isPersonalOrg = session?.user?.id === organization?.id;
  
  // Check if the user is an owner or admin of the organization
  const canEditSettings = role === "owner" || role === "admin";
  
  // Only owners can delete workspaces
  const canDeleteWorkspace = role === "owner";
  
  const deleteOrganization = api.organization.delete.useMutation({
    onSuccess: async () => {
      const personalOrg = organizations?.find(org => org.organization?.id === session?.user?.id);
      toast.success("Workspace deleted successfully");
      await handleOrgSwitch(personalOrg?.organization?.id ?? '');
      router.push("/projects");
    },
    onError: (error) => {
      setIsDeleting(false);
      toast.error(error.message || "Failed to delete workspace");
    }
  });
  
  // Initialize form with current organization values
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      name: organization?.name ?? '',
      logoUrl: organization?.logoUrl ?? undefined,
    },
  });

  const onSubmit = async (data: WorkspaceFormValues) => {
    try {
      // Check permission again before submitting
      if (!canEditSettings) {
        toast.error('You do not have permission to update workspace settings');
        return;
      }
      
      if (!organization) {
        toast.error('No workspace selected');
        return;
      }

      const updateData = {
        ...data,
        id: organization.id,
        logoUrl: data.logoUrl ?? null
      };

      // Call your update organization function here
      await updateOrganization(updateData);
      
      // Reset the form with the new values to clear the dirty state
      form.reset({
        name: data.name,
        logoUrl: data.logoUrl
      });
      
      toast.success('Workspace settings updated');
    } catch (error) {
      toast.error('Failed to update workspace settings');
      console.error(error);
    }
  };
  
  const handleDeleteWorkspace = async () => {
    // Check permission again before deleting
    if (!canDeleteWorkspace) {
      toast.error('You do not have permission to delete this workspace');
      return;
    }
    
    if (!organization?.id) {
      toast.error("No workspace selected");
      return;
    }
    
    setIsDeleting(true);
    deleteOrganization.mutate({ id: organization.id });
  };

  // Custom method to override logo input functionality
  const customLogoChange = (url?: string) => {
    if (!canEditSettings) {
      // If not owner or admin, block changes and show toast
      toast.error('You do not have permission to update the logo');
      return;
    }
    
    // Otherwise perform normal onChange
    form.setValue('logoUrl', url, { shouldDirty: true });
  };
  
  // Create a wrapper component that captures logo input props and adds disabled state
  const DisabledLogoWrapper = ({ 
    value, 
    onChange, 
    organizationId 
  }: { 
    value?: string, 
    onChange: (url?: string) => void, 
    organizationId?: string 
  }) => {
    return (
      <div className="relative">
        <TeamLogoInput
          value={value}
          onChange={onChange}
          organizationId={organizationId}
        />
        
        {/* Add a disabled overlay for users without edit permissions */}
        {!canEditSettings && (
          <div className="absolute inset-0 bg-background/60 rounded-md flex items-center justify-center cursor-not-allowed">
            {/* No content needed - just prevents interaction */}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-col justify-center w-full max-w-3xl mx-auto py-20">
        <div className="mb-6">
          <Large>General</Large>
          <Muted>
            <Small>{canEditSettings ? "Change your current workspace settings" : "View your current workspace settings"}</Small>
          </Muted>
        </div>

        {/* Permission Banner for users without edit permissions */}
        {!canEditSettings && (
          <Card className="mb-6 border-secondary bg-secondary/10">
            <CardContent className="flex items-center gap-2 py-3">
              <LockIcon className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                You have view-only access to workspace settings. Only workspace owners and admins can make changes.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Workspace Details</CardTitle>
            <CardDescription>
              {canEditSettings ? "Update your workspace information" : "View your workspace information"}
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-32">
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }: { field: ControllerRenderProps<WorkspaceFormValues, "logoUrl"> }) => (
                        <FormItem>
                          <FormLabel>Logo</FormLabel>
                          <FormControl>
                            <DisabledLogoWrapper
                              value={field.value}
                              onChange={customLogoChange}
                              organizationId={organization?.id}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }: { field: ControllerRenderProps<WorkspaceFormValues, "name"> }) => (
                        <FormItem>
                          <FormLabel>Workspace Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter workspace name" 
                              disabled={!canEditSettings}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            This is the name that will be displayed across the application.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={!canEditSettings || !form.formState.isDirty || form.formState.isSubmitting}
                >
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
        
        {/* Danger Zone - only shown to owners and non-personal orgs */}
        {!isPersonalOrg && canDeleteWorkspace && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Destructive actions that cannot be undone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <h4 className="font-medium">Delete this workspace</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this workspace and all associated projects and documents.
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Delete Workspace
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                <span className="font-semibold"> {organization?.name} </span> 
                workspace and all associated projects and documents.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async (e) => {
                  e.preventDefault();
                  await handleDeleteWorkspace();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Workspace"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}