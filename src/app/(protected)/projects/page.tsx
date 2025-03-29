"use client";

import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { PlusIcon, Trash2Icon, MoreVertical, Pencil } from "lucide-react";
import { P } from "~/components/ui/typography";
import { api } from "~/trpc/react";
import { type Project } from "~/validators/projects";
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
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";

export default function ProjectsPage() {
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [newName, setNewName] = useState("");
  const router = useRouter();

  const createProject = api.project.create.useMutation({
    onSuccess: async (project: Project) => {
      await utils.project.getAll.invalidate();
      router.push(`/projects/${project.id}/${project.documents?.[0]?.id}`);
      
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteProject = api.project.delete.useMutation({
    onSuccess: async () => {
      console.log("Project deleted");
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

  console.log('projects: ', projects);

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
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
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
