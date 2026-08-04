interface TaskCardProps {
  task: {
    id: string;
    task_type: string;
    status: string;
    completed_at: string | null;
    service_photos?: { id: string; photo_type: string }[] | null;
    exceptions?:
      | {
          id: string;
          exception_type: string;
          description: string | null;
          status: string;
          resolution: string | null;
          customer_visible: boolean;
        }[]
      | null;
  };
}

/** One rollout/return task's photo + exception summary. Shared by the cycle- and order-keyed history lists. */
export function TaskCard({ task }: TaskCardProps) {
  const photos = (task.service_photos ?? []).filter((photo) =>
    ["rollout_proof", "return_proof", "exception"].includes(photo.photo_type),
  );
  const visibleExceptions = (task.exceptions ?? []).filter((exception) => exception.customer_visible);

  return (
    <li className="rounded-xl border border-border bg-surface-2 p-4">
      <p className="text-lg font-semibold capitalize">
        {task.task_type}{" "}
        <span className="font-normal text-muted">
          — {task.status.replace(/_/g, " ")}
          {task.completed_at
            ? ` at ${new Date(task.completed_at).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/Phoenix",
              })}`
            : ""}
        </span>
      </p>
      {photos.length > 0 ? (
        <p className="mt-2 text-base">
          {photos.map((photo, index) => (
            <a
              key={photo.id}
              href={`/api/photos/${photo.id}/view`}
              target="_blank"
              rel="noreferrer"
              className="mr-4 text-cyan underline"
            >
              View {photo.photo_type.replace(/_/g, " ")}
              {photos.length > 1 ? ` ${index + 1}` : ""}
            </a>
          ))}
        </p>
      ) : null}
      {visibleExceptions.map((exception) => (
        <div key={exception.id} className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-base">
          <p>
            <strong>{exception.exception_type.replace(/_/g, " ")}</strong>
            {exception.description ? ` — ${exception.description}` : ""}
          </p>
          {exception.status === "resolved" && exception.resolution ? (
            <p className="mt-1 text-muted">Resolution: {exception.resolution}</p>
          ) : (
            <p className="mt-1 text-muted">Our team is on it.</p>
          )}
        </div>
      ))}
    </li>
  );
}
