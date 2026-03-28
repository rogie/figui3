import { useCallback, useMemo, useState } from "react";

type TaskStatus = "Todo" | "In Progress" | "Done";
type TaskFilter = "All" | TaskStatus;

interface Task {
  id: number;
  title: string;
  owner: string;
  due: string;
  status: TaskStatus;
}

const STATUS_ORDER: TaskStatus[] = ["Todo", "In Progress", "Done"];
const FILTERS: TaskFilter[] = ["All", "Todo", "In Progress", "Done"];

const INITIAL_TASKS: Task[] = [
  {
    id: 1,
    title: "Build color-token export",
    owner: "Avery",
    due: "Mon",
    status: "In Progress",
  },
  {
    id: 2,
    title: "Review onboarding copy",
    owner: "Jules",
    due: "Tue",
    status: "Todo",
  },
  {
    id: 3,
    title: "Ship sandbox preview route",
    owner: "Rogie",
    due: "Today",
    status: "Done",
  },
  {
    id: 4,
    title: "Prepare release notes",
    owner: "Sam",
    due: "Fri",
    status: "Todo",
  },
];

function getNextStatus(status: TaskStatus): TaskStatus {
  const currentIndex = STATUS_ORDER.indexOf(status);
  const nextIndex = (currentIndex + 1) % STATUS_ORDER.length;
  return STATUS_ORDER[nextIndex];
}

export default function SandboxApp() {
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("All");
  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  const counts = useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        acc[task.status] += 1;
        return acc;
      },
      { Todo: 0, "In Progress": 0, Done: 0 },
    );
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const filterMatch = activeFilter === "All" || task.status === activeFilter;
      const queryMatch =
        normalizedQuery.length === 0 ||
        task.title.toLowerCase().includes(normalizedQuery) ||
        task.owner.toLowerCase().includes(normalizedQuery);
      return filterMatch && queryMatch;
    });
  }, [activeFilter, query, tasks]);

  const handleAdvanceStatus = useCallback((taskId: number) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: getNextStatus(task.status),
            }
          : task,
      ),
    );
  }, []);

  return (
    <div className="sandbox-app">
      <header className="sandbox-hero">
        <p className="sandbox-kicker">Playground Sandbox</p>
        <h1>Sample styled React app</h1>
        <p>
          This route is a plain React UI sandbox. It is useful for quickly
          prototyping layout, state, and interactions outside the FigUI3 demo
          shell.
        </p>
      </header>

      <section className="sandbox-grid">
        <article className="sandbox-panel">
          <h2>Task filters</h2>
          <div className="sandbox-filter-row">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={filter === activeFilter ? "is-active" : undefined}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
          <label className="sandbox-search">
            <span>Search by title or owner</span>
            <input
              type="search"
              value={query}
              placeholder="Try: release"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </article>

        <article className="sandbox-panel">
          <h2>Quick stats</h2>
          <div className="sandbox-stats">
            <div>
              <p>Total</p>
              <strong>{tasks.length}</strong>
            </div>
            <div>
              <p>Todo</p>
              <strong>{counts.Todo}</strong>
            </div>
            <div>
              <p>In progress</p>
              <strong>{counts["In Progress"]}</strong>
            </div>
            <div>
              <p>Done</p>
              <strong>{counts.Done}</strong>
            </div>
          </div>
        </article>

        <article className="sandbox-panel sandbox-task-board">
          <h2>Tasks ({filteredTasks.length})</h2>
          {filteredTasks.length === 0 ? (
            <p className="sandbox-empty-state">
              No tasks match the current filter.
            </p>
          ) : (
            <ul>
              {filteredTasks.map((task) => (
                <li key={task.id}>
                  <div>
                    <h3>{task.title}</h3>
                    <p>
                      {task.owner} - due {task.due}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`sandbox-status sandbox-status-${task.status
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                    onClick={() => handleAdvanceStatus(task.id)}
                    aria-label={`Advance status for ${task.title}`}
                    title="Click to cycle status"
                  >
                    {task.status}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
