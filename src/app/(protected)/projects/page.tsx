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
import { useSession } from "next-auth/react";
import { Logo } from "~/components/ui/logo";

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
      if (organization?.id && session?.user?.id) {
        socket.emit("join-org", {
          organizationId: organization.id,
          userId: session.user.id,
          userName: session.user.name,
          userImage: session.user.image
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
  }, [organization?.id, session?.user]);

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

  const { data: projects } = api.project.getAll.useQuery();
  const utils = api.useUtils();

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
                .filter(user => user.id !== session?.user?.id) // Filter out the current user
                .map(user => (
                  <div 
                    key={user.id} 
                    className="relative"
                    title={user.name ?? "Unknown user"}
                  >
                    <Logo
                      id={user.id}
                      name={user.name}
                      logoUrl={user.image}
                      size="sm"
                      className="border border-green-400"
                    />
                    <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-1 ring-white"></span>
                  </div>
                ))}
              {onlineUsers.filter(user => user.id !== session?.user?.id).length === 0 && (
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
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <P className="text-gray-600 text-sm line-clamp-3">{project.description}</P>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{projectToDelete?.name}&quot; and all its contents.
              This action cannot be undone.
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
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!projectToRename} onOpenChange={() => setProjectToRename(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Project</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for &quot;{projectToRename?.name}&quot;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            className="my-4"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (projectToRename && newName.trim()) {
                  updateProject.mutate({
                    id: projectToRename.id,
                    name: newName.trim()
                  });
                  setProjectToRename(null);
                }
              }}
            >
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
      <div className="flex flex-col w-full h-full p-4 gap-4">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[240px]" />
          ))}
        </div>
      </div>
    }>
      <ProjectsContent />
    </Suspense>
  );
}
