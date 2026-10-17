import { listDemoChogs } from "../../lib/chogs";
import LabClient from "./LabClient";

export const metadata = { title: "The Lab" };

export default function LabPage() {
  return <LabClient chogs={listDemoChogs()} />;
}
