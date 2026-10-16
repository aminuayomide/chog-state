import { listDemoChogs } from "../../lib/chogs";
import CompareClient from "./CompareClient";

export default function ComparePage() {
  return <CompareClient chogs={listDemoChogs()} />;
}
