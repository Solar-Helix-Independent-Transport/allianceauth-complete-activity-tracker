import FleetCharacters from "../components/FleetChars";
import FleetComp from "../components/FleetComp";

const FleetStatus = () => {
  return (
    <div className="d-flex">
      <FleetComp />
      <FleetCharacters />
    </div>
  );
};

export default FleetStatus;
