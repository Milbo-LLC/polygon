"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
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
import { Large, Muted, Small } from "~/components/ui/typography";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { data: invitations, refetch: refetchInvitations } = api.organizationInvitation.getAll.useQuery(
    undefined,
    { enabled: !!organization?.id }
  );

  const { data: userOrganizations } = api.userOrganization.getAllByOrganizationId.useQuery(
    undefined,
    { enabled: !!organization?.id }
  );
  
  const createInvitation = api.organizationInvitation.create.useMutation({
    onSuccess: async () => {
      toast.success("Invitation sent successfully");
      form.reset();
      await refetchInvitations();
      setIsSubmitting(false);
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invitation");
      setIsSubmitting(false);
    },
  });
  
  const deleteInvitation = api.organizationInvitation.update.useMutation({
    onSuccess: async () => {
      toast.success("Invitation revoked");
      await refetchInvitations();
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

  // Get active invitations (not deleted)
  const activeInvitations = invitations?.filter(invitation => !invitation.deletedAt) ?? [];

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-col w-full max-w-3xl mx-auto py-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Large>Organization Members</Large>
            <Muted>
              <Small>Manage your organization&apos;s team members</Small>
            </Muted>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to someone you want to join your organization
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
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
                      <FormItem>
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
                  
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    Send Invitation
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Combined Organization Members and Pending Invitations */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Active members and pending invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current Members */}
              {userOrganizations && userOrganizations.length > 0 && userOrganizations.map((member: UserOrganizationType) => (
                <div 
                  key={`member-${member.userId}`} 
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{member.user?.email ?? "No email available"}</p>
                      <p className="text-sm text-muted-foreground">
                        Role: {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">Active</div>
                </div>
              ))}
              
              {/* Pending Invitations */}
              {activeInvitations.length > 0 && activeInvitations.map((invitation) => (
                <div 
                  key={`invitation-${invitation.id}`}
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
                  <div className="flex items-center gap-2">
                    <div className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">Pending</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvitation(invitation.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* No members message */}
              {(!userOrganizations || userOrganizations.length === 0) && 
               (!activeInvitations || activeInvitations.length === 0) && (
                <div className="text-center py-6 text-muted-foreground">
                  No members or pending invitations yet. Invite someone to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}