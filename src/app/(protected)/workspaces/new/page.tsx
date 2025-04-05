'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { TeamLogoInput } from '~/components/team-logo-input';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { H1, Muted } from '~/components/ui/typography';
import { api } from '~/trpc/react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useOrganizationContext } from '~/providers/organization-provider';

// Form validation schema
const newWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
  logoUrl: z.string().optional(),
});

type NewWorkspaceFormValues = z.infer<typeof newWorkspaceSchema>;

export default function NewWorkspacePage() {
  const router = useRouter();
  const { handleOrgSwitch } = useOrganizationContext();
  
  const createOrganization = api.organization.create.useMutation({
    onSuccess: async (data) => {
      toast.success('Workspace created successfully!');
      await handleOrgSwitch(data.id);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create workspace');
    },
  });
  
  // Initialize form with empty values
  const form = useForm<NewWorkspaceFormValues>({
    resolver: zodResolver(newWorkspaceSchema),
    defaultValues: {
      name: '',
      logoUrl: undefined,
    },
  });

  const onSubmit = async (data: NewWorkspaceFormValues) => {
    try {
      await createOrganization.mutateAsync({
        name: data.name,
        logoUrl: data.logoUrl ?? null,
      });
    } catch (error) {
      // Error is handled by the mutation
      console.error(error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-6">
        <H1>Create New Workspace</H1>
        <Muted>Set up a new workspace for your team</Muted>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Details</CardTitle>
          <CardDescription>
            Enter information about your new workspace
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
                    render={({ field }: { field: ControllerRenderProps<NewWorkspaceFormValues, "logoUrl"> }) => (
                      <FormItem>
                        <FormLabel>Logo</FormLabel>
                        <FormControl>
                          <TeamLogoInput
                            value={field.value}
                            onChange={field.onChange}
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
                    render={({ field }: { field: ControllerRenderProps<NewWorkspaceFormValues, "name"> }) => (
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
            <CardFooter className="flex justify-end space-x-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!form.formState.isDirty || form.formState.isSubmitting || createOrganization.isPending}
              >
                {createOrganization.isPending ? 'Creating...' : 'Create Workspace'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}