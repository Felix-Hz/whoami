import { getAllProjects } from "@/data/projects";
import type { Project } from "@/types/project";
import { Chapter } from "./Chapter";

function Entry({ project }: { project: Project }) {
  const links = [project.url, project.repo].filter((href): href is string => Boolean(href));
  return (
    <article className="border-t border-ink border-b border-b-rule py-6 md:py-7 grid gap-y-2 md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-8 items-baseline">
      <h3 className="display text-section leading-none">{project.name}</h3>
      {project.tags.length > 0 && (
        <p className="meta md:text-right">
          <span className="sr-only">tags: </span>
          {project.tags.map((tag, i) => (
            <span key={tag} className="whitespace-nowrap">
              {i > 0 && " · "}
              {tag}
            </span>
          ))}
        </p>
      )}
      <p className="text-small text-ink-2 md:col-span-2">{project.description}</p>
      <ul className="md:col-span-2 flex flex-col sm:flex-row gap-x-6 gap-y-1 mt-1 font-mono text-meta">
        {links.map((href) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline decoration-accent hover:text-accent"
            >
              {href.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function Projects() {
  const projects = getAllProjects();
  if (projects.length === 0) return null;

  return (
    <Chapter id="build" n="02" title="build" note="in production">
      <div className="flex flex-col gap-6">
        {projects.map((project) => (
          <Entry key={project.name} project={project} />
        ))}
      </div>
    </Chapter>
  );
}
