import { Fragment } from "preact";
import { getAllProjects } from "@/data/projects";
import type { Project } from "@/types/project";
import { Chapter } from "./Chapter";

const bare = (href: string) => href.replace(/^https?:\/\//, "").replace(/\/$/, "");

function Link({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ink underline decoration-accent hover:text-accent"
    >
      {bare(href)}
    </a>
  );
}

function Entry({ project, n, of }: { project: Project; n: number; of: number }) {
  return (
    <article className="border-t border-ink pt-5 md:pt-6">
      <div className="flex items-baseline justify-between gap-6">
        <h3 className="display text-section leading-none">{project.name}</h3>
        <span className="label whitespace-nowrap">
          {n} of {of}
        </span>
      </div>
      <p className="font-sans text-small text-ink-2 mt-3 max-w-[36em]">{project.description}</p>
      <dl className="spec mt-5 border-t-rule">
        {project.repo && (
          <>
            <dt>source</dt>
            <dd>
              <Link href={project.repo} />
            </dd>
          </>
        )}
        {project.tags.length > 0 && (
          <>
            <dt>tags</dt>
            <dd>
              {/* The separator sits outside the no-wrap span, so a long row can still break between tags */}
              {project.tags.map((tag, i) => (
                <Fragment key={tag}>
                  {i > 0 && " · "}
                  <span className="whitespace-nowrap">{tag}</span>
                </Fragment>
              ))}
            </dd>
          </>
        )}
        {project.url && (
          <>
            <dt>site</dt>
            <dd>
              <Link href={project.url} />
            </dd>
          </>
        )}
      </dl>
    </article>
  );
}

export function Projects() {
  const projects = getAllProjects();
  if (projects.length === 0) return null;

  return (
    <Chapter id="build" n="02" title="build" note="in production">
      <div className="flex flex-col gap-12 md:gap-14">
        {projects.map((project, i) => (
          <Entry key={project.name} project={project} n={i + 1} of={projects.length} />
        ))}
      </div>
    </Chapter>
  );
}
