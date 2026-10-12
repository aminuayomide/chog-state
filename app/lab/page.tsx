import { listDemoChogs } from "../../lib/chogs";
import LabClient from "./LabClient";

export default function LabPage() {
  return <LabClient chogs={listDemoChogs()} />;
}
