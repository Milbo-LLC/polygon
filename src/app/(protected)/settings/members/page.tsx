"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { useOrganizationContext } from "~/providers/organization-provider";
import { useSession } from "next-auth/react";

// Define types for organization members
type UserType = {
  id: string;
  name?: string | null;
  email?: string | null;
};

type UserOrganizationType = {
  userId: string;
  organizationId: string;
  role: string;
  user?: UserType;
};

const inviteFormSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  role: z.string().min(1, "Please select a role"),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export default function MembersSettingsPage() {
  const session = useSession();
  const user = session.data?.user;
  const { organization } = useOrganizationContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log(organization);
  }, [organization]);
  
    const { data: invitations, refetch: refetchInvitations } = api.organizationInvitation.getAll.useQuery(
      undefined,
    { enabled: !!organization?.id }
  );
  
  const createInvitation = api.organizationInvitation.create.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent successfully");
      form.reset();
      refetchInvitations();
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invitation");
      setIsSubmitting(false);
    },
  });
  
  const deleteInvitation = api.organizationInvitation.update.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      refetchInvitations();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke invitation");
    },
  });

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "",
    },
  });

  const onSubmit = (data: InviteFormValues) => {
    if (!organization?.id) {
      toast.error("No organization selected");
      return;
    }
    
    setIsSubmitting(true);
    if (!user?.id) {
      toast.error("No user found. Contact support.");
      return;
    }

    createInvitation.mutate({
      email: data.email,
      role: data.role,
      organizationId: organization.id,
      invitedByUserId: user.id,
    });
  };

  const handleRevokeInvitation = (invitationId: string) => {
    deleteInvitation.mutate({
      id: invitationId,
      deletedAt: new Date(),
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Members Settings</h1>
      
      {/* Organization Members */}
      {organization?.userOrganizations && organization.userOrganizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Organization Members</CardTitle>
            <CardDescription>
              People who are currently members of your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organization.userOrganizations.map((member: UserOrganizationType) => (
                <div 
                  key={member.userId} 
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{member.user?.email || "No email available"}</p>
                      <p className="text-sm text-muted-foreground">
                        Role: {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Invite Team Members</CardTitle>
          <CardDescription>
            Send invitations to people you want to join your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="colleague@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="w-full md:w-[200px]">
                      <FormLabel>Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                Send Invitation
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              People who have been invited but haven't joined yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations
                .filter(invitation => !invitation.deletedAt)
                .map((invitation) => (
                  <div 
                    key={invitation.id} 
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Role: {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvitation(invitation.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}