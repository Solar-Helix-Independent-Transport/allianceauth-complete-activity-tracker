import FleetCharacters from "../components/stats/FleetChars";
import FleetComp from "../components/structure/FleetComp";

const FleetStatus = () => {
  return (
    <div className="d-flex flex-wrap">
      <FleetComp />
      <FleetCharacters />
    </div>
  );
};

export default FleetStatus;