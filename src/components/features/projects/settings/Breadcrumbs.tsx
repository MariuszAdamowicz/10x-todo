import { Breadcrumbs as BaseBreadcrumbs } from "@/components/features/tasks/Breadcrumbs";
import type { IBreadcrumb } from "@/types";

export interface BreadcrumbsProps {
  projectId: string;
  projectName: string;
  currentPage: string;
}

export function Breadcrumbs({ projectId, projectName, currentPage }: BreadcrumbsProps) {
  const items: IBreadcrumb[] = [
    { name: "Projects", href: "/projects" },
    { name: projectName, href: `/projects/${projectId}` },
    { name: currentPage, href: `/projects/${projectId}/settings`, current: true },
  ];

  return <BaseBreadcrumbs items={items} />;
}
