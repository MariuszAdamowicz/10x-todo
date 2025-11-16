import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProjectUpdateCommand } from '@/types';

// This is a placeholder for the ProjectSettingsViewModel defined in the plan
interface ProjectSettingsViewModel {
  id: string;
  name: string;
  description: string | null;
  apiKey: string;
  isApiKeyVisible: boolean;
  createdAt: string;
}

interface ProjectSettingsFormProps {
  project: ProjectSettingsViewModel;
  formState: ProjectUpdateCommand;
  onSave: () => void;
  isSaving: boolean;
  setFormState: (formState: ProjectUpdateCommand) => void;
}

export default function ProjectSettingsForm({
  project,
  formState,
  onSave,
  isSaving,
  setFormState,
}: ProjectSettingsFormProps) {
  const hasChanges =
    formState.name !== project.name || formState.description !== project.description;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
        <CardDescription>Update your project's name and description.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formState.description ?? ''}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              placeholder="A brief description of your project."
            />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button type="submit" disabled={!hasChanges || isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
