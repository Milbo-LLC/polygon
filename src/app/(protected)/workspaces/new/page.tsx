'use client';

import { Suspense } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { TeamLogoInput } from '~/components/team-logo-input';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { Large, Muted, Small } from '~/components/ui/typography';
import { api } from '~/trpc/react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useOrganizationContext } from '~/providers/organization-provider';
import { Skeleton } from '~/components/ui/skeleton';
import { ChevronLeft } from 'lucide-react';

// Form validation schema
const newWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
  logoUrl: z.string().optional(),
});

type NewWorkspaceFormValues = z.infer<typeof newWorkspaceSchema>;

function WorkspaceForm() {
  const router = useRouter();
  const { handleOrgSwitch } = useOrganizationContext();
  
  const createOrganization = api.organization.create.useMutation({
    onSuccess: async (data) => {
      toast.success('Workspace created successfully!');
      await handleOrgSwitch(data.id);
      router.push("/projects");
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
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-col w-full max-w-3xl mx-auto py-20">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="w-fit"
        >
          <ChevronLeft className="size-4 " />
          Back
        </Button>
        
        <div className="mb-6">
          <Large>Create New Workspace</Large>
          <Muted>
            <Small>Set up a new workspace for your team</Small>
          </Muted>
        </div>

        <Card className="mb-8">
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
                              autoSave={false}
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
              <CardFooter className="flex justify-end">
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
    </div>
  );
}

export default function NewWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col w-full h-full">
        <div className="flex flex-col w-full max-w-3xl mx-auto py-20">
          <Skeleton className="h-8 w-24 mb-6" />
          <div className="mb-6">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <Card className="mb-8">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <Skeleton className="h-40 w-32" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Skeleton className="h-10 w-36" />
            </CardFooter>
          </Card>
        </div>
      </div>
    }>
      <WorkspaceForm />
    </Suspense>
  );
}