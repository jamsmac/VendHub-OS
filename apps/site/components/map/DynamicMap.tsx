import dynamic from "next/dynamic";
import MapLoadingState from "./MapLoadingState";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <MapLoadingState />,
});

export default LeafletMap;
