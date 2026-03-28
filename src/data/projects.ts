import projectsData from "@/data/projects.json";
import type { Project } from "@/types/project";

const projects: Project[] = projectsData as Project[];

export function getAllProjects(): Project[] {
  return projects;
}
