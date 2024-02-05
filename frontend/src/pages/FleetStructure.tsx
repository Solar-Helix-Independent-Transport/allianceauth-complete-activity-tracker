import FleetComp from "../components/stats/FleetComp";
import { Fleet } from "../components/structure/FleetStructure";
import Card from "react-bootstrap/Card";

const FleetStructure = () => {
  // Fleet > Wing > Squad > People
  // Command available at each level
  return (
    <div className="d-flex flex-row">
      <div className="col-md-12 col-lg-6">
        <Card className="m-4 ">
          <Card.Body>
            <Card.Title>Fleet Structure</Card.Title>
            <Fleet />
          </Card.Body>
        </Card>
      </div>
      <div className="col-md-12 col-lg-6">
        <FleetComp />
      </div>
    </div>
  );
};

export default FleetStructure;
