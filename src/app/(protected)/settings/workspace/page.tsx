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
import { useSession } from 'next-auth/react';
import { api } from '~/trpc/react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '~/components/ui/alert-dialog';

// Form validation schema
const workspaceFormSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
  logoUrl: z.string().optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

export default function WorkspaceSettingsPage() {
  const { organization, organizations, updateOrganization, handleOrgSwitch } = useOrganizationContext();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  
  // Check if this is a personal organization (userId === orgId)
  const isPersonalOrg = session?.user?.id === organization?.id;
  
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
      
      form.reset(data);
      
      toast.success('Workspace settings updated');
    } catch (error) {
      toast.error('Failed to update workspace settings');
      console.error(error);
    }
  };
  
  const handleDeleteWorkspace = async () => {
    if (!organization?.id) {
      toast.error("No workspace selected");
      return;
    }
    
    setIsDeleting(true);
    deleteOrganization.mutate({ id: organization.id });
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-col justify-center w-full max-w-3xl mx-auto py-20">
        <div className="mb-6">
          <Large>General</Large>
          <Muted>
            <Small>Change your current workspace settings</Small>
          </Muted>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Workspace Details</CardTitle>
            <CardDescription>
              Update your workspace information
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
                            <TeamLogoInput
                              value={field.value}
                              onChange={field.onChange}
                              organizationId={organization?.id}
                              onRemove={async () => {
                                await form.handleSubmit(onSubmit)();
                              }}
                              autoSave={true}
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
                  disabled={!form.formState.isDirty || form.formState.isSubmitting}
                >
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
        
        {/* Danger Zone */}
        {!isPersonalOrg && (
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