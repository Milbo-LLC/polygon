'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PROJECTS_BASE_PATH } from "~/constants/links";
import { api } from "~/trpc/react";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  
  const projectId = params.projectId as string;

  const { data: project } = api.project.get.useQuery({ id: projectId }, { enabled: !!projectId });

  useEffect(() => {
    if (project?.documents?.[0]) {
      const firstDocument = project.documents[0];
      router.push(`${PROJECTS_BASE_PATH}/${projectId}/${firstDocument.id}`);
    }
  }, [project, projectId, router]);

  // FIXME: Add a proper loading state
  return <div>Loading...</div>;
}