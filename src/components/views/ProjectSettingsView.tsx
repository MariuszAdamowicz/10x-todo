import React from "react";
import { useProjectSettings } from "@/components/hooks/useProjectSettings";
import ProjectSettingsForm from "@/components/features/projects/settings/ProjectSettingsForm";
import ApiKeyManager from "@/components/features/projects/settings/ApiKeyManager";
import DangerZone from "@/components/features/projects/settings/DangerZone";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectUpdateCommand } from "@/types";
import { Breadcrumbs } from "@/components/features/projects/settings/Breadcrumbs";

interface ProjectSettingsViewProps {
  projectId: string;
}

// This is a placeholder for the ProjectSettingsViewModel defined in the plan
interface ProjectSettingsViewModel {
  id: string;
  name: string;
  description: string | null;
  apiKey: string;
  isApiKeyVisible: boolean;
  createdAt: string;
}

export default function ProjectSettingsView({ projectId }: ProjectSettingsViewProps) {
  const onDeleteSuccess = () => {
    window.location.href = "/projects";
  };

  const {
    project,
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
  } = useProjectSettings({ projectId, onDeleteSuccess });

  if (isLoading || !project) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // A temporary hack to satisfy TypeScript
  const projectViewModel: ProjectSettingsViewModel = {
    ...project,
    apiKey: project.api_key || "",
    isApiKeyVisible: project.isApiKeyVisible,
    createdAt: project.created_at,
  };

  const formStateViewModel: ProjectUpdateCommand = {
    ...formState,
  };

  return (
    <>
      <Breadcrumbs projectId={projectId} projectName={project.name} currentPage="Settings" />
      <h1 className="text-3xl font-bold my-6">Project Settings</h1>
      <div className="space-y-8">
        <ProjectSettingsForm
          project={projectViewModel}
          formState={formStateViewModel}
          setFormState={setFormState}
          onSave={handleUpdateProject}
          isSaving={isSaving}
        />
        <ApiKeyManager
          project={projectViewModel}
          onToggleVisibility={toggleApiKeyVisibility}
          onCopy={copyApiKeyToClipboard}
          onRegenerate={handleRegenerateApiKey}
          isRegenerating={isRegenerating}
        />
        <DangerZone projectName={project.name} onDelete={handleDeleteProject} isDeleting={isDeleting} />
      </div>
    </>
  );
}
