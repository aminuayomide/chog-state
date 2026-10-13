import LiveProviders from "../../components/LiveProviders";
import { listDemoChogs } from "../../lib/chogs";
import LiveClient from "./LiveClient";

export default function LivePage() {
  return (
    <LiveProviders>
      <LiveClient chogs={listDemoChogs()} />
    </LiveProviders>
  );
}
