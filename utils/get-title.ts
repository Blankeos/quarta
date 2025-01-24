const TITLE_TEMPLATE = "%s | Quarta";

export default function getTitle(title: string = "Home") {
  return TITLE_TEMPLATE.replace("%s", title);
}
