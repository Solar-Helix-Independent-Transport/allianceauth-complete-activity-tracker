import FleetCharacters from "../components/stats/FleetChars";
import FleetComp from "../components/structure/FleetComp";

const FleetStatus = () => {
  return (
    <div className="d-flex">
      <FleetComp />
      <FleetCharacters />
    </div>
  );
};

export default FleetStatus;
