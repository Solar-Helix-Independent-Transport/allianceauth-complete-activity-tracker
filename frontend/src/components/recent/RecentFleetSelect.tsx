import RecentFleetList from "./RecentFleetList";
import { Col } from "react-bootstrap";

const RecentFleetSelect = () => {
  return (
    <>
      <Col>
        <div className="d-flex justify-content-center align-items-center flex-row flex-wrap">
          <RecentFleetList />
        </div>
      </Col>
    </>
  );
};

export default RecentFleetSelect;
