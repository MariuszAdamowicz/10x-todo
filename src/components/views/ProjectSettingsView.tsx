import type { ProjectGetDetailsDto } from "@/types";
import { useProjectSettings } from "@/components/hooks/useProjectSettings";
import ProjectSettingsForm from "@/components/features/projects/settings/ProjectSettingsForm";
import ApiKeyManager from "@/components/features/projects/settings/ApiKeyManager";
import DangerZone from "@/components/features/projects/settings/DangerZone";

interface ProjectSettingsViewProps {
  initialProject: ProjectGetDetailsDto;
}

export default function ProjectSettingsView({ initialProject }: ProjectSettingsViewProps) {
  const {
    project,
    formState,
    isSaving,
    isRegenerating,
    isDeleting,
    saveChanges,
    toggleApiKeyVisibility,
    copyApiKey,
    regenerateApiKey,
    deleteProject,
    setFormState,
  } = useProjectSettings(initialProject);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Settings for {project.name}</h1>
      <div className="space-y-8">
        <ProjectSettingsForm
          project={project}
          formState={formState}
          onSave={saveChanges}
          isSaving={isSaving}
          setFormState={setFormState}
        />
        <ApiKeyManager
          project={project}
          onToggleVisibility={toggleApiKeyVisibility}
          onCopy={copyApiKey}
          onRegenerate={regenerateApiKey}
          isRegenerating={isRegenerating}
        />
        <DangerZone onDelete={deleteProject} isDeleting={isDeleting} projectName={project.name} />
      </div>
    </div>
  );
}
