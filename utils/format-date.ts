import dayjs from "dayjs";

export function formatDate(date: string | Date | dayjs.Dayjs) {
  return dayjs(date).format("MMMM DD, YYYY");
}
