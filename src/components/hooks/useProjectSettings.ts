import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import type { Project, ProjectUpdateCommand } from "@/types";

interface UseProjectSettingsProps {
  projectId: string;
  onDeleteSuccess?: () => void;
}

export function useProjectSettings({ projectId, onDeleteSuccess }: UseProjectSettingsProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [formState, setFormState] = useState<ProjectUpdateCommand>({ name: "", description: "" });
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch project");
      }
      const data: Project = await response.json();
      setProject(data);
      setFormState({ name: data.name, description: data.description ?? "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleUpdateProject = async () => {
    if (!project) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      if (!response.ok) {
        throw new Error("Failed to update project");
      }
      const updatedProject: Project = await response.json();
      setProject(updatedProject);
      setFormState({ name: updatedProject.name, description: updatedProject.description ?? "" });
      toast.success("Project updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!project) return;
    setIsRegenerating(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/regenerate-api-key`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to regenerate API key");
      }
      const { api_key } = await response.json();
      setProject((prevProject) => {
        if (!prevProject) return null;
        return { ...prevProject, api_key };
      });
      toast.success("API key regenerated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete project");
      }
      toast.success("Project deleted successfully");
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
      setIsDeleting(false);
    }
  };

  const toggleApiKeyVisibility = () => {
    setIsApiKeyVisible((prev) => !prev);
  };

  const copyApiKeyToClipboard = () => {
    if (project?.api_key) {
      navigator.clipboard.writeText(project.api_key);
      toast.success("API key copied to clipboard");
    }
  };

  return {
    project: project
      ? {
          ...project,
          isApiKeyVisible,
        }
      : null,
    formState,
    setFormState,
    isLoading,
    isSaving,
    isRegenerating,
    isDeleting,
    handleUpdateProject,
    handleRegenerateApiKey,
    handleDeleteProject,
    toggleApiKeyVisibility,
    copyApiKeyToClipboard,
  };
}
