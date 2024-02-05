import FleetComp from "../components/stats/FleetComp";
import { Fleet } from "../components/structure/FleetStructure";

const FleetStructure = () => {
  // Fleet > Wing > Squad > People
  // Command available at each level
  return (
    <div className="d-flex flex-row">
      <div className="col-md-12 col-lg-8">
        <Fleet />
      </div>
      <div className="col-md-12 col-lg-4">
        <FleetComp />
      </div>
    </div>
  );
};

export default FleetStructure;
