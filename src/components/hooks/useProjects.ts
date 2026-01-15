import { useState, useEffect, useCallback } from "react";
import type { ProjectViewModel, ProjectCreateCommand, Project } from "@/types";

const mapProjectToViewModel = (p: Project): ProjectViewModel => ({
  id: p.id,
  name: p.name,
  description: p.description,
  href: `/projects/${p.id}`,
});

const useProjects = () => {
  const [projects, setProjects] = useState<ProjectViewModel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch projects");
      }
      const data: Project[] = await response.json();
      setProjects(data.map(mapProjectToViewModel));
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (data: ProjectCreateCommand): Promise<void> => {
    // Note: We don't set isLoading to true here to avoid the whole page skeleton flashing.
    // A more granular loading state could be managed within the create modal itself.
    setError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create project");
      }

      // Refetch projects to show the new one.
      await fetchProjects();
    } catch (err) {
      setError(err as Error);
      // Re-throw the error if you want the component to be able to catch it too
      throw err;
    }
  };

  return { projects, isLoading, error, createProject, refetch: fetchProjects };
};

export default useProjects;
