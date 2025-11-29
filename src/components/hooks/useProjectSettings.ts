import { useState } from "react";
import { toast } from "sonner";
import type { ProjectGetDetailsDto, ProjectUpdateCommand } from "@/types";

// As defined in the implementation plan
interface ProjectSettingsViewModel {
  id: string;
  name: string;
  description: string | null;
  apiKey: string;
  isApiKeyVisible: boolean;
  createdAt: string;
}

export function useProjectSettings(initialProject: ProjectGetDetailsDto) {
  const [project, setProject] = useState<ProjectSettingsViewModel>({
    ...initialProject,
    isApiKeyVisible: false,
  });
  const [formState, setFormState] = useState<ProjectUpdateCommand>({
    name: initialProject.name,
    description: initialProject.description,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveChanges = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      if (!response.ok) throw new Error("Failed to save changes.");
      const updatedProject = await response.json();
      setProject({ ...project, ...updatedProject });
      setFormState({ name: updatedProject.name, description: updatedProject.description });
      toast.success("Project updated successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleApiKeyVisibility = () => {
    setProject((p) => ({ ...p, isApiKeyVisible: !p.isApiKeyVisible }));
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(project.apiKey);
    toast.success("API Key copied to clipboard!");
  };

  const regenerateApiKey = async () => {
    setIsRegenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/regenerate-api-key`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to regenerate API key.");
      const { api_key } = await response.json();
      setProject({ ...project, apiKey: api_key });
      toast.success("API Key regenerated successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsRegenerating(false);
    }
  };

  const deleteProject = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete project.");
      toast.success("Project deleted successfully.");
      window.location.href = "/projects";
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    project,
    formState,
    isSaving,
    isRegenerating,
    isDeleting,
    error,
    saveChanges,
    toggleApiKeyVisibility,
    copyApiKey,
    regenerateApiKey,
    deleteProject,
    setFormState,
  };
}
