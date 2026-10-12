import { listDemoChogs } from "../../../lib/chogs";
import GalleryClient from "./GalleryClient";


export default function GalleryPage() {
  return <GalleryClient chogs={listDemoChogs()} />;
}
