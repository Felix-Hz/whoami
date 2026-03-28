import { getAllProjects } from "@/data/projects";
import type { Project } from "@/types/project";

function ProjectCard({ project, index }: { project: Project; index: number }) {
  return (
    <div className="py-4 first:pt-0 animate-fade-up" style={{ animationDelay: `${600 + index * 100}ms` }}>
      <div className="flex flex-col gap-2">
        <h3 className="font-[var(--font-heading)] text-lg md:text-xl text-text-primary">{project.name}</h3>

        <p className="text-text-secondary text-sm md:text-base leading-relaxed">{project.description}</p>

        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-baseline font-[var(--font-mono)] text-sm text-text-primary transition-colors duration-normal focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <span className="text-accent font-bold">$</span>
            <span className="ml-1.5 group-hover:text-accent transition-colors duration-normal">open</span>
            <span className="ml-2 text-text-secondary group-hover:underline underline-offset-4 truncate max-w-[200px] md:max-w-none">
              {project.url}
            </span>
            <span className="inline-block ml-2 transition-transform duration-normal group-hover:translate-x-1">
              &rarr;
            </span>
          </a>
        )}

        <div className="flex flex-col gap-1.5 mt-1">
          <a
            href={project.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-baseline font-[var(--font-mono)] text-sm text-text-primary transition-colors duration-normal focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <span className="text-accent font-bold">$</span>
            <span className="ml-1.5 group-hover:text-accent transition-colors duration-normal">git clone</span>
            <span className="ml-2 text-text-secondary group-hover:underline underline-offset-4 truncate max-w-[200px] md:max-w-none">
              {project.repo}
            </span>
            <span className="inline-block ml-2 transition-transform duration-normal group-hover:translate-x-1">
              &rarr;
            </span>
          </a>
        </div>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-accent border border-accent/25 px-2 py-0.5 rounded-sm tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Projects() {
  const projects = getAllProjects();

  if (projects.length === 0) return null;

  return (
    <div className="animate-fade-up flex flex-col gap-1.5" style={{ animationDelay: "500ms" }}>
      <span className="uppercase text-xs tracking-[0.15em] text-text-tertiary">projects</span>

      <div className="divide-y divide-border">
        {projects.map((project, i) => (
          <ProjectCard key={project.name} project={project} index={i} />
        ))}
      </div>
    </div>
  );
}
