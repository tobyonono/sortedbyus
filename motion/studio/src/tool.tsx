// The motion studio as a Sanity Studio tool: sortedbyus.com/studio/motion.
// Uses the signed-in user's client, so it reads and writes the site's own
// dataset and media library.
import { PlayIcon } from "@sanity/icons/Play";
import { useClient, type Tool } from "sanity";
import { Studio } from "./Studio";
import "./studio.css";

function MotionTool() {
  const client = useClient({ apiVersion: "2025-02-19" });
  return (
    <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
      <Studio client={client} />
    </div>
  );
}

export const motionTool: Tool = {
  name: "motion",
  title: "Motion",
  icon: PlayIcon,
  component: MotionTool,
};
