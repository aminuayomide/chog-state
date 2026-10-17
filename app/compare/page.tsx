import { listDemoChogs } from "../../lib/chogs";
import CompareClient from "./CompareClient";

export const metadata = { title: "Compare" };

export default function ComparePage() {
  return <CompareClient chogs={listDemoChogs()} />;
}
