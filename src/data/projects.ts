import projectsData from "@/data/projects.json";
import type { Project } from "@/types/project";

const projects: Project[] = [...(projectsData as Project[])].sort((a, b) => a.name.localeCompare(b.name));

export function getAllProjects(): Project[] {
  return projects;
}
