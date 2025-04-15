'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { Large, Muted, Small } from '~/components/ui/typography';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { z } from 'zod';
import { TeamLogoInput } from '~/components/team-logo-input';
import { type User } from '~/validators/users';
import { api } from '~/trpc/react';

// Form validation schema
const accountFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  image: z.string().optional(),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export default function AccountSettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const updateUser = api.user.update.useMutation({
    onSuccess: async (data: User) => {
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name: data.name,
          email: data.email,
          image: data.image,
        },
      });
      toast.success('Account settings updated');
    },
    onError: () => {
      toast.error(`Failed to update account`);
    },
  });
  
  // Initialize form with current user values
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: session?.user?.name ?? '',
      email: session?.user?.email ?? '',
      image: session?.user?.image ?? undefined,
    },
  });

  const onSubmit = async (data: AccountFormValues) => {
    try {
      if (!session?.user?.id) {
        toast.error('You must be logged in');
        return;
      }

      const updateData = {
        id: session.user.id,
        ...data,
        image: data.image ?? null
      };

      updateUser.mutate(updateData);
      
      form.reset(data);
    } catch (error) {
      toast.error('Failed to update account settings');
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-col justify-center w-full max-w-3xl mx-auto py-20">
        <div className="mb-6">
          <Large>Profile</Large>
          <Muted>
            <Small>Manage your personal account settings</Small>
          </Muted>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-32">
                    <FormField
                      control={form.control}
                      name="image"
                      render={({ field }: { field: ControllerRenderProps<AccountFormValues, "image"> }) => (
                        <FormItem>
                          <FormLabel>Profile Picture</FormLabel>
                          <FormControl>
                            <TeamLogoInput
                              value={field.value}
                              onChange={field.onChange}
                              organizationId={session?.user?.id}
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

                  <div className="flex-1 space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }: { field: ControllerRenderProps<AccountFormValues, "name"> }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            This is the name that will be displayed to other users.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }: { field: ControllerRenderProps<AccountFormValues, "email"> }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your email address" 
                              type="email"
                              disabled={true}
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Email changes are currently disabled. Contact support if you need to update your email.
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
                  disabled={!form.formState.isDirty || form.formState.isSubmitting || updateUser.isPending}
                >
                  {updateUser.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}