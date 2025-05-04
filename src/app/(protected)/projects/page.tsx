"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Button } from "~/components/ui/button";
import { PlusIcon, Trash2Icon, MoreVertical, Pencil } from "lucide-react";
import { P } from "~/components/ui/typography";
import { api } from "~/trpc/react";
import { type ProjectWithDocuments } from "~/validators/projects";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "~/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { socket } from "~/socket";
import { Skeleton } from "~/components/ui/skeleton";
import { useOrganizationContext } from "~/providers/organization-provider";
import { useSession } from "~/server/auth/client";
import { Logo } from "~/components/ui/logo";
import { type ExtendedSessionUser } from "~/types/auth";

function ProjectsContent() {
  
  const [isConnected, setIsConnected] = useState(false);
  const [transport, setTransport] = useState("N/A");
  const [onlineUsers, setOnlineUsers] = useState<Array<{id: string, name?: string, image?: string}>>([]);

  const [projectToDelete, setProjectToDelete] = useState<ProjectWithDocuments | null>(null);
  const [projectToRename, setProjectToRename] = useState<ProjectWithDocuments | null>(null);
  const [newName, setNewName] = useState("");
  const router = useRouter();
  const { organization } = useOrganizationContext();
  const { data: session } = useSession();
  const user = session?.user as ExtendedSessionUser | undefined;
  
  const { data: userOrganization } = api.userOrganization.get.useQuery(undefined, {
    enabled: !!user?.id && !!organization?.id
  });
  
  // Fetch all users in the organization to determine if user is the only member
  const { data: organizationUsers = [] } = api.userOrganization.getAllByOrganizationId.useQuery(undefined, {
    enabled: !!organization?.id
  });
  
  // Check if the current user is the only user in the organization
  const isOnlyUserInOrg = organizationUsers.length === 1;
  
  // Determine user's permissions
  const userRole = userOrganization?.role ?? "member";
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  // Abstract the rename submission logic
  const handleRenameSubmit = () => {
    if (projectToRename && newName.trim()) {
      updateProject.mutate({
        id: projectToRename.id,
        name: newName.trim()
      });
      setProjectToRename(null);
    }
  };

  useEffect(() => {
    if (socket.connected) {
      onConnect();
    }

    function onConnect() {
      setIsConnected(true);
      setTransport(socket.io.engine.transport.name);

      socket.io.engine.on("upgrade", (transport) => {
        setTransport(transport.name);
      });
      
      // Join organization room
      if (organization?.id && user?.id) {
        socket.emit("join-org", {
          organizationId: organization.id,
          userId: user.id,
          userName: user.name,
          userImage: user.image
        });
      }
    }

    function onDisconnect() {
      setIsConnected(false);
      setTransport("N/A");
    }
    
    function onUsersUpdate(users: Array<{id: string, name?: string, image?: string}>) {
      setOnlineUsers(users);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("users-update", onUsersUpdate);
    
    return () => {
      // Leave organization room when component unmounts
      if (organization?.id) {
        socket.emit("leave-org", { organizationId: organization.id });
      }
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("users-update", onUsersUpdate);
    };
  }, [organization?.id, user]);

  const createProject = api.project.create.useMutation({
    onSuccess: async (project: ProjectWithDocuments) => {
      await utils.project.getAll.invalidate();
      router.push(`/projects/${project.id}/${project.documents?.[0]?.id}`);
      
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteProject = api.project.delete.useMutation({
    onSuccess: async () => {
      toast.success("Project deleted");
      await utils.project.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const updateProject = api.project.update.useMutation({
    onSuccess: async () => {
      toast.success("Project renamed");
      await utils.project.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const { data: projects = [] } = api.project.getAll.useQuery();
  const utils = api.useUtils();

  // Check if there are any projects not created by the current user
  const hasProjectsFromOtherUsers = projects.some(
    project => project.userId !== user?.id
  );

  const CreateProjectCard = (
    <Card
      className="h-[240px] cursor-pointer hover:border-primary/50 transition-colors flex flex-col items-center justify-center"
      onClick={() => createProject.mutate({ name: "New Project", description: null })}
    >
      <CardHeader className="text-center">
        <PlusIcon className="size-8 mx-auto mb-2" />
        <CardTitle>Create Project</CardTitle>
        <P className="text-muted-foreground">Start a new project</P>
      </CardHeader>
    </Card>
  );

  // Helper function to determine if user can delete a project
  const canDeleteProject = (project: ProjectWithDocuments) => {
    // Owner or admin can delete any project
    if (isOwnerOrAdmin) return true;
    
    // Regular members can only delete their own projects
    return project.userId === user?.id;
  };

  return (
    <>
      <div className="flex flex-col w-full h-full p-4 gap-4 justify-start">
        <div className="flex items-center justify-between mb-4">
          <div>
            <P>Status: {isConnected ? "Connected" : "Disconnected"}</P>
            <P>Transport: {transport}</P>
          </div>
          
          {/* Online Users Section */}
          <div className="flex items-center gap-1">
            <div className="text-sm text-muted-foreground mr-2">Online:</div>
            <div className="flex -space-x-2">
              {onlineUsers
                .filter(onlineUser => onlineUser.id !== user?.id) // Filter out the current user
                .map(onlineUser => (
                  <div 
                    key={onlineUser.id} 
                    className="relative"
                    title={onlineUser.name ?? "Unknown user"}
                  >
                    <Logo
                      id={onlineUser.id}
                      name={onlineUser.name}
                      logoUrl={onlineUser.image}
                      size="sm"
                      className="border border-green-400"
                    />
                    <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-1 ring-white"></span>
                  </div>
                ))}
              {onlineUsers.filter(onlineUser => onlineUser.id !== user?.id).length === 0 && (
                <div className="text-sm text-muted-foreground">No other members online</div>
              )}
            </div>
          </div>
        </div>
          
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
          {CreateProjectCard}
          {projects?.map((project) => (
            <Card
              key={project.id}
              className="h-[240px] cursor-pointer hover:border-primary/50 transition-colors group relative"
              onClick={() => router.push(`/projects/${project.id}/${project.documents?.[0]?.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 absolute top-2 right-2">
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setProjectToRename(project);
                        setNewName(project.name);
                      }}>
                        <Pencil className="size-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      {canDeleteProject(project) && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(project);
                          }}
                        >
                          <Trash2Icon className="size-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <P className="text-muted-foreground line-clamp-2">
                  {project.description ?? "No description"}
                </P>
              </CardHeader>
              
              {/* Card Footer with Project Ownership and Document Count */}
              <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between">
                <div>
                  {/* Owner badge - only shown when needed */}
                  {project.userId === user?.id && (hasProjectsFromOtherUsers || !isOnlyUserInOrg) && (
                    <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded-full">
                      Your Project
                    </span>
                  )}
                </div>
                <div>
                  {/* Document count */}
                  <P className="text-xs text-muted-foreground">
                    {project.documents?.length ?? 0} {project.documents?.length === 1 ? "document" : "documents"}
                  </P>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Delete Project Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              project and its documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (projectToDelete) {
                  deleteProject.mutate({ id: projectToDelete.id });
                  setProjectToDelete(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Project Dialog */}
      <AlertDialog open={!!projectToRename} onOpenChange={() => setProjectToRename(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Project</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for your project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            className="my-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRenameSubmit();
              }
            }}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRenameSubmit}>
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="h-[240px]">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full mt-2" />
              <Skeleton className="h-4 w-full mt-1" />
            </CardHeader>
          </Card>
        ))}
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}
