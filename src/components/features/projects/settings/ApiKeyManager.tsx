import { Button } from "@/components/ui/button";
import { Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// This is a placeholder for the ProjectSettingsViewModel defined in the plan
interface ProjectSettingsViewModel {
  id: string;
  name: string;
  description: string | null;
  apiKey: string;
  isApiKeyVisible: boolean;
  createdAt: string;
}

interface ApiKeyManagerProps {
  project: ProjectSettingsViewModel;
  onToggleVisibility: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export default function ApiKeyManager({
  project,
  onToggleVisibility,
  onCopy,
  onRegenerate,
  isRegenerating,
}: ApiKeyManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription>Use this key to authenticate your AI agent with the 10x-todo API.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="api-key">Your API Key</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="api-key"
              readOnly
              type={project.isApiKeyVisible ? "text" : "password"}
              value={project.apiKey}
              data-test-id="api-key-input"
            />
            <Button variant="outline" size="icon" onClick={onToggleVisibility} data-test-id="toggle-api-key-btn">
              {project.isApiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="sr-only">{project.isApiKeyVisible ? "Hide API Key" : "Show API Key"}</span>
            </Button>
            <Button variant="outline" size="icon" onClick={onCopy}>
              <Copy className="h-4 w-4" />
              <span className="sr-only">Copy API Key</span>
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4 flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Be careful! Regenerating the key will invalidate the old one.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isRegenerating}>
              {isRegenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                "Regenerate Key"
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently invalidate your old API key and generate a new one.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onRegenerate}>Regenerate</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
