// Studio landing page (sortedbyus.com/studio). The Studio opens its first tool,
// so this is listed first in sanity.config.ts. Each card opens a tool; tools
// that don't exist yet show as "Coming soon".
import { HomeIcon } from "@sanity/icons/Home";
import { useWorkspace, type Tool } from "sanity";
import { useRouter } from "sanity/router";
import { HomeCards } from "./home-cards";

function HomeTool() {
  const router = useRouter();
  const { basePath } = useWorkspace();
  return <HomeCards onOpen={(tool) => router.navigateUrl({ path: `${basePath}/${tool}` })} />;
}

export const homeTool: Tool = {
  name: "home",
  title: "Home",
  icon: HomeIcon,
  component: HomeTool,
};
