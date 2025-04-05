'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { TeamLogoInput } from '~/components/team-logo-input';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { H1, Muted } from '~/components/ui/typography';
import { useOrganizationContext } from '~/providers/organization-provider';
import { toast } from 'sonner';
import { z } from 'zod';

// Form validation schema
const workspaceFormSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
  logoUrl: z.string().optional(),
});

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;

export default function WorkspaceSettingsPage() {
  const { organization, updateOrganization } = useOrganizationContext();
  
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

      // Call your update organization function here
      await updateOrganization({ ...data, id: organization.id });
      
      toast.success('Workspace settings updated');
    } catch (error) {
      toast.error('Failed to update workspace settings');
      console.error(error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-6">
        <H1>General</H1>
        <Muted>Change your current workspace settings</Muted>
      </div>

      <Card>
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
    </div>
  );
}